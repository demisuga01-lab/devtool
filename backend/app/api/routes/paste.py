from __future__ import annotations

import datetime
import secrets
from typing import Literal

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.paste import Paste, generate_paste_id


router = APIRouter(prefix="/paste", tags=["paste"])

MAX_CONTENT_BYTES = 500 * 1024
PASTE_URL_BASE = "https://devtools.wellfriend.online/paste"
ExpiresIn = Literal["1h", "6h", "24h", "7d", "30d", "never"]

_CREATE_LIMIT = 10
_CREATE_WINDOW_SECONDS = 60 * 60
_create_windows: dict[str, tuple[int, datetime.datetime]] = {}


class PasteCreate(BaseModel):
    content: str
    language: str = Field(default="plaintext", max_length=50)
    title: str = Field(default="", max_length=200)
    password: str | None = Field(default=None, max_length=200)
    burn_after_read: bool = False
    view_limit: int | None = Field(default=None, ge=1, le=1000)
    expires_in: ExpiresIn = "never"
    is_private: bool = False


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _check_create_rate_limit(request: Request) -> None:
    ip = _client_ip(request)
    now = datetime.datetime.utcnow()
    count, window_start = _create_windows.get(ip, (0, now))
    if (now - window_start).total_seconds() >= _CREATE_WINDOW_SECONDS:
        count = 0
        window_start = now
    if count >= _CREATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many pastes. Try again later.")
    _create_windows[ip] = (count + 1, window_start)


def _expires_at(expires_in: ExpiresIn) -> datetime.datetime | None:
    if expires_in == "never":
        return None
    now = datetime.datetime.utcnow()
    deltas = {
        "1h": datetime.timedelta(hours=1),
        "6h": datetime.timedelta(hours=6),
        "24h": datetime.timedelta(hours=24),
        "7d": datetime.timedelta(days=7),
        "30d": datetime.timedelta(days=30),
    }
    return now + deltas[expires_in]


def _hash_password(password: str | None) -> str | None:
    if not password:
        return None
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _password_matches(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def _serialize_paste(paste: Paste, include_content: bool = True) -> dict:
    data = {
        "id": paste.id,
        "language": paste.language,
        "title": paste.title,
        "burn_after_read": paste.burn_after_read,
        "expires_at": paste.expires_at.isoformat() if paste.expires_at else None,
        "created_at": paste.created_at.isoformat() if paste.created_at else "",
        "view_count": paste.view_count,
        "view_limit": paste.view_limit,
        "is_private": paste.is_private,
    }
    if include_content:
        data["content"] = paste.content
    return data


def _get_existing_paste(db: Session, paste_id: str) -> Paste:
    paste = db.query(Paste).filter(Paste.id == paste_id).first()
    if not paste:
        raise HTTPException(status_code=404, detail="Paste not found.")
    if paste.expires_at and paste.expires_at < datetime.datetime.utcnow():
        db.delete(paste)
        db.commit()
        raise HTTPException(status_code=404, detail="This paste has expired.")
    if paste.view_limit is not None and paste.view_count >= paste.view_limit:
        db.delete(paste)
        db.commit()
        raise HTTPException(status_code=404, detail="This paste has expired.")
    return paste


def _authorize_paste(paste: Paste, password: str | None) -> JSONResponse | None:
    if not paste.password_hash:
        return None
    if not password:
        return JSONResponse(
            status_code=403,
            content={"detail": "password_required", "protected": True},
        )
    if not _password_matches(password, paste.password_hash):
        raise HTTPException(status_code=403, detail="Incorrect password.")
    return None


def _consume_paste(db: Session, paste: Paste) -> dict:
    data = _serialize_paste(paste)
    if paste.burn_after_read:
        db.delete(paste)
        db.commit()
        return data
    paste.view_count += 1
    if paste.view_limit is not None and paste.view_count > paste.view_limit:
        db.delete(paste)
        db.commit()
        raise HTTPException(status_code=404, detail="This paste has expired.")
    db.commit()
    db.refresh(paste)
    return _serialize_paste(paste)


@router.post("")
async def create_paste(
    payload: PasteCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    _check_create_rate_limit(request)
    if len(payload.content.encode("utf-8")) > MAX_CONTENT_BYTES:
        raise HTTPException(status_code=400, detail="Paste content must be 500KB or less.")

    paste_id = generate_paste_id()
    paste = Paste(
        id=paste_id,
        content=payload.content,
        language=payload.language.strip() or "plaintext",
        title=payload.title.strip(),
        password_hash=_hash_password(payload.password),
        burn_after_read=payload.burn_after_read,
        view_limit=payload.view_limit,
        expires_at=_expires_at(payload.expires_in),
        is_private=payload.is_private,
        delete_token=secrets.token_urlsafe(32),
    )

    for _ in range(5):
        try:
            db.add(paste)
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            paste.id = generate_paste_id()
    else:
        raise HTTPException(status_code=500, detail="Could not create paste.")

    return {
        "id": paste.id,
        "delete_token": paste.delete_token,
        "url": f"{PASTE_URL_BASE}/{paste.id}",
    }


@router.get("/raw/{paste_id}", response_class=PlainTextResponse)
async def get_raw_paste(
    paste_id: str,
    password: str | None = None,
    db: Session = Depends(get_db),
) -> PlainTextResponse | JSONResponse:
    paste = _get_existing_paste(db, paste_id)
    auth_error = _authorize_paste(paste, password)
    if auth_error:
        return auth_error
    data = _consume_paste(db, paste)
    return PlainTextResponse(data["content"], media_type="text/plain; charset=utf-8")


@router.delete("/{paste_id}")
async def delete_paste(
    paste_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db),
) -> dict:
    paste = db.query(Paste).filter(Paste.id == paste_id).first()
    if not paste:
        raise HTTPException(status_code=404, detail="Paste not found.")
    if not paste.delete_token or not secrets.compare_digest(token, paste.delete_token):
        raise HTTPException(status_code=403, detail="Incorrect delete token.")
    db.delete(paste)
    db.commit()
    return {"deleted": True}


@router.get("/{paste_id}")
async def get_paste(
    paste_id: str,
    password: str | None = None,
    preview: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> dict | JSONResponse:
    paste = _get_existing_paste(db, paste_id)
    auth_error = _authorize_paste(paste, password)
    if auth_error:
        return auth_error
    if preview and paste.burn_after_read:
        return _serialize_paste(paste, include_content=False)
    return _consume_paste(db, paste)
