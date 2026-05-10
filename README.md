# OpenClaw Command Center 🗿

A real-time mission control dashboard for OpenClaw multi-agent orchestration. Monitor agents, manage cron jobs, track costs, and view system health — all from a single pane of glass.

![Screenshot](screenshots/dashboard.png)

## Features

- **Agent Status Dashboard** — Live status of all configured agents from OpenClaw Gateway
- **System Health Monitor** — Disk, memory, CPU gauges with alert thresholds
- **Cron Job Manager** — Visual management of scheduled tasks with run history
- **7-Column Kanban Board** — Drag-and-drop task management
- **Real-Time Event Feed** — Live audit log with severity coloring
- **Cost Analytics** — Per-model cost breakdown with daily trends
- **Gateway Health Probes** — Liveness/readiness checks for OpenClaw Gateway
- **Knowledge/Memory Explorer** — Search across QMD facts database

## Architecture

```
Frontend (React + Vite)          Backend (FastAPI)
├── pages/                       ├── api/routes/
│   ├── Agents.jsx               │   ├── agents.py
│   ├── Dashboard.jsx            │   ├── analytics.py
│   ├── Crons.jsx                │   ├── costs.py
│   ├── Events.jsx               │   ├── crons.py
│   ├── CostAnalytics.jsx        │   ├── gateway.py
│   └── ...                      │   └── health.py
├── components/                  └── services/
└── services/api.js
```

## Prerequisites

- Python 3.11+ with pip
- Node.js 18+ with npm
- OpenClaw Gateway running on port 18789
- OpenClaw installed and configured

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
└── README.md
```

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

### Adding New API Routes

1. Create `backend/app/api/routes/yourroute.py`
2. Register in `backend/app/main.py`:
   ```python
   from app.api.routes import yourroute
   app.include_router(yourroute.router)
   ```
3. Backend auto-reloads via WatchFiles

## Screenshots

<!-- Add screenshots to screenshots/ directory -->

## License

MIT

## Acknowledgments

Built for the [OpenClaw](https://docs.openclaw.ai) multi-agent orchestration framework.

---

*Built by Mas — Singapore 🇸🇬*
