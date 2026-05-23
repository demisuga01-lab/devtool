from __future__ import annotations

import datetime
import secrets
from typing import Any

import bcrypt
from fastapi import HTTPException, Request

from app.core.config import settings

try:
    import redis  # type: ignore
except ImportError:  # pragma: no cover - optional runtime dependency
    redis = None


_memory_windows: dict[str, tuple[int, float]] = {}
_redis_client: Any | None = None


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def sanitize_text(value: str | None, max_length: int, *, allow_empty: bool = True) -> str:
    cleaned = (value or "").replace("\x00", "").strip()
    if not allow_empty and not cleaned:
        raise HTTPException(status_code=400, detail="Required field is missing.")
    if len(cleaned) > max_length:
        raise HTTPException(status_code=400, detail="Input is too long.")
    return cleaned


def make_id(size: int = 12) -> str:
    return secrets.token_urlsafe(size)[:size]


def iso(value: datetime.datetime | None) -> str | None:
    if value is None:
        return None
    result = value.isoformat()
    if "+" not in result and not result.endswith("Z"):
        result += "Z"
    return result


def expiry_from_hours(hours: int | None, default_hours: int = 24) -> datetime.datetime | None:
    value = default_hours if hours is None else hours
    if value <= 0:
        return None
    if value > 24 * 365:
        raise HTTPException(status_code=400, detail="Expiry is too far in the future.")
    return datetime.datetime.utcnow() + datetime.timedelta(hours=value)


def hash_secret(value: str) -> str:
    return bcrypt.hashpw(value.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_secret(value: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(value.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def require_admin_password(request: Request) -> None:
    supplied = (
        request.headers.get("x-admin-password")
        or request.headers.get("admin-password")
        or request.headers.get("admin_password")
    )
    if not supplied or not secrets.compare_digest(supplied, settings.ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Admin password required.")


def rate_limit(request: Request, scope: str, limit: int, window_seconds: int, subject: str | None = None) -> None:
    key = f"devtools:rate:{scope}:{subject or client_ip(request)}"
    now = datetime.datetime.utcnow().timestamp()
    global _redis_client
    if redis is not None:
        try:
            if _redis_client is None:
                _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            count = int(_redis_client.incr(key))
            if count == 1:
                _redis_client.expire(key, window_seconds)
            if count > limit:
                raise HTTPException(status_code=429, detail="Rate limit exceeded.")
            return
        except HTTPException:
            raise
        except Exception:
            pass

    count, started = _memory_windows.get(key, (0, now))
    if now - started >= window_seconds:
        count = 0
        started = now
    if count >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded.")
    _memory_windows[key] = (count + 1, started)


def parse_page(page: int, per_page: int) -> tuple[int, int]:
    return max(1, page), min(max(1, per_page), 200)
