# Linear E2E Testing Project Plan

**Document Version:** 2.0
**Created:** 2026-01-23
**Initiative:** Wave 3 - E2E Testing Coverage
**Issue Range:** BEA-313 through BEA-319

---

## Executive Summary

### Current State

| Metric | Value |
|--------|-------|
| Existing E2E Tests | 288 test cases |
| Existing Test Files | 13 spec files (Bingo: 8, Trivia: 5) |
| Lines of E2E Code | 4,391 |
| Platform Hub Tests | 0 (directory scaffolded, no tests) |
| CI Status | **DISABLED** (17+ min execution, stability issues) |

### Target State

| Metric | Target |
|--------|--------|
| Total E2E Tests | ~90 test cases (clean slate + new) |
| Platform Hub Tests | 8-10 spec files (~1,500-2,500 LOC) |
| CI Execution Time | <5 minutes (sharded) |
| Critical Path Tests | <2 minutes |
| Test Reliability | >98% pass rate |

### Key Findings from Analysis

1. **Clean Slate Required:** Existing 288 tests are outdated, unstable, and prevent CI enablement
2. **Blockers Resolved:** Logout button and auth navigation already implemented in Platform Hub Header.tsx
3. **Infrastructure Ready:** Playwright config already includes platform-hub project and webServer configuration
4. **Auth Fixtures Ready:** `e2e/fixtures/auth.ts` provides authenticatedPage fixture
5. **Missing:** Actual test files for Platform Hub, auth flow tests, SSO tests

### Issue Summary (Wave 3)

| ID | Title | Priority | Complexity | Blocks |
|----|-------|----------|------------|--------|
| BEA-313 | Remove All Existing E2E Tests (Clean Slate) | P0 | Small | BEA-314, BEA-315, BEA-316, BEA-317, BEA-318, BEA-319 |
| BEA-314 | E2E Infrastructure: Sharding & CI Integration | P1 | Medium | BEA-316, BEA-317 |
| BEA-315 | Platform Hub Auth Flow E2E Tests | P0 | Large | BEA-317 |
| BEA-316 | Platform Hub Dashboard & Profile E2E Tests | P1 | Medium | None |
| BEA-317 | Cross-App SSO E2E Tests | P1 | Large | None |
| BEA-318 | Template CRUD E2E Tests | P2 | Medium | None |
| BEA-319 | PWA, Accessibility & Security E2E Tests | P2 | Medium | None |

---

## Dependency Graph

