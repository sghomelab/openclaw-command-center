"""Analytics service — compute trends, agent metrics."""
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta
from app.models.opdata import Project, Task, ActivityLog
from app.models.alert import Alert, Incident


async def compute_overview(db: AsyncSession) -> dict:
    """Compute high-level overview stats."""
    return {
        "projects_total": (await db.execute(select(func.count(Project.id)))).scalar() or 0,
        "tasks_total": (await db.execute(select(func.count(Task.id)))).scalar() or 0,
        "tasks_done": (await db.execute(select(func.count(Task.id)).where(Task.status == "done"))).scalar() or 0,
        "tasks_in_progress": (await db.execute(select(func.count(Task.id)).where(Task.status == "progress"))).scalar() or 0,
        "tasks_blocked": (await db.execute(select(func.count(Task.id)).where(Task.status == "blocked"))).scalar() or 0,
        "alerts_total": (await db.execute(select(func.count(Alert.id)))).scalar() or 0,
        "incidents_open": (await db.execute(select(func.count(Incident.id)).where(Incident.status == "open"))).scalar() or 0,
    }


async def compute_trends(db: AsyncSession, days: int = 7) -> dict:
    """Compute task creation trends over N days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    data = []
    for i in range(days):
        day = (since + timedelta(days=i)).date()
        day_start = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
        day_end = datetime.combine(day, datetime.max.time(), tzinfo=timezone.utc)
        count = (await db.execute(
            select(func.count(Task.id)).where(Task.created_at >= day_start, Task.created_at <= day_end)
        )).scalar() or 0
        data.append({"date": str(day), "count": count})
    return {"days": days, "data": data}


async def agent_workload_metrics(db: AsyncSession) -> dict:
    """Per-assignee task distribution."""
    result = await db.execute(
        select(Task.assignee, func.count(Task.id)).group_by(Task.assignee).order_by(func.count(Task.id).desc())
    )
    rows = result.all()
    total = sum(r[1] for r in rows) or 1
    agents = [{"assignee": r[0] or "unassigned", "count": r[1], "pct": round(r[1] / total * 100, 1)} for r in rows]
    return {"agents": agents, "total": total}
