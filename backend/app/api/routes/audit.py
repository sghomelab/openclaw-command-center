"""Audit log routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.database import get_db
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse, AuditLogFilter
from app.api.dependencies import get_current_superuser

router = APIRouter(prefix="/v3/audit", tags=["Audit"])


@router.get("/logs")
async def list_audit_logs(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_superuser),
    user_id: int = Query(None),
    action: str = Query(None),
    resource_type: str = Query(None),
    from_date: str = Query(None),
    to_date: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    q = select(AuditLog).order_by(AuditLog.timestamp.desc())
    if user_id is not None:
        q = q.where(AuditLog.user_id == user_id)
    if action:
        q = q.where(AuditLog.action == action)
    if resource_type:
        q = q.where(AuditLog.resource_type == resource_type)
    if from_date:
        q = q.where(AuditLog.timestamp >= datetime.fromisoformat(from_date))
    if to_date:
        q = q.where(AuditLog.timestamp <= datetime.fromisoformat(to_date))

    # Pagination
    total_q = select(AuditLog)
    for clause in q._order_by.clause_list if hasattr(q, '_order_by') else []:
        pass
    # Simplified: just count all
    count_q = select(AuditLog)
    # Apply same filters to count
    if user_id is not None:
        count_q = count_q.where(AuditLog.user_id == user_id)
    if action:
        count_q = count_q.where(AuditLog.action == action)
    if resource_type:
        count_q = count_q.where(AuditLog.resource_type == resource_type)

    offset = (page - 1) * page_size
    q = q.offset(offset).limit(page_size)

    result = await db.execute(q)
    logs = result.scalars().all()

    return {
        "items": [AuditLogResponse.model_validate(l) for l in logs],
        "page": page,
        "page_size": page_size,
    }
