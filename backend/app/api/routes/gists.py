from __future__ import annotations

import datetime

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes._utils import expiry_from_hours, hash_secret, iso, make_id, rate_limit, sanitize_text, verify_secret
from app.core.database import get_db
from app.models.extended import Gist, GistFile

router = APIRouter(prefix="/gists", tags=["gists"])

MAX_FILES = 10
MAX_FILE_BYTES = 512 * 1024


class GistFilePayload(BaseModel):
    filename: str = Field(..., max_length=300)
    language: str = Field(default="plaintext", max_length=50)
    content: str = Field(..., max_length=MAX_FILE_BYTES)


class GistCreate(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    description: str | None = Field(default=None, max_length=2000)
    files: list[GistFilePayload] = Field(..., min_length=1, max_length=MAX_FILES)
    expires_in_hours: int | None = None
    admin_password: str | None = Field(default=None, max_length=200)


class GistUpdate(BaseModel):
    admin_key: str = Field(..., max_length=300)
    title: str | None = Field(default=None, max_length=300)
    description: str | None = Field(default=None, max_length=2000)
    files: list[GistFilePayload] = Field(..., min_length=1, max_length=MAX_FILES)


class GistDelete(BaseModel):
    admin_key: str = Field(..., max_length=300)


def _serialize_file(file: GistFile) -> dict:
    return {
        "id": file.id,
        "filename": file.filename,
        "language": file.language,
        "content": file.content,
        "size_bytes": file.size_bytes,
    }


def _serialize_gist(gist: Gist, files: list[GistFile]) -> dict:
    return {
        "id": gist.id,
        "title": gist.title,
        "description": gist.description,
        "created_at": iso(gist.created_at),
        "expires_at": iso(gist.expires_at),
        "view_count": gist.view_count,
        "files": [_serialize_file(file) for file in files],
    }


def _file_models(gist_id: str, payload_files: list[GistFilePayload]) -> list[GistFile]:
    files: list[GistFile] = []
    for item in payload_files[:MAX_FILES]:
        content = item.content.replace("\x00", "")
        size = len(content.encode("utf-8"))
        if size > MAX_FILE_BYTES:
            raise HTTPException(status_code=400, detail="Each gist file must be 512KB or less.")
        files.append(
            GistFile(
                gist_id=gist_id,
                filename=sanitize_text(item.filename, 300, allow_empty=False),
                language=sanitize_text(item.language, 50) or "plaintext",
                content=content,
                size_bytes=size,
            )
        )
    return files


def _get_gist_or_410(gist_id: str, db: Session) -> Gist:
    gist = db.query(Gist).filter(Gist.id == gist_id).first()
    if gist is None:
        raise HTTPException(status_code=404, detail="Gist not found.")
    if gist.expires_at and gist.expires_at < datetime.datetime.utcnow():
        db.delete(gist)
        db.commit()
        raise HTTPException(status_code=410, detail="Gist has expired.")
    return gist


def _check_admin(gist: Gist, admin_key: str) -> None:
    if not verify_secret(admin_key, gist.admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key.")


@router.post("")
async def create_gist(payload: GistCreate, request: Request, db: Session = Depends(get_db)) -> dict:
    rate_limit(request, "gists:create", 20, 60 * 60)
    raw_key = payload.admin_password or make_id(32)
    gist = Gist(
        id=make_id(),
        title=sanitize_text(payload.title, 300) if payload.title else None,
        description=sanitize_text(payload.description, 2000) if payload.description else None,
        expires_at=expiry_from_hours(payload.expires_in_hours, 0),
        admin_key=hash_secret(raw_key),
    )
    for _ in range(5):
        try:
            db.add(gist)
            db.flush()
            db.add_all(_file_models(gist.id, payload.files))
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            gist.id = make_id()
    else:
        raise HTTPException(status_code=500, detail="Could not create gist.")
    return {"id": gist.id, "admin_key": raw_key}


@router.get("/{gist_id}")
async def get_gist(gist_id: str, db: Session = Depends(get_db)) -> dict:
    gist = _get_gist_or_410(gist_id, db)
    gist.view_count = (gist.view_count or 0) + 1
    files = db.query(GistFile).filter(GistFile.gist_id == gist_id).order_by(GistFile.filename.asc()).all()
    db.commit()
    db.refresh(gist)
    return _serialize_gist(gist, files)


@router.put("/{gist_id}")
async def update_gist(gist_id: str, payload: GistUpdate, db: Session = Depends(get_db)) -> dict:
    gist = _get_gist_or_410(gist_id, db)
    _check_admin(gist, payload.admin_key)
    gist.title = sanitize_text(payload.title, 300) if payload.title else None
    gist.description = sanitize_text(payload.description, 2000) if payload.description else None
    db.query(GistFile).filter(GistFile.gist_id == gist_id).delete()
    files = _file_models(gist_id, payload.files)
    db.add_all(files)
    db.commit()
    db.refresh(gist)
    return _serialize_gist(gist, files)


@router.delete("/{gist_id}")
async def delete_gist(gist_id: str, payload: GistDelete = Body(...), db: Session = Depends(get_db)) -> dict:
    gist = _get_gist_or_410(gist_id, db)
    _check_admin(gist, payload.admin_key)
    db.delete(gist)
    db.commit()
    return {"deleted": True}
