# Joolie Boolie - E2E Testing Strategy

**Document Version:** 1.0.0
**Created:** January 23, 2026
**Status:** Proposal for Review

---

## 1. Executive Summary

### 1.1 Current State Assessment

The Joolie Boolie has **288 E2E test cases** across 13 spec files covering Bingo and Trivia applications. However, these tests are **currently DISABLED in CI** due to:

- **Execution time:** 17+ minutes (target: <5 minutes)
- **Reliability issues:** Tests not yet stable enough for CI enforcement
- **Missing UI components:** Critical authentication flows lack UI elements

#### Test Distribution

| Application | Test Files | Test Cases | Lines of Code |
|-------------|-----------|------------|---------------|
| Bingo | 8 | ~121 | 1,852 |
| Trivia | 5 | ~167 | 2,539 |
| Platform Hub | 0 | 0 | 0 |
| **Total** | **13** | **288** | **4,391** |

### 1.2 Test Coverage Gaps

| Area | Current Coverage | Gap |
|------|------------------|-----|
| **Bingo Gameplay** | 100% | None - fully covered |
| **Trivia Gameplay** | 100% | None - fully covered |
| **OAuth/Authentication** | 0% | Critical - no E2E tests |
| **Platform Hub** | 0% | No test project configured |
| **Cross-App SSO** | 0% | Complex multi-app flow untested |
| **Profile Management** | 0% | New feature (BEA-310) untested |
| **Templates CRUD** | 0% | API tested, no E2E coverage |

### 1.3 Critical Blockers

**UI Components Missing (Must Fix Before E2E):**

| Issue | Impact | Location |
|-------|--------|----------|
| No Logout Button | Cannot test logout flow | `apps/platform-hub/src/components/Header.tsx` |
| No Auth Links in Header | Cannot test authenticated navigation | `apps/platform-hub/src/components/Header.tsx` |
| No Login Button in Games | OAuth exists but no visible UI trigger | Game apps have `LoginButton` but it's not rendered in main UI |

**Note:** API routes exist (`/api/auth/logout`) but no UI button calls them.

### 1.4 Recommendations Summary

1. **Fix UI blockers first** - Add logout button and auth navigation (1 task)
2. **Add Platform Hub to Playwright config** - Enable cross-app testing
3. **Implement test parallelization** - Target <5 min CI execution
4. **Create authentication fixtures** - Reusable auth state for all tests
5. **Prioritize critical path tests** - Auth flow > gameplay (gameplay already tested)

---

## 2. Prioritized Test Plan

### 2.1 Phase 1: Critical Path (Blocking MVP)

**Dependency:** UI fixes required first (see Section 3)

| ID | Test Case | App | Priority | Status |
|----|-----------|-----|----------|--------|
| CP-AUTH-001 | User can sign up with email | Platform Hub | Critical | Testable |
| CP-AUTH-002 | User can log in with valid credentials | Platform Hub | Critical | Testable |
| CP-AUTH-003 | Invalid login shows error message | Platform Hub | Critical | Testable |
| CP-AUTH-004 | Email confirmation required before login | Platform Hub | Critical | Testable |
| CP-AUTH-005 | Forgot password sends reset email | Platform Hub | Critical | Testable |
| CP-AUTH-006 | Password reset with valid token | Platform Hub | Critical | Testable |
| CP-AUTH-007 | Protected routes redirect to login | Platform Hub | Critical | Testable |
| CP-AUTH-008 | User can logout | Platform Hub | Critical | **BLOCKED** - needs logout button |
| CP-SSO-001 | OAuth flow from Bingo to Platform Hub | Bingo + Hub | Critical | **BLOCKED** - needs OAuth trigger UI |
| CP-SSO-002 | OAuth flow from Trivia to Platform Hub | Trivia + Hub | Critical | **BLOCKED** - needs OAuth trigger UI |
| CP-SSO-003 | OAuth consent page displays correctly | Platform Hub | Critical | Testable |
| CP-SSO-004 | OAuth token exchange works | Platform Hub | Critical | Testable |
| CP-DASH-001 | Dashboard shows user info | Platform Hub | Critical | Testable |
| CP-DASH-002 | Dashboard shows recent sessions | Platform Hub | Critical | Testable |

