# Claw Portal — Mission Control API Skill

## Overview

Claw Portal is the OpenClaw mission control dashboard. It provides a REST API for managing projects, tasks, agents, crons, config, memory, wiki, alerts, and more.

## Connection

| Field | Value |
|-------|-------|
| Base URL | `http://localhost:9000` |
| Frontend | `http://localhost:5713` |
| OpenAPI Spec | `http://localhost:9000/openapi.json` |
| Local Spec | `claw-portal/openapi.json` |
| Default Login | `admin` / `admin123` |

## Authentication

### Login

```
POST http://localhost:9000/v3/auth/login
Content-Type: application/json

{"username": "admin", "password": "admin123"}
```

**Response:**
```json
{"access_token": "eyJ...", "refresh_token": "eyJ..."}
```

### Use Token in All Requests

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

### Refresh Token

```
POST /v3/auth/refresh
```

---

## API Endpoints by Category

### Projects (Mission Control)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/data/projects` | List all projects |
| POST | `/v3/data/projects` | Create project `{name, description, status, path}` |
| PUT | `/v3/data/projects/{id}` | Update project |
| DELETE | `/v3/data/projects/{id}` | Delete project |

**Status values:** `active`, `planned`, `completed`, `on-hold`

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/data/tasks` | List tasks |
| POST | `/v3/data/tasks` | Create task |
| PUT | `/v3/data/tasks/{id}` | Update task |
| DELETE | `/v3/data/tasks/{id}` | Delete task |
| POST | `/v3/data/tasks/{id}/toggle` | Toggle complete |

### Alerts & Incidents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/alerts` | List alerts |
| GET | `/v3/alerts/incidents` | List incidents |
| POST | `/v3/alerts/incidents` | Create incident `{title, description, status, priority}` |
| PUT | `/v3/alerts/incidents/{id}` | Update incident |
| POST | `/v3/alerts/{id}/acknowledge` | Acknowledge alert |
| POST | `/v3/alerts/{id}/resolve` | Resolve alert |
| GET | `/v3/alerts/rules` | List alert rules |
| POST | `/v3/alerts/rules` | Create alert rule |

**Priority values:** `P1`, `P2`, `P3`

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/events` | List events |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/agents` | List agents |
| GET | `/v3/agents/{agent_id}/sessions` | Agent sessions |

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/sessions` | List sessions |
| GET | `/v3/sessions/{session_key}/history` | Session history |

### Crons

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/crons` | List cron jobs |
| POST | `/v3/crons` | Create cron job |
| DELETE | `/v3/crons/{job_id}` | Delete cron job |
| POST | `/v3/crons/{job_id}` | Toggle cron job |
| POST | `/v3/crons/{job_id}/run` | Run cron now |
| GET | `/v3/crons/{job_id}/runs` | Cron run history |

### Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/config` | Get full config |
| PATCH | `/v3/config` | Patch full config |
| PATCH | `/v3/config/{path}` | Patch config path |
| GET | `/v3/config/schema` | Get config schema |
| GET | `/v3/config/multi-agent` | Multi-agent config |
| GET | `/v3/config/multi-agent/summary` | Agent summary |

### Config History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/config/history` | List snapshots |
| POST | `/v3/config/snapshot` | Create snapshot |
| GET | `/v3/config/history/{id}` | Get snapshot |
| POST | `/v3/config/restore/{id}` | Restore snapshot |
| DELETE | `/v3/config/history/{id}` | Delete snapshot |
| GET | `/v3/config/history/{id1}/diff/{id2}` | Diff snapshots |

### Memory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/memory/files` | List memory files |
| GET | `/v3/memory/search` | Search memory |
| GET | `/v3/memory/{file_path}` | Read memory file |

### Wiki

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/wiki/index` | Wiki index |
| GET | `/v3/wiki/pages/{directory}` | List pages |
| GET | `/v3/wiki/page/{directory}/{name}` | Read page |
| POST | `/v3/wiki/query` | Query wiki |
| POST | `/v3/wiki/search` | Search wiki |
| POST | `/v3/wiki/ingest` | Ingest source |
| POST | `/v3/wiki/upload` | Upload source |
| GET | `/v3/wiki/stats` | Wiki stats |

### Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/skills` | List skills |
| GET | `/v3/skills/{skill_name}` | Get skill |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/analytics/overview` | Overview |
| GET | `/v3/analytics/trends` | Trends |
| GET | `/v3/analytics/agent-workload` | Agent workload |
| POST | `/v3/analytics/nlp-query` | NLP query |

### Monitoring & Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/health` | Health check |
| GET | `/v3/health/system` | System health |
| GET | `/v3/health/gateway` | Gateway health |
| GET | `/v3/monitoring/summary` | Monitoring summary |
| GET | `/v3/monitoring/system` | System metrics |
| GET | `/v3/monitoring/openclaw` | OpenClaw metrics |
| GET | `/v3/monitoring/history` | Monitoring history |

