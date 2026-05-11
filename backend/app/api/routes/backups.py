"""Backup status routes — reads backup log and lists backup files."""
import os
import pathlib
import re
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/v3", tags=["Backups"])

BACKUP_DIR = pathlib.Path("/opt/openclaw-backups")
LOG_FILE = BACKUP_DIR / "backup.log"


def _parse_backup_file(path):
    """Parse backup file metadata."""
    stat = path.stat()
    name = path.name
    date_match = re.search(r'backup-(\d{4}-\d{2}-\d{2})\.tar\.gz', name)
    return {
        "filename": name,
        "path": str(path),
        "size_bytes": stat.st_size,
        "size_human": f"{stat.st_size / (1024*1024):.1f}M",
        "date": date_match.group(1) if date_match else "unknown",
        "modified": stat.st_mtime,
    }


@router.get("/backups/status")
async def backup_status():
    """Get backup status: log entries, file list, retention info."""
    # Parse log
    log_entries = []
    if LOG_FILE.exists():
        content = LOG_FILE.read_text()
        # Extract backup completed entries
        for line in content.split("\n"):
            if "Backup created" in line or "Backup completed" in line or "Backup started" in line:
                log_entries.append(line.strip())

    # List backup files
    backup_files = []
    if BACKUP_DIR.exists():
        for f in sorted(BACKUP_DIR.glob("backup-*.tar.gz"), reverse=True):
            backup_files.append(_parse_backup_file(f))

    # Calculate totals
    total_size = sum(b["size_bytes"] for b in backup_files)
    total_human = f"{total_size / (1024*1024):.1f}M"

    # Latest backup info
    latest = backup_files[0] if backup_files else None
    latest_ok = "Archive verified OK" in content.split("\n")[-3] if latest and content else False

    return {
        "backup_dir": str(BACKUP_DIR),
        "log_file": str(LOG_FILE),
        "total_backups": len(backup_files),
        "total_size": total_human,
        "total_size_bytes": total_size,
        "latest": {
            "filename": latest["filename"] if latest else None,
            "date": latest["date"] if latest else None,
            "size": latest["size_human"] if latest else None,
            "verified": latest_ok,
        },
        "files": backup_files,
        "recent_log_entries": log_entries[-20:],
    }
