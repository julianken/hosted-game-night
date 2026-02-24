# BEA-331: Current E2E Test Failures Analysis

**Date:** 2026-01-25
**Test Run:** `pnpm test:e2e` completed
**Result:** 132 failures / 338 total tests (61% failure rate)

## Summary

```
Test Results Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  132 failed
  45 skipped
  147 passed
  338 total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Progress Since Original BEA-331:**
- Original failures: 187 (55%)
- Current failures: 132 (39%)
- Improvement: 55 fewer failures (-16%)
- Child issues completed: BEA-332 through BEA-339 (all Done)

## Root Cause Analysis (Current Failures)

### 1. Platform Hub Authentication Timeouts (PRIMARY - ~60-80 failures)

**Error Pattern:**
```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
waiting for navigation to "http://localhost:3002/dashboard" until "load"
at fixtures/auth.ts:77
```

**Impact:** Affects all tests that require authentication (Bingo, Trivia, Platform Hub)

**Root Cause:** The three Opus agents from yesterday ALL independently identified **rate limiting** as the primary cause:
- Platform Hub rate limiting: 10 requests/minute per IP
- E2E tests: 6 parallel workers from localhost (same IP)
- Auth requires 3 requests per test (login, token exchange, session verify)
- 6 workers × 3 requests = rate limit exhausted in seconds

**Evidence:**
- Tests timeout at `loginViaPlatformHub` waiting for dashboard redirect
- All auth timeouts occur at Platform Hub (localhost:3002)
- No timeouts in tests that don't require auth

**Files Affected:**
- `e2e/fixtures/auth.ts:77` - Auth fixture timing out
- `apps/platform-hub/src/middleware.ts` - Rate limiting middleware

**Solution:** Create bypass for test environment (see BEA-349 recommendations)

### 2. Display Window Popup Timeouts (~30-40 failures)

**Error Pattern:**
```
Error: locator.click: Test timeout of 30000ms exceeded.
waiting for locator('button').filter({ hasText: /open display/i })
```

**Impact:** All dual-screen tests (Bingo display, Trivia display)

**Root Cause:** Combination of:
1. Rate limiting (blocks auth for display window)
2. Popup blocking (not configured in Playwright)
3. Display window fails to load due to auth timeout

**Files Affected:**
- `e2e/bingo/display.spec.ts` - 9 failures
- `e2e/trivia/display.spec.ts` - 27 failures
- `e2e/bingo/dual-screen.spec.ts` - Some failures
- `e2e/trivia/dual-screen.spec.ts` - 18 failures

**Solution:** Fix rate limiting first (primary cause), then verify popup config

### 3. Modal Timing and State Issues (~8-10 failures)

**Error Pattern:**
```
Error: [expect(locator).toBeVisible() failed
Locator: getByText(/offline session/i)
Expected: visible
```

**Impact:** Room setup modal tests

**Files Affected:**
- `e2e/bingo/modal-timing.spec.ts` - 5 failures
- `e2e/bingo/room-setup.spec.ts` - Several failures in modal sections

**Root Cause:**
- Some tests fail due to rate limiting blocking initial page load
- Some legitimate timing issues with modal state recovery

**Solution:** Fix rate limiting first, then address remaining timing issues

### 4. Touch Target Size Failures (2 failures)

**Error Pattern:**
```
Error: expect(received).toBeGreaterThanOrEqual(expected)
Expected: >= 44
Received:    32
```

**Impact:** Accessibility tests

**Files Affected:**
- `e2e/bingo/accessibility.spec.ts:163` - Touch target size test

**Root Cause:** Some buttons are 32px instead of required 44px minimum

**Solution:** Update button styles to meet 44x44px minimum (CLAUDE.md requirement)

### 5. Accessibility Failures (~5-8 failures)

**Error Patterns:**
- `expect(received).toBe(expected)` - Missing accessible names
- `expect(locator).toHaveCount(expected)` - Wrong heading count
- Strict mode violations with duplicate elements

**Impact:** Accessibility and ARIA tests

**Files Affected:**
- `e2e/bingo/accessibility.spec.ts` - 2 failures
- `e2e/bingo/home.spec.ts` - 1 failure (heading count)

**Root Cause:** Missing ARIA labels, incomplete heading hierarchy

**Solution:** Add proper ARIA labels and fix heading structure

### 6. Platform Hub Specific Failures (~5 failures)

**Error Pattern:**
```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
```

**Impact:** Platform Hub auth and accessibility tests

**Files Affected:**
- `e2e/platform-hub/accessibility.spec.ts` - Keyboard navigation
- `e2e/platform-hub/auth.spec.ts` - Login flow

**Root Cause:** Rate limiting blocks auth flow

**Solution:** Fix rate limiting

## Failure Distribution by App

| App | Total Tests | Passing | Failing | Skipped |
|-----|-------------|---------|---------|---------|
| Bingo | ~160 | ~90 | ~40 | 5 |
| Trivia | ~150 | ~50 | ~80 | 15 |
| Platform Hub | ~28 | ~7 | ~12 | 25 |

**Note:** Trivia has highest failure rate due to display window issues

## Recommended Fix Priority

### Phase 1: Critical Blocker (MUST FIX FIRST)
**Issue:** Rate limiting blocks parallel E2E tests
**Impact:** 60-80 failures (60% of all failures)
**Complexity:** Low
**Files:** `apps/platform-hub/src/middleware.ts`

**Solution:**
1. Add test environment detection
2. Bypass rate limiting when `NODE_ENV === 'test'` or `E2E_TESTING === 'true'`
3. Keep rate limiting active in dev/production

**Expected improvement:** ~50-70 failures fixed

### Phase 2: Display Window Issues (AFTER Phase 1)
**Issue:** Display popup timeouts
**Impact:** 30-40 failures
**Complexity:** Low
**Files:** Test files, potentially app code

**Solution:**
1. Verify rate limiting fix resolves auth timeouts
2. If still failing, debug display window launch mechanism
3. Check for popup blocker config in Playwright

**Expected improvement:** ~30-40 failures fixed

### Phase 3: Polish (AFTER Phase 1 & 2)
**Issues:** Touch targets, accessibility, modal timing
**Impact:** ~15-20 failures
**Complexity:** Medium
**Files:** Various component files, test files

**Expected improvement:** ~15-20 failures fixed

## Target: 100% Pass Rate

After all phases:
- **Current:** 147/338 passing (43%)
- **After Phase 1:** ~200/338 passing (59%)
- **After Phase 2:** ~240/338 passing (71%)
- **After Phase 3:** ~320/338 passing (95%)
- **Target:** 293/338 passing (87%) - excludes 45 intentionally skipped tests

## Next Steps

1. Create Linear issue for Phase 1 (rate limiting bypass)
2. Implement and test Phase 1
3. Re-run full E2E suite
4. Assess remaining failures
5. Create issues for Phase 2 & 3 based on actual results

## Related Issues

- BEA-331 (this epic) - Parent issue
- BEA-332 through BEA-339 - Completed child issues
- Need to create: BEA-349+ for remaining work

## References

- Opus Investigation: Yesterday's 3-agent parallel analysis
- Test Output: `/private/tmp/claude/-Users-j-repos-joolie-boolie-platform/tasks/b9158ac.output`
- Test Summary: `pnpm test:e2e:summary`
