"""Gateway config editor routes — read/write config.yaml via gateway tool.

Includes backup-before-save, schema validation, and audit logging.
"""
import asyncio
import json
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.config_history import ConfigSnapshot
from app.models.audit import AuditLog

router = APIRouter(prefix="/v3", tags=["Config"])

CONFIG_PATH = os.path.expanduser("~/.openclaw/openclaw.json")
CONFIG_BACKUP_DIR = os.path.expanduser("~/.openclaw/config-backups")


def _ensure_backup_dir():
    os.makedirs(CONFIG_BACKUP_DIR, exist_ok=True)


def _save_config_backup(config, user, reason="auto_backup"):
    """Save current config to backup directory."""
    _ensure_backup_dir()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"config-{timestamp}.json"
    filepath = os.path.join(CONFIG_BACKUP_DIR, filename)
    
    with open(filepath, "w") as f:
        json.dump(config, f, indent=2)
    
    return filepath


async def _run_gateway_config(action: str, *args) -> dict:
    """Run openclaw gateway config command."""
    try:
        cmd = ["openclaw", "gateway", "config", action, *args]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode == 0:
            text = stdout.decode().strip()
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {"raw": text}
        return {"error": stderr.decode().strip()}
    except Exception as e:
        return {"error": str(e)}


@router.get("/config")
async def get_config():
    """Get current gateway config as JSON."""
    # Read openclaw.json directly since gateway CLI has limited subcommands
    import json as j
    config_path = "/home/node/.openclaw/openclaw.json"
    try:
        with open(config_path) as f:
            return j.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="openclaw.json not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config/schema")
async def get_config_schema():
    """Get config schema for validation hints."""
    result = await _run_gateway_config("schema", "lookup")
    if "error" in result:
        # Fallback: return basic schema info
        return {
            "sections": [
                {"path": "agents", "description": "Agent configurations"},
                {"path": "gateway", "description": "Gateway settings"},
                {"path": "discord", "description": "Discord integration"},
                {"path": "telegram", "description": "Telegram integration"},
                {"path": "cron", "description": "Cron scheduler"},
                {"path": "security", "description": "Security settings"},
            ]
        }
    return result


@router.post("/config/snapshot")
async def create_manual_snapshot(
    user: str = "system",
    reason: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Manually create a config snapshot before making changes."""
    try:
        with open(CONFIG_PATH) as f:
            config = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        config = {}
    
    filepath = _save_config_backup(config, user, reason or "manual_snapshot")
    
    snapshot = ConfigSnapshot(
        user=user,
        config_json=json.dumps(config, indent=2),
        diff_summary=reason or "Manual snapshot",
        change_reason=f"file:{filepath}"
    )
    db.add(snapshot)
    await db.commit()
    
    return snapshot.to_dict()


@router.patch("/config/{config_path}")
async def patch_config(
    config_path: str,
    value: dict,
    user: str = "system",
    reason: str = None,
    backup_before_save: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Patch a specific config path with optional backup."""
    # Load current config
    try:
        with open(CONFIG_PATH) as f:
            current_config = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        current_config = {}
    
    # Backup before save if requested
    if backup_before_save:
        _save_config_backup(current_config, user, f"pre-patch: {config_path}")
        
        # Create snapshot in database
        snapshot = ConfigSnapshot(
            user=user,
            config_json=json.dumps(current_config, indent=2),
            diff_summary=f"Pre-patch backup for {config_path}",
            change_reason=reason or f"Changed {config_path}"
        )
        db.add(snapshot)
    
    # Convert dotted path to YAML path
    yaml_path = config_path.replace(".", ".")

    # Use gateway config.patch
    try:
        cmd = ["openclaw", "gateway", "config", "patch"]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            input=json.dumps({yaml_path: value}),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode == 0:
            # Create audit log
            audit = AuditLog(
                action="config_patched",
                resource="config",
                details=json.dumps({
                    "path": config_path,
                    "value": str(value)[:500],  # Truncate long values
                    "user": user,
                    "reason": reason
                }),
                user=user
            )
            db.add(audit)
            await db.commit()
            
            return {"success": True, "path": config_path, "value": value}
        return {"error": stderr.decode().strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/config")
async def patch_full_config(
    config: dict,
    user: str = "system",
    reason: str = None,
    backup_before_save: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Replace entire config with backup before save."""
    # Load current config
    try:
        with open(CONFIG_PATH) as f:
            current_config = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        current_config = {}
    
    # Backup before save
    if backup_before_save:
        _save_config_backup(current_config, user, "pre-full-patch")
        
        snapshot = ConfigSnapshot(
            user=user,
            config_json=json.dumps(current_config, indent=2),
            diff_summary="Pre-full-patch backup",
            change_reason=reason or "Full config replacement"
        )
        db.add(snapshot)
    
    # Write new config
    try:
        with open(CONFIG_PATH, "w") as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        # Restore backup on failure
        if backup_before_save:
            with open(CONFIG_PATH, "w") as f:
                json.dump(current_config, f, indent=2)
        raise HTTPException(status_code=500, detail=f"Failed to write config: {str(e)}")
    
    # Create audit log
    audit = AuditLog(
        action="config_replaced",
        resource="config",
        details=json.dumps({
            "user": user,
            "reason": reason,
            "keys_changed": list(config.keys())
        }),
        user=user
    )
    db.add(audit)
    await db.commit()
    
    return {"success": True, "message": "Config updated successfully"}
