from __future__ import annotations

import asyncio
import json
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.routes.tools import _validate_url
from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.monitor_engine import check_monitor
from app.models.status import (
    AlertConfig,
    Incident,
    IncidentUpdate,
    MaintenanceWindow,
    Monitor,
    MonitorCheck,
    User,
)

router = APIRouter(prefix="/status", tags=["status"])

ALLOWED_METHODS = {"GET", "HEAD", "POST"}
ALLOWED_MONITOR_STATUSES = {"operational", "degraded", "outage", "unknown"}
ALLOWED_INCIDENT_STATUSES = {"investigating", "identified", "monitoring", "resolved"}
ALLOWED_SEVERITIES = {"minor", "major", "critical"}
ALLOWED_ALERT_TYPES = {"email", "webhook"}


class MonitorCreate(BaseModel):
    name: str
    url: str
    method: str = "GET"
    interval: int = 60
    timeout: int = 10
    expected_status: int = 200
    keyword: str | None = None
    is_active: bool = True
    is_public: bool = True
    group_name: str = "General"


class MonitorUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    method: str | None = None
    interval: int | None = None
    timeout: int | None = None
    expected_status: int | None = None
    keyword: str | None = None
    is_active: bool | None = None
    is_public: bool | None = None
    group_name: str | None = None


class AlertCreate(BaseModel):
    type: str
    target: str
    on_down: bool = True
    on_recovery: bool = True


class IncidentCreate(BaseModel):
    title: str
    status: str = "investigating"
    severity: str = "minor"
    message: str | None = None
    affected_monitors: list[int] | None = None
    is_public: bool = True


class IncidentUpdatePayload(BaseModel):
    status: str | None = None
    message: str | None = None
    resolved_at: datetime | None = None
    severity: str | None = None
    affected_monitors: list[int] | None = None
    is_public: bool | None = None
    title: str | None = None


class IncidentUpdateCreate(BaseModel):
    status: str
    message: str


class MaintenanceCreate(BaseModel):
    title: str
    message: str | None = None
    starts_at: datetime
    ends_at: datetime
    affected_monitors: list[int] | None = None
    is_active: bool = True


def _model_data(model: BaseModel, **kwargs: Any) -> dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)
    return model.dict(**kwargs)


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _parse_ids(value: str | None) -> list[int]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [int(item) for item in parsed if isinstance(item, int)]


def _ids_to_json(value: list[int] | None) -> str | None:
    return json.dumps(value or [])


def _public_overall_status(statuses: list[str]) -> str:
    if any(status == "outage" for status in statuses):
        return "outage"
    if any(status != "operational" for status in statuses):
        return "degraded"
    return "operational"


def _status_from_uptime(uptime: float | None) -> str:
    value = 100.0 if uptime is None else uptime
    if value >= 90:
        return "operational"
    if value >= 70:
        return "degraded"
    return "outage"


def _validate_monitor_values(data: dict[str, Any]) -> None:
    if "url" in data and data["url"] is not None:
        data["url"] = _validate_url(data["url"])
    if "method" in data and data["method"] is not None:
        data["method"] = data["method"].upper()
        if data["method"] not in ALLOWED_METHODS:
            raise HTTPException(status_code=400, detail="Unsupported monitor method.")
    if "interval" in data and data["interval"] is not None and data["interval"] < 30:
        raise HTTPException(status_code=400, detail="Monitor interval must be at least 30 seconds.")
    if "timeout" in data and data["timeout"] is not None and data["timeout"] < 1:
        raise HTTPException(status_code=400, detail="Monitor timeout must be at least 1 second.")
    if "expected_status" in data and data["expected_status"] is not None:
        if data["expected_status"] < 100 or data["expected_status"] > 599:
            raise HTTPException(status_code=400, detail="Expected status must be a valid HTTP status code.")
    if "group_name" in data and data["group_name"] is not None and not data["group_name"].strip():
        data["group_name"] = "General"


def _validate_incident_values(status_value: str | None = None, severity: str | None = None) -> None:
    if status_value is not None and status_value not in ALLOWED_INCIDENT_STATUSES:
        raise HTTPException(status_code=400, detail="Unsupported incident status.")
    if severity is not None and severity not in ALLOWED_SEVERITIES:
        raise HTTPException(status_code=400, detail="Unsupported incident severity.")


def _serialize_alert(alert: AlertConfig) -> dict:
    return {
        "id": alert.id,
        "monitor_id": alert.monitor_id,
        "type": alert.type,
        "target": alert.target,
        "on_down": alert.on_down,
        "on_recovery": alert.on_recovery,
        "is_active": alert.is_active,
    }


