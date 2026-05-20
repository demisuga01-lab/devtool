import asyncio
import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.database import SessionLocal
from app.core.monitor_engine import check_monitor
from app.models.paste import Paste
from app.models.status import Monitor


scheduler = BackgroundScheduler()


def cleanup_expired_pastes():
    db = SessionLocal()
    try:
        now = datetime.datetime.utcnow()
        db.query(Paste).filter(
            Paste.expires_at < now,
            Paste.expires_at.isnot(None),
        ).delete(synchronize_session=False)
        db.query(Paste).filter(
            Paste.view_limit.isnot(None),
            Paste.view_count >= Paste.view_limit,
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


async def run_due_monitor_checks_async():
    db = SessionLocal()
    try:
        now = datetime.datetime.utcnow()
        monitors = db.query(Monitor).filter(Monitor.is_active.is_(True)).all()
        for monitor in monitors:
            if monitor.last_checked_at is None:
                due = True
            else:
                elapsed = (now - monitor.last_checked_at).total_seconds()
                due = elapsed >= monitor.interval
            if due:
                await check_monitor(monitor, db)
    finally:
        db.close()


def run_due_monitor_checks():
    asyncio.run(run_due_monitor_checks_async())


scheduler.add_job(cleanup_expired_pastes, "interval", hours=1)
scheduler.add_job(run_due_monitor_checks, "interval", seconds=60, id="monitoring_checks", replace_existing=True)
