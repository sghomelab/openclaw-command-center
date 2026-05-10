"""Health check and version routes."""
import os
import socket
import psutil
from datetime import datetime, timezone
from fastapi import APIRouter
from sqlalchemy import select, desc
from app.config import settings
from app.schemas.common import HealthResponse
from app.database import async_session_factory
from app.models.alert import Alert

router = APIRouter(prefix="/v3", tags=["System"])

_startup_time = None


@router.on_event("startup")
async def _record_startup():
    global _startup_time
    _startup_time = datetime.now(timezone.utc)


@router.get("/health")
async def health():
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


def _check_port(port: int) -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(2)
            result = s.connect_ex(("localhost", port))
            return "healthy" if result == 0 else "unreachable"
    except Exception:
        return "unreachable"


def _get_disk_info():
    st = os.statvfs("/")
    total_bytes = st.f_frsize * st.f_blocks
    free_bytes = st.f_frsize * st.f_bfree
    used_bytes = total_bytes - free_bytes
    total_gb = round(total_bytes / (1024 ** 3), 1)
    used_gb = round(used_bytes / (1024 ** 3), 1)
    free_gb = round(free_bytes / (1024 ** 3), 1)
    percent = round(used_bytes / total_bytes * 100) if total_bytes else 0
    return {
        "total_gb": total_gb,
        "used_gb": used_gb,
        "free_gb": free_gb,
        "percent": percent,
    }


def _get_memory_info():
    mem = psutil.virtual_memory()
    total_gb = round(mem.total / (1024 ** 3), 1)
    used_gb = round(mem.used / (1024 ** 3), 1)
    percent = mem.percent
    return {
        "total_gb": total_gb,
        "used_gb": used_gb,
        "percent": percent,
    }


def _get_cpu_percent():
    return psutil.cpu_percent(interval=0.5)


def _get_uptime_seconds():
    boot_time = psutil.boot_time()
    return round((datetime.now(timezone.utc).timestamp() - boot_time), 1)


async def _get_alert_history(limit: int = 10):
    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(Alert).order_by(desc(Alert.triggered_at)).limit(limit)
            )
            alerts = result.scalars().all()
            history = []
            for alert in alerts:
                payload_type = "general"
                if alert.payload:
                    import json
                    try:
                        data = json.loads(alert.payload)
                        payload_type = data.get("type", "general")
                    except Exception:
                        pass
                history.append({
                    "time": alert.triggered_at.isoformat() if alert.triggered_at else None,
                    "type": payload_type,
                    "message": f"Alert #{alert.id} — {alert.status}",
                    "status": alert.status,
                })
            return history
    except Exception:
        return []


@router.get("/health/system")
async def system_health():
    disk = _get_disk_info()
    memory = _get_memory_info()
    cpu = _get_cpu_percent()
    uptime = _get_uptime_seconds()
    portal = {
        "port_9000": _check_port(9000),
        "port_5713": _check_port(5713),
    }
    alert_history = await _get_alert_history()
    return {
        "disk": disk,
        "memory": memory,
        "cpu_percent": cpu,
        "uptime_seconds": uptime,
        "portal_backend": portal,
        "alert_history": alert_history,
    }
