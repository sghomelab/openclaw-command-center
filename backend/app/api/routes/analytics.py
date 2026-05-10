"""Analytics routes — overview, trends, agent workload, NLP query."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models.opdata import Project, Task, ActivityLog
from app.models.alert import Alert, Incident, AlertRule
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/v3/analytics", tags=["Analytics"])


@router.get("/overview")
async def overview(db: AsyncSession = Depends(get_db)):
    """High-level dashboard stats."""
    projects = (await db.execute(select(func.count(Project.id)))).scalar() or 0
    tasks = (await db.execute(select(func.count(Task.id)))).scalar() or 0
    tasks_done = (await db.execute(select(func.count(Task.id)).where(Task.status == "done"))).scalar() or 0
    tasks_in_progress = (await db.execute(select(func.count(Task.id)).where(Task.status == "progress"))).scalar() or 0
    tasks_blocked = (await db.execute(select(func.count(Task.id)).where(Task.status == "blocked"))).scalar() or 0
    alerts = (await db.execute(select(func.count(Alert.id)))).scalar() or 0
    alerts_active = (await db.execute(select(func.count(Alert.id)).where(Alert.status == "triggered"))).scalar() or 0
    incidents = (await db.execute(select(func.count(Incident.id)))).scalar() or 0
    incidents_open = (await db.execute(select(func.count(Incident.id)).where(Incident.status == "open"))).scalar() or 0

    return {
        "projects_total": projects,
        "tasks_total": tasks,
        "tasks_done": tasks_done,
        "tasks_in_progress": tasks_in_progress,
        "tasks_blocked": tasks_blocked,
        "alerts_total": alerts,
        "alerts_active": alerts_active,
        "incidents_total": incidents,
        "incidents_open": incidents_open,
    }


@router.get("/trends")
async def trends(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
    days: int = Query(7, ge=1, le=90),
    metric: str = Query("tasks", regex="^(tasks|projects|alerts|activity)$"),
):
    """Time-series data for charts — last N days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    data = []

    for i in range(days):
        day = (since + timedelta(days=i)).date()
        day_start = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
        day_end = datetime.combine(day, datetime.max.time(), tzinfo=timezone.utc)

        count = 0
        if metric == "tasks":
            count = (await db.execute(
                select(func.count(Task.id)).where(Task.created_at >= day_start, Task.created_at <= day_end)
            )).scalar() or 0
        elif metric == "projects":
            count = (await db.execute(
                select(func.count(Project.id)).where(Project.created_at >= day_start, Project.created_at <= day_end)
            )).scalar() or 0
        elif metric == "alerts":
            count = (await db.execute(
                select(func.count(Alert.id)).where(Alert.triggered_at >= day_start, Alert.triggered_at <= day_end)
            )).scalar() or 0
        elif metric == "activity":
            count = (await db.execute(
                select(func.count(ActivityLog.id)).where(ActivityLog.timestamp >= day_start, ActivityLog.timestamp <= day_end)
            )).scalar() or 0

        data.append({"date": str(day), "count": count})

    return {"metric": metric, "days": days, "data": data}


@router.get("/agent-workload")
async def agent_workload(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    """Per-agent/per-assignee task distribution."""
    result = await db.execute(
        select(Task.assignee, func.count(Task.id)).group_by(Task.assignee).order_by(func.count(Task.id).desc())
    )
    rows = result.all()

    total = sum(r[1] for r in rows) or 1
    agents = []
    for assignee, count in rows:
        agents.append({
            "assignee": assignee or "unassigned",
            "task_count": count,
            "percentage": round(count / total * 100, 1),
        })

    # Also get status breakdown
    status_result = await db.execute(
        select(Task.status, func.count(Task.id)).group_by(Task.status)
    )
    status_breakdown = {r[0]: r[1] for r in status_result.all()}

    return {
        "agents": agents,
        "status_breakdown": status_breakdown,
        "total_tasks": total,
    }


@router.post("/nlp-query")
async def nlp_query(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
    query: str = Query(..., embed=True),
):
    """Natural language query interface — stub."""
    # This is a placeholder. In Phase 3.3, this would integrate with an LLM
    # to translate natural language into SQL/aggregation queries.
    return {
        "query": query,
        "status": "stub",
        "message": "NLP query processing is available in Phase 3.3 (Advanced Analytics & ML). Currently returning raw data endpoints.",
        "suggestions": [
            "Use GET /v3/analytics/overview for dashboard stats",
            "Use GET /v3/analytics/trends?metric=tasks&days=7 for time series",
            "Use GET /v3/analytics/agent-workload for per-agent metrics",
        ],
    }
