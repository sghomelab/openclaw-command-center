"""Event feed routes — returns recent gateway activity from audit logs."""
from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/v3", tags=["Events"])


@router.get("/events")
async def list_events(
    limit: int = Query(50, le=200),
    _user=Depends(get_current_user),
):
    """Return recent gateway events. Reads from audit log if available."""
    import json
    from pathlib import Path
    events = []

    # Try to read from audit log database via CLI
    audit_path = Path("/home/node/.openclaw/workspace-main/memnew/claw-portal/backend/claw_portal.db")
    if audit_path.exists():
        import sqlite3
        conn = sqlite3.connect(str(audit_path))
        try:
            rows = conn.execute(
                "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?",
                (limit,)
            ).fetchall()
            for row in rows:
                events.append(dict(zip([c[0] for c in conn.description], row)))
        except Exception:
            pass
        finally:
            conn.close()

    # Fallback: return gateway log tail if audit table doesn't exist
    if not events:
        gateway_log = Path("/tmp/portal.log")
        if gateway_log.exists():
            try:
                lines = gateway_log.read_text().split("\n")[-limit:]
                for line in lines:
                    if line.strip():
                        events.append({"timestamp": "", "message": line, "level": "info"})
            except Exception:
                pass

    return {"events": events, "total": len(events)}
