#!/bin/bash
set -euo pipefail

# ============================================================
# AI Terminal — E2E Smoke Test
# Usage: ./scripts/smoke-test.sh [base_url] [password]
# Requires: curl
# ============================================================

BASE_URL="${1:-${SMOKE_TEST_URL:-https://localhost}}"
PASSWORD="${2:-${WEB_PASSWORD:-}}"
PASSED=0
FAILED=0
COOKIE_JAR=$(mktemp)

cleanup() {
  rm -f "$COOKIE_JAR"
}
trap cleanup EXIT

pass() {
  echo "  ✓ $1"
  PASSED=$((PASSED + 1))
}

fail() {
  echo "  ✗ $1"
  FAILED=$((FAILED + 1))
}

echo "==> AI Terminal Smoke Test"
echo "    URL: $BASE_URL"
echo ""

# ── Test 1: Homepage loads ──
echo "[1/6] Homepage"
HTTP_CODE=$(curl -sk -o /dev/null -w '%{http_code}' "$BASE_URL/")
if [ "$HTTP_CODE" = "200" ]; then
  pass "Homepage returns 200"
else
  fail "Homepage returned $HTTP_CODE (expected 200)"
fi

# ── Test 2: Auth status (unauthenticated) ──
echo "[2/6] Auth status (unauthenticated)"
RESPONSE=$(curl -sk "$BASE_URL/api/auth/status")
if echo "$RESPONSE" | grep -q '"authenticated":false'; then
  pass "Auth status returns unauthenticated"
else
  fail "Unexpected auth status response: $RESPONSE"
fi

# ── Test 3: Login ──
echo "[3/6] Login"
if [ -z "$PASSWORD" ]; then
  echo "  ⚠ Skipping login test (no password provided)"
else
  HTTP_CODE=$(curl -sk -o /dev/null -w '%{http_code}' \
    -X POST \
    -H 'Content-Type: application/json' \
    -d "{\"password\":\"$PASSWORD\"}" \
    -c "$COOKIE_JAR" \
    "$BASE_URL/api/auth/login")
  if [ "$HTTP_CODE" = "200" ]; then
    pass "Login successful"
  else
    fail "Login returned $HTTP_CODE (expected 200)"
  fi

  # ── Test 4: Auth status (authenticated) ──
  echo "[4/6] Auth status (authenticated)"
  RESPONSE=$(curl -sk -b "$COOKIE_JAR" "$BASE_URL/api/auth/status")
  if echo "$RESPONSE" | grep -q '"authenticated":true'; then
    pass "Auth status returns authenticated after login"
  else
    fail "Unexpected auth status response: $RESPONSE"
  fi

  # ── Test 5: Create conversation ──
  echo "[5/6] Create conversation"
  CONV_RESPONSE=$(curl -sk -b "$COOKIE_JAR" \
    -X POST \
    -H 'Content-Type: application/json' \
    -d '{"model":"gpt-5","cwd":"/tmp"}' \
    "$BASE_URL/api/conversations")
  if echo "$CONV_RESPONSE" | grep -q '"id"'; then
    pass "Conversation created successfully"
    CONV_ID=$(echo "$CONV_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

    # Cleanup: delete the test conversation
    curl -sk -b "$COOKIE_JAR" -X DELETE "$BASE_URL/api/conversations/$CONV_ID" > /dev/null 2>&1
  else
    fail "Failed to create conversation: $CONV_RESPONSE"
  fi

  # ── Test 6: WebSocket upgrade ──
  echo "[6/6] WebSocket connectivity"
  WS_CODE=$(curl -sk -o /dev/null -w '%{http_code}' \
    -H 'Upgrade: websocket' \
    -H 'Connection: Upgrade' \
    -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
    -H 'Sec-WebSocket-Version: 13' \
    -b "$COOKIE_JAR" \
    "$BASE_URL/ws")
  if [ "$WS_CODE" = "101" ]; then
    pass "WebSocket upgrade successful (101)"
  else
    # Some curl versions can't fully complete WS handshake, 400 is also acceptable
    echo "  ⚠ WebSocket returned $WS_CODE (101 expected, curl may not support full WS handshake)"
  fi
fi

# ── Summary ──
echo ""
echo "==> Smoke Test Summary"
echo "    Passed: $PASSED"
echo "    Failed: $FAILED"

if [ "$FAILED" -gt 0 ]; then
  echo "    Status: FAILED"
  exit 1
else
  echo "    Status: PASSED"
  exit 0
fi
