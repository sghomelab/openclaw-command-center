"""Integration service — test connections, sync data (stubs)."""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.integration import Integration


async def test_connection(db: AsyncSession, integ_id: int) -> dict:
    """Test an integration connection (stub)."""
    result = await db.execute(select(Integration).where(Integration.id == integ_id))
    integ = result.scalar_one_or_none()
    if not integ:
        return {"status": "error", "message": "Integration not found"}

    # Stub: all connections succeed
    integ.status = "active"
    await db.commit()
    return {"status": "ok", "integration": integ.name, "type": integ.type}


async def sync_data(db: AsyncSession, integ_id: int) -> dict:
    """Trigger a sync for an integration (stub)."""
    result = await db.execute(select(Integration).where(Integration.id == integ_id))
    integ = result.scalar_one_or_none()
    if not integ:
        return {"status": "error", "message": "Integration not found"}

    integ.last_sync_at = datetime.now(timezone.utc)
    integ.status = "active"
    await db.commit()
    return {"status": "synced", "integration": integ.name, "synced_at": str(integ.last_sync_at)}
