"""Config history routes — snapshots, diffs, rollback."""
import json
import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.config_history import ConfigSnapshot
from app.models.audit import AuditLog
from app.services.config_audit import get_recent_changes

router = APIRouter(prefix="/v3", tags=["Config History"])

CONFIG_BACKUP_DIR = os.path.expanduser("~/.openclaw/config-backups")
CONFIG_PATH = os.path.expanduser("~/.openclaw/openclaw.json")
MAX_SNAPSHOTS_DAYS = 30


def _ensure_backup_dir():
    os.makedirs(CONFIG_BACKUP_DIR, exist_ok=True)


def _load_current_config():
    """Load current openclaw.json."""
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError:
        return {}


def _save_snapshot(config, user, diff_summary=None, change_reason=None):
    """Save config to backup directory and database."""
    _ensure_backup_dir()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"config-{timestamp}.json"
    filepath = os.path.join(CONFIG_BACKUP_DIR, filename)
    
    with open(filepath, "w") as f:
        json.dump(config, f, indent=2)
    
    return filepath


async def _cleanup_old_snapshots(db: AsyncSession):
    """Remove snapshots older than MAX_SNAPSHOTS_DAYS."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_SNAPSHOTS_DAYS)
    result = await db.execute(select(ConfigSnapshot).where(ConfigSnapshot.timestamp < cutoff))
    old_snapshots = result.scalars().all()
    for snapshot in old_snapshots:
        await db.delete(snapshot)
        # Also remove backup file
        if snapshot.change_reason and snapshot.change_reason.startswith("file:"):
            filepath = snapshot.change_reason[5:]
            try:
                os.remove(filepath)
            except OSError:
                pass


async def _compute_diff(old_config, new_config):
    """Compute simple JSON diff between two configs."""
    changes = []
    all_keys = set(list(old_config.keys()) + list(new_config.keys()))
    
    for key in all_keys:
        if key not in old_config:
            changes.append({"path": key, "type": "added", "new_value": new_config.get(key)})
        elif key not in new_config:
            changes.append({"path": key, "type": "removed", "old_value": old_config.get(key)})
        elif old_config[key] != new_config[key]:
            changes.append({
                "path": key,
                "type": "modified",
                "old_value": old_config[key],
                "new_value": new_config[key]
            })
    
    return changes


@router.get("/config/history")
async def list_snapshots(
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    user: str = None,
    days: int = None
):
    """List config snapshots, optionally filtered by user or date range."""
    query = select(ConfigSnapshot).order_by(desc(ConfigSnapshot.timestamp))
    
    if user:
        query = query.where(ConfigSnapshot.user == user)
    if days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.where(ConfigSnapshot.timestamp >= cutoff)
    
    query = query.limit(limit)
    result = await db.execute(query)
    snapshots = result.scalars().all()
    
    return [s.to_dict() for s in snapshots]


@router.get("/config/history/stats")
async def get_history_stats(db: AsyncSession = Depends(get_db)):
    """Get config history statistics."""
    # Total snapshots
    result = await db.execute(select(ConfigSnapshot))
    all_snapshots = result.scalars().all()
    
    # Snapshots per user
    user_counts = {}
    for s in all_snapshots:
        user_counts[s.user] = user_counts.get(s.user, 0) + 1
    
    # Snapshots per day (last 7 days)
    daily_counts = {}
    for i in range(7):
        day = datetime.now(timezone.utc) - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        result = await db.execute(
            select(ConfigSnapshot).where(
                ConfigSnapshot.timestamp >= day_start,
                ConfigSnapshot.timestamp < day_end
            )
        )
        daily_counts[day.strftime("%Y-%m-%d")] = len(result.scalars().all())
    
    return {
        "total_snapshots": len(all_snapshots),
        "per_user": user_counts,
        "daily_last_7_days": daily_counts,
        "oldest_snapshot": all_snapshots[-1].timestamp.isoformat() if all_snapshots else None,
        "newest_snapshot": all_snapshots[0].timestamp.isoformat() if all_snapshots else None,
    }


@router.get("/config/history/{snapshot_id}")
async def get_snapshot(snapshot_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific config snapshot."""
    result = await db.execute(select(ConfigSnapshot).where(ConfigSnapshot.id == snapshot_id))
    snapshot = result.scalar_one_or_none()
    
    if not snapshot:
        raise HTTPException(status_code=404, detail=f"Snapshot {snapshot_id} not found")
    
    return snapshot.to_dict()


