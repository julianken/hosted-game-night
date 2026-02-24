# E2E Testing Roadmap

**Quick Reference Guide** | [Full Plan](./LINEAR_E2E_PROJECT_PLAN.md) | [Test Strategy](./E2E_TESTING_STRATEGY.md)

## 📊 Project Overview

| Metric | Current | Target | New Tests |
|--------|---------|--------|-----------|
| **Total E2E Tests** | 288 | 384-387 | 96-99 |
| **Platform Hub Coverage** | 0% | 100% | 6-7 specs |
| **CI Execution Time** | Disabled (17+ min) | <5 min (PR), <15 min (full) | 4-shard parallel |
| **Issues** | 6 created | 5 active + 1 deferred | BEA-313 to BEA-318 |

## 🗺️ Dependency Map

```
┌─────────────────────────────────────────────────────────────┐
│  BEA-313: Infrastructure (Sharding + CI)                    │
│  ⚡ CRITICAL PATH - Must complete first                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ (blocks all below)
          ┌───────────────┼───────────────┬─────────────┐
          ▼               ▼               ▼             ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ BEA-314  │    │ BEA-315  │    │ BEA-316  │    │ BEA-318  │
    │ Auth     │───▶│ Dashboard│    │ SSO      │    │ A11y/    │
    │ (18-20)  │    │ Profile  │    │ (22)     │    │ Security │
    │          │    │ (18)     │    │          │    │ (18-19)  │
    └──────────┘    └──────────┘    └─────┬────┘    └──────────┘
                                          │
                                          │ (related to auth)
                                          ▼
                                    ┌──────────┐
                                    │ BEA-317  │
                                    │ Templates│
                                    │ DEFERRED │
                                    │ (Phase 3)│
                                    └──────────┘
```

## 📋 Issue Quick Reference

