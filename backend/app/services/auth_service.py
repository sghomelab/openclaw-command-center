"""Auth service — user creation, MFA setup."""
from app.core.security import hash_password
from app.models.user import User


def create_admin_user(username: str, email: str, password: str) -> User:
    """Create the default admin user."""
    return User(
        username=username,
        email=email,
        password_hash=hash_password(password),  # Uses new SHA-256 hash
        role="admin",
        is_superuser=True,
        is_active=True,
    )


async def ensure_admin_user(session):
    """Check and create admin user if missing."""
    from sqlalchemy import select as sa_select
    from app.models.user import User as UserModel
    from app.core.security import hash_password as hp
    
    result = await session.execute(sa_select(UserModel).where(UserModel.username == "admin"))
    existing = result.scalar_one_or_none()
    if not existing:
        admin = create_admin_user("admin", "admin@claw.local", "admin123")
        session.add(admin)
        await session.commit()
        return admin
    # Migrate old bcrypt hash to new format
    if existing.password_hash.startswith("$2b$"):
        existing.password_hash = hash_password("admin123")
        await session.commit()
    return existing
