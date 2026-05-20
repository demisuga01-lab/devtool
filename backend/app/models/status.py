from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text

from app.models.paste import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Monitor(Base):
    __tablename__ = "monitors"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    url = Column(String(500), nullable=False)
    method = Column(String(10), default="GET")
    interval = Column(Integer, default=60)
    timeout = Column(Integer, default=10)
    expected_status = Column(Integer, default=200)
    keyword = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=True)
    group_name = Column(String(100), default="General")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_checked_at = Column(DateTime, nullable=True)
    last_status = Column(String(20), default="unknown")
    last_response_ms = Column(Integer, nullable=True)
    uptime_30d = Column(Float, default=100.0)


class MonitorCheck(Base):
    __tablename__ = "monitor_checks"

    id = Column(Integer, primary_key=True)
    monitor_id = Column(Integer, ForeignKey("monitors.id", ondelete="CASCADE"))
    checked_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20))
    response_ms = Column(Integer, nullable=True)
    status_code = Column(Integer, nullable=True)
    error = Column(String(500), nullable=True)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    status = Column(String(20), default="investigating")
    severity = Column(String(20), default="minor")
    message = Column(Text, nullable=True)
    affected_monitors = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    is_public = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))


class IncidentUpdate(Base):
    __tablename__ = "incident_updates"

    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"))
    status = Column(String(20))
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AlertConfig(Base):
    __tablename__ = "alert_configs"

    id = Column(Integer, primary_key=True)
    monitor_id = Column(Integer, ForeignKey("monitors.id", ondelete="CASCADE"))
    type = Column(String(20))
    target = Column(String(500))
    on_down = Column(Boolean, default=True)
    on_recovery = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)


class MaintenanceWindow(Base):
    __tablename__ = "maintenance_windows"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=True)
    starts_at = Column(DateTime, nullable=False)
    ends_at = Column(DateTime, nullable=False)
    affected_monitors = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
