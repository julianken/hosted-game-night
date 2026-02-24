# Linear E2E Testing Project Plan

**Document Version:** 4.0
**Created:** 2026-01-23
**Updated:** 2026-01-23 (Revised after codebase validation)
**Initiative:** E2E Testing Coverage
**Issue Range:** BEA-313 through BEA-318 (BEA-317 deferred to Phase 3)

---

## Executive Summary

### Scope Clarification

**This initiative validates the feature-complete MVP by adding Platform Hub E2E tests** while preserving the existing comprehensive coverage in Bingo and Trivia. The existing 288 tests provide irreplaceable coverage for game mechanics, dual-screen sync, accessibility, and PWA functionality that took significant effort to create and maintain.

**What we are doing:**
- Adding ~96-99 new Platform Hub tests to validate authentication, dashboard, profile, and SSO flows
- Improving CI infrastructure (sharding, tags) to enable reliable test execution
- Bringing total E2E coverage to ~384-387 tests across all three apps

**What we are NOT doing:**
- Deleting existing Bingo/Trivia tests (they provide critical coverage)
- Rebuilding test infrastructure from scratch
- Starting over with a "clean slate"
- Testing features that don't exist yet (deferred to Phase 3)

### Current State

| Metric | Value |
|--------|-------|
| Existing E2E Tests | 288 test cases |
| Existing Test Files | 13 spec files (Bingo: 8, Trivia: 5) |
| Lines of E2E Code | 4,391 |
| Platform Hub Tests | 0 (directory scaffolded, no tests) |
| CI Status | **DISABLED** (17+ min execution, stability issues) |

### Existing Coverage (Preserved)

| Application | Test Files | Test Cases | Coverage Areas |
|-------------|-----------|------------|----------------|
| Bingo | 8 | ~150 | Game engine (75-ball mechanics), 29 patterns, dual-screen sync, audio system, room setup, keyboard shortcuts, accessibility (WCAG AA), PWA/offline |
| Trivia | 5 | ~130 | Game engine (questions/rounds), team management, scoring, TTS, dual-screen sync, question import, templates, timer system |
| **Subtotal** | **13** | **~280** | **Comprehensive game coverage** |

### Target State (Revised)

| Metric | Target |
|--------|--------|
| Total E2E Tests | ~384-387 test cases (288 existing + 96-99 new) |
| Platform Hub Tests | 6-7 spec files (~1,200-1,400 LOC) |
| CI Execution Time | <5 minutes (sharded) |
| Critical Path Tests | <2 minutes |
| Test Reliability | >98% pass rate |

### Key Findings from Audit

1. **Existing Tests Are Valuable:** The 288 Bingo/Trivia tests provide irreplaceable coverage for complex game mechanics, accessibility, and dual-screen synchronization
2. **Platform Hub Is the Gap:** Zero E2E tests exist for authentication, dashboard, profile, or SSO flows
3. **Infrastructure Ready:** Playwright config already includes platform-hub project and webServer configuration
4. **Auth Fixtures Ready:** `e2e/fixtures/auth.ts` provides authenticatedPage fixture
5. **Blockers Resolved:** Logout button and auth navigation already implemented in Platform Hub Header.tsx

### Validation Findings (2026-01-23)

After comprehensive codebase validation, we identified scope adjustments needed:

| Issue | Original | Revised | Reason |
|-------|----------|---------|--------|
| BEA-314 | 24 tests | 18-20 tests | Password reset token page missing, duplicate tests |
| BEA-315 | 25 tests | 18 tests | Theme switching, notifications, avatar upload not implemented |
| BEA-316 | 22 tests | 22 tests | ✅ All features exist |
| BEA-317 | 8 tests | **DEFERRED** | Template management UI doesn't exist (Phase 3) |
| BEA-318 | 20 tests | 18-19 tests | Platform Hub has no PWA, session timeout missing |

**Impact:** Realistic scope is 96-99 new tests (down from 110-150), but all test what actually exists in the codebase.

### Issue Summary (Revised)

| ID | Title | Priority | Tests | Blocks | Status |
|----|-------|----------|-------|--------|--------|
| BEA-313 | E2E Infrastructure: Sharding & CI Integration | P1 | Setup | BEA-316, BEA-318 | ✅ Ready |
| BEA-314 | Platform Hub Auth Flow E2E Tests | P0 | 18-20 | BEA-316 | ✅ Ready |
| BEA-315 | Platform Hub Dashboard & Profile E2E Tests | P1 | 18 | None | ✅ Ready |
| BEA-316 | Cross-App SSO E2E Tests | P1 | 22 | None | ⏳ Blocked |
| BEA-317 | Template CRUD E2E Tests | P2 | 8 | None | 🚫 **DEFERRED (Phase 3)** |
| BEA-318 | Accessibility & Security E2E Tests | P2 | 18-19 | None | ⏳ Blocked |

