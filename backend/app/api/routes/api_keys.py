from __future__ import annotations

import datetime
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.routes._utils import hash_secret, iso, rate_limit, require_admin_password, sanitize_text, verify_secret
from app.core.database import get_db
from app.models.extended import ApiKey

router = APIRouter(prefix="/keys", tags=["api-keys"])


class ApiKeyCreate(BaseModel):
    name: str = Field(..., max_length=200)
    rate_limit_per_hour: int = Field(default=100, ge=1, le=10000)


def _generate_api_key() -> str:
    return f"dt_{secrets.token_urlsafe(32)}"


def _serialize_key(api_key: ApiKey) -> dict:
    return {
        "id": api_key.id,
        "key_prefix": api_key.key_prefix,
        "name": api_key.name,
        "created_at": iso(api_key.created_at),
        "last_used_at": iso(api_key.last_used_at),
        "is_active": api_key.is_active,
        "rate_limit_per_hour": api_key.rate_limit_per_hour,
    }


def authorize_api_key(request: Request, db: Session) -> ApiKey | None:
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None

    active_keys = db.query(ApiKey).filter(ApiKey.is_active.is_(True)).all()
    for api_key in active_keys:
        if verify_secret(token, api_key.key_hash):
            rate_limit(
                request,
                "api-key",
                api_key.rate_limit_per_hour or 100,
                60 * 60,
                subject=api_key.key_prefix,
            )
            api_key.last_used_at = datetime.datetime.utcnow()
            db.commit()
            db.refresh(api_key)
            return api_key

    raise HTTPException(status_code=401, detail="Invalid API key.")


@router.post("")
async def create_api_key(payload: ApiKeyCreate, request: Request, db: Session = Depends(get_db)) -> dict:
    require_admin_password(request)
    raw_key = _generate_api_key()
    api_key = ApiKey(
        key_hash=hash_secret(raw_key),
        key_prefix=raw_key[:8],
        name=sanitize_text(payload.name, 200, allow_empty=False),
        rate_limit_per_hour=payload.rate_limit_per_hour,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return {**_serialize_key(api_key), "key": raw_key}


@router.get("")
async def list_api_keys(request: Request, db: Session = Depends(get_db)) -> list[dict]:
    require_admin_password(request)
    keys = db.query(ApiKey).order_by(ApiKey.created_at.desc()).all()
    return [_serialize_key(api_key) for api_key in keys]


@router.delete("/{key_id}")
async def revoke_api_key(key_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    require_admin_password(request)
    api_key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if api_key is None:
        raise HTTPException(status_code=404, detail="API key not found.")
    api_key.is_active = False
    db.commit()
    return {"revoked": True}
