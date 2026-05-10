"""Auth dependencies — current user, superuser, API key verification."""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import decode_token
from app.models.user import User, APIKey
from app.core.security import verify_password
import json

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v3/auth/login")


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    # Try Bearer token first
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


async def get_current_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser access required")
    return current_user


async def verify_api_key(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("ApiKey "):
        raise HTTPException(status_code=401, detail="Invalid API key format")

    raw_key = auth_header[7:]
    prefix = raw_key[:16]

    result = await db.execute(
        select(APIKey).where(APIKey.key_prefix == prefix, APIKey.is_active == True)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=401, detail="API key not found")

    if not verify_password(raw_key, key.key_hash):
        raise HTTPException(status_code=401, detail="Invalid API key")

    result = await db.execute(select(User).where(User.id == key.user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user
