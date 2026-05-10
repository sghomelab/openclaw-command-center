"""Disk usage dashboard routes."""
import asyncio
import json
import os
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/v3", tags=["Disk"])

OPENCLAW_DIR = "/home/node/.openclaw"
MONITORED_DIRS = [
    OPENCLAW_DIR,
    "/tmp",
    "/var/log",
    "/home/node/.npm",
]


async def _run_cmd(*cmd: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, _ = await proc.communicate()
    return stdout.decode().strip()


async def _get_df() -> dict:
    """Get disk usage from df -h."""
    output = await _run_cmd("df", "-h", "/")
    lines = output.strip().split("\n")
    if len(lines) < 2:
        return {"used": "0", "total": "0", "percent": "0%"}
    parts = lines[1].split()
    return {
        "filesystem": parts[0],
        "total": parts[1],
        "used": parts[2],
        "available": parts[3],
        "percent": parts[4],
    }


async def _get_top_dirs(top_n: int = 30) -> list:
    """Get top N directories by size."""
    results = []
    for base in MONITORED_DIRS:
        if not os.path.isdir(base):
            continue
        for entry in os.listdir(base):
            path = os.path.join(base, entry)
            if not os.path.isdir(path):
                continue
            size = await _run_cmd("du", "-sh", path)
            parts = size.split("\t")
            if len(parts) >= 2:
                results.append({"path": path, "size": parts[0]})

    # Also scan workspace subdirs
    workspace = "/home/node/.openclaw"
    if os.path.isdir(workspace):
        for entry in os.listdir(workspace):
            path = os.path.join(workspace, entry)
            if os.path.isdir(path):
                size = await _run_cmd("du", "-sh", path)
                parts = size.split("\t")
                if len(parts) >= 2:
                    results.append({"path": path, "size": parts[0]})

    # Sort by size (human-readable)
    def parse_size(s):
        s = s.strip()
        if s.endswith("G"):
            return float(s[:-1]) * 1024
        elif s.endswith("M"):
            return float(s[:-1])
        elif s.endswith("K"):
            return float(s[:-1]) / 1024
        return 0

    results.sort(key=lambda x: parse_size(x["size"]), reverse=True)
    return results[:top_n]


async def _count_files(path: str) -> int:
    """Count files in a directory."""
    output = await _run_cmd("find", path, "-type", "f", "|", "wc", "-l")
    try:
        return int(output.strip())
    except ValueError:
        return 0


@router.get("/disk")
async def get_disk_usage():
    """Get overall disk usage and top consumers."""
    df = await _get_df()
    top_dirs = await _get_top_dirs()

    # Parse percentage
    percent_str = df.get("percent", "0%").replace("%", "")
    try:
        percent = int(percent_str)
    except ValueError:
        percent = 0

    status = "green"
    if percent >= 85:
        status = "red"
    elif percent >= 70:
        status = "yellow"

    return {
        "disk": df,
        "percent": percent,
        "status": status,
        "top_dirs": top_dirs,
    }


@router.post("/disk/cleanup")
async def cleanup_disk(target: str = "all"):
    """Clean up disk space. Target: logs, cache, all."""
    cleaned = []

    if target in ("logs", "all"):
        # Clean old log files (>7 days)
        output = await _run_cmd(
            "find", "/tmp", "-name", "*.log", "-mtime", "+7", "-delete", "-print"
        )
        if output:
            cleaned.append({"type": "old_logs", "files": len(output.strip().split("\n"))})

    if target in ("cache", "all"):
        # Clean npm cache
        npm_result = await _run_cmd("npm", "cache", "clean", "--force")
        cleaned.append({"type": "npm_cache", "cleaned": True})

    if target in ("all",):
        # Clean old Python cache
        output = await _run_cmd(
            "find", "/home/node/.openclaw", "-name", "__pycache__",
            "-type", "d", "-exec", "rm", "-rf", "{}", ";"
        )

    return {"cleaned": cleaned, "status": "success"}
