from __future__ import annotations

import base64
import ipaddress
import json
import socket
import time
from typing import Any, Literal
from urllib.parse import urljoin, urlparse

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.api.routes._utils import rate_limit, sanitize_text

router = APIRouter(prefix="/tools", tags=["tools-http"])

MAX_RESPONSE_BYTES = 10 * 1024 * 1024
MAX_REDIRECTS = 5
BLOCKED_HEADER_NAMES = {"host", "connection", "content-length", "transfer-encoding", "accept-encoding"}
ALLOWED_METHODS = {"GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"}


class HeaderPair(BaseModel):
    key: str = Field(..., max_length=200)
    value: str = Field(default="", max_length=8000)


class HttpProxyRequest(BaseModel):
    method: Literal["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
    url: str = Field(..., max_length=4000)
    headers: list[HeaderPair] = Field(default_factory=list, max_length=100)
    body: str | None = Field(default=None, max_length=2 * 1024 * 1024)
    body_type: Literal["none", "json", "form", "text", "xml"] = "none"
    follow_redirects: bool = True
    timeout_seconds: int = Field(default=15, ge=1, le=30)


class GraphQLProxyRequest(BaseModel):
    endpoint: str = Field(..., max_length=4000)
    query: str = Field(..., max_length=1024 * 1024)
    variables: dict[str, Any] | None = None
    headers: list[HeaderPair] = Field(default_factory=list, max_length=100)


class GraphQLIntrospectRequest(BaseModel):
    endpoint: str = Field(..., max_length=4000)
    headers: list[HeaderPair] = Field(default_factory=list, max_length=100)


INTROSPECTION_QUERY = """
{
  __schema {
    types {
      name
      kind
      fields {
        name
        type { name kind }
      }
    }
  }
}
"""


def _validate_public_url(url: str) -> str:
    cleaned = sanitize_text(url, 4000, allow_empty=False)
    parsed = urlparse(cleaned)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise HTTPException(status_code=400, detail="URL must be HTTP or HTTPS.")
    host = parsed.hostname.strip().lower()
    if host == "localhost" or host.endswith(".localhost") or host == "metadata.google.internal":
        raise HTTPException(status_code=400, detail="URL host is not allowed.")
    try:
        addresses = socket.getaddrinfo(host, parsed.port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise HTTPException(status_code=400, detail="URL hostname could not be resolved.") from exc
    if not addresses:
        raise HTTPException(status_code=400, detail="URL hostname could not be resolved.")
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if (
            ip.is_loopback
            or ip.is_private
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise HTTPException(status_code=400, detail="URL resolves to a blocked network address.")
    return cleaned


def _headers_from_pairs(pairs: list[HeaderPair], *, include_content_type: bool = True) -> dict[str, str]:
    headers: dict[str, str] = {"User-Agent": "DevTools REST Client/1.0"}
    for item in pairs:
        key = sanitize_text(item.key, 200)
        if not key or key.lower() in BLOCKED_HEADER_NAMES:
            continue
        if not include_content_type and key.lower() == "content-type":
            continue
        headers[key] = item.value.replace("\x00", "")[:8000]
    return headers


def _content_for_payload(payload: HttpProxyRequest) -> tuple[bytes | None, dict[str, str]]:
    if payload.body_type == "none" or payload.body is None or payload.method in {"GET", "HEAD"}:
        return None, {}
    body = payload.body.encode("utf-8")
    if payload.body_type == "json":
        return body, {"Content-Type": "application/json"}
    if payload.body_type == "form":
        return body, {"Content-Type": "application/x-www-form-urlencoded"}
    if payload.body_type == "xml":
        return body, {"Content-Type": "application/xml"}
    return body, {"Content-Type": "text/plain; charset=utf-8"}


def _is_probably_binary(content_type: str, body: bytes) -> bool:
    lowered = content_type.lower()
    if lowered.startswith("text/") or any(part in lowered for part in ("json", "xml", "html", "javascript", "svg", "x-www-form-urlencoded")):
        return False
    if lowered.startswith("image/") or lowered.startswith("application/octet-stream"):
        return True
    return b"\x00" in body[:2048]


async def _read_limited(response: httpx.Response) -> bytes:
    chunks: list[bytes] = []
    total = 0
    async for chunk in response.aiter_bytes():
        total += len(chunk)
        if total > MAX_RESPONSE_BYTES:
            raise HTTPException(status_code=400, detail="Response body exceeded 10MB limit.")
        chunks.append(chunk)
    return b"".join(chunks)


async def _send_proxy_request(
    *,
    method: str,
    url: str,
    headers: dict[str, str],
    content: bytes | None,
    timeout_seconds: int,
    follow_redirects: bool,
) -> dict:
    current_url = _validate_public_url(url)
    redirect_chain: list[dict[str, Any]] = []
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=float(timeout_seconds), follow_redirects=False) as client:
            for _ in range(MAX_REDIRECTS + 1):
                request = client.build_request(method, current_url, headers=headers, content=content)
                response = await client.send(request, stream=True)
                body_bytes = await _read_limited(response)
                if follow_redirects and response.status_code in {301, 302, 303, 307, 308} and response.headers.get("location"):
                    redirect_chain.append({"url": str(response.url), "status_code": response.status_code})
                    if len(redirect_chain) > MAX_REDIRECTS:
                        raise HTTPException(status_code=400, detail="Too many redirects.")
                    current_url = _validate_public_url(urljoin(str(response.url), response.headers["location"]))
                    if response.status_code == 303:
                        method = "GET"
                        content = None
                    continue
                break
            else:
                raise HTTPException(status_code=400, detail="Too many redirects.")
    except HTTPException:
        raise
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=400, detail="Request timed out.") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=400, detail=f"Request failed: {exc}") from exc

    elapsed_ms = round((time.perf_counter() - start) * 1000)
    content_type = response.headers.get("content-type", "")
    is_binary = _is_probably_binary(content_type, body_bytes)
    body = base64.b64encode(body_bytes).decode("ascii") if is_binary else body_bytes.decode("utf-8", errors="replace")
    return {
        "status_code": response.status_code,
        "status_text": response.reason_phrase,
        "headers": [{"key": key, "value": value} for key, value in response.headers.items()],
        "body": body,
        "body_is_base64": is_binary,
        "content_type": content_type,
        "body_size_bytes": len(body_bytes),
        "response_time_ms": elapsed_ms,
        "redirect_chain": redirect_chain,
        "final_url": str(response.url),
    }