---

## Dependency Graph

```
                    ┌──────────────────────────────────────────────────────────────┐
                    │                 WAVE 3: E2E TESTING COVERAGE                  │
                    │         (Adding Platform Hub tests to existing suite)         │
                    └──────────────────────────────────────────────────────────────┘

    PARALLEL GROUP A (No Dependencies - Can Start Immediately)
    ─────────────────────────────────────────────────────────────────────────────────
    ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
    │     BEA-313         │     │     BEA-314         │     │     BEA-315         │
    │ Infrastructure &    │     │ Platform Hub Auth   │     │ Dashboard & Profile │
    │ Sharding Setup      │     │ Flow E2E Tests      │     │ E2E Tests           │
    │ [Medium]            │     │ [Large - Critical]  │     │ [Medium]            │
    │                     │     │                     │     │                     │
    │ Blocked By: None    │     │ Blocked By: None    │     │ Blocked By: None    │
    └─────────┬───────────┘     └─────────┬───────────┘     └─────────────────────┘
              │                           │
              │ (blocks)                  │ (blocks)
              ▼                           ▼
    PARALLEL GROUP B (Depends on Group A)
    ─────────────────────────────────────────────────────────────────────────────────
    ┌─────────────────────┐     ┌─────────────────────┐
    │     BEA-316         │     │     BEA-317         │
    │ Cross-App SSO       │     │ Template CRUD       │
    │ E2E Tests           │     │ E2E Tests           │
    │ [Large]             │     │ [Medium]            │
    │                     │     │                     │
    │ Blocked By:         │     │ Blocked By:         │
    │ BEA-313, BEA-314    │     │ BEA-314             │
    └─────────────────────┘     └─────────────────────┘

    ┌─────────────────────┐
    │     BEA-318         │
    │ PWA, A11y &         │
    │ Security Tests      │
    │ [Medium]            │
    │                     │
    │ Blocked By: BEA-313 │
    └─────────────────────┘


    DEPENDENCY SUMMARY:
    ─────────────────────────────────────────────────────────────────────────────────

    BEA-313 (Infrastructure)
      └── BLOCKS: BEA-316, BEA-318

    BEA-314 (Auth Tests)
      └── BLOCKS: BEA-316, BEA-317

    BEA-315 (Dashboard Tests)
      └── BLOCKS: None (independent)

    BEA-316 (SSO Tests)
      └── BLOCKS: None (depends on BEA-313 + BEA-314)

    BEA-317 (Template Tests)
      └── BLOCKS: None (depends on BEA-314)

    BEA-318 (PWA/A11y Tests)
      └── BLOCKS: None (depends on BEA-313)


    PARALLELIZATION OPPORTUNITIES:
    ─────────────────────────────────────────────────────────────────────────────────

    Can start immediately (no dependencies):
    ├── BEA-313 (Infrastructure)
    ├── BEA-314 (Auth Tests)
    └── BEA-315 (Dashboard Tests)

    After BEA-313 + BEA-314 complete:
    ├── BEA-316 (SSO Tests)
    └── BEA-317 (Template Tests) - only needs BEA-314

    After BEA-313 completes:
    └── BEA-318 (PWA/A11y Tests)

    Maximum parallelism: 3 agents from the start
```

---

## Critical Path Analysis

### Shortest Path to CI-Enabled Tests

```
BEA-314 (Auth Tests) ──► Critical auth coverage
    │
    └── Enable CI with @critical tag filter (<2 min)

BEA-313 (Infrastructure) ──► CI sharding enabled

After critical path:
    ├── BEA-315 (Dashboard) - can run in parallel with above
    ├── BEA-316 (SSO) - needs BEA-313 + BEA-314
    ├── BEA-317 (Templates) - needs BEA-314
    └── BEA-318 (PWA/A11y) - needs BEA-313
```

### Minimum Viable E2E (First Tests to Enable CI)

To unblock CI as fast as possible, implement these tests first in BEA-314:

1. Login success flow (1 test)
2. Login failure flow (1 test)
3. Logout flow (1 test)
4. Protected route redirect (1 test)

**4 tests = CI-enabled immediately after BEA-314**

---

## Linear Issues (Detailed)

### BEA-313: E2E Infrastructure - Sharding & CI Integration

```yaml
ID: BEA-313
Title: E2E Infrastructure - Sharding & CI Integration
Project: Wave 3 - E2E Testing
Type: type:infra, type:test
Severity: severity:high
Priority: P1 (High)
Component: app:bingo, app:trivia, app:platform-hub
Complexity: Medium (~150-250 LOC)

Blocks: BEA-316, BEA-318
Blocked By: None
Related: BEA-314
```

