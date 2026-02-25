# E2E Testing Infrastructure: Comprehensive Action Plan

**Created:** 2026-01-25
**Author:** Claude Opus 4.5 (Synthesis of Infrastructure, Workflow, and Technical Analyses)
**Status:** Ready for Implementation

---

## Executive Summary

The Joolie Boolie's E2E testing infrastructure has fundamental issues causing test failures and false success reports. After comprehensive analysis from three parallel investigations (Infrastructure, Workflow, Technical), this document provides a prioritized, actionable plan to achieve reliable E2E testing.

### Current State

| Metric | Value |
|--------|-------|
| Total E2E Tests | ~340 tests across 20 spec files |
| Current Pass Rate | 50-70% (varies by run) |
| Root Causes Identified | 8 major issues |
| GitHub Actions | DISABLED (cost savings) |
| Pre-commit E2E Enforcement | NOT POSSIBLE (requires servers) |

### Key Issues Identified

1. **Authentication Fixture Fragility** - Real Supabase login required for Bingo/Trivia tests
2. **Platform Hub Tests Use Mocks** - Different auth approach than game apps
3. **Selector Ambiguity** - Strict mode violations from non-unique selectors
4. **PWA Tests Require Production Build** - Service worker not available in dev mode
5. **Modal Timing Race Conditions** - Session recovery creates timing windows
6. **Offline localStorage Persistence** - Session data not being saved reliably
7. **Cross-Window Sync Issues** - BroadcastChannel sync in offline mode
8. **Process Enforcement Gap** - No mechanism to enforce E2E before commits

### Goals

| Phase | Target | Priority |
|-------|--------|----------|
| Phase 1 | 70%+ pass rate, critical blockers fixed | Immediate |
| Phase 2 | 90%+ pass rate, infrastructure stable | This week |
| Phase 3 | 100% pass rate, process enforcement | Ongoing |
| Phase 4 | CI/CD integration, monitoring | Future |

---

## Phase 1: Immediate Fixes (Critical Priority)

### 1.1 Fix Test Selector Ambiguity (Priority: P1)

**Problem:** Tests fail with "strict mode violation" when selectors match multiple elements.

**Evidence from BEA-334:**
```
Error: strict mode violation: getByText(/offline session/i) resolved to 2 elements
```

**Files to Modify:**
- `/Users/j/repos/joolie-boolie-platform/e2e/bingo/room-setup.spec.ts`

**Specific Changes:**

```typescript
// Line 130 (approx) - Change:
await expect(page.getByText(/offline session/i)).toBeVisible();

// To:
await expect(page.getByRole('heading', { name: /offline session id/i })).toBeVisible();

// Line 183 (approx) - Same fix
```

**Verification:**
```bash
pnpm test:e2e -g "should generate and display 6-character session ID"
pnpm test:e2e -g "should recover offline session after page refresh"
```

**Expected Result:** +2 tests passing

---

### 1.2 Fix Keyboard Accessibility Test Expectation (Priority: P1)

**Problem:** Test expects first focusable element to be BUTTON, but it's SELECT (template dropdown).

**Evidence:**
```typescript
const focused = await page.evaluate(() => document.activeElement?.tagName);
expect(focused).toBe('BUTTON'); // Actually 'SELECT'
```

**Files to Modify:**
- `/Users/j/repos/joolie-boolie-platform/e2e/bingo/room-setup.spec.ts` (line ~499)

**Option A - Update Test Expectation (Fastest):**
```typescript
// Change:
expect(focused).toBe('BUTTON');

// To:
expect(focused).toMatch(/BUTTON|SELECT/);
```

**Option B - Fix Modal Focus Order (Better UX):**
```typescript
// In apps/bingo/src/components/presenter/RoomSetupModal.tsx
// Add autoFocus to the primary action button:
<Button
  autoFocus  // Add this
  variant="primary"
  onClick={onCreateRoom}
>
  Create New Game
</Button>
```

**Recommended:** Option B (fixes UX issue, not just test)

**Verification:**
```bash
pnpm test:e2e -g "room setup modal should be keyboard accessible"
```

**Expected Result:** +1 test passing

---

