"""Integration schemas."""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, model_validator
import json


class IntegrationCreate(BaseModel):
    type: str = Field(..., pattern=r"^(github|gitlab|slack|webhook|email|sms)$")
    name: str
    endpoint: Optional[str] = None
    credentials: Optional[dict] = None
    config: Optional[dict] = None
    sync_interval_minutes: int = Field(default=60)


class IntegrationUpdate(BaseModel):
    name: Optional[str] = None
    endpoint: Optional[str] = None
    credentials: Optional[dict] = None
    config: Optional[dict] = None
    is_active: Optional[bool] = None
    sync_interval_minutes: Optional[int] = None


class IntegrationResponse(BaseModel):
    id: int
    type: str
    name: str
    endpoint: Optional[str]
    config: Optional[str] = None
    credentials: Optional[str] = None
    status: str
    last_sync_at: Optional[datetime]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class IntegrationTestRequest(BaseModel):
    dry_run: bool = True
