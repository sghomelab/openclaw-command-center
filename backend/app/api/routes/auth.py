"""Authentication routes."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.core.security import (
    verify_password, create_access_token, create_refresh_token, decode_token,
)
from app.schemas.user import LoginRequest, RefreshRequest, TokenResponse, UserResponse
from app.api.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/v3/auth", tags=["Authentication"])


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    access = create_access_token({"sub": str(user.id)})
    refresh = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )


@router.post("/refresh")
async def refresh(req: RefreshRequest):
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    access = create_access_token({"sub": payload["sub"]})
    return TokenResponse(
        access_token=access,
        refresh_token=req.refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)
