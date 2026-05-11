"""Claw Portal — Mission Control API v3

FastAPI application with:
- JWT authentication
- Multi-tenant support
- Alerting & incident management
- Operational data (projects, tasks, activity)
- Analytics & NLP query interface
- Audit logging
- External integrations
- Workflow orchestration
"""
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.config import settings
from app.database import engine, init_db, Base
from app.models.user import User
from app.models.tenant import Tenant
from app.core.security import hash_password
from app.services.auth_service import create_admin_user

# Import all models so SQLAlchemy knows about them
import app.models.alert
import app.models.audit
import app.models.integration
import app.models.workflow
import app.models.opdata

# Import routes
from app.api.routes import (
    auth,
    users,
    alerts,
    integrations,
    workflows,
    opdata,
    audit,
    analytics,
    health,
    knowledge,
    calendar,
    gateway,
    agents,
    costs,
    crons,
    sessions,
    skills,
    config,
    disk,
    memory,
    events,
    wiki,
    backups,
    monitoring,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    from app.database import async_session_factory
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        from sqlalchemy import select as sa_select
        from app.models.user import User as UserModel
        from app.models.tenant import Tenant as TenantModel

        # Create default tenant
        result = await session.execute(sa_select(TenantModel).where(TenantModel.slug == "claw-local"))
        tenant = result.scalar_one_or_none()
        if not tenant:
            tenant = TenantModel(
                name="Claw Local",
                slug="claw-local",
                subscription_level="enterprise",
                is_active=True,
                max_users=100,
                max_integrations=50,
            )
            session.add(tenant)
            await session.commit()
            await session.refresh(tenant)

        # Create default admin user (with migration if needed)
        from app.services.auth_service import ensure_admin_user
        user = await ensure_admin_user(session)
        if user and not user.tenant_id:
            user.tenant_id = tenant.id
            await session.commit()

    yield

    # Shutdown
    await engine.dispose()


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Claw Portal — Mission Control API v3. Multi-agent orchestration dashboard with alerting, analytics, and integrations.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audit logging middleware — records all API requests
from starlette.middleware.base import BaseHTTPMiddleware
import json


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        import sqlite3
        from datetime import datetime, timezone
        import pathlib

        response = await call_next(request)

        # Skip non-API requests and health checks
        path = request.url.path
        if not path.startswith("/v3/"):
            return response
        if path in ("/v3/health", "/docs", "/redoc", "/openapi.json", "/favicon.ico", "/v3/audit/logs"):
            return response

        # Only log authenticated requests (skip 401) and successful ones
        if response.status_code == 401:
            return response

        # Extract user from token if present
        user_id = None
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from app.core.security import decode_token
                payload = decode_token(auth_header[7:])
                if payload and payload.get("sub"):
                    user_id = int(payload["sub"])
            except Exception:
                pass

        # Determine resource type from path
        parts = path.strip("/").split("/")
        resource_type = parts[2] if len(parts) > 2 else "unknown"
        resource_id = parts[3] if len(parts) > 3 else None

        # Log synchronously via sqlite3 (fast, no async overhead)
        try:
            backend_dir = pathlib.Path(__file__).resolve().parent.parent  # app/ → backend/
            db_path = backend_dir / "claw_portal.db"
            if db_path.exists():
                conn = sqlite3.connect(str(db_path))
                conn.execute(
                    "INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        user_id,
                        f"{request.method.upper()} {path}",
                        resource_type,
                        resource_id,
                        request.client.host if request.client else None,
                        request.headers.get("user-agent"),
                        json.dumps({"status_code": response.status_code, "method": request.method}),
                        datetime.now(timezone.utc).isoformat(),
                    ),
                )
                conn.commit()
                conn.close()
        except Exception:
            pass  # Never break the request

        return response


app.add_middleware(AuditMiddleware)

# Include routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(alerts.router)
app.include_router(integrations.router)
app.include_router(workflows.router)
app.include_router(opdata.router)
app.include_router(opdata.router_legacy)
app.include_router(audit.router)
app.include_router(analytics.router)
app.include_router(knowledge.router)
app.include_router(calendar.router)
app.include_router(gateway.router)
app.include_router(agents.router)
app.include_router(costs.router)
app.include_router(crons.router)
app.include_router(sessions.router)
app.include_router(skills.router)
app.include_router(config.router)
app.include_router(disk.router)
app.include_router(memory.router)
app.include_router(events.router)
app.include_router(wiki.router)
app.include_router(backups.router)
app.include_router(monitoring.router)


# Root endpoint
@app.get("/")
async def root():
    return {
        "name": "Claw Portal",
        "version": settings.APP_VERSION,
        "status": "operational",
        "docs": "/docs",
        "api_base": "/v3",
        "endpoints": {
            "auth": "/v3/auth/login",
            "users": "/v3/users",
            "alerts": "/v3/alerts",
            "integrations": "/v3/integrations",
            "workflows": "/v3/workflows",
            "data": "/v3/data",
            "audit": "/v3/audit/logs",
            "analytics": "/v3/analytics/overview",
            "health": "/v3/health",
        },
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error", "detail": str(exc) if settings.DEBUG else None},
    )
