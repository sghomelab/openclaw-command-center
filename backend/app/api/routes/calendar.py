"""Calendar & Scheduling routes — local calendar, TODO, QMD status."""
import json
import os
import pathlib
import subprocess
from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_current_user

router = APIRouter(prefix="/v3/data/calendar", tags=["Calendar & Scheduling"])


def _read_markdown_table(path: pathlib.Path) -> list[dict]:
    """Parse a simple markdown table into a list of dicts."""
    if not path.exists():
        return []
    lines = path.read_text().strip().splitlines()
    headers = None
    rows = []
    for line in lines:
        if line.startswith("|") and "---" not in line:
            cells = [c.strip() for c in line.strip("|").split("|")]
            if headers is None:
                headers = cells
            else:
                rows.append(dict(zip(headers, cells)))
    return rows


def _get_workspace_path():
    """Resolve the workspace directory (routes → api → app → backend → claw-portal → memnew → workspace)."""
    return pathlib.Path(__file__).resolve().parents[6]


@router.get("/")
async def get_calendar(_user=Depends(get_current_user)):
    """Get calendar entries from CALENDAR.md."""
    ws = _get_workspace_path()
    calendar_path = ws / "CALENDAR.md"
    entries = _read_markdown_table(calendar_path)
    return {"entries": entries, "source": str(calendar_path), "count": len(entries)}


@router.get("/todo")
async def get_todo(_user=Depends(get_current_user)):
    """Get TODO entries from TODO.md."""
    ws = _get_workspace_path()
    todo_path = ws / "TODO.md"
    entries = _read_markdown_table(todo_path)
    return {"entries": entries, "source": str(todo_path), "count": len(entries)}


@router.get("/tasks")
async def get_tasks(_user=Depends(get_current_user)):
    """Get combined scheduled tasks from CALENDAR.md and TODO.md."""
    ws = _get_workspace_path()
    calendar = _read_markdown_table(ws / "CALENDAR.md")
    todo = _read_markdown_table(ws / "TODO.md")
    return {
        "scheduled": calendar,
        "open": todo,
        "total_scheduled": len(calendar),
        "total_open": len(todo),
    }


@router.get("/qmd/status")
async def get_qmd_status(_user=Depends(get_current_user)):
    """Get QMD index status."""
    ws = _get_workspace_path()
    qmd_db = ws.parent / "agents" / "main" / "qmd" / "xdg-cache" / "qmd" / "index.sqlite"
    status = {
        "provider": "qmd",
        "db_path": str(qmd_db),
        "db_exists": qmd_db.exists(),
    }
    if qmd_db.exists():
        try:
            import sqlite3
            conn = sqlite3.connect(str(qmd_db))
            c = conn.cursor()
            try:
                status["files_indexed"] = c.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
            except Exception:
                status["files_indexed"] = 0
            try:
                status["chunks_indexed"] = c.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]
            except Exception:
                status["chunks_indexed"] = 0
            conn.close()
            status["status"] = "online"
        except Exception as e:
            status["status"] = "error"
            status["error"] = str(e)
    else:
        status["status"] = "offline"
        status["note"] = "QMD index not found"
    return status


@router.get("/overview")
async def get_overview(_user=Depends(get_current_user)):
    """Combined calendar + TODO + QMD dashboard overview."""
    ws = _get_workspace_path()
    calendar = _read_markdown_table(ws / "CALENDAR.md")
    todo = _read_markdown_table(ws / "TODO.md")
    qmd_db = ws.parent / "agents" / "main" / "qmd" / "xdg-cache" / "qmd" / "index.sqlite"

    qmd_status = "offline"
    qmd_files = 0
    qmd_chunks = 0
    if qmd_db.exists():
        try:
            import sqlite3
            conn = sqlite3.connect(str(qmd_db))
            c = conn.cursor()
            try:
                qmd_files = c.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
            except Exception:
                pass
            try:
                qmd_chunks = c.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]
            except Exception:
                pass
            conn.close()
            qmd_status = "online"
        except Exception:
            pass

    return {
        "calendar": {
            "count": len(calendar),
            "pending": sum(1 for e in calendar if "⏳" in str(e.get("Status", ""))),
            "done": sum(1 for e in calendar if "✅" in str(e.get("Status", ""))),
        },
        "todo": {
            "count": len(todo),
            "open": sum(1 for e in todo if "[ ]" in str(e.get("Task", ""))),
            "done": sum(1 for e in todo if "[x]" in str(e.get("Task", ""))),
        },
        "qmd": {
            "status": qmd_status,
            "files": qmd_files,
            "chunks": qmd_chunks,
        },
    }
