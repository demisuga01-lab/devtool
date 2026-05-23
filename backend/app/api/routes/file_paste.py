from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes._utils import expiry_from_hours, iso, make_id, rate_limit, sanitize_text
from app.core.database import get_db
from app.models.extended import FilePaste

router = APIRouter(prefix="/file-paste", tags=["file-paste"])

MAX_ENCRYPTED_BYTES = 14 * 1024 * 1024


class FilePasteCreate(BaseModel):
    filename: str = Field(..., max_length=300)
    mime_type: str = Field(default="application/octet-stream", max_length=200)
    encrypted_content: str = Field(..., max_length=MAX_ENCRYPTED_BYTES)
    iv: str = Field(..., max_length=200)
    file_size_bytes: int = Field(..., ge=0, le=10 * 1024 * 1024)
    expires_in_hours: int | None = 24
    burn_after_read: bool = False


def serialize_file_paste(item: FilePaste, include_content: bool = True) -> dict:
    data = {
        "id": item.id,
        "filename": item.filename,
        "mime_type": item.mime_type,
        "file_size_bytes": item.file_size_bytes,
        "created_at": iso(item.created_at),
        "expires_at": iso(item.expires_at),
        "burn_after_read": item.burn_after_read,
        "viewed": item.viewed,
        "iv": item.iv,
    }
    if include_content:
        data["encrypted_content"] = item.encrypted_content
    return data


@router.post("")
async def create_file_paste(payload: FilePasteCreate, request: Request, db: Session = Depends(get_db)) -> dict:
    rate_limit(request, "file-paste:create", 8, 60 * 60)
    encrypted_content = sanitize_text(payload.encrypted_content, MAX_ENCRYPTED_BYTES, allow_empty=False)
    if len(encrypted_content.encode("utf-8")) > MAX_ENCRYPTED_BYTES:
        raise HTTPException(status_code=400, detail="Encrypted file must be 10MB or less.")

    file_paste = FilePaste(
        id=make_id(),
        filename=sanitize_text(payload.filename, 300, allow_empty=False),
        mime_type=sanitize_text(payload.mime_type, 200) or "application/octet-stream",
        encrypted_content=encrypted_content,
        iv=sanitize_text(payload.iv, 200, allow_empty=False),
        file_size_bytes=payload.file_size_bytes,
        expires_at=expiry_from_hours(payload.expires_in_hours, 24),
        burn_after_read=payload.burn_after_read,
    )
    for _ in range(5):
        try:
            db.add(file_paste)
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            file_paste.id = make_id()
    else:
        raise HTTPException(status_code=500, detail="Could not create file paste.")
    return {"id": file_paste.id, "expires_at": iso(file_paste.expires_at)}


@router.get("/{paste_id}")
async def get_file_paste(paste_id: str, db: Session = Depends(get_db)) -> dict:
    item = db.query(FilePaste).filter(FilePaste.id == paste_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="File paste not found.")
    if item.expires_at and item.expires_at < datetime.datetime.utcnow():
        db.delete(item)
        db.commit()
        raise HTTPException(status_code=410, detail="File paste has expired.")
    if item.burn_after_read and item.viewed:
        raise HTTPException(status_code=404, detail="File paste has already been viewed.")
    data = serialize_file_paste(item)
    item.viewed = True
    db.commit()
    return data
