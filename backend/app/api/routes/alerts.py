from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.routes._utils import iso, sanitize_text
from app.core.alerting import (
    ALLOWED_CHANNEL_TYPES,
    alert_message,
    config_summary,
    encrypt_config,
    send_channel_message,
    validate_channel_config,
)
from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.extended import AlertChannel, AlertLog, AlertRule
from app.models.status import Monitor, User

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertChannelCreate(BaseModel):
    name: str = Field(..., max_length=200)
    channel_type: str = Field(..., max_length=40)
    config: dict[str, str] = Field(default_factory=dict)
    is_active: bool = True


class AlertRuleCreate(BaseModel):
    monitor_id: int
    channel_id: str = Field(..., max_length=36)
    on_down: bool = True
    on_recovery: bool = True


def _serialize_channel(channel: AlertChannel) -> dict:
    return {
        "id": channel.id,
        "name": channel.name,
        "channel_type": channel.channel_type,
        "config_summary": config_summary(channel.channel_type, channel.config),
        "is_active": channel.is_active,
        "created_at": iso(channel.created_at),
    }


def _serialize_rule(rule: AlertRule, monitor: Monitor | None = None, channel: AlertChannel | None = None) -> dict:
    return {
        "id": rule.id,
        "monitor_id": rule.monitor_id,
        "monitor_name": monitor.name if monitor else None,
        "channel_id": rule.channel_id,
        "channel_name": channel.name if channel else None,
        "channel_type": channel.channel_type if channel else None,
        "on_down": rule.on_down,
        "on_recovery": rule.on_recovery,
        "created_at": iso(rule.created_at),
    }


def _serialize_log(log: AlertLog, monitor: Monitor | None = None, channel: AlertChannel | None = None) -> dict:
    return {
        "id": log.id,
        "monitor_id": log.monitor_id,
        "monitor_name": monitor.name if monitor else None,
        "channel_id": log.channel_id,
        "channel_name": channel.name if channel else None,
        "channel_type": channel.channel_type if channel else None,
        "alert_type": log.alert_type,
        "message": log.message,
        "sent_at": iso(log.sent_at),
        "status": log.status,
        "error": log.error,
    }


@router.post("/channels")
async def create_channel(
    payload: AlertChannelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    channel_type = sanitize_text(payload.channel_type.lower(), 40, allow_empty=False)
    if channel_type not in ALLOWED_CHANNEL_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported alert channel type.")
    config = validate_channel_config(channel_type, payload.config)
    channel = AlertChannel(
        name=sanitize_text(payload.name, 200, allow_empty=False),
        channel_type=channel_type,
        config=encrypt_config(config),
        is_active=payload.is_active,
    )
    db.add(channel)
    db.commit()
    db.refresh(channel)
    return _serialize_channel(channel)


@router.get("/channels")
async def list_channels(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    channels = db.query(AlertChannel).order_by(AlertChannel.created_at.desc()).all()
    return [_serialize_channel(channel) for channel in channels]


@router.delete("/channels/{channel_id}")
async def delete_channel(
    channel_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    channel = db.query(AlertChannel).filter(AlertChannel.id == channel_id).first()
    if channel is None:
        raise HTTPException(status_code=404, detail="Alert channel not found.")
    db.query(AlertRule).filter(AlertRule.channel_id == channel_id).delete(synchronize_session=False)
    db.delete(channel)
    db.commit()
    return {"success": True}


@router.post("/rules")
async def create_rule(
    payload: AlertRuleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    monitor = db.query(Monitor).filter(Monitor.id == payload.monitor_id).first()
    if monitor is None:
        raise HTTPException(status_code=404, detail="Monitor not found.")
    channel = db.query(AlertChannel).filter(AlertChannel.id == payload.channel_id).first()
    if channel is None:
        raise HTTPException(status_code=404, detail="Alert channel not found.")
    rule = AlertRule(
        monitor_id=payload.monitor_id,
        channel_id=payload.channel_id,
        on_down=payload.on_down,
        on_recovery=payload.on_recovery,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return _serialize_rule(rule, monitor, channel)


@router.get("/rules")
async def list_rules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = (
        db.query(AlertRule, Monitor, AlertChannel)
        .join(Monitor, Monitor.id == AlertRule.monitor_id)
        .join(AlertChannel, AlertChannel.id == AlertRule.channel_id)
        .order_by(AlertRule.created_at.desc())
        .all()
    )
    return [_serialize_rule(rule, monitor, channel) for rule, monitor, channel in rows]


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if rule is None:
        raise HTTPException(status_code=404, detail="Alert rule not found.")
    db.delete(rule)
    db.commit()
    return {"success": True}


@router.post("/test/{channel_id}")
async def test_channel(
    channel_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    channel = db.query(AlertChannel).filter(AlertChannel.id == channel_id).first()
    if channel is None:
        raise HTTPException(status_code=404, detail="Alert channel not found.")
    message = "[DevTools Alert] Test alert from DevTools"
    log = AlertLog(channel_id=channel.id, alert_type="test", message=message, status="sent")
    try:
        await send_channel_message(channel, message, {"type": "test"})
    except Exception as exc:
        log.status = "failed"
        log.error = str(exc)[:1000]
        db.add(log)
        db.commit()
        raise HTTPException(status_code=502, detail="Test alert failed.")
    db.add(log)
    db.commit()
    return {"sent": True}


@router.get("/logs")
async def list_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = (
        db.query(AlertLog, Monitor, AlertChannel)
        .outerjoin(Monitor, Monitor.id == AlertLog.monitor_id)
        .outerjoin(AlertChannel, AlertChannel.id == AlertLog.channel_id)
        .order_by(AlertLog.sent_at.desc())
        .limit(50)
        .all()
    )
    return [_serialize_log(log, monitor, channel) for log, monitor, channel in rows]
