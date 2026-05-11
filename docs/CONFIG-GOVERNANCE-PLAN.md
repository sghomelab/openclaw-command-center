# Configuration Governance - Implementation Plan

**Created:** 2026-05-11  
**Feature:** Tier 3.3  
**Target:** Claw Portal v5.0.0  
**Status:** Planning  

---

## Current State

### What exists today:
- `ConfigEditor.jsx` (150 lines) - basic JSON viewer/editor
- `backend/app/api/routes/config.py` - GET config, PATCH individual paths
- Reads `/home/node/.openclaw/openclaw.json` directly
- No diff view, no history, no rollback, no schema validation

### Gaps:
- ❌ Config diff view (what changed?)
- ❌ Config history/rollback (undo mistakes)
- ❌ Schema validation before save
- ❌ Audit trail of who changed what
- ❌ Config backup before changes
- ❌ Multi-agent config view (7 agents)

---

## Architecture

```
Frontend                          Backend
├── pages/                        ├── api/routes/
│   ├── ConfigEditor.jsx          │   ├── config.py (expand)
│   ├── ConfigDiff.jsx (NEW)      │   └── config-history.py (NEW)
│   └── ConfigAudit.jsx (NEW)     ├── services/
├── components/                   │   └── config_validator.py (NEW)
│   └── JsonDiffViewer.jsx        └── models/
└── hooks/                        └── ConfigSnapshot.py (NEW)
    ├── useConfig.js
    └── useConfigHistory.js (NEW)
```

---

## Implementation Steps

### Phase 1: Config History & Backup (v5.0.0)

**Goal:** Track every config change with automatic snapshots.

#### Backend:
1. **Config snapshot service**
   - Before any PATCH, save current config to `~/.openclaw/config-backups/`
   - Format: `config-YYYYMMDD-HHmmss.json`
   - Keep last 30 days (auto-cleanup)
   - Metadata: timestamp, user, diff summary

2. **History API**
   - `GET /v3/config/history` - list snapshots
   - `GET /v3/config/history/{snapshot_id}` - retrieve snapshot
   - `GET /v3/config/history/{id1}/diff/{id2}` - JSON diff between snapshots
   - `POST /v3/config/restore/{snapshot_id}` - rollback to snapshot

3. **Database schema**
   ```sql
   CREATE TABLE config_snapshots (
       id INTEGER PRIMARY KEY,
       timestamp TEXT NOT NULL,
       user TEXT NOT NULL,
       config_json TEXT NOT NULL,
       diff_summary TEXT,
       change_reason TEXT
   );
   ```

#### Frontend:
1. **Config Editor upgrade**
   - Add "Backup before save" toggle (default: on)
   - Add "What changed?" indicator (highlight modified paths)
   - Show last saved timestamp

2. **Config History page** (new)
   - Timeline view of snapshots
   - Click to view diff vs current
   - "Rollback" button with confirmation modal
   - Filter by user/date range

---

### Phase 2: Schema Validation (v5.0.0)

**Goal:** Prevent invalid configs from being saved.

#### Backend:
1. **Config validator service**
   - Load OpenClaw config schema from `config.schema.lookup`
   - Validate patched values before applying
   - Return validation errors with field paths

2. **Validation API**
   - `POST /v3/config/validate` - dry-run validation
   - `POST /v3/config/validate/diff` - validate proposed changes
   - Integrate into PATCH endpoint (fail fast on invalid)

#### Frontend:
1. **Real-time validation**
   - Show validation errors inline as user types
   - Block save until all errors resolved
   - Link to schema documentation per field

---

### Phase 3: Audit Trail (v5.1.0)

**Goal:** Full audit log of all config changes.

#### Backend:
1. **Audit logging**
   - Every config change logged with: who, when, what, why
   - Include before/after values for changed paths
   - Store in SQLite (config_snapshots table)
   - Optional: push to OpenClaw audit log via Gateway

2. **Audit API**
   - `GET /v3/config/audit` - list all changes
   - `GET /v3/config/audit?user=X&date=Y` - filtered
   - `GET /v3/config/audit/{id}` - detailed change record

#### Frontend:
1. **Audit Log page** (new)
   - Table view with: timestamp, user, path changed, old→new value
   - Search/filter by user, date, config path
   - Export to CSV
   - "Why?" field for change reason

---

### Phase 4: Multi-Agent Config View (v5.1.0)

**Goal:** View and compare configs across all 7 agents.

#### Frontend:
1. **Agent Config Browser**
   - Tree view showing all agent configs side-by-side
   - Highlight differences between agents
   - "Sync setting across agents" action (with confirmation)

---

## File Changes Summary

| File | Lines | Status |
|------|-------|--------|
| `backend/app/api/routes/config.py` | +150 | Extended with history, validation |
| `backend/app/api/routes/config-history.py` | +200 | NEW - history/rollback endpoints |
| `backend/app/services/config_validator.py` | +100 | NEW - schema validation service |
| `backend/app/models/ConfigSnapshot.py` | +50 | NEW - SQLAlchemy model |
| `frontend/src/pages/ConfigEditor.jsx` | +80 | Upgraded with diff/validation |
| `frontend/src/pages/ConfigDiff.jsx` | +120 | NEW - diff viewer page |
| `frontend/src/pages/ConfigAudit.jsx` | +150 | NEW - audit log page |
| `frontend/src/components/JsonDiffViewer.jsx` | +90 | NEW - unified diff component |
| `frontend/src/hooks/useConfigHistory.js` | +60 | NEW - history management |
| `frontend/src/App.jsx` | +6 | Route registrations |
| `frontend/src/components/Sidebar.jsx` | +4 | Config nav links |

**Total:** ~1,000 lines added, 2 new pages, 3 new backend services

---

## Dependencies

- OpenClaw `config.schema.lookup` API must be available
- Gateway config.patch must support the changes
- SQLite database already exists (claw_portal.db)
- No external dependencies beyond existing stack

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Invalid config breaks Gateway | Medium | High | Schema validation before save, auto-rollback |
| Backup bloat | Low | Low | Keep last 30 days, auto-cleanup |
| Concurrent edits | Low | Medium | Lock during save, show last-saved timestamp |
| Schema changes | Medium | Low | Re-fetch schema on page load, graceful fallback |

---

## Timeline

- **Phase 1:** 2-3 hours (history + backup)
- **Phase 2:** 1-2 hours (validation)
- **Phase 3:** 2-3 hours (audit trail)
- **Phase 4:** 1-2 hours (multi-agent view)
- **Total:** 6-10 hours

---

## Success Criteria

1. ✅ Config changes automatically backed up before save
2. ✅ Schema validation prevents invalid configs
3. ✅ Full audit trail of who changed what and when
4. ✅ Rollback to any previous config state
5. ✅ Diff view shows exactly what changed
6. ✅ Zero config-related incidents after deployment

---

*Ready for implementation. Awaiting approval to proceed.*
