"""Cost tracking routes — reads from OpenClaw QMD session data."""
import os
import sqlite3
from datetime import datetime, timedelta
from fastapi import APIRouter

router = APIRouter(prefix="/v3", tags=["Costs"])

QMD_DIR = "/home/node/.openclaw/qmd"
# QMD stores session data — we'll query the sessions table


def _get_qmd_db_path() -> str | None:
    """Find the QMD SQLite database."""
    for fname in ["sessions.db", "qmd.db", "data.db"]:
        path = os.path.join(QMD_DIR, fname)
        if os.path.exists(path):
            return path
    # Try lib subdirectory
    lib_dir = os.path.join(QMD_DIR, "lib")
    if os.path.isdir(lib_dir):
        for fname in ["sessions.db", "qmd.db", "data.db"]:
            path = os.path.join(lib_dir, fname)
            if os.path.exists(path):
                return path
    return None


def _query_cost_data(days: int = 7) -> dict:
    """Query cost/session data from QMD database."""
    db_path = _get_qmd_db_path()
    if not db_path:
        return {
            "today_cost": 0,
            "all_time_cost": 0,
            "projected_monthly": 0,
            "by_model": [],
            "daily_trend": [],
        }

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # List tables
        tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        table_names = [t[0] for t in tables]

        today = datetime.utcnow().date()
        since = today - timedelta(days=days)

        # Try to find session-related tables
        session_tables = [t for t in table_names if "session" in t.lower()]

        today_cost = 0
        all_time_cost = 0
        by_model = {}
        daily_data = {}

        if session_tables:
            for tbl in session_tables:
                cols = [c[1] for c in cur.execute(f"PRAGMA table_info({tbl})").fetchall()]
                col_lower = {c.lower(): c for c in cols}

                # Try to sum costs
                cost_col = col_lower.get("cost") or col_lower.get("total_cost") or col_lower.get("cost_usd")
                model_col = col_lower.get("model") or col_lower.get("model_id") or col_lower.get("model_name")
                time_col = col_lower.get("created_at") or col_lower.get("updated_at") or col_lower.get("started_at") or col_lower.get("timestamp")

                if cost_col:
                    # Today's cost
                    if time_col:
                        today_rows = cur.execute(
                            f"SELECT {cost_col} FROM {tbl} WHERE date({time_col}) = date(?) ORDER BY {time_col} DESC",
                            (today.isoformat(),),
                        ).fetchall()
                        today_cost += sum(float(r[0]) for r in today_rows if r[0])

                    # All-time cost
                    all_rows = cur.execute(f"SELECT {cost_col} FROM {tbl}").fetchall()
                    all_time_cost += sum(float(r[0]) for r in all_rows if r[0])

                    # By model
                    if model_col:
                        model_rows = cur.execute(
                            f"SELECT {model_col}, SUM({cost_col}) FROM {tbl} GROUP BY {model_col}",
                        ).fetchall()
                        for row in model_rows:
                            model_name = row[0] or "unknown"
                            by_model[model_name] = by_model.get(model_name, 0) + float(row[1])

                    # Daily trend
                    if time_col:
                        daily_rows = cur.execute(
                            f"SELECT date({time_col}) as d, SUM({cost_col}) as c FROM {tbl} WHERE {time_col} >= ? GROUP BY d ORDER BY d",
                            (since.isoformat(),),
                        ).fetchall()
                        for row in daily_rows:
                            daily_data[row[0]] = daily_data.get(row[0], 0) + float(row[1])

        conn.close()

        # Build daily trend array (fill missing days)
        daily_trend = []
        for i in range(days, 0, -1):
            d = (today - timedelta(days=i)).isoformat()
            daily_trend.append({"date": d, "cost": daily_data.get(d, 0)})

        projected_monthly = (today_cost / max(days, 1)) * 30

        return {
            "today_cost": round(today_cost, 4),
            "all_time_cost": round(all_time_cost, 4),
            "projected_monthly": round(projected_monthly, 4),
            "by_model": [{"model": k, "cost": round(v, 4)} for k, v in sorted(by_model.items(), key=lambda x: -x[1])],
            "daily_trend": daily_trend,
        }
    except Exception as e:
        # Return zeros on error — QMD schema may differ
        return {
            "today_cost": 0,
            "all_time_cost": 0,
            "projected_monthly": 0,
            "by_model": [],
            "daily_trend": [],
            "error": str(e),
        }


@router.get("/costs")
async def get_costs(days: int = 7):
    """Get cost breakdown and trends."""
    return _query_cost_data(days=days)