#### Problem

E2E tests need infrastructure improvements for:
- Sharding to run tests in parallel across CI workers
- Tag-based filtering for critical-path-only runs on PRs
- Global auth state setup to avoid redundant logins
- CI execution currently disabled due to 17+ minute runtime

#### Solution

1. Configure Playwright sharding for CI (4 shards)
2. Add test tagging system (@critical, @high, @medium, @low)
3. Update GitHub Actions workflow for:
   - Critical tests only on PRs (<2 min)
   - Full sharded suite on main branch (<5 min)
4. Add global setup for auth state persistence

#### Files to Create/Modify

| File | Action | LOC Est |
|------|--------|---------|
| `playwright.config.ts` | Modify - add sharding, projects | ~50 |
| `e2e/global-setup.ts` | Create - auth state setup | ~40 |
| `.github/workflows/e2e.yml` | Modify - enable, add sharding | ~60 |
| `e2e/fixtures/tags.ts` | Create - test tag utilities | ~30 |

#### Acceptance Criteria

- [ ] `playwright.config.ts` has sharding config: `shard: { total: 4, current: N }`
- [ ] Global setup creates `.auth/user.json` for authenticated tests
- [ ] GitHub Actions workflow runs critical tests on PRs
- [ ] GitHub Actions workflow runs full suite on main with 4 shards
- [ ] `pnpm test:e2e:critical` runs only @critical tagged tests
- [ ] Total sharded execution time <5 minutes
- [ ] Existing Bingo/Trivia tests continue to pass

#### Verification Commands

```bash
# Test sharding locally
pnpm test:e2e --shard=1/4
pnpm test:e2e --shard=2/4

# Test critical-only filter
pnpm test:e2e --grep "@critical"

# Verify all 3 web servers start
pnpm dev & sleep 30 && curl -s localhost:3000 && curl -s localhost:3001 && curl -s localhost:3002

# Verify existing tests still pass
pnpm test:e2e --project=bingo
pnpm test:e2e --project=trivia
```

---

### BEA-314: Platform Hub Auth Flow E2E Tests

```yaml
ID: BEA-314
Title: Platform Hub Auth Flow E2E Tests
Project: Wave 3 - E2E Testing
Type: type:test, type:e2e
Severity: severity:critical
Priority: P0 (Urgent)
Component: app:platform-hub
Complexity: Large (~400-600 LOC)

Blocks: BEA-316, BEA-317
Blocked By: None
Related: BEA-313
```

#### Problem

Platform Hub has 0% E2E test coverage for authentication flows. This is the critical path that must work before any other feature testing.

#### Current State

- Login page exists: `/login`
- Signup page exists: `/signup`
- Forgot password page exists: `/forgot-password`
- Dashboard exists: `/dashboard`
- Settings page exists: `/settings`
- Logout button exists in Header (implemented)
- Auth fixtures exist in `e2e/fixtures/auth.ts`
- Platform Hub project configured in `playwright.config.ts`
- No actual test files exist

#### Solution

Create comprehensive auth flow E2E tests covering:
- Signup flow (success, validation, duplicate email)
- Login flow (success, invalid credentials, unconfirmed email)
- Logout flow (button click, session clear, redirect)
- Password reset flow (request, email validation)
- Protected route redirects (unauthenticated -> login)
- Session persistence (refresh maintains auth)

#### Files to Create

| File | LOC Est | Tests Est |
|------|---------|-----------|
| `e2e/platform-hub/auth.spec.ts` | ~300 | 14 |
| `e2e/platform-hub/signup.spec.ts` | ~150 | 6 |
| `e2e/platform-hub/logout.spec.ts` | ~100 | 4 |

#### Test Cases (24 total)

```typescript
// auth.spec.ts - Login flows
describe('@critical Authentication', () => {
  test('user can log in with valid credentials');           // CP-AUTH-002
  test('invalid login shows error message');                // CP-AUTH-003
  test('email not confirmed shows error message');          // CP-AUTH-004
  test('protected routes redirect to login');               // CP-AUTH-007
  test('session persists after page refresh');              // Session persistence
  test('forgot password page renders correctly');           // CP-AUTH-005
  test('password reset request shows confirmation');        // CP-AUTH-005
  test('password reset with valid token works');            // CP-AUTH-006
  test('password reset with invalid token shows error');    // Error handling
});

// signup.spec.ts - Registration flows
describe('@critical Signup', () => {
  test('signup page renders correctly');                    // UI validation
  test('user can sign up with email');                      // CP-AUTH-001
  test('invalid email format shows error');                 // Validation
  test('weak password shows requirements');                 // Validation
  test('password mismatch shows error');                    // Validation
  test('duplicate email shows error');                      // Error handling
});

// logout.spec.ts - Logout flows
describe('@critical Logout', () => {
  test('logout button visible when authenticated');         // UI
  test('user can logout via header button');                // CP-AUTH-008
  test('logout clears auth cookies');                       // Security
  test('logout redirects to home page');                    // UX
  test('logged out user cannot access dashboard');          // Protection
});
```

