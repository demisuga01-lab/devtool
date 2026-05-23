from __future__ import annotations

import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes._utils import hash_secret, iso, make_id, rate_limit, sanitize_text, verify_secret
from app.core.database import get_db
from app.models.extended import ApiCollection, CollectionEnvironment, CollectionRequest

router = APIRouter(prefix="/collections/api", tags=["api-collections"])


class KeyValue(BaseModel):
    key: str = Field(..., max_length=200)
    value: str = Field(default="", max_length=8000)
    enabled: bool = True


class ApiCollectionCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    admin_password: str | None = Field(default=None, max_length=200)


class CollectionRequestPayload(BaseModel):
    name: str = Field(..., max_length=200)
    method: str = Field(default="GET", max_length=12)
    url: str = Field(..., max_length=4000)
    headers: list[KeyValue] = Field(default_factory=list, max_length=100)
    body: str | None = Field(default=None, max_length=2 * 1024 * 1024)
    body_type: Literal["none", "json", "form", "text", "xml"] = "none"
    auth_type: str = Field(default="none", max_length=50)
    auth_config: dict[str, Any] = Field(default_factory=dict)
    params: list[KeyValue] = Field(default_factory=list, max_length=100)
    folder: str | None = Field(default=None, max_length=200)


class EnvironmentPayload(BaseModel):
    name: str = Field(..., max_length=200)
    variables: list[KeyValue] = Field(default_factory=list, max_length=200)


def _clean_pairs(items: list[KeyValue]) -> list[dict[str, Any]]:
    return [
        {
            "key": sanitize_text(item.key, 200),
            "value": (item.value or "").replace("\x00", "")[:8000],
            "enabled": item.enabled,
        }
        for item in items
        if sanitize_text(item.key, 200)
    ]


def _serialize_collection(collection: ApiCollection) -> dict:
    return {
        "id": collection.id,
        "name": collection.name,
        "description": collection.description,
        "created_at": iso(collection.created_at),
        "updated_at": iso(collection.updated_at),
        "request_count": collection.request_count or 0,
    }


def _serialize_request(item: CollectionRequest) -> dict:
    return {
        "id": item.id,
        "collection_id": item.collection_id,
        "name": item.name,
        "method": item.method,
        "url": item.url,
        "headers": item.headers or [],
        "body": item.body,
        "body_type": item.body_type,
        "auth_type": item.auth_type,
        "auth_config": item.auth_config or {},
        "params": item.params or [],
        "sort_order": item.sort_order or 0,
        "created_at": iso(item.created_at),
        "folder": item.folder,
    }


def _serialize_environment(item: CollectionEnvironment) -> dict:
    return {
        "id": item.id,
        "collection_id": item.collection_id,
        "name": item.name,
        "variables": item.variables or [],
    }


def _get_collection(collection_id: str, db: Session) -> ApiCollection:
    collection = db.query(ApiCollection).filter(ApiCollection.id == collection_id).first()
    if collection is None:
        raise HTTPException(status_code=404, detail="API collection not found.")
    return collection


def _require_admin(collection: ApiCollection, x_admin_key: str | None) -> None:
    if not x_admin_key or not verify_secret(x_admin_key, collection.admin_key_hash):
        raise HTTPException(status_code=403, detail="Admin key required.")


def _request_model(collection: ApiCollection, payload: CollectionRequestPayload, sort_order: int = 0) -> CollectionRequest:
    return CollectionRequest(
        collection_id=collection.id,
        name=sanitize_text(payload.name, 200, allow_empty=False),
        method=sanitize_text(payload.method.upper(), 12, allow_empty=False),
        url=sanitize_text(payload.url, 4000, allow_empty=False),
        headers=_clean_pairs(payload.headers),
        body=(payload.body or "").replace("\x00", "") if payload.body is not None else None,
        body_type=payload.body_type,
        auth_type=sanitize_text(payload.auth_type, 50) or "none",
        auth_config=payload.auth_config or {},
        params=_clean_pairs(payload.params),
        sort_order=sort_order,
        folder=sanitize_text(payload.folder, 200) if payload.folder else None,
    )


