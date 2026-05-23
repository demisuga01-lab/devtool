from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pydantic import BaseModel

from app.core.config import get_settings
from app.api.routes import (
    api_keys,
    auth,
    collections,
    file_paste,
    gists,
    heartbeats,
    paste,
    reports,
    secrets,
    sla,
    status,
    tools,
    webhooks,
    workspace,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.core.database import init_db
    from app.core.scheduler import start_scheduler, stop_scheduler

    init_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="WellFriend DevTools API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


class HibpCheckRequest(BaseModel):
    sha1: str


@app.post("/api/hibp-check")
async def hibp_check(payload: HibpCheckRequest) -> dict:
    sha1 = payload.sha1.strip().upper()
    if len(sha1) != 40 or any(ch not in "0123456789ABCDEF" for ch in sha1):
        return {"count": 0, "checked": False, "detail": "Invalid SHA-1 hash."}
    prefix, suffix = sha1[:5], sha1[5:]
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://api.pwnedpasswords.com/range/{prefix}",
                headers={"Add-Padding": "true", "User-Agent": "WellFriend-DevTools"},
            )
            response.raise_for_status()
    except httpx.HTTPError:
        return {"count": 0, "checked": False, "detail": "HIBP check unavailable."}

    for line in response.text.splitlines():
        parts = line.split(":", 1)
        if len(parts) == 2 and parts[0].upper() == suffix:
            try:
                return {"count": int(parts[1]), "checked": True}
            except ValueError:
                return {"count": 0, "checked": True}
    return {"count": 0, "checked": True}


app.include_router(tools.router, prefix="/api")
app.include_router(paste.router, prefix="/api")
app.include_router(secrets.router, prefix="/api")
app.include_router(file_paste.router, prefix="/api")
app.include_router(collections.router, prefix="/api")
app.include_router(gists.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(api_keys.router, prefix="/api")
app.include_router(workspace.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")
app.include_router(webhooks.hook_router)
app.include_router(heartbeats.router, prefix="/api")
app.include_router(sla.router, prefix="/api")
app.include_router(status.router, prefix="/api")
app.include_router(auth.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
