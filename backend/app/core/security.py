"""Authentication, password hashing, JWT tokens."""

from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
from typing import Optional

from joserfc import jwt
from joserfc.jwk import OctKey

from app.config import settings

ALGORITHM = "HS256"


def _to_oct_key(secret: str) -> OctKey:
    raw = secret.encode("utf-8")
    b64 = base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")
    return OctKey.import_key({"kty": "oct", "k": b64})


def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt."""
    import hashlib
    import secrets

    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${hashed}"


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a password against a hash."""
    import hashlib
    import secrets

    try:
        salt, hash_value = hashed.split("$", 1)
        new_hash = hashlib.sha256((plain + salt).encode()).hexdigest()
        return secrets.compare_digest(new_hash, hash_value)
    except Exception:
        return False


def _encode(data: dict) -> str:
    return jwt.encode(
        {"alg": ALGORITHM, "typ": "JWT"},
        data,
        _to_oct_key(settings.SECRET_KEY),
    )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return _encode(to_encode)


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return _encode(to_encode)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token. Returns payload or None."""
    try:
        t = jwt.decode(token, _to_oct_key(settings.SECRET_KEY))
        payload = t.claims
        # Validate exp
        now = datetime.now(timezone.utc).timestamp()
        exp = payload.get("exp")
        if exp is not None and now > exp:
            return None
        return payload
    except Exception:
        return None


def generate_api_key() -> str:
    """Generate a random API key string."""
    import secrets

    return f"claw_{secrets.token_urlsafe(32)}"