```
                    ┌──────────────────────────────────────────────────────────────┐
                    │                 WAVE 3: E2E TESTING COVERAGE                  │
                    └──────────────────────────────────────────────────────────────┘

    FOUNDATIONAL (Must Complete First)
    ─────────────────────────────────────────────────────────────────────────────────
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                            BEA-313                                           │
    │                 Remove All Existing E2E Tests                                │
    │                       (Clean Slate)                                          │
    │                         [Small]                                              │
    │                                                                              │
    │  Delete: e2e/bingo/*.spec.ts (8 files, ~2,500 LOC)                          │
    │  Delete: e2e/trivia/*.spec.ts (5 files, ~1,900 LOC)                         │
    │  Keep: playwright.config.ts, e2e/utils/, e2e/fixtures/                      │
    │                                                                              │
    │  BLOCKS: ALL OTHER ISSUES                                                    │
    └─────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         │ (blocks)
                                         ▼
    PARALLEL GROUP A (After BEA-313 - No Dependencies Between Them)
    ─────────────────────────────────────────────────────────────────────────────────
    ┌─────────────────────┐     ┌─────────────────────┐
    │     BEA-314         │     │     BEA-315         │
    │ Infrastructure &    │     │ Platform Hub Auth   │
    │ Sharding Setup      │     │ Flow E2E Tests      │
    │ [Medium]            │     │ [Large - Critical]  │
    │                     │     │                     │
    │ Blocked By: BEA-313 │     │ Blocked By: BEA-313 │
    └─────────┬───────────┘     └─────────┬───────────┘
              │                           │
              │ (blocks)                  │ (blocks)
              ▼                           ▼
    PARALLEL GROUP B (Depends on Group A)
    ─────────────────────────────────────────────────────────────────────────────────
    ┌─────────────────────┐     ┌─────────────────────┐
    │     BEA-316         │     │     BEA-317         │
    │ Dashboard & Profile │     │ Cross-App SSO       │
    │ E2E Tests           │     │ E2E Tests           │
    │ [Medium]            │     │ [Large]             │
    │                     │     │                     │
    │ Blocked By: BEA-313 │     │ Blocked By:         │
    │                     │     │ BEA-314, BEA-315    │
    └─────────────────────┘     └─────────────────────┘
              │
              │
    PARALLEL GROUP C (After BEA-313 - Independent of Other Groups)
    ─────────────────────────────────────────────────────────────────────────────────
    ┌─────────────────────┐     ┌─────────────────────┐
    │     BEA-318         │     │     BEA-319         │
    │ Template CRUD       │     │ PWA, A11y &         │
    │ E2E Tests           │     │ Security Tests      │
    │ [Medium]            │     │ [Medium]            │
    │                     │     │                     │
    │ Blocked By:         │     │ Blocked By: BEA-314 │
    │ BEA-315             │     │                     │
    └─────────────────────┘     └─────────────────────┘


    DEPENDENCY SUMMARY:
    ─────────────────────────────────────────────────────────────────────────────────

    BEA-313 (Clean Slate)
      └── BLOCKS: BEA-314, BEA-315, BEA-316, BEA-317, BEA-318, BEA-319

    BEA-314 (Infrastructure)
      └── BLOCKS: BEA-317, BEA-319

    BEA-315 (Auth Tests)
      └── BLOCKS: BEA-317, BEA-318

    BEA-316 (Dashboard Tests)
      └── BLOCKS: None (independent after BEA-313)

    BEA-317 (SSO Tests)
      └── BLOCKS: None (depends on BEA-314 + BEA-315)

    BEA-318 (Template Tests)
      └── BLOCKS: None (depends on BEA-315)

    BEA-319 (PWA/A11y Tests)
      └── BLOCKS: None (depends on BEA-314)


    PARALLELIZATION OPPORTUNITIES:
    ─────────────────────────────────────────────────────────────────────────────────

    After BEA-313 completes, these can run in parallel:
    ├── BEA-314 (Infrastructure)
    ├── BEA-315 (Auth Tests)
    └── BEA-316 (Dashboard Tests)

    After BEA-314 + BEA-315 complete:
    ├── BEA-317 (SSO Tests)
    ├── BEA-318 (Template Tests) - only needs BEA-315
    └── BEA-319 (PWA/A11y Tests) - only needs BEA-314

    Maximum parallelism: 3 agents after BEA-313
```

---

## Critical Path Analysis

### Shortest Path to CI-Enabled Tests

```
BEA-313 (REQUIRED FIRST)
    │
    ├── BEA-314 (Infrastructure) ──► CI sharding enabled
    │
    └── BEA-315 (Auth Tests) ──► Critical auth coverage
             │
             └── Enable CI with @critical tag filter (<2 min)

After critical path:
    ├── BEA-316 (Dashboard) - can run in parallel
    ├── BEA-317 (SSO) - needs BEA-314 + BEA-315
    ├── BEA-318 (Templates) - needs BEA-315
    └── BEA-319 (PWA/A11y) - needs BEA-314
```

### Minimum Viable E2E (First Tests After Clean Slate)

To unblock CI as fast as possible, implement these tests first:

1. Login success flow (1 test)
2. Login failure flow (1 test)
3. Logout flow (1 test)
4. Protected route redirect (1 test)

**4 tests = CI-enabled immediately after BEA-315**