#### Acceptance Criteria

- [ ] `e2e/platform-hub/auth.spec.ts` has 9+ passing tests
- [ ] `e2e/platform-hub/signup.spec.ts` has 6+ passing tests
- [ ] `e2e/platform-hub/logout.spec.ts` has 5+ passing tests
- [ ] All tests tagged with @critical
- [ ] Tests use `e2e/fixtures/auth.ts` for authenticated pages
- [ ] `pnpm test:e2e --project=platform-hub` passes
- [ ] No flaky tests (3 consecutive green runs)

#### Verification Commands

```bash
# Run Platform Hub tests only
pnpm test:e2e --project=platform-hub

# Run critical auth tests
pnpm test:e2e --project=platform-hub --grep "@critical"

# Generate HTML report
pnpm test:e2e --project=platform-hub --reporter=html
```

---

### BEA-315: Platform Hub Dashboard & Profile E2E Tests

```yaml
ID: BEA-315
Title: Platform Hub Dashboard & Profile E2E Tests
Project: Wave 3 - E2E Testing
Type: type:test, type:e2e
Severity: severity:high
Priority: P1 (High)
Component: app:platform-hub
Complexity: Medium (~200-300 LOC)

Blocks: None
Blocked By: None
Related: BEA-310 (Profile Management feature), BEA-309 (Dashboard feature)
```

#### Problem

Dashboard and profile management features (BEA-309, BEA-310) have no E2E coverage. Users cannot verify end-to-end functionality of these recently completed features.

#### Solution

Create E2E tests for:
- Dashboard displays user info correctly
- Dashboard shows recent sessions
- Dashboard shows game statistics
- Profile update functionality
- Settings page functionality
- Error handling for profile updates

#### Files to Create

| File | LOC Est | Tests Est |
|------|---------|-----------|
| `e2e/platform-hub/dashboard.spec.ts` | ~200 | 10 |
| `e2e/platform-hub/profile.spec.ts` | ~200 | 10 |
| `e2e/platform-hub/settings.spec.ts` | ~100 | 5 |

#### Test Cases (25 total)

```typescript
// dashboard.spec.ts
describe('@high Dashboard', () => {
  test('dashboard page renders for authenticated user');    // Basic render
  test('dashboard shows user email');                       // CP-DASH-001
  test('dashboard shows display name');                     // CP-DASH-001
  test('dashboard shows facility name');                    // CP-DASH-001
  test('dashboard shows recent game sessions');             // CP-DASH-002
  test('dashboard shows game statistics');                  // Stats display
  test('dashboard links to settings');                      // Navigation
  test('empty state shows for new users');                  // Edge case
  test('dashboard data refreshes on navigation');           // UX
  test('unauthenticated user redirected from dashboard');   // Protection
});

// profile.spec.ts
describe('@high Profile Management', () => {
  test('profile section displays current values');          // Read
  test('user can update display name');                     // HI-PROF-001
  test('user can update facility name');                    // HI-PROF-001
  test('user can change email');                            // HI-PROF-002
  test('user can change password');                         // HI-PROF-003
  test('invalid current password rejected');                // HI-PROF-004
  test('profile changes show success toast');               // UX
  test('profile validation errors displayed');              // UX
  test('avatar upload works correctly');                    // If implemented
  test('profile changes persist after page reload');        // Persistence
});

// settings.spec.ts
describe('@high Settings', () => {
  test('settings page loads for authenticated user');
  test('theme preference can be changed');
  test('notification preferences can be toggled');
  test('settings persist after page reload');
  test('unauthenticated user redirected from settings');
});
```

#### Acceptance Criteria

- [ ] `e2e/platform-hub/dashboard.spec.ts` has 10 passing tests
- [ ] `e2e/platform-hub/profile.spec.ts` has 10 passing tests
- [ ] `e2e/platform-hub/settings.spec.ts` has 5 passing tests
- [ ] All tests tagged with @high
- [ ] Tests use `authenticatedPage` fixture
- [ ] Tests verify toast notifications appear
- [ ] `pnpm test:e2e --project=platform-hub` passes

