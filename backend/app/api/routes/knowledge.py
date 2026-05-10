"""Knowledge graph routes — memnon.db stats, search, entities, sources, timeline."""
import os
import sqlite3
from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_current_user

router = APIRouter(prefix="/v3/data/knowledge", tags=["Knowledge Graph"])


def _get_conn():
    import pathlib
    backend_dir = pathlib.Path(__file__).resolve().parents[3]  # backend/
    memnon_path = backend_dir / "memnon" / "memnon.db"
    if not memnon_path.exists():
        return None
    conn = sqlite3.connect(str(memnon_path))
    conn.row_factory = sqlite3.Row
    return conn


@router.get("/stats")
async def knowledge_stats(_user=Depends(get_current_user)):
    conn = _get_conn()
    if not conn:
        return {"status": "offline", "note": "memnon.db not found"}
    try:
        c = conn.cursor()
        total = c.execute("SELECT COUNT(*) FROM facts").fetchone()[0]
        sources = c.execute("SELECT COUNT(DISTINCT source_file) FROM facts").fetchone()[0]
        entities = c.execute("SELECT COUNT(DISTINCT entity_id) FROM facts").fetchone()[0]
        avg_conf = c.execute("SELECT COALESCE(AVG(confidence), 0) FROM facts").fetchone()[0]
        first = c.execute("SELECT MIN(extracted_at) FROM facts").fetchone()[0]
        last = c.execute("SELECT MAX(extracted_at) FROM facts").fetchone()[0]
        return {
            "total_facts": total,
            "source_files": sources,
            "unique_entities": entities,
            "avg_confidence": f"{avg_conf:.1%}" if avg_conf else "0%",
            "first_extracted": first or "—",
            "last_extracted": last or "—",
        }
    finally:
        conn.close()


@router.get("/search")
async def knowledge_search(
    query: str = Query("", description="Full-text search in fact_text"),
    entity: str = Query(None, description="Filter by entity_id"),
    source: str = Query(None, description="Filter by source_file"),
    limit: int = Query(50, ge=1, le=200),
    _user=Depends(get_current_user),
):
    conn = _get_conn()
    if not conn:
        return {"query": query, "count": 0, "results": []}
    try:
        c = conn.cursor()
        conditions = []
        params = []
        if query:
            conditions.append("fact_text LIKE ?")
            params.append(f"%{query}%")
        if entity:
            conditions.append("entity_id LIKE ?")
            params.append(f"%{entity}%")
        if source:
            conditions.append("source_file LIKE ?")
            params.append(f"%{source}%")
        where = " AND ".join(conditions) if conditions else "1=1"
        count = c.execute(f"SELECT COUNT(*) FROM facts WHERE {where}", params).fetchone()[0]
        rows = c.execute(
            f"SELECT id, entity_id, fact_text, confidence, source_file, extracted_at FROM facts WHERE {where} ORDER BY confidence DESC LIMIT ?",
            params + [limit],
        ).fetchall()
        results = []
        for r in rows:
            results.append({
                "id": r["id"],
                "entity": r["entity_id"],
                "fact": r["fact_text"],
                "confidence": r["confidence"],
                "source": r["source_file"],
                "extracted_at": r["extracted_at"],
            })
        return {"query": query, "count": count, "results": results}
    finally:
        conn.close()


@router.get("/entities")
async def knowledge_entities(_user=Depends(get_current_user)):
    conn = _get_conn()
    if not conn:
        return []
    try:
        c = conn.cursor()
        rows = c.execute("SELECT entity_id, COUNT(*) as fact_count FROM facts GROUP BY entity_id ORDER BY fact_count DESC").fetchall()
        return [{"entity": r["entity_id"], "fact_count": r["fact_count"]} for r in rows]
    finally:
        conn.close()


@router.get("/sources")
async def knowledge_sources(_user=Depends(get_current_user)):
    conn = _get_conn()
    if not conn:
        return []
    try:
        c = conn.cursor()
        rows = c.execute(
            "SELECT source_file, COUNT(*) as facts, MIN(extracted_at) as first_extracted, MAX(extracted_at) as last_extracted FROM facts GROUP BY source_file ORDER BY facts DESC"
        ).fetchall()
        return [
            {
                "source": r["source_file"],
                "facts": r["facts"],
                "first_extracted": r["first_extracted"],
                "last_extracted": r["last_extracted"],
            }
            for r in rows
        ]
    finally:
        conn.close()


@router.get("/timeline")
async def knowledge_timeline(_user=Depends(get_current_user)):
    conn = _get_conn()
    if not conn:
        return []
    try:
        c = conn.cursor()
        rows = c.execute(
            "SELECT DATE(extracted_at) as date, COUNT(*) as facts FROM facts GROUP BY DATE(extracted_at) ORDER BY date"
        ).fetchall()
        return [{"date": r["date"], "facts": r["facts"]} for r in rows]
    finally:
        conn.close()