def _serialize_monitor(monitor: Monitor, db: Session | None = None, include_alerts: bool = False) -> dict:
    data = {
        "id": monitor.id,
        "name": monitor.name,
        "url": monitor.url,
        "method": monitor.method,
        "interval": monitor.interval,
        "timeout": monitor.timeout,
        "expected_status": monitor.expected_status,
        "keyword": monitor.keyword,
        "is_active": monitor.is_active,
        "is_public": monitor.is_public,
        "group_name": monitor.group_name,
        "created_at": _iso(monitor.created_at),
        "last_checked_at": _iso(monitor.last_checked_at),
        "last_status": monitor.last_status,
        "status": monitor.last_status,
        "last_response_ms": monitor.last_response_ms,
        "uptime_30d": monitor.uptime_30d,
    }
    if include_alerts and db is not None:
        alerts = db.query(AlertConfig).filter(AlertConfig.monitor_id == monitor.id).order_by(AlertConfig.id.asc()).all()
        data["alerts"] = [_serialize_alert(alert) for alert in alerts]
    return data


def _serialize_check(check: MonitorCheck, monitor: Monitor | None = None) -> dict:
    data = {
        "id": check.id,
        "monitor_id": check.monitor_id,
        "checked_at": _iso(check.checked_at),
        "status": check.status,
        "response_ms": check.response_ms,
        "status_code": check.status_code,
        "error": check.error,
    }
    if monitor is not None:
        data["monitor_name"] = monitor.name
    return data


def _serialize_update(update: IncidentUpdate) -> dict:
    return {
        "id": update.id,
        "incident_id": update.incident_id,
        "status": update.status,
        "message": update.message,
        "created_at": _iso(update.created_at),
    }


def _serialize_incident(incident: Incident, db: Session, include_private: bool = True) -> dict:
    updates_query = db.query(IncidentUpdate).filter(IncidentUpdate.incident_id == incident.id)
    updates = updates_query.order_by(IncidentUpdate.created_at.desc(), IncidentUpdate.id.desc()).all()
    return {
        "id": incident.id,
        "title": incident.title,
        "status": incident.status,
        "severity": incident.severity,
        "message": incident.message,
        "affected_monitors": _parse_ids(incident.affected_monitors),
        "started_at": _iso(incident.started_at),
        "resolved_at": _iso(incident.resolved_at),
        "is_public": incident.is_public if include_private else True,
        "created_by": incident.created_by if include_private else None,
        "updates": [_serialize_update(update) for update in updates],
    }


def _serialize_maintenance(window: MaintenanceWindow, include_private: bool = True) -> dict:
    return {
        "id": window.id,
        "title": window.title,
        "message": window.message,
        "starts_at": _iso(window.starts_at),
        "ends_at": _iso(window.ends_at),
        "affected_monitors": _parse_ids(window.affected_monitors) if include_private else [],
        "is_active": window.is_active if include_private else True,
    }


@router.get("/public")
async def public_status(db: Session = Depends(get_db)) -> dict:
    monitors = (
        db.query(Monitor)
        .filter(Monitor.is_public.is_(True))
        .order_by(Monitor.group_name.asc(), Monitor.name.asc())
        .all()
    )
    groups_by_name: dict[str, list[Monitor]] = {}
    for monitor in monitors:
        groups_by_name.setdefault(monitor.group_name or "General", []).append(monitor)

    groups = []
    for group_name, group_monitors in groups_by_name.items():
        statuses = [_status_from_uptime(monitor.uptime_30d) for monitor in group_monitors]
        groups.append(
            {
                "name": group_name,
                "status": _public_overall_status(statuses),
                "monitors": [
                    {
                        "id": monitor.id,
                        "name": monitor.name,
                        "status": _status_from_uptime(monitor.uptime_30d),
                        "uptime_30d": monitor.uptime_30d,
                        "last_checked_at": _iso(monitor.last_checked_at),
                        "last_response_ms": monitor.last_response_ms,
                    }
                    for monitor in group_monitors
                ],
            }
        )

    active_incidents = (
        db.query(Incident)
        .filter(Incident.is_public.is_(True), Incident.status != "resolved")
        .order_by(Incident.started_at.desc())
        .all()
    )
    now = datetime.utcnow()
    maintenance_windows = (
        db.query(MaintenanceWindow)
        .filter(MaintenanceWindow.is_active.is_(True), MaintenanceWindow.ends_at >= now)
        .order_by(MaintenanceWindow.starts_at.asc())
        .all()
    )
    last_checked = [monitor.last_checked_at for monitor in monitors if monitor.last_checked_at]
    last_updated = max(last_checked) if last_checked else now

    return {
        "overall_status": _public_overall_status([_status_from_uptime(monitor.uptime_30d) for monitor in monitors]),
        "last_updated": _iso(last_updated),
        "groups": groups,
        "active_incidents": [_serialize_incident(incident, db, include_private=False) for incident in active_incidents],
        "maintenance_windows": [_serialize_maintenance(window, include_private=False) for window in maintenance_windows],
    }


