"""Workflow routes."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.database import get_db
from app.models.workflow import Workflow, WorkflowStep
from app.schemas.workflow import (
    WorkflowCreate, WorkflowUpdate, WorkflowResponse,
    WorkflowStepCreate, WorkflowStepResponse,
    WorkflowRunRequest,
)
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/v3/workflows", tags=["Workflows"])


@router.get("")
async def list_workflows(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    result = await db.execute(select(Workflow).order_by(Workflow.id))
    return [WorkflowResponse.model_validate(w) for w in result.scalars().all()]


@router.post("", status_code=201)
async def create_workflow(
    data: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    wf_data = data.model_dump()
    steps = wf_data.pop("steps", None) or []
    if data.trigger_config:
        wf_data["trigger_config"] = json.dumps(data.trigger_config)

    workflow = Workflow(**wf_data, steps_count=len(steps))
    db.add(workflow)
    await db.flush()

    for i, step_data in enumerate(steps):
        sd = step_data.model_dump()
        if sd.get("config"):
            sd["config"] = json.dumps(sd["config"])
        if sd.get("condition"):
            sd["condition"] = json.dumps(sd["condition"])
        step = WorkflowStep(workflow_id=workflow.id, order_index=i, **sd)
        db.add(step)

    await db.commit()
    await db.refresh(workflow)
    return WorkflowResponse.model_validate(workflow)


@router.put("/{wf_id}")
async def update_workflow(
    wf_id: int,
    data: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(Workflow).where(Workflow.id == wf_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(404, "Workflow not found")
    update_data = data.model_dump(exclude_unset=True)
    if "trigger_config" in update_data and update_data["trigger_config"] is not None:
        update_data["trigger_config"] = json.dumps(update_data["trigger_config"])
    for field, value in update_data.items():
        setattr(wf, field, value)
    await db.commit()
    await db.refresh(wf)
    return WorkflowResponse.model_validate(wf)


@router.delete("/{wf_id}", status_code=204)
async def delete_workflow(
    wf_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(Workflow).where(Workflow.id == wf_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(404, "Workflow not found")
    await db.delete(wf)
    await db.commit()


@router.get("/{wf_id}/steps")
async def list_steps(
    wf_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(
        select(WorkflowStep).where(WorkflowStep.workflow_id == wf_id).order_by(WorkflowStep.order_index)
    )
    return [WorkflowStepResponse.model_validate(s) for s in result.scalars().all()]


@router.post("/{wf_id}/steps", status_code=201)
async def add_step(
    wf_id: int,
    data: WorkflowStepCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    step_data = data.model_dump()
    if step_data.get("config"):
        step_data["config"] = json.dumps(step_data["config"])
    if step_data.get("condition"):
        step_data["condition"] = json.dumps(step_data["condition"])

    step = WorkflowStep(workflow_id=wf_id, **step_data)
    db.add(step)
    await db.commit()
    await db.refresh(step)
    return WorkflowStepResponse.model_validate(step)


@router.post("/{wf_id}/run")
async def run_workflow(
    wf_id: int,
    data: WorkflowRunRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(Workflow).where(Workflow.id == wf_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(404, "Workflow not found")
    wf.last_run_at = datetime.now(timezone.utc)
    wf.success_count += 1
    await db.commit()
    return {"status": "executed", "workflow": wf.name, "run_at": wf.last_run_at}
