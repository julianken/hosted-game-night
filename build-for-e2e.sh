#!/bin/bash

# =============================================================================
# Build Apps for E2E Testing with Worktree Port Isolation
# =============================================================================
# This script builds each app individually with correct NEXT_PUBLIC_* OAuth
# URLs baked into the production bundles for the worktree's port configuration.
#
# CRITICAL: This is the ONLY way to properly test OAuth flows in worktrees.
# Environment variables must be set AT BUILD TIME, not at runtime, because
# Next.js replaces NEXT_PUBLIC_* variables during the webpack build process.
#
# Usage:
#   ./build-for-e2e.sh
#
# Prerequisites:
#   - .env.e2e must exist (created by scripts/setup-worktree-e2e.sh)
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the E2E environment for port configuration
if [ -f "$SCRIPT_DIR/.env.e2e" ]; then
  source "$SCRIPT_DIR/.env.e2e"
else
  echo "Error: .env.e2e not found. Run scripts/setup-worktree-e2e.sh first."
  exit 1
fi

echo "==================================================================="
echo "Building Apps for E2E Testing with Worktree Ports"
echo "==================================================================="
echo "Worktree: $WORKTREE_PATH"
echo "Ports: Bingo=$BINGO_PORT, Trivia=$TRIVIA_PORT, Hub=$HUB_PORT"
echo ""

cd "$SCRIPT_DIR"

# Build shared packages first
echo "Step 1: Building shared packages..."
echo "-------------------------------------------------------------------"
pnpm --filter "./packages/*" build
echo ""

# Build Bingo with worktree OAuth URLs
echo "Step 2: Building Bingo app (OAuth redirect: $BINGO_PORT)..."
echo "-------------------------------------------------------------------"
NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:$BINGO_PORT/auth/callback \
NEXT_PUBLIC_OAUTH_CONSENT_URL=http://localhost:$HUB_PORT/oauth/consent \
NEXT_PUBLIC_PLATFORM_HUB_URL=http://localhost:$HUB_PORT \
pnpm --filter @beak-gaming/bingo build
echo ""

# Build Trivia with worktree OAuth URLs
echo "Step 3: Building Trivia app (OAuth redirect: $TRIVIA_PORT)..."
echo "-------------------------------------------------------------------"
NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:$TRIVIA_PORT/auth/callback \
NEXT_PUBLIC_OAUTH_CONSENT_URL=http://localhost:$HUB_PORT/oauth/consent \
NEXT_PUBLIC_PLATFORM_HUB_URL=http://localhost:$HUB_PORT \
pnpm --filter @beak-gaming/trivia build
echo ""

# Build Platform Hub (no special OAuth config needed)
echo "Step 4: Building Platform Hub..."
echo "-------------------------------------------------------------------"
pnpm --filter @beak-gaming/platform-hub build
echo ""

echo "==================================================================="
echo "✓ All apps built with worktree OAuth URLs"
echo "==================================================================="
echo ""
echo "OAuth URLs baked into bundles:"
echo "  - Bingo redirect:    http://localhost:$BINGO_PORT/auth/callback"
echo "  - Trivia redirect:   http://localhost:$TRIVIA_PORT/auth/callback"
echo "  - OAuth consent:     http://localhost:$HUB_PORT/oauth/consent"
echo "  - Platform Hub URL:  http://localhost:$HUB_PORT"
echo ""
echo "Next steps:"
echo "  1. Start servers:    ./start-e2e-servers.sh"
echo "  2. Run tests:        pnpm test:e2e"
