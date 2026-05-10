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

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/sghomelab/openclaw-command-center.git
cd openclaw-command-center
```

### 2. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Build the Frontend

```bash
cd frontend
npm install
npm run build
```

### 4. Start the Portal

```bash
cd ..
python3 start-portal.py
```

The portal will be available at `http://localhost:5713`.

### Default Login

- **Username:** `admin`
- **Password:** `admin123`

### 5. Run Smoke Tests (Recommended)

```bash
bash test-portal.sh
```

Expected output: `PASS: All 23 tests passed — ready to deploy`

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

## Configuration

The portal connects to OpenClaw Gateway via:
- **Gateway URL:** `http://localhost:18789`
- **Backend API:** `http://localhost:9000`
- **Frontend SPA:** `http://localhost:5713`

To change the gateway URL, edit `backend/app/api/routes/agents.py` and update the `GATEWAY_URL` constant.

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
├── start-portal.py          # Launcher script
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

## Deployment Checklist

Before deploying to production:

- [ ] `bash test-portal.sh` passes all 23 tests
- [ ] No secrets in git history (`git log --all --full-history -- "*.env" ".env"`)
- [ ] `.gitignore` covers `.env/`, `node_modules/`, `__pycache__/`
- [ ] Frontend built (`npm run build`)
- [ ] Backend routes registered in `main.py`
- [ ] New pages added to `App.jsx` and `Sidebar.jsx`
- [ ] `CLAW-PORTAL-PLAN.md` updated with completed features

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Login fails on frontend | Using `http.server` instead of `start-portal.py` | Kill old process, run `python3 start-portal.py` |
| Port 5713 in use | Zombie process | `kill -9 $(lsof -t -i :5713)` |
| 404 on new routes | Route not registered in `main.py` | Add `app.include_router(newroute.router)` |
| 401 on protected routes | Missing `Authorization` header | Include `Bearer <token>` header |
| Cron jobs not showing | Gateway CLI not found | Verify `openclaw cron list --json` works |

## Screenshots

<!-- Add screenshots to screenshots/ directory -->

## License

MIT

## Acknowledgments

Built for the [OpenClaw](https://docs.openclaw.ai) multi-agent orchestration framework.

---

*Built by Mas — Singapore 🇸🇬*
