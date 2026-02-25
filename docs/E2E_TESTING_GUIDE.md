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

# Each file needs (copy values from your .env.local or run `supabase status` for local Supabase):
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SESSION_TOKEN_SECRET=<64-character-hex-string-from-openssl>
E2E_JWT_SECRET=e2e-test-secret-key-that-is-at-least-32-characters-long
```

### E2E JWT Secret (`E2E_JWT_SECRET`)

The `E2E_JWT_SECRET` environment variable is **required** when `E2E_TESTING=true`. It is used to sign and verify test JWTs across all apps:

- **Platform Hub** (`login/route.ts`, `token/route.ts`): Signs E2E test JWTs
- **Bingo** (`middleware.ts`): Verifies E2E test JWTs
- **Trivia** (`middleware.ts`): Verifies E2E test JWTs
- **`@joolie-boolie/auth`** (`api-auth.ts`): Verifies E2E test JWTs in API routes

**The same value must be set in all app `.env.local` files.** A suggested development value:
```
E2E_JWT_SECRET=e2e-test-secret-key-that-is-at-least-32-characters-long
```

**Safety guards:**
- If `E2E_TESTING=true` and `E2E_JWT_SECRET` is not set, the app will throw an error at startup
- If `E2E_TESTING=true` and `NODE_ENV=production`, the app will refuse to start (prevents E2E bypass in production)

### Running E2E Tests

#### RECOMMENDED: Production Build Mode (Stable)

**Default mode as of BEA-407.** Production builds are 50-70% more memory efficient and prevent server crashes under parallel test load.

```bash
# Run all tests (builds apps automatically)
pnpm test:e2e

# Run specific tests
pnpm test:e2e e2e/bingo/room-setup.spec.ts
pnpm test:e2e --grep @critical

# Run with browser UI visible
pnpm test:e2e --headed

# View test results summary
pnpm test:e2e:summary
```

**What happens:**
1. Script builds all 3 apps (`pnpm build`)
2. **Checks if servers are already running** (NEW: preserves dev servers!)
3. If servers found: Uses existing servers (dev or production)
4. If no servers: Starts production servers on ports 3000-3002
5. Runs Playwright tests
6. Cleans up ONLY servers started by script (preserves dev servers)

**Pros:**
- Stable (no server crashes from resource exhaustion)
- Matches production environment
- Maintains parallel execution (2 workers locally, 4 in CI)

**Cons:**
- Requires 30-60s build step before tests
- Can't hot-reload during test development

#### ALTERNATIVE: Dev Server Mode (Rapid Iteration)

**Use during active test development** when you need hot-reload. Faster iteration but less stable under load.

```bash
# 1. Start dev servers manually
pnpm dev:e2e    # Includes E2E_TESTING=true for auth bypass

# 2. Run tests against dev servers
pnpm test:e2e:dev

# 3. Verify servers are healthy
ps aux | grep next-server    # Should show 0-10% CPU when idle
curl -I http://localhost:3000
curl -I http://localhost:3001
curl -I http://localhost:3002/login
```

**WARNING:** Dev servers may crash after ~250 tests (3.9min runtime) due to resource exhaustion. If you see "Could not connect to the server" errors, switch to production build mode.

### Anti-Pattern: Fixed Timeouts (waitForTimeout)

#### ❌ DO NOT USE Fixed Delays

Fixed timeouts with `page.waitForTimeout()` are an anti-pattern that makes tests:
- **Slower:** Always wait the full duration, even when condition is already met
- **Flakier:** May timeout before condition is met on slower systems
- **Non-deterministic:** Timing assumptions may break across environments

**Bad example:**
```typescript
// ❌ BAD: Fixed delay - always waits 500ms
await page.waitForTimeout(500);
await expect(element).toBeVisible();
```

#### ✅ USE Deterministic Waits

Replace fixed timeouts with one of these patterns:

**Pattern 1: Wait for Element Visibility**

Use when waiting for UI elements to appear after an action.

```typescript
// ✅ GOOD: Waits only until element appears (or timeout)
await expect(page.getByText(/table 1/i)).toBeVisible();
```

**Pattern 2: Wait for State Change Indicators**

Use when waiting for app state to change (game status, UI labels).

```typescript
// ✅ GOOD: Wait for game state to update
await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();
```

**Pattern 3: Use .toPass() for Complex Conditions**

Use when condition requires multiple checks or retry logic.

```typescript
// ✅ GOOD: Retry until condition is met
await expect(async () => {
  const count = await page.locator('[data-testid="team-count"]').textContent();
  expect(parseInt(count || '0')).toBeGreaterThan(0);
}).toPass({ timeout: 10000 });
```

#### Benefits of Deterministic Waits

- **Faster:** Returns immediately when condition is met
- **More reliable:** Automatically retries until condition or timeout
- **Self-documenting:** Code clearly shows what you're waiting for

**Reference:** See Linear issue BEA-383 for refactoring details.

---

## Quick Reference for Test Authors

### Writing a Bingo Test

```typescript
import { test } from '../fixtures/auth';

test('my bingo test', async ({ authenticatedBingoPage: page }) => {
  // Page is already authenticated and on /play with modal dismissed
  await expect(page.getByRole('button', { name: /roll/i })).toBeVisible();
});
```

### Writing a Trivia Test

```typescript
import { test } from '../fixtures/auth';

test('my trivia test', async ({ authenticatedTriviaPage: page }) => {
  // Page is already authenticated and on /play with modal dismissed
  await expect(page.getByRole('button', { name: /start/i })).toBeVisible();
});
```

### What the Auth Fixture Does

1. Authenticates via Platform Hub OAuth (`/login` page)
2. Copies auth cookies from Hub to target app domain
3. Navigates to `/play` on the target app
4. Auto-dismisses any startup modal (room setup, etc.)
5. Retries up to 3x on rate limit errors (exponential backoff)

### Key Imports

| Import | Use For |
|--------|---------|
| `test` from `fixtures/auth` | Tests needing authentication |
| `test` from `@playwright/test` | Tests that do NOT need auth |
| `waitForHydration` from `utils/helpers` | Waiting for React hydration |
| `waitForRoomSetupModal` from `utils/helpers` | Waiting for modal after session recovery |
| `waitForSyncedContent` from `utils/helpers` | Dual-screen sync verification |

---

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

The standard `pnpm test:e2e` command already builds all apps before testing (via `./scripts/e2e-with-build.sh`). For PWA-specific tests that need service workers, ensure the build completes successfully before running E2E.

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

### Using data-testid Attributes

Use data-testid when semantic selectors are inadequate:
- No semantic role exists
- DOM structure is complex
- Need to distinguish similar elements

| Component | data-testid | Purpose |
|-----------|-------------|---------|
| RoomStatus | offline-session-id | Offline session ID display |
| RoomStatus | online-room-code | Online room code display |
| RoomStatus | room-pin-display | PIN display |
| GameSelector | game-card-bingo | Bingo card |
| GameSelector | game-card-trivia | Trivia card |
| PatternSelector | pattern-preview | Pattern preview |
| BallDisplay | current-ball | Current ball |

**Reference:** See BEA-394 for full refactoring.

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
