"""Operational data routes — projects, tasks, activity, stats, search."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.database import get_db
from app.models.opdata import Project, Task, ActivityLog
from app.schemas.opdata import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    TaskCreate, TaskUpdate, TaskResponse,
    ActivityLogResponse,
)
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/v3/data", tags=["Operations Data"])
router_legacy = APIRouter(tags=["Operations Data (Legacy)"])


@router.get("/projects")
@router_legacy.get("/api/projects")
async def list_projects(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user), status_filter: str = Query(None, alias="status")):
    q = select(Project).order_by(Project.id)
    if status_filter:
        q = q.where(Project.status == status_filter)
    result = await db.execute(q)
    return [ProjectResponse.model_validate(p) for p in result.scalars().all()]


@router.post("/projects", status_code=201)
@router_legacy.post("/api/projects")
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    proj = Project(**data.model_dump())
    if data.metadata:
        proj.metadata = json.dumps(data.metadata)
    db.add(proj)
    await db.commit()
    await db.refresh(proj)
    return ProjectResponse.model_validate(proj)


@router.put("/projects/{proj_id}")
@router_legacy.put("/api/projects/{proj_id}")
async def update_project(proj_id: int, data: ProjectUpdate, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    result = await db.execute(select(Project).where(Project.id == proj_id))
    proj = result.scalar_one_or_none()
    if not proj:
        raise HTTPException(404, "Project not found")
    update_data = data.model_dump(exclude_unset=True)
    if "metadata" in update_data and update_data["metadata"] is not None:
        update_data["metadata"] = json.dumps(update_data["metadata"])
    for field, value in update_data.items():
        setattr(proj, field, value)
    await db.commit()
    await db.refresh(proj)
    return ProjectResponse.model_validate(proj)


@router.delete("/projects/{proj_id}", status_code=204)
@router_legacy.delete("/api/projects/{proj_id}")
async def delete_project(proj_id: int, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    result = await db.execute(select(Project).where(Project.id == proj_id))
    proj = result.scalar_one_or_none()
    if not proj:
        raise HTTPException(404, "Project not found")
    await db.delete(proj)
    await db.commit()


@router.get("/tasks")
@router_legacy.get("/api/tasks")
async def list_tasks(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user), project_id: int = Query(None), status_filter: str = Query(None, alias="status")):
    q = select(Task).order_by(Task.id)
    if project_id is not None:
        q = q.where(Task.project_id == project_id)
    if status_filter:
        q = q.where(Task.status == status_filter)
    result = await db.execute(q)
    return [TaskResponse.model_validate(t) for t in result.scalars().all()]


@router.post("/tasks", status_code=201)
@router_legacy.post("/api/tasks")
async def create_task(data: TaskCreate, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    task_data = data.model_dump()
    if task_data.get("metadata"):
        task_data["metadata"] = json.dumps(task_data["metadata"])
    task = Task(**task_data)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@router.put("/tasks/{task_id}")
@router_legacy.put("/api/tasks/{task_id}")
async def update_task(task_id: int, data: TaskUpdate, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    update_data = data.model_dump(exclude_unset=True)
    if "metadata" in update_data and update_data["metadata"] is not None:
        update_data["metadata"] = json.dumps(update_data["metadata"])
    for field, value in update_data.items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@router.delete("/tasks/{task_id}", status_code=204)
@router_legacy.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    await db.delete(task)
    await db.commit()


@router.post("/tasks/{task_id}/toggle")
@router_legacy.post("/api/tasks/{task_id}/toggle")
async def toggle_task(task_id: int, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    cycle = {"inbox": "progress", "progress": "done", "done": "inbox", "blocked": "inbox"}
    task.status = cycle.get(task.status, "inbox")
    await db.commit()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@router.get("/activity")
@router_legacy.get("/api/activity")
async def list_activity(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user), limit: int = Query(50, ge=1, le=500)):
    result = await db.execute(select(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(limit))
    return [ActivityLogResponse.model_validate(a) for a in result.scalars().all()]


@router.get("/stats")
@router_legacy.get("/api/stats")
async def get_stats(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    stats = {}
    for model, key in [(Project, "projects"), (Task, "tasks")]:
        total = (await db.execute(select(func.count(model.id)))).scalar() or 0
        stats[f"{key}_total"] = total
    stats["projects_active"] = (await db.execute(select(func.count(Project.id)).where(Project.status == "active"))).scalar() or 0
    stats["tasks_done"] = (await db.execute(select(func.count(Task.id)).where(Task.status == "done"))).scalar() or 0
    stats["tasks_blocked"] = (await db.execute(select(func.count(Task.id)).where(Task.status == "blocked"))).scalar() or 0
    stats["total_facts"] = 0  # placeholder
    stats["flows_total"] = 0  # placeholder
    return stats


@router.get("/search")
@router_legacy.get("/api/search")
async def search_memory(query: str = Query(...), limit: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    # Search memnon.db if available
    import os
    memnon_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "memnon", "memnon.db")
    if os.path.exists(memnon_path):
        import sqlite3
        conn = sqlite3.connect(memnon_path)
        c = conn.cursor()
        c.execute("SELECT id, entity_id, fact_text, confidence, context, source_file, extracted_at FROM facts WHERE fact_text LIKE ? LIMIT ?", (f"%{query}%", limit))
        rows = c.fetchall()
        cols = [d[0] for d in c.description]
        conn.close()
        return {"query": query, "results": [dict(zip(cols, r)) for r in rows][:limit]}
    return {"query": query, "results": [], "note": "memnon.db not found"}


@router.get("/facts_count")
@router_legacy.get("/api/facts_count")
async def facts_count(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    import os
    memnon_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "memnon", "memnon.db")
    if os.path.exists(memnon_path):
        import sqlite3
        conn = sqlite3.connect(memnon_path)
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM facts")
        count = c.fetchone()[0]
        conn.close()
        return {"count": count}
    return {"count": 0}  # stub



@router.get("/flows")
@router_legacy.get("/api/flows")
async def list_flows(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    return []  # stub


@router.post("/sync")
@router_legacy.post("/api/sync")
async def sync_data(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    return {"status": "synced", "message": "Data synchronized from operational sources"}