| Issue | Title | Tests | Priority | Status | Notes |
|-------|-------|-------|----------|--------|-------|
| [BEA-313](https://linear.app/joolie-boolie/issue/BEA-313) | Infrastructure: Sharding & CI | N/A | 🔴 High | Ready | **Start here** - enables all others |
| [BEA-314](https://linear.app/joolie-boolie/issue/BEA-314) | Auth Flow E2E Tests | 18-20 | 🔴 Urgent | Blocked | Login, signup, logout, forgot password |
| [BEA-315](https://linear.app/joolie-boolie/issue/BEA-315) | Dashboard & Profile E2E | 18 | 🔴 High | Blocked | Dashboard, settings, profile update |
| [BEA-316](https://linear.app/joolie-boolie/issue/BEA-316) | Cross-App SSO E2E | 22 | 🔴 High | Blocked | OAuth flow, consent, multi-app testing |
| [BEA-318](https://linear.app/joolie-boolie/issue/BEA-318) | Accessibility & Security | 18-19 | 🟡 Medium | Blocked | A11y, rate limiting, XSS prevention |
| [BEA-317](https://linear.app/joolie-boolie/issue/BEA-317) | Template CRUD E2E | ~~8~~ | 🟡 Medium | **DEFERRED** | ⚠️ Template UI doesn't exist yet |

## 🚧 Missing Features (Phase 3)

Platform Hub features that need implementation before testing:

| Feature | Affected Issue | Impact |
|---------|----------------|--------|
| Template Management UI | BEA-317 (entire issue) | 8 tests blocked |
| Theme switching in settings | BEA-315 | 2 tests removed |
| Notification preferences | BEA-315 | 2 tests removed |
| Avatar upload | BEA-315 | 1 test removed |
| Password reset token page (`/reset-password`) | BEA-314 | 2 tests removed |
| Session timeout handling | BEA-318 | 2 tests removed |
| Platform Hub PWA | BEA-318 | 1 test removed |

**Total Impact:** 18 tests blocked or removed from original scope.

## 🎯 Test Breakdown by App

```
┌─────────────────────────────────────────────────────────┐
│                    Current Coverage                     │
├─────────────────────────────────────────────────────────┤
│  Bingo:    147 tests (100% coverage)  ████████████████  │
│  Trivia:   141 tests (100% coverage)  ████████████████  │
│  Platform: 0 tests   (0% coverage)    ░░░░░░░░░░░░░░░░  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Target Coverage                      │
├─────────────────────────────────────────────────────────┤
│  Bingo:    147 tests (tagged)         ████████████████  │
│  Trivia:   141 tests (tagged)         ████████████████  │
│  Platform: 96-99 tests (100% target)  ████████████████  │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Getting Started

### For Agents Working on Issues

1. **Read planning documents** (always start here):
   - `/docs/LINEAR_E2E_PROJECT_PLAN.md` - Full project plan with all test cases
   - `/docs/E2E_TESTING_STRATEGY.md` - Original test case analysis
   - `apps/platform-hub/CLAUDE.md` - App context and features

2. **Check current state**:
   ```bash
   # View existing test structure
   ls e2e/

   # Run existing tests locally
   pnpm test:e2e

   # Check Playwright config
   cat playwright.config.ts
   ```

3. **Understand auth fixtures** (you'll use these in every test):
   - File: `e2e/fixtures/auth.ts`
   - Export: `authenticatedPage(page)` helper
   - Usage: Handles login + session setup automatically

4. **Follow the dependency chain**:
   - Must complete BEA-313 first (infrastructure)
   - BEA-314 should be next (auth flows)
   - Others can run in parallel after BEA-313 + BEA-314

### For BEA-313 (Infrastructure)

**Critical first steps:**
1. Add test tags to existing Bingo/Trivia tests (~288 tests)
2. Update `playwright.config.ts` with sharding config
3. Update `.github/workflows/e2e.yml` with shard matrix
4. Add `test:e2e:critical` script to root `package.json`
5. Re-enable E2E workflow (remove `if: false`)

**Success criteria:** CI runs in <5 min for critical tests, <15 min for full suite.

### For Platform Hub Tests (BEA-314, BEA-315, BEA-316, BEA-318)

**Standard pattern:**
```typescript
import { test, expect } from '@playwright/test';
import { authenticatedPage } from '../fixtures/auth';

test('feature name @critical', async ({ page }) => {
  // Use auth fixture for logged-in tests
  await authenticatedPage(page);

  // Or start from login page
  await page.goto('http://localhost:3002/login');

  // Test your feature...
});
```

**Tag every test:**
- `@critical` - Must-work features (30-40 tests run on every PR)
- `@high` - Important flows (80-100 tests run on every PR)
- `@medium` - Secondary features (full suite only)
- `@low` - Nice-to-have validations (full suite only)

## 📝 Key Documents

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [LINEAR_E2E_PROJECT_PLAN.md](./LINEAR_E2E_PROJECT_PLAN.md) | Full plan with all test cases | Working on any issue |
| [E2E_TESTING_STRATEGY.md](./E2E_TESTING_STRATEGY.md) | Original analysis and test identification | Understanding test rationale |
| **E2E_TESTING_ROADMAP.md** (this file) | Quick reference and getting started | Starting work, checking status |
| [apps/platform-hub/CLAUDE.md](../apps/platform-hub/CLAUDE.md) | Platform Hub app context | Understanding what features exist |
| [e2e/fixtures/auth.ts](../e2e/fixtures/auth.ts) | Auth helpers for tests | Writing authenticated tests |
| [playwright.config.ts](../playwright.config.ts) | Playwright configuration | Configuring test execution |

## 🎓 Reference: Existing Test Examples

**For auth flows:** See `e2e/bingo/auth.spec.ts` (6 tests, 165 LOC)
**For accessibility:** See `e2e/bingo/accessibility.spec.ts` (19 tests, 293 LOC)
**For game flows:** See `e2e/bingo/game-flow.spec.ts` (17 tests, 429 LOC)

---

**Questions?** Check the [full plan](./LINEAR_E2E_PROJECT_PLAN.md) or [Linear project](https://linear.app/joolie-boolie/project/e2e-testing-coverage-29726dba5b2f).
