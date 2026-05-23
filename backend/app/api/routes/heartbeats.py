from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes._utils import iso, make_id, rate_limit, sanitize_text
from app.core.database import get_db
from app.models.extended import HeartbeatMonitor, HeartbeatPing

router = APIRouter(prefix="/heartbeats", tags=["heartbeats"])

PING_BASE_URL = "https://devtools.wellfriend.online/api/heartbeats"


class HeartbeatCreate(BaseModel):
    name: str = Field(..., max_length=200)
    expected_interval_minutes: int = Field(..., ge=1, le=60 * 24 * 30)
    grace_period_minutes: int = Field(default=5, ge=0, le=60 * 24)


def _next_expected_at(monitor: HeartbeatMonitor) -> datetime.datetime | None:
    if monitor.last_ping_at is None:
        return None
    return monitor.last_ping_at + datetime.timedelta(minutes=monitor.expected_interval_minutes)


def _current_status(monitor: HeartbeatMonitor, now: datetime.datetime | None = None) -> str:
    now = now or datetime.datetime.utcnow()
    if monitor.last_ping_at is None:
        return "down"
    expected = monitor.last_ping_at + datetime.timedelta(minutes=monitor.expected_interval_minutes)
    grace = expected + datetime.timedelta(minutes=monitor.grace_period_minutes or 0)
    down_at = monitor.last_ping_at + datetime.timedelta(minutes=monitor.expected_interval_minutes * 2)
    if now <= grace:
        return "up"
    if now <= down_at:
        return "late"
    return "down"


def _ping_status_before_update(monitor: HeartbeatMonitor, now: datetime.datetime) -> str:
    if monitor.last_ping_at is None:
        return "up"
    expected = monitor.last_ping_at + datetime.timedelta(minutes=monitor.expected_interval_minutes)
    grace = expected + datetime.timedelta(minutes=monitor.grace_period_minutes or 0)
    return "late" if now > grace else "up"


def _serialize_monitor(monitor: HeartbeatMonitor, history: list[HeartbeatPing] | None = None) -> dict:
    current = _current_status(monitor)
    data = {
        "id": monitor.id,
        "name": monitor.name,
        "expected_interval_minutes": monitor.expected_interval_minutes,
        "grace_period_minutes": monitor.grace_period_minutes,
        "last_ping_at": iso(monitor.last_ping_at),
        "next_expected_at": iso(_next_expected_at(monitor)),
        "status": current,
        "created_at": iso(monitor.created_at),
        "ping_count": monitor.ping_count,
        "ping_url": f"{PING_BASE_URL}/{monitor.id}/ping",
    }
    if history is not None:
        data["history"] = [{"id": ping.id, "pinged_at": iso(ping.pinged_at), "status": ping.status} for ping in history]
    return data


@router.post("")
async def create_heartbeat(payload: HeartbeatCreate, request: Request, db: Session = Depends(get_db)) -> dict:
    rate_limit(request, "heartbeats:create", 30, 60 * 60)
    monitor = HeartbeatMonitor(
        id=make_id(),
        name=sanitize_text(payload.name, 200, allow_empty=False),
        expected_interval_minutes=payload.expected_interval_minutes,
        grace_period_minutes=payload.grace_period_minutes,
        status="down",
    )
    for _ in range(5):
        try:
            db.add(monitor)
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            monitor.id = make_id()
    else:
        raise HTTPException(status_code=500, detail="Could not create heartbeat monitor.")
    return {"id": monitor.id, "ping_url": f"{PING_BASE_URL}/{monitor.id}/ping"}


@router.api_route("/{monitor_id}/ping", methods=["GET", "POST"])
async def receive_ping(monitor_id: str, db: Session = Depends(get_db)) -> dict:
    monitor = db.query(HeartbeatMonitor).filter(HeartbeatMonitor.id == monitor_id).first()
    if monitor is None:
        raise HTTPException(status_code=404, detail="Heartbeat monitor not found.")
    now = datetime.datetime.utcnow()
    ping_status = _ping_status_before_update(monitor, now)
    monitor.last_ping_at = now
    monitor.status = "up"
    monitor.ping_count = (monitor.ping_count or 0) + 1
    db.add(HeartbeatPing(monitor_id=monitor.id, pinged_at=now, status=ping_status))
    db.commit()
    db.refresh(monitor)
    return {"received": True, "next_expected_at": iso(_next_expected_at(monitor))}


@router.get("")
async def list_heartbeats(db: Session = Depends(get_db)) -> list[dict]:
    monitors = db.query(HeartbeatMonitor).order_by(HeartbeatMonitor.created_at.desc()).all()
    results: list[dict] = []
    for monitor in monitors:
        monitor.status = _current_status(monitor)
        history = (
            db.query(HeartbeatPing)
            .filter(HeartbeatPing.monitor_id == monitor.id)
            .order_by(HeartbeatPing.pinged_at.desc())
            .limit(30)
            .all()
        )
        results.append(_serialize_monitor(monitor, list(reversed(history))))
    db.commit()
    return results


@router.delete("/{monitor_id}")
async def delete_heartbeat(monitor_id: str, db: Session = Depends(get_db)) -> dict:
    monitor = db.query(HeartbeatMonitor).filter(HeartbeatMonitor.id == monitor_id).first()
    if monitor is None:
        raise HTTPException(status_code=404, detail="Heartbeat monitor not found.")
    db.delete(monitor)
    db.commit()
    return {"deleted": True}
