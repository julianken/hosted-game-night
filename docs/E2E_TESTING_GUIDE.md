# E2E Testing Guide

## ⚠️ CRITICAL: Pre-Commit Requirements

**ALL CODE CHANGES MUST HAVE PASSING E2E TESTS LOCALLY BEFORE COMMITTING**

GitHub Actions are disabled to avoid billing costs. Local E2E validation is mandatory.

---

## Quick Start

### Prerequisites

```bash
# 1. Valid .env files in ALL apps (required for Next.js middleware)
# Generate SESSION_TOKEN_SECRET with:
openssl rand -hex 32

# Required in .env files:
# - .env (root - for Playwright global setup)
# - apps/bingo/.env.local
# - apps/trivia/.env.local
# - apps/platform-hub/.env.local

# Each file needs:
NEXT_PUBLIC_SUPABASE_URL=https://iivxpjhmnalsuvpdzgza.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_LvRIpm-i3o17HecBwfQckg_wTVe8WPM
SUPABASE_SERVICE_ROLE_KEY=sb_secret_Lx7THLMj2aYmg2HjqncGIw_PDrV3BPT
SESSION_TOKEN_SECRET=<64-character-hex-string-from-openssl>
```

### Running E2E Tests

```bash
# 1. Start all dev servers with E2E testing mode (IMPORTANT!)
# This enables auth bypass to avoid Supabase rate limits
pnpm dev:e2e

# OR regular dev (without E2E auth bypass):
pnpm dev

# OR start individually:
pnpm dev:bingo    # Port 3000
pnpm dev:trivia   # Port 3001
pnpm dev:hub      # Port 3002

# 2. Verify servers are running (should show 0.0% CPU when idle)
ps aux | grep next-server

# 3. Check servers respond
curl -I http://localhost:3000
curl -I http://localhost:3001
curl -I http://localhost:3002/login

# 4. Run E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e e2e/bingo/room-setup.spec.ts

# Run specific test
pnpm test:e2e -g "should show room setup modal"

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Run with UI mode (interactive)
pnpm test:e2e --ui
```

### Understanding Test Results

**CRITICAL:** Always run the summary command to see failure counts clearly:

```bash
# Step 1: Run tests (generates JSON results)
pnpm test:e2e

# Step 2: View clear summary
pnpm test:e2e:summary

Test Results Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  155 failed      ← ALWAYS clearly visible
  45 skipped
  138 passed
  338 total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Why the summary command is necessary:**
- Terminal output may not show failure counts (background runs, TTY issues)
- The JSON reporter writes complete results to `test-results/results.json`
- `pnpm test:e2e:summary` parses JSON and displays counts clearly
- **NEVER claim "no failures" without checking the summary**

**Viewing failure details:**

```bash
# View detailed results
ls test-results/

# View screenshots of failures
open test-results/<test-name>/test-failed-1.png

# View error context (page snapshot)
cat test-results/<test-name>/error-context.md
```

---

## Production Build Testing

Some PWA tests require service worker functionality that only works in production builds (not dev mode with `pnpm dev`).

### Running Production E2E Tests

```bash
# Option 1: Automated script (builds, starts, tests, kills)
pnpm test:e2e:prod

# Option 2: Manual control
pnpm build              # Build all apps
pnpm start              # Start production servers
pnpm test:e2e  # Run E2E tests
# Kill servers when done (Ctrl+C)
```

### Which Tests Require Production?

Tests marked with `test.skip` and a TODO comment:

```typescript
test.skip('test name', async ({ page, context }) => {
  // TODO: Requires service worker (production build only)
  // Run with: pnpm build && pnpm start && pnpm test:e2e

  // Test implementation...
});
```

These tests typically involve:
- Offline page reloads (`context.setOffline(true)` + `page.reload()`)
- PWA caching behavior
- Service worker registration

### Why Skip in Dev Mode?

Service workers don't register in dev mode:
- `next dev` disables service worker registration
- Without service worker, offline reloads fail with `net::ERR_INTERNET_DISCONNECTED`
- PWA features (offline cache, background sync) unavailable

### When to Run Production Tests?

- Before releasing PWA features
- When debugging offline functionality
- When validating service worker changes
- Not required for regular development (skipped tests don't block commits)

---

## Common Issues

### Issue: "Missing environment variables"

**Symptom**: Global setup fails with "Missing required environment variables"

**Cause**: Missing `.env` file in project root

**Fix**:
```bash
# Create .env in project root
cp apps/bingo/.env.local .env
```

### Issue: "Test timeout at login page"

**Symptom**: All tests timeout at `page.goto('http://localhost:3002/login')`

**Cause**: Platform Hub server not running or crashed

**Fix**:
```bash
# Check Platform Hub logs
pnpm dev:hub

