from __future__ import annotations

import asyncio
import ipaddress
import re
import shutil
import socket
import ssl
import tempfile
import time
import uuid
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, Query, Request

router = APIRouter(prefix="/tools", tags=["tools"])

_JAVA_REGEX_RATE_LIMIT: dict[str, tuple[int, float]] = {}
_JAVA_REGEX_FLAGS = {"CASE_INSENSITIVE", "MULTILINE", "DOTALL", "UNICODE_CASE", "COMMENTS"}


# ---------------------------------------------------------------------------
# SSRF + input validation helpers
# ---------------------------------------------------------------------------

_BLOCKED_HOSTS = {"localhost", "ip6-localhost", "ip6-loopback"}

_DOMAIN_RE = re.compile(r"^[A-Za-z0-9]([A-Za-z0-9\-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9\-]{0,61}[A-Za-z0-9])?)+$")


def _is_ip_blocked(host: str) -> bool:
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return False
    if (
        ip.is_loopback
        or ip.is_private
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        return True
    return False


def _resolve_blocked(host: str) -> bool:
    """Return True if the host resolves to any blocked address."""
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return True
    for info in infos:
        addr = info[4][0]
        if _is_ip_blocked(addr):
            return True
    return False


def _validate_url(url: str) -> str:
    if not url or len(url) > 500:
        raise HTTPException(status_code=400, detail="Invalid or unsafe URL.")
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Invalid or unsafe URL.")
    host = (parsed.hostname or "").strip()
    if not host:
        raise HTTPException(status_code=400, detail="Invalid or unsafe URL.")
    if host.lower() in _BLOCKED_HOSTS:
        raise HTTPException(status_code=400, detail="Invalid or unsafe URL.")
    if _is_ip_blocked(host):
        raise HTTPException(status_code=400, detail="Invalid or unsafe URL.")
    if _resolve_blocked(host):
        raise HTTPException(status_code=400, detail="Invalid or unsafe URL.")
    return url


def _validate_domain(domain: str, allow_chars_only: bool = False) -> str:
    if not domain:
        raise HTTPException(status_code=400, detail="Invalid or unsafe domain.")
    cleaned = domain.strip()
    cleaned = re.sub(r"^https?://", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.split("/", 1)[0]
    cleaned = cleaned.split("?", 1)[0]
    cleaned = cleaned.rstrip(".")
    if not cleaned or len(cleaned) > 253:
        raise HTTPException(status_code=400, detail="Invalid or unsafe domain.")
    if cleaned.lower() in _BLOCKED_HOSTS:
        raise HTTPException(status_code=400, detail="Invalid or unsafe domain.")
    try:
        ipaddress.ip_address(cleaned)
        raise HTTPException(status_code=400, detail="Invalid or unsafe domain.")
    except ValueError:
        pass
    if allow_chars_only and not re.fullmatch(r"[A-Za-z0-9.\-]+", cleaned):
        raise HTTPException(status_code=400, detail="Invalid or unsafe domain.")
    if not _DOMAIN_RE.match(cleaned):
        raise HTTPException(status_code=400, detail="Invalid or unsafe domain.")
    if _resolve_blocked(cleaned):
        raise HTTPException(status_code=400, detail="Invalid or unsafe domain.")
    return cleaned.lower()


def _rate_limit_java_regex(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    count, started = _JAVA_REGEX_RATE_LIMIT.get(ip, (0, now))
    if now - started >= 60:
        _JAVA_REGEX_RATE_LIMIT[ip] = (1, now)
        return
    if count >= 5:
        raise HTTPException(status_code=429, detail="Too many Java regex requests. Try again later.")
    _JAVA_REGEX_RATE_LIMIT[ip] = (count + 1, started)


def _parse_java_regex_output(text: str) -> dict:
    matches: list[dict] = []
    current: dict | None = None
    total = 0
    truncated = False
    for raw_line in text.splitlines():
        if raw_line.startswith("MATCH:"):
            _, start, end, value = raw_line.split(":", 3)
            current = {"start": int(start), "end": int(end), "value": value, "groups": []}
            matches.append(current)
        elif raw_line.startswith("GROUP:") and current is not None:
            parts = raw_line.split(":", 2)
            if len(parts) == 3:
                current["groups"].append(None if parts[2] == "null" else parts[2])
        elif raw_line.startswith("TOTAL:"):
            total = int(raw_line.split(":", 1)[1])
        elif raw_line.startswith("TRUNCATED:"):
            truncated = raw_line.split(":", 1)[1].strip().lower() == "true"
    return {"total_matches": total, "matches": matches, "truncated": truncated}


@router.get("/java-regex")
async def java_regex(
    request: Request,
    pattern: str = Query(..., max_length=500),
    input: str = Query(..., max_length=10000),
    flags: str = Query("", max_length=200),
) -> dict:
    _rate_limit_java_regex(request)
    if "\x00" in pattern or "\x00" in input or "\x00" in flags:
        raise HTTPException(status_code=400, detail="Invalid Java regex input.")

    requested_flags = [flag.strip() for flag in flags.split(",") if flag.strip()]
    invalid_flags = [flag for flag in requested_flags if flag not in _JAVA_REGEX_FLAGS]
    if invalid_flags:
        raise HTTPException(status_code=400, detail="Unsupported Java regex flag.")

    suffix = uuid.uuid4().hex
    class_name = f"RegexRunner_{suffix}"
    tmpdir = tempfile.mkdtemp(prefix="java_regex_")
    java_file = f"{tmpdir}/{class_name}.java"
    source = f"""
import java.util.regex.*;

public class {class_name} {{
  public static void main(String[] args) throws Exception {{
    String pattern = args[0];
    String input = args[1];
    int flags = 0;
    if (args.length > 2 && !args[2].isEmpty()) {{
      for (String f : args[2].split(",")) {{
        switch(f.trim()) {{
          case "CASE_INSENSITIVE": flags |= Pattern.CASE_INSENSITIVE; break;
          case "MULTILINE": flags |= Pattern.MULTILINE; break;
          case "DOTALL": flags |= Pattern.DOTALL; break;
          case "UNICODE_CASE": flags |= Pattern.UNICODE_CASE; break;
          case "COMMENTS": flags |= Pattern.COMMENTS; break;
          default: break;
        }}
      }}
    }}
    Pattern p = Pattern.compile(pattern, flags);
    Matcher m = p.matcher(input);
    int count = 0;
    while (m.find()) {{
      count++;
      if (count <= 1000) {{
        System.out.println("MATCH:" + m.start() + ":" + m.end() + ":" + m.group());
        for (int i = 1; i <= m.groupCount(); i++) {{
          System.out.println("GROUP:" + i + ":" + (m.group(i) == null ? "null" : m.group(i)));
        }}
      }}
    }}
    System.out.println("TOTAL:" + count);
    System.out.println("TRUNCATED:" + (count > 1000));
  }}
}}
"""

    try:
        with open(java_file, "w", encoding="utf-8") as fh:
            fh.write(source)

        compile_proc = await asyncio.create_subprocess_exec(
            "javac",
            java_file,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            _, compile_stderr = await asyncio.wait_for(compile_proc.communicate(), timeout=10.0)
        except asyncio.TimeoutError:
            compile_proc.kill()
            await compile_proc.wait()
            raise HTTPException(status_code=504, detail="Regex execution timed out.")

        if compile_proc.returncode != 0:
            detail = compile_stderr.decode("utf-8", errors="replace").strip() or "Java regex runner failed to compile."
            raise HTTPException(status_code=500, detail=detail)

        run_proc = await asyncio.create_subprocess_exec(
            "java",
            "-cp",
            tmpdir,
            class_name,
            pattern,
            input,
            ",".join(requested_flags),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(run_proc.communicate(), timeout=10.0)
        except asyncio.TimeoutError:
            run_proc.kill()
            await run_proc.wait()
            raise HTTPException(status_code=504, detail="Regex execution timed out.")

        if run_proc.returncode != 0:
            detail = stderr.decode("utf-8", errors="replace").strip()
            if "PatternSyntaxException" in detail:
                first_line = detail.splitlines()[0] if detail else "invalid pattern"
                raise HTTPException(status_code=400, detail=f"Invalid Java regex pattern: {first_line}")
            raise HTTPException(status_code=500, detail="Java regex execution failed.")

        return _parse_java_regex_output(stdout.decode("utf-8", errors="replace"))
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Java runtime is not available on this server.")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


# ---------------------------------------------------------------------------
# HTTP headers
# ---------------------------------------------------------------------------


@router.get("/http-headers")
async def http_headers(url: str = Query(..., max_length=500)) -> dict:
    target = _validate_url(url)
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
            try:
                resp = await client.head(target)
                if resp.status_code in (405, 501):
                    resp = await client.get(target)
            except httpx.HTTPStatusError:
                resp = await client.get(target)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timed out after 10 seconds.")
    except (httpx.ConnectError, httpx.NetworkError):
        raise HTTPException(status_code=502, detail="Could not connect to the server.")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not connect to the server.")

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return {
        "url": target,
        "status_code": resp.status_code,
        "elapsed_ms": elapsed_ms,
        "headers": dict(resp.headers),
    }


# ---------------------------------------------------------------------------
# Redirect checker
# ---------------------------------------------------------------------------


@router.get("/redirect-checker")
async def redirect_checker(url: str = Query(..., max_length=500)) -> dict:
    target = _validate_url(url)
    hops: list[dict] = []
    current = target
    max_hops = 10
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=False) as client:
            for step in range(1, max_hops + 1):
                # re-validate each subsequent URL to prevent open redirect SSRF
                if step > 1:
                    _validate_url(current)
                try:
                    resp = await client.get(current)
                except httpx.TimeoutException:
                    raise HTTPException(status_code=504, detail="Request timed out after 8 seconds.")
                except (httpx.ConnectError, httpx.NetworkError, httpx.HTTPError):
                    raise HTTPException(status_code=502, detail="Could not connect to the server.")

                location = resp.headers.get("location")
                hops.append({
                    "step": step,
                    "url": current,
                    "status_code": resp.status_code,
                    "location": location,
                })
                if not location or not (300 <= resp.status_code < 400):
                    break
                current = str(resp.url.join(location))
    except HTTPException:
        raise

    return {
        "url": target,
        "hops": hops,
        "final_url": hops[-1]["url"] if hops else target,
        "total_hops": len(hops),
    }


# ---------------------------------------------------------------------------
# SSL certificate checker
# ---------------------------------------------------------------------------


def _format_cert_dt(value: str) -> str:
    """OpenSSL cert dates look like 'Jun  1 12:00:00 2026 GMT'."""
    try:
        dt = datetime.strptime(value, "%b %d %H:%M:%S %Y %Z")
        return dt.replace(tzinfo=timezone.utc).isoformat()
    except ValueError:
        return value


def _fetch_certificate(domain: str, port: int = 443, timeout: float = 10.0) -> dict:
    ctx = ssl.create_default_context()
    with socket.create_connection((domain, port), timeout=timeout) as sock:
        with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
            cert = ssock.getpeercert()
    return cert or {}


@router.get("/ssl-checker")
async def ssl_checker(domain: str = Query(..., max_length=253)) -> dict:
    target = _validate_domain(domain)
    loop = asyncio.get_running_loop()
    try:
        cert = await loop.run_in_executor(None, _fetch_certificate, target)
    except (socket.gaierror, socket.timeout, TimeoutError, ssl.SSLError, ConnectionError, OSError):
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve SSL certificate for this domain.",
        )

    subject = dict(x[0] for x in cert.get("subject", []))
    issuer = dict(x[0] for x in cert.get("issuer", []))
    valid_from_raw = cert.get("notBefore", "")
    valid_until_raw = cert.get("notAfter", "")

    days_remaining = 0
    expired = False
    if valid_until_raw:
        try:
            until = datetime.strptime(valid_until_raw, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
            now = datetime.now(tz=timezone.utc)
            days_remaining = (until - now).days
            expired = until < now
        except ValueError:
            pass

    san: list[str] = []
    for typ, value in cert.get("subjectAltName", []):
        if typ.lower() == "dns":
            san.append(value)

    return {
        "domain": target,
        "valid": not expired,
        "issued_to": subject.get("commonName", ""),
        "issued_by": issuer.get("commonName", ""),
        "valid_from": _format_cert_dt(valid_from_raw),
        "valid_until": _format_cert_dt(valid_until_raw),
        "days_remaining": days_remaining,
        "expired": expired,
        "san": san,
    }


# ---------------------------------------------------------------------------
# DNS lookup (uses `dig`)
# ---------------------------------------------------------------------------

_DNS_TYPES = {"A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA"}


@router.get("/dns-lookup")
async def dns_lookup(
    domain: str = Query(..., max_length=253),
    type: str = Query("A", max_length=10),
) -> dict:
    target = _validate_domain(domain, allow_chars_only=True)
    record_type = type.upper().strip()
    if record_type not in _DNS_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported DNS record type.")

    started = time.perf_counter()
    try:
        proc = await asyncio.create_subprocess_exec(
            "dig",
            "+short",
            target,
            record_type,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=10.0)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise HTTPException(status_code=504, detail="DNS lookup timed out.")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="DNS lookup is not available on this server.")
    except HTTPException:
        raise
    except OSError:
        raise HTTPException(status_code=500, detail="DNS lookup failed or no records found.")

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    records = [line.strip() for line in stdout.decode("utf-8", errors="replace").splitlines() if line.strip()]
    if not records and proc.returncode not in (0, None):
        raise HTTPException(status_code=502, detail="DNS lookup failed or no records found.")

    return {
        "domain": target,
        "type": record_type,
        "records": records,
        "query_time_ms": elapsed_ms,
    }


# ---------------------------------------------------------------------------
# WHOIS lookup
# ---------------------------------------------------------------------------

_WHOIS_LIMIT = 5000


@router.get("/whois-lookup")
async def whois_lookup(domain: str = Query(..., max_length=253)) -> dict:
    target = _validate_domain(domain, allow_chars_only=True)

    try:
        proc = await asyncio.create_subprocess_exec(
            "whois",
            target,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=15.0)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise HTTPException(status_code=504, detail="WHOIS lookup timed out.")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="WHOIS is not available on this server.")
    except HTTPException:
        raise
    except OSError:
        raise HTTPException(status_code=502, detail="WHOIS lookup failed for this domain.")

    text = stdout.decode("utf-8", errors="replace")
    if not text.strip():
        raise HTTPException(status_code=502, detail="WHOIS lookup failed for this domain.")

    truncated = len(text) > _WHOIS_LIMIT
    return {
        "domain": target,
        "raw": text[:_WHOIS_LIMIT],
        "truncated": truncated,
    }