#### Verification Commands

```bash
# Run dashboard/profile tests
pnpm test:e2e --project=platform-hub dashboard profile settings

# Check for flaky tests
pnpm test:e2e --project=platform-hub --repeat-each=3
```

---

### BEA-316: Cross-App SSO E2E Tests

```yaml
ID: BEA-316
Title: Cross-App SSO E2E Tests
Project: Wave 3 - E2E Testing
Type: type:test, type:e2e
Severity: severity:critical
Priority: P1 (High)
Component: app:bingo, app:trivia, app:platform-hub
Complexity: Large (~300-500 LOC)

Blocks: None
Blocked By: BEA-313, BEA-314
Related: OAuth implementation (BEA-306 through BEA-312)
```

#### Problem

Cross-app Single Sign-On (SSO) via OAuth is the core Platform Hub value proposition but has 0% E2E coverage. The complete flow spanning all three apps is untested.

#### Solution

Create E2E tests for:
- OAuth flow from Bingo to Platform Hub
- OAuth flow from Trivia to Platform Hub
- OAuth consent page functionality
- Token exchange and callback handling
- Cross-app session sharing (login once, access all)

#### Files to Create

| File | LOC Est | Tests Est |
|------|---------|-----------|
| `e2e/platform-hub/oauth.spec.ts` | ~250 | 10 |
| `e2e/platform-hub/sso-bingo.spec.ts` | ~150 | 6 |
| `e2e/platform-hub/sso-trivia.spec.ts` | ~150 | 6 |

#### Test Cases (22 total)

```typescript
// platform-hub/oauth.spec.ts - Consent page
describe('@critical OAuth Consent', () => {
  test('consent page displays client name');                // CP-SSO-003
  test('consent page shows requested scopes');              // CP-SSO-003
  test('consent page shows logged-in user');                // CP-SSO-003
  test('approve redirects with auth code');                 // CP-SSO-004
  test('deny redirects with error=access_denied');          // Error flow
  test('invalid authorization_id shows error');             // Error handling
  test('expired authorization shows error');                // Error handling
  test('unauthenticated user redirected to login');         // Protection
  test('PKCE code_challenge validated correctly');          // Security
  test('state parameter preserved through flow');           // Security
});

// platform-hub/sso-bingo.spec.ts
describe('@critical Bingo SSO', () => {
  test('login button triggers OAuth flow');                 // CP-SSO-001
  test('complete SSO flow: Bingo -> Hub -> Bingo');         // Full flow
  test('OAuth callback exchanges code for tokens');         // Token flow
  test('authenticated user can access /play');              // Protected route
  test('tokens stored in httpOnly cookies');                // Security
  test('token refresh works before expiration');            // Session maintenance
});

// platform-hub/sso-trivia.spec.ts
describe('@critical Trivia SSO', () => {
  test('login button triggers OAuth flow');                 // CP-SSO-002
  test('complete SSO flow: Trivia -> Hub -> Trivia');       // Full flow
  test('OAuth callback exchanges code for tokens');         // Token flow
  test('authenticated user can access /play');              // Protected route
  test('tokens stored in httpOnly cookies');                // Security
  test('token refresh works before expiration');            // Session maintenance
});
```

#### Multi-App Test Strategy

These tests require all 3 apps running and coordination:

```typescript
// Example multi-app flow
test('complete SSO flow: Bingo -> Hub -> Bingo', async ({ browser }) => {
  // 1. Start at Bingo
  const bingoPage = await browser.newPage();
  await bingoPage.goto('http://localhost:3000');

  // 2. Click login, redirects to Platform Hub
  await bingoPage.click('[data-testid="login-button"]');
  await expect(bingoPage).toHaveURL(/localhost:3002/);

  // 3. Login at Platform Hub
  await bingoPage.fill('[name="email"]', 'test@example.com');
  await bingoPage.fill('[name="password"]', 'password');
  await bingoPage.click('button[type="submit"]');

  // 4. Approve OAuth consent
  await expect(bingoPage).toHaveURL(/oauth\/consent/);
  await bingoPage.click('[data-testid="approve-button"]');

  // 5. Redirected back to Bingo, authenticated
  await expect(bingoPage).toHaveURL(/localhost:3000/);
  await expect(bingoPage.locator('[data-testid="user-menu"]')).toBeVisible();
});
```

#### Acceptance Criteria

- [ ] `e2e/platform-hub/oauth.spec.ts` has 10 passing tests
- [ ] `e2e/platform-hub/sso-bingo.spec.ts` has 6 passing tests
- [ ] `e2e/platform-hub/sso-trivia.spec.ts` has 6 passing tests
- [ ] All tests tagged with @critical
- [ ] Tests handle multi-app navigation correctly
- [ ] PKCE code_verifier/code_challenge flow verified
- [ ] Token storage in cookies verified
- [ ] No race conditions in multi-page flows

