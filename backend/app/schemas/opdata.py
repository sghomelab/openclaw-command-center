"""Operational data schemas — projects, tasks, activity."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = Field(default="active")
    metadata: Optional[dict] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    metadata: Optional[dict] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = Field(default="medium")
    project_id: Optional[int] = None
    assignee: Optional[str] = None
    metadata: Optional[dict] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    project_id: Optional[int] = None
    assignee: Optional[str] = None
    metadata: Optional[dict] = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    project_id: Optional[int]
    assignee: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityLogResponse(BaseModel):
    id: int
    source: str
    event_type: str
    actor: Optional[str]
    target: Optional[str]
    details: Optional[str]
    timestamp: datetime

    model_config = {"from_attributes": True}
