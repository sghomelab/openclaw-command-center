"""Gateway health monitoring routes."""
import subprocess
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

GATEWAY_URL = "http://localhost:18789"


async def _call_gateway(path: str, timeout: float = 5.0) -> dict | None:
    """Call a Gateway HTTP endpoint, returning parsed JSON or None on failure."""
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(f"{GATEWAY_URL}{path}")
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return None


async def _run_cli(args: list[str], timeout: float = 10.0) -> dict | None:
    """Run an openclaw CLI command with --json output."""
    try:
        result = await subprocess.run(
            ["openclaw"] + args,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout
    except Exception:
        pass
    return None


@router.get("/health/gateway")
async def gateway_health():
    """Return gateway health status, runtime info, and session count."""
    healthz = await _call_gateway("/healthz")
    readyz = await _call_gateway("/readyz")
    status_json = await _run_cli(["status", "--json"])

    # Determine overall status
    healthy = healthz is not None and readyz is not None
    failing_deps = []
    if readyz:
        failing_deps = readyz.get("failing", []) or []

    if not healthy:
        status = "offline"
    elif failing_deps:
        status = "degraded"
    else:
        status = "healthy"

    # Parse CLI status output
    uptime = None
    pid = None
    memory_mb = None
    sessions = None
    compaction = None
    version = None

    if status_json:
        try:
            import json
            data = json.loads(status_json)
            uptime = data.get("uptime")
            pid = data.get("pid")
            memory_mb = data.get("memory_mb") or data.get("memory")
            sessions = data.get("sessions")
            compaction = data.get("compaction_mode")
            version = data.get("version")
        except Exception:
            pass

    return {
        "status": status,
        "healthz": healthz,
        "readyz": readyz,
        "failing_dependencies": failing_deps,
        "uptime": uptime,
        "pid": pid,
        "memory_mb": memory_mb,
        "active_sessions": sessions,
        "compaction_mode": compaction,
        "version": version,
    }
