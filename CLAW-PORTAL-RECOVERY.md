# Claw Portal Recovery & Enhancement Plan

**Created:** 2026-05-10  
**Status:** In Progress  
**Owner:** Hajar (Orchestrator) → Umm Habiba (Tech lead)  

---

## Current State

The Claw Portal is a React SPA (frontend) + FastAPI backend (port 9000) with SQLite persistence. It already has:
- Agent discovery from OpenClaw config
- Gateway health probes (liveness/readiness)
- Cost tracking via QMD database
- Cron job management via Gateway API
- Knowledge/Memory explorer (QMD facts)
- Alert, task, project, workflow, integration, audit, calendar, settings pages

**Gaps:** Several pages use mock data, agent status is hardcoded "active", no real-time event feed, no Kanban board, no cron job visual manager, cost charts not connected to live data, no system health gauge.

---

## Enhancement Plan

### Tier 1 — Quick Wins (Foundation)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1.1 | **Agent Status Dashboard (Live)** | ✅ Exists (Agents.jsx) | Needs: real status from Gateway sessions, heartbeat timestamps, last-activity, current-task, action buttons (steer/kill/message) |
| 1.2 | **System Health Monitor** | ✅ Exists (GatewayHealth.jsx) | Needs: disk/memory/CPU gauges from host, alert thresholds, portal backend health (ports 9000/5713), alert history timeline |
| 1.3 | **Cron Job Manager (Visual)** | ⚠️ Backend exists (`/crons`) | Needs: frontend page showing all jobs, last/next run, enable/disable toggle, success/failure badges, run history per job |

### Tier 2 — Core Value

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 2.1 | **Task Kanban Board** | ⚠️ Tasks page exists (basic) | Needs: 7-column board (Planning → Inbox → Assigned → In Progress → Testing → Review → Done), drag-and-drop, assign to agents |
| 2.2 | **Real-Time Event Feed** | ❌ Missing | Needs: WebSocket/SSE feed of agent activities, heartbeat/cron/session/tool events, timestamped, color-coded by severity, filter/search |
| 2.3 | **LLM Cost & Token Analytics** | ⚠️ Backend exists (`/costs`) | Needs: frontend page with per-model cost charts, quota alerts, daily/weekly trends, cost-per-agent breakdown |

### Tier 3 — Advanced (Future)

| # | Feature | Details |
|---|---------|---------|
| 3.1 | Approval Workflow Panel | Queue of actions awaiting human approval, audit trail |
| 3.2 | Discord Integration View | Recent messages per channel, agent-to-agent communication log |
| 3.3 | Configuration Governance | View/edit openclaw.json, config diff/rollback, schema validation |
| 3.4 | Memory Explorer Upgrade | Fact count visualization, extraction success rates, cross-corpus search |

---

## Architecture

```
Frontend (React + Vite)          Backend (FastAPI)
├── pages/                       ├── api/routes/
│   ├── Agents.jsx               │   ├── agents.py    ← OpenClaw config + Gateway
│   ├── Dashboard.jsx            │   ├── analytics.py ← Mock → real data
│   ├── GatewayHealth.jsx        │   ├── gateway.py   ← /healthz, /readyz
│   ├── Tasks.jsx                │   ├── costs.py     ← QMD DB query
│   ├── Crons.jsx (NEW)          │   ├── crons.py     ← Gateway cron API
│   ├── Events.jsx (NEW)         │   ├── knowledge.py ← QMD facts
│   └── CostAnalytics.jsx (NEW)  │   └── health.py    ← system health
├── components/                  └── services/
└── services/api.js              └── auth_service.py
```

---

## Implementation Notes

- **Frontend:** React, Vite, Tailwind CSS, Lucide icons, Recharts for charts, hash-based routing
- **Backend:** FastAPI, SQLAlchemy (SQLite), httpx for Gateway calls, CORS enabled
- **API Base:** `/v3/` prefix on all routes
- **Auth:** JWT-based, default admin user on startup
- **Gateway:** WebSocket on port 18789, HTTP REST also available

---

## Progress Log

- **2026-05-10 05:16 UTC** — Plan created. Beginning Tier 1 & 2 implementation.
- **2026-05-10 06:27 UTC** — **Tier 1 & 2 COMPLETE** ✅
  - Two parallel OpenCode workers built all 7 enhancements
  - 1,400+ lines of code added across 12 files
  - Committed: `42d7870 tier2: kanban board, event feed, cost analytics`
  - All routes registered in App.jsx, sidebar updated with new nav links
  - Next: rebuild frontend, restart backend, test endpoints

### Completed Files
| File | Lines Changed | Feature |
|------|---------------|---------|
| `backend/app/api/routes/health.py` | +106 | System health endpoint (disk/CPU/memory) |
| `backend/app/api/routes/agents.py` | +84 | Live agent status from Gateway |
| `frontend/src/pages/Agents.jsx` | +180 | Enhanced agent dashboard with actions |
| `frontend/src/pages/GatewayHealth.jsx` | +207 | System metrics gauges + alert history |
| `frontend/src/pages/Crons.jsx` | +139 | Cron job manager (new page) |
| `frontend/src/pages/Tasks.jsx` | +371 | Kanban board rewrite |
| `frontend/src/pages/Events.jsx` | +195 | Real-time event feed (new page) |
| `frontend/src/pages/CostAnalytics.jsx` | +251 | Cost tracking charts (new page) |
| `frontend/src/App.jsx` | +10 | Route registrations |
| `frontend/src/components/Sidebar.jsx` | +6 | New nav links |

- [Ongoing — updates will be appended here]
