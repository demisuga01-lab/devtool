from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes._utils import hash_secret, iso, make_id, parse_page, rate_limit, verify_secret
from app.core.database import get_db
from app.models.extended import Workspace
from app.models.paste import Paste

router = APIRouter(prefix="/workspace", tags=["workspace"])


class WorkspaceCreate(BaseModel):
    password: str = Field(..., min_length=6, max_length=200)


class WorkspaceVerify(BaseModel):
    password: str = Field(..., max_length=200)


def _serialize_paste(paste: Paste) -> dict:
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
        "preview": (paste.content or "")[:240] if not paste.password_hash else "",
    }


def _get_workspace(workspace_id: str, db: Session) -> Workspace:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    return workspace


def _verify_workspace(workspace: Workspace, password: str | None) -> None:
    if not password or not verify_secret(password, workspace.password_hash):
        raise HTTPException(status_code=403, detail="Workspace password is incorrect.")


@router.post("")
async def create_workspace(payload: WorkspaceCreate, request: Request, db: Session = Depends(get_db)) -> dict:
    rate_limit(request, "workspace:create", 20, 60 * 60)
    workspace = Workspace(id=make_id(), password_hash=hash_secret(payload.password))
    for _ in range(5):
        try:
            db.add(workspace)
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            workspace.id = make_id()
    else:
        raise HTTPException(status_code=500, detail="Could not create workspace.")
    return {"id": workspace.id}


@router.post("/{workspace_id}/verify")
async def verify_workspace(workspace_id: str, payload: WorkspaceVerify, db: Session = Depends(get_db)) -> dict:
    workspace = _get_workspace(workspace_id, db)
    valid = verify_secret(payload.password, workspace.password_hash)
    if valid:
        workspace.last_accessed = datetime.datetime.utcnow()
        db.commit()
    return {"valid": valid, "paste_count": workspace.paste_count or 0}


@router.get("/{workspace_id}/pastes")
async def workspace_pastes(
    workspace_id: str,
    x_workspace_password: str | None = Header(default=None),
    q: str = "",
    language: str = "",
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> dict:
    workspace = _get_workspace(workspace_id, db)
    _verify_workspace(workspace, x_workspace_password)
    workspace.last_accessed = datetime.datetime.utcnow()
    page, per_page = parse_page(page, per_page)
    query = db.query(Paste).filter(Paste.workspace_id == workspace_id)
    if q.strip():
        query = query.filter(Paste.content.ilike(f"%{q.strip()[:200]}%"))
    if language.strip():
        query = query.filter(Paste.language == language.strip()[:50])
    total = query.count()
    pastes = query.order_by(Paste.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    db.commit()
    return {"items": [_serialize_paste(paste) for paste in pastes], "page": page, "per_page": per_page, "total": total}
