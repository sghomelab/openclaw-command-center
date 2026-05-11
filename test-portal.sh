#!/bin/bash
# Claw Portal — Smoke Test Script
# Run after every build: bash test-portal.sh
# Tests both direct backend (9000) AND proxy (5713) routes.

set -euo pipefail

BACKEND="http://localhost:9000"
FRONTEND="http://localhost:5713"
PASS=0
FAIL=0
TOTAL=0

check() {
  local name="$1"
  local actual="$2"
  local expected="$3"
  TOTAL=$((TOTAL + 1))
  if [[ "$actual" == "$expected" ]]; then
    echo "  [PASS] $name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $name — expected $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo " Claw Portal Smoke Tests"
echo " $(date)"
echo "========================================"

# Auth
echo ""
echo "Auth"
TOKEN=$(curl -s -X POST "$BACKEND/v3/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
if [[ -z "$TOKEN" || "$TOKEN" == "None" ]]; then
  echo "  [FAIL] Login failed"
  exit 1
fi
echo "  [PASS] Login"
PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1))

# Health
echo ""
echo "Health"
check "Backend health" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/health)" "200"
check "Frontend SPA" "$(curl -s -o /dev/null -w '%{http_code}' $FRONTEND/)" "200"
check "Proxy health" "$(curl -s -o /dev/null -w '%{http_code}' $FRONTEND/v3/health)" "200"

# Tier 1
echo ""
echo "Tier 1 — Core"
check "Agents list" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/agents)" "200"
check "Crons list" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/crons)" "200"
check "Gateway health" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/health)" "200"

# Tier 2
echo ""
echo "Tier 2 — Analytics"
check "Analytics" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/analytics/overview)" "200"
check "Costs" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/costs)" "200"
check "Kanban" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" $BACKEND/v3/data/tasks)" "200"
check "Events" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" $BACKEND/v3/events)" "200"

# Tier 3
echo ""
echo "Tier 3 — Intelligence"
check "Sessions" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/sessions)" "200"
check "Skills" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/skills)" "200"
check "Config" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/config)" "200"
check "Disk" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/disk)" "200"
check "Memory files" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/memory/files)" "200"
check "Memory search" "$(curl -s -o /dev/null -w '%{http_code}' "$BACKEND/v3/memory/search?q=test")" "200"
check "Alerts" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" $BACKEND/v3/alerts/rules)" "200"

# Data shape
echo ""
echo "Data Checks"
CRON_TOTAL=$(curl -s $BACKEND/v3/crons | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null)
if [[ "$CRON_TOTAL" -ge 1 ]]; then
  echo "  [PASS] Cron jobs: $CRON_TOTAL (≥ 1)"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] Cron jobs: $CRON_TOTAL (expected ≥ 1)"
  FAIL=$((FAIL + 1))
fi
TOTAL=$((TOTAL + 1))

SKILL_TOTAL=$(curl -s $BACKEND/v3/skills | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null)
if [[ "$SKILL_TOTAL" -ge 5 ]]; then
  echo "  [PASS] Skills: $SKILL_TOTAL (≥ 5)"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] Skills: $SKILL_TOTAL (expected ≥ 5)"
  FAIL=$((FAIL + 1))
fi
TOTAL=$((TOTAL + 1))

# Monitoring
echo ""
echo "Monitoring"
check "Monitoring system" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/monitoring/system)" "200"
check "Monitoring openclaw" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/monitoring/openclaw)" "200"
check "Monitoring summary" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/monitoring/summary)" "200"

# Verify monitoring data shape
MONITOR_SYSTEM=$(curl -s $BACKEND/v3/monitoring/system | python3 -c "
import sys, json
d = json.load(sys.stdin)
has_disk = 'disk' in d and d['disk'] is not None
has_memory = 'memory' in d and d['memory'] is not None
has_cpu = 'cpu' in d and d['cpu'] is not None
has_load = 'load' in d and d['load'] is not None
has_uptime = 'uptime' in d and d['uptime'] is not None
print('ok' if all([has_disk, has_memory, has_cpu, has_load, has_uptime]) else 'missing')
" 2>/dev/null)
if [[ "$MONITOR_SYSTEM" == "ok" ]]; then
  echo "  [PASS] System metrics: disk, memory, cpu, load, uptime"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] System metrics incomplete"
  FAIL=$((FAIL + 1))
fi
TOTAL=$((TOTAL + 1))

MONITOR_OC=$(curl -s $BACKEND/v3/monitoring/openclaw | python3 -c "
import sys, json
d = json.load(sys.stdin)
has_sessions = 'sessions' in d and isinstance(d['sessions'], int)
has_crons = 'crons' in d and d['crons'] is not None
has_backups = 'backups' in d
print('ok' if all([has_sessions, has_crons, has_backups]) else 'missing')
" 2>/dev/null)
if [[ "$MONITOR_OC" == "ok" ]]; then
  echo "  [PASS] OpenClaw metrics: sessions, crons, backups"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] OpenClaw metrics incomplete"
  FAIL=$((FAIL + 1))
fi
TOTAL=$((TOTAL + 1))

# Backups
check "Backup status" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/backups/status)" "200"

# Proxy POST
echo ""
echo "Proxy"
check "Proxy POST login" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $FRONTEND/v3/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}')" "200"
check "Proxy GET agents" "$(curl -s -o /dev/null -w '%{http_code}' $FRONTEND/v3/agents)" "200"

# Build check
echo ""
echo "Build"
if [[ -f /home/node/.openclaw/workspace-main/memnew/claw-portal/frontend/dist/index.html ]]; then
  echo "  [PASS] dist/ exists"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] dist/index.html missing — run npm run build"
  FAIL=$((FAIL + 1))
fi
TOTAL=$((TOTAL + 1))

# Summary
echo ""
echo "========================================"
echo " Results: $PASS passed, $FAIL failed out of $TOTAL"
echo "========================================"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo " FAIL: $FAIL test(s) failed — fix before deploying"
  exit 1
else
  echo ""
  echo " PASS: All $TOTAL tests passed — ready to deploy"
  exit 0
fi