**Estimated Tests:** 14
**Estimated Duration:** 3-5 minutes (with parallelization)

### 2.2 Phase 2: High Priority (Core Features)

| ID | Test Case | App | Priority | Status |
|----|-----------|-----|----------|--------|
| HI-PROF-001 | User can update facility name | Platform Hub | High | Testable |
| HI-PROF-002 | User can change email | Platform Hub | High | Testable |
| HI-PROF-003 | User can change password | Platform Hub | High | Testable |
| HI-PROF-004 | Invalid current password rejected | Platform Hub | High | Testable |
| HI-TMPL-001 | Create bingo template | Bingo | High | Testable |
| HI-TMPL-002 | Load saved bingo template | Bingo | High | Testable |
| HI-TMPL-003 | Update bingo template | Bingo | High | Testable |
| HI-TMPL-004 | Delete bingo template | Bingo | High | Testable |
| HI-TMPL-005 | Create trivia template | Trivia | High | Testable |
| HI-TMPL-006 | Load saved trivia template | Trivia | High | Testable |
| HI-TMPL-007 | CSV import for trivia | Trivia | High | Testable |
| HI-GAME-001 | Authenticated bingo game session | Bingo | High | Testable |
| HI-GAME-002 | Authenticated trivia game session | Trivia | High | Testable |

**Estimated Tests:** 13
**Estimated Duration:** 2-3 minutes

### 2.3 Phase 3: Medium Priority (Enhanced Features)

| ID | Test Case | App | Priority | Status |
|----|-----------|-----|----------|--------|
| MD-PWA-001 | Install prompt appears | Both Games | Medium | Testable |
| MD-PWA-002 | Service worker registers | Both Games | Medium | Testable |
| MD-PWA-003 | Offline banner shows when offline | Both Games | Medium | Testable |
| MD-PWA-004 | Bingo works offline | Bingo | Medium | Testable |
| MD-A11Y-001 | All interactive elements are focusable | All | Medium | Testable |
| MD-A11Y-002 | Color contrast meets WCAG AA | All | Medium | Testable |
| MD-A11Y-003 | Screen reader announces game state | All | Medium | Testable |
| MD-SYNC-001 | Dual-screen sync in bingo | Bingo | Medium | Already tested |
| MD-SYNC-002 | Dual-screen sync in trivia | Trivia | Medium | Already tested |
| MD-THEME-001 | Light/dark mode toggle | All | Medium | Testable |

**Estimated Tests:** 10
**Estimated Duration:** 2 minutes

### 2.4 Phase 4: Low Priority (Edge Cases)

| ID | Test Case | App | Priority | Status |
|----|-----------|-----|----------|--------|
| LO-ERR-001 | Rate limiting after 10 requests | Platform Hub | Low | Testable |
| LO-ERR-002 | CSRF token validation | Platform Hub | Low | Testable |
| LO-ERR-003 | Session timeout handling | All | Low | Testable |
| LO-ERR-004 | Concurrent login detection | Platform Hub | Low | Testable |
| LO-ERR-005 | Invalid room code shows error | Both Games | Low | Testable |
| LO-ERR-006 | Network error recovery | All | Low | Testable |
| LO-SEC-001 | XSS prevention in inputs | All | Low | Testable |
| LO-SEC-002 | SQL injection prevention | All | Low | Testable |

**Estimated Tests:** 8
**Estimated Duration:** 1-2 minutes

---

## 3. Critical UI Fixes Required

### 3.1 Logout Button Implementation

**Current State:** API route exists at `/api/auth/logout` but no UI button

**Location:** `/Users/j/repos/joolie-boolie-platform/apps/platform-hub/src/components/Header.tsx`

**Required Changes:**

```tsx
// Add to Header.tsx navigation
// 1. Import useAuth hook
import { useAuth } from '@joolie-boolie/auth';

// 2. Add logout handler and conditional rendering
const Header = () => {
  const { user, signOut, isLoading } = useAuth();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    signOut();
  };

  return (
    <nav>
      {/* Existing navigation */}
      {user ? (
        <>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/settings">Settings</Link>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <Link href="/login">Sign In</Link>
      )}
    </nav>
  );
};
```

