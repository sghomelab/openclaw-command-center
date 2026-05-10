"""Common schema utilities."""
from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    status_code: int = 500


class HealthResponse(BaseModel):
    status: str
    version: str
    uptime_seconds: Optional[float] = None
