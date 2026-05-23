from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.routes._utils import expiry_from_hours, iso, rate_limit, sanitize_text
from app.core.database import get_db
from app.models.extended import Secret

router = APIRouter(prefix="/secrets", tags=["secrets"])

MAX_SECRET_BYTES = 512 * 1024


class SecretCreate(BaseModel):
    encrypted_content: str = Field(..., max_length=MAX_SECRET_BYTES * 2)
    iv: str = Field(..., max_length=200)
    expires_in_hours: int | None = 24


@router.post("")
async def create_secret(payload: SecretCreate, request: Request, db: Session = Depends(get_db)) -> dict:
    rate_limit(request, "secrets:create", 10, 60 * 60)
    encrypted_content = sanitize_text(payload.encrypted_content, MAX_SECRET_BYTES * 2, allow_empty=False)
    if len(encrypted_content.encode("utf-8")) > MAX_SECRET_BYTES * 2:
        raise HTTPException(status_code=400, detail="Secret payload is too large.")
    secret = Secret(
        encrypted_content=encrypted_content,
        iv=sanitize_text(payload.iv, 200, allow_empty=False),
        expires_at=expiry_from_hours(payload.expires_in_hours, 24),
    )
    db.add(secret)
    db.commit()
    db.refresh(secret)
    return {"id": secret.id, "expires_at": iso(secret.expires_at)}


@router.get("/{secret_id}")
async def read_secret(secret_id: str, db: Session = Depends(get_db)) -> dict:
    secret = db.query(Secret).filter(Secret.id == secret_id).first()
    if secret is None:
        raise HTTPException(status_code=404, detail="Secret has already been viewed")
    if secret.expires_at and secret.expires_at < datetime.datetime.utcnow():
        db.delete(secret)
        db.commit()
        raise HTTPException(status_code=410, detail="Secret has expired")
    if secret.viewed:
        db.delete(secret)
        db.commit()
        raise HTTPException(status_code=404, detail="Secret has already been viewed")

    data = {
        "id": secret.id,
        "encrypted_content": secret.encrypted_content,
        "iv": secret.iv,
        "expires_at": iso(secret.expires_at),
    }
    secret.viewed = True
    secret.view_count += 1
    db.delete(secret)
    db.commit()
    return data