---

## Linear Issues (Detailed)

### BEA-313: Remove All Existing E2E Tests (Clean Slate)

```yaml
ID: BEA-313
Title: Remove All Existing E2E Tests (Clean Slate)
Project: Wave 3 - E2E Testing
Type: type:chore, type:test
Severity: severity:critical
Priority: P0 (Urgent)
Component: app:bingo, app:trivia
Complexity: Small (~100 LOC deleted per file, deletion only)

Blocks: BEA-314, BEA-315, BEA-316, BEA-317, BEA-318, BEA-319
Blocked By: None
Related: None
```

#### Problem

The existing 288 E2E tests across Bingo and Trivia are:
- **Outdated:** Written before OAuth integration, testing old auth flows
- **Unstable:** 17+ minute execution time with flaky failures
- **Blocking CI:** Tests are disabled because they never pass reliably
- **Technical debt:** Tests make assumptions about UI that no longer hold

Maintaining these tests while building new infrastructure creates merge conflicts and confusion.

#### Solution

Delete all existing E2E test spec files while preserving:
- `playwright.config.ts` - Infrastructure configuration
- `e2e/utils/` - Utility functions (may be useful)
- `e2e/fixtures/` - Auth fixtures (already updated for OAuth)
- `e2e/platform-hub/.gitkeep` - Directory structure

#### Files to Delete

| Directory | Files | Approx LOC |
|-----------|-------|------------|
| `e2e/bingo/` | `accessibility.spec.ts`, `display.spec.ts`, `dual-screen.spec.ts`, `home.spec.ts`, `keyboard.spec.ts`, `modal-timing.spec.ts`, `presenter.spec.ts`, `room-setup.spec.ts` | ~2,500 |
| `e2e/trivia/` | `display.spec.ts`, `dual-screen.spec.ts`, `home.spec.ts`, `presenter.spec.ts`, `session-flow.spec.ts` | ~1,900 |

**Total: 13 files, ~4,400 LOC to delete**

#### Files to Keep

| File | Reason |
|------|--------|
| `playwright.config.ts` | Contains webServer config, project definitions |
| `e2e/utils/fixtures.ts` | Helper functions may be reusable |
| `e2e/utils/helpers.ts` | Wait utilities still useful |
| `e2e/fixtures/auth.ts` | Updated for OAuth, needed for new tests |
| `e2e/platform-hub/.gitkeep` | Preserve directory structure |

#### Acceptance Criteria

- [ ] All `e2e/bingo/*.spec.ts` files deleted (8 files)
- [ ] All `e2e/trivia/*.spec.ts` files deleted (5 files)
- [ ] `playwright.config.ts` preserved and unchanged
- [ ] `e2e/utils/` directory preserved with all files
- [ ] `e2e/fixtures/` directory preserved with all files
- [ ] `npx playwright test` shows 0 tests found (expected)
- [ ] Git shows ~4,400 lines deleted
- [ ] No broken imports in remaining files

#### Verification Commands

```bash
# Verify deletion
ls e2e/bingo/*.spec.ts  # Should show "No such file"
ls e2e/trivia/*.spec.ts  # Should show "No such file"

# Verify infrastructure intact
cat playwright.config.ts  # Should exist
ls e2e/utils/  # Should show fixtures.ts, helpers.ts
ls e2e/fixtures/  # Should show auth.ts

# Verify zero tests
npx playwright test --list  # Should show 0 tests

# Verify no broken imports
pnpm build  # Should succeed
```

---

### BEA-314: E2E Infrastructure - Sharding & CI Integration

```yaml
ID: BEA-314
Title: E2E Infrastructure - Sharding & CI Integration
Project: Wave 3 - E2E Testing
Type: type:infra, type:test
Severity: severity:high
Priority: P1 (High)
Component: app:bingo, app:trivia, app:platform-hub
Complexity: Medium (~150-250 LOC)

Blocks: BEA-317, BEA-319
Blocked By: BEA-313
Related: BEA-315
```

