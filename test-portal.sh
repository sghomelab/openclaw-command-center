#!/bin/bash
# Claw Portal — Smoke Test Script
# Run after every build to catch regressions before deployment.
# Usage: bash test-portal.sh
#
# Tests both direct backend (9000) AND proxy (5713) routes.

set -euo pipefail

BACKEND="http://localhost:9000"
FRONTEND="http://localhost:5713"
PASS=0
FAIL=0
TOTAL=0

# Colours
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() {
  local name="$1"
  local actual="$2"
  local expected="$3"
  TOTAL=$((TOTAL + 1))
  if [[ "$actual" == "$expected" ]]; then
    echo -e "  ${GREEN}✓${NC} $name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $name — expected $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo " Claw Portal Smoke Tests"
echo " $(date)"
echo "========================================"

# Get auth token
echo ""
echo "🔐 Authentication"
TOKEN=$(curl -s -X POST "$BACKEND/v3/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

if [[ -z "$TOKEN" || "$TOKEN" == "None" ]]; then
  echo -e "  ${RED}✗${NC} Login failed — check backend and credentials"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Login successful"
PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1))

# Auth token via proxy
echo ""
echo "🔐 Proxy Authentication"
PROXY_TOKEN=$(curl -s -X POST "$FRONTEND/v3/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

check "Proxy login" "${PROXY_TOKEN:0:5}" "${TOKEN:0:5}"

# Basic health
echo ""
echo "🏥 Health & Status"
check "Backend health" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/health)" "200"
check "Frontend SPA" "$(curl -s -o /dev/null -w '%{http_code}' $FRONTEND/)" "200"
check "Proxy health" "$(curl -s -o /dev/null -w '%{http_code}' $FRONTEND/v3/health)" "200"

# Tier 1 features
echo ""
echo "📊 Tier 1 — Core Features"
check "Agents list" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/agents)" "200"
check "Crons list" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/crons)" "200"
check "Gateway health" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/health)" "200"

# Tier 2 features
echo ""
echo "📈 Tier 2 — Analytics & Management"
check "Analytics overview" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/analytics/overview)" "200"
check "Cost analytics" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/costs)" "200"
check "Kanban tasks" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" $BACKEND/v3/data/tasks)" "200"
check "Events feed" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" $BACKEND/v3/events 2>/dev/null || echo '404')" "200"
# Tier 3 features
echo ""
echo "🚀 Tier 3 — Intelligence & Integration"
check "Sessions list" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/sessions)" "200"
check "Skills list" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/skills)" "200"
check "Config read" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/config 2>/dev/null || echo '500')" "200"
check "Disk usage" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/disk)" "200"check "Memory files" "$(curl -s -o /dev/null -w '%{http_code}' $BACKEND/v3/memory/files)" "200"
check "Memory search" "$(curl -s -o /dev/null -w '%{http_code}' "$BACKEND/v3/memory/search?q=defence")" "200"
check "Alerts rules" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" $BACKEND/v3/alerts/rules 2>/dev/null || echo '401')" "200"
# Data shape checks
echo ""
echo "🧪 Data Shape Checks"
CRONS=$(curl -s $BACKEND/v3/crons)
CRON_TOTAL=$(echo "$CRONS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null)
echo -e "  ${YELLOW}ⓘ${NC} Cron jobs found: $CRON_TOTAL (expected ≥ 1)"
if [[ "$CRON_TOTAL" -ge 1 ]]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi; TOTAL=$((TOTAL+1))

SKILLS=$(curl -s $BACKEND/v3/skills)
SKILL_TOTAL=$(echo "$SKILLS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null)
echo -e "  ${YELLOW}ⓘ${NC} Skills found: $SKILL_TOTAL (expected ≥ 5)"
if [[ "$SKILL_TOTAL" -ge 5 ]]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi; TOTAL=$((TOTAL+1))

# Proxy POST tests (critical for login, form submissions)
echo ""
echo "🔄 Proxy POST/PUT/DELETE"
check "Proxy POST /v3/auth/login" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $FRONTEND/v3/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}')" "200"
check "Proxy GET /v3/agents" "$(curl -s -o /dev/null -w '%{http_code}' $FRONTEND/v3/agents)" "200"

# Frontend build check
echo ""
echo "📦 Frontend Build"
if [[ -f /home/node/.openclaw/workspace-main/memnew/claw-portal/frontend/dist/index.html ]]; then
  BUILD_DATE=$(stat -c %y /home/node/.openclaw/workspace-main/memnew/claw-portal/frontend/dist/index.html 2>/dev/null || echo "unknown")
  echo -e "  ${GREEN}✓${NC} dist/ exists (built: $BUILD_DATE)"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}✗${NC} dist/index.html missing — run npm run build"
  FAIL=$((FAIL + 1))
fi
TOTAL=$((TOTAL + 1))

# Summary
echo ""
echo "========================================"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC} out of $TOTAL tests"
echo "========================================"

if [[ $FAIL -gt 0 ]]; then
  echo -e "\n${RED}❌ $FAIL test(s) failed — fix before deploying${NC}"
  exit 1
else
  echo -e "\n${GREEN}✅ All tests passed — ready to deploy${NC}"
  exit 0
fi