# If server hung (100%+ CPU), kill and restart
pkill -f next-server
pnpm dev:hub
```

### Issue: "SESSION_TOKEN_SECRET must contain only hexadecimal characters"

**Symptom**: Next.js Runtime Error dialog in test screenshots

**Cause**: Invalid SESSION_TOKEN_SECRET in .env.local files

**Fix**:
```bash
# Generate valid secret
openssl rand -hex 32

# Update ALL .env.local files with the SAME value:
# - apps/bingo/.env.local
# - apps/trivia/.env.local
# - apps/platform-hub/.env.local
# - .env (root)
```

### Issue: "page.reload: net::ERR_INTERNET_DISCONNECTED"

**Symptom**: Tests that set offline mode fail on reload

**Cause**: PWA service worker not registered (requires build, not dev mode)

**Status**: Known limitation - these tests need service worker support

---

## Integration with Parallel Workflow

### When Using `Skill(subagent-workflow)`

**Step 1: After Implementation**
```bash
# Implementer agent completes task
# → BEFORE marking task complete, run E2E tests

pnpm test:e2e e2e/<relevant-test-file>.spec.ts
```

**Step 2: In Spec Review**
```bash
# Spec reviewer verifies implementation
# → MUST include E2E test verification

# Check test results match requirements
pnpm test:e2e e2e/<relevant-test-file>.spec.ts
```

**Step 3: In Quality Review**
```bash
# Quality reviewer checks code quality
# → MUST verify E2E tests pass

pnpm test:e2e  # Run ALL tests
```

**Step 4: Before Creating PR**
```bash
# Final validation before merge
pnpm test:e2e  # ALL tests must pass

# If any failures:
# 1. DO NOT create PR
# 2. Dispatch new implementer to fix failures
# 3. Re-run review cycle
```

### Parallel Task Execution with Port Isolation

Each agent in a separate worktree can run E2E tests **truly in parallel** using automatic port isolation.

**How Port Isolation Works:**

1. **Main repo**: Uses default ports 3000, 3001, 3002
2. **Worktrees**: Use hash-based port offsets derived from the worktree path
3. **Environment variables**: Can override ports manually if needed

**Setup for Parallel Testing:**

```bash
# In a worktree (e.g., .worktrees/wt-BEA-334)
cd .worktrees/wt-BEA-334

# Run the setup script (creates .env.e2e and helper scripts)
./scripts/setup-worktree-e2e.sh

# Start servers with isolated ports
./start-e2e-servers.sh

# Run E2E tests (Playwright auto-detects ports)
pnpm test:e2e
```

**Or manually:**

```bash
# The Playwright config auto-detects worktree and calculates ports
# Just run tests - ports are determined by the worktree path hash

# Worktree A: Agent fixing BEA-334 (gets ports like 3156, 3157, 3158)
cd .worktrees/wt-BEA-334
source .env.e2e  # If setup script was run
./start-e2e-servers.sh
pnpm test:e2e e2e/bingo/room-setup.spec.ts

# Worktree B: Agent fixing BEA-335 (gets different ports like 3279, 3280, 3281)
cd .worktrees/wt-BEA-335
source .env.e2e
./start-e2e-servers.sh
pnpm test:e2e e2e/trivia/other-feature.spec.ts
```

**Port Allocation:**
- Ports are calculated deterministically from the worktree path
- Same worktree always gets the same ports
- Different worktrees get different ports (with high probability)
- Port range: 3000-3999 (supports up to 333 concurrent worktrees)

**Environment Variable Overrides:**
```bash
# Override all ports with a base
E2E_PORT_BASE=3100 pnpm test:e2e  # Uses 3100, 3101, 3102

