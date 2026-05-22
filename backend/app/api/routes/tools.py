from __future__ import annotations

import asyncio
import ipaddress
import re
import re as _re
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
from pydantic import BaseModel

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
# Fetch URL — for Web Runner import
# ---------------------------------------------------------------------------


@router.get("/fetch-url")
async def fetch_url(url: str = Query(..., max_length=500)) -> dict:
    target = _validate_url(url)
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(target, headers={"User-Agent": "Mozilla/5.0 (compatible; DevTools/1.0)"})
            if not resp.is_success:
                raise HTTPException(status_code=502, detail=f"Remote server returned {resp.status_code}")
            html_text = resp.text
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timed out.")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not connect to URL.")

    import re as _re

    css_blocks = _re.findall(r"<style[^>]*>(.*?)</style>", html_text, _re.DOTALL | _re.IGNORECASE)
    extracted_css = "\n\n".join(block.strip() for block in css_blocks)

    js_blocks = _re.findall(r"<script(?![^>]*\bsrc\b)[^>]*>(.*?)</script>", html_text, _re.DOTALL | _re.IGNORECASE)
    extracted_js = "\n\n".join(block.strip() for block in js_blocks if block.strip())

    clean_html = _re.sub(r"<style[^>]*>.*?</style>", "", html_text, flags=_re.DOTALL | _re.IGNORECASE)
    clean_html = _re.sub(r"<script[^>]*>.*?</script>", "", clean_html, flags=_re.DOTALL | _re.IGNORECASE)
    clean_html = clean_html.strip()

    return {
        "html": clean_html[:50000],
        "css": extracted_css[:20000],
        "js": extracted_js[:20000],
        "url": target,
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
    domain = domain.strip()
    if domain.lower().startswith("www."):
        domain = domain[4:]
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


class RunCodeRequest(BaseModel):
    language: str
    version: str
    code: str
    stdin: str = ""


class MySQLRequest(BaseModel):
    query: str
    database: str = "coderunner_scratch"


class PostgreSQLRequest(BaseModel):
    query: str
    database: str = "coderunner_scratch"


class MongoDBRequest(BaseModel):
    code: str
    database: str = "coderunner_scratch"


JUDGE0_URL = "http://localhost:2358/submissions"
JUDGE0_LANGUAGES_URL = "http://localhost:2358/languages"


# Judge0 language ID mapping
JUDGE0_LANGUAGE_MAP: dict[str, int] = {
    "python": 71,
    "python3": 71,
    "javascript": 63,
    "node": 63,
    "typescript": 74,
    "java": 62,
    "c": 50,
    "c++": 54,
    "cpp": 54,
    "rust": 73,
    "go": 60,
    "kotlin": 78,
    "php": 68,
    "ruby": 72,
    "bash": 46,
    "sh": 46,
    "lua": 64,
    "dart": 0,  # not available in judge0 v1.13.1
    "scala": 81,
    "perl": 85,
    "csharp": 51,
    "c#": 51,
    "mono": 51,
    "basic": 84,
    "swift": 83,
    "r": 80,
    "rscript": 80,
    "julia": 0,  # not available in judge0 v1.13.1
    "octave": 66,
    "sqlite3": 82,
    "sql": 82,
    "d": 56,
    "fortran": 59,
    "haskell": 61,
    "elixir": 57,
    "erlang": 58,
    "ocaml": 65,
    "clojure": 86,
    "groovy": 88,
    "cobol": 77,
    "nasm": 45,
    "nasm64": 45,
    "assembly": 45,
    "fsharp": 87,
    "f#": 87,
    "racket": 91,
    "nim": 91,
    "crystal": 91,
    "pascal": 67,
    "prolog": 69,
    "coffeescript": 91,
    "zig": 91,
    "commonlisp": 55,
    "lisp": 55,
    "objc": 79,
    "objectivec": 79,
    "vb": 84,
    "visualbasic": 84,
}


@router.post("/run-code")
async def run_code(payload: RunCodeRequest) -> dict:
    language = payload.language.strip().lower()
    version = payload.version.strip()
    code = payload.code
    stdin = payload.stdin

    if not language or not code:
        raise HTTPException(status_code=400, detail="language and code are required.")
    if len(code) > 100000:
        raise HTTPException(status_code=400, detail="Code too large. Maximum 100,000 characters.")
    if len(stdin) > 10000:
        raise HTTPException(status_code=400, detail="Stdin too large. Maximum 10,000 characters.")

    # Get language ID from map
    language_id = JUDGE0_LANGUAGE_MAP.get(language)
    if language_id is None:
        # Try to match by version string for Piston compatibility
        language_id = JUDGE0_LANGUAGE_MAP.get(language.split()[0])
    if language_id is None or language_id == 0:
        raise HTTPException(status_code=400, detail=f"Language '{language}' is not available in this environment.")

    request_body: dict = {
        "source_code": code,
        "language_id": language_id,
    }
    if stdin:
        request_body["stdin"] = stdin

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Submit and wait for result
            resp = await client.post(
                f"{JUDGE0_URL}?wait=true&base64_encoded=false",
                json=request_body,
            )
            if not resp.is_success:
                raise HTTPException(status_code=502, detail="Code execution service unavailable.")
            data = resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Code execution timed out.")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Code execution service is not available.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="Code execution failed.")

    stdout = data.get("stdout") or ""
    stderr = data.get("stderr") or ""
    compile_output = data.get("compile_output") or ""
    message = data.get("message") or ""

    status = data.get("status", {})
    status_id = status.get("id", 0)
    status_desc = status.get("description", "")

    # Map Judge0 status to our format
    exit_code = data.get("exit_code")
    if exit_code is None:
        if status_id == 3:
            exit_code = 0
        elif status_id in (5, 6):
            exit_code = 1
        else:
            exit_code = 1 if status_id != 3 else 0

    return {
        "language": language,
        "version": version,
        "stdout": stdout,
        "stderr": stderr,
        "output": stdout,
        "exit_code": exit_code,
        "signal": data.get("signal"),
        "cpu_time": int(float(data.get("time") or 0) * 1000),
        "wall_time": int(float(data.get("time") or 0) * 1000),
        "memory": int(data.get("memory") or 0) * 1000,
        "compile_output": compile_output,
        "compile_stderr": "",
        "status": "ok" if status_id == 3 else "error",
        "status_description": status_desc,
        "message": message,
    }


@router.get("/runtimes")
async def get_runtimes() -> list:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(JUDGE0_LANGUAGES_URL)
            if not resp.is_success:
                return []
            languages = resp.json()
            # Return in Piston-compatible format for frontend compatibility
            return [
                {
                    "language": lang.get("name", "").split(" ")[0].lower(),
                    "version": lang.get("name", ""),
                    "aliases": [],
                    "id": lang.get("id"),
                }
                for lang in languages
                if lang.get("id") and lang.get("name")
            ]
    except Exception:
        return []


@router.post("/run-mysql")
async def run_mysql(payload: MySQLRequest) -> dict:
    if not payload.query or not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query is required.")
    if len(payload.query) > 50000:
        raise HTTPException(status_code=400, detail="Query too large.")
    dangerous = _re.compile(
        r"\b(DROP\s+DATABASE|DROP\s+USER|DROP\s+TABLE|DROP\s+INDEX|GRANT|REVOKE|SHUTDOWN|CREATE\s+USER|ALTER\s+USER|FLUSH|RESET|PURGE|TRUNCATE|LOCK\s+TABLES)\b",
        _re.IGNORECASE,
    )
    if dangerous.search(payload.query):
        raise HTTPException(status_code=400, detail="This statement is not allowed.")
    try:
        proc = await asyncio.create_subprocess_exec(
            "mysql", "-u", "coderunner", "--password=CodeRunner@2026!",
            "--host=127.0.0.1", "--port=3306", "--table", payload.database,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(input=payload.query.encode()), timeout=10.0)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise HTTPException(status_code=504, detail="Query timed out after 10 seconds.")
        return {
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace"),
            "exit_code": proc.returncode,
            "status": "ok" if proc.returncode == 0 else "error",
        }
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="MySQL client not available.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/run-postgresql")
async def run_postgresql(payload: PostgreSQLRequest) -> dict:
    if not payload.query or not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query is required.")
    if len(payload.query) > 50000:
        raise HTTPException(status_code=400, detail="Query too large.")
    dangerous = _re.compile(
        r"\b(DROP\s+DATABASE|DROP\s+USER|DROP\s+TABLE|DROP\s+INDEX|DROP\s+SCHEMA|GRANT|REVOKE|CREATE\s+USER|ALTER\s+USER|DROP\s+ROLE|CREATE\s+ROLE|TRUNCATE)\b",
        _re.IGNORECASE,
    )
    if dangerous.search(payload.query):
        raise HTTPException(status_code=400, detail="This statement is not allowed.")
    import os as _os
    try:
        env = {**_os.environ, "PGPASSWORD": "CodeRunner@2026!"}
        proc = await asyncio.create_subprocess_exec(
            "psql", "-U", "coderunner", "-h", "127.0.0.1", "-p", "5432",
            "-d", payload.database, "--no-password", "-c", payload.query,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise HTTPException(status_code=504, detail="Query timed out after 10 seconds.")
        return {
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace"),
            "exit_code": proc.returncode,
            "status": "ok" if proc.returncode == 0 else "error",
        }
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="PostgreSQL client not available.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/run-mongodb")
async def run_mongodb(payload: MongoDBRequest) -> dict:
    if not payload.code or not payload.code.strip():
        raise HTTPException(status_code=400, detail="Code is required.")
    if len(payload.code) > 50000:
        raise HTTPException(status_code=400, detail="Code too large.")
    dangerous = _re.compile(
        r"\b(dropDatabase|dropUser|createUser|updateUser|grantRolesToUser|revokeRolesFromUser|db\.adminCommand)\b",
        _re.IGNORECASE,
    )
    if dangerous.search(payload.code):
        raise HTTPException(status_code=400, detail="This operation is not allowed.")
    try:
        proc = await asyncio.create_subprocess_exec(
            "mongosh", "--host", "127.0.0.1", "--port", "27017",
            "-u", "coderunner", "-p", "CodeRunner@2026!",
            "--authenticationDatabase", payload.database,
            payload.database, "--eval", payload.code, "--quiet",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise HTTPException(status_code=504, detail="Query timed out after 10 seconds.")
        return {
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace"),
            "exit_code": proc.returncode,
            "status": "ok" if proc.returncode == 0 else "error",
        }
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="MongoDB shell not available.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/security-headers")
async def security_headers(url: str = Query(..., max_length=500)) -> dict:
    target = _validate_url(url)
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(target)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timed out.")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not connect.")

    headers = dict(resp.headers)
    security_header_keys = [
        "strict-transport-security", "content-security-policy",
        "x-frame-options", "x-content-type-options", "x-xss-protection",
        "referrer-policy", "permissions-policy", "cross-origin-embedder-policy",
        "cross-origin-opener-policy", "cross-origin-resource-policy",
    ]
    result = {}
    for key in security_header_keys:
        result[key] = headers.get(key, None)
    return {"url": target, "status_code": resp.status_code, "headers": result}


