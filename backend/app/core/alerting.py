from __future__ import annotations

import base64
import datetime
import hashlib
import ipaddress
import json
import smtplib
import socket
from email.message import EmailMessage
from typing import Any
from urllib.parse import urlparse

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.extended import AlertChannel, AlertLog, AlertRule
from app.models.status import Monitor, MonitorCheck

ALLOWED_CHANNEL_TYPES = {"email", "discord", "slack", "telegram", "webhook"}
BLOCKED_HOSTS = {"localhost", "ip6-localhost", "ip6-loopback", "metadata.google.internal"}


def _fernet() -> Fernet:
    digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_config(config: dict[str, Any]) -> dict[str, str]:
    token = _fernet().encrypt(json.dumps(config, separators=(",", ":")).encode("utf-8"))
    return {"encrypted": token.decode("ascii")}


def decrypt_config(config: dict[str, Any] | None) -> dict[str, Any]:
    if not config or not config.get("encrypted"):
        return {}
    try:
        plaintext = _fernet().decrypt(str(config["encrypted"]).encode("ascii"))
        parsed = json.loads(plaintext.decode("utf-8"))
        return parsed if isinstance(parsed, dict) else {}
    except (InvalidToken, json.JSONDecodeError, UnicodeDecodeError):
        return {}


def config_summary(channel_type: str, config: dict[str, Any] | None) -> dict[str, Any]:
    decrypted = decrypt_config(config)
    if channel_type == "email":
        return {"to_email": decrypted.get("to_email"), "smtp_host": decrypted.get("smtp_host"), "smtp_port": decrypted.get("smtp_port")}
    if channel_type in {"discord", "slack", "webhook"}:
        return {"webhook_url": _mask_url(decrypted.get("webhook_url") or decrypted.get("url"))}
    if channel_type == "telegram":
        return {"chat_id": decrypted.get("chat_id"), "bot_token": _mask_secret(decrypted.get("bot_token"))}
    return {}


def _mask_secret(value: Any) -> str:
    text = str(value or "")
    if len(text) <= 8:
        return "configured" if text else ""
    return f"{text[:4]}...{text[-4:]}"


def _mask_url(value: Any) -> str:
    text = str(value or "")
    if not text:
        return ""
    try:
        parsed = urlparse(text)
        return f"{parsed.scheme}://{parsed.netloc}/..."
    except Exception:
        return "configured"