# Override individual ports
E2E_BINGO_PORT=3100 E2E_TRIVIA_PORT=3101 E2E_HUB_PORT=3102 pnpm test:e2e
```

---

## E2E Test Checklist (Mandatory)

Before committing ANY code that affects UI or user flows:

- [ ] All dev servers running (bingo, trivia, platform-hub)
- [ ] Servers responding to requests (curl checks pass)
- [ ] `.env.local` files present in all apps
- [ ] SESSION_TOKEN_SECRET is valid 64-char hex string
- [ ] E2E tests for affected features run locally
- [ ] ALL relevant E2E tests pass (0 failures)
- [ ] Test screenshots reviewed (no unexpected UI states)
- [ ] If tests fail: Fix code OR update tests, then re-run

**If tests fail**: DO NOT commit. Fix the failures first.

---

## Writing New E2E Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { waitForRoomSetupModal } from '../utils/helpers';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ authenticatedBingoPage: page }) => {
    // Clear state before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await waitForHydration(page);
  });

  test('should do something', async ({ authenticatedBingoPage: page }) => {
    // Test implementation
    await expect(page.getByRole('button')).toBeVisible();
  });
});
```

### Best Practices

1. **Use semantic selectors**: `getByRole`, `getByLabel`, `getByText`
2. **Avoid CSS selectors**: Brittle, breaks on style changes
3. **Wait for states**: Use `waitForLoadState`, `waitForSelector`
4. **Clean state**: Clear localStorage/sessionStorage in beforeEach
5. **Take screenshots**: Failures auto-capture, but add manual ones for key states
6. **Test both happy and error paths**

---

## Debugging Failed Tests

### 1. Check Screenshots

```bash
# View failure screenshot
open test-results/<test-name>/test-failed-1.png
```

### 2. Check Error Context

```bash
# View page accessibility tree snapshot
cat test-results/<test-name>/error-context.md
```

### 3. Run in Headed Mode

```bash
# See browser actions in real-time
pnpm test:e2e --headed --project=bingo
```

### 4. Use UI Mode (Interactive)

```bash
# Step through test execution
pnpm test:e2e --ui
```

### 5. Check Server Logs

```bash
# If test hangs, check server process
ps aux | grep next-server

# If server at 100%+ CPU, it's hung - restart
pkill -f next-server
pnpm dev
```

---

## CI/CD Without GitHub Actions

Since GitHub Actions are disabled:

1. **Local validation is mandatory** (this guide)
2. **Vercel builds still run** (build-time validation)
3. **Pre-commit hooks** catch lint/type errors
4. **E2E tests are developer responsibility**

### Why No GitHub Actions?

- **Cost**: Avoid billing for CI minutes
- **Local-first**: Developers run tests on realistic environments
- **Faster feedback**: No waiting for CI queue
- **Full control**: Debug issues immediately with headed mode

---

## Port Reference

### Default Ports (Main Repo)

| Service | Port | URL |
|---------|------|-----|
| Bingo | 3000 | http://localhost:3000 |
| Trivia | 3001 | http://localhost:3001 |
| Platform Hub | 3002 | http://localhost:3002 |

### Dynamic Ports (Worktrees)

When running in a git worktree, ports are automatically calculated based on the worktree path:

| Scenario | Bingo | Trivia | Hub | How Determined |
|----------|-------|--------|-----|----------------|
| Main repo | 3000 | 3001 | 3002 | Default |
| Worktree A | 3XXX | 3XXX+1 | 3XXX+2 | Hash of path |
| Worktree B | 3YYY | 3YYY+1 | 3YYY+2 | Hash of path |
| E2E_PORT_BASE=3100 | 3100 | 3101 | 3102 | Environment |

**Playwright auto-detects ports** based on whether you're in a worktree or main repo.

### Checking Current Ports

```bash
# Playwright logs the port configuration on startup:
pnpm test:e2e

# Output:
# [Playwright Config] E2E Port Configuration:
#   Source: hash-based  (or "default" for main repo)
#   Is Worktree: true
#   Worktree Path: /path/to/.worktrees/wt-BEA-XXX
#   Bingo: http://localhost:3156
#   Trivia: http://localhost:3157
#   Hub: http://localhost:3158
```

### Implementation Details

See `playwright.config.ts` and `e2e/utils/port-isolation.ts` for the full implementation.

Port calculation formula:
1. SHA-256 hash the worktree path
2. Take first 8 hex characters (32 bits)
3. Map to range 0-332: `offset_index = hash % 333`
4. Multiply by 3: `port_offset = offset_index * 3`
5. Final ports: `3000 + offset`, `3001 + offset`, `3002 + offset`
