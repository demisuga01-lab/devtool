from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.routes import auth, paste, status, tools

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


app.include_router(tools.router, prefix="/api")
app.include_router(paste.router, prefix="/api")
app.include_router(status.router, prefix="/api")
app.include_router(auth.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
