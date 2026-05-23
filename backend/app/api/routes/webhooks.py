from __future__ import annotations

import datetime
import ipaddress
import socket
import time
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes._utils import iso, make_id, parse_page, rate_limit
from app.core.database import get_db
from app.models.extended import WebhookInbox, WebhookRequest

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
hook_router = APIRouter(prefix="/hook", tags=["webhook-hook"])

WEBHOOK_BASE_URL = "https://devtools.wellfriend.online/hook"
MAX_BODY_BYTES = 1024 * 1024
BLOCKED_HEADER_NAMES = {"host", "connection", "content-length", "transfer-encoding", "accept-encoding"}


class ReplayRequest(BaseModel):
    target_url: str = Field(..., max_length=2000)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    return request.client.host if request.client else "unknown"


def _serialize_request(item: WebhookRequest, include_body: bool = True) -> dict:
    data = {
        "id": item.id,
        "inbox_id": item.inbox_id,
        "received_at": iso(item.received_at),
        "method": item.method,
        "headers": item.headers or {},
        "query_params": item.query_params or {},
        "body_size_bytes": item.body_size_bytes,
        "content_type": item.content_type,
        "source_ip": item.source_ip,
    }
    if include_body:
        data["body"] = item.body
    return data


def _serialize_inbox(inbox: WebhookInbox, requests: list[WebhookRequest] | None = None) -> dict:
    data = {
        "id": inbox.id,
        "url": f"{WEBHOOK_BASE_URL}/{inbox.id}",
        "created_at": iso(inbox.created_at),
        "expires_at": iso(inbox.expires_at),
        "request_count": inbox.request_count,
        "max_requests": inbox.max_requests,
    }
    if requests is not None:
        data["requests"] = [_serialize_request(item) for item in requests]
    return data


def _get_live_inbox(inbox_id: str, db: Session) -> WebhookInbox:
    inbox = db.query(WebhookInbox).filter(WebhookInbox.id == inbox_id).first()
    if inbox is None:
        raise HTTPException(status_code=404, detail="Webhook inbox not found.")
    if inbox.expires_at and inbox.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=410, detail="Webhook inbox has expired.")
    return inbox


def _ensure_public_target(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise HTTPException(status_code=400, detail="Replay target must be an HTTP or HTTPS URL.")
    host = parsed.hostname.strip().lower()
    if host in {"localhost", "metadata.google.internal"} or host.endswith(".localhost"):
        raise HTTPException(status_code=400, detail="Replay target is not allowed.")
    try:
        addresses = socket.getaddrinfo(host, parsed.port, type=socket.SOCK_STREAM)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Replay target could not be resolved.")
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
            or str(ip).startswith("169.254.")
        ):
            raise HTTPException(status_code=400, detail="Replay target is not allowed.")
    return url


@router.post("/inbox")
async def create_inbox(request: Request, db: Session = Depends(get_db)) -> dict:
    rate_limit(request, "webhooks:inbox:create", 30, 60 * 60)
    inbox = WebhookInbox(
        id=make_id(),
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        max_requests=100,
    )
    for _ in range(5):
        try:
            db.add(inbox)
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            inbox.id = make_id()
    else:
        raise HTTPException(status_code=500, detail="Could not create webhook inbox.")
    return _serialize_inbox(inbox)


@hook_router.api_route("/{inbox_id}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def receive_webhook(inbox_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    inbox = _get_live_inbox(inbox_id, db)
    if (inbox.request_count or 0) >= (inbox.max_requests or 100):
        raise HTTPException(status_code=429, detail="Webhook inbox request limit reached.")
    body_bytes = await request.body()
    if len(body_bytes) > MAX_BODY_BYTES:
        raise HTTPException(status_code=400, detail="Webhook body is too large.")
    item = WebhookRequest(
        inbox_id=inbox.id,
        method=request.method,
        headers={key: value for key, value in request.headers.items()},
        query_params={key: value for key, value in request.query_params.multi_items()},
        body=body_bytes.decode("utf-8", errors="replace"),
        body_size_bytes=len(body_bytes),
        content_type=request.headers.get("content-type", ""),
        source_ip=_client_ip(request),
    )
    inbox.request_count = (inbox.request_count or 0) + 1
    db.add(item)
    db.commit()
    return {"received": True}


@router.get("/inbox/{inbox_id}")
async def get_inbox(inbox_id: str, db: Session = Depends(get_db)) -> dict:
    inbox = _get_live_inbox(inbox_id, db)
    requests = (
        db.query(WebhookRequest)
        .filter(WebhookRequest.inbox_id == inbox_id)
        .order_by(WebhookRequest.received_at.desc())
        .limit(50)
        .all()
    )
    return _serialize_inbox(inbox, requests)


@router.get("/inbox/{inbox_id}/requests")
async def get_requests(
    inbox_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> dict:
    _get_live_inbox(inbox_id, db)
    page, per_page = parse_page(page, per_page)
    query = db.query(WebhookRequest).filter(WebhookRequest.inbox_id == inbox_id)
    total = query.count()
    requests = query.order_by(WebhookRequest.received_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [_serialize_request(item) for item in requests], "page": page, "per_page": per_page, "total": total}


@router.delete("/inbox/{inbox_id}/requests")
async def clear_requests(inbox_id: str, db: Session = Depends(get_db)) -> dict:
    inbox = _get_live_inbox(inbox_id, db)
    deleted = db.query(WebhookRequest).filter(WebhookRequest.inbox_id == inbox_id).delete()
    inbox.request_count = 0
    db.commit()
    return {"deleted": deleted}


@router.delete("/inbox/{inbox_id}/requests/{request_id}")
async def delete_request(inbox_id: str, request_id: str, db: Session = Depends(get_db)) -> dict:
    _get_live_inbox(inbox_id, db)
    item = db.query(WebhookRequest).filter(WebhookRequest.inbox_id == inbox_id, WebhookRequest.id == request_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Webhook request not found.")
    db.delete(item)
    db.commit()
    return {"deleted": True}


@router.post("/inbox/{inbox_id}/requests/{request_id}/replay")
async def replay_request(inbox_id: str, request_id: str, payload: ReplayRequest, db: Session = Depends(get_db)) -> dict:
    _get_live_inbox(inbox_id, db)
    item = db.query(WebhookRequest).filter(WebhookRequest.inbox_id == inbox_id, WebhookRequest.id == request_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Webhook request not found.")
    target_url = _ensure_public_target(payload.target_url)
    headers = {
        key: value
        for key, value in (item.headers or {}).items()
        if key.lower() not in BLOCKED_HEADER_NAMES
    }
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=False) as client:
            response = await client.request(item.method, target_url, headers=headers, content=item.body.encode("utf-8"))
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=400, detail=f"Replay failed: {exc}") from exc
    elapsed_ms = round((time.perf_counter() - start) * 1000)
    return {
        "status_code": response.status_code,
        "response_body": response.text[:100000],
        "response_time_ms": elapsed_ms,
    }