@router.get("/public/monitor/{monitor_id}/history")
async def public_monitor_history(monitor_id: int, db: Session = Depends(get_db)) -> list[dict]:
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id, Monitor.is_public.is_(True)).first()
    if monitor is None:
        raise HTTPException(status_code=404, detail="Monitor not found.")
    checks = (
        db.query(MonitorCheck)
        .filter(MonitorCheck.monitor_id == monitor_id)
        .order_by(MonitorCheck.checked_at.desc(), MonitorCheck.id.desc())
        .limit(90)
        .all()
    )
    return [
        {
            "checked_at": _iso(check.checked_at),
            "status": check.status,
            "response_ms": check.response_ms,
            "status_code": check.status_code,
        }
        for check in reversed(checks)
    ]


@router.get("/monitors")
async def list_monitors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    monitors = db.query(Monitor).order_by(Monitor.group_name.asc(), Monitor.name.asc()).all()
    return [_serialize_monitor(monitor, db, include_alerts=True) for monitor in monitors]


@router.post("/monitors")
async def create_monitor(
    payload: MonitorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    data = _model_data(payload)
    _validate_monitor_values(data)
    monitor = Monitor(**data)
    db.add(monitor)
    db.commit()
    db.refresh(monitor)
    return _serialize_monitor(monitor, db, include_alerts=True)


@router.post("/monitors/force-check")
async def force_check_monitors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    monitors = db.query(Monitor).filter(Monitor.is_active.is_(True)).all()
    if not monitors:
        return {"checked": 0, "timestamp": _iso(datetime.utcnow())}

    tasks = [asyncio.create_task(check_monitor(monitor, db)) for monitor in monitors]
    done, pending = await asyncio.wait(tasks, timeout=30)

    for task in pending:
        task.cancel()
    if pending:
        await asyncio.gather(*pending, return_exceptions=True)

    checked = 0
    for task in done:
        try:
            task.result()
            checked += 1
        except Exception:
            continue

    return {"checked": checked, "timestamp": _iso(datetime.utcnow())}


@router.put("/monitors/{monitor_id}")
async def update_monitor(
    monitor_id: int,
    payload: MonitorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if monitor is None:
        raise HTTPException(status_code=404, detail="Monitor not found.")
    data = _model_data(payload, exclude_unset=True)
    _validate_monitor_values(data)
    for key, value in data.items():
        setattr(monitor, key, value)
    db.commit()
    db.refresh(monitor)
    return _serialize_monitor(monitor, db, include_alerts=True)


@router.delete("/monitors/{monitor_id}")
async def delete_monitor(
    monitor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if monitor is None:
        raise HTTPException(status_code=404, detail="Monitor not found.")
    db.query(MonitorCheck).filter(MonitorCheck.monitor_id == monitor_id).delete(synchronize_session=False)
    db.query(AlertConfig).filter(AlertConfig.monitor_id == monitor_id).delete(synchronize_session=False)
    db.delete(monitor)
    db.commit()
    return {"success": True}


@router.get("/monitors/{monitor_id}/checks")
async def monitor_checks(
    monitor_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if monitor is None:
        raise HTTPException(status_code=404, detail="Monitor not found.")
    query = db.query(MonitorCheck).filter(MonitorCheck.monitor_id == monitor_id)
    total = query.count()
    checks = (
        query.order_by(MonitorCheck.checked_at.desc(), MonitorCheck.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {
        "items": [_serialize_check(check) for check in checks],
        "page": page,
        "per_page": per_page,
        "total": total,
    }


@router.post("/monitors/{monitor_id}/alerts")
async def create_alert(
    monitor_id: int,
    payload: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if monitor is None:
        raise HTTPException(status_code=404, detail="Monitor not found.")
    alert_type = payload.type.lower()
    if alert_type not in ALLOWED_ALERT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported alert type.")
    alert = AlertConfig(
        monitor_id=monitor_id,
        type=alert_type,
        target=payload.target,
        on_down=payload.on_down,
        on_recovery=payload.on_recovery,
        is_active=True,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return _serialize_alert(alert)


@router.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    alert = db.query(AlertConfig).filter(AlertConfig.id == alert_id).first()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found.")
    db.delete(alert)
    db.commit()
    return {"success": True}


@router.get("/incidents")
async def list_incidents(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    query = db.query(Incident)
    total = query.count()
    incidents = (
        query.order_by(Incident.started_at.desc(), Incident.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {
        "items": [_serialize_incident(incident, db) for incident in incidents],
        "page": page,
        "per_page": per_page,
        "total": total,
    }


@router.post("/incidents")
async def create_incident(
    payload: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _validate_incident_values(payload.status, payload.severity)
    incident = Incident(
        title=payload.title,
        status=payload.status,
        severity=payload.severity,
        message=payload.message,
        affected_monitors=_ids_to_json(payload.affected_monitors),
        is_public=payload.is_public,
        created_by=current_user.id,
    )
    db.add(incident)
    db.flush()
    if payload.message:
        db.add(IncidentUpdate(incident_id=incident.id, status=payload.status, message=payload.message))
    db.commit()
    db.refresh(incident)
    return _serialize_incident(incident, db)


@router.put("/incidents/{incident_id}")
async def update_incident(
    incident_id: int,
    payload: IncidentUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found.")
    _validate_incident_values(payload.status, payload.severity)
    data = _model_data(payload, exclude_unset=True)
    if "affected_monitors" in data:
        incident.affected_monitors = _ids_to_json(data.pop("affected_monitors"))
    for key, value in data.items():
        setattr(incident, key, value)
    if incident.status == "resolved" and incident.resolved_at is None:
        incident.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(incident)
    return _serialize_incident(incident, db)


@router.post("/incidents/{incident_id}/updates")
async def add_incident_update(
    incident_id: int,
    payload: IncidentUpdateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found.")
    _validate_incident_values(payload.status)
    update = IncidentUpdate(incident_id=incident_id, status=payload.status, message=payload.message)
    incident.status = payload.status
    if payload.status == "resolved" and incident.resolved_at is None:
        incident.resolved_at = datetime.utcnow()
    db.add(update)
    db.commit()
    db.refresh(update)
    return _serialize_update(update)


@router.get("/maintenance")
async def list_maintenance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    windows = db.query(MaintenanceWindow).order_by(MaintenanceWindow.starts_at.desc()).all()
    return [_serialize_maintenance(window) for window in windows]


@router.post("/maintenance")
async def create_maintenance(
    payload: MaintenanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if payload.ends_at <= payload.starts_at:
        raise HTTPException(status_code=400, detail="Maintenance end time must be after start time.")
    window = MaintenanceWindow(
        title=payload.title,
        message=payload.message,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        affected_monitors=_ids_to_json(payload.affected_monitors),
        is_active=payload.is_active,
    )
    db.add(window)
    db.commit()
    db.refresh(window)
    return _serialize_maintenance(window)


@router.delete("/maintenance/{window_id}")
async def delete_maintenance(
    window_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    window = db.query(MaintenanceWindow).filter(MaintenanceWindow.id == window_id).first()
    if window is None:
        raise HTTPException(status_code=404, detail="Maintenance window not found.")
    db.delete(window)
    db.commit()
    return {"success": True}


@router.get("/dashboard")
async def dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    total_monitors = db.query(Monitor).count()
    monitors_up = db.query(Monitor).filter(Monitor.last_status == "operational").count()
    monitors_down = db.query(Monitor).filter(Monitor.last_status == "outage").count()
    monitors_degraded = db.query(Monitor).filter(Monitor.last_status == "degraded").count()
    active_incidents = db.query(Incident).filter(Incident.status != "resolved").count()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    checks_today = db.query(MonitorCheck).filter(MonitorCheck.checked_at >= today).count()
    avg_response = (
        db.query(func.avg(MonitorCheck.response_ms))
        .filter(MonitorCheck.checked_at >= today, MonitorCheck.response_ms.isnot(None))
        .scalar()
    )
    recent_rows = (
        db.query(MonitorCheck, Monitor)
        .join(Monitor, Monitor.id == MonitorCheck.monitor_id)
        .order_by(MonitorCheck.checked_at.desc(), MonitorCheck.id.desc())
        .limit(20)
        .all()
    )
    monitors = db.query(Monitor).order_by(Monitor.group_name.asc(), Monitor.name.asc()).all()

    return {
        "total_monitors": total_monitors,
        "monitors_up": monitors_up,
        "monitors_down": monitors_down,
        "monitors_degraded": monitors_degraded,
        "active_incidents": active_incidents,
        "checks_today": checks_today,
        "avg_response_ms": round(float(avg_response or 0), 2),
        "recent_checks": [_serialize_check(check, monitor) for check, monitor in recent_rows],
        "monitors": [_serialize_monitor(monitor) for monitor in monitors],
    }
