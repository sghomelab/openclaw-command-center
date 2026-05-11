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
| 1.1 | **Agent Status Dashboard (Live)** | ✅ Complete | Real status from Gateway sessions, action buttons (steer/kill/message) |
| 1.2 | **System Health Monitor** | ✅ Complete (v4.5.0) | Grafana-like dashboard: disk/memory/CPU gauges, load averages, uptime, auto-refresh, health status indicators |
| 1.3 | **Cron Job Manager (Visual)** | ✅ Complete | Frontend page with all jobs, last/next run, enable/disable toggle, health badges, run history per job |

### Tier 2 — Core Value

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 2.1 | **Task Kanban Board** | ✅ Complete | 7-column board (Planning → Inbox → Assigned → In Progress → Testing → Review → Done), drag-and-drop, agent assignment |
| 2.2 | **Real-Time Event Feed** | ✅ Complete | Event feed page with timestamped, color-coded events by severity, filter/search |
| 2.3 | **LLM Cost & Token Analytics** | ✅ Complete | Cost tracking charts, per-model breakdown, daily/weekly trends |
| 2.4 | **Backup Management** | ✅ Complete (v4.5.0) | Backup status page, `/v3/backups/status` endpoint, status log viewer |

### Tier 3 — Advanced (Future)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 3.1 | Approval Workflow Panel | 📋 Planned | Queue of actions awaiting human approval, audit trail |
| 3.2 | Discord Integration View | 📋 Planned | Recent messages per channel, agent-to-agent communication log |
| 3.3 | Configuration Governance | ✅ Complete (Phases 1-3) | [Detailed plan](docs/CONFIG-GOVERNANCE-PLAN.md) — diff/rollback, schema validation, audit trail |
| 3.4 | Memory Explorer Upgrade | 📋 Planned | Fact count visualization, extraction success rates, cross-corpus search |

**3.3 Configuration Governance** — implementation plan created at `docs/CONFIG-GOVERNANCE-PLAN.md` (2026-05-11)
- 4 phases, ~1,000 lines, 6-10 hours estimated
- Phase 1: Config history & backup
- Phase 2: Schema validation
- Phase 3: Audit trail
- Phase 4: Multi-agent config view

---

## Architecture

```
Frontend (React + Vite)          Backend (FastAPI)
├── pages/                       ├── api/routes/
│   ├── Agents.jsx               │   ├── agents.py    ← OpenClaw config + Gateway
│   ├── Dashboard.jsx            │   ├── analytics.py ← Mock → real data
│   ├── GatewayHealth.jsx        │   ├── gateway.py   ← /healthz, /readyz
│   ├── Tasks.jsx                │   ├── costs.py     ← QMD DB query
│   ├── Crons.jsx                │   ├── crons.py     ← Gateway cron API
│   ├── Events.jsx               │   ├── knowledge.py ← QMD facts
│   ├── CostAnalytics.jsx        │   └── health.py    ← system health
│   ├── Monitoring.jsx (v4.5.0)  │   ├── monitoring.py ← system + OC metrics
│   ├── Backups.jsx (v4.5.0)     │   ├── backups.py   ← backup status
│   └── Disk.jsx                 │   └── disk.py      ← disk usage
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

### Completed Files (Batch 1)
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

- **2026-05-10 06:45 UTC** — **DEPLOYED & TESTED** ✅
  - Frontend rebuilt (Vite, 360ms build, 731KB bundle)
  - Backend restarted on port 9000, frontend on port 5713
  - Fixed `/v3` prefix on agents, crons, costs routers
  - All endpoints verified: health ✅, system health ✅, agents ✅, crons ✅, costs ✅
  - Committed: `34b9758 fix: add /v3 prefix to agents, crons, costs routers`
  - **Note:** Cron list shows 0 jobs — Gateway doesn't expose cron REST API yet (upstream limitation)
  - Portal accessible at `http://localhost:5713`