@router.post("/http-proxy")
async def http_proxy(payload: HttpProxyRequest, request: Request) -> dict:
    rate_limit(request, "tools:http-proxy", 60, 60)
    content, content_headers = _content_for_payload(payload)
    headers = _headers_from_pairs(payload.headers)
    headers = {**content_headers, **headers}
    return await _send_proxy_request(
        method=payload.method,
        url=payload.url,
        headers=headers,
        content=content,
        timeout_seconds=payload.timeout_seconds,
        follow_redirects=payload.follow_redirects,
    )


async def _graphql_call(endpoint: str, headers: list[HeaderPair], body: dict[str, Any]) -> dict:
    request_payload = HttpProxyRequest(
        method="POST",
        url=endpoint,
        headers=headers,
        body=json.dumps(body),
        body_type="json",
        follow_redirects=True,
        timeout_seconds=30,
    )
    content, content_headers = _content_for_payload(request_payload)
    proxy_headers = {**content_headers, **_headers_from_pairs(headers)}
    response = await _send_proxy_request(
        method="POST",
        url=endpoint,
        headers=proxy_headers,
        content=content,
        timeout_seconds=30,
        follow_redirects=True,
    )
    parsed: dict[str, Any] = {}
    if not response.get("body_is_base64"):
        try:
            parsed = json.loads(response["body"])
        except json.JSONDecodeError:
            parsed = {}
    response["data"] = parsed.get("data")
    response["errors"] = parsed.get("errors") or []
    response["extensions"] = parsed.get("extensions") or {}
    return response


@router.post("/graphql-proxy")
async def graphql_proxy(payload: GraphQLProxyRequest, request: Request) -> dict:
    rate_limit(request, "tools:graphql-proxy", 60, 60)
    return await _graphql_call(
        payload.endpoint,
        payload.headers,
        {"query": payload.query, "variables": payload.variables or {}},
    )


@router.post("/graphql-introspect")
async def graphql_introspect(payload: GraphQLIntrospectRequest, request: Request) -> dict:
    rate_limit(request, "tools:graphql-introspect", 30, 60)
    response = await _graphql_call(payload.endpoint, payload.headers, {"query": INTROSPECTION_QUERY, "variables": {}})
    if response["status_code"] >= 400:
        raise HTTPException(status_code=400, detail="GraphQL introspection failed.")
    return {
        "schema": response.get("data"),
        "errors": response.get("errors", []),
        "response_time_ms": response.get("response_time_ms"),
    }