def validate_public_url(url: str) -> str:
    parsed = urlparse((url or "").strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise HTTPException(status_code=400, detail="Alert URL must be HTTP or HTTPS.")
    host = parsed.hostname.lower()
    if host in BLOCKED_HOSTS or host.endswith(".localhost"):
        raise HTTPException(status_code=400, detail="Alert URL host is not allowed.")
    try:
        addresses = socket.getaddrinfo(host, parsed.port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise HTTPException(status_code=400, detail="Alert URL hostname could not be resolved.") from exc
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_reserved or ip.is_unspecified:
            raise HTTPException(status_code=400, detail="Alert URL resolves to a blocked network address.")
    return parsed.geturl()


def validate_channel_config(channel_type: str, config: dict[str, Any]) -> dict[str, Any]:
    if channel_type not in ALLOWED_CHANNEL_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported alert channel type.")
    clean = {key: str(value or "").replace("\x00", "").strip() for key, value in config.items()}
    if channel_type == "email":
        required = ["to_email", "smtp_host", "smtp_port", "smtp_user", "smtp_pass"]
        for key in required:
            if not clean.get(key):
                raise HTTPException(status_code=400, detail="Email channel configuration is incomplete.")
        clean["smtp_port"] = str(int(clean["smtp_port"]))
        return clean
    if channel_type in {"discord", "slack"}:
        key = "webhook_url"
        clean[key] = validate_public_url(clean.get(key, ""))
        return {key: clean[key]}
    if channel_type == "telegram":
        if not clean.get("bot_token") or not clean.get("chat_id"):
            raise HTTPException(status_code=400, detail="Telegram channel configuration is incomplete.")
        return {"bot_token": clean["bot_token"], "chat_id": clean["chat_id"]}
    clean["url"] = validate_public_url(clean.get("url", ""))
    return {
        "url": clean["url"],
        "secret_header_name": clean.get("secret_header_name", ""),
        "secret_header_value": clean.get("secret_header_value", ""),
    }


def alert_message(monitor: Monitor, alert_type: str, duration: str | None = None) -> str:
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    if alert_type == "recovery":
        suffix = f" — was down for {duration}" if duration else ""
        return f"[DevTools Alert] {monitor.name} is UP{suffix}"
    return f"[DevTools Alert] {monitor.name} is DOWN — {timestamp}"


async def send_channel_message(channel: AlertChannel, message: str, payload: dict[str, Any] | None = None) -> None:
    config = decrypt_config(channel.config)
    payload = payload or {}
    if channel.channel_type == "email":
        await send_email(config, "DevTools Alert", message)
    elif channel.channel_type == "discord":
        await send_discord(config["webhook_url"], message)
    elif channel.channel_type == "slack":
        await send_slack(config["webhook_url"], message)
    elif channel.channel_type == "telegram":
        await send_telegram(config["bot_token"], config["chat_id"], message)
    elif channel.channel_type == "webhook":
        await send_webhook(config, {"message": message, **payload})
    else:
        raise HTTPException(status_code=400, detail="Unsupported alert channel type.")


async def send_discord(webhook_url: str, message: str) -> None:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(validate_public_url(webhook_url), json={"content": message})
        response.raise_for_status()


async def send_slack(webhook_url: str, message: str) -> None:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(validate_public_url(webhook_url), json={"text": message})
        response.raise_for_status()


async def send_telegram(bot_token: str, chat_id: str, message: str) -> None:
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json={"chat_id": chat_id, "text": message})
        response.raise_for_status()


async def send_webhook(config: dict[str, Any], payload: dict[str, Any]) -> None:
    headers = {"Content-Type": "application/json"}
    if config.get("secret_header_name") and config.get("secret_header_value"):
        headers[config["secret_header_name"]] = config["secret_header_value"]
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(validate_public_url(config["url"]), json=payload, headers=headers)
        response.raise_for_status()


async def send_email(config: dict[str, Any], subject: str, body: str) -> None:
    message = EmailMessage()
    message["From"] = config.get("smtp_user") or settings.SMTP_FROM
    message["To"] = config["to_email"]
    message["Subject"] = subject
    message.set_content(body)
    with smtplib.SMTP(config["smtp_host"], int(config["smtp_port"]), timeout=20) as smtp:
        smtp.starttls()
        smtp.login(config["smtp_user"], config["smtp_pass"])
        smtp.send_message(message)


def _duration_since_last_down(db: Session, monitor_id: int) -> str | None:
    row = (
        db.query(AlertLog)
        .filter(AlertLog.monitor_id == monitor_id, AlertLog.alert_type == "down")
        .order_by(AlertLog.sent_at.desc())
        .first()
    )
    if row is None or row.sent_at is None:
        return None
    seconds = max(0, int((datetime.datetime.utcnow() - row.sent_at).total_seconds()))
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m {seconds % 60}s"
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    return f"{hours}h {minutes}m"


async def send_routed_alert(monitor: Monitor, check: MonitorCheck, alert_type: str, db: Session) -> None:
    rules = (
        db.query(AlertRule, AlertChannel)
        .join(AlertChannel, AlertChannel.id == AlertRule.channel_id)
        .filter(AlertRule.monitor_id == monitor.id, AlertChannel.is_active.is_(True))
        .all()
    )
    duration = _duration_since_last_down(db, monitor.id) if alert_type == "recovery" else None
    message = alert_message(monitor, alert_type, duration)
    payload = {
        "type": alert_type,
        "monitor": {"id": monitor.id, "name": monitor.name, "url": monitor.url, "status": check.status},
        "checked_at": check.checked_at.isoformat() if check.checked_at else None,
        "response_ms": check.response_ms,
        "status_code": check.status_code,
    }
    for rule, channel in rules:
        if alert_type == "down" and not rule.on_down:
            continue
        if alert_type == "recovery" and not rule.on_recovery:
            continue
        log = AlertLog(monitor_id=monitor.id, channel_id=channel.id, alert_type=alert_type, message=message, status="sent")
        try:
            await send_channel_message(channel, message, payload)
        except Exception as exc:
            log.status = "failed"
            log.error = str(exc)[:1000]
        db.add(log)
    db.commit()
