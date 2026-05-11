"""Config audit service — records detailed before/after for every config change."""
import json
import os
from datetime import datetime, timezone
from typing import Any

CONFIG_PATH = os.path.expanduser("~/.openclaw/openclaw.json")


def _load_current_config() -> dict:
    """Load current config from disk."""
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _deep_diff(old: dict, new: dict, path: str = "") -> list[dict]:
    """Compute detailed diff between two config dicts."""
    changes = []
    all_keys = set(list(old.keys()) + list(new.keys()))

    for key in all_keys:
        current_path = f"{path}.{key}" if path else key

        if key not in old:
            changes.append({
                "path": current_path,
                "type": "added",
                "old_value": None,
                "new_value": new[key],
            })
        elif key not in new:
            changes.append({
                "path": current_path,
                "type": "removed",
                "old_value": old[key],
                "new_value": None,
            })
        elif isinstance(old[key], dict) and isinstance(new[key], dict):
            changes.extend(_deep_diff(old[key], new[key], current_path))
        elif old[key] != new[key]:
            changes.append({
                "path": current_path,
                "type": "modified",
                "old_value": old[key],
                "new_value": new[key],
            })

    return changes


def record_config_change(
    action: str,
    user: str,
    reason: str = None,
    old_config: dict = None,
    new_config: dict = None,
    change_path: str = None,
) -> dict:
    """Record a config change with before/after diff.

    Returns audit record dict.
    """
    if old_config is None:
        old_config = _load_current_config()
    if new_config is None:
        new_config = _load_current_config()

    changes = _deep_diff(old_config, new_config)

    # Truncate large values for storage
    for change in changes:
        if isinstance(change.get("old_value"), str) and len(change["old_value"]) > 500:
            change["old_value"] = change["old_value"][:500] + "... [truncated]"
        if isinstance(change.get("new_value"), str) and len(change["new_value"]) > 500:
            change["new_value"] = change["new_value"][:500] + "... [truncated]"

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user": user,
        "action": action,
        "change_path": change_path,
        "reason": reason,
        "changes": changes,
        "total_changes": len(changes),
    }

    return record


def get_recent_changes(limit: int = 50) -> list[dict]:
    """Load recent config changes from SQLite audit_logs table."""
    import sqlite3
    import pathlib

    backend_dir = pathlib.Path(__file__).resolve().parent.parent
    db_path = backend_dir / "claw_portal.db"

    if not db_path.exists():
        return []

    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.execute("""
            SELECT id, user_id, action, resource_type, resource_id,
                   ip_address, user_agent, metadata, timestamp
            FROM audit_logs
            WHERE resource_type = 'config' OR action LIKE '%config%'
            ORDER BY timestamp DESC
            LIMIT ?
        """, (limit,))

        rows = cursor.fetchall()
        conn.close()

        results = []
        for row in rows:
            metadata = {}
            if row[7]:
                try:
                    metadata = json.loads(row[7])
                except json.JSONDecodeError:
                    pass

            results.append({
                "id": row[0],
                "user_id": row[1],
                "action": row[2],
                "resource_type": row[3],
                "resource_id": row[4],
                "ip_address": row[5],
                "user_agent": row[6],
                "metadata": metadata,
                "timestamp": row[8],
            })

        return results

    except Exception:
        return []
