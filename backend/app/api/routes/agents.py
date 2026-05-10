"""Agent discovery and status routes."""
import json
import os
import httpx
from fastapi import APIRouter

router = APIRouter()

OPENCLAW_DIR = "/home/node/.openclaw"
CONFIG_PATH = os.path.join(OPENCLAW_DIR, "openclaw.json")

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
            resp = await client.get("http://localhost:18789/api/v1/sessions")
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return None


@router.get("/agents")
async def list_agents():
    """List all configured agents with status and resource info."""
    agents = []

    # Read agent list from config
    try:
        with open(CONFIG_PATH) as f:
            config = json.load(f)
        agent_list = config.get("agents", {}).get("list", [])
    except Exception:
        agent_list = []

    # Get session data
    sessions_data = await _get_sessions()

    for agent_cfg in agent_list:
        agent_id = agent_cfg.get("id", "unknown")
        agent_name = agent_cfg.get("name", AGENT_NAMES.get(agent_id, agent_id))
        model = agent_cfg.get("model", "")
        thinking = agent_cfg.get("thinking", "")

        # Workspace path
        workspace_path = os.path.join(OPENCLAW_DIR, f"workspace-{agent_id}") if agent_id != "main" else os.path.join(OPENCLAW_DIR, "workspace-main")

        agents.append({
            "id": agent_id,
            "name": agent_name,
            "role": AGENT_ROLES.get(agent_id, ""),
            "emoji": AGENT_EMOJI_MAP.get(agent_id, "🤖"),
            "model": model,
            "thinking": thinking,
            "workspace": workspace_path,
            "status": "active",  # placeholder - would need gateway session data
        })

    return {"agents": agents, "total": len(agents)}
