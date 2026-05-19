from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import init_db
from app.core.scheduler import scheduler
from app.api.routes import paste, status, tools

settings = get_settings()

app = FastAPI(
    title="WellFriend DevTools API",
    version="0.1.0",
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


@app.on_event("startup")
def startup() -> None:
    init_db()
    if not scheduler.running:
        scheduler.start()


app.include_router(tools.router, prefix="/api")
app.include_router(paste.router, prefix="/api")
app.include_router(status.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
