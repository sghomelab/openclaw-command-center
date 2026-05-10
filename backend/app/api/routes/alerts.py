"""Alerting routes — rules, alerts, incidents."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.database import get_db
from app.models.alert import AlertRule, Alert, Incident
from app.schemas.alert import (
    AlertRuleCreate, AlertRuleUpdate, AlertRuleResponse,
    AlertResponse, AlertAcknowledge,
    IncidentCreate, IncidentUpdate, IncidentResponse,
)
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/v3/alerts", tags=["Alerting"])


@router.get("/rules")
async def list_rules(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    result = await db.execute(select(AlertRule).order_by(AlertRule.id))
    return [AlertRuleResponse.model_validate(r) for r in result.scalars().all()]


@router.post("/rules", status_code=201)
async def create_rule(
    data: AlertRuleCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    rule_data = data.model_dump(exclude={"channels"})
    rule = AlertRule(
        **rule_data,
        channels=json.dumps(data.channels),
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return AlertRuleResponse.model_validate(rule)


@router.put("/rules/{rule_id}")
async def update_rule(
    rule_id: int,
    data: AlertRuleUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Rule not found")
    update_data = data.model_dump(exclude_unset=True)
    if "channels" in update_data and update_data["channels"] is not None:
        update_data["channels"] = json.dumps(update_data["channels"])
    for field, value in update_data.items():
        setattr(rule, field, value)
    await db.commit()
    await db.refresh(rule)
    return AlertRuleResponse.model_validate(rule)


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Rule not found")
    await db.delete(rule)
    await db.commit()


@router.get("")
async def list_alerts(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
    status_filter: str = Query(None, alias="status"),
    severity: str = Query(None),
):
    q = select(Alert).order_by(Alert.triggered_at.desc())
    if status_filter:
        q = q.where(Alert.status == status_filter)
    result = await db.execute(q)
    return [AlertResponse.model_validate(a) for a in result.scalars().all()]


@router.post("/{alert_id}/acknowledge")
async def acknowledge(
    alert_id: int,
    data: AlertAcknowledge,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Alert not found")
    alert.acknowledged = True
    alert.status = "acknowledged"
    alert.acknowledged_by = data.acknowledged_by or user.id
    await db.commit()
    await db.refresh(alert)
    return AlertResponse.model_validate(alert)


@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Alert not found")
    alert.status = "resolved"
    alert.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(alert)
    return AlertResponse.model_validate(alert)


@router.get("/incidents")
async def list_incidents(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    result = await db.execute(select(Incident).order_by(Incident.created_at.desc()))
    return [IncidentResponse.model_validate(i) for i in result.scalars().all()]


@router.post("/incidents", status_code=201)
async def create_incident(
    data: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    incident = Incident(**data.model_dump())
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    return IncidentResponse.model_validate(incident)


@router.put("/incidents/{incident_id}")
async def update_incident(
    incident_id: int,
    data: IncidentUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(404, "Incident not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(incident, field, value)
    if data.status == "closed":
        incident.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(incident)
    return IncidentResponse.model_validate(incident)
