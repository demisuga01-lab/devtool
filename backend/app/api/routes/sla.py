from __future__ import annotations

import datetime
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.routes._utils import iso
from app.core.database import get_db
from app.models.status import Monitor, MonitorCheck

router = APIRouter(prefix="/sla", tags=["sla"])

PERIOD_DAYS = {"7d": 7, "30d": 30, "90d": 90, "365d": 365}
SLO_TARGET = 99.9


def _percentile(values: list[int], percentile: float) -> int | None:
    if not values:
        return None
    sorted_values = sorted(values)
    index = min(len(sorted_values) - 1, max(0, round((len(sorted_values) - 1) * percentile)))
    return sorted_values[index]


def _period_bounds(period: str) -> tuple[datetime.datetime, datetime.datetime]:
    if period not in PERIOD_DAYS:
        raise HTTPException(status_code=400, detail="Unsupported SLA period.")
    end = datetime.datetime.utcnow()
    return end - datetime.timedelta(days=PERIOD_DAYS[period]), end


def _longest_outage(checks: list[MonitorCheck], period_end: datetime.datetime) -> tuple[int, int]:
    longest = 0.0
    outage_count = 0
    outage_start: datetime.datetime | None = None
    previous_failed = False
    for check in checks:
        failed = check.status != "operational"
        if failed and not previous_failed:
            outage_start = check.checked_at
            outage_count += 1
        if not failed and previous_failed and outage_start is not None:
            longest = max(longest, (check.checked_at - outage_start).total_seconds() / 60)
            outage_start = None
        previous_failed = failed
    if previous_failed and outage_start is not None:
        longest = max(longest, (period_end - outage_start).total_seconds() / 60)
    return round(longest), outage_count


def _report_for_monitor(monitor: Monitor, period: str, db: Session) -> dict:
    period_start, period_end = _period_bounds(period)
    checks = (
        db.query(MonitorCheck)
        .filter(
            MonitorCheck.monitor_id == monitor.id,
            MonitorCheck.checked_at >= period_start,
            MonitorCheck.checked_at <= period_end,
        )
        .order_by(MonitorCheck.checked_at.asc())
        .all()
    )
    total = len(checks)
    successful = sum(1 for check in checks if check.status == "operational")
    failed = total - successful
    response_times = [check.response_ms for check in checks if check.response_ms is not None]
    uptime = 100.0 if total == 0 else round((successful / total) * 100, 4)
    longest_outage, outage_count = _longest_outage(checks, period_end)
    return {
        "monitor_id": monitor.id,
        "monitor_name": monitor.name,
        "period_start": iso(period_start),
        "period_end": iso(period_end),
        "total_checks": total,
        "successful_checks": successful,
        "failed_checks": failed,
        "uptime_percentage": uptime,
        "avg_response_time_ms": round(mean(response_times)) if response_times else None,
        "p50_response_time_ms": _percentile(response_times, 0.5),
        "p95_response_time_ms": _percentile(response_times, 0.95),
        "p99_response_time_ms": _percentile(response_times, 0.99),
        "longest_outage_minutes": longest_outage,
        "outage_count": outage_count,
        "slo_target": SLO_TARGET,
        "slo_met": uptime >= SLO_TARGET,
    }


@router.get("/report/all")
async def all_reports(period: str = Query("30d"), db: Session = Depends(get_db)) -> list[dict]:
    monitors = db.query(Monitor).order_by(Monitor.name.asc()).all()
    return [_report_for_monitor(monitor, period, db) for monitor in monitors]


@router.get("/report")
async def monitor_report(monitor_id: int = Query(...), period: str = Query("30d"), db: Session = Depends(get_db)) -> dict:
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if monitor is None:
        raise HTTPException(status_code=404, detail="Monitor not found.")
    return _report_for_monitor(monitor, period, db)