#### Problem

E2E tests need infrastructure for:
- Sharding to run tests in parallel across CI workers
- Tag-based filtering for critical-path-only runs on PRs
- Global auth state setup to avoid redundant logins

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

#### Verification Commands

```bash
# Test sharding locally
npx playwright test --shard=1/4
npx playwright test --shard=2/4

# Test critical-only filter
npx playwright test --grep "@critical"

# Verify all 3 web servers start
pnpm dev & sleep 30 && curl -s localhost:3000 && curl -s localhost:3001 && curl -s localhost:3002
```

---

### BEA-315: Platform Hub Auth Flow E2E Tests

```yaml
ID: BEA-315
Title: Platform Hub Auth Flow E2E Tests
Project: Wave 3 - E2E Testing
Type: type:test, type:e2e
Severity: severity:critical
Priority: P0 (Urgent)
Component: app:platform-hub
Complexity: Large (~400-600 LOC)

Blocks: BEA-317, BEA-318
Blocked By: BEA-313
Related: BEA-314
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
- Protected route redirects (unauthenticated → login)
- Session persistence (refresh maintains auth)

#### Files to Create

| File | LOC Est | Tests Est |
|------|---------|-----------|
| `e2e/platform-hub/auth.spec.ts` | ~300 | 14 |
| `e2e/platform-hub/signup.spec.ts` | ~150 | 6 |
| `e2e/platform-hub/logout.spec.ts` | ~100 | 4 |

#### Test Cases (14 total)

```typescript
// auth.spec.ts - Login flows
describe('@critical Authentication', () => {
  test('user can log in with valid credentials');           // CP-AUTH-002
  test('invalid login shows error message');                // CP-AUTH-003
  test('email not confirmed shows error message');          // CP-AUTH-004
  test('protected routes redirect to login');               // CP-AUTH-007
  test('session persists after page refresh');              // Session persistence
});

// signup.spec.ts - Registration flows
describe('@critical Signup', () => {
  test('user can sign up with email');                      // CP-AUTH-001
  test('invalid email format shows error');                 // Validation
  test('weak password shows requirements');                 // Validation
  test('duplicate email shows error');                      // Error handling
});

// logout.spec.ts - Logout flows
describe('@critical Logout', () => {
  test('user can logout via header button');                // CP-AUTH-008
  test('logout clears auth cookies');                       // Security
  test('logout redirects to home page');                    // UX
  test('logged out user cannot access dashboard');          // Protection
});
```

#### Acceptance Criteria

- [ ] `e2e/platform-hub/auth.spec.ts` has 5+ passing tests
- [ ] `e2e/platform-hub/signup.spec.ts` has 4+ passing tests
- [ ] `e2e/platform-hub/logout.spec.ts` has 4+ passing tests
- [ ] All tests tagged with @critical
- [ ] Tests use `e2e/fixtures/auth.ts` for authenticated pages
- [ ] Tests follow existing patterns from Bingo/Trivia specs
- [ ] `npx playwright test --project=platform-hub` passes
- [ ] No flaky tests (3 consecutive green runs)

#### Verification Commands

```bash
# Run Platform Hub tests only
npx playwright test --project=platform-hub

# Run critical auth tests
npx playwright test --project=platform-hub --grep "@critical"

# Generate HTML report
npx playwright test --project=platform-hub --reporter=html
```

---

### BEA-316: Platform Hub Dashboard & Profile E2E Tests

```yaml
ID: BEA-316
Title: Platform Hub Dashboard & Profile E2E Tests
Project: Wave 3 - E2E Testing
Type: type:test, type:e2e
Severity: severity:high
Priority: P1 (High)
Component: app:platform-hub
Complexity: Medium (~200-300 LOC)

