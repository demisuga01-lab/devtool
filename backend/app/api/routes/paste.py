from fastapi import APIRouter

router = APIRouter(prefix="/paste", tags=["paste"])


@router.post("")
async def create_paste() -> dict:
    return {"status": "not implemented yet"}


@router.get("/{paste_id}")
async def get_paste(paste_id: str) -> dict:
    return {"status": "not implemented yet", "id": paste_id}


@router.delete("/{paste_id}")
async def delete_paste(paste_id: str) -> dict:
    return {"status": "not implemented yet", "id": paste_id}
