import datetime
import secrets

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base


Base = declarative_base()


def generate_paste_id() -> str:
    return secrets.token_urlsafe(8)[:12]


class Paste(Base):
    __tablename__ = "pastes"

    id = Column(String(12), primary_key=True)
    content = Column(Text, nullable=False)
    language = Column(String(50), default="plaintext")
    title = Column(String(200), default="")
    password_hash = Column(String(200), nullable=True)
    burn_after_read = Column(Boolean, default=False)
    view_limit = Column(Integer, nullable=True)
    view_count = Column(Integer, default=0)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_private = Column(Boolean, default=False)
    delete_token = Column(String(64), nullable=True)
