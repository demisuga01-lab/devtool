from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

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


class ApiCollection(Base):
    __tablename__ = "api_collections"

    id = Column(String(12), primary_key=True)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
    admin_key_hash = Column(Text, nullable=False)
    request_count = Column(Integer, default=0)


class CollectionRequest(Base):
    __tablename__ = "collection_requests"

    id = Column(String(36), primary_key=True, default=uuid_string)
    collection_id = Column(String(12), ForeignKey("api_collections.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    method = Column(Text, nullable=False)
    url = Column(Text, nullable=False)
    headers = Column(JSONB, default=list)
    body = Column(Text, nullable=True)
    body_type = Column(Text, default="none")
    auth_type = Column(Text, default="none")
    auth_config = Column(JSONB, default=dict)
    params = Column(JSONB, default=list)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    folder = Column(Text, nullable=True)


class CollectionEnvironment(Base):
    __tablename__ = "collection_environments"

    id = Column(String(36), primary_key=True, default=uuid_string)
    collection_id = Column(String(12), ForeignKey("api_collections.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    variables = Column(JSONB, default=list)


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(String(12), primary_key=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(Text, nullable=False)
    language_ids = Column(ARRAY(Integer), default=list)
    template_code = Column(JSONB, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    admin_key_hash = Column(Text, nullable=False)


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(String(36), primary_key=True, default=uuid_string)
    challenge_id = Column(String(12), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    input = Column(Text, default="")
    expected_output = Column(Text, nullable=False)
    is_hidden = Column(Boolean, default=False)
    points = Column(Integer, default=1)
    sort_order = Column(Integer, default=0)


class ChallengeSubmission(Base):
    __tablename__ = "challenge_submissions"

    id = Column(String(36), primary_key=True, default=uuid_string)
    challenge_id = Column(String(12), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    language_id = Column(Integer, nullable=False)
    source_code = Column(Text, nullable=False)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    results = Column(JSONB, default=list)
    total_passed = Column(Integer, default=0)
    total_tests = Column(Integer, default=0)
    score = Column(Integer, default=0)
    time_ms = Column(Float, default=0)
    memory_kb = Column(Float, default=0)


class AlertChannel(Base):
    __tablename__ = "alert_channels"

    id = Column(String(36), primary_key=True, default=uuid_string)
    name = Column(Text, nullable=False)
    channel_type = Column(Text, nullable=False)
    config = Column(JSONB, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(String(36), primary_key=True, default=uuid_string)
    monitor_id = Column(Integer, ForeignKey("monitors.id", ondelete="CASCADE"), nullable=False)
    channel_id = Column(String(36), ForeignKey("alert_channels.id", ondelete="CASCADE"), nullable=False)
    on_down = Column(Boolean, default=True)
    on_recovery = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AlertLog(Base):
    __tablename__ = "alert_logs"

    id = Column(String(36), primary_key=True, default=uuid_string)
    monitor_id = Column(Integer, ForeignKey("monitors.id", ondelete="SET NULL"), nullable=True)
    channel_id = Column(String(36), ForeignKey("alert_channels.id", ondelete="SET NULL"), nullable=True)
    alert_type = Column(Text, nullable=False)
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(Text, default="sent")
    error = Column(Text, nullable=True)
