"""Cron job management routes — reads from OpenClaw Gateway via CLI.

The Gateway does not expose a public REST API for cron listing,
so we use `openclaw cron list --json` to retrieve the data.
"""
import asyncio
import json
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/v3", tags=["Crons"])

GATEWAY_URL = "http://localhost:18789"


async def _list_crons_cli(include_disabled: bool = False) -> list:
    """List cron jobs via openclaw CLI."""
    try:
        cmd = ["openclaw", "cron", "list", "--json"]
        if include_disabled:
            cmd.append("--include-disabled")
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode == 0:
            data = json.loads(stdout)
            return data.get("jobs", [])
    except Exception:
        pass
    return []


@router.get("/crons")
async def list_crons(include_disabled: bool = False):
    """List all cron jobs with status, schedule, and run history."""
    jobs = await _list_crons_cli(include_disabled=include_disabled)

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


@router.post("/crons")
async def create_cron(job: dict):
    """Create a new cron job via Gateway."""
    data = await _call_cron_api(method="POST", path="/api/v1/cron/jobs", json_body=job)
    if data is None:
        raise HTTPException(status_code=502, detail="Failed to create cron job — Gateway unreachable")
    return data


@router.post("/crons/{job_id}")
async def toggle_cron(job_id: str, body: dict):
    """Toggle cron job enabled/disabled via Gateway."""
    patch = body
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.patch(f"{GATEWAY_URL}/api/v1/cron/jobs/{job_id}", json=patch)
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
    raise HTTPException(status_code=502, detail="Failed to update cron job — Gateway unreachable")


@router.delete("/crons/{job_id}")
async def delete_cron(job_id: str):
    """Delete a cron job via Gateway."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.delete(f"{GATEWAY_URL}/api/v1/cron/jobs/{job_id}")
            if resp.status_code == 200:
                return {"success": True, "job_id": job_id}
        except Exception:
            pass
    raise HTTPException(status_code=502, detail="Failed to delete cron job — Gateway unreachable")


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
