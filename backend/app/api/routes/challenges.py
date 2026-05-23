from __future__ import annotations

import asyncio
import datetime
import time
from typing import Any, Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes._utils import hash_secret, iso, make_id, rate_limit, sanitize_text, verify_secret
from app.core.database import get_db
from app.models.extended import Challenge, ChallengeSubmission, TestCase

router = APIRouter(prefix="/challenges", tags=["challenges"])

JUDGE0_URL = "http://localhost:2358"
TERMINAL_STATUS_IDS = {3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14}
ALLOWED_DIFFICULTIES = {"easy", "medium", "hard"}


class ChallengeCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: str = Field(..., max_length=20_000)
    difficulty: Literal["easy", "medium", "hard"] = "easy"
    language_ids: list[int] = Field(..., min_length=1, max_length=20)
    template_code: dict[str, str] = Field(default_factory=dict)
    admin_password: str | None = Field(default=None, max_length=200)


class TestCaseCreate(BaseModel):
    input: str = Field(default="", max_length=20_000)
    expected_output: str = Field(..., max_length=20_000)
    is_hidden: bool = False
    points: int = Field(default=1, ge=1, le=100)


class ChallengeSubmit(BaseModel):
    language_id: int = Field(..., ge=1)
    source_code: str = Field(..., max_length=100_000)
    visible_only: bool = False


def _serialize_test_case(item: TestCase, *, reveal_hidden: bool = False) -> dict:
    data = {
        "id": item.id,
        "challenge_id": item.challenge_id,
        "is_hidden": item.is_hidden,
        "points": item.points,
        "sort_order": item.sort_order,
    }
    if reveal_hidden or not item.is_hidden:
        data["input"] = item.input
        data["expected_output"] = item.expected_output
    return data


def _serialize_challenge(challenge: Challenge, db: Session, *, include_tests: bool = False) -> dict:
    visible_count = db.query(TestCase).filter(TestCase.challenge_id == challenge.id, TestCase.is_hidden.is_(False)).count()
    hidden_count = db.query(TestCase).filter(TestCase.challenge_id == challenge.id, TestCase.is_hidden.is_(True)).count()
    data = {
        "id": challenge.id,
        "title": challenge.title,
        "description": challenge.description,
        "difficulty": challenge.difficulty,
        "language_ids": challenge.language_ids or [],
        "template_code": challenge.template_code or {},
        "created_at": iso(challenge.created_at),
        "visible_test_count": visible_count,
        "hidden_test_count": hidden_count,
        "test_count": visible_count + hidden_count,
    }
    if include_tests:
        cases = (
            db.query(TestCase)
            .filter(TestCase.challenge_id == challenge.id)
            .order_by(TestCase.sort_order.asc())
            .all()
        )
        data["test_cases"] = [_serialize_test_case(case) for case in cases]
    return data


def _serialize_submission(item: ChallengeSubmission) -> dict:
    return {
        "id": item.id,
        "challenge_id": item.challenge_id,
        "language_id": item.language_id,
        "submitted_at": iso(item.submitted_at),
        "total_passed": item.total_passed,
        "total_tests": item.total_tests,
        "score": item.score,
        "time_ms": item.time_ms,
        "memory_kb": item.memory_kb,
        "results": item.results or [],
    }


def _get_challenge(challenge_id: str, db: Session) -> Challenge:
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found.")
    return challenge


def _require_admin(challenge: Challenge, key: str | None) -> None:
    if not key or not verify_secret(key, challenge.admin_key_hash):
        raise HTTPException(status_code=403, detail="Admin key required.")


async def _submit_code(language_id: int, source_code: str, stdin: str) -> dict:
    payload = {
        "language_id": language_id,
        "source_code": source_code,
        "stdin": stdin,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            created = await client.post(f"{JUDGE0_URL}/submissions", params={"base64_encoded": "false"}, json=payload)
            if not created.is_success:
                raise HTTPException(status_code=502, detail="Code execution service rejected the submission.")
            token = created.json().get("token")
            if not token:
                raise HTTPException(status_code=502, detail="Code execution service did not return a token.")
            started = time.perf_counter()
            while time.perf_counter() - started < 60:
                await asyncio.sleep(0.5)
                result = await client.get(f"{JUDGE0_URL}/submissions/{token}", params={"base64_encoded": "false"})
                if not result.is_success:
                    raise HTTPException(status_code=502, detail="Code execution service failed while polling.")
                data = result.json()
                status_id = int((data.get("status") or {}).get("id") or 0)
                if status_id in TERMINAL_STATUS_IDS:
                    return data
            raise HTTPException(status_code=504, detail="Code execution timed out.")
    except HTTPException:
        raise
    except httpx.ConnectError as exc:
        raise HTTPException(status_code=503, detail="Code execution service is not available.") from exc
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="Code execution timed out.") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Code execution failed.") from exc


@router.get("")
async def list_challenges(db: Session = Depends(get_db)) -> list[dict]:
    challenges = db.query(Challenge).order_by(Challenge.created_at.desc()).all()
    return [_serialize_challenge(challenge, db) for challenge in challenges]


