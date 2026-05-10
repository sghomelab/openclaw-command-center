"""Alert, alert rule, and incident schemas."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class AlertRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    condition_type: str = Field(default="threshold")
    metric_path: str
    threshold_value: Optional[float] = None
    threshold_operator: Optional[str] = None
    cooldown_seconds: int = Field(default=300)
    channels: List[str] = Field(default=["email"])
    severity: str = Field(default="warning")


class AlertRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    condition_type: Optional[str] = None
    metric_path: Optional[str] = None
    threshold_value: Optional[float] = None
    threshold_operator: Optional[str] = None
    cooldown_seconds: Optional[int] = None
    channels: Optional[List[str]] = None
    severity: Optional[str] = None
    is_active: Optional[bool] = None


class AlertRuleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    condition_type: str
    metric_path: str
    threshold_value: Optional[float]
    severity: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertResponse(BaseModel):
    id: int
    rule_id: int
    metric_value: Optional[float]
    triggered_at: datetime
    acknowledged: bool
    status: str

    model_config = {"from_attributes": True}


class AlertAcknowledge(BaseModel):
    acknowledged_by: Optional[int] = None


class IncidentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = Field(default="P3")
    assignee_id: Optional[int] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[int] = None
    root_cause: Optional[str] = None
    resolution_notes: Optional[str] = None


class IncidentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    created_at: datetime
    resolved_at: Optional[datetime]

    model_config = {"from_attributes": True}
