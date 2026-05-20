from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models.paste import Base
    from app.models.status import (
        AlertConfig,
        Incident,
        IncidentUpdate,
        MaintenanceWindow,
        Monitor,
        MonitorCheck,
        User,
    )

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if db.query(Monitor).count() == 0:
            monitors = [
                {
                    "name": "PDFTools",
                    "url": "https://tools.wellfriend.online",
                    "group_name": "WellFriend Products",
                    "expected_status": 200,
                },
                {
                    "name": "PDFTools API",
                    "url": "https://tools.wellfriend.online/api/health",
                    "group_name": "WellFriend Products",
                    "expected_status": 200,
                },
                {
                    "name": "DevTools",
                    "url": "https://devtools.wellfriend.online",
                    "group_name": "WellFriend Products",
                    "expected_status": 200,
                },
                {
                    "name": "DevTools API",
                    "url": "https://devtools.wellfriend.online/api/health",
                    "group_name": "WellFriend Products",
                    "expected_status": 200,
                },
                {
                    "name": "Matomo Analytics",
                    "url": "https://analytics.wellfriend.online",
                    "group_name": "WellFriend Products",
                    "expected_status": 200,
                },
            ]
            db.add_all([Monitor(**monitor) for monitor in monitors])
            db.commit()
    finally:
        db.close()
