from fastapi import APIRouter

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("/http-headers")
async def http_headers() -> dict:
    return {"status": "not implemented yet"}


@router.get("/redirect-checker")
async def redirect_checker() -> dict:
    return {"status": "not implemented yet"}


@router.get("/ssl-checker")
async def ssl_checker() -> dict:
    return {"status": "not implemented yet"}


@router.get("/dns-lookup")
async def dns_lookup() -> dict:
    return {"status": "not implemented yet"}


@router.get("/whois-lookup")
async def whois_lookup() -> dict:
    return {"status": "not implemented yet"}
