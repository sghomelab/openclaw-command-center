"""Gateway config editor routes — read/write config.yaml via gateway tool."""
import asyncio
import json
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/v3", tags=["Config"])


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


@router.patch("/config/{config_path}")
async def patch_config(config_path: str, value):
    """Patch a specific config path."""
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
            return {"success": True, "path": config_path, "value": value}
        return {"error": stderr.decode().strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