**Complexity:** Low
**Files Affected:** 1

### 3.2 OAuth Login Buttons in Game Apps

**Current State:** `LoginButton` component exists but is not rendered in main game UI

**Locations:**
- `/Users/j/repos/joolie-boolie-platform/apps/bingo/src/components/auth/LoginButton.tsx` (exists)
- `/Users/j/repos/joolie-boolie-platform/apps/trivia/src/components/auth/LoginButton.tsx` (exists)

**Required Changes:**

Add login/user status indicator to game presenter views or settings panels. The OAuth flow works - it just needs a UI trigger.

**Recommendation:** Add to settings panel or header with conditional rendering based on auth state.

**Complexity:** Low
**Files Affected:** 2-4 (per app)

---

## 4. Test Infrastructure Recommendations

### 4.1 Achieving <5 Minute CI Execution

**Current:** 17+ minutes | **Target:** <5 minutes

#### Strategy 1: Sharding with Parallelization

```typescript
// playwright.config.ts modifications
export default defineConfig({
  // Enable sharding for CI
  ...(process.env.CI && {
    shard: {
      total: parseInt(process.env.SHARD_TOTAL || '4'),
      current: parseInt(process.env.SHARD_INDEX || '1')
    },
  }),

  // Increase workers
  workers: process.env.CI ? 4 : undefined,

  // Reduce timeout for faster failures
  timeout: 30 * 1000, // 30 seconds per test

  // Fast fail on flaky tests
  retries: process.env.CI ? 1 : 0,
});
```

#### Strategy 2: GitHub Actions Matrix

```yaml
# .github/workflows/e2e.yml
jobs:
  e2e:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    env:
      SHARD_INDEX: ${{ matrix.shard }}
      SHARD_TOTAL: 4
    steps:
      - run: pnpm test:e2e --shard=${{ matrix.shard }}/4
```

#### Strategy 3: Critical Path Only on PR

```yaml
# Run full suite on main, critical only on PRs
e2e:
  runs-on: ubuntu-latest
  steps:
    - name: Run critical tests only (PRs)
      if: github.event_name == 'pull_request'
      run: pnpm test:e2e --grep "@critical"

    - name: Run full suite (main)
      if: github.ref == 'refs/heads/main'
      run: pnpm test:e2e
```

### 4.2 Test Data Setup

#### Authentication Fixtures

```typescript
// e2e/fixtures/auth.ts
import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
  testUser: { email: string; password: string };
};

export const test = base.extend<AuthFixtures>({
  testUser: async ({}, use) => {
    use({
      email: 'e2e-test@joolie-boolie.test',
      password: 'TestPassword123!',
    });
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    // Login via API (faster than UI)
    await page.goto('/login');
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Store auth state for reuse
    await page.context().storageState({ path: '.auth/user.json' });

    await use(page);
  },
});
```

#### Reusing Auth State

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    // Setup project - runs once
    { name: 'setup', testMatch: /global.setup\.ts/ },

    // All tests depend on setup
    {
      name: 'authenticated',
      dependencies: ['setup'],
      use: { storageState: '.auth/user.json' },
    },

    // Unauthenticated tests
    {
      name: 'unauthenticated',
      testMatch: '**/auth/*.spec.ts',
    },
  ],
});
```

### 4.3 Platform Hub Project Addition

```typescript
// playwright.config.ts - add Platform Hub
projects: [
  // ... existing bingo and trivia projects

  {
    name: 'platform-hub',
    testDir: './e2e/platform-hub',
    use: {
      ...devices['Desktop Chrome'],
      baseURL: 'http://localhost:3002',
      viewport: { width: 1280, height: 720 },
    },
  },
],

