# TEST PLAN

**Document Version:** 1.0
**Created:** 2026-01-22
**Status:** Active
**Scope:** Joolie Boolie - Internal Beta Testing

---

## Table of Contents

1. [Pre-MVP Testing Checklist](#1-pre-mvp-testing-checklist)
2. [Post-MVP Testing Roadmap](#2-post-mvp-testing-roadmap)
3. [Manual Testing Procedures](#3-manual-testing-procedures)
4. [Automated Test Coverage Gaps](#4-automated-test-coverage-gaps)
5. [E2E Test Scenarios](#5-e2e-test-scenarios)
6. [Test Infrastructure](#6-test-infrastructure)
7. [Regression Testing](#7-regression-testing)

---

## 1. Pre-MVP Testing Checklist

### 1.1 Critical Path Tests (Must Pass Before Beta)

#### Database Security

- [ ] **CRIT-1: RLS Enabled on bingo_templates**
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables
  WHERE tablename = 'bingo_templates';
  -- Expected: rowsecurity = true
  ```

- [ ] **CRIT-2: FK Constraint Restored**
  ```sql
  SELECT constraint_name FROM information_schema.table_constraints
  WHERE table_name = 'bingo_templates' AND constraint_type = 'FOREIGN KEY';
  -- Expected: bingo_templates_user_id_fkey
  ```

- [ ] **Verify RLS Policies Work**
  - Unauthenticated user cannot read templates
  - User can only read their own templates
  - User can only update their own templates
  - User can only delete their own templates

#### Security Routes

- [ ] **CRIT-3: Test-login routes removed**
  ```bash
  # Should return 404
  curl http://localhost:3000/api/auth/test-login
  curl http://localhost:3000/test-login
  ```

- [ ] **Verify files deleted:**
  - `apps/bingo/src/app/api/auth/test-login/` - DELETED
  - `apps/bingo/src/app/test-login/` - DELETED

#### Automated Tests

- [ ] **CRIT-4: All tests passing**
  ```bash
  pnpm test:run
  # Expected: 0 failures
  ```

- [ ] **Test count baseline:**
  - Bingo: 1,270+ tests passing
  - Trivia: 1,049 tests passing
  - Platform Hub: All tests passing
  - Packages: All tests passing

#### Environment Configuration

- [ ] **CRIT-5: No hardcoded localhost URLs**
  ```bash
  grep -r "localhost:300" apps/platform-hub/src/app/*.tsx
  # Expected: No matches in production code (only env.example, docs, tests)
  ```

- [ ] **Environment variables configured:**
  - `NEXT_PUBLIC_BINGO_URL` - Set in Vercel
  - `NEXT_PUBLIC_TRIVIA_URL` - Set in Vercel
  - `NEXT_PUBLIC_APP_URL` - Set in Vercel
  - `SESSION_TOKEN_SECRET` - Set in all apps

### 1.2 Functional Tests (Must Pass Before Beta)

#### Authentication Flow

- [ ] **OAuth Login (Bingo)**
  1. Navigate to `/play`
  2. Click "Sign In"
  3. Redirect to Platform Hub consent
  4. Approve consent
  5. Redirect back with tokens
  6. Verify user session exists

- [ ] **OAuth Login (Trivia)**
  - Same flow as Bingo
  - Verify independent session

- [ ] **Session Persistence**
  - Login to app
  - Close browser
  - Reopen app
  - Verify still authenticated (cookies persist)

#### Game Functionality

- [ ] **Bingo Complete Game**
  1. Create new game (online or offline)
  2. Select pattern
  3. Configure audio settings
  4. Start game
  5. Call 10+ balls
  6. Verify dual-screen sync
  7. Pause and resume
  8. Reset game

- [ ] **Trivia Complete Game**
  1. Import questions (CSV or JSON)
  2. Create room
  3. Add teams
  4. Start game
  5. Navigate questions
  6. Display questions on audience
  7. Record scores
  8. Complete round
  9. End game

#### Template Management

- [ ] **Save Bingo Template**
  1. Configure game settings
  2. Click "Save Template"
  3. Enter name
  4. Verify saved to database

- [ ] **Load Bingo Template**
  1. Open template selector
  2. Select template
  3. Verify settings applied

- [ ] **Save Trivia Template**
  1. Import questions
  2. Click "Save as Template"
  3. Enter name
  4. Verify saved

- [ ] **Load Trivia Template**
  1. Open template selector
  2. Select template
  3. Verify questions loaded

### 1.3 Integration Tests

- [ ] **Platform Hub to Bingo OAuth**
  - Full flow end-to-end
  - Token exchange works
  - Session established

- [ ] **Platform Hub to Trivia OAuth**
  - Same as Bingo flow
  - Independent sessions

- [ ] **Dual-Screen Sync (Bingo)**
  - Open `/play` and `/display` in separate windows
  - Actions on `/play` reflected on `/display`
  - Latency under 100ms

- [ ] **Dual-Screen Sync (Trivia)**
  - Same verification as Bingo
  - Emergency pause blanks display

### 1.4 Performance Tests

- [ ] **Page Load Times** (using Lighthouse)
  | Page | Target | Metric |
  |------|--------|--------|
  | Bingo /play | < 3s | First Contentful Paint |
  | Bingo /display | < 2s | First Contentful Paint |
  | Trivia /play | < 3s | First Contentful Paint |
  | Trivia /display | < 2s | First Contentful Paint |
  | Hub home | < 2s | First Contentful Paint |

- [ ] **Lighthouse Scores**
  | Metric | Target |
  |--------|--------|
  | Performance | > 80 |
  | Accessibility | > 90 |
  | Best Practices | > 90 |
  | SEO | > 80 |

---

## 2. Post-MVP Testing Roadmap

### 2.1 Phase 1: Test Fixes (Immediate)

**Goal:** Achieve 100% test pass rate

| Task | Priority | Tests |
|------|----------|-------|
| Fix Bingo create-new-game tests | HIGH | 8 |
| Fix Bingo TemplateSelector tests | HIGH | ~10 |
| Fix Bingo page.test tests | HIGH | ~5 |
| Fix Bingo offline-mode tests | HIGH | ~4 |
| Fix Trivia SaveTemplateModal tests | HIGH | 5 |
| Fix skipped tests | MEDIUM | 2 |

### 2.2 Phase 2: Coverage Expansion

**Goal:** Increase test coverage to 90%+

| Area | Current | Target | Tests Needed |
|------|---------|--------|--------------|
| OAuth deny route | 0% | 80% | ~70 |
| Session endpoints | 50% | 90% | ~150 |
| Trivia template [id] routes | 50% | 90% | ~100 |
| Error recovery scenarios | 30% | 80% | ~50 |
| Multi-user concurrent | 0% | 60% | ~30 |

### 2.3 Phase 3: E2E Test Suite

**Goal:** Full end-to-end coverage with Playwright

| Flow | Status | Tests Needed |
|------|--------|--------------|
| OAuth complete flow | Missing | 5 |
| Bingo full game | Missing | 10 |
| Trivia full game | Missing | 10 |
| Template CRUD | Missing | 8 |
| PWA install | Missing | 3 |
| Offline mode | Missing | 5 |

### 2.4 Phase 4: Performance & Load Testing

**Goal:** Verify production readiness

| Test Type | Tool | Status |
|-----------|------|--------|
| Load testing | k6 or Artillery | Not started |
| Stress testing | k6 | Not started |
| Lighthouse CI | lighthouserc.js | Configured |
| Bundle analysis | @next/bundle-analyzer | Available |

---

## 3. Manual Testing Procedures

### 3.1 Bingo Game Flow

**Prerequisites:**
- Dev server running (`pnpm dev:bingo`)
- Browser with two windows/tabs

**Test Steps:**

1. **Start New Game**
   ```
   1. Navigate to http://localhost:3000/play
   2. Click "Create New Game"
   3. Select "Online" or "Offline" mode
   4. If online, note the room code
   5. Verify: Game controls visible, status = "idle"
   ```

2. **Configure Game**
   ```
   1. Click pattern selector dropdown
   2. Select "Four Corners" pattern
   3. Verify: Pattern preview shows four corners highlighted
   4. Adjust voice pack if needed
   5. Toggle auto-call (optional)
   ```

3. **Start and Play**
   ```
   1. Click "Start" or press Space
   2. Verify: First ball called
   3. Call 5 more balls (Space or click)
   4. Verify: Board updates, ball history shows
   5. Open /display in new window
   6. Verify: Display shows same state as presenter
   ```

4. **Pause and Resume**
   ```
   1. Press P or click Pause
   2. Verify: Game paused, no balls can be called
   3. Press P again
   4. Verify: Game resumed
   ```

5. **Undo and Reset**
   ```
   1. Call a ball
   2. Press U or click Undo
   3. Verify: Last ball removed from history
   4. Press R or click Reset
   5. Confirm dialog
   6. Verify: Game reset to initial state
   ```

### 3.2 Trivia Game Flow

**Prerequisites:**
- Dev server running (`pnpm dev:trivia`)
- Sample CSV file with questions

**Test Steps:**

1. **Import Questions**
   ```
   1. Navigate to http://localhost:3001/play
   2. Click "Import Questions"
   3. Select CSV file or paste JSON
   4. Verify: Questions preview shows
   5. Click "Import"
   6. Verify: Questions loaded in list
   ```

2. **Add Teams**
   ```
   1. Click "Add Team" in Team Manager
   2. Enter team name
   3. Add 3-4 more teams
   4. Verify: Teams appear in scoreboard
   ```

3. **Start Game**
   ```
   1. Open /display in new window
   2. Click first question in list
   3. Click "Display" button
   4. Verify: Question appears on display
   5. Start timer if configured
   ```

4. **Score Teams**
   ```
   1. Wait for answer phase
   2. Click +1 or -1 for teams
   3. Verify: Scores update immediately
   4. Verify: Display shows updated scores
   ```

5. **Complete Game**
   ```
   1. Navigate through all questions
   2. Complete all rounds
   3. Verify: Final scores displayed
   4. Verify: Winner announced
   ```

### 3.3 OAuth Flow Testing

**Prerequisites:**
- All three apps running
- Valid Supabase credentials

**Test Steps:**

1. **Initial Login**
   ```
   1. Clear browser cookies
   2. Navigate to Bingo /play
   3. Click "Sign In" (if not auto-redirected)
   4. Verify: Redirected to Platform Hub consent
   5. Enter credentials if prompted
   6. Click "Approve"
   7. Verify: Redirected back to Bingo
   8. Verify: User session established
   ```

2. **Cross-App Session**
   ```
   1. After logging into Bingo
   2. Navigate to Trivia /play
   3. Verify: May need to re-consent for Trivia
   4. After consent, verify session exists
   ```

3. **Session Persistence**
   ```
   1. Close all browser windows
   2. Reopen browser
   3. Navigate to Bingo /play
   4. Verify: Still logged in (cookies persist)
   ```

### 3.4 Template Management Testing

**Test Steps:**

1. **Create Bingo Template**
   ```
   1. Configure game (pattern, voice pack, auto-call)
   2. Click "Save as Template"
   3. Enter template name: "Test Template 1"
   4. Check "Set as default" (optional)
   5. Click Save
   6. Verify: Success message
   7. Verify: Template appears in selector
   ```

2. **Load Bingo Template**
   ```
   1. Change game settings
   2. Open template selector
   3. Click "Test Template 1"
   4. Verify: Settings restored to saved values
   ```

3. **Delete Template**
   ```
   1. Open template selector
   2. Click delete icon on template
   3. Confirm deletion
   4. Verify: Template removed from list
   ```

---

## 4. Automated Test Coverage Gaps

### 4.1 Critical Gaps (Must Address)

| Gap | Location | Impact | Priority |
|-----|----------|--------|----------|
| OAuth deny route | `platform-hub/src/app/api/oauth/deny/` | Auth bypass if broken | CRITICAL |
| Token refresh flow | All apps | Session expiry handling | HIGH |
| Multi-tab scenarios | Sync logic | State corruption possible | HIGH |
| Error recovery | All API routes | User experience | HIGH |

### 4.2 High Priority Gaps

| Gap | Location | Current Coverage |
|-----|----------|------------------|
| Session state endpoints | `apps/*/src/app/api/sessions/` | ~50% |
| Trivia template [id] routes | `apps/trivia/src/app/api/templates/[id]/` | ~50% |
| PIN validation edge cases | `packages/database/src/pin-security.ts` | ~70% |
| Rate limiting edge cases | `platform-hub/src/middleware/rate-limit.ts` | ~80% |

### 4.3 Medium Priority Gaps

| Gap | Location | Current Coverage |
|-----|----------|------------------|
| Theme switching | `*/stores/theme-store.ts` | ~60% |
| Audio pooling | `apps/bingo/src/stores/audio-store.ts` | ~50% |
| TTS fallback | `apps/trivia/src/hooks/use-tts.ts` | ~40% |
| Offline session recovery | `*/lib/sync/offline-session.ts` | ~60% |

### 4.4 Test File Coverage Report

Run coverage report:
```bash
pnpm test:coverage
```

Target coverage:
| Metric | Target | Current (Est.) |
|--------|--------|----------------|
| Statements | 80% | ~75% |
| Branches | 75% | ~65% |
| Functions | 80% | ~78% |
| Lines | 80% | ~75% |

---

## 5. E2E Test Scenarios

### 5.1 Playwright Test Configuration

**Current Status:** 13 E2E tests configured, basic coverage

**Configuration:**
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});
```

### 5.2 Required E2E Scenarios

#### Authentication Scenarios

```typescript
// e2e/auth/oauth-flow.spec.ts
test('complete OAuth login flow', async ({ page }) => {
  // 1. Navigate to Bingo
  await page.goto('/play');

  // 2. Trigger OAuth
  await page.click('[data-testid="sign-in-button"]');

  // 3. Verify redirect to Platform Hub
  await expect(page).toHaveURL(/localhost:3002\/oauth\/consent/);

  // 4. Approve consent
  await page.click('[data-testid="approve-button"]');

  // 5. Verify redirect back
  await expect(page).toHaveURL(/localhost:3000\/play/);

  // 6. Verify session
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
});

test('OAuth denied flow', async ({ page }) => {
  await page.goto('/play');
  await page.click('[data-testid="sign-in-button"]');
  await page.click('[data-testid="deny-button"]');
  await expect(page).toHaveURL(/localhost:3000/);
  // Verify appropriate error message
});
```

#### Game Flow Scenarios

```typescript
// e2e/bingo/full-game.spec.ts
test('complete Bingo game from start to finish', async ({ page, context }) => {
  // Setup
  await page.goto('/play');

  // Create game
  await page.click('[data-testid="create-game"]');
  await page.click('[data-testid="offline-mode"]');

  // Select pattern
  await page.selectOption('[data-testid="pattern-select"]', 'four-corners');

  // Open display window
  const displayPage = await context.newPage();
  await displayPage.goto('/display');

  // Start game
  await page.click('[data-testid="start-button"]');

  // Call balls
  for (let i = 0; i < 10; i++) {
    await page.press('body', 'Space');
    await page.waitForTimeout(500);
  }

  // Verify sync
  const presenterBalls = await page.locator('[data-testid="called-balls"]').textContent();
  const displayBalls = await displayPage.locator('[data-testid="called-balls"]').textContent();
  expect(presenterBalls).toBe(displayBalls);

  // Cleanup
  await displayPage.close();
});
```

#### Template Scenarios

```typescript
// e2e/templates/crud.spec.ts
test('create, load, and delete template', async ({ page }) => {
  // Login first
  await loginAsTestUser(page);

  // Navigate to Bingo
  await page.goto('/play');

  // Configure game
  await page.selectOption('[data-testid="pattern-select"]', 'blackout');

  // Save template
  await page.click('[data-testid="save-template"]');
  await page.fill('[data-testid="template-name"]', 'E2E Test Template');
  await page.click('[data-testid="save-button"]');

  // Verify saved
  await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

  // Change settings
  await page.selectOption('[data-testid="pattern-select"]', 'four-corners');

  // Load template
  await page.click('[data-testid="template-selector"]');
  await page.click('text=E2E Test Template');

  // Verify loaded
  await expect(page.locator('[data-testid="pattern-select"]')).toHaveValue('blackout');

  // Delete template
  await page.click('[data-testid="template-selector"]');
  await page.click('[data-testid="delete-E2E Test Template"]');
  await page.click('[data-testid="confirm-delete"]');

  // Verify deleted
  await expect(page.locator('text=E2E Test Template')).not.toBeVisible();
});
```

### 5.3 E2E Test Implementation Plan

| Phase | Tests | Status |
|-------|-------|--------|
| Phase 1: Basic flows | OAuth, game start, sync | Not started |
| Phase 2: Template CRUD | Create, load, update, delete | Not started |
| Phase 3: Error scenarios | Network errors, invalid input | Not started |
| Phase 4: PWA features | Install, offline, cache | Not started |

---

## 6. Test Infrastructure

### 6.1 Current Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 4.0.17 | Unit/integration tests |
| Playwright | 1.57.0 | E2E tests |
| Testing Library | 16.3.1 | Component testing |
| vitest-axe | 0.1.0 | Accessibility testing |
| jsdom | 27.4.0 | DOM environment |

### 6.2 Mock Infrastructure

**Available Mocks:**
- `@joolie-boolie/testing/BroadcastChannelMock` - Sync testing
- `@joolie-boolie/testing/AudioMock` - Audio testing
- `@joolie-boolie/testing/SupabaseMock` - Database testing

**Missing Mocks:**
- OAuth flow mocks
- Service worker mocks (partial)
- IndexedDB mocks

### 6.3 CI/CD Integration

**GitHub Actions Workflow:**
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test:run
      - run: pnpm build

  e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm e2e
```

### 6.4 Test Data Management

**Test Fixtures Location:**
- `apps/*/src/test/fixtures/` - Static test data
- `apps/*/src/test/factories/` - Dynamic test data factories

**Database Test Data:**
```sql
-- Test user for E2E
INSERT INTO auth.users (id, email) VALUES
  ('test-user-id', 'test@joolieboolie.com');

-- Test templates
INSERT INTO bingo_templates (id, user_id, name, pattern_id) VALUES
  ('test-template-1', 'test-user-id', 'E2E Test Template', 'four-corners');
```

---

## 7. Regression Testing

### 7.1 Regression Test Suite

**Trigger:** Before every deployment

**Tests Included:**
1. All unit tests (`pnpm test:run`)
2. Build verification (`pnpm build`)
3. Lint check (`pnpm lint`)
4. Type check (included in build)

### 7.2 Regression Checklist

Before any deployment, verify:

- [ ] All automated tests pass
- [ ] Build succeeds without warnings
- [ ] Lint passes
- [ ] Manual smoke test on staging:
  - [ ] Can login to all apps
  - [ ] Can create game in Bingo
  - [ ] Can create game in Trivia
  - [ ] Dual-screen sync works
  - [ ] PWA installs correctly

### 7.3 Known Regressions to Watch

| Area | Risk | Test Coverage |
|------|------|---------------|
| OAuth token refresh | Session expiry | LOW |
| Dual-screen sync on slow networks | Desync | MEDIUM |
| Audio on mobile Safari | Playback issues | LOW |
| PWA cache invalidation | Stale content | MEDIUM |

### 7.4 Rollback Criteria

If any of these occur after deployment:
1. OAuth login fails for >10% of users
2. Game state corruption reported
3. Performance degradation >50%
4. Security vulnerability discovered

**Rollback procedure:**
```bash
# Vercel automatic rollback
vercel rollback

# Or manual Git rollback
git revert HEAD
git push origin main
```

---

## Appendix A: Test Commands Reference

```bash
# Run all tests
pnpm test:run

# Run tests with coverage
pnpm test:coverage

# Run specific app tests
cd apps/bingo && pnpm test:run
cd apps/trivia && pnpm test:run
cd apps/platform-hub && pnpm test:run

# Run specific test file
pnpm vitest path/to/file.test.ts --run

# Run tests matching pattern
pnpm vitest --run --testNamePattern="OAuth"

# Run E2E tests
pnpm e2e

# Run E2E with UI
pnpm e2e --ui

# Run E2E in debug mode
pnpm e2e --debug

# Generate E2E report
pnpm e2e --reporter=html
```

## Appendix B: Test Debugging Tips

### Common Issues

1. **Tests timeout with fetch mocks**
   ```typescript
   // Ensure mock returns properly
   global.fetch = vi.fn(() => Promise.resolve({
     ok: true,
     json: () => Promise.resolve({}),
   } as Response));
   ```

2. **Tests fail with "element not found"**
   ```typescript
   // Use waitFor for async content
   await waitFor(() => {
     expect(screen.getByText('Content')).toBeInTheDocument();
   });
   ```

3. **Store state persists between tests**
   ```typescript
   // Reset store in beforeEach
   beforeEach(() => {
     useGameStore.setState(initialState);
   });
   ```

---

**Document Maintenance:**
- Review after each release
- Update coverage targets quarterly
- Add new scenarios as features are added
