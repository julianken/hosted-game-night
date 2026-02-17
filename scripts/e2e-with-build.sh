#!/usr/bin/env bash
#
# E2E Test Runner with Production Builds
#
# This script runs E2E tests using production builds instead of dev servers.
# Production builds are more stable under load (no webpack dev server overhead).
#
# Usage:
#   ./scripts/e2e-with-build.sh [playwright args...]
#
# Examples:
#   ./scripts/e2e-with-build.sh                    # Run all tests
#   ./scripts/e2e-with-build.sh e2e/bingo         # Run bingo tests only
#   ./scripts/e2e-with-build.sh --headed           # Run with browser UI
#
# Smart Server Detection:
#   - If dev servers are already running on ports 3000-3002, they will be used
#   - If no servers are running, production servers are started and cleaned up
#   - Your manually-started dev servers are PRESERVED (not killed)
#
# Prerequisites:
#   - .env.local files must exist in apps/bingo, apps/trivia, apps/platform-hub
#   - SESSION_TOKEN_SECRET must be set in all .env.local files
#
# Why Production Builds:
#   - 50-70% lower memory footprint (no webpack dev server)
#   - No file watching overhead
#   - More stable under parallel test load
#   - Matches production environment
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}E2E Tests with Production Builds${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Validate environment
echo -e "${YELLOW}[1/5] Validating environment...${NC}"

if [ ! -f "$REPO_ROOT/.env" ]; then
  echo -e "${RED}✗ Missing .env file in repository root${NC}"
  echo "  Create it with: cp apps/bingo/.env.local .env"
  exit 1
fi

for app in bingo trivia platform-hub; do
  if [ ! -f "$REPO_ROOT/apps/$app/.env.local" ]; then
    echo -e "${RED}✗ Missing .env.local in apps/$app${NC}"
    exit 1
  fi
done

echo -e "${GREEN}✓ Environment validated${NC}"
echo ""

# Step 2: Build all apps
echo -e "${YELLOW}[2/5] Building apps for production...${NC}"
echo "  This may take 30-60 seconds..."

if ! pnpm build > /tmp/e2e-build.log 2>&1; then
  echo -e "${RED}✗ Build failed${NC}"
  echo "  Check /tmp/e2e-build.log for details"
  tail -50 /tmp/e2e-build.log
  exit 1
fi

echo -e "${GREEN}✓ Apps built successfully${NC}"
echo ""

# Step 3: Check for existing servers
echo -e "${YELLOW}[3/5] Checking for existing servers...${NC}"

SERVERS_ALREADY_RUNNING=false
BINGO_PID=""
TRIVIA_PID=""
HUB_PID=""

# Check if servers are already running and responsive
for port in 3000 3001 3002; do
  if curl -s -f "http://localhost:$port" > /dev/null 2>&1; then
    case $port in
      3000) app="Bingo" ;;
      3001) app="Trivia" ;;
      3002) app="Platform Hub" ;;
    esac
    PID=$(lsof -ti:$port 2>/dev/null || true)
    echo "  ✓ $app already running on port $port (PID: $PID)"
    SERVERS_ALREADY_RUNNING=true
  fi
done

if [ "$SERVERS_ALREADY_RUNNING" = true ]; then
  echo ""
  echo -e "${GREEN}✓ Using existing servers (dev servers preserved)${NC}"
  echo ""

  # Step 4: Skip server startup
  echo -e "${YELLOW}[4/5] Servers already running (skipped)${NC}"
  echo -e "${GREEN}✓ All servers ready${NC}"
else
  echo "  No responsive servers found"
  echo -e "${GREEN}✓ Check complete${NC}"
  echo ""

  # Step 4: Start production servers in background
  echo -e "${YELLOW}[4/5] Starting production servers...${NC}"

  # Set E2E_TESTING flag for all servers
  export E2E_TESTING=true

  # Start servers in background, redirecting output to log files
  pnpm --filter @joolie-boolie/bingo start > /tmp/e2e-bingo.log 2>&1 &
  BINGO_PID=$!
  echo "  Bingo server started (PID: $BINGO_PID, port 3000)"

  pnpm --filter @joolie-boolie/trivia start > /tmp/e2e-trivia.log 2>&1 &
  TRIVIA_PID=$!
  echo "  Trivia server started (PID: $TRIVIA_PID, port 3001)"

  pnpm --filter @joolie-boolie/platform-hub start > /tmp/e2e-hub.log 2>&1 &
  HUB_PID=$!
  echo "  Platform Hub server started (PID: $HUB_PID, port 3002)"

  # Wait for servers to be ready
  echo ""
  echo "  Waiting for servers to be ready..."
  sleep 5

  # Health check
  for port in 3000 3001 3002; do
    if ! curl -s -f "http://localhost:$port" > /dev/null 2>&1; then
      echo -e "${RED}✗ Server on port $port is not responding${NC}"
      echo "  Check /tmp/e2e-*.log files for errors"
      # Kill all servers we started
      kill $BINGO_PID $TRIVIA_PID $HUB_PID 2>/dev/null || true
      exit 1
    fi
  done

  echo -e "${GREEN}✓ All servers ready${NC}"
fi
echo ""

# Step 5: Run E2E tests
echo -e "${YELLOW}[5/5] Running E2E tests...${NC}"
echo ""

# Function to cleanup servers on exit
cleanup() {
  # Only kill servers if we started them (PIDs are set)
  if [ -n "$BINGO_PID" ] || [ -n "$TRIVIA_PID" ] || [ -n "$HUB_PID" ]; then
    echo ""
    echo -e "${YELLOW}Cleaning up servers started by script...${NC}"
    [ -n "$BINGO_PID" ] && kill $BINGO_PID 2>/dev/null || true
    [ -n "$TRIVIA_PID" ] && kill $TRIVIA_PID 2>/dev/null || true
    [ -n "$HUB_PID" ] && kill $HUB_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Cleanup complete${NC}"
  fi
}

# Register cleanup on script exit
trap cleanup EXIT

# Run Playwright with any additional args passed to script
# Temporarily disable set -e so we can capture the exit code on failure
set +e
pnpm playwright test "$@"
EXIT_CODE=$?
set -e

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}✓ E2E tests completed successfully${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}✗ E2E tests failed${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

# Always show the test summary (even on failure)
echo ""
echo -e "${YELLOW}Generating test summary...${NC}"
node "$SCRIPT_DIR/test-summary.js" || true

exit $EXIT_CODE
