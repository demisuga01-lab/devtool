from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging
import datetime

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

async def run_monitor_checks():
    """Run all due monitor checks."""
    try:
        from app.core.database import SessionLocal
        from app.models.status import Monitor
        from app.core.monitor_engine import check_monitor
        import asyncio

        db = SessionLocal()
        try:
            monitors = db.query(Monitor).filter(
                Monitor.is_active == True
            ).all()

            now = datetime.datetime.utcnow()
            due_monitors = []
            for m in monitors:
                if m.last_checked_at is None:
                    due_monitors.append(m)
                else:
                    elapsed = (now - m.last_checked_at
                               ).total_seconds()
                    if elapsed >= m.interval:
                        due_monitors.append(m)

            if due_monitors:
                logger.info(
                    f"Scheduler: checking "
                    f"{len(due_monitors)} monitors"
                )
                tasks = [
                    check_monitor(m, db)
                    for m in due_monitors
                ]
                await asyncio.gather(
                    *tasks, return_exceptions=True
                )
                db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Scheduler error: {e}")

async def run_paste_cleanup():
    """Delete expired pastes."""
    try:
        from app.core.database import SessionLocal
        from app.models.paste import Paste
        import datetime

        db = SessionLocal()
        try:
            now = datetime.datetime.utcnow()
            deleted = db.query(Paste).filter(
                Paste.expires_at < now,
                Paste.expires_at.isnot(None)
            ).delete()
            db.commit()
            if deleted:
                logger.info(
                    f"Cleanup: deleted {deleted} "
                    f"expired pastes"
                )
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Cleanup error: {e}")

def start_scheduler():
    scheduler.add_job(
        run_monitor_checks,
        trigger=IntervalTrigger(seconds=60),
        id="monitor_checks",
        replace_existing=True,
        next_run_time=datetime.datetime.now()
    )
    scheduler.add_job(
        run_paste_cleanup,
        trigger=IntervalTrigger(hours=1),
        id="paste_cleanup",
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started with 2 jobs")

def stop_scheduler():
    scheduler.shutdown(wait=False)