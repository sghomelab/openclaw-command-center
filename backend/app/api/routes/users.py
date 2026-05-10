"""User management routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.database import get_db
from app.models.user import User, APIKey
from app.core.security import hash_password, generate_api_key
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse,
    APIKeyCreate, APIKeyResponse,
)
from app.api.dependencies import get_current_user, get_current_superuser

router = APIRouter(prefix="/v3/users", tags=["Users"])


@router.post("/", status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_superuser),
):
    # Check uniqueness
    for col, val in [("username", data.username), ("email", data.email)]:
        result = await db.execute(getattr(select, "select")(User).where(getattr(User, col) == val))
        if result.scalar_one_or_none():
            raise HTTPException(400, f"{col} already exists")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_superuser),
):
    result = await db.execute(select(User).order_by(User.id))
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.get("/{user_id}")
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return UserResponse.model_validate(user)


@router.put("/{user_id}")
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=204)
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_superuser),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = False
    await db.commit()


@router.get("/api-keys")
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(APIKey).where(APIKey.user_id == user.id))
    return [APIKeyResponse.model_validate(k) for k in result.scalars().all()]


@router.post("/api-keys", status_code=201)
async def create_api_key(
    data: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from datetime import timedelta
    raw_key = generate_api_key()
    expires_at = None
    if data.expires_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_days)

    key = APIKey(
        user_id=user.id,
        name=data.name,
        key_hash=hash_password(raw_key),
        key_prefix=raw_key[:16],
        permissions=json.dumps(data.permissions),
        rate_limit=data.rate_limit,
        expires_at=expires_at,
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)

    return {
        "api_key": APIKeyResponse.model_validate(key),
        "raw_key": raw_key,
        "warning": "Store this raw key securely. It will not be shown again.",
    }


@router.delete("/api-keys/{key_id}", status_code=204)
async def revoke_api_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(APIKey).where(APIKey.id == key_id, APIKey.user_id == user.id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(404, "API key not found")
    key.is_active = False
    await db.commit()


# Need datetime for expires_at
from datetime import datetime, timezone
