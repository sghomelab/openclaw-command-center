"""Monitoring routes — system + OpenClaw metrics for Grafana-like dashboard."""
import json
import os
import shutil
import subprocess
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/v3", tags=["Monitoring"])


def run_cmd(*cmd):
    """Run command and return stdout."""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return result.stdout.strip()
    except Exception:
        return ""


def _parse_df():
    """Parse df output for disk usage."""
    output = run_cmd("df", "-h", "/")
    lines = output.split("\n")
    if len(lines) < 2:
        return None
    parts = lines[1].split()
    total = parts[1]
    used = parts[2]
    avail = parts[3]
    percent = int(parts[4].replace("%", ""))
    return {"total": total, "used": used, "available": avail, "percent": percent}


def _parse_memory():
    """Parse /proc/meminfo for memory usage."""
    try:
        with open("/proc/meminfo") as f:
            lines = f.readlines()
        info = {}
        for line in lines:
            parts = line.strip().split(":")
            if len(parts) == 2:
                key = parts[0].strip()
                val = parts[1].strip().replace(" kB", "").replace(" kB", "")
                info[key] = int(val) * 1024  # Convert to bytes
        total = info.get("MemTotal", 0)
        available = info.get("MemAvailable", 0)
        used = total - available
        percent = int((used / total * 100)) if total > 0 else 0
        return {"total": total, "used": used, "available": available, "percent": percent}
    except Exception:
        return None


def _parse_cpu():
    """Parse /proc/stat for CPU usage."""
    try:
        with open("/proc/stat") as f:
            line = f.readline()
        parts = line.split()
        # user, nice, system, idle, iowait, irq, softirq, steal
        user, nice, system, idle = int(parts[1]), int(parts[2]), int(parts[3]), int(parts[4])
        iowait, irq, softirq, steal = int(parts[5]), int(parts[6]), int(parts[7]), int(parts[8])
        total = user + nice + system + idle + iowait + irq + softirq + steal
        # Calculate usage (non-idle / total)
        usage = int(((total - idle) / total * 100)) if total > 0 else 0
        return {"percent": usage}
    except Exception:
        return None


def _parse_loadavg():
    """Parse /proc/loadavg for load averages."""
    try:
        with open("/proc/loadavg") as f:
            parts = f.read().strip().split()
        return {
            "1m": float(parts[0]),
            "5m": float(parts[1]),
            "15m": float(parts[2]),
        }
    except Exception:
        return None


def _get_openclaw_sessions():
    """Get session count."""
    try:
        output = run_cmd("openclaw", "sessions", "--all-agents", "--json")
        if output:
            data = json.loads(output)
            return data.get("count", 0)
    except Exception:
        pass
    return 0


def _get_openclaw_crons():
    """Get cron job stats."""
    try:
        output = run_cmd("openclaw", "cron", "list", "--json")
        if output:
            data = json.loads(output)
            jobs = data.get("jobs", [])
            total = len(jobs)
            enabled = sum(1 for j in jobs if j.get("enabled"))
            errors = sum(1 for j in jobs if j.get("state", {}).get("consecutiveErrors", 0) > 0)
            return {"total": total, "enabled": enabled, "errors": errors}
    except Exception:
        pass
    return {"total": 0, "enabled": 0, "errors": 0}


def _get_backup_info():
    """Get backup info."""
    backup_dir = "/opt/openclaw-backups"
    if not os.path.exists(backup_dir):
        return None
    backup_files = sorted([f for f in os.listdir(backup_dir) if f.endswith(".tar.gz")])
    total_backups = len(backup_files)
    total_size = sum(os.path.getsize(os.path.join(backup_dir, f)) for f in backup_files)
    latest = backup_files[-1] if backup_files else None
    return {
        "count": total_backups,
        "total_size": total_size,
        "latest": latest,
    }


def _get_uptime():
    """Get system uptime."""
    try:
        with open("/proc/uptime") as f:
            seconds = float(f.read().split()[0])
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        return {"seconds": seconds, "days": days, "hours": hours}
    except Exception:
        return None


@router.get("/monitoring/system")
async def system_metrics():
    """Get system metrics snapshot."""
    disk = _parse_df()
    memory = _parse_memory()
    cpu = _parse_cpu()
    load = _parse_loadavg()
    uptime = _get_uptime()

    return {
        "disk": disk,
        "memory": memory,
        "cpu": cpu,
        "load": load,
        "uptime": uptime,
    }


@router.get("/monitoring/openclaw")
async def openclaw_metrics():
    """Get OpenClaw metrics snapshot."""
    sessions = _get_openclaw_sessions()
    crons = _get_openclaw_crons()
    backups = _get_backup_info()

    return {
        "sessions": sessions,
        "crons": crons,
        "backups": backups,
    }


@router.get("/monitoring/summary")
async def monitoring_summary():
    """Get combined system + OpenClaw metrics for dashboard."""
    system = await system_metrics()
    openclaw = await openclaw_metrics()

    return {
        "system": system,
        "openclaw": openclaw,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/monitoring/history")
async def monitoring_history(hours: int = 24):
    """Get historical metrics from log files (placeholder - real history needs Prometheus).

    For now returns current snapshot. With Prometheus + recording rules, this would
    return time-series data.
    """
    system = await system_metrics()
    return {"current": system, "note": "Historical data requires Prometheus. Current snapshot returned."}