### Portal Status
| Component | Status | Port |
|-----------|--------|------|
| Backend API | ✅ Running | 9000 |
| Frontend SPA | ✅ Running | 5713 |
| Disk Usage | ⚠️ 90% (alert at 85%) | — |
| Memory | ✅ 14.5% used | — |
| CPU | ✅ 0.3% | — |
| Agents | ✅ 7 configured | — |

- **2026-05-11 03:24 UTC** — **v4.3.0: Sidebar restructure** ✅
  - Full sidebar reorganization into 7 collapsible parent groups:
    - Dashboard, Operations, Intelligence, Orchestration, Infrastructure, Configuration, Observability
  - Auto-expand groups when navigating to child pages
  - Committed: `272b93f feat(v4.3.0): full sidebar restructure — 6 collapsible groups for ease of use`
  - Pushed to `origin/master` ✅

- **2026-05-11 03:24 UTC** — **v4.5.0: Grafana-like monitoring dashboard** ✅
  - New `Monitoring.jsx` (319 lines) — full Grafana-style dashboard with:
    - SVG gauge charts for disk and memory usage
    - System metrics: disk, memory, CPU, load averages (1m/5m/15m), uptime
    - OpenClaw metrics: sessions count, cron stats, backup info
    - Auto-refresh every 30 seconds
    - Health status indicators (Healthy/Warning/Critical) with color-coded alerts
    - Recharts visualizations (PieChart, BarChart, AreaChart, LineChart)
  - New `monitoring.py` backend routes (196 lines):
    - `GET /v3/monitoring/system` — disk, memory, CPU, load, uptime
    - `GET /v3/monitoring/openclaw` — sessions, crons, backups
    - `GET /v3/monitoring/summary` — combined metrics
    - `GET /v3/monitoring/history` — placeholder for Prometheus integration
  - New `Backups.jsx` page (123 lines) + `backups.py` backend routes (68 lines)
  - `GET /v3/backups/status` — backup status endpoint
  - Sidebar updated: Monitoring + Backups under Infrastructure group
  - Committed: `fbc5245 feat(v4.5.0): Grafana-like monitoring dashboard integrated into Mission Control`
  - Pushed to `origin/master` ✅

- **2026-05-11 03:31 UTC** — **v4.7.0: Fix Monitoring blank page** ✅
  - Fixed `formatBytes()` crash on string disk values ("1.9T", "117G") from `df` output
  - Monitoring page now renders correctly with proper byte formatting
  - Added 7 new smoke test cases in `test-portal.sh`:
    - Monitoring system/openclaw/summary endpoint checks (HTTP 200)
    - System metrics data shape validation (disk, memory, cpu, load, uptime)
    - OpenClaw metrics data shape validation (sessions, crons, backups)
    - Backup status endpoint check
  - Total: 29 smoke tests, 0 failures
  - Committed: `f0ad4db fix(v4.7.0): fix Monitoring.jsx blank page — formatBytes() handles string disk values; add 7 test cases`
  - Pushed to `origin/master` ✅

- **2026-05-11 11:31 UTC** — **v5.2.0: Config Audit Trail (Phase 3)** ✅
  - Config audit service with deep diff engine:
    - Tracks added/removed/modified paths with before/after values
    - Records every config change with timestamp, user, reason
    - Truncates large values (max 500 chars) for storage
  - Audit API endpoints:
    - `GET /v3/config/audit` — filtered audit log (user/action/days)
    - `GET /v3/config/audit/stats` — statistics by action/user/day
  - Auto-audit on config patches:
    - Records path, value, diff summary, total changes
    - Integrated into patch_config and patch_full_config endpoints
  - Audit on config restores:
    - Records snapshot ID, timestamp, user, reason
  - ConfigAudit.jsx upgraded:
    - Uses config-specific audit endpoint instead of general audit
    - Stats cards with live data from audit stats endpoint
    - Search/filter by user, action, date range
    - CSV export capability
  - Committed: `4c17d6c feat(v5.2.0)`
  - Pushed to `origin/master` ✅

