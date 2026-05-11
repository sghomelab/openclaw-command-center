# Changelog

All notable changes to OpenClaw Command Center.

---

## v4.7.0 — 2026-05-11
**Fix Monitoring blank page + add 7 smoke tests**

### Fixed
- `formatBytes()` crashed on string disk values ("1.9T", "117G") from `df` output
- Monitoring page now renders correctly with proper byte formatting

### Added
- 7 new smoke test cases in `test-portal.sh`:
  - `GET /v3/monitoring/system` — HTTP 200
  - `GET /v3/monitoring/openclaw` — HTTP 200
  - `GET /v3/monitoring/summary` — HTTP 200
  - System metrics data shape (disk, memory, cpu, load, uptime)
  - OpenClaw metrics data shape (sessions, crons, backups)
  - `GET /v3/backups/status` — HTTP 200
- Total: 29 smoke tests, 0 failures

---

## v4.5.0 — 2026-05-11
**Grafana-like monitoring dashboard integrated into Mission Control**

### Added
- `Monitoring.jsx` — full dashboard with system + OpenClaw metrics
- `monitoring.py` — backend routes for system metrics (disk, memory, CPU, load, uptime) and OpenClaw metrics (sessions, cron jobs, backups)
- SVG gauge charts for disk and memory usage visualization
- Auto-refresh every 30 seconds
- Health status indicators (Healthy/Warning/Critical) with color-coded alerts
- Load averages display (1m, 5m, 15m)
- Cron job health summary
- Backup status card

### Backend Routes
- `GET /v3/monitoring/system` — disk, memory, CPU, load averages, uptime
- `GET /v3/monitoring/openclaw` — sessions count, cron stats, backup info
- `GET /v3/monitoring/summary` — combined metrics
- `GET /v3/monitoring/history` — placeholder for Prometheus integration

---

## v4.4.0 — 2026-05-11
**Add CHANGELOG.md with full version history**

### Added
- `CHANGELOG.md` documenting all versions from v1.0.0 → v4.3.0

---

## v4.3.0 — 2026-05-11
**Sidebar restructure — 6 collapsible groups for ease of use**

### Added
- Full sidebar reorganization into 6 collapsible parent groups
- Auto-expand groups when navigating to child pages
- Nested group support (Cron under Infrastructure, 3 levels deep)

### Changed
- Sidebar reduced from 19 flat items → 7 top-level groups
- Updated version badge to `v4.0` in sidebar logo area
- Groups: Operations, Intelligence, Orchestration, Infrastructure, Configuration, Observability

### Groups
- **Operations**: Tasks, Projects, Workflows, Calendar
- **Intelligence**: Knowledge Base, LLM Wiki, Memory
- **Orchestration**: Agents, Sessions, Conversations
- **Infrastructure**: Gateway Health, Disk Usage, Cron (Jobs + Editor)
- **Configuration**: Config Editor, Skills, Integrations
- **Observability**: Alert Rules, Audit Logs, Cost Analytics

---

## v4.2.0 — 2026-05-11
**Merge Cron Jobs and Cron Editor under collapsible Cron menu**

### Changed
- Combined Cron Jobs and Cron Editor into single collapsible "Cron" parent menu
- Consistent with Knowledge/LLM Wiki grouping pattern

---

## v4.1.0 — 2026-05-11
**Merge LLM Wiki under Knowledge with collapsible sidebar sub-menus**

### Added
- Collapsible sidebar navigation with expandable parent groups
- Knowledge parent group with Knowledge Base and LLM Wiki sub-items

### Changed
- Removed standalone "LLM Wiki" from sidebar, nested under Knowledge

---

## v4.0.0 — 2026-05-11
**LLM Wiki module — upload, browse, query, ingest, lint**

### Added
- `LLMWiki.jsx` — full UI with 6 tabs: Dashboard, Upload, Browse, Query, Ingest, Lint
- `wiki.py` backend routes: upload, browse pages, query, ingest, lint, search, stats, index, schema, log
- File upload via drag-and-drop or click-to-browse
- Wiki page browser with category navigation (sources, entities, concepts, analysis)
- Query interface for searching wiki content
- Ingest tab for selecting raw sources for LLM processing
- Lint check for orphan pages, missing cross-references, contradictions
- New sidebar menu item "LLM Wiki"

