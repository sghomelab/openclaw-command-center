# OpenClaw Command Center 🗿

A real-time mission control dashboard for OpenClaw multi-agent orchestration. Monitor agents, manage cron jobs, track costs, and view system health — all from a single pane of glass.

![Screenshot](screenshots/dashboard.png)

## Features

### Tier 1 — Core Features
- **Agent Status Dashboard** — Live status of all configured agents from OpenClaw Gateway
- **System Health Monitor** — Disk, memory, CPU gauges with alert thresholds
- **Cron Job Manager** — Visual management of scheduled tasks with run history
- **Gateway Health Probes** — Liveness/readiness checks for OpenClaw Gateway

### Tier 2 — Analytics & Management
- **7-Column Kanban Board** — Drag-and-drop task management
- **Real-Time Event Feed** — Live audit log with severity coloring
- **Cost Analytics** — Per-model cost breakdown with daily trends
- **Knowledge/Memory Explorer** — Search across memory database

### Tier 3 — Intelligence & Integration
- **Session Browser** — List/view all active sessions with message history
- **Skill Manager** — View installed skills with details and documentation
- **Gateway Config Editor** — Read/edit gateway config with schema hints
- **Disk Usage Dashboard** — Interactive disk usage view with one-click cleanup
- **Agent Conversation Viewer** — View full conversation history per agent
- **Cron Job Editor** — Create/edit/delete cron jobs via UI
- **Alert Rules Engine** — Define threshold-based alerts with Discord/Telegram delivery
- **Memory Explorer** — Full-text search across MEMORY.md and daily files

---

## Prerequisites

Before running the portal, ensure you have:

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| **OpenClaw** | v2026.5.x+ | Gateway must be running on port `18789` |
| **OpenClaw CLI** | `openclaw` command available in PATH | Used by sessions, crons, and skills routes |
| **Python** | 3.11+ | With pip for backend dependencies |
| **Node.js** | 18+ | With npm for frontend build |
| **SQLite** | 3.x | Default database (bundled with Python) |

### Will It Work in My OpenClaw Environment?

**Mostly yes, with minor adjustments.** The portal is built for a standard OpenClaw installation, but several paths are hardcoded to the original author's setup. You'll need to adjust these for your environment:

| Hardcoded Path | Location | What to Change |
|----------------|----------|----------------|
| `GATEWAY_URL = "http://localhost:18789"` | `agents.py`, `crons.py`, `gateway.py` | Change to your Gateway URL |
| `OPENCLAW_DIR = "/home/node/.openclaw"` | `agents.py`, `disk.py` | Change to your `$OPENCLAW_STATE_DIR` (default: `~/.openclaw`) |
| `SKILLS_DIR = "/app/skills"` | `skills.py` | Change to your skills directory |
| `config_path = "/home/node/.openclaw/openclaw.json"` | `config.py` | Change to your `openclaw.json` path |
| `MEMORY_DIR = ~/.openclaw/workspace-main/memory` | `memory.py` | Change to your memory directory |
| `QMD_DIR = "/home/node/.openclaw/qmd"` | `costs.py` | Change to your QMD directory (or remove if unused) |

### Quick Portability Fix

The fastest way to make it work in your environment:

```bash
# Find and replace all hardcoded paths
cd backend/app
find . -name "*.py" -exec grep -l "/home/node" {} \;
# Then edit each file to use your paths
# Or set environment variables and update the code to read from env
```

For a more robust solution, these paths should be configurable via environment variables (planned for v4.0).

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/sghomelab/openclaw-command-center.git
cd openclaw-command-center
```

### 2. Adjust Paths (If Your Setup Differs)

If your OpenClaw installation uses default paths, you can skip this step. Otherwise:

```bash
# Edit these files to match your environment:
nano backend/app/api/routes/agents.py      # OPENCLAW_DIR, GATEWAY_URL
nano backend/app/api/routes/crons.py       # GATEWAY_URL
nano backend/app/api/routes/gateway.py     # GATEWAY_URL
nano backend/app/api/routes/skills.py      # SKILLS_DIR
nano backend/app/api/routes/config.py      # config_path
nano backend/app/api/routes/disk.py        # OPENCLAW_DIR
nano backend/app/api/routes/memory.py      # MEMORY_DIR
nano backend/app/api/routes/costs.py       # QMD_DIR
```

### 3. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Build the Frontend

```bash
cd ../frontend
npm install
npm run build
```

### 5. Start the Portal

```bash
cd ..
python3 start-portal.py
```

The portal will be available at `http://localhost:5713`.

### Default Login

- **Username:** `admin`
- **Password:** `admin123`

### 6. Run Smoke Tests (Recommended)

```bash
bash test-portal.sh
```

Expected output: `PASS: All 23 tests passed — ready to deploy`

---

## Architecture

```
Frontend (React + Vite)          Backend (FastAPI)
├── pages/                       ├── api/routes/
│   ├── Agents.jsx               │   ├── agents.py
│   ├── Dashboard.jsx            │   ├── analytics.py
│   ├── Crons.jsx                │   ├── costs.py
│   ├── Events.jsx               │   ├── crons.py
│   ├── CostAnalytics.jsx        │   ├── gateway.py
│   ├── Sessions.jsx             │   ├── health.py
│   ├── Skills.jsx               │   ├── sessions.py
│   ├── ConfigEditor.jsx         │   ├── skills.py
│   ├── DiskUsage.jsx            │   ├── config.py
│   ├── MemoryExplorer.jsx       │   ├── disk.py
│   ├── ConversationViewer.jsx   │   ├── memory.py
│   ├── AlertsPage.jsx           │   ├── events.py
│   └── CronEditor.jsx           │   └── alerts.py
├── components/                  └── services/
└── services/api.js
```