### Completed Files (Phase 3 — v5.2.0)
| File | Lines Changed | Feature |
|------|---------------|---------|
| `backend/app/services/config_audit.py` | +110 | Deep diff engine, audit recording |
| `backend/app/api/routes/config_history.py` | +80 | Audit API endpoints |
| `backend/app/api/routes/config.py` | +30 | Auto-audit on patches/restores |
| `frontend/src/pages/ConfigAudit.jsx` | +40 | Upgraded to config-specific audit |

- **2026-05-11 09:58 UTC** — **v5.1.0: Schema Validation (Phase 2)** ✅
  - Config validator service with 15+ validation rules:
    - Type checking (string, int, bool, dict, list)
    - Allowed value lists (gateway.auth.mode, gateway.mode, etc.)
    - Range checks (min/max for ports, tokens, shares)
    - Pattern matching (heartbeat interval regex)
    - Empty credential detection
    - String length limits
  - Validation API endpoints:
    - `POST /v3/config/validate` — validate single path/value
    - `POST /v3/config/validate/diff` — validate proposed changes vs current
    - `POST /v3/config/validate/full` — validate entire config dict
    - `GET /v3/config/validation-rules` — expose rules to frontend
  - ConfigEditor.jsx upgraded:
    - Real-time debounced validation (300ms delay)
    - Inline error tooltips on invalid fields
    - Color-coded input borders (red=error, amber=modified)
    - Save button disabled when validation errors exist
    - Pre-save validation blocks invalid changes
    - Validation status indicators (check/x/spinner icons)
  - Committed: `544e3a0 feat(v5.1.0)`
  - Pushed to `origin/master` ✅

### Completed Files (Phase 2 — v5.1.0)
| File | Lines Changed | Feature |
|------|---------------|---------|
| `backend/app/services/config_validator.py` | +230 | Schema validation engine with 15+ rules |
| `backend/app/api/routes/config.py` | +80 | Validation endpoints, rule exposure |
| `frontend/src/pages/ConfigEditor.jsx` | +140 | Real-time validation UI, debounced checks |

- **2026-05-11 09:54 UTC** — **v5.0.0: Config History & Backup (Phase 1)** ✅
  - ConfigSnapshot model — tracks every config change with rollback capability
  - Config history API:
    - `GET /v3/config/history` — list snapshots (filtered by user/days)
    - `GET /v3/config/history/{id}` — retrieve snapshot
    - `GET /v3/config/history/{id1}/diff/{id2}` — JSON diff between snapshots
    - `GET /v3/config/history/stats` — history statistics
    - `POST /v3/config/restore/{id}` — rollback to snapshot
    - `POST /v3/config/snapshot` — manual snapshot creation
  - Auto-backup before config patches (config.py enhanced)
  - Frontend pages:
    - `ConfigHistory.jsx` (340 lines) — timeline view, snapshot viewer, diff modal, rollback
    - `ConfigAudit.jsx` (270 lines) — audit log table, CSV export, filters
  - Sidebar updated: Config History + Config Audit under Configuration
  - Routes registered in App.jsx
  - Committed: `4ac1ad2 feat(v5.0.0)`, `72ec8de fix(v5.0.1)`
  - Pushed to `origin/master` ✅

### Completed Files (Phase 1 — v5.0.0)
| File | Lines Changed | Feature |
|------|---------------|---------|
| `backend/app/models/config_history.py` | +45 | ConfigSnapshot SQLAlchemy model |
| `backend/app/api/routes/config_history.py` | +281 | History/rollback/diff endpoints |
| `backend/app/api/routes/config.py` | +162 | Auto-backup before patches, manual snapshot |
| `frontend/src/pages/ConfigHistory.jsx` | +340 | History timeline, snapshot viewer, diff modal |
| `frontend/src/pages/ConfigAudit.jsx` | +270 | Audit log table, CSV export, filters |
| `frontend/src/App.jsx` | +4 | Route registrations |
| `frontend/src/components/Sidebar.jsx` | +4 | Config History + Audit nav links |