### Backend Routes
- `GET /v3/wiki/stats` — page counts
- `GET /v3/wiki/index` — index.md content
- `GET /v3/wiki/schema` — SCHEMA.md content
- `GET /v3/wiki/log` — activity log entries
- `GET /v3/wiki/pages/{dir}` — list pages in a directory
- `GET /v3/wiki/page/{dir}/{name}` — read a specific page
- `POST /v3/wiki/upload` — upload file to raw/ directory
- `POST /v3/wiki/ingest` — prepare source for LLM ingestion
- `POST /v3/wiki/query` — search wiki for relevant pages
- `POST /v3/wiki/lint` — health check
- `GET /v3/wiki/search?q=` — full-text search

---

## v3.5.0 — 2026-05-10
**Agent-friendly README with full end-to-end setup guide**

### Changed
- README rewritten for AI agent readers — step-by-step setup with copy-paste commands
- Step 0: Environment discovery (auto-find OpenClaw paths)
- Step 2: Automated path replacement script included
- Full troubleshooting table with fix commands

---

## v3.4.0 — 2026-05-10
**Document prerequisites, portability notes, and hardcoded paths**

### Added
- Prerequisites table (OpenClaw version, Python, Node.js, SQLite)
- "Will It Work in My Environment?" portability guide
- Hardcoded paths table showing all 10 paths that need adjustment
- Extended troubleshooting section (12 issues → 12 fixes)
- Configuration reference table

---

## v3.3.0 — 2026-05-10
**Health check cron only delivers on failure**

### Changed
- Claw Portal Health Check cron: delivery disabled — no more "HEALTHY" spam to Discord
- Infrastructure Health Check cron: delivery disabled
- memnon-extract cron: disabled (broken path `/home/node/.openclaw/workspace/memnon`)

---

## v3.2.0 — 2026-05-10
**Fix sessions CLI command and data mapping — 61 sessions now visible**

### Fixed
- Sessions list was empty: corrected CLI command from `openclaw sessions list` to `openclaw sessions --all-agents --json`
- Session data mapping: corrected field names (key→id, agentId→label, updatedAt→lastActivity)
- Session history: noted that `openclaw sessions history` CLI doesn't exist — returns placeholder note

---

## v3.1.0 — 2026-05-10
**Fix calendar check delivery channel for multi-channel setups**

### Fixed
- Daily calendar check cron: added `--channel discord` to fix 8 consecutive errors
- Root cause: when Telegram was added as second channel, all cron jobs without explicit `delivery.channel` failed

---

## v3.0.0 — 2026-05-10
**Tier 3 features — all 8 features built and deployed**

### Added (Tier 3 — Intelligence & Integration)
- Session Browser: list/view all active sessions with message history
- Skill Manager: view installed skills with details and SKILL.md content
- Gateway Config Editor: read/edit gateway config with schema hints
- Disk Usage Dashboard: interactive disk usage view with cleanup
- Agent Conversation Viewer: full conversation history per agent
- Cron Job Editor: create/edit/delete cron jobs via UI
- Alert Rules Engine: threshold-based alerts with Discord/Telegram delivery
- Memory Explorer: full-text search across MEMORY.md and daily files

### Added (Infrastructure)
- `test-portal.sh` — automated smoke tests (23 checks, 0 failures)
- `CLAW-PORTAL-PLAN.md` — feature roadmap tracker
- `CLAW-PORTAL-TEST-PLAN.md` — 25 comprehensive test scenarios
- All features wired into App.jsx routes and Sidebar.jsx nav

### Fixed
- Auth interceptor: don't suppress errors on `/auth/` endpoints (login fix)
- Cron page: render schedule objects (not strings), show error counts
- Proxy: use `start-portal.py` instead of `http.server` (POST support)

---

## v2.0.0 — 2026-05-10
**Tier 2 features and critical bug fixes**

### Added
- 7-Column Kanban Board (drag-and-drop)
- Real-Time Event Feed
- Cost Analytics with per-model breakdown
- Knowledge/Memory Explorer

### Fixed
- All API routes use `/v3` prefix
- Auth interceptor crash on 401/404
- Cron page data shape mismatch (extract `.jobs` from response)
- Cron backend switched to CLI (`openclaw cron list --json`)
- Cron delivery: explicit channel for multi-channel setups

---

## v1.0.0 — 2026-05-09
**Initial release — Tier 1 features**

### Added
- Agent Status Dashboard
- System Health Monitor
- Cron Job Manager (view-only)
- Gateway Health Probes
- FastAPI backend with JWT authentication
- React + Vite frontend with dark theme
- Portal launcher (`start-portal.py`) with proxy

---