Blocks: None
Blocked By: BEA-313
Related: BEA-310 (Profile Management feature)
```

#### Problem

Dashboard and profile management features (BEA-309, BEA-310) have no E2E coverage. Users cannot verify end-to-end functionality.

#### Solution

Create E2E tests for:
- Dashboard displays user info correctly
- Dashboard shows recent sessions
- Profile update functionality
- Settings page functionality
- Error handling for profile updates

#### Files to Create

| File | LOC Est | Tests Est |
|------|---------|-----------|
| `e2e/platform-hub/dashboard.spec.ts` | ~150 | 6 |
| `e2e/platform-hub/profile.spec.ts` | ~150 | 6 |
| `e2e/platform-hub/settings.spec.ts` | ~100 | 4 |

#### Test Cases (16 total)

```typescript
// dashboard.spec.ts
describe('@high Dashboard', () => {
  test('dashboard shows user email');                       // CP-DASH-001
  test('dashboard shows facility name');                    // CP-DASH-001
  test('dashboard shows recent game sessions');             // CP-DASH-002
  test('dashboard links to settings');                      // Navigation
  test('empty state shows for new users');                  // Edge case
  test('dashboard data refreshes on navigation');           // UX
});

// profile.spec.ts
describe('@high Profile Management', () => {
  test('user can update facility name');                    // HI-PROF-001
  test('user can change email');                            // HI-PROF-002
  test('user can change password');                         // HI-PROF-003
  test('invalid current password rejected');                // HI-PROF-004
  test('profile changes show success toast');               // UX
  test('profile validation errors displayed');              // UX
});

// settings.spec.ts
describe('@high Settings', () => {
  test('settings page loads for authenticated user');
  test('theme preference can be changed');
  test('notification preferences can be toggled');
  test('settings persist after page reload');
});
```

#### Acceptance Criteria

- [ ] `e2e/platform-hub/dashboard.spec.ts` has 6 passing tests
- [ ] `e2e/platform-hub/profile.spec.ts` has 6 passing tests
- [ ] `e2e/platform-hub/settings.spec.ts` has 4 passing tests
- [ ] All tests tagged with @high
- [ ] Tests use `authenticatedPage` fixture
- [ ] Tests verify toast notifications appear
- [ ] `npx playwright test --project=platform-hub` passes

#### Verification Commands

```bash
# Run dashboard/profile tests
npx playwright test --project=platform-hub dashboard profile settings

# Check for flaky tests
npx playwright test --project=platform-hub --repeat-each=3
```

---

### BEA-317: Cross-App SSO E2E Tests

```yaml
ID: BEA-317
Title: Cross-App SSO E2E Tests
Project: Wave 3 - E2E Testing
Type: type:test, type:e2e
Severity: severity:critical
Priority: P1 (High)
Component: app:bingo, app:trivia, app:platform-hub
Complexity: Large (~300-500 LOC)

Blocks: None
Blocked By: BEA-314, BEA-315
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
| `e2e/platform-hub/oauth.spec.ts` | ~200 | 8 |
| `e2e/bingo/oauth-flow.spec.ts` | ~150 | 5 |
| `e2e/trivia/oauth-flow.spec.ts` | ~150 | 5 |

#### Test Cases (18 total)

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
});

// bingo/oauth-flow.spec.ts
describe('@critical Bingo OAuth', () => {
  test('login button triggers OAuth flow');                 // CP-SSO-001
  test('OAuth callback exchanges code for tokens');         // Token flow
  test('authenticated user can access /play');              // Protected route
  test('tokens stored in httpOnly cookies');                // Security
  test('token refresh works before expiration');            // Session maintenance
});

