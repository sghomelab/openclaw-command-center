# Claw Portal — Tier 3 Roadmap

> **Purpose:** Track pending features. Remove items from this file once implemented.

---

## 🟢 High Impact (Build First)

- [x] **Session Browser** — List/view all active sessions (main, isolated, sub-agents) with message history and model info
- [x] **Skill Manager** — View installed skills, enable/disable, search ClawHub for new ones
- [x] **Gateway Config Editor** — Read/edit `config.yaml` from UI with schema validation
- [x] **Disk Usage Dashboard** — Interactive view of disk consumption by directory, with one-click cleanup

## 🟡 Medium Impact

- [x] **Agent Conversation Viewer** — Click into any agent session and read its full message history
- [x] **Cron Job Editor** — Create/edit/delete cron jobs via UI (schedule, payload, delivery channel)
- [x] **Alert Rules Engine** — Define thresholds with Discord/Telegram delivery
- [x] **Memory Explorer** — Full-text search across MEMORY.md and daily files

## 🔵 Stretch Goals

- [ ] **Sub-Agent Model Routing** — Configure 1M context model for sub-agents via `agents.defaults.subagents.model` to replace quantized Qwen3.6-27B for heavy multi-feature builds
- [ ] **Multi-Gateway Support** — Connect to multiple OpenClaw instances
- [ ] **Audit Log** — Persistent log of all config changes, cron edits, agent spawns
- [ ] **Performance Dashboard** — Model latency, token burn per session, cost forecasting
- [ ] **Role-Based Access** — Admin vs viewer roles

---

## Completed (Tier 1 & 2)

- [x] Agent Status Dashboard
- [x] System Health Monitor
- [x] Cron Job Manager (view-only)
- [x] 7-Column Kanban Board
- [x] Real-Time Event Feed
- [x] Cost Analytics
- [x] Gateway Health Probes
- [x] Knowledge/Memory Explorer
