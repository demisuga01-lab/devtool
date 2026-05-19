import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.database import SessionLocal
from app.models.paste import Paste


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


scheduler.add_job(cleanup_expired_pastes, "interval", hours=1)