### 1.3 Skip PWA Tests That Require Production Build (Priority: P1)

**Problem:** Tests using `context.setOffline(true)` + `page.reload()` fail because service workers don't register in dev mode.

**Error:**
```
Error: page.reload: net::ERR_INTERNET_DISCONNECTED
```

**Already Done:** Looking at the test file, these tests are already marked with `test.skip`. Verify they have proper skip comments.

**Files to Verify:**
- `/Users/j/repos/joolie-boolie-platform/e2e/bingo/room-setup.spec.ts` lines 189, 442

**Ensure Skip Comments Are Clear:**
```typescript
test.skip('should work offline with network disconnected', async ({ ... }) => {
  // REQUIRES: Production build with service worker
  // Run with: pnpm build && pnpm start && pnpm test:e2e
});
```

**Impact:** These tests don't count as failures when properly skipped.

---

### 1.4 Fix Offline localStorage Persistence (Priority: P2)

**Problem:** Offline session data not being saved to localStorage after clicking "Play Offline".

**Investigation Steps:**

```bash
# 1. Run test in headed mode to observe
pnpm test:e2e --headed -g "should persist offline session in localStorage"
```

**Root Cause Analysis:**
The offline session save effect in `apps/bingo/src/app/play/page.tsx` may have timing issues.

**Files to Investigate:**
- `/Users/j/repos/joolie-boolie-platform/apps/bingo/src/app/play/page.tsx` (lines 244-260)
- `/Users/j/repos/joolie-boolie-platform/apps/bingo/src/lib/session/serializer.ts`

**Likely Fix Pattern:**
```typescript
// In the useEffect that saves offline session, ensure it runs AFTER state is set:
useEffect(() => {
  if (isOfflineMode && offlineSessionId && gameState) {
    // Add a small delay to ensure state is fully committed
    const saveTimer = setTimeout(() => {
      const sessionData = {
        sessionId: offlineSessionId,
        isOffline: true,
        gameState: serializeGameState(gameState),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(`bingo_offline_session_${offlineSessionId}`, JSON.stringify(sessionData));
      localStorage.setItem('bingo_offline_session_id', offlineSessionId);
    }, 100);
    return () => clearTimeout(saveTimer);
  }
}, [isOfflineMode, offlineSessionId, gameState]);
```

**Verification:**
```bash
pnpm test:e2e -g "should persist offline session in localStorage"
```

**Expected Result:** +1 test passing

---

### 1.5 Ensure Test User Exists in Supabase (Priority: P1)

**Problem:** Authentication fixture requires real Supabase test user.

**Verification:**
```bash
# Check if test user exists by attempting login
curl -X POST 'https://your-project-ref.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: your-supabase-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{"email":"e2e-test@joolie-boolie.test","password":"TestPassword123!"}'
```

**If User Missing, Create via Supabase Dashboard or SQL:**
```sql
-- Run via Supabase dashboard SQL editor or seed file
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'e2e-test@joolie-boolie.test',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"E2E Test User"}',
  'authenticated',
  'authenticated'
);
```

**Impact:** All authenticated tests depend on this user existing.

---

## Phase 2: Infrastructure Improvements (This Week)

### 2.1 Unify Authentication Strategy (Priority: P1)

**Problem:** Platform Hub tests use mock auth (Playwright route interception), but Bingo/Trivia tests use real Supabase auth via `e2e/fixtures/auth.ts`.

**Current State:**
- `e2e/platform-hub/auth.spec.ts` - Uses `setupSupabaseAuthMocks()` for Supabase mocking
- `e2e/bingo/*.spec.ts` - Uses `authenticatedBingoPage` fixture (real login)
- `e2e/trivia/*.spec.ts` - Uses `authenticatedTriviaPage` fixture (real login)

**Options:**

**Option A: All Tests Use Real Auth (Recommended)**
- Pros: Tests real behavior, catches real issues
- Cons: Requires test user in Supabase, slightly slower
- Implementation: Remove mocks from Platform Hub tests, use fixtures

**Option B: All Tests Use Mocks**
- Pros: Faster, no external dependencies
- Cons: Doesn't test real auth flow, may miss bugs
- Implementation: Add mocks to Bingo/Trivia tests