#### Verification Commands

```bash
# Run all OAuth tests
pnpm test:e2e oauth sso-bingo sso-trivia

# Run cross-app tests (requires all servers)
pnpm dev & pnpm test:e2e --grep "SSO"
```

---

### BEA-317: Template CRUD E2E Tests

```yaml
ID: BEA-317
Title: Template CRUD E2E Tests (Platform Hub)
Project: Wave 3 - E2E Testing
Type: type:test, type:e2e
Severity: severity:medium
Priority: P2 (Medium)
Component: app:platform-hub
Complexity: Medium (~150-200 LOC)

Blocks: None
Blocked By: BEA-314
Related: Template API routes
```

#### Problem

Template management in Platform Hub (viewing, organizing user templates) has API tests but no E2E coverage through the UI. Note: Bingo/Trivia already have template tests in their existing suites.

#### Solution

Create E2E tests for template management UI in Platform Hub (if template management UI exists in Platform Hub). Focus on:
- Template list view
- Template details view
- Template organization/categorization
- Template sharing (if implemented)

#### Files to Create

| File | LOC Est | Tests Est |
|------|---------|-----------|
| `e2e/platform-hub/templates.spec.ts` | ~150 | 8 |

#### Test Cases (8 total)

```typescript
// platform-hub/templates.spec.ts
describe('@high Platform Hub Templates', () => {
  test('template list shows all user templates');           // HI-TMPL-001
  test('template list shows bingo templates');              // Filter
  test('template list shows trivia templates');             // Filter
  test('clicking template shows details');                  // Navigation
  test('template details show game-specific info');         // Details
  test('empty state shows for users with no templates');    // Edge case
  test('template search works correctly');                  // Search
  test('template sorting works correctly');                 // Sort
});
```

#### Acceptance Criteria

- [ ] `e2e/platform-hub/templates.spec.ts` has 8 passing tests
- [ ] All tests tagged with @high
- [ ] Tests use authenticated fixtures
- [ ] Template listing verified with real data
- [ ] If template management UI doesn't exist in Platform Hub, document that scope is reduced

#### Verification Commands

```bash
# Run template tests
pnpm test:e2e --project=platform-hub templates
```

---

### BEA-318: PWA, Accessibility & Security E2E Tests (Platform Hub)

```yaml
ID: BEA-318
Title: PWA, Accessibility & Security E2E Tests (Platform Hub)
Project: Wave 3 - E2E Testing
Type: type:test, type:e2e
Severity: severity:medium
Priority: P2 (Medium)
Component: app:platform-hub
Complexity: Medium (~200-300 LOC)

Blocks: None
Blocked By: BEA-313
Related: Existing accessibility tests in Bingo/Trivia
```

#### Problem

Platform Hub lacks PWA functionality, accessibility compliance, and security edge case E2E coverage. Note: Bingo and Trivia already have comprehensive accessibility tests in their existing suites.

#### Solution

Create Platform Hub-specific tests for:
- Accessibility (keyboard navigation, screen reader, focus indicators)
- Security edge cases (rate limiting, session timeout, XSS prevention)
- Error handling and edge cases

#### Files to Create

| File | LOC Est | Tests Est |
|------|---------|-----------|
| `e2e/platform-hub/accessibility.spec.ts` | ~150 | 8 |
| `e2e/platform-hub/security.spec.ts` | ~100 | 6 |
| `e2e/platform-hub/error-handling.spec.ts` | ~100 | 6 |

#### Test Cases (20 total)

```typescript
// accessibility.spec.ts
describe('@medium Accessibility', () => {
  test('all interactive elements are focusable');           // MD-A11Y-001
  test('keyboard navigation works on login page');          // MD-A11Y-001
  test('keyboard navigation works on dashboard');           // MD-A11Y-001
  test('keyboard navigation works on settings');            // MD-A11Y-001
  test('focus indicators are visible');                     // WCAG
  test('color contrast meets WCAG AA on login');            // MD-A11Y-002
  test('color contrast meets WCAG AA on dashboard');        // MD-A11Y-002
  test('form labels are properly associated');              // WCAG
});

// security.spec.ts
describe('@low Security', () => {
  test('rate limiting triggers after excessive requests');  // LO-ERR-001
  test('session timeout redirects to login');               // LO-ERR-003
  test('XSS prevention in profile input fields');           // LO-SEC-001
  test('XSS prevention in search fields');                  // LO-SEC-001
  test('CSRF protection on form submissions');              // LO-ERR-002
  test('sensitive data not exposed in page source');        // Security
});

// error-handling.spec.ts
describe('@medium Error Handling', () => {
  test('404 page displays for invalid routes');             // Error page
  test('500 error handled gracefully');                     // Error handling
  test('network error shows retry option');                 // LO-ERR-006
  test('form submission errors display clearly');           // UX
  test('API timeout handled with user feedback');           // UX
  test('concurrent request conflicts handled');             // Edge case
});
```