webServer: [
  // ... existing bingo and trivia servers

  {
    command: 'pnpm dev:hub',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
],
```

### 4.4 CI/CD Integration

**Recommended Workflow Structure:**

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # Fast critical path tests on all PRs
  e2e-critical:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install chromium
      - run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ vars.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      - run: pnpm test:e2e --grep "@critical"

  # Full suite on main branch only, sharded
  e2e-full:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      # ... setup steps
      - run: pnpm test:e2e --shard=${{ matrix.shard }}/4
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report-${{ matrix.shard }}
          path: playwright-report/
```

---

## 5. Test Case Adjustments

### 5.1 Tests Requiring Modification

| Original Test | Issue | Recommended Change |
|---------------|-------|-------------------|
| All auth flow tests | No Platform Hub project | Add `e2e/platform-hub/` directory |
| Logout tests | No logout UI | Add `@blocked` tag until UI fixed |
| OAuth SSO tests | No OAuth trigger button | Add `@blocked` tag until UI fixed |
| Theme tests (10+ themes) | Only 2 themes exist | Update to test light/dark only |
| Trivia offline tests | Cache-only offline | Document limitation in test |

### 5.2 Test Tagging Strategy

```typescript
// Use tags to categorize tests
test.describe('@critical Authentication', () => {
  test('user can log in', async ({ page }) => { /* ... */ });
});

test.describe('@blocked Logout Flow', () => {
  test.skip('user can logout - BLOCKED: needs UI button', async () => {
    // Enable after Header.tsx updated
  });
});
```

### 5.3 Existing Tests - Validation Status

| Spec File | Tests | Validated | Notes |
|-----------|-------|-----------|-------|
| bingo/presenter.spec.ts | 17 | **Yes** | All gameplay tests valid |
| bingo/display.spec.ts | 12 | **Yes** | Display sync tests valid |
| bingo/dual-screen.spec.ts | 9 | **Yes** | BroadcastChannel tests valid |
| bingo/keyboard.spec.ts | 10 | **Yes** | All shortcuts implemented |
| bingo/room-setup.spec.ts | 34 | **Yes** | Room + PIN flows valid |
| bingo/accessibility.spec.ts | 24 | **Yes** | WCAG compliance tests |
| bingo/home.spec.ts | 9 | **Yes** | Navigation tests valid |
| bingo/modal-timing.spec.ts | 6 | **Yes** | Modal behavior tests |
| trivia/presenter.spec.ts | 50 | **Yes** | All presenter tests valid |
| trivia/display.spec.ts | 42 | **Yes** | Display tests valid |
| trivia/dual-screen.spec.ts | 36 | **Yes** | Sync tests valid |
| trivia/session-flow.spec.ts | 31 | **Yes** | Game flow tests valid |
| trivia/home.spec.ts | 8 | **Yes** | Navigation tests valid |

---

## 6. Implementation Roadmap

### Phase 0: Pre-requisites (Before any testing work)

| Task | Owner | Complexity | Dependency |
|------|-------|------------|------------|
| Add logout button to Platform Hub Header | Developer | Low | None |
| Add auth navigation links to Header | Developer | Low | None |
| Add Platform Hub project to playwright.config.ts | Developer | Low | None |
| Create e2e/platform-hub/ directory | Developer | Low | None |
| Set up auth fixtures | Developer | Medium | None |

### Phase 1: Critical Path Tests

**Start:** After Phase 0 complete

| Task | Tests | Target Duration |
|------|-------|-----------------|
| Implement CP-AUTH-001 through CP-AUTH-007 | 7 | 1 hour |
| Implement CP-AUTH-008 (logout) | 1 | 30 min |
| Implement CP-SSO-001 through CP-SSO-004 | 4 | 2 hours |
| Implement CP-DASH-001, CP-DASH-002 | 2 | 30 min |
| Tag all tests with `@critical` | - | 15 min |

**Deliverable:** 14 critical tests running in CI

### Phase 2: High Priority Tests

| Task | Tests | Target Duration |
|------|-------|-----------------|
| Profile management tests | 4 | 1 hour |
| Template CRUD tests | 7 | 2 hours |
| Authenticated game session tests | 2 | 1 hour |

**Deliverable:** 27 high-priority tests total

### Phase 3: Medium Priority Tests

| Task | Tests | Target Duration |
|------|-------|-----------------|
| PWA tests | 4 | 1 hour |
| Accessibility tests | 3 | 1 hour |
| Theme tests | 1 | 30 min |
| Verify existing sync tests | 2 | Review only |

**Deliverable:** 37 tests total

### Phase 4: Low Priority & Maintenance

| Task | Tests | Target Duration |
|------|-------|-----------------|
| Error handling tests | 6 | 2 hours |
| Security tests | 2 | 1 hour |
| Ongoing flakiness fixes | - | Continuous |

**Deliverable:** 45 new tests + 288 existing = 333 total tests

---

## 7. Success Metrics

### 7.1 Coverage Targets

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| Auth flow coverage | 0% | 100% | Critical path complete |
| Platform Hub coverage | 0% | 80% | Dashboard, settings, auth |
| Bingo gameplay coverage | 100% | 100% | Maintain |
| Trivia gameplay coverage | 100% | 100% | Maintain |
| Template CRUD coverage | 0% | 100% | End-to-end flows |

### 7.2 Execution Time Targets

| Scenario | Current | Target |
|----------|---------|--------|
| Full suite | 17+ min | <5 min |
| Critical path only | N/A | <2 min |
| Single app tests | ~8 min | <2 min |
| Per-shard (4 shards) | N/A | <3 min |

### 7.3 Reliability Metrics

| Metric | Target |
|--------|--------|
| Flakiness rate | <2% |
| First-pass rate | >95% |
| Max retries needed | 1 |

### 7.4 CI Requirements

| Requirement | Status |
|-------------|--------|
| E2E tests enabled on PRs | Target: After Phase 1 |
| E2E tests block merge | Target: After Phase 2 |
| Full suite on main branch | Target: After Phase 3 |
| Sharded execution | Target: Implement in Phase 1 |

---

## 8. Appendix

### 8.1 File Structure for New Tests

```
e2e/
├── fixtures/
│   ├── auth.ts           # Authentication fixtures
│   ├── templates.ts      # Template data fixtures
│   └── test-data.ts      # Shared test data
├── utils/
│   └── helpers.ts        # Existing helpers (keep)
├── bingo/                # Existing (keep)
├── trivia/               # Existing (keep)
└── platform-hub/         # NEW
    ├── auth.spec.ts      # Login, signup, logout
    ├── dashboard.spec.ts # Dashboard features
    ├── profile.spec.ts   # Profile management
    ├── oauth.spec.ts     # OAuth consent flows
    └── settings.spec.ts  # User settings
```

### 8.2 Existing Test Inventory

**Total Lines of E2E Test Code:** 4,391

| File | Lines | Test Cases |
|------|-------|------------|
| bingo/accessibility.spec.ts | 293 | 24 |
| bingo/display.spec.ts | 189 | 12 |
| bingo/dual-screen.spec.ts | 248 | 9 |
| bingo/home.spec.ts | 66 | 9 |
| bingo/keyboard.spec.ts | 225 | 10 |
| bingo/modal-timing.spec.ts | 145 | 6 |
| bingo/presenter.spec.ts | 210 | 17 |
| bingo/room-setup.spec.ts | 476 | 34 |
| trivia/display.spec.ts | 715 | 42 |
| trivia/dual-screen.spec.ts | 724 | 36 |
| trivia/home.spec.ts | 54 | 8 |
| trivia/presenter.spec.ts | 492 | 50 |
| trivia/session-flow.spec.ts | 554 | 31 |

### 8.3 Related Documentation

- `/Users/j/repos/joolie-boolie-platform/CLAUDE.md` - Project overview
- `/Users/j/repos/joolie-boolie-platform/docs/MASTER_PLAN.md` - MVP roadmap
- `/Users/j/repos/joolie-boolie-platform/playwright.config.ts` - Current E2E config
- `/Users/j/repos/joolie-boolie-platform/.github/workflows/e2e.yml` - CI workflow (disabled)

---

## 9. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-23 | Focus on auth tests first | Existing gameplay tests are complete; auth is the gap |
| 2026-01-23 | Add Platform Hub to Playwright | Required for SSO and dashboard testing |
| 2026-01-23 | Use sharding strategy | Fastest path to <5 min execution |
| 2026-01-23 | Tag-based test selection | Enables critical-path-only runs on PRs |
| 2026-01-23 | Fix UI blockers before testing | Cannot test non-existent UI |

---

**Next Steps:**

1. Review and approve this proposal
2. Create Linear issues for Phase 0 tasks
3. Implement UI fixes (logout button, auth navigation)
4. Begin Phase 1 test implementation
