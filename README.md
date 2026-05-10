# OpenClaw Command Center 🗿

A real-time mission control dashboard for OpenClaw multi-agent orchestration. Monitor agents, manage cron jobs, track costs, and view system health — all from a single pane of glass.

---

## For Another Agent: End-to-End Setup Instructions

**Read this section first.** These steps are written so an AI agent can follow them without asking questions.

### Step 0: Discover Your Environment

Before anything else, discover your OpenClaw setup:

```bash
# Find your OpenClaw state directory (default: ~/.openclaw)
OPENCLAW_DIR=$(dirname "$(openclaw --help 2>/dev/null | grep -oP '(?<=OPENCLAW_STATE_DIR=).+' | head -1 || echo "$HOME/.openclaw")")
echo "OPENCLAW_DIR=$OPENCLAW_DIR"

# Find your skills directory
SKILLS_DIR=$(find "$OPENCLAW_DIR" -type d -name "skills" 2>/dev/null | head -1)
echo "SKILLS_DIR=$SKILLS_DIR"

# Find your config file
CONFIG_FILE="$OPENCLAW_DIR/openclaw.json"
echo "CONFIG_FILE=$CONFIG_FILE"

# Find your memory directory (usually inside your workspace)
MEMORY_DIR=$(find "$OPENCLAW_DIR" -name "MEMORY.md" -type f 2>/dev/null | head -1 | xargs dirname)
echo "MEMORY_DIR=$MEMORY_DIR"

# Verify Gateway is running on port 18789
curl -s http://localhost:18789 -o /dev/null -w "%{http_code}"
echo ""
```

Save these values. You'll need them in Step 3.

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/sghomelab/openclaw-command-center.git
cd openclaw-command-center

# Install Python dependencies
cd backend
pip install -r requirements.txt

# Install Node.js dependencies and build frontend
cd ../frontend
npm install
npm run build

cd ..
```

### Step 2: Adjust Hardcoded Paths

The code has paths hardcoded to the original author's setup. Replace them with your paths.

**Run this single command to do all replacements at once** (substitute the variables from Step 0):

```bash
cd backend/app/api/routes

# Replace /home/node/.openclaw with your OPENCLAW_DIR
find . -name "*.py" -exec sed -i "s|/home/node/.openclaw|$OPENCLAW_DIR|g" {} \;

# Replace /home/node/.npm with your npm cache dir
NPM_CACHE=$(npm config get cache)
find . -name "*.py" -exec sed -i "s|/home/node/.npm|$NPM_CACHE|g" {} \;

# Replace /app/skills with your skills dir
sed -i "s|SKILLS_DIR = \"/app/skills\"|SKILLS_DIR = \"$SKILLS_DIR\"|" skills.py

# Replace /home/node/.openclaw/workspace-main/memnew/claw-portal/backend/claw_portal.db
# with your actual path
sed -i "s|/home/node/.openclaw/workspace-main/memnew/claw-portal/backend/claw_portal.db|./claw_portal.db|" events.py
```

**Verify replacements are correct:**

```bash
# Check no remaining /home/node paths
grep -rn "/home/node" .
# Should return nothing. If it does, fix those files manually.

# Check no remaining /app/skills
grep -rn "/app/skills" .
# Should return nothing. If it does, fix manually.
```

### Step 3: Verify Gateway Connection

```bash
# Test that the backend can reach the Gateway
curl -s http://localhost:18789 | head -1
# If this fails, your Gateway is not running on the default port 18789.
# Find your Gateway port and update GATEWAY_URL in these files:
#   agents.py, crons.py, gateway.py
# Search for: GATEWAY_URL = "http://localhost:18789"
```

### Step 4: Start the Portal

```bash
cd /path/to/openclaw-command-center
python3 start-portal.py
```

The portal starts on:
- **Backend API:** `http://localhost:9000`
- **Frontend SPA:** `http://localhost:5713`

### Step 5: Login and Verify

```bash
# Test the login
curl -s -X POST http://localhost:9000/v3/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; t=json.load(sys.stdin); print('OK' if 'access_token' in t else 'FAIL')"

# Run smoke tests
bash test-portal.sh
# Expected: PASS: All 23 tests passed — ready to deploy
```

### Step 6: Access the Portal

Open `http://localhost:5713` in a browser (or have a web-accessible agent navigate there).

**Default credentials:** `admin` / `admin123`