@router.get("/ip-lookup")
async def ip_lookup(ip: str = Query(..., max_length=45)) -> dict:
    ip = ip.strip()
    if not ip:
        raise HTTPException(status_code=400, detail="IP address is required.")
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(f"https://ipapi.co/{ip}/json/")
            if not resp.is_success:
                raise HTTPException(status_code=502, detail="IP lookup failed.")
            return resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timed out.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="IP lookup failed.")


@router.get("/spf-checker")
async def spf_checker(domain: str = Query(..., max_length=253)) -> dict:
    target = _validate_domain(domain, allow_chars_only=True)
    results = {}

    async def lookup(name: str, rtype: str) -> list[str]:
        try:
            proc = await asyncio.create_subprocess_exec(
                "dig", "+short", name, rtype,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=8.0)
            return [l.strip().strip('"') for l in stdout.decode().splitlines() if l.strip()]
        except Exception:
            return []

    txt_records = await lookup(target, "TXT")
    results["spf"] = [r for r in txt_records if r.startswith("v=spf1")]
    results["dmarc"] = await lookup(f"_dmarc.{target}", "TXT")
    results["dkim_selector"] = "default"
    results["dkim"] = await lookup(f"default._domainkey.{target}", "TXT")
    results["domain"] = target
    return results


@router.get("/og-preview")
async def og_preview(url: str = Query(..., max_length=500)) -> dict:
    import re as _re2
    target = _validate_url(url)
    try:
        async with httpx.AsyncClient(
            timeout=10.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; DevTools/1.0)"},
        ) as client:
            resp = await client.get(target)
            if not resp.is_success:
                raise HTTPException(status_code=502, detail=f"Server returned {resp.status_code}")
            html = resp.text[:200000]
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timed out.")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not connect.")

    def meta(prop: str) -> str:
        m = _re2.search(
            rf'<meta[^>]+(?:property|name)=["\'](?:og:)?{_re2.escape(prop)}["\'][^>]+content=["\']([^"\']*)["\']',
            html, _re2.IGNORECASE,
        ) or _re2.search(
            rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]+(?:property|name)=["\'](?:og:)?{_re2.escape(prop)}["\']',
            html, _re2.IGNORECASE,
        )
        return m.group(1).strip() if m else ""

    title_m = _re2.search(r"<title[^>]*>([^<]*)</title>", html, _re2.IGNORECASE)
    return {
        "url": target,
        "og_title": meta("og:title") or meta("title") or (title_m.group(1).strip() if title_m else ""),
        "og_description": meta("og:description") or meta("description"),
        "og_image": meta("og:image"),
        "og_type": meta("og:type"),
        "og_site_name": meta("og:site_name"),
        "twitter_card": meta("twitter:card"),
        "twitter_title": meta("twitter:title"),
        "twitter_description": meta("twitter:description"),
        "twitter_image": meta("twitter:image"),
        "title": title_m.group(1).strip() if title_m else "",
    }