- **2026-05-11 03:35 UTC** — **v4.8.0: Test plan update** ✅
  - Updated `test-portal.sh` with monitoring + backup test cases
  - Updated CHANGELOG.md with v4.7.0 fix entry
  - Committed: `ee633c1 docs(v4.8.0): update test plan with monitoring + backup test cases (23→29 tests)`
  - Pushed to `origin/master` ✅

### Completed Files (Batch 2 — v4.5.0–v4.8.0)
| File | Lines Changed | Feature |
|------|---------------|---------|
| `backend/app/api/routes/monitoring.py` | +196 | System + OpenClaw monitoring metrics |
| `backend/app/api/routes/backups.py` | +68 | Backup status endpoint |
| `frontend/src/pages/Monitoring.jsx` | +319 | Grafana-like monitoring dashboard |
| `frontend/src/pages/Backups.jsx` | +123 | Backup status page |
| `backend/app/main.py` | +4 | Route registrations (monitoring, backups) |
| `frontend/src/App.jsx` | +4 | Route registrations (monitoring, backups) |
| `frontend/src/components/Sidebar.jsx` | +5 | Monitoring + Backups nav links under Infrastructure |
| `test-portal.sh` | +47 | Monitoring + backup smoke tests |

### Backend Route Inventory
| Route File | Endpoint Prefix | Status |
|------------|-----------------|--------|
| `agents.py` | `/v3/agents/*` | ✅ Live |
| `alerts.py` | `/v3/alerts/*` | ✅ Live |
| `analytics.py` | `/v3/analytics/*` | ⚠️ Mock data |
| `audit.py` | `/v3/audit/*` | ✅ Live |
| `auth.py` | `/v3/auth/*` | ✅ Live |
| `backups.py` | `/v3/backups/*` | ✅ Live (v4.5.0) |
| `calendar.py` | `/v3/calendar/*` | ✅ Live |
| `config.py` | `/v3/config/*` | ✅ Live |
| `costs.py` | `/v3/costs/*` | ✅ Live |
| `crons.py` | `/v3/crons/*` | ✅ Live |
| `disk.py` | `/v3/disk/*` | ✅ Live |
| `events.py` | `/v3/events/*` | ✅ Live |
| `gateway.py` | `/v3/gateway/*` | ✅ Live |
| `health.py` | `/v3/health/*` | ✅ Live |
| `integrations.py` | `/v3/integrations/*` | ✅ Live |
| `knowledge.py` | `/v3/knowledge/*` | ✅ Live |
| `memory.py` | `/v3/memory/*` | ✅ Live |
| `monitoring.py` | `/v3/monitoring/*` | ✅ Live (v4.5.0) |
| `opdata.py` | `/v3/opdata/*` | ✅ Live |
| `sessions.py` | `/v3/sessions/*` | ✅ Live |
| `skills.py` | `/v3/skills/*` | ✅ Live |
| `users.py` | `/v3/users/*` | ✅ Live |
| `wiki.py` | `/v3/wiki/*` | ✅ Live |
| `workflows.py` | `/v3/workflows/*` | ✅ Live |

### Current Sidebar Structure
```
Dashboard
Operations
  ├── Tasks
  ├── Projects
  ├── Workflows
  └── Calendar
Intelligence
  ├── Knowledge Base
  ├── LLM Wiki
  └── Memory
Orchestration
  ├── Agents
  ├── Sessions
  └── Conversations
Infrastructure
  ├── Gateway Health
  ├── Disk Usage
  ├── Cron (Cron Jobs / Cron Editor)
  ├── Backups
  └── Monitoring
Configuration
  ├── Config Editor
  ├── Skills
  └── Integrations
Observability
  ├── Alert Rules
  ├── Audit Logs
  └── Cost Analytics
Settings
```

### Current Git Status
- **Branch:** `master`
- **HEAD:** `ee633c1` (v4.8.0 docs update)
- **Remote:** `origin/master` — synced ✅
- **Uncommitted:** `backend/claw_portal.db` (SQLite DB growth — not committed)
- **Repository:** `https://github.com/sghomelab/openclaw-command-center.git`
