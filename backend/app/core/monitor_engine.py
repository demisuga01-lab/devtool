from __future__ import annotations

import json
import smtplib
import time
from datetime import datetime, timedelta
from email.message import EmailMessage

import httpx
from sqlalchemy.orm import Session

from app.core.alerting import send_routed_alert
from app.core.config import settings
from app.models.status import AlertConfig, Monitor, MonitorCheck

MAX_CHECKS_PER_MONITOR = 10080
STATUS_PAGE_URL = "https://devtools.wellfriend.online/status"


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def _status_from_uptime(uptime: float) -> str:
    if uptime >= 90:
        return "operational"
    if uptime >= 70:
        return "degraded"
    return "outage"


async def check_monitor(monitor: Monitor, db: Session) -> MonitorCheck:
    previous_status = monitor.last_status or "unknown"
    checked_at = datetime.utcnow()
    status = "outage"
    response_ms: int | None = None
    status_code: int | None = None
    error: str | None = None

    try:
        started = time.perf_counter()
        async with httpx.AsyncClient(timeout=monitor.timeout, follow_redirects=True) as client:
            response = await client.request((monitor.method or "GET").upper(), monitor.url)
        response_ms = int((time.perf_counter() - started) * 1000)
        status_code = response.status_code

        if status_code == monitor.expected_status:
            status = "operational"
        elif status_code >= 500:
            status = "outage"
        else:
            status = "degraded"

        if monitor.keyword and monitor.keyword not in response.text:
            status = "degraded"
            error = "Keyword not found in response."
    except httpx.TimeoutException:
        status = "outage"
        error = "Request timed out."
    except httpx.HTTPError as exc:
        status = "outage"
        error = str(exc)[:500]

    check = MonitorCheck(
        monitor_id=monitor.id,
        checked_at=checked_at,
        status=status,
        response_ms=response_ms,
        status_code=status_code,
        error=error,
    )
    db.add(check)

    monitor.last_checked_at = checked_at
    monitor.last_response_ms = response_ms
    db.flush()

    _prune_old_checks(db, monitor.id)
    monitor.uptime_30d = _calculate_uptime_30d(db, monitor.id)
    monitor.last_status = _status_from_uptime(monitor.uptime_30d)
    db.commit()
    db.refresh(check)
    db.refresh(monitor)

    if previous_status == "operational" and monitor.last_status in {"outage", "degraded"}:
        await send_alert(monitor, check, "down", db)
    elif previous_status in {"outage", "degraded"} and monitor.last_status == "operational":
        await send_alert(monitor, check, "recovery", db)

    return check


def _prune_old_checks(db: Session, monitor_id: int) -> None:
    check_count = db.query(MonitorCheck).filter(MonitorCheck.monitor_id == monitor_id).count()
    excess = check_count - MAX_CHECKS_PER_MONITOR
    if excess <= 0:
        return

    old_ids = [
        row.id
        for row in (
            db.query(MonitorCheck.id)
            .filter(MonitorCheck.monitor_id == monitor_id)
            .order_by(MonitorCheck.checked_at.asc(), MonitorCheck.id.asc())
            .limit(excess)
            .all()
        )
    ]
    if old_ids:
        db.query(MonitorCheck).filter(MonitorCheck.id.in_(old_ids)).delete(synchronize_session=False)


def _calculate_uptime_30d(db: Session, monitor_id: int) -> float:
    since = datetime.utcnow() - timedelta(days=30)
    checks = db.query(MonitorCheck.status).filter(
        MonitorCheck.monitor_id == monitor_id,
        MonitorCheck.checked_at >= since,
    )
    total = checks.count()
    if total == 0:
        return 100.0
    operational = checks.filter(MonitorCheck.status == "operational").count()
    return round((operational / total) * 100, 2)


async def send_alert(monitor: Monitor, check: MonitorCheck, alert_type: str, db: Session) -> None:
    try:
        await send_routed_alert(monitor, check, alert_type, db)
    except Exception:
        pass

    configs = db.query(AlertConfig).filter(
        AlertConfig.monitor_id == monitor.id,
        AlertConfig.is_active.is_(True),
    ).all()
    for config in configs:
        if alert_type == "down" and not config.on_down:
            continue
        if alert_type == "recovery" and not config.on_recovery:
            continue
        try:
            if config.type == "email":
                await send_email_alert(config, monitor, check, alert_type)
            elif config.type == "webhook":
                await send_webhook_alert(config, monitor, check, alert_type)
        except Exception:
            continue


async def send_email_alert(
    config: AlertConfig,
    monitor: Monitor,
    check: MonitorCheck,
    alert_type: str,
) -> None:
    if not settings.SMTP_HOST or not config.target:
        return

    subject = (
        f"🔴 [Alert] {monitor.name} is down"
        if alert_type == "down"
        else f"🟢 [Recovery] {monitor.name} is back up"
    )
    response_time = f"{check.response_ms}ms" if check.response_ms is not None else "timeout"
    body = "\n".join(
        [
            f"Monitor: {monitor.name}",
            f"URL: {monitor.url}",
            f"Status: {check.status}",
            f"Response time: {response_time}",
            f"Time: {_iso(check.checked_at)}",
            f"Check status page: {STATUS_PAGE_URL}",
        ]
    )

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = config.target
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
        if settings.SMTP_TLS:
            smtp.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(message)


async def send_webhook_alert(
    config: AlertConfig,
    monitor: Monitor,
    check: MonitorCheck,
    alert_type: str,
) -> None:
    if not config.target:
        return

    response_time = f"{check.response_ms}ms" if check.response_ms is not None else "timeout"
    if "discord.com" in config.target:
        payload = {
            "embeds": [
                {
                    "title": (
                        f"🔴 {monitor.name} is down"
                        if alert_type == "down"
                        else f"🟢 {monitor.name} recovered"
                    ),
                    "color": 15158332 if alert_type == "down" else 3066993,
                    "fields": [
                        {"name": "URL", "value": monitor.url},
                        {"name": "Status", "value": check.status},
                        {"name": "Response Time", "value": response_time},
                    ],
                    "timestamp": _iso(check.checked_at),
                }
            ]
        }
    else:
        payload = {
            "type": alert_type,
            "monitor": {
                "name": monitor.name,
                "url": monitor.url,
                "status": check.status,
                "response_ms": check.response_ms,
            },
            "checked_at": _iso(check.checked_at),
            "status_page": STATUS_PAGE_URL,
        }

    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.post(
            config.target,
            content=json.dumps(payload),
            headers={"Content-Type": "application/json"},
        )
