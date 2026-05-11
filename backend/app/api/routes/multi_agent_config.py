"""Multi-agent config comparison — view and compare configs across all 7 agents."""
import json
import os
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/v3", tags=["Multi-Agent Config"])

MAIN_CONFIG = os.path.expanduser("~/.openclaw/openclaw.json")


def _load_agent_config(agent_id: str) -> dict:
    """Load config for a specific agent."""
    if agent_id == "main":
        config_path = MAIN_CONFIG
    else:
        workspace = f"/home/node/.openclaw/workspace-{agent_id}"
        config_path = os.path.join(workspace, "openclaw.json")
        # Fallback to main config if agent-specific doesn't exist
        if not os.path.exists(config_path):
            config_path = MAIN_CONFIG

    try:
        with open(config_path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _compare_configs(configs: dict) -> dict:
    """Compare configs across agents, highlighting differences."""
    # Compare these key settings across agents
    comparison_keys = {
        "model": lambda c: c.get("agents", {}).get("defaults", {}).get("model", "default"),
        "heartbeat": lambda c: c.get("agents", {}).get("defaults", {}).get("heartbeat", {}).get("every", "none"),
        "workspace": lambda c: c.get("agents", {}).get("defaults", {}).get("workspace", ""),
        "auth_mode": lambda c: c.get("gateway", {}).get("auth", {}).get("mode", ""),
        "bind": lambda c: c.get("gateway", {}).get("bind", ""),
        "port": lambda c: c.get("gateway", {}).get("port", 0),
        "memory_backend": lambda c: c.get("memory", {}).get("backend", ""),
        "tools_profile": lambda c: c.get("tools", {}).get("profile", ""),
        "diagnostics": lambda c: c.get("diagnostics", {}).get("enabled", False),
    }

    comparison = {}
    for key, extractor in comparison_keys.items():
        values = {}
        for agent_id, config in configs.items():
            values[agent_id] = extractor(config)
        # Check if all values are the same
        unique_values = set(str(v) for v in values.values())
        comparison[key] = {
            "values": values,
            "consistent": len(unique_values) == 1,
            "unique_count": len(unique_values),
        }

    return comparison


@router.get("/config/multi-agent")
async def get_multi_agent_config():
    """Get config comparison across all agents."""
    # Load main config to get agent list
    try:
        with open(MAIN_CONFIG) as f:
            main_config = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        main_config = {}

    agent_list = main_config.get("agents", {}).get("list", [])

    # Load config for each agent
    configs = {}
    agent_info = {}
    for agent in agent_list:
        agent_id = agent.get("id", "unknown")
        agent_name = agent.get("name", agent_id)
        workspace = agent.get("workspace", "")
        is_default = agent.get("default", False)

        configs[agent_id] = _load_agent_config(agent_id)
        agent_info[agent_id] = {
            "id": agent_id,
            "name": agent_name,
            "workspace": workspace,
            "is_default": is_default,
            "has_custom_config": os.path.exists(
                f"/home/node/.openclaw/workspace-{agent_id}/openclaw.json"
            ) if agent_id != "main" else True,
        }

    comparison = _compare_configs(configs)

    return {
        "agents": agent_info,
        "comparison": comparison,
        "agent_count": len(agent_list),
        "consistent_settings": sum(
            1 for c in comparison.values() if c["consistent"]
        ),
        "inconsistent_settings": sum(
            1 for c in comparison.values() if not c["consistent"]
        ),
    }


@router.get("/config/multi-agent/diff/{setting}")
async def compare_setting(setting: str):
    """Compare a specific setting across all agents."""
    try:
        with open(MAIN_CONFIG) as f:
            main_config = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        main_config = {}

    agent_list = main_config.get("agents", {}).get("list", [])

    # Extract the setting using dotted path
    def extract_path(config, path):
        keys = path.split(".")
        val = config
        for key in keys:
            if isinstance(val, dict):
                val = val.get(key)
            else:
                return None
        return val

    values = {}
    for agent in agent_list:
        agent_id = agent.get("id")
        config = _load_agent_config(agent_id)
        values[agent_id] = extract_path(config, setting)

    unique_values = set(str(v) for v in values.values() if v is not None)

    return {
        "setting": setting,
        "values": values,
        "consistent": len(unique_values) == 1,
        "unique_values": list(unique_values),
    }


@router.get("/config/multi-agent/summary")
async def get_agent_summary():
    """Get a quick summary of all agent configurations."""
    try:
        with open(MAIN_CONFIG) as f:
            main_config = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        main_config = {}

    agent_list = main_config.get("agents", {}).get("list", [])
    bindings = main_config.get("bindings", [])

    # Count channels per agent
    channel_counts = {}
    for binding in bindings:
        agent_id = binding.get("agentId", "unknown")
        channel = binding.get("match", {}).get("channel", "unknown")
        guild = binding.get("match", {}).get("guildId", "")
        peer = binding.get("match", {}).get("peer", {})

        if agent_id not in channel_counts:
            channel_counts[agent_id] = []

        channel_counts[agent_id].append({
            "channel": channel,
            "guild": guild,
            "peer": peer,
        })

    summary = []
    for agent in agent_list:
        agent_id = agent.get("id")
        config = _load_agent_config(agent_id)

        summary.append({
            "id": agent_id,
            "name": agent.get("name", agent_id),
            "model": agent.get("model", "default"),
            "workspace": agent.get("workspace", ""),
            "is_default": agent.get("default", False),
            "channels": channel_counts.get(agent_id, []),
            "channel_count": len(channel_counts.get(agent_id, [])),
            "heartbeat": config.get("agents", {}).get("defaults", {}).get("heartbeat", {}).get("every", "N/A"),
            "memory_backend": config.get("memory", {}).get("backend", "N/A"),
        })

    return {
        "agents": summary,
        "total_agents": len(summary),
        "total_channels": sum(a["channel_count"] for a in summary),
    }
