"""Integration routes."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.database import get_db
from app.models.integration import Integration
from app.schemas.integration import (
    IntegrationCreate, IntegrationUpdate, IntegrationResponse, IntegrationTestRequest,
)
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/v3/integrations", tags=["Integrations"])


@router.get("")
async def list_integrations(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    result = await db.execute(select(Integration).where(Integration.is_active == True))
    return [IntegrationResponse.model_validate(i) for i in result.scalars().all()]


@router.post("", status_code=201)
async def create_integration(
    data: IntegrationCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    integ = Integration(
        type=data.type,
        name=data.name,
        endpoint=data.endpoint,
        credentials=json.dumps(data.credentials) if data.credentials else None,
        config=json.dumps(data.config) if data.config else None,
        sync_interval_minutes=data.sync_interval_minutes,
    )
    db.add(integ)
    await db.commit()
    await db.refresh(integ)
    return IntegrationResponse.model_validate(integ)


@router.put("/{integ_id}")
async def update_integration(
    integ_id: int,
    data: IntegrationUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(Integration).where(Integration.id == integ_id))
    integ = result.scalar_one_or_none()
    if not integ:
        raise HTTPException(404, "Integration not found")
    update_data = data.model_dump(exclude_unset=True)
    if "credentials" in update_data and update_data["credentials"] is not None:
        update_data["credentials"] = json.dumps(update_data["credentials"])
    if "config" in update_data and update_data["config"] is not None:
        update_data["config"] = json.dumps(update_data["config"])
    for field, value in update_data.items():
        setattr(integ, field, value)
    await db.commit()
    await db.refresh(integ)
    return IntegrationResponse.model_validate(integ)


@router.delete("/{integ_id}", status_code=204)
async def delete_integration(
    integ_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(Integration).where(Integration.id == integ_id))
    integ = result.scalar_one_or_none()
    if not integ:
        raise HTTPException(404, "Integration not found")
    integ.is_active = False
    await db.commit()


@router.post("/{integ_id}/test")
async def test_integration(
    integ_id: int,
    data: IntegrationTestRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(Integration).where(Integration.id == integ_id))
    integ = result.scalar_one_or_none()
    if not integ:
        raise HTTPException(404, "Integration not found")
    # Stub: return success for now
    return {"status": "ok", "integration": integ.name, "dry_run": data.dry_run}


@router.post("/{integ_id}/sync")
async def sync_integration(
    integ_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(Integration).where(Integration.id == integ_id))
    integ = result.scalar_one_or_none()
    if not integ:
        raise HTTPException(404, "Integration not found")
    integ.last_sync_at = datetime.now(timezone.utc)
    integ.status = "active"
    await db.commit()
    return {"status": "synced", "integration": integ.name, "synced_at": integ.last_sync_at}
