from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from app.models.paste import Base


def uuid_string() -> str:
    return str(uuid.uuid4())


class Secret(Base):
    __tablename__ = "secrets"

    id = Column(String(36), primary_key=True, default=uuid_string)
    encrypted_content = Column(Text, nullable=False)
    iv = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    viewed = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)


class FilePaste(Base):
    __tablename__ = "file_pastes"

    id = Column(String(12), primary_key=True)
    filename = Column(Text, nullable=False)
    mime_type = Column(Text, nullable=False)
    encrypted_content = Column(Text, nullable=False)
    iv = Column(Text, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    burn_after_read = Column(Boolean, default=False)
    viewed = Column(Boolean, default=False)


class Collection(Base):
    __tablename__ = "collections"

    id = Column(String(12), primary_key=True)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    admin_key = Column(String(200), nullable=False)


class Gist(Base):
    __tablename__ = "gists"

    id = Column(String(12), primary_key=True)
    title = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    admin_key = Column(String(200), nullable=False)
    view_count = Column(Integer, default=0)


class GistFile(Base):
    __tablename__ = "gist_files"

    id = Column(String(36), primary_key=True, default=uuid_string)
    gist_id = Column(String(12), ForeignKey("gists.id", ondelete="CASCADE"), nullable=False)
    filename = Column(Text, nullable=False)
    language = Column(String(50), default="plaintext")
    content = Column(Text, nullable=False)
    size_bytes = Column(Integer, nullable=False)


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=uuid_string)
    content_type = Column(Text, nullable=False)
    content_id = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    details = Column(Text, nullable=True)
    reporter_ip = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(Text, default="pending")
    admin_notes = Column(Text, nullable=True)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True, default=uuid_string)
    key_hash = Column(Text, nullable=False)
    key_prefix = Column(String(8), nullable=False)
    name = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    rate_limit_per_hour = Column(Integer, default=100)


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(12), primary_key=True)
    password_hash = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_accessed = Column(DateTime, default=datetime.datetime.utcnow)
    paste_count = Column(Integer, default=0)


class WebhookInbox(Base):
    __tablename__ = "webhook_inboxes"

    id = Column(String(12), primary_key=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    request_count = Column(Integer, default=0)
    max_requests = Column(Integer, default=100)


class WebhookRequest(Base):
    __tablename__ = "webhook_requests"

    id = Column(String(36), primary_key=True, default=uuid_string)
    inbox_id = Column(String(12), ForeignKey("webhook_inboxes.id", ondelete="CASCADE"), nullable=False)
    received_at = Column(DateTime, default=datetime.datetime.utcnow)
    method = Column(Text, nullable=False)
    headers = Column(JSONB, default=dict)
    query_params = Column(JSONB, default=dict)
    body = Column(Text, default="")
    body_size_bytes = Column(Integer, default=0)
    content_type = Column(Text, default="")
    source_ip = Column(Text, default="")


class HeartbeatMonitor(Base):
    __tablename__ = "heartbeat_monitors"

    id = Column(String(12), primary_key=True)
    name = Column(Text, nullable=False)
    expected_interval_minutes = Column(Integer, nullable=False)
    grace_period_minutes = Column(Integer, default=5)
    last_ping_at = Column(DateTime, nullable=True)
    status = Column(Text, default="down")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    ping_count = Column(Integer, default=0)


class HeartbeatPing(Base):
    __tablename__ = "heartbeat_pings"

    id = Column(String(36), primary_key=True, default=uuid_string)
    monitor_id = Column(String(12), ForeignKey("heartbeat_monitors.id", ondelete="CASCADE"), nullable=False)
    pinged_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(Text, default="up")