#### Acceptance Criteria

- [ ] `e2e/platform-hub/accessibility.spec.ts` passes axe-core checks
- [ ] `e2e/platform-hub/security.spec.ts` has 6 passing tests
- [ ] `e2e/platform-hub/error-handling.spec.ts` has 6 passing tests
- [ ] All tests appropriately tagged (@medium, @low)
- [ ] Tests don't depend on network conditions unreliably
- [ ] Security tests may need test mode for rate limiting

#### Verification Commands

```bash
# Run accessibility tests
pnpm test:e2e --project=platform-hub accessibility

# Run security tests (may need special setup for rate limiting)
pnpm test:e2e --project=platform-hub security

# Run with axe analysis
pnpm test:e2e --grep "a11y"
```

---

## Parallelization Strategy

### Work Distribution for Multiple Agents

```
    START (No prerequisites - can run immediately)
    ─────────────────────────────────────────────────────────────────
        │                     │                     │
        ▼                     ▼                     ▼
    BEA-313              BEA-314              BEA-315
  (Infrastructure)    (Auth Tests)       (Dashboard Tests)
        │                     │
        │    ┌────────────────┤
        │    │                │
        ▼    ▼                ▼
    BEA-318              BEA-316              BEA-317
  (A11y/Security)      (SSO Tests)       (Template Tests)
```

### Agent Assignment Based on Dependencies

| Issue | Can Start When | Can Run Parallel With |
|-------|----------------|----------------------|
| BEA-313 | Immediately | BEA-314, BEA-315 |
| BEA-314 | Immediately | BEA-313, BEA-315 |
| BEA-315 | Immediately | BEA-313, BEA-314 |
| BEA-316 | After BEA-313 + BEA-314 | BEA-317, BEA-318 |
| BEA-317 | After BEA-314 | BEA-316, BEA-318 |
| BEA-318 | After BEA-313 | BEA-316, BEA-317 |

### Optimal Execution Order

```
Execution 1: BEA-313 + BEA-314 + BEA-315 (parallel - 3 agents)
             └── Output: CI enabled, auth + dashboard tests

Execution 2: BEA-316 + BEA-317 + BEA-318 (parallel - 3 agents)
             └── Output: Full Platform Hub coverage
```

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Auth fixture flakiness | BEA-314 includes 3-run stability check |
| Multi-app coordination | BEA-316 uses explicit waits, not race conditions |
| CI timeout | BEA-313 implements sharding before full suite |
| Test data pollution | Each test cleans up its data (afterEach hooks) |
| Existing tests break | All issues include verification that existing tests pass |

---

## Success Metrics

### Coverage Targets

| Area | Current | Target | Notes |
|------|---------|--------|-------|
| Auth flows | 0% | 100% | BEA-314 |
| Platform Hub | 0% | 80% | BEA-314, BEA-315, BEA-316, BEA-317, BEA-318 |
| SSO/OAuth | 0% | 100% | BEA-316 |
| Bingo gameplay | 100% | 100% | Preserved (existing 150 tests) |
| Trivia gameplay | 100% | 100% | Preserved (existing 130 tests) |

### Test Count Targets

| Metric | Current | After Wave 3 |
|--------|---------|--------------|
| Bingo tests | ~150 | ~150 (preserved) |
| Trivia tests | ~130 | ~130 (preserved) |
| Platform Hub tests | 0 | ~110-150 (new) |
| **Total tests** | **~280** | **~400-440** |

### Execution Targets

| Scenario | Current | Target |
|----------|---------|--------|
| Full suite | 17+ min | <5 min |
| Critical path | N/A | <2 min |
| Per shard | N/A | <3 min |
| Reliability | Unknown | >98% |

### Definition of Done (Wave 3)

- [ ] All 6 issues completed
- [ ] ~110-150 new Platform Hub tests passing
- [ ] Existing 288 Bingo/Trivia tests still passing
- [ ] Total test count: ~400-440 tests
- [ ] CI enabled for critical tests on PRs
- [ ] CI enabled for full suite on main
- [ ] <5 minute execution with sharding
- [ ] 0 flaky tests (verified with repeat runs)
- [ ] Documentation updated

---

