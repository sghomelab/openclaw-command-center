"""Audit service — log events."""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog
import json


async def log_event(
    db: AsyncSession,
    action: str,
    resource_type: str,
    user_id: int = None,
    resource_id: str = None,
    ip_address: str = None,
    user_agent: str = None,
    metadata: dict = None,
):
    """Record an audit log entry."""
    entry = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=json.dumps(metadata) if metadata else None,
    )
    db.add(entry)
    await db.flush()