### Disk

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/disk` | Disk usage |
| POST | `/v3/disk/cleanup` | Cleanup disk |

### Calendar

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/data/calendar/` | Calendar |
| GET | `/v3/data/calendar/overview` | Calendar overview |
| GET | `/v3/data/calendar/tasks` | Calendar tasks |
| GET | `/v3/data/calendar/todo` | Todo list |

### Knowledge Graph

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/data/knowledge/entities` | Entities |
| GET | `/v3/data/knowledge/search` | Search |
| GET | `/v3/data/knowledge/sources` | Sources |
| GET | `/v3/data/knowledge/stats` | Stats |
| GET | `/v3/data/knowledge/timeline` | Timeline |

### Costs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/costs` | Get costs |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/users` | List users |
| POST | `/v3/users/` | Create user |
| GET | `/v3/users/{id}` | Get user |
| PUT | `/v3/users/{id}` | Update user |
| GET | `/v3/users/api-keys` | List API keys |
| POST | `/v3/users/api-keys` | Create API key |

### Workflows

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/workflows` | List workflows |
| POST | `/v3/workflows` | Create workflow |
| PUT | `/v3/workflows/{id}` | Update workflow |
| DELETE | `/v3/workflows/{id}` | Delete workflow |
| POST | `/v3/workflows/{id}/run` | Run workflow |
| GET | `/v3/workflows/{id}/steps` | List steps |
| POST | `/v3/workflows/{id}/steps` | Add step |

### Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/integrations` | List integrations |
| POST | `/v3/integrations` | Create integration |
| PUT | `/v3/integrations/{id}` | Update integration |
| DELETE | `/v3/integrations/{id}` | Delete integration |
| POST | `/v3/integrations/{id}/sync` | Sync integration |
| POST | `/v3/integrations/{id}/test` | Test integration |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/audit/logs` | Audit logs |

### Backups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v3/backups/status` | Backup status |

---

## Common Patterns

### Post to Mission Control (Project Update)

```python
import json, urllib.request

# Login
token = json.loads(urllib.request.urlopen(urllib.request.Request(
    "http://localhost:9000/v3/auth/login",
    data=json.dumps({"username": "admin", "password": "admin123"}).encode(),
    headers={"Content-Type": "application/json"}
)).read())["access_token"]

# Create project
project = {"name": "my-project", "description": "...", "status": "active", "path": "projects/my-project"}
req = urllib.request.Request(
    "http://localhost:9000/v3/data/projects",
    data=json.dumps(project).encode(),
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
)
resp = urllib.request.urlopen(req)
print(json.loads(resp.read()))
```

### Create Incident / Alert

```python
incident = {
    "title": "Something happened",
    "description": "Details here",
    "status": "open",
    "priority": "P3"
}
req = urllib.request.Request(
    "http://localhost:9000/v3/alerts/incidents",
    data=json.dumps(incident).encode(),
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
)
```

### Create Task

```python
task = {"title": "Do something", "status": "open", "priority": "medium"}
req = urllib.request.Request(
    "http://localhost:9000/v3/data/tasks",
    data=json.dumps(task).encode(),
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
)
```

### Check System Health

```python
resp = urllib.request.urlopen(urllib.request.Request(
    "http://localhost:9000/v3/health",
    headers={"Authorization": f"Bearer {token}"}
))
```

### List Crons

```python
resp = urllib.request.urlopen(urllib.request.Request(
    "http://localhost:9000/v3/crons",
    headers={"Authorization": f"Bearer {token}"}
))
print(json.loads(resp.read()))
```

## Notes

- Always login first to get a fresh token
- Use `/v3/` prefixed endpoints (not `/api/` legacy paths)
- Full OpenAPI spec at `claw-portal/openapi.json` (75KB)
- Portal frontend at `http://localhost:5713`
