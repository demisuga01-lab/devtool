from sqlalchemy import create_engine
from sqlalchemy import text
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
    from app.models import extended  # noqa: F401
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
    _ensure_schema_extensions()

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


def _ensure_schema_extensions():
    """create_all does not add columns to existing tables, so keep additive paste columns in sync."""
    statements = [
        "ALTER TABLE pastes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[] NOT NULL",
        "ALTER TABLE pastes ADD COLUMN IF NOT EXISTS collection_id VARCHAR(12) NULL",
        "ALTER TABLE pastes ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(12) NULL",
    ]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
