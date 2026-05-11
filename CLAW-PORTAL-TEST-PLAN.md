# Claw Portal — Test Plan

> **Purpose:** Document all test scenarios, expected outcomes, and verification steps for the Claw Portal.
> **Run after:** Every code change, build, or deployment.
> **Automated script:** `test-portal.sh` (29 automated checks)
> **Manual tests:** See sections below for UI verification steps.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Automated Smoke Tests](#automated-smoke-tests)
3. [Authentication](#authentication)
4. [Tier 1 — Core Features](#tier-1--core-features)
5. [Tier 2 — Analytics & Management](#tier-2--analytics--management)
6. [Tier 3 — Intelligence & Integration](#tier-3--intelligence--integration)
7. [Frontend Proxy](#frontend-proxy)
8. [Build Verification](#build-verification)
9. [Deployment Checklist](#deployment-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- OpenClaw Gateway running on port `18789`
- Claw Portal backend running on port `9000`
- Claw Portal frontend served on port `5713`
- Default credentials: `admin` / `admin123`
- Python 3.11+, Node.js 18+, npm installed

---

## Automated Smoke Tests

Run the automated test suite:

```bash
cd /home/node/.openclaw/workspace-main/memnew/claw-portal
bash test-portal.sh
```

**Expected output:** `PASS: All 23 tests passed — ready to deploy`

| # | Test | Method | Endpoint | Expected |
|---|------|--------|----------|----------|
| 1 | Backend login | POST | `/v3/auth/login` | 200 + JWT token |
| 2 | Proxy login | POST | `5713/v3/auth/login` | 200 + same token |
| 3 | Backend health | GET | `/v3/health` | 200 |
| 4 | Frontend SPA | GET | `5713/` | 200 + HTML |
| 5 | Proxy health | GET | `5713/v3/health` | 200 |
| 6 | Agents list | GET | `/v3/agents` | 200 |
| 7 | Crons list | GET | `/v3/crons` | 200, `total >= 1` |
| 8 | Gateway health | GET | `/v3/health` | 200 |
| 9 | Analytics | GET | `/v3/analytics/overview` | 200 |
| 10 | Costs | GET | `/v3/costs` | 200 |
| 11 | Kanban tasks | GET | `/v3/data/tasks` (auth) | 200 |
| 12 | Events feed | GET | `/v3/events` (auth) | 200 |
| 13 | Sessions | GET | `/v3/sessions` | 200 |
| 14 | Skills | GET | `/v3/skills` | 200, `total >= 5` |
| 15 | Config | GET | `/v3/config` | 200 |
| 16 | Disk usage | GET | `/v3/disk` | 200 |
| 17 | Memory files | GET | `/v3/memory/files` | 200 |
| 18 | Memory search | GET | `/v3/memory/search?q=test` | 200 |
| 19 | Alerts rules | GET | `/v3/alerts/rules` (auth) | 200 |
| 20 | Proxy POST | POST | `5713/v3/auth/login` | 200 |
| 21 | Proxy GET | GET | `5713/v3/agents` | 200 |
| 22 | Cron count | — | — | `total >= 1` |
| 23 | Monitoring system | GET | `/v3/monitoring/system` | 200 |
| 24 | Monitoring openclaw | GET | `/v3/monitoring/openclaw` | 200 |
| 25 | Monitoring summary | GET | `/v3/monitoring/summary` | 200 |
| 26 | System metrics shape | — | — | disk, memory, cpu, load, uptime present |
| 27 | OpenClaw metrics shape | — | — | sessions, crons, backups present |
| 28 | Backup status | GET | `/v3/backups/status` | 200 |
| 29 | Build check | — | `frontend/dist/index.html` | File exists |

---

## Authentication

### Test 1: Login with valid credentials
- **Steps:** POST to `/v3/auth/login` with `{"username":"admin","password":"admin123"}`
- **Expected:** `200 OK`, response contains `access_token` (JWT), `refresh_token`, `token_type: "bearer"`, `expires_in: 1440`
- **Verify:** Token can be used in `Authorization: Bearer <token>` header

### Test 2: Login with invalid credentials
- **Steps:** POST to `/v3/auth/login` with wrong password
- **Expected:** `401 Unauthorized`, response contains `detail: "Invalid username or password"`

### Test 3: Access protected route without token
- **Steps:** GET `/v3/data/tasks` without `Authorization` header
- **Expected:** `401 Unauthorized`

### Test 4: Access protected route with valid token
- **Steps:** GET `/v3/data/tasks` with `Authorization: Bearer <valid_token>`
- **Expected:** `200 OK`, returns task list

### Test 5: Login via frontend proxy
- **Steps:** POST to `http://localhost:5713/v3/auth/login`
- **Expected:** `200 OK` (proxy correctly forwards POST to backend)

---

## Tier 1 — Core Features

### Test 6: Agent Status Dashboard (`#/agents`)
- **API:** GET `/v3/agents`
- **Expected:** Returns list of agents with name, role, emoji, status, model, thinking level
- **Verify:** 7 agents returned (main, khadijah, aisha, sawda, hafsa, ummhabiba, zaynab)
- **UI:** Agent cards show status badges (active/idle/offline), model info, last seen time

### Test 7: Cron Job Manager (`#/crons`)
- **API:** GET `/v3/crons`
- **Expected:** Returns list of cron jobs with id, name, schedule, status, next_run, last_run
- **Verify:** `total >= 1`, each job has `enabled` boolean, `schedule` object with `expr` or `everyMs`
- **UI:** Table shows all jobs, status badges, error counts, schedule expressions

### Test 8: System Health Monitor (`#/gateway`)
- **API:** GET `/v3/health`
- **Expected:** Returns `{"status": "healthy"}` or similar health check response
- **UI:** Dashboard shows disk, memory, CPU gauges with color coding

---

## Tier 2 — Analytics & Management

### Test 9: Analytics Overview (`#/dashboard`)
- **API:** GET `/v3/analytics/overview`
- **Expected:** Returns `{tasks_total, tasks_done, alerts_active, projects_total}`
- **UI:** Stat cards show totals with trend indicators

### Test 10: Cost Analytics (`#/costs`)
- **API:** GET `/v3/costs`
- **Expected:** Returns cost data by model with daily breakdown
- **UI:** Chart shows cost trends, per-model cost table

### Test 11: Kanban Board (`#/tasks`)
- **API:** GET `/v3/data/tasks` (auth required), POST/PUT for drag operations
- **Expected:** 7-column board (Planning → Inbox → Assigned → In Progress → Testing → Review → Done)
- **UI:** Drag-and-drop works, new tasks can be created, tasks move between columns

### Test 12: Event Feed (`#/events`)
- **API:** GET `/v3/events` (auth required)
- **Expected:** Returns recent gateway events/audit log entries
- **UI:** Timeline view with severity coloring (info/warning/error)

---

## Tier 3 — Intelligence & Integration

### Test 13: Session Browser (`#/sessions`)
- **API:** GET `/v3/sessions` — lists all sessions
- **API:** GET `/v3/sessions/{key}/history?limit=10` — gets message history
- **Expected:** Sessions show key, label, agentId, model, status, message count, last activity
- **Verify:** Clicking expand shows last 10 messages with role labels (user/assistant/tool)
- **UI:** Searchable table, expandable message history drawer

### Test 14: Skill Manager (`#/skills`)
- **API:** GET `/v3/skills` — lists installed skills
- **API:** GET `/v3/skills/{name}` — gets skill details + full SKILL.md content
- **Expected:** 50+ skills listed with name, description, location path
- **Verify:** Clicking a skill shows full SKILL.md content
- **UI:** Two-column layout — skill list (left) + detail view (right)

### Test 15: Gateway Config Editor (`#/config`)
- **API:** GET `/v3/config` — returns current config as JSON
- **API:** PATCH `/v3/config/{path}` — patches a config value
- **Expected:** Config tree shows all keys from `openclaw.json`
- **Verify:** Modified values show "✏️ modified" badge until saved
- **UI:** Tree-view with expandable sections, save button for all changes

### Test 16: Disk Usage Dashboard (`#/disk`)
- **API:** GET `/v3/disk` — returns disk stats and top consumers
- **API:** POST `/v3/disk/cleanup` — cleans logs, caches, temp files
- **Expected:** Shows overall usage percentage, status badge (green/yellow/red)
- **Verify:** Gauge bar shows usage %, top 30 directories sorted by size
- **UI:** Color-coded bars, cleanup button, percentage labels

### Test 17: Memory Explorer (`#/memory`)
- **API:** GET `/v3/memory/search?q=<query>` — full-text search
- **API:** GET `/v3/memory/files` — lists all memory files
- **API:** GET `/v3/memory/{filename}` — reads a specific file
- **Expected:** Search returns matching lines with context (3 lines before/after)
- **Verify:** File browser shows name, date, size for each file
- **UI:** Toggle between Search and File Browser modes

### Test 18: Alert Rules Engine (`#/alerts`)
- **API:** GET `/v3/alerts/rules` — lists rules (auth required)
- **API:** POST `/v3/alerts/rules/create` — creates new rule (auth required)
- **API:** DELETE `/v3/alerts/rules/{id}` — deletes rule (auth required)
- **Expected:** Rules show metric, operator, threshold, action, channel
- **Verify:** Create form has dropdowns for metric, operator, channel
- **UI:** Rule cards with condition display, create/edit/delete buttons

### Test 19: Agent Conversations (`#/conversations`)
- **API:** GET `/v3/sessions` — list sessions
- **API:** GET `/v3/sessions/{key}/history?limit=50` — conversation history
- **Expected:** Shows all sessions with agent, model, message count, time ago
- **Verify:** Selecting a session loads its message history (up to 50 messages)
- **UI:** Session list (left) + conversation view (right), role-colored messages

### Test 20: Cron Job Editor (`#/croneditor`)
- **API:** GET `/v3/crons` — list jobs
- **API:** POST `/v3/crons` — create new job
- **API:** POST `/v3/crons/{id}` — toggle enabled/disabled
- **API:** DELETE `/v3/crons/{id}` — delete job
- **API:** POST `/v3/crons/{id}/run` — trigger job now
- **Expected:** Create/edit form with name, schedule type, expression, payload, delivery channel
- **Verify:** New job appears in list after creation, delete removes it
- **UI:** Job list with action buttons (run, edit, view, delete), create/edit modal

### Test 21: Monitoring Dashboard (`#/monitoring`)
- **API:** GET `/v3/monitoring/system` — disk, memory, CPU, load averages, uptime
- **API:** GET `/v3/monitoring/openclaw` — sessions count, cron stats, backup info
- **API:** GET `/v3/monitoring/summary` — combined system + OpenClaw metrics
- **Expected:** Returns real-time metrics with proper data shapes
- **Verify:** All metrics present (disk, memory, cpu, load, uptime, sessions, crons, backups)
- **UI:** 4 system metric cards, load averages, 3 OpenClaw metric cards, disk/memory gauges, cron health summary, system health status indicators
- **Auto-refresh:** Dashboard auto-refreshes every 30 seconds
- **Health thresholds:** Disk >95%=critical, >85%=warning; Memory >90%=critical, >75%=warning; CPU >90%=critical, >75%=warning

### Test 22: Backup Status (`#/backups`)
- **API:** GET `/v3/backups/status` — backup files, log entries, retention info
- **Expected:** Returns total backups count, total size, latest backup info, file list
- **Verify:** Files list contains `.tar.gz` files with dates, sizes, verified status
- **UI:** 4 summary cards, backup files table, expandable log viewer, configuration panel

---

## Frontend Proxy

### Test 23: Proxy forwards GET requests
- **Steps:** GET `http://localhost:5713/v3/health`
- **Expected:** `200 OK` (proxy forwards to backend port 9000)

### Test 24: Proxy forwards POST requests
- **Steps:** POST `http://localhost:5713/v3/auth/login` with credentials
- **Expected:** `200 OK` with JWT token
- **Critical:** This is the login path — if POST fails, users cannot login

### Test 25: Proxy returns SPA for root path
- **Steps:** GET `http://localhost:5713/`
- **Expected:** `200 OK` with HTML content (React SPA)

---

## Build Verification

### Test 26: Frontend build artifacts exist
- **Check:** `frontend/dist/index.html` exists
- **Check:** `frontend/dist/assets/` contains JS and CSS bundles
- **Expected:** Build timestamp matches recent commit time

### Test 27: Backend starts without errors
- **Steps:** Run `python3 start-portal.py`
- **Expected:** Both backend (9000) and frontend proxy (5713) start
- **Verify:** No import errors, all routes registered

---

## Deployment Checklist

Before pushing to production:

- [ ] `bash test-portal.sh` passes all 29 tests
- [ ] No secrets in git history (`git log --all --full-history -- "*.env" ".env"`)
- [ ] `.gitignore` covers `.env/`, `node_modules/`, `__pycache__/`
- [ ] Frontend built (`npm run build`)
- [ ] Backend routes registered in `main.py`
- [ ] New pages added to `App.jsx` routes and `Sidebar.jsx` nav
- [ ] `CLAW-PORTAL-PLAN.md` updated with completed features
- [ ] Git commit message describes changes
- [ ] Pushed to GitHub and verified on remote

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Login fails on frontend | Basic `http.server` instead of `start-portal.py` | Kill old process, run `python3 start-portal.py` |
| Port 5713 in use | Zombie process | `kill -9 $(lsof -t -i :5713)` |
| Port 9000 in use | Old uvicorn process | `kill $(lsof -t -i :9000)` |
| 404 on new routes | Route not registered in `main.py` | Add `app.include_router(newroute.router)` |
| 401 on protected routes | Missing `Authorization` header | Include `Bearer <token>` header |
| Cron jobs not showing | Gateway CLI not found | Verify `openclaw cron list --json` works |
| Skills list empty | Skills dir not at `/app/skills` | Check `~/.openclaw/skills/` path |
| Config editor errors | `openclaw gateway config` CLI issue | Read `openclaw.json` directly instead |
| Disk usage shows 0% | `df` command unavailable | Check `df -h /` works |
| Memory search no results | `MEMORY.md` not found | Verify file exists at expected path |
| Sub-agents stuck in exploration | Model too small for multi-feature tasks | Use larger model or build features directly |

---

## Running Tests in CI

For GitHub Actions or other CI:

```yaml
- name: Smoke Tests
  run: |
    # Start portal
    python3 start-portal.py &
    sleep 10
    # Run tests
    bash test-portal.sh
```

---

*Last updated: 2026-05-11*