**Recommended: Option A** - Real auth catches real issues.

**Implementation:**

1. Update Platform Hub tests to use real auth fixture:

```typescript
// e2e/platform-hub/auth.spec.ts - BEFORE
import { test, expect } from '@playwright/test';
import { setupSupabaseAuthMocks } from '../mocks/supabase-auth-handlers';

test.beforeEach(async ({ page }) => {
  await setupSupabaseAuthMocks(page);
});

// AFTER
import { test, expect } from '../fixtures/auth';

// Remove mock setup, let fixture handle real auth
```

2. Keep mocks available for CI-only mode if needed:

```typescript
// e2e/fixtures/auth.ts - Add option for mock mode
export const test = base.extend<AuthFixtures & GameAuthFixtures>({
  testUser: async ({}, use) => {
    await use({
      email: process.env.TEST_USER_EMAIL || 'e2e-test@joolie-boolie.test',
      password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    });
  },
  // ... rest of fixtures
});
```

---

### 2.2 Fix Template Loading Tests (Priority: P2)

**Problem:** Template loading in authenticated tests may fail due to RLS policies or API errors.

**Investigation:**
1. Check if templates table has RLS enabled
2. Verify test user has permission to read templates
3. Check for template loading toast errors

**Files to Check:**
- `supabase/migrations/*templates*.sql`
- `apps/bingo/src/components/presenter/TemplateSelector.tsx`

**If RLS Blocking:**
```sql
-- Add policy for authenticated users
CREATE POLICY "Users can view their own templates"
ON bingo_templates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public templates"
ON bingo_templates
FOR SELECT
USING (is_public = true);
```

---

### 2.3 Add Rate Limit Bypass for E2E Tests (Priority: P2)

**Problem:** E2E tests can trigger rate limiting when running many tests in sequence.

**Solution:** Add test mode header that bypasses rate limiting.

**Files to Modify:**
- `/Users/j/repos/joolie-boolie-platform/apps/platform-hub/src/middleware.ts`

**Implementation:**
```typescript
// In Platform Hub middleware
export async function middleware(request: NextRequest) {
  // Bypass rate limiting in E2E test mode
  if (
    process.env.NODE_ENV === 'development' &&
    request.headers.get('X-E2E-Test-Mode') === 'true'
  ) {
    return NextResponse.next();
  }

  // ... existing rate limiting logic
}
```

**In Tests:**
```typescript
// e2e/fixtures/auth.ts
authenticatedPage: async ({ page, testUser }, use) => {
  // Add E2E header to all requests
  await page.setExtraHTTPHeaders({
    'X-E2E-Test-Mode': 'true'
  });
  // ... rest of login flow
};
```

---

### 2.4 Fix Display Window Sync in Offline Mode (Priority: P2)

**Problem:** Display window fails to load when opened in offline mode.

**Investigation:**
1. Check display page URL construction with offline session ID
2. Verify BroadcastChannel messages are being sent/received
3. Ensure display page doesn't make network requests on initial load

**Debugging Commands:**
```bash
pnpm test:e2e --headed --debug -g "should sync display window in offline mode"
```

**Likely Issue:** Display page may be making API calls before checking offline mode.

**Fix Pattern:**
```typescript
// apps/bingo/src/app/display/page.tsx
// Ensure offline mode is detected early, before any API calls
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const offlineSessionId = params.get('offline');

  if (offlineSessionId) {
    // Load from localStorage, not API
    const sessionData = localStorage.getItem(`bingo_offline_session_${offlineSessionId}`);
    if (sessionData) {
      setGameState(JSON.parse(sessionData).gameState);
    }
    return;
  }

  // Only fetch from API if not in offline mode
  fetchSessionFromApi();
}, []);
```

---

## Phase 3: Process Enforcement (Ongoing)

### 3.1 Update PR Template with E2E Checklist (Priority: P1)

**File:** `/Users/j/repos/joolie-boolie-platform/.github/PULL_REQUEST_TEMPLATE.md`