## File Structure After Wave 3

```
e2e/
├── fixtures/
│   ├── auth.ts              # Existing - authenticatedPage fixture
│   └── tags.ts              # NEW - test tagging utilities (BEA-313)
├── global-setup.ts          # NEW - auth state persistence (BEA-313)
├── utils/
│   ├── fixtures.ts          # Existing - helper fixtures
│   └── helpers.ts           # Existing - wait utilities
├── bingo/                   # PRESERVED - 8 existing spec files (~150 tests)
│   ├── accessibility.spec.ts
│   ├── display.spec.ts
│   ├── dual-screen.spec.ts
│   ├── home.spec.ts
│   ├── keyboard.spec.ts
│   ├── modal-timing.spec.ts
│   ├── presenter.spec.ts
│   └── room-setup.spec.ts
├── trivia/                  # PRESERVED - 5 existing spec files (~130 tests)
│   ├── display.spec.ts
│   ├── dual-screen.spec.ts
│   ├── home.spec.ts
│   ├── presenter.spec.ts
│   └── session-flow.spec.ts
└── platform-hub/            # NEW - 10 spec files (~110-150 tests)
    ├── auth.spec.ts         # NEW (BEA-314)
    ├── signup.spec.ts       # NEW (BEA-314)
    ├── logout.spec.ts       # NEW (BEA-314)
    ├── dashboard.spec.ts    # NEW (BEA-315)
    ├── profile.spec.ts      # NEW (BEA-315)
    ├── settings.spec.ts     # NEW (BEA-315)
    ├── oauth.spec.ts        # NEW (BEA-316)
    ├── sso-bingo.spec.ts    # NEW (BEA-316)
    ├── sso-trivia.spec.ts   # NEW (BEA-316)
    ├── templates.spec.ts    # NEW (BEA-317)
    ├── accessibility.spec.ts # NEW (BEA-318)
    ├── security.spec.ts     # NEW (BEA-318)
    └── error-handling.spec.ts # NEW (BEA-318)
```

**Summary:**
- **Preserved files:** 13 spec files in Bingo/Trivia (~4,400 LOC, ~280 tests)
- **New files:** 13 spec files in Platform Hub (~1,500-2,500 LOC, ~110-150 tests)
- **Total after Wave 3:** 26 spec files + 4 utils (~400-440 tests)

---

## References

- `/Users/j/repos/joolie-boolie-platform/docs/E2E_TESTING_STRATEGY.md` - Detailed test case analysis
- `/Users/j/repos/joolie-boolie-platform/docs/LINEAR_PROJECT_STRUCTURE.md` - Linear conventions
- `/Users/j/repos/joolie-boolie-platform/playwright.config.ts` - Current Playwright config
- `/Users/j/repos/joolie-boolie-platform/e2e/fixtures/auth.ts` - Auth fixture implementation
- `/Users/j/repos/joolie-boolie-platform/e2e/utils/fixtures.ts` - Existing test fixtures

---

## Appendix: Issue Quick Reference

| ID | Title | Priority | Tests | Blocks | Blocked By | Status |
|----|-------|----------|-------|--------|------------|--------|
| BEA-313 | Infrastructure | P1 | Setup | BEA-316, BEA-318 | None | ✅ Ready |
| BEA-314 | Auth Tests | P0 | 18-20 | BEA-316 | None | ✅ Ready |
| BEA-315 | Dashboard Tests | P1 | 18 | None | None | ✅ Ready |
| BEA-316 | SSO Tests | P1 | 22 | None | BEA-313, BEA-314 | ⏳ Blocked |
| BEA-317 | Template Tests | P2 | 8 | None | Phase 3 | 🚫 **DEFERRED** |
| BEA-318 | A11y/Security Tests | P2 | 18-19 | None | BEA-313 | ⏳ Blocked |

**Total New LOC:** ~1,200-1,400 (Platform Hub tests only)
**Total New Tests:** ~96-99 tests (BEA-317 deferred to Phase 3)
**Total After Implementation:** ~384-387 tests (288 existing + 96-99 new)

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-23 | Initial draft |
| 2.0 | 2026-01-23 | Added clean slate approach |
| 3.0 | 2026-01-23 | **MAJOR REVISION**: Removed clean slate (BEA-313), preserved existing 288 tests, renumbered issues BEA-313-318, corrected metrics to ~400-440 total tests |
| 4.0 | 2026-01-23 | **VALIDATION REVISION**: After codebase validation, adjusted test counts to realistic scope: BEA-314 (18-20), BEA-315 (18), BEA-316 (22), BEA-317 (DEFERRED), BEA-318 (18-19). Total: ~96-99 new tests, ~384-387 total |
