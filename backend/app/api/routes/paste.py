from __future__ import annotations

import datetime
import secrets
from typing import Literal

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes._utils import iso, parse_page, sanitize_text
from app.api.routes.api_keys import authorize_api_key
from app.core.database import get_db
from app.models.extended import Collection, Workspace
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
    tags: list[str] = Field(default_factory=list, max_length=20)
    collection_id: str | None = Field(default=None, max_length=12)
    workspace_id: str | None = Field(default=None, max_length=12)
    workspace_password: str | None = Field(default=None, max_length=200)


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
        "tags": paste.tags or [],
        "collection_id": paste.collection_id,
        "workspace_id": paste.workspace_id,
    }
    if include_content:
        data["content"] = paste.content
    return data


def _serialize_paste_summary(paste: Paste) -> dict:
    content = paste.content or ""
    return {
        "id": paste.id,
        "title": paste.title,
        "language": paste.language,
        "tags": paste.tags or [],
        "collection_id": paste.collection_id,
        "workspace_id": paste.workspace_id,
        "created_at": iso(paste.created_at),
        "expires_at": iso(paste.expires_at),
        "view_count": paste.view_count,
        "is_private": paste.is_private,
        "preview": content[:240] if not paste.password_hash and not paste.is_private else "",
    }


def _clean_tags(tags: list[str]) -> list[str]:
    cleaned: list[str] = []
    for tag in tags[:20]:
        value = sanitize_text(tag, 40).lower()
        if value and value not in cleaned:
            cleaned.append(value)
    return cleaned


def _validate_collection(db: Session, collection_id: str | None) -> str | None:
    if not collection_id:
        return None
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if collection is None:
        raise HTTPException(status_code=400, detail="Collection not found.")
    return collection_id


def _validate_workspace(db: Session, workspace_id: str | None, password: str | None) -> str | None:
    if not workspace_id:
        return None
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace is None:
        raise HTTPException(status_code=400, detail="Workspace not found.")
    if not password or not _password_matches(password, workspace.password_hash):
        raise HTTPException(status_code=403, detail="Workspace password is incorrect.")
    workspace.last_accessed = datetime.datetime.utcnow()
    workspace.paste_count = (workspace.paste_count or 0) + 1
    return workspace_id


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
    api_key = authorize_api_key(request, db)
    if api_key is None:
        _check_create_rate_limit(request)
    if len(payload.content.encode("utf-8")) > MAX_CONTENT_BYTES:
        raise HTTPException(status_code=400, detail="Paste content must be 500KB or less.")

    paste_id = generate_paste_id()
    paste = Paste(
        id=paste_id,
        content=sanitize_text(payload.content, MAX_CONTENT_BYTES, allow_empty=False),
        language=sanitize_text(payload.language, 50) or "plaintext",
        title=sanitize_text(payload.title, 200),
        password_hash=_hash_password(payload.password),
        burn_after_read=payload.burn_after_read,
        view_limit=payload.view_limit,
        expires_at=_expires_at(payload.expires_in),
        is_private=payload.is_private,
        delete_token=secrets.token_urlsafe(32),
        tags=_clean_tags(payload.tags),
        collection_id=_validate_collection(db, payload.collection_id),
        workspace_id=_validate_workspace(db, payload.workspace_id, payload.workspace_password),
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


@router.get("/search")
async def search_pastes(
    q: str = "",
    tags: str = "",
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> dict:
    page, per_page = parse_page(page, per_page)
    query = db.query(Paste)
    cleaned_q = sanitize_text(q, 200)
    if cleaned_q:
        like = f"%{cleaned_q}%"
        query = query.filter(or_(Paste.title.ilike(like), Paste.content.ilike(like)))
    tag_values = [sanitize_text(tag, 40).lower() for tag in tags.split(",") if sanitize_text(tag, 40)]
    for tag in tag_values:
        query = query.filter(Paste.tags.any(tag))
    total = query.count()
    pastes = query.order_by(Paste.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [_serialize_paste_summary(paste) for paste in pastes], "page": page, "per_page": per_page, "total": total}


@router.get(
    "/raw/{paste_id}",
    response_class=PlainTextResponse,
    response_model=None,
)
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


@router.get("/{paste_id}", response_model=None)
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