@router.post("")
async def create_challenge(payload: ChallengeCreate, request: Request, db: Session = Depends(get_db)) -> dict:
    rate_limit(request, "challenges:create", 20, 60 * 60)
    raw_key = payload.admin_password or make_id(32)
    template_code = {
        sanitize_text(str(key), 20): value.replace("\x00", "")[:100_000]
        for key, value in (payload.template_code or {}).items()
    }
    challenge = Challenge(
        id=make_id(),
        title=sanitize_text(payload.title, 200, allow_empty=False),
        description=sanitize_text(payload.description, 20_000, allow_empty=False),
        difficulty=payload.difficulty if payload.difficulty in ALLOWED_DIFFICULTIES else "easy",
        language_ids=sorted({int(language_id) for language_id in payload.language_ids}),
        template_code=template_code,
        admin_key_hash=hash_secret(raw_key),
    )
    for _ in range(5):
        try:
            db.add(challenge)
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            challenge.id = make_id()
    else:
        raise HTTPException(status_code=500, detail="Could not create challenge.")
    return {**_serialize_challenge(challenge, db), "admin_key": raw_key}


@router.get("/{challenge_id}")
async def get_challenge(challenge_id: str, db: Session = Depends(get_db)) -> dict:
    return _serialize_challenge(_get_challenge(challenge_id, db), db, include_tests=True)


@router.post("/{challenge_id}/test-cases")
async def create_test_case(
    challenge_id: str,
    payload: TestCaseCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    challenge = _get_challenge(challenge_id, db)
    _require_admin(challenge, request.headers.get("x-admin-key"))
    sort_order = db.query(TestCase).filter(TestCase.challenge_id == challenge_id).count()
    item = TestCase(
        challenge_id=challenge_id,
        input=payload.input.replace("\x00", ""),
        expected_output=payload.expected_output.replace("\x00", ""),
        is_hidden=payload.is_hidden,
        points=payload.points,
        sort_order=sort_order,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize_test_case(item, reveal_hidden=True)


@router.post("/{challenge_id}/submit")
async def submit_challenge(
    challenge_id: str,
    payload: ChallengeSubmit,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    challenge = _get_challenge(challenge_id, db)
    if payload.language_id not in (challenge.language_ids or []):
        raise HTTPException(status_code=400, detail="Language is not supported for this challenge.")
    rate_limit(request, "challenges:submit", 10, 60 * 60, subject=f"{request.client.host if request.client else 'unknown'}:{challenge_id}")
    query = db.query(TestCase).filter(TestCase.challenge_id == challenge_id)
    if payload.visible_only:
        query = query.filter(TestCase.is_hidden.is_(False))
    cases = query.order_by(TestCase.sort_order.asc()).all()
    if not cases:
        raise HTTPException(status_code=400, detail="Challenge has no test cases.")

    results: list[dict[str, Any]] = []
    total_passed = 0
    score = 0
    time_ms = 0.0
    memory_kb = 0.0
    for index, case in enumerate(cases, start=1):
        data = await _submit_code(payload.language_id, payload.source_code, case.input)
        stdout = data.get("stdout") or ""
        stderr = data.get("stderr") or data.get("compile_output") or ""
        status = data.get("status") or {}
        passed = stdout.strip() == (case.expected_output or "").strip() and int(status.get("id") or 0) == 3
        if passed:
            total_passed += 1
            score += case.points or 1
        case_time_ms = float(data.get("time") or 0) * 1000
        case_memory = float(data.get("memory") or 0)
        time_ms += case_time_ms
        memory_kb = max(memory_kb, case_memory)
        result = {
            "index": index,
            "test_case_id": case.id,
            "hidden": case.is_hidden,
            "passed": passed,
            "status": status.get("description") or "",
            "time_ms": round(case_time_ms, 2),
            "memory_kb": case_memory,
            "points": case.points or 1,
        }
        if not case.is_hidden:
            result.update({
                "input": case.input,
                "expected_output": case.expected_output,
                "actual_output": stdout,
                "stderr": stderr,
            })
        results.append(result)

    submission = ChallengeSubmission(
        challenge_id=challenge_id,
        language_id=payload.language_id,
        source_code=payload.source_code,
        results=results,
        total_passed=total_passed,
        total_tests=len(cases),
        score=score,
        time_ms=round(time_ms, 2),
        memory_kb=memory_kb,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return _serialize_submission(submission)


@router.get("/{challenge_id}/submissions")
async def list_submissions(challenge_id: str, db: Session = Depends(get_db)) -> list[dict]:
    _get_challenge(challenge_id, db)
    submissions = (
        db.query(ChallengeSubmission)
        .filter(ChallengeSubmission.challenge_id == challenge_id)
        .order_by(ChallengeSubmission.submitted_at.desc())
        .limit(10)
        .all()
    )
    return [_serialize_submission(submission) for submission in submissions]