**Add Section:**
```markdown
## E2E Testing Verification (MANDATORY)

Before submitting this PR, confirm ALL of the following:

- [ ] Dev servers started (`pnpm dev` - all 3 apps responding)
- [ ] Relevant E2E tests pass locally: `pnpm test:e2e e2e/<feature>.spec.ts`
- [ ] Full E2E suite passes: `pnpm test:e2e`
- [ ] No new test failures introduced
- [ ] Test screenshots reviewed (check `test-results/` directory if failures)

### E2E Test Results
<!-- Paste output of `pnpm test:e2e:summary` here -->
```
Test Results Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  0 failed       ← REQUIRED
  Y skipped
  X passed
  Z total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### If Tests Failed
<!-- Explain why tests fail and what you did about it -->
- [ ] Fixed code to make tests pass
- [ ] Tests are unrelated to my changes (explain below)
- [ ] Tests were already failing (link to issue)

**Note:** PRs with unexplained test failures will not be merged.
```

---

### 3.2 Create E2E Verification Script (Priority: P2)

**File:** `/Users/j/repos/joolie-boolie-platform/scripts/verify-e2e.sh`

```bash
#!/bin/bash
# E2E Test Verification Script
# Run this before creating PRs or committing UI changes

set -e

echo "=========================================="
echo "E2E Test Verification"
echo "=========================================="

# Check if servers are running
check_server() {
    local port=$1
    local name=$2
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" | grep -q "200\|302"; then
        echo "✓ $name (port $port) is running"
        return 0
    else
        echo "✗ $name (port $port) is NOT running"
        return 1
    fi
}

echo ""
echo "Step 1: Checking dev servers..."
SERVERS_OK=true
check_server 3000 "Bingo" || SERVERS_OK=false
check_server 3001 "Trivia" || SERVERS_OK=false
check_server 3002 "Platform Hub" || SERVERS_OK=false

if [ "$SERVERS_OK" = false ]; then
    echo ""
    echo "ERROR: Dev servers not running. Start with: pnpm dev"
    exit 1
fi

echo ""
echo "Step 2: Running E2E tests..."
echo ""

# Run tests
pnpm test:e2e

# Check results summary
if pnpm test:e2e:summary | grep -q "0 failed"; then
    echo ""
    echo "=========================================="
    echo "SUCCESS: All E2E tests passed!"
    echo "=========================================="
    echo ""
    echo "You can now safely commit your changes."
else
    echo ""
    echo "=========================================="
    echo "FAILURE: Some E2E tests failed!"
    echo "=========================================="
    echo ""
    echo "DO NOT commit until tests pass."
    echo "Run: pnpm test:e2e:summary to see failure count"
    echo "Check test-results/ for screenshots and details."
    exit 1
fi
```

**Make executable:**
```bash
chmod +x scripts/verify-e2e.sh
```

**Add to package.json:**
```json
{
  "scripts": {
    "verify-e2e": "./scripts/verify-e2e.sh"
  }
}
```

---

### 3.3 Add E2E Documentation to CLAUDE.md (Priority: P1)

Already present in CLAUDE.md, but enhance the section:

**Add to Critical E2E Testing Section:**
```markdown
### Test Categories and Expected Behavior

| Category | Dev Mode | Production Mode | Notes |
|----------|----------|-----------------|-------|
| Auth tests | Real Supabase | Real Supabase | Requires test user |
| Game flow tests | Real Supabase | Real Supabase | Auth via fixtures |
| PWA/Offline reload tests | SKIPPED | Run | Requires service worker |
| Accessibility tests | Real Supabase | Real Supabase | axe-core checks |

### If Tests Fail

1. **Auth timeout**: Platform Hub crashed - restart `pnpm dev:hub`
2. **Selector ambiguity**: Use more specific selectors (role > text)
3. **Modal not visible**: Wait for recovery with `waitForRoomSetupModal()`
4. **Offline reload fails**: Test requires production build - mark as skip
5. **Rate limiting**: Add `X-E2E-Test-Mode` header
```

---

### 3.4 Subagent Workflow Integration (Priority: P1)

Update the subagent workflow skill to enforce E2E:

**File:** `/Users/j/repos/joolie-boolie-platform/.claude/skills/subagent-workflow/SKILL.md`

**Add E2E Enforcement Section:**
```markdown
## E2E Testing Enforcement