@router.post("")
async def create_api_collection(payload: ApiCollectionCreate, request: Request, db: Session = Depends(get_db)) -> dict:
    rate_limit(request, "api-collections:create", 20, 60 * 60)
    raw_key = payload.admin_password or make_id(32)
    collection = ApiCollection(
        id=make_id(),
        name=sanitize_text(payload.name, 200, allow_empty=False),
        description=sanitize_text(payload.description, 1000) if payload.description else None,
        admin_key_hash=hash_secret(raw_key),
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
        raise HTTPException(status_code=500, detail="Could not create API collection.")
    return {**_serialize_collection(collection), "admin_key": raw_key}


@router.get("/{collection_id}")
async def get_api_collection(collection_id: str, db: Session = Depends(get_db)) -> dict:
    collection = _get_collection(collection_id, db)
    requests = (
        db.query(CollectionRequest)
        .filter(CollectionRequest.collection_id == collection_id)
        .order_by(CollectionRequest.sort_order.asc(), CollectionRequest.created_at.asc())
        .all()
    )
    environments = db.query(CollectionEnvironment).filter(CollectionEnvironment.collection_id == collection_id).order_by(CollectionEnvironment.name.asc()).all()
    return {
        "collection": _serialize_collection(collection),
        "requests": [_serialize_request(item) for item in requests],
        "environments": [_serialize_environment(item) for item in environments],
    }


@router.post("/{collection_id}/requests")
async def create_collection_request(
    collection_id: str,
    payload: CollectionRequestPayload,
    x_admin_key: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    collection = _get_collection(collection_id, db)
    _require_admin(collection, x_admin_key)
    sort_order = db.query(CollectionRequest).filter(CollectionRequest.collection_id == collection_id).count()
    item = _request_model(collection, payload, sort_order)
    collection.request_count = (collection.request_count or 0) + 1
    collection.updated_at = datetime.datetime.utcnow()
    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize_request(item)


@router.put("/{collection_id}/requests/{request_id}")
async def update_collection_request(
    collection_id: str,
    request_id: str,
    payload: CollectionRequestPayload,
    x_admin_key: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    collection = _get_collection(collection_id, db)
    _require_admin(collection, x_admin_key)
    item = db.query(CollectionRequest).filter(CollectionRequest.collection_id == collection_id, CollectionRequest.id == request_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Collection request not found.")
    item.name = sanitize_text(payload.name, 200, allow_empty=False)
    item.method = sanitize_text(payload.method.upper(), 12, allow_empty=False)
    item.url = sanitize_text(payload.url, 4000, allow_empty=False)
    item.headers = _clean_pairs(payload.headers)
    item.body = (payload.body or "").replace("\x00", "") if payload.body is not None else None
    item.body_type = payload.body_type
    item.auth_type = sanitize_text(payload.auth_type, 50) or "none"
    item.auth_config = payload.auth_config or {}
    item.params = _clean_pairs(payload.params)
    item.folder = sanitize_text(payload.folder, 200) if payload.folder else None
    collection.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(item)
    return _serialize_request(item)


@router.delete("/{collection_id}/requests/{request_id}")
async def delete_collection_request(
    collection_id: str,
    request_id: str,
    x_admin_key: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    collection = _get_collection(collection_id, db)
    _require_admin(collection, x_admin_key)
    item = db.query(CollectionRequest).filter(CollectionRequest.collection_id == collection_id, CollectionRequest.id == request_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Collection request not found.")
    db.delete(item)
    collection.request_count = max(0, (collection.request_count or 1) - 1)
    collection.updated_at = datetime.datetime.utcnow()
    db.commit()
    return {"deleted": True}


@router.post("/{collection_id}/environments")
async def create_environment(
    collection_id: str,
    payload: EnvironmentPayload,
    x_admin_key: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    collection = _get_collection(collection_id, db)
    _require_admin(collection, x_admin_key)
    item = CollectionEnvironment(
        collection_id=collection_id,
        name=sanitize_text(payload.name, 200, allow_empty=False),
        variables=_clean_pairs(payload.variables),
    )
    collection.updated_at = datetime.datetime.utcnow()
    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize_environment(item)


@router.get("/{collection_id}/export")
async def export_collection(collection_id: str, db: Session = Depends(get_db)) -> dict:
    data = await get_api_collection(collection_id, db)
    collection = data["collection"]
    items = []
    for item in data["requests"]:
        headers = [{"key": h.get("key", ""), "value": h.get("value", "")} for h in item["headers"] if h.get("enabled", True)]
        query = [{"key": p.get("key", ""), "value": p.get("value", "")} for p in item["params"] if p.get("enabled", True)]
        items.append({
            "name": item["name"],
            "request": {
                "method": item["method"],
                "header": headers,
                "url": {"raw": item["url"], "query": query},
                "body": {"mode": "raw", "raw": item.get("body") or ""},
            },
        })
    return {
        "info": {
            "name": collection["name"],
            "description": collection.get("description") or "",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "item": items,
    }
