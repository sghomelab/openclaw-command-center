# Claw Mission Control — User Guide

**Version:** v5.3.0  
**Last Updated:** 2026-05-11  
**Access:** `http://localhost:5713` (frontend) | `http://localhost:9000` (backend API)

---

## Table of Contents

1. [What Is Claw Mission Control?](#what-is-claw-mission-control)
2. [Getting Started](#getting-started)
3. [Navigation & Layout](#navigation--layout)
4. [Configuration Management](#configuration-management)
5. [Monitoring & Health](#monitoring--health)
6. [Orchestration](#orchestration)
7. [Observability](#observability)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

---

## What Is Claw Mission Control?

Claw Mission Control is a web-based dashboard for managing and monitoring the **OpenClaw multi-agent system**. It provides a single interface to:

- **Configure** your OpenClaw gateway settings with real-time validation
- **Monitor** system health (CPU, memory, disk, load averages)
- **Track** all 7 agents (Hajar, Khadijah, Aisha, Sawda, Hafsa, Umm Habiba, Zaynab)
- **Manage** cron jobs, sessions, and conversations
- **Audit** every config change with before/after diffs and rollback capability
- **Compare** configurations across all agents side-by-side

It consists of:
- **Frontend:** React SPA served on port 5713
- **Backend:** FastAPI REST API on port 9000
- **Database:** SQLite (`claw_portal.db`) for persistence

---

## Getting Started

### Accessing the Dashboard

1. Open your browser and navigate to: **`http://localhost:5713`**
2. Log in with your credentials (default admin user created on first startup)
3. You'll land on the **Dashboard** overview

### Default Admin User

The system creates a default admin user on first startup:
- **Username:** `admin`
- **Password:** Check backend logs at startup (`/tmp/claw-portal-backend.log`)
- You can create additional users via the Settings page

---

## Navigation & Layout

The sidebar on the left organizes features into 7 groups:

| Group | Pages | Purpose |
|-------|-------|---------|
| **Dashboard** | Overview | System status at a glance |
| **Operations** | Tasks, Projects, Workflows, Calendar | Daily operational management |
| **Intelligence** | Knowledge Base, LLM Wiki, Memory | AI knowledge management |
| **Orchestration** | Agents, Sessions, Conversations | Multi-agent coordination |
| **Infrastructure** | Gateway Health, Disk Usage, Cron, Backups, Monitoring | System health & automation |
| **Configuration** | Config Editor, History, Audit, Multi-Agent View, Skills, Integrations | Config management |
| **Observability** | Alert Rules, Audit Logs, Cost Analytics | Monitoring & costs |
| **Settings** | Appearance, Language, Profile | UI preferences |

---

## Configuration Management

### Config Editor (`#/config`)

**What it does:** Edit your OpenClaw configuration (`openclaw.json`) with real-time validation.

**How to use:**
1. Navigate to **Configuration → Config Editor**
2. Click any value to edit it inline
3. Changes are validated in real-time:
   - ✅ Green checkmark = valid
   - ❌ Red X = validation error (hover to see details)
   - 🔄 Amber spinner = validating...
4. Click **Save** to apply changes (disabled if validation errors exist)
5. Every save automatically creates a backup before writing

**Validation rules include:**
- Type checking (string, int, bool, dict, list)
- Allowed values (e.g., `gateway.auth.mode` must be: `token`, `password`, `none`, `trusted-proxy`)
- Range checks (ports: 1-65535, tokens: 1000-100000)
- Pattern matching (heartbeat interval: `^\d+(s|m|h|d)$`)
- Empty credential detection
- String length limits (max 10,000 chars)

**Safety features:**
- Auto-backup before every save
- Pre-save validation blocks invalid changes
- Error summary panel shows all issues
- Save button disabled when errors exist

### Config History (`#/confighistory`)

**What it does:** View all config snapshots, compare changes, and rollback.

**How to use:**
1. Navigate to **Configuration → Config History**
2. See a timeline of all snapshots with:
   - Timestamp and user who made the change
   - Brief description of what changed
   - Snapshot ID
3. **View** a snapshot to see the full config JSON
4. **Diff** two snapshots to see exactly what changed (side-by-side comparison)
5. **Restore** to rollback to any previous state
6. **Snapshot Now** to manually create a backup before risky changes
7. Filter by user or date range

**Key features:**
- Auto-snapshot before every config patch
- Manual snapshots via button or API
- JSON diff viewer with added/removed/modified highlights
- One-click rollback with confirmation
- Stats: total snapshots, daily counts, most active user

### Config Audit (`#/configaudit`)

**What it does:** Full audit trail of who changed what and when.

**How to use:**
1. Navigate to **Configuration → Config Audit**
2. See a table of all config changes with:
   - Timestamp
   - User who made the change
   - Action type (patched, replaced, restored)
   - Before/after diff details (expandable)
3. **Search** across actions, users, and details
4. **Filter** by user or action type
5. **Export to CSV** for external analysis
6. Stats cards show: total changes, unique users, patches vs restores

**What gets logged:**
- Every config patch (path, old value, new value)
- Every full config replacement
- Every config restore from snapshot
- Manual snapshots
- User, timestamp, IP address, and reason

### Multi-Agent Config View (`#/multiagent`)

**What it does:** Compare configurations across all 7 agents side-by-side.

**How to use:**
1. Navigate to **Configuration → Multi-Agent View**
2. See summary cards: total agents, channels, consistent/inconsistent settings
3. View agent cards showing:
   - Agent name and ID
   - Model (inherited or custom)
   - Heartbeat interval
   - Memory backend
   - Number of channels
4. **Comparison table** shows 9 key settings across all agents:
   - Model, Heartbeat, Auth Mode, Bind, Port, Memory Backend, Tools Profile, Diagnostics
5. **Status indicators:**
   - ✅ Green = all agents have the same value (consistent)
   - ⚠️ Amber = different values across agents (inconsistent)
6. Click any row to see a detailed modal with side-by-side values
7. Use the diff endpoint to compare specific settings

**Key features:**
- Identifies configuration drift between agents
- Shows which agents share the main config vs have custom configs
- Compares 9 critical settings automatically
- Visual indicators for consistency

---

## Monitoring & Health

### Monitoring Dashboard (`#/monitoring`)

**What it does:** Grafana-like system metrics dashboard.

**How to use:**
1. Navigate to **Infrastructure → Monitoring**
2. See gauges for:
   - Disk usage (with alert thresholds)
   - Memory usage
   - CPU usage
   - Load averages (1m, 5m, 15m)
   - System uptime
3. Auto-refreshes every 30 seconds
4. Health status indicators: Healthy (green), Warning (amber), Critical (red)

**Metrics shown:**
- Disk: total, used, available, percent
- Memory: total, used, available, percent
- CPU: usage percent
- Load: 1-minute, 5-minute, 15-minute averages
- Uptime: system uptime in days/hours/minutes

### Gateway Health (`#/gateway`)

**What it does:** Probes the OpenClaw Gateway for liveness and readiness.

**How to use:**
1. Navigate to **Infrastructure → Gateway Health**
2. See gateway status, version, uptime
3. Check liveness (`/healthz`) and readiness (`/readyz`) probes
4. View per-channel health status

### Disk Usage (`#/disk`)

**What it does:** Shows disk space usage and trends.

**How to use:**
1. Navigate to **Infrastructure → Disk Usage**
2. See total, used, available space with percentage gauge
3. Alert threshold at 85% usage

---

## Orchestration

### Agents (`#/agents`)

**What it does:** View and manage all 7 agents.

**How to use:**
1. Navigate to **Orchestration → Agents**
2. See status for each agent: Hajar, Khadijah, Aisha, Sawda, Hafsa, Umm Habiba, Zaynab
3. View: last activity, current task, heartbeat timestamps
4. Actions: steer, kill, message (via OpenClaw Gateway API)

### Sessions (`#/sessions`)

**What it does:** View active and recent agent sessions.

**How to use:**
1. Navigate to **Orchestration → Sessions**
2. See session list with: agent, channel, status, last activity
3. Filter by agent or status

### Conversations (`#/conversations`)

**What it does:** View conversation history across channels.

**How to use:**
1. Navigate to **Orchestration → Conversations**
2. Browse conversations by channel and agent
3. Search and filter

---

## Observability

### Alert Rules (`#/alerts`)

**What it does:** Configure and manage alert rules.

**How to use:**
1. Navigate to **Observability → Alert Rules**
2. Create/edit alert conditions (thresholds, triggers)
3. Set notification targets (email, webhook, Discord)
4. Enable/disable rules

### Cost Analytics (`#/costs`)

**What it does:** Track LLM usage costs and token consumption.

**How to use:**
1. Navigate to **Observability → Cost Analytics**
2. See per-model cost breakdowns
3. Daily/weekly/monthly trends
4. Cost per agent
5. Quota alerts

### Audit Logs (`#/audit`)

**What it does:** Full system audit trail.

**How to use:**
1. Navigate to **Observability → Audit Logs**
2. View all API requests and system events
3. Filter by user, action, resource type
4. Export to CSV

---

## API Reference

### Base URL
`http://localhost:9000/v3/`

### Configuration Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/config` | Get current config |
| GET | `/config/schema` | Get validation schema |
| GET | `/config/validation-rules` | Get all validation rules |
| GET | `/config/history` | List config snapshots |
| GET | `/config/history/{id}` | Get specific snapshot |
| GET | `/config/history/{id1}/diff/{id2}` | Compare two snapshots |
| GET | `/config/history/stats` | History statistics |
| GET | `/config/audit` | Get audit log (filtered) |
| GET | `/config/audit/stats` | Audit statistics |
| POST | `/config/validate` | Validate single path/value |
| POST | `/config/validate/diff` | Validate proposed changes |
| POST | `/config/validate/full` | Validate entire config |
| POST | `/config/snapshot` | Create manual snapshot |
| PATCH | `/config/{path}` | Patch config path |
| PATCH | `/config` | Replace entire config |
| DELETE | `/config/history/{id}` | Delete snapshot |
| POST | `/config/restore/{id}` | Restore from snapshot |

### Multi-Agent Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/config/multi-agent` | Compare configs across agents |
| GET | `/config/multi-agent/diff/{setting}` | Compare specific setting |
| GET | `/config/multi-agent/summary` | Agent summary with channels |

### Monitoring Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/monitoring/system` | System metrics (disk, memory, CPU, load) |
| GET | `/monitoring/openclaw` | OpenClaw metrics (sessions, crons, backups) |
| GET | `/monitoring/summary` | Combined metrics |
| GET | `/monitoring/history` | Prometheus integration (placeholder) |

### Other Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Gateway health probe |
| GET | `/agents` | Agent status |
| GET | `/crons` | Cron job list |
| GET | `/costs` | Cost tracking |
| GET | `/sessions` | Session list |
| GET | `/skills` | Skill status |
| GET | `/disk` | Disk usage |
| GET | `/memory` | Memory explorer |
| GET | `/events` | Event feed |
| GET | `/wiki` | LLM wiki |
| GET | `/backups/status` | Backup status |

### Authentication

All endpoints require a JWT token:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:9000/v3/config
```

Get a token by logging in:
```bash
curl -X POST http://localhost:9000/v3/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your_password"}'
```

---

## Troubleshooting

### Common Issues

**Frontend not loading:**
```bash
# Check if frontend is running
curl http://localhost:5713

# Rebuild if needed
cd frontend && npm run build
```

**Backend not responding:**
```bash
# Check if backend is running
curl http://localhost:9000/v3/health

# Check logs
tail -50 /tmp/claw-portal-backend.log

# Restart backend
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 9000
```

**Config validation errors:**
- Hover over the red X icon to see the specific error
- Check validation rules: `GET /v3/config/validation-rules`
- Common issues: wrong type, invalid allowed value, out-of-range number

**Config rollback needed:**
1. Go to Config History
2. Find the snapshot before the bad change
3. Click "Restore" and confirm
4. System auto-backs up current config before restoring

**Disk usage alerts:**
- Navigate to Infrastructure → Disk Usage or Monitoring
- Alert threshold is 85%
- Clean up old files or expand storage
- Check backup directory: `~/.openclaw/config-backups/`

### Backup Locations

- **Config backups:** `~/.openclaw/config-backups/`
- **Portal database:** `backend/claw_portal.db`
- **Logs:** `/tmp/claw-portal-backend.log`

### Service Ports

| Service | Port | Purpose |
|---------|------|---------|
| Frontend SPA | 5713 | Web UI |
| Backend API | 9000 | REST API |
| OpenClaw Gateway | 18789 | Main agent orchestrator |

---

## Best Practices

1. **Always snapshot before risky changes** — Use "Snapshot Now" button or create one via API
2. **Review validation errors before saving** — The editor blocks saves with errors, but understand why
3. **Use config history for safe rollbacks** — Every change is automatically backed up
4. **Check multi-agent view periodically** — Detect configuration drift between agents
5. **Monitor system metrics daily** — Use the Monitoring dashboard for quick health checks
6. **Export audit logs regularly** — For compliance and debugging
7. **Keep backups clean** — Old snapshots auto-cleanup after 30 days

---

## Support

- **Documentation:** `docs/` directory in the repository
- **Recovery Plan:** `CLAW-PORTAL-RECOVERY.md`
- **GitHub:** `https://github.com/sghomelab/openclaw-command-center`
- **Logs:** `/tmp/claw-portal-backend.log`

---

*User Guide v1.0 — Generated 2026-05-11*