---

## Configuration

The portal connects to OpenClaw Gateway via:
- **Gateway URL:** `http://localhost:18789` (default)
- **Backend API:** `http://localhost:9000`
- **Frontend SPA:** `http://localhost:5713`

These ports are configurable in `start-portal.py` and `backend/app/config.py`.

---

## Project Structure

```
openclaw-command-center/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # FastAPI route modules
│   │   ├── models/          # SQLAlchemy models
│   │   ├── services/        # Business logic
│   │   └── main.py          # App entry point
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── pages/           # Route components
│   │   ├── components/      # Shared components
│   │   ├── services/        # API client
│   │   └── App.jsx          # Router
│   ├── package.json
│   └── vite.config.js
├── start-portal.py          # Launcher script (proxies frontend → backend)
├── nginx.portal.conf        # Nginx config (optional)
├── test-portal.sh           # Smoke test script (run after every build)
├── CLAW-PORTAL-PLAN.md      # Feature roadmap & implementation tracker
├── CLAW-PORTAL-TEST-PLAN.md # Comprehensive test scenarios (25 cases)
├── CLAW-PORTAL-RECOVERY.md  # Recovery procedures & implementation log
└── README.md                # This file
```

## Project Files

### `CLAW-PORTAL-PLAN.md` — Feature Roadmap
Tracks all features across Tier 1, 2, and 3. Completed features are marked with `[x]` and moved to the "Completed" section. Use this to track what's been built and what's planned next.

### `CLAW-PORTAL-TEST-PLAN.md` — Test Scenarios
Documents 25 comprehensive test scenarios covering authentication, all tiers of features, proxy behavior, and build verification. Each scenario includes steps, expected outcomes, and UI/API verification details. Reference this for QA and manual testing.

### `test-portal.sh` — Automated Smoke Tests
Bash script that runs 23 automated API and proxy tests. Run this **after every build** to catch regressions before deployment. Exits with code 1 if any test fails. Covers:
- Authentication (backend + proxy)
- All Tier 1, 2, and 3 API endpoints
- Data shape validation (cron count, skill count)
- Proxy POST/GET forwarding
- Frontend build verification

### `CLAW-PORTAL-RECOVERY.md` — Implementation Log
Records of bugs fixed, workarounds applied, and deployment procedures. Use this as a reference when troubleshooting similar issues. Includes:
- API prefix fixes (`/v3/` routing)
- Auth interceptor fixes
- CLI-based cron listing workaround
- Cron delivery channel configuration
- Portal startup procedures

---

## Customization

### Adding New Pages

1. Create `frontend/src/pages/YourPage.jsx`
2. Add route in `frontend/src/App.jsx`:
   ```js
   import YourPage from './pages/YourPage';
   // ...
   yourpage: { component: YourPage, title: 'Your Page' },
   ```
3. Add sidebar link in `frontend/src/components/Sidebar.jsx`
4. Rebuild: `cd frontend && npm run build`
5. Run tests: `bash test-portal.sh`

### Adding New API Routes

1. Create `backend/app/api/routes/yourroute.py`
2. Register in `backend/app/main.py`:
   ```python
   from app.api.routes import yourroute
   app.include_router(yourroute.router)
   ```
3. Backend auto-reloads via WatchFiles
4. Run tests: `bash test-portal.sh`

---

## Deployment Checklist

Before deploying to production:

- [ ] `bash test-portal.sh` passes all 23 tests
- [ ] No secrets in git history (`git log --all --full-history -- "*.env" ".env"`)
- [ ] `.gitignore` covers `.env/`, `node_modules/`, `__pycache__/`
- [ ] Frontend built (`npm run build`)
- [ ] Backend routes registered in `main.py`
- [ ] New pages added to `App.jsx` and `Sidebar.jsx`
- [ ] `CLAW-PORTAL-PLAN.md` updated with completed features

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Login fails on frontend | Using `http.server` instead of `start-portal.py` | Kill old process, run `python3 start-portal.py` |
| Port 5713 in use | Zombie process | `kill -9 $(lsof -t -i :5713)` |
| Port 9000 in use | Old uvicorn process | `kill $(lsof -t -i :9000)` |
| 404 on new routes | Route not registered in `main.py` | Add `app.include_router(newroute.router)` |
| 401 on protected routes | Missing `Authorization` header | Include `Bearer <token>` header |
| Cron jobs not showing | Gateway CLI not found | Verify `openclaw cron list --json` works |
| Sessions list empty | CLI command wrong | Use `openclaw sessions --all-agents --json` |
| Skills list empty | Skills dir path wrong | Update `SKILLS_DIR` in `skills.py` |
| Config editor errors | Config path wrong | Update `config_path` in `config.py` |
| Disk usage shows 0% | OpenClaw dir path wrong | Update `OPENCLAW_DIR` in `disk.py` |

---

## Screenshots

<!-- Add screenshots to screenshots/ directory -->

## License

MIT

## Acknowledgments

Built for the [OpenClaw](https://docs.openclaw.ai) multi-agent orchestration framework.

---

*Built by Mas — Singapore 🇸🇬*
