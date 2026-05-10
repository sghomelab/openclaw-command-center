"""Session browser routes — lists all OpenClaw sessions and their histories."""
import asyncio
import json
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/v3", tags=["Sessions"])


async def _run_sessions_list() -> dict:
    """List sessions via openclaw CLI."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "openclaw", "sessions", "--all-agents", "--json",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode == 0:
            return json.loads(stdout)
    except Exception:
        pass
    return {"sessions": []}


async def _run_session_history(session_key: str, limit: int = 10) -> dict:
    """Get session history.

    NOTE: OpenClaw CLI doesn't have a sessions history subcommand.
    This returns session metadata. Full message history requires the
    sessions_history internal tool (agent-only, not exposed via CLI).
    """
    # Try to read session transcript from store
    import pathlib
    session_dir = pathlib.Path(f"/home/node/.openclaw/session-stores")
    if session_dir.exists():
        for store_dir in session_dir.iterdir():
            transcript_file = store_dir / f"{session_key}.md"
            if transcript_file.exists():
                try:
                    content = transcript_file.read_text()
                    lines = content.split("\n")[:limit]
                    messages = []
                    for line in lines:
                        if line.strip():
                            messages.append({
                                "role": "assistant",
                                "content": line.strip(),
                                "timestamp": ""
                            })
                    return {"messages": messages}
                except Exception:
                    pass
    return {"messages": [], "note": "Session history not available via CLI. Use an agent to run sessions_history tool."}


@router.get("/sessions")
async def list_sessions():
    """List all active sessions."""
    data = await _run_sessions_list()
    sessions = data.get("sessions", [])
    # Normalise each session — OpenClaw sessions use key, updatedAt, kind, agentId
    result = []
    for s in sessions:
        result.append({
            "id": s.get("key", s.get("sessionId", "")),
            "label": s.get("agentId", "unknown"),  # agentId as label
            "kind": s.get("kind", ""),
            "agentId": s.get("agentId", ""),
            "model": s.get("model", ""),
            "status": "active" if s.get("systemSent") else "idle",
            "messageCount": s.get("totalTokens", 0),
            "lastActivity": s.get("updatedAt", ""),
            "sessionId": s.get("sessionId", ""),
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
