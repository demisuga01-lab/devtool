from __future__ import annotations

import base64
import io
import posixpath
import time
import zipfile

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.api.routes._utils import rate_limit, sanitize_text

router = APIRouter(prefix="/tools", tags=["multifile-runner"])

JUDGE0_URL = "http://localhost:2358"
MAX_FILES = 20
MAX_FILE_BYTES = 100_000
MAX_TOTAL_BYTES = 500_000
MAX_STDIN_BYTES = 20_000
TERMINAL_STATUS_IDS = {3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14}


class ProjectFile(BaseModel):
    filename: str = Field(..., max_length=180)
    content: str = Field(..., max_length=MAX_FILE_BYTES)


class MultifileRunRequest(BaseModel):
    language_id: int = Field(..., ge=1)
    files: list[ProjectFile] = Field(..., min_length=1, max_length=MAX_FILES)
    main_file: str = Field(..., max_length=180)
    stdin: str | None = Field(default=None, max_length=MAX_STDIN_BYTES)


def _safe_filename(value: str) -> str:
    cleaned = sanitize_text(value, 180, allow_empty=False).replace("\\", "/")
    normalized = posixpath.normpath(cleaned).lstrip("/")
    if normalized in {"", "."} or normalized.startswith("../") or "/../" in normalized:
        raise HTTPException(status_code=400, detail="Invalid filename.")
    return normalized


def _create_additional_files(files: list[ProjectFile], main_file: str) -> str | None:
    extras = [file for file in files if _safe_filename(file.filename) != main_file]
    if not extras:
        return None
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file in extras:
            archive.writestr(_safe_filename(file.filename), file.content)
    return base64.b64encode(buffer.getvalue()).decode("ascii")


async def _submit_and_poll(payload: dict) -> dict:
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
                await _sleep(0.6)
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


async def _sleep(seconds: float) -> None:
    import asyncio

    await asyncio.sleep(seconds)


def _normalize_result(data: dict) -> dict:
    status = data.get("status") or {}
    exit_code = data.get("exit_code")
    if exit_code is None:
        exit_code = 0 if status.get("id") == 3 else 1
    stdout = data.get("stdout") or ""
    stderr = data.get("stderr") or ""
    compile_output = data.get("compile_output") or ""
    message = data.get("message") or ""
    return {
        "stdout": stdout,
        "stderr": stderr,
        "output": stdout,
        "exit_code": exit_code,
        "signal": data.get("signal"),
        "time": data.get("time"),
        "memory": data.get("memory"),
        "cpu_time": int(float(data.get("time") or 0) * 1000),
        "wall_time": int(float(data.get("time") or 0) * 1000),
        "compile_output": compile_output,
        "compile_stderr": "",
        "message": message,
        "status": "ok" if status.get("id") == 3 else "error",
        "status_description": status.get("description") or "",
    }


@router.post("/run-multifile")
async def run_multifile(payload: MultifileRunRequest, request: Request) -> dict:
    rate_limit(request, "tools:run-multifile", 30, 60)
    safe_main = _safe_filename(payload.main_file)
    files_by_name: dict[str, ProjectFile] = {}
    total_bytes = 0
    for file in payload.files:
        safe_name = _safe_filename(file.filename)
        if safe_name in files_by_name:
            raise HTTPException(status_code=400, detail="Duplicate filenames are not allowed.")
        content_bytes = len(file.content.encode("utf-8"))
        if content_bytes > MAX_FILE_BYTES:
            raise HTTPException(status_code=400, detail="A project file is too large.")
        total_bytes += content_bytes
        files_by_name[safe_name] = ProjectFile(filename=safe_name, content=file.content)
    if total_bytes > MAX_TOTAL_BYTES:
        raise HTTPException(status_code=400, detail="Project is too large.")
    main = files_by_name.get(safe_main)
    if main is None:
        raise HTTPException(status_code=400, detail="Main file must match one of the project files.")

    judge_payload = {
        "language_id": payload.language_id,
        "source_code": main.content,
        "stdin": (payload.stdin or "")[:MAX_STDIN_BYTES],
    }
    additional_files = _create_additional_files(list(files_by_name.values()), safe_main)
    if additional_files:
        judge_payload["additional_files"] = additional_files

    return _normalize_result(await _submit_and_poll(judge_payload))
