"""Cron job management routes — interfaces with OpenClaw Gateway cron API."""
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

GATEWAY_URL = "http://localhost:18789"


async def _call_cron_api(method: str = "GET", path: str = "/api/v1/cron/jobs", json_body=None, include_disabled: bool = False) -> dict | list | None:
    """Call the Gateway cron API."""
    try:
        params = {}
        if include_disabled:
            params["includeDisabled"] = "true"
        async with httpx.AsyncClient(timeout=10.0) as client:
            if method == "GET":
                resp = await client.get(f"{GATEWAY_URL}{path}", params=params)
            elif method == "POST":
                resp = await client.post(f"{GATEWAY_URL}{path}", json=json_body)
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return None


@router.get("/crons")
async def list_crons(include_disabled: bool = False):
    """List all cron jobs with status, schedule, and run history."""
    data = await _call_cron_api(include_disabled=include_disabled)
    if data is None:
        # Fallback — try listing without includeDisabled
        data = await _call_cron_api()

    if isinstance(data, dict) and "jobs" in data:
        jobs = data["jobs"]
    elif isinstance(data, list):
        jobs = data
    else:
        jobs = []

    result = []
    for job in jobs:
        result.append({
            "id": job.get("id", job.get("jobId", "")),
            "name": job.get("name", "Unnamed"),
            "description": job.get("description", ""),
            "schedule": job.get("schedule", {}),
            "session_target": job.get("sessionTarget", ""),
            "enabled": job.get("enabled", True),
            "payload": job.get("payload", {}),
            "state": job.get("state", {}),
            "next_run": job.get("state", {}).get("nextRunAtMs"),
            "last_run": job.get("state", {}).get("lastRunAtMs"),
            "last_status": job.get("state", {}).get("lastRunStatus", "unknown"),
            "consecutive_errors": job.get("state", {}).get("consecutiveErrors", 0),
            "last_duration_ms": job.get("state", {}).get("lastDurationMs"),
            "last_error": job.get("state", {}).get("lastError"),
            "delete_after_run": job.get("deleteAfterRun", False),
        })

    return {"jobs": result, "total": len(result)}


@router.post("/crons/{job_id}/run")
async def run_cron(job_id: str):
    """Trigger a cron job immediately."""
    data = await _call_cron_api(method="POST", path=f"/api/v1/cron/run/{job_id}")
    if data is None:
        raise HTTPException(status_code=502, detail="Failed to trigger cron job — Gateway unreachable")
    return {"success": True, "job_id": job_id, "response": data}


@router.get("/crons/{job_id}/runs")
async def cron_runs(job_id: str):
    """Get run history for a cron job."""
    data = await _call_cron_api(path=f"/api/v1/cron/runs/{job_id}")
    if data is None:
        return {"runs": []}
    if isinstance(data, dict) and "runs" in data:
        return data
    if isinstance(data, list):
        return {"runs": data}
    return {"runs": []}
