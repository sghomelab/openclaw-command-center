"""Health check and version routes."""
from fastapi import APIRouter
from app.config import settings
from app.schemas.common import HealthResponse

router = APIRouter(prefix="/v3", tags=["System"])

_startup_time = None


@router.on_event("startup")
async def _record_startup():
    global _startup_time
    from datetime import datetime, timezone
    _startup_time = datetime.now(timezone.utc)


@router.get("/health")
async def health():
    from datetime import datetime, timezone
    uptime = None
    if _startup_time:
        uptime = (datetime.now(timezone.utc) - _startup_time).total_seconds()
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        uptime_seconds=round(uptime, 1) if uptime else None,
    )


@router.get("/version")
async def version():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "python": "3.11",
        "framework": "FastAPI",
        "database": settings.DATABASE_URL.split("://")[0] if "://" in settings.DATABASE_URL else "sqlite",
    }
