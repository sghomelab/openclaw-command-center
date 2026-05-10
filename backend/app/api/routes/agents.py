"""Agent discovery and status routes."""
import json
import os
import httpx
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone

router = APIRouter()

OPENCLAW_DIR = "/home/node/.openclaw"
CONFIG_PATH = os.path.join(OPENCLAW_DIR, "openclaw.json")
GATEWAY_URL = "http://localhost:18789"

AGENT_EMOJI_MAP = {
    "main": "🗿",
    "khadijah-strategy": "💼",
    "aisha-content": "📚",
    "sawda-operations": "🤝",
    "security-hafsa": "🛡️",
    "ummhabiba-tech": "🔧",
    "zaynab-creative": "🎨",
}

AGENT_ROLES = {
    "main": "Master Orchestrator",
    "khadijah-strategy": "Strategy & Business",
    "aisha-content": "Knowledge & Research",
    "sawda-operations": "Operations & Workflow",
    "security-hafsa": "Security & Compliance",
    "ummhabiba-tech": "Technical & Integration",
    "zaynab-creative": "Creative & Content",
}

AGENT_NAMES = {
    "main": "Hajar",
    "khadijah-strategy": "Khadijah",
    "aisha-content": "Aisha",
    "sawda-operations": "Sawda",
    "security-hafsa": "Hafsa",
    "ummhabiba-tech": "Umm Habiba",
    "zaynab-creative": "Zaynab",
}


async def _get_sessions() -> dict | None:
    """Get session data from Gateway."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{GATEWAY_URL}/api/v1/sessions")
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return None


def _map_session_to_status(session_data: dict | None):
    if not session_data:
        return "offline", None, None, None
    status = "idle"
    last_activity = None
    current_task = None
    heartbeat_time = None
    if isinstance(session_data, dict):
        runs = session_data.get("runs", []) or []
        state = session_data.get("state", "")
        if state == "running" or state == "active":
            status = "active"
        elif state == "idle":
            status = "idle"
        else:
            status = "offline"
        last_activity = session_data.get("lastActivityAt", session_data.get("updatedAt"))
        heartbeat_time = session_data.get("heartbeatAt", session_data.get("lastSeenAt"))
        if runs:
            last_run = runs[-1] if isinstance(runs, list) else runs
            if isinstance(last_run, dict):
                current_task = last_run.get("message", last_run.get("input", ""))
                if current_task and len(current_task) > 80:
                    current_task = current_task[:80] + "..."
    return status, last_activity, current_task, heartbeat_time


@router.get("/agents")
async def list_agents():
    """List all configured agents with status and resource info."""
    agents = []

    try:
        with open(CONFIG_PATH) as f:
            config = json.load(f)
        agent_list = config.get("agents", {}).get("list", [])
    except Exception:
        agent_list = []

    sessions_data = await _get_sessions()
    sessions_by_agent = {}
    if sessions_data and isinstance(sessions_data, dict):
        all_sessions = sessions_data.get("sessions", [])
        if isinstance(all_sessions, list):
            for sess in all_sessions:
                agent = sess.get("agentId", sess.get("agent_id", ""))
                if agent:
                    sessions_by_agent[agent] = sess

    for agent_cfg in agent_list:
        agent_id = agent_cfg.get("id", "unknown")
        agent_name = agent_cfg.get("name", AGENT_NAMES.get(agent_id, agent_id))
        model = agent_cfg.get("model", "")
        thinking = agent_cfg.get("thinking", "")

        workspace_path = os.path.join(OPENCLAW_DIR, f"workspace-{agent_id}") if agent_id != "main" else os.path.join(OPENCLAW_DIR, "workspace-main")

        session = sessions_by_agent.get(agent_id)
        status, last_activity, current_task, heartbeat_time = _map_session_to_status(session)

        agents.append({
            "id": agent_id,
            "name": agent_name,
            "role": AGENT_ROLES.get(agent_id, ""),
            "emoji": AGENT_EMOJI_MAP.get(agent_id, "🤖"),
            "model": model,
            "thinking": thinking,
            "workspace": workspace_path,
            "status": status,
            "last_activity": last_activity,
            "current_task": current_task,
            "heartbeat_time": heartbeat_time,
        })

    return {"agents": agents, "total": len(agents)}


@router.get("/agents/{agent_id}/sessions")
async def agent_sessions(agent_id: str):
    """Get recent sessions for a specific agent."""
    sessions_data = await _get_sessions()
    if not sessions_data or not isinstance(sessions_data, dict):
        return {"agent_id": agent_id, "sessions": []}

    all_sessions = sessions_data.get("sessions", [])
    if not isinstance(all_sessions, list):
        return {"agent_id": agent_id, "sessions": []}

    agent_sessions = [s for s in all_sessions if s.get("agentId", s.get("agent_id", "")) == agent_id]
    agent_sessions.sort(
        key=lambda s: s.get("updatedAt", s.get("createdAt", "")) or "",
        reverse=True
    )

    result = []
    for sess in agent_sessions[:20]:
        result.append({
            "id": sess.get("id", sess.get("sessionId", "")),
            "state": sess.get("state", "unknown"),
            "created_at": sess.get("createdAt"),
            "updated_at": sess.get("updatedAt"),
            "last_activity": sess.get("lastActivityAt"),
            "runs": sess.get("runs", []),
            "model": sess.get("model"),
        })

    return {"agent_id": agent_id, "sessions": result, "total": len(result)}
