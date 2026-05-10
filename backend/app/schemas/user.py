"""User, auth, and API key schemas."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    email: str = Field(..., pattern=r".+@.+\..+")
    password: str = Field(..., min_length=8)
    role: str = Field(default="user")


class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    mfa_enabled: Optional[bool] = None
    preferences: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    mfa_enabled: bool
    tenant_id: Optional[int]
    last_login: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    username: str
    password: str
    mfa_code: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class APIKeyCreate(BaseModel):
    name: str
    permissions: List[str] = Field(default=["read"])
    rate_limit: int = Field(default=1000)
    expires_days: Optional[int] = None


class APIKeyResponse(BaseModel):
    id: int
    name: str
    key_prefix: str
    permissions: str
    rate_limit: int
    is_active: bool
    last_used_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class RefreshRequest(BaseModel):
    refresh_token: str