### Step 7: (Optional) Keep It Running

Use `nohup` or a process manager:

```bash
# Simple: nohup
nohup python3 start-portal.py > /tmp/portal.log 2>&1 &

# Or use systemd, tmux, screen, etc.
```

### Troubleshooting During Setup

| Problem | Fix |
|---------|-----|
| `start-portal.py` fails with "Address already in use" | `kill -9 $(lsof -t -i :5713)` then `kill -9 $(lsof -t -i :9000)` |
| Login fails on frontend | Ensure `start-portal.py` is running (not `python3 -m http.server`) |
| `openclaw sessions` returns error | Command is `openclaw sessions --all-agents --json` (not `list`) |
| Skills list is empty | Check `SKILLS_DIR` in `skills.py` points to valid directory |
| Config editor errors | Check `config_path` in `config.py` points to your `openclaw.json` |
| Disk usage shows 0% | Check `OPENCLAW_DIR` in `disk.py` |
| Sessions list is empty | Check CLI command in `sessions.py` uses `openclaw sessions --all-agents --json` |

---

## For Human Readers

### Features

**Tier 1 — Core:** Agent Status Dashboard, System Health Monitor, Cron Job Manager, Gateway Health Probes

**Tier 2 — Analytics:** 7-Column Kanban Board, Real-Time Event Feed, Cost Analytics, Knowledge/Memory Explorer

**Tier 3 — Intelligence:** Session Browser, Skill Manager, Gateway Config Editor, Disk Usage Dashboard, Agent Conversation Viewer, Cron Job Editor, Alert Rules Engine, Memory Explorer

### Project Structure

```
openclaw-command-center/
├── backend/app/api/routes/    # FastAPI route modules (agents.py, crons.py, sessions.py, etc.)
├── frontend/src/pages/        # React page components (Agents.jsx, Crons.jsx, Sessions.jsx, etc.)
├── start-portal.py            # Launcher (starts backend + frontend proxy)
├── test-portal.sh             # Smoke tests (run after every build)
├── CLAW-PORTAL-PLAN.md        # Feature roadmap & implementation tracker
├── CLAW-PORTAL-TEST-PLAN.md   # 25 test scenarios
├── CLAW-PORTAL-RECOVERY.md    # Bug fixes, workarounds, deployment log
└── README.md                  # This file
```

### Configuration

| Setting | Default | Configurable In |
|---------|---------|----------------|
| Gateway URL | `http://localhost:18789` | `GATEWAY_URL` in `agents.py`, `crons.py`, `gateway.py` |
| Backend port | `9000` | `backend/app/config.py` → `PORT` |
| Frontend port | `5713` | `start-portal.py` → `FRONTEND_PORT` |
| Default login | `admin` / `admin123` | Created on first startup in `main.py` |

### Adding New Pages

1. Create `frontend/src/pages/YourPage.jsx`
2. Import and register in `frontend/src/App.jsx`
3. Add sidebar link in `frontend/src/components/Sidebar.jsx`
4. `cd frontend && npm run build`
5. `bash test-portal.sh`

### Adding New API Routes

1. Create `backend/app/api/routes/yourroute.py` with `router = APIRouter(prefix="/v3", tags=["Name"])`
2. Register in `backend/app/main.py`:
   ```python
   from app.api.routes import yourroute
   app.include_router(yourroute.router)
   ```
3. Backend auto-reloads via WatchFiles
4. `bash test-portal.sh`

### Hardcoded Paths

The following paths in the code need updating for your environment:

| Path | File(s) | What It's Used For |
|------|---------|-------------------|
| `OPENCLAW_DIR` | `agents.py`, `disk.py` | OpenClaw state directory |
| `GATEWAY_URL` | `agents.py`, `crons.py`, `gateway.py` | Gateway REST API |
| `SKILLS_DIR` | `skills.py` | Skills directory |
| `config_path` | `config.py` | `openclaw.json` location |
| `MEMORY_DIR` | `memory.py` | Memory files directory |
| `QMD_DIR` | `costs.py` | QMD facts database |
| `NPM_CACHE` | `disk.py` | npm cache directory |

Use the "Step 2" automated replacement commands above, or edit each file manually.

---

## License

MIT

## Acknowledgments

Built for the [OpenClaw](https://docs.openclaw.ai) multi-agent orchestration framework.

---

*Built by Mas — Singapore 🇸🇬*