### For Implementer Agents
Before marking task complete:
1. Run `pnpm test:e2e e2e/<relevant>.spec.ts`
2. ALL tests must pass (0 failures)
3. Include test output in completion message

### For Spec Reviewers
During spec review:
1. Verify implementer ran E2E tests
2. Re-run tests: `pnpm test:e2e e2e/<relevant>.spec.ts`
3. REJECT if any test fails

### For Quality Reviewers
During quality review:
1. Run FULL test suite: `pnpm test:e2e`
2. Check test-results/ for any failures
3. REJECT if any regression introduced

### Test Output Format
Include in task completion:
```
E2E Results: X passed, 0 failed, Y skipped
Time: Zs
```

If failures exist, explain and fix before completing.
```

---

## Phase 4: Long-Term Improvements (Future)

### 4.1 Re-enable GitHub Actions for Critical Tests

When budget allows, re-enable CI with optimizations:

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  e2e-critical:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install chromium

      - name: Build apps
        run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ vars.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Run critical E2E tests
        run: pnpm test:e2e --grep "@critical" --shard=1/2

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### 4.2 Test Health Dashboard

Create a simple dashboard to track test health over time:

```typescript
// scripts/test-health-report.ts
import { readFileSync, writeFileSync } from 'fs';

interface TestResult {
  date: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

// Append to health log
const result: TestResult = {
  date: new Date().toISOString(),
  passed: parseInt(process.argv[2] || '0'),
  failed: parseInt(process.argv[3] || '0'),
  skipped: parseInt(process.argv[4] || '0'),
  duration: parseInt(process.argv[5] || '0'),
};

const logPath = 'test-results/health-log.json';
let log: TestResult[] = [];
try {
  log = JSON.parse(readFileSync(logPath, 'utf-8'));
} catch {}
log.push(result);
writeFileSync(logPath, JSON.stringify(log, null, 2));
```

### 4.3 Flakiness Detection

Add retry analysis to detect flaky tests:

```typescript
// playwright.config.ts
export default defineConfig({
  // ... existing config

  // Add flakiness detection
  reporter: [
    ['list'],
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Retry failures to detect flakiness
  retries: process.env.DETECT_FLAKY ? 3 : 0,
});
```

---

## Priority Matrix

| Issue | Impact | Complexity | Priority | Phase |
|-------|--------|--------|----------|-------|
| Selector ambiguity fixes | High | Low | P1 | 1 |
| Keyboard focus test fix | Medium | Low | P1 | 1 |
| Skip PWA tests properly | Medium | Low | P1 | 1 |
| Test user verification | High | Low | P1 | 1 |
| localStorage persistence fix | Medium | Medium | P2 | 1 |
| Unify auth strategy | High | Medium | P1 | 2 |
| Template loading fixes | Medium | Medium | P2 | 2 |
| Rate limit bypass | Medium | Low | P2 | 2 |
| Display sync offline | Medium | Medium | P2 | 2 |
| PR template update | High | Low | P1 | 3 |
| E2E verification script | High | Low | P2 | 3 |
| CLAUDE.md updates | Medium | Low | P1 | 3 |
| Subagent workflow update | High | Low | P1 | 3 |
| GitHub Actions (future) | High | Medium | P3 | 4 |
| Test health dashboard | Low | Medium | P4 | 4 |

---

## Implementation Order

### Today (Phase 1)
1. Fix selector ambiguity in room-setup.spec.ts
2. Fix keyboard accessibility test expectation
3. Verify PWA tests are properly skipped
4. Verify test user exists in Supabase
5. Investigate localStorage persistence (may require code fix)
6. Run full test suite to validate

### This Week (Phase 2)
1. Decide on auth strategy (real vs mock)
2. Implement auth unification
3. Add rate limit bypass header
4. Fix display window sync in offline mode
5. Fix any remaining template loading issues

### Ongoing (Phase 3)
1. Update PR template
2. Create verification script
3. Update CLAUDE.md
4. Update subagent workflow skill
5. Enforce E2E on all future work

---

## Success Metrics

### Immediate (After Phase 1)
- [ ] At least 80% of tests pass consistently
- [ ] No strict mode violation errors
- [ ] No timeout errors on auth
- [ ] PWA tests properly skipped (not failed)

### Short-term (After Phase 2)
- [ ] 95%+ of tests pass consistently
- [ ] Auth works reliably across all apps
- [ ] No rate limiting interference
- [ ] Offline mode tests pass (except PWA reload)

### Long-term (After Phase 3)
- [ ] 100% of non-PWA tests pass
- [ ] E2E verification in every PR
- [ ] No false success reports
- [ ] Clear documentation for all test categories

---

## Risk Mitigation

### Risk 1: Changes Break Existing Functionality
**Mitigation:**
- Make changes incrementally
- Run full test suite after each change
- Keep backup of working test files
- Use git branches for each fix

### Risk 2: Tests Still Fail After Fixes
**Mitigation:**
- Document exact failure reason
- Create Linear issue for persistent failures
- Mark as skip with clear explanation if unfixable in current cycle
- Never claim "tests fixed" without running them

### Risk 3: Auth Strategy Change Breaks Tests
**Mitigation:**
- Test auth unification on one spec file first
- Keep mock handlers available as fallback
- Ensure test user always exists in Supabase
- Document auth approach clearly

---

## Files Changed Summary

### Phase 1 Files
- `e2e/bingo/room-setup.spec.ts` - Selector fixes
- `apps/bingo/src/components/presenter/RoomSetupModal.tsx` - Focus fix (optional)
- `apps/bingo/src/app/play/page.tsx` - localStorage persistence (if needed)

### Phase 2 Files
- `e2e/fixtures/auth.ts` - Auth unification
- `e2e/platform-hub/auth.spec.ts` - Remove mocks
- `apps/platform-hub/src/middleware.ts` - Rate limit bypass

### Phase 3 Files
- `.github/PULL_REQUEST_TEMPLATE.md` - E2E checklist
- `scripts/verify-e2e.sh` - New verification script
- `CLAUDE.md` - Enhanced E2E section
- `.claude/skills/subagent-workflow/SKILL.md` - E2E enforcement

---

## Commands Cheat Sheet

```bash
# Phase 1 verification
pnpm test:e2e e2e/bingo/room-setup.spec.ts 
# Run specific failing test
pnpm test:e2e -g "should generate and display 6-character"

# Run in debug mode
pnpm test:e2e --headed --debug -g "test name"

# Check server health
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002

# Full test suite
pnpm test:e2e 
# Generate HTML report
pnpm test:e2e --reporter=html
open playwright-report/index.html

# Kill hung servers
pkill -f next-server
```

---

## Appendix: Why Previous Fixes Failed

Based on the Workflow Agent analysis, previous attempts to fix E2E tests failed due to:

### The Loop of Optimistic Reporting

1. **Pattern:** Agent claims "tests fixed" without running full suite
2. **Cause:** Time pressure, optimism bias, partial testing
3. **Result:** User discovers failures later, loses trust

### Breaking the Loop

This plan addresses the loop by:

1. **Explicit Verification Steps** - Every fix includes exact commands to verify
2. **No Success Claims Without Evidence** - "Tests pass" requires test output
3. **Process Enforcement** - PR template requires test results
4. **Realistic Expectations** - Some tests (PWA) are skipped, not "fixed"
5. **Documented Limitations** - Clear about what can/cannot be tested in dev mode

### Key Behavioral Changes

| Before | After |
|--------|-------|
| "I fixed the tests" | "Tests pass: 320 passed, 0 failed, 4 skipped. Output: [...]" |
| Fix one test, assume others work | Run full suite after every change |
| Skip verification when tired | Verification is part of the task definition |
| Blame flakiness | Investigate root cause, document if truly flaky |

---

## Conclusion

This action plan provides a realistic, prioritized path to reliable E2E testing. The key is **incremental progress with verification at each step**, not claiming success prematurely.

Phase 1 fixes are straightforward and can be completed today. Phase 2 requires more investigation but addresses root causes. Phase 3 ensures the improvements stick through process changes.

**Start with Phase 1. Verify each fix. Report actual results.**
