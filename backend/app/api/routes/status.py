from fastapi import APIRouter

router = APIRouter(prefix="/status", tags=["status"])


@router.get("/monitors")
async def list_monitors() -> dict:
    return {"status": "not implemented yet", "monitors": []}


@router.post("/monitors")
async def create_monitor() -> dict:
    return {"status": "not implemented yet"}


@router.get("/monitors/{monitor_id}")
async def get_monitor(monitor_id: str) -> dict:
    return {"status": "not implemented yet", "id": monitor_id}


@router.delete("/monitors/{monitor_id}")
async def delete_monitor(monitor_id: str) -> dict:
    return {"status": "not implemented yet", "id": monitor_id}


@router.post("/admin/login")
async def admin_login() -> dict:
    return {"status": "not implemented yet"}
