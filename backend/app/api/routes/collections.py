from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes._utils import hash_secret, iso, make_id, parse_page, rate_limit, sanitize_text
from app.core.database import get_db
from app.models.extended import Collection
from app.models.paste import Paste

router = APIRouter(prefix="/collections", tags=["collections"])


class CollectionCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    admin_password: str | None = Field(default=None, max_length=200)


def serialize_collection(collection: Collection) -> dict:
    return {
        "id": collection.id,
        "name": collection.name,
        "description": collection.description,
        "created_at": iso(collection.created_at),
    }


def serialize_paste_summary(paste: Paste) -> dict:
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
        "preview": (paste.content or "")[:240],
    }


@router.post("")
async def create_collection(payload: CollectionCreate, request: Request, db: Session = Depends(get_db)) -> dict:
    rate_limit(request, "collections:create", 20, 60 * 60)
    raw_key = payload.admin_password or make_id(32)
    collection = Collection(
        id=make_id(),
        name=sanitize_text(payload.name, 200, allow_empty=False),
        description=sanitize_text(payload.description, 1000) if payload.description else None,
        admin_key=hash_secret(raw_key),
    )
    for _ in range(5):
        try:
            db.add(collection)
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            collection.id = make_id()
    else:
        raise HTTPException(status_code=500, detail="Could not create collection.")
    return {**serialize_collection(collection), "admin_key": raw_key}


@router.get("/{collection_id}")
async def get_collection(
    collection_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> dict:
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if collection is None:
        raise HTTPException(status_code=404, detail="Collection not found.")
    page, per_page = parse_page(page, per_page)
    query = db.query(Paste).filter(Paste.collection_id == collection_id)
    total = query.count()
    pastes = query.order_by(Paste.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "collection": serialize_collection(collection),
        "items": [serialize_paste_summary(paste) for paste in pastes],
        "page": page,
        "per_page": per_page,
        "total": total,
    }


@router.get("")
async def list_collections(db: Session = Depends(get_db)) -> list[dict]:
    collections = db.query(Collection).order_by(Collection.created_at.desc()).limit(100).all()
    return [serialize_collection(collection) for collection in collections]


@router.get("/paste/search")
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
    tag_values = [tag.strip() for tag in tags.split(",") if tag.strip()]
    for tag in tag_values:
        query = query.filter(Paste.tags.any(tag))
    total = query.count()
    pastes = query.order_by(Paste.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [serialize_paste_summary(paste) for paste in pastes], "page": page, "per_page": per_page, "total": total}
