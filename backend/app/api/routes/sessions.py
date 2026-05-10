"""Session browser routes — lists all OpenClaw sessions and their histories."""
import asyncio
import json
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/v3", tags=["Sessions"])


async def _run_sessions_list() -> dict:
    """List sessions via openclaw CLI."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "openclaw", "sessions", "list", "--json",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode == 0:
            return json.loads(stdout)
    except Exception:
        pass
    return {"sessions": []}


async def _run_session_history(session_key: str, limit: int = 10) -> dict:
    """Get session history via openclaw CLI."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "openclaw", "sessions", "history", session_key,
            "--limit", str(limit), "--json",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode == 0:
            return json.loads(stdout)
    except Exception:
        pass
    return {"messages": []}


@router.get("/sessions")
async def list_sessions():
    """List all active sessions."""
    data = await _run_sessions_list()
    sessions = data.get("sessions", [])
    # Normalise each session
    result = []
    for s in sessions:
        result.append({
            "id": s.get("id", s.get("sessionKey", "")),
            "label": s.get("label", ""),
            "kind": s.get("kind", ""),
            "agentId": s.get("agentId", ""),
            "model": s.get("model", ""),
            "status": s.get("status", "unknown"),
            "messageCount": s.get("messageCount", s.get("message_count", 0)),
            "lastActivity": s.get("lastActivity", s.get("lastActivityAt", "")),
            "title": s.get("title", ""),
        })
    return {"sessions": result, "total": len(result)}


@router.get("/sessions/{session_key}/history")
async def get_session_history(session_key: str, limit: int = 10):
    """Get recent messages for a session."""
    data = await _run_session_history(session_key, limit)
    messages = data.get("messages", [])
    # Normalise messages
    result = []
    for m in messages:
        result.append({
            "role": m.get("role", ""),
            "content": m.get("content", "") if isinstance(m.get("content"), str) else json.dumps(m.get("content", "")),
            "timestamp": m.get("timestamp", ""),
        })
    return {"messages": result, "sessionKey": session_key}
