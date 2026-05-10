"""Workflow schemas."""
from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel, Field


class WorkflowStepCreate(BaseModel):
    order_index: int
    action: str
    config: Optional[dict] = None
    condition: Optional[dict] = None
    on_success_next: Optional[int] = None
    on_failure_next: Optional[int] = None


class WorkflowStepResponse(BaseModel):
    id: int
    workflow_id: int
    order_index: int
    action: str
    is_active: bool

    model_config = {"from_attributes": True}


class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: str = Field(default="manual")
    trigger_config: Optional[dict] = None
    steps: Optional[List[WorkflowStepCreate]] = None


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[dict] = None


class WorkflowResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    trigger_type: str
    steps_count: int
    last_run_at: Optional[datetime]
    success_count: int
    failure_count: int

    model_config = {"from_attributes": True}


class WorkflowRunRequest(BaseModel):
    input_data: Optional[dict] = None