@router.get("/config/history/{id1}/diff/{id2}")
async def diff_snapshots(id1: int, id2: int, db: AsyncSession = Depends(get_db)):
    """Compute diff between two snapshots."""
    result1 = await db.execute(select(ConfigSnapshot).where(ConfigSnapshot.id == id1))
    snapshot1 = result1.scalar_one_or_none()
    
    result2 = await db.execute(select(ConfigSnapshot).where(ConfigSnapshot.id == id2))
    snapshot2 = result2.scalar_one_or_none()
    
    if not snapshot1 or not snapshot2:
        raise HTTPException(status_code=404, detail="One or both snapshots not found")
    
    try:
        config1 = json.loads(snapshot1.config_json)
        config2 = json.loads(snapshot2.config_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid config JSON in snapshot")
    
    diff = await _compute_diff(config1, config2)
    
    return {
        "snapshot1": snapshot1.to_dict(),
        "snapshot2": snapshot2.to_dict(),
        "changes": diff,
        "total_changes": len(diff)
    }


@router.post("/config/restore/{snapshot_id}")
async def restore_snapshot(
    snapshot_id: int,
    user: str = "system",
    reason: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Restore config from a specific snapshot."""
    result = await db.execute(select(ConfigSnapshot).where(ConfigSnapshot.id == snapshot_id))
    snapshot = result.scalar_one_or_none()
    
    if not snapshot:
        raise HTTPException(status_code=404, detail=f"Snapshot {snapshot_id} not found")
    
    try:
        config = json.loads(snapshot.config_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid config JSON in snapshot")
    
    # Backup current config before restore
    current_config = _load_current_config()
    _save_snapshot(current_config, f"{user}_pre_restore", "Pre-restore backup")
    
    # Write restored config
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)
    
    # Create audit log
    audit = AuditLog(
        action="config_restored",
        resource="config",
        details=json.dumps({
            "snapshot_id": snapshot_id,
            "snapshot_timestamp": snapshot.timestamp.isoformat(),
            "user": user,
            "reason": reason
        }),
        user=user
    )
    db.add(audit)
    
    await db.commit()
    
    return {
        "success": True,
        "restored_from": snapshot.to_dict(),
        "message": f"Config restored from snapshot {snapshot_id} ({snapshot.timestamp.isoformat()})"
    }


@router.post("/config/snapshot")
async def create_snapshot(
    user: str = "system",
    reason: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Manually create a config snapshot."""
    config = _load_current_config()
    filepath = _save_snapshot(config, user, reason)
    
    snapshot = ConfigSnapshot(
        user=user,
        config_json=json.dumps(config, indent=2),
        diff_summary=reason or "Manual snapshot",
        change_reason=f"file:{filepath}"
    )
    db.add(snapshot)
    await db.commit()
    
    return snapshot.to_dict()


@router.delete("/config/history/{snapshot_id}")
async def delete_snapshot(snapshot_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a specific snapshot (not the most recent one for safety)."""
    result = await db.execute(select(ConfigSnapshot).where(ConfigSnapshot.id == snapshot_id))
    snapshot = result.scalar_one_or_none()
    
    if not snapshot:
        raise HTTPException(status_code=404, detail=f"Snapshot {snapshot_id} not found")
    
    # Prevent deleting the most recent snapshot
    latest_result = await db.execute(select(ConfigSnapshot).order_by(desc(ConfigSnapshot.timestamp)))
    latest = latest_result.scalar_one_or_none()
    
    if latest and latest.id == snapshot_id:
        raise HTTPException(status_code=400, detail="Cannot delete the most recent snapshot")
    
    # Remove backup file
    if snapshot.change_reason and snapshot.change_reason.startswith("file:"):
        filepath = snapshot.change_reason[5:]
        try:
            os.remove(filepath)
        except OSError:
            pass
    
    await db.delete(snapshot)
    await db.commit()
    
    return {"success": True, "deleted_id": snapshot_id}


@router.get("/config/audit")
async def get_config_audit(
    limit: int = 50,
    user: str = None,
    days: int = None,
    action: str = None,
):
    """Get config audit log with filtering."""
    changes = get_recent_changes(limit=limit * 2)  # Fetch extra for filtering
    
    # Apply filters
    if user:
        changes = [c for c in changes if c.get("user") == user or c.get("user_id") == user]
    
    if action:
        changes = [c for c in changes if action in c.get("action", "")]
    
    if days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        changes = [c for c in changes if datetime.fromisoformat(c.get("timestamp", "").replace("+00:00", "+00:00")) >= cutoff]
    
    # Limit after filtering
    changes = changes[:limit]
    
    return {
        "logs": changes,
        "total": len(changes),
        "filters": {
            "user": user,
            "action": action,
            "days": days,
        }
    }


@router.get("/config/audit/stats")
async def get_config_audit_stats():
    """Get config audit statistics."""
    changes = get_recent_changes(limit=200)
    
    # Count by action
    action_counts = {}
    user_counts = {}
    daily_counts = {}
    
    for change in changes:
        action = change.get("action", "unknown")
        action_counts[action] = action_counts.get(action, 0) + 1
        
        user = change.get("user", change.get("user_id", "unknown"))
        user_counts[user] = user_counts.get(user, 0) + 1
        
        ts = change.get("timestamp", "")
        if ts:
            try:
                day = datetime.fromisoformat(ts.replace("+00:00", "+00:00")).strftime("%Y-%m-%d")
                daily_counts[day] = daily_counts.get(day, 0) + 1
            except (ValueError, TypeError):
                pass
    
    return {
        "total_changes": len(changes),
        "by_action": action_counts,
        "by_user": user_counts,
        "by_day": dict(sorted(daily_counts.items(), reverse=True)[:7]),
    }