// trivia/oauth-flow.spec.ts - Same as Bingo
describe('@critical Trivia OAuth', () => {
  // Same 5 tests as Bingo but for Trivia app
});
```

#### Multi-App Test Strategy

These tests require all 3 apps running and coordination:

```typescript
// Example multi-app flow
test('complete SSO flow: Bingo → Hub → Bingo', async ({ browser }) => {
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

- [ ] `e2e/platform-hub/oauth.spec.ts` has 8 passing tests
- [ ] `e2e/bingo/oauth-flow.spec.ts` has 5 passing tests
- [ ] `e2e/trivia/oauth-flow.spec.ts` has 5 passing tests
- [ ] All tests tagged with @critical
- [ ] Tests handle multi-app navigation correctly
- [ ] PKCE code_verifier/code_challenge flow verified
- [ ] Token storage in cookies verified
- [ ] No race conditions in multi-page flows

#### Verification Commands

```bash
# Run all OAuth tests
npx playwright test oauth-flow oauth

# Run cross-app tests (requires all servers)
pnpm dev & npx playwright test --grep "SSO"
```

---

### BEA-318: Template CRUD E2E Tests

```yaml
ID: BEA-318
Title: Template CRUD E2E Tests
Project: Wave 3 - E2E Testing
Type: type:test, type:e2e
Severity: severity:medium
Priority: P2 (Medium)
Component: app:bingo, app:trivia
Complexity: Medium (~200-300 LOC)

Blocks: None
Blocked By: BEA-315
Related: Template API routes
```

#### Problem

Template CRUD operations (create, read, update, delete) have API tests but no E2E coverage through the UI.

#### Solution

Create E2E tests for template management in both Bingo and Trivia apps.

#### Files to Create

| File | LOC Est | Tests Est |
|------|---------|-----------|
| `e2e/bingo/templates.spec.ts` | ~150 | 6 |
| `e2e/trivia/templates.spec.ts` | ~150 | 6 |

#### Test Cases (12 total)

```typescript
// bingo/templates.spec.ts
describe('@high Bingo Templates', () => {
  test('user can create new template');                     // HI-TMPL-001
  test('user can load saved template');                     // HI-TMPL-002
  test('user can update existing template');                // HI-TMPL-003
  test('user can delete template');                         // HI-TMPL-004
  test('template list shows all user templates');           // UI
  test('template selection updates game state');            // Integration
});

// trivia/templates.spec.ts
describe('@high Trivia Templates', () => {
  test('user can create trivia template');                  // HI-TMPL-005
  test('user can load saved trivia template');              // HI-TMPL-006
  test('user can import questions from CSV');               // HI-TMPL-007
  test('user can update trivia template');                  // CRUD
  test('user can delete trivia template');                  // CRUD
  test('template questions display correctly');             // UI
});
```

#### Acceptance Criteria

- [ ] `e2e/bingo/templates.spec.ts` has 6 passing tests
- [ ] `e2e/trivia/templates.spec.ts` has 6 passing tests
- [ ] All tests tagged with @high
- [ ] Tests use authenticated fixtures
- [ ] CSV import test includes file upload
- [ ] Template persistence verified across sessions

#### Verification Commands

```bash
# Run template tests
npx playwright test templates

# Test with file upload
npx playwright test --grep "CSV"
```

---

### BEA-319: PWA, Accessibility & Security E2E Tests

```yaml
ID: BEA-319
Title: PWA, Accessibility & Security E2E Tests
Project: Wave 3 - E2E Testing
Type: type:test, type:e2e
Severity: severity:medium
Priority: P2 (Medium)
Component: app:bingo, app:trivia, app:platform-hub
Complexity: Medium (~200-300 LOC)

Blocks: None
Blocked By: BEA-314
Related: Accessibility tests already exist for Bingo
```

#### Problem

PWA functionality, accessibility compliance, and security edge cases lack comprehensive E2E coverage.

#### Solution

Create tests for:
- PWA install prompts and service worker
- Accessibility (keyboard navigation, screen reader)
- Security edge cases (rate limiting, session timeout)
- Theme switching

#### Files to Create/Modify

| File | LOC Est | Tests Est |
|------|---------|-----------|
| `e2e/bingo/pwa.spec.ts` | ~80 | 4 |
| `e2e/trivia/pwa.spec.ts` | ~80 | 4 |
| `e2e/platform-hub/accessibility.spec.ts` | ~100 | 4 |
| `e2e/platform-hub/security.spec.ts` | ~100 | 4 |

#### Test Cases (16 total)

```typescript
// pwa.spec.ts (both apps)
describe('@medium PWA', () => {
  test('service worker registers on load');                 // MD-PWA-002
  test('offline banner shows when disconnected');           // MD-PWA-003
  test('app works offline with cached data');               // MD-PWA-004
  test('install prompt appears on eligible devices');       // MD-PWA-001
});

// accessibility.spec.ts
describe('@medium Accessibility', () => {
  test('all interactive elements are focusable');           // MD-A11Y-001
  test('keyboard navigation works throughout');             // MD-A11Y-001
  test('focus indicators are visible');                     // WCAG
  test('color contrast meets WCAG AA');                     // MD-A11Y-002
});

// security.spec.ts
describe('@low Security', () => {
  test('rate limiting triggers after 10 requests');         // LO-ERR-001
  test('session timeout redirects to login');               // LO-ERR-003
  test('XSS prevention in input fields');                   // LO-SEC-001
  test('CSRF token required for mutations');                // LO-ERR-002
});
```

#### Acceptance Criteria

- [ ] PWA tests verify service worker registration
- [ ] Accessibility tests pass axe-core checks
- [ ] Security tests verify rate limiting (may need test mode)
- [ ] All tests appropriately tagged (@medium, @low)
- [ ] Tests don't depend on network conditions unreliably

#### Verification Commands

```bash
# Run accessibility tests
npx playwright test accessibility

# Run with axe analysis
npx playwright test --grep "a11y"
```

---

## Parallelization Strategy

### Work Distribution for Multiple Agents

```
                       BEA-313 (Clean Slate)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
    BEA-314              BEA-315              BEA-316
  (Infrastructure)    (Auth Tests)       (Dashboard Tests)
        │                     │
        │    ┌────────────────┤
        │    │                │
        ▼    ▼                ▼
    BEA-319              BEA-317              BEA-318
  (PWA/A11y)           (SSO Tests)       (Template Tests)
```

### Agent Assignment Based on Dependencies

| Issue | Can Start When | Can Run Parallel With |
|-------|----------------|----------------------|
| BEA-313 | Immediately | Nothing (foundational) |
| BEA-314 | After BEA-313 | BEA-315, BEA-316 |
| BEA-315 | After BEA-313 | BEA-314, BEA-316 |
| BEA-316 | After BEA-313 | BEA-314, BEA-315 |
| BEA-317 | After BEA-314 + BEA-315 | BEA-318, BEA-319 |
| BEA-318 | After BEA-315 | BEA-317, BEA-319 |
| BEA-319 | After BEA-314 | BEA-317, BEA-318 |

### Optimal Execution Order

```
Execution 1: BEA-313 (required first, blocks all)
             └── Output: Clean slate, 0 tests

Execution 2: BEA-314 + BEA-315 + BEA-316 (parallel - 3 agents)
             └── Output: CI enabled, auth + dashboard tests

Execution 3: BEA-317 + BEA-318 + BEA-319 (parallel - 3 agents)
             └── Output: Full coverage, all tests passing
```

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Auth fixture flakiness | BEA-315 includes 3-run stability check |
| Multi-app coordination | BEA-317 uses explicit waits, not race conditions |
| CI timeout | BEA-314 implements sharding before full suite |
| Test data pollution | Each test cleans up its data (afterEach hooks) |

---

## Success Metrics

### Coverage Targets

| Area | Current | Target | Notes |
|------|---------|--------|-------|
| Auth flows | 0% | 100% | BEA-315 |
| Platform Hub | 0% | 80% | BEA-315, BEA-316 |
| SSO/OAuth | 0% | 100% | BEA-317 |
| Templates | 0% | 80% | BEA-318 |
| Bingo gameplay | 100% (deleted) | 0% | Clean slate - future wave |
| Trivia gameplay | 100% (deleted) | 0% | Clean slate - future wave |

### Execution Targets

| Scenario | Current | Target |
|----------|---------|--------|
| Full suite | 17+ min | <5 min |
| Critical path | N/A | <2 min |
| Per shard | N/A | <3 min |
| Reliability | Unknown | >98% |

### Definition of Done (Wave 3)

- [ ] All 7 issues completed
- [ ] ~90 new tests passing
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
│   └── tags.ts              # NEW - test tagging utilities (BEA-314)
├── global-setup.ts          # NEW - auth state persistence (BEA-314)
├── utils/
│   ├── fixtures.ts          # Existing - helper fixtures
│   └── helpers.ts           # Existing - wait utilities
├── bingo/
│   ├── oauth-flow.spec.ts   # NEW (BEA-317)
│   ├── templates.spec.ts    # NEW (BEA-318)
│   └── pwa.spec.ts          # NEW (BEA-319)
├── trivia/
│   ├── oauth-flow.spec.ts   # NEW (BEA-317)
│   ├── templates.spec.ts    # NEW (BEA-318)
│   └── pwa.spec.ts          # NEW (BEA-319)
└── platform-hub/
    ├── auth.spec.ts         # NEW (BEA-315)
    ├── signup.spec.ts       # NEW (BEA-315)
    ├── logout.spec.ts       # NEW (BEA-315)
    ├── dashboard.spec.ts    # NEW (BEA-316)
    ├── profile.spec.ts      # NEW (BEA-316)
    ├── settings.spec.ts     # NEW (BEA-316)
    ├── oauth.spec.ts        # NEW (BEA-317)
    ├── accessibility.spec.ts # NEW (BEA-319)
    └── security.spec.ts     # NEW (BEA-319)
```

**Summary:**
- **Deleted files:** 13 spec files (~4,400 LOC)
- **Kept files:** 4 utility/fixture files
- **New files:** 15 spec files
- **Total after Wave 3:** 19 files (15 spec + 4 utils)

---

## References

- `/Users/j/repos/beak-gaming-platform/docs/E2E_TESTING_STRATEGY.md` - Detailed test case analysis
- `/Users/j/repos/beak-gaming-platform/docs/LINEAR_PROJECT_STRUCTURE.md` - Linear conventions
- `/Users/j/repos/beak-gaming-platform/playwright.config.ts` - Current Playwright config
- `/Users/j/repos/beak-gaming-platform/e2e/fixtures/auth.ts` - Auth fixture implementation
- `/Users/j/repos/beak-gaming-platform/e2e/utils/fixtures.ts` - Existing test fixtures

---

## Appendix: Issue Quick Reference

| ID | Title | Priority | Complexity | Blocks | Blocked By |
|----|-------|----------|------------|--------|------------|
| BEA-313 | Clean Slate | P0 | Small | ALL | None |
| BEA-314 | Infrastructure | P1 | Medium | BEA-317, BEA-319 | BEA-313 |
| BEA-315 | Auth Tests | P0 | Large | BEA-317, BEA-318 | BEA-313 |
| BEA-316 | Dashboard Tests | P1 | Medium | None | BEA-313 |
| BEA-317 | SSO Tests | P1 | Large | None | BEA-314, BEA-315 |
| BEA-318 | Template Tests | P2 | Medium | None | BEA-315 |
| BEA-319 | PWA/A11y Tests | P2 | Medium | None | BEA-314 |

**Total Estimated LOC:** ~1,500-2,300 (new tests)
**Total Estimated Tests:** ~90 new tests
**Total After Wave 3:** ~90 tests (after deleting 288 existing)
