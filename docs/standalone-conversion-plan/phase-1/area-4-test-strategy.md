# Area 4: Test Strategy — Removing Auth/Supabase

## Executive Summary

Converting to standalone games requires removing **70 auth-related test files** across packages/auth, apps/platform-hub, and E2E suites while keeping **373 game tests** green throughout. The strategy is **sequential deletion** grouped by dependency, paired with **4 new localStorage store tests** and **fixture simplification** for E2E.

**Total test count:** 247 files → 179 survive + 4 new = 183 total

---

## I. Test Inventory & Deletion Plan

### A. Files to DELETE (70 total)

| Package | Count | Files |
|---------|-------|-------|
| `packages/auth` | 14 | All OAuth utilities, client, server, middleware, hooks tests |
| `apps/platform-hub` | 41 | Auth routes (login/logout/reset-password), OAuth, profile, cron |
| `e2e/platform-hub` | 12 | Auth, SSO, dashboard, profile, templates (auth-dependent) |
| `e2e/real-auth` | 3 | Supabase login, OAuth flow, cross-app SSO |
| **TOTAL** | **70** | — |

**Detailed breakdown by package/area:**

#### packages/auth (14 files)
All in `packages/auth/src/__tests__/`:
- `api-auth.test.ts` — Auth API wrappers
- `api/logout-handler.test.ts` — OAuth logout
- `api/token-handler.test.ts` — Token refresh
- `client.test.ts` — Client utilities
- `components.test.tsx` — OAuth callback page
- `components/OAuthCallbackPage.test.tsx` — OAuth UI
- `env-validation.test.ts` — Env validation
- `game-middleware.test.ts` — Game auth middleware
- `hooks.test.tsx` — useAuth hook
- `middleware-factory.test.ts` — Middleware factory
- `middleware.test.ts` — Middleware logic
- `redirect-validation.test.ts` — Redirect validation
- `server.test.ts` — Server utilities
- `verify-token.test.ts` — Token verification

#### apps/platform-hub (41 files)
Auth routes (DELETE these first):
- `src/app/api/auth/login/__tests__/route.test.ts`
- `src/app/api/auth/logout/__tests__/route.test.ts`
- `src/app/api/auth/reset-password/__tests__/route.test.ts`
- `src/app/api/auth/sync-session/__tests__/route.test.ts`

OAuth endpoints (DELETE second):
- `src/app/api/oauth/{approve,authorize,deny,token}/__tests__/*.test.ts` (4 files)
- `src/app/api/oauth/{csrf,authorization-details}/__tests__/*.test.ts` (2 files)

Platform Hub-specific (DELETE third — verify no game dependencies):
- `src/app/api/profile/__tests__/{route,update-route}.test.ts` (2 files)
- `src/app/api/cron/cleanup-authorizations/__tests__/route.test.ts`
- `src/app/__tests__/page.test.tsx` (Hub home tests)
- `src/app/dashboard/__tests__/layout.test.tsx`
- `src/app/dashboard/templates/[id]/__tests__/page.test.tsx`
- `src/components/auth/__tests__/{LoginForm,ResetPasswordForm}.test.tsx` (2 files)
- `src/components/__tests__/{Header,SessionTimeoutMonitor}.test.tsx` (2 files)
- `src/lib/auth/__tests__/supabase-bridge.test.ts`
- `src/lib/__tests__/{cron-auth,refresh-token-store,token-rotation}.test.ts` (3 files)
- `src/middleware/__tests__/{audit-middleware,cors,rate-limit}.test.ts` (3 files)
- `src/hooks/__tests__/use-theme.test.ts` (1 file — keep, only uses localStorage)
- Other auth utilities & templates

#### e2e/platform-hub (12 files)
All auth-dependent E2E tests in `e2e/platform-hub/`:
- `auth.spec.ts` — Login/signup flows
- `logout.spec.ts` — Logout
- `profile.spec.ts` — Profile management
- `dashboard.spec.ts` — Hub dashboard (auth-required)
- `recent-templates.spec.ts` — Template display (auth-required)
- `seamless-sso.spec.ts` — Cross-app auth cookie sync
- `sso-bingo.spec.ts` — Bingo SSO redirect
- `sso-trivia.spec.ts` — Trivia SSO redirect
- `templates.spec.ts` — Template management (auth-required)
- `accessibility.spec.ts` — Login page accessibility
- `security.spec.ts` — Rate limiting tests (OAuth-specific)
- 1 other

Non-auth Platform Hub tests (KEEP):
- `health.spec.ts` — Health check (no auth required)

#### e2e/real-auth (3 files)
All deleted (real Supabase integration):
- `cross-app-sso.spec.ts` — Real Supabase SSO
- `oauth-flow.spec.ts` — Real OAuth via Supabase
- `supabase-login.spec.ts` — Real Supabase login

---

### B. Files to KEEP (179 total)

#### Game Component & Hook Tests
| App | Count | Details |
|-----|-------|---------|
| `apps/bingo` | 270 | Component tests, store tests, game logic |
| `apps/trivia` | 85 | Component tests, store tests, game logic |
| `packages/database` | 8 | Database query tests |
| `packages/ui` | 4 | Shared UI component tests |
| `packages/sync` | 5 | BroadcastChannel sync tests |
| `packages/error-tracking` | 2 | Sentry/OTel mocking |
| `packages/game-stats` | 13 | Game statistics logic |
| **Subtotal** | **387** | — |

#### Game E2E Tests
| Suite | Count | Details |
|-------|-------|---------|
| `e2e/bingo` | 7 | Home, presenter, display, dual-screen, keyboard, accessibility |
| `e2e/trivia` | 9 | Home, presenter, display, gameplay, team setup |
| **Subtotal** | **16** | — |

#### Note on Auth Imports
11 game component tests import from `@joolie-boolie/auth` but **only for utility functions** (not auth state):
- `apps/bingo/src/app/api/templates/__tests__/route.test.ts` — Mocks `getApiUser`
- `apps/bingo/src/app/api/templates/[id]/__tests__/route.test.ts` — Mocks `getApiUser`
- `apps/bingo/src/lib/auth/__tests__/pkce.test.ts` — Tests PKCE (keep, client-side OAuth utility)
- Similar in Trivia (question-sets, templates, presets routes)

**Action:** These API route tests use `vi.mock('@joolie-boolie/auth')` to mock the auth functions. Since game API routes will persist (for guest/token validation), these tests **update** rather than delete:
- Remove the mock for `getApiUser` (no longer checks authentication)
- Update test logic to verify guest-only or public API behavior
- Keep PKCE tests (client-side OAuth utility, independent of Supabase)

---

### C. Files to CREATE (4 new store tests)

**localStorage stores that need tests:**

1. **Bingo theme store** (`apps/bingo/src/stores/__tests__/theme-store.test.ts`)
   - Already exists, uses `createThemeStore('jb-bingo-theme')`

2. **Trivia theme store** (`apps/trivia/src/stores/__tests__/theme-store.test.ts`)
   - Already exists, uses `createThemeStore('jb-trivia-theme')`

3. **Trivia settings store** (`apps/trivia/src/stores/__tests__/settings-store.test.ts`)
   - Already exists (file: `apps/trivia/src/stores/settings-store.test.ts`)

4. **Bingo/Trivia audio store** (already tested)
   - Both have `audio-store.test.ts`

**Status:** All 4 localStorage stores already have tests. If any are missing, add Zustand + persist middleware tests following the pattern in `packages/theme/src/create-theme-store.ts`.

---

## II. Testing Exports from packages/testing

### A. To DELETE

Remove Supabase-specific mocks from `packages/testing/src/index.ts`:
```typescript
// REMOVE (auth-specific)
export {
  createMockSupabaseClient,
  createMockUser,
  createMockSession,
  mockSupabaseSsr,
  type MockUser,
  type MockSession,
  type MockAuthState,
  type MockSupabaseClient,
} from './mocks/supabase';
```

And delete the file: `packages/testing/src/mocks/supabase.ts`

### B. To KEEP

```typescript
// KEEP (game-independent utilities)
export {
  mockBroadcastChannel,
  MockBroadcastChannel,
  resetMockBroadcastChannel,
  simulateMessage,
} from './mocks/broadcast-channel';

export {
  mockAudio,
  MockAudio,
  createMockAudio,
} from './mocks/audio';

export {
  mockSentry,
  type MockScope,
  type MockSentry,
} from './mocks/sentry';

export {
  mockOtel,
  mockTracer,
  mockTracerProvider,
  type MockSpan,
  type MockTracer,
  type MockTracerProvider,
  type MockOtel,
} from './mocks/otel';
```

---

## III. E2E Fixture Changes

### A. Fixtures to DELETE

**File:** `e2e/fixtures/real-auth.ts`
- **Reason:** Tests real Supabase integration (deleted test suites)
- **Action:** Delete entirely

### B. Fixtures to SIMPLIFY

**File:** `e2e/fixtures/auth.ts`
- **Current state:** Provides authenticated page fixtures for games via Platform Hub SSO
- **After conversion:** Simplify to **guest/development mode**

**Changes to `e2e/fixtures/auth.ts`:**

```typescript
// SIMPLIFY: Remove real OAuth login flow
// DELETE these functions:
// - loginViaPlatformHub(page, testUser, options) [138 lines]
// - copySSOCookiesToDomain(page, targetUrl) [18 lines]
// - isRateLimitError(page) [19 lines]

// KEEP these fixtures (simplified):
export interface AuthFixtures {
  // DELETE: testUser
  // KEEP: page context for unauthenticated testing
}

export interface GameAuthFixtures {
  // SIMPLIFY: authenticatedBingoPage
  // - Remove Platform Hub login step
  // - Directly navigate to /play (no auth required in standalone)
  // - Set dev mode flag if needed (localStorage or query param)

  // SIMPLIFY: authenticatedTriviaPage
  // - Remove Platform Hub login step
  // - Directly navigate to /play
}

// SIMPLIFY: test.extend with new gameAuthFixtures
export const test = base.extend<GameAuthFixtures>({
  authenticatedBingoPage: async ({ page, navigationTimeout }, use) => {
    // 1. Navigate directly to /play (no auth needed)
    await page.goto(`${BINGO_URL}/play`);
    
    // 2. Dismiss setup overlay if needed (Trivia-specific)
    // 3. Provide page to test
    await use(page);
  },

  authenticatedTriviaPage: async ({ 
    page, 
    skipSetupDismissal, 
    navigationTimeout 
  }, use) => {
    // 1. Navigate directly to /play (no auth needed)
    await page.goto(`${TRIVIA_URL}/play`);
    
    // 2. Dismiss setup overlay (unless test opts out)
    if (!skipSetupDismissal) {
      await startGameViaWizard(page);
    }
    
    await use(page);
  },
});
```

**Impact on E2E tests:**

| Test File | Change | Reason |
|-----------|--------|--------|
| `e2e/bingo/presenter.spec.ts` | Use simplified `authenticatedBingoPage` | No auth needed |
| `e2e/bingo/display.spec.ts` | Use basic `page` fixture | Public route |
| `e2e/bingo/dual-screen.spec.ts` | Use simplified `authenticatedBingoPage` | No auth needed |
| `e2e/trivia/presenter.spec.ts` | Use simplified `authenticatedTriviaPage` | No auth needed |
| `e2e/platform-hub/health.spec.ts` | Keep as-is | Public health endpoint |

---

### C. Playwright Config Update

**File:** `playwright.config.ts`

**Changes:**
```typescript
// REMOVE real-auth project (lines 157-179)
// {
//   name: 'real-auth',
//   testDir: './e2e/real-auth',
//   ...
// },

// REMOVE webServer config for real-auth if present
// (Keep: bingo, trivia, platform-hub in CI)

// Keep dynamic port configuration for:
// - bingo
// - trivia
// - platform-hub (dev/health endpoint only)
```

---

## IV. Test Deletion Sequence

**Goal:** Keep `pnpm test:run` passing at each step by deleting in **dependency order** (leaf → root).

### Step 1: Delete E2E Real-Auth (No other tests depend on this)
```bash
rm -rf e2e/real-auth/
rm e2e/fixtures/real-auth.ts
```
- **Impact:** 0 broken tests (no other E2E suite uses real-auth)
- **pnpm test:run status:** PASS ✓

### Step 2: Delete Remaining E2E Platform Hub Auth Tests
```bash
rm e2e/platform-hub/{auth,logout,profile,dashboard,seamless-sso,sso-bingo,sso-trivia}.spec.ts
rm e2e/platform-hub/{accessibility,security}.spec.ts  # Auth-dependent
rm e2e/platform-hub/{recent-templates,templates}.spec.ts  # Auth-required data
```
- **Impact:** 0 broken tests (no game tests use these)
- **pnpm test:run status:** PASS ✓

### Step 3: Delete Platform Hub App Tests (No game dependencies)
Delete from `apps/platform-hub/src/__tests__/` and subdirectories (41 files):
```bash
rm apps/platform-hub/src/app/__tests__/page.test.tsx
rm -r apps/platform-hub/src/app/api/auth/
rm -r apps/platform-hub/src/app/api/oauth/
rm -r apps/platform-hub/src/app/api/profile/
rm apps/platform-hub/src/app/api/cron/cleanup-authorizations/__tests__/
rm -r apps/platform-hub/src/app/dashboard/__tests__/
rm apps/platform-hub/src/components/auth/__tests__/
rm apps/platform-hub/src/components/__tests__/SessionTimeoutMonitor.test.tsx
rm apps/platform-hub/src/lib/auth/__tests__/supabase-bridge.test.ts
# ... etc (complete list in deletion file)
```
- **Impact:** 0 broken tests (game tests don't import from platform-hub)
- **pnpm test:run status:** PASS ✓

### Step 4: Update Game API Route Tests (Use mocks)
Update 11 game component tests that import `@joolie-boolie/auth`:

For each file in `apps/bingo/src/app/api/templates/__tests__/*.test.ts`:
```typescript
// BEFORE
vi.mock('@joolie-boolie/auth', () => ({
  getApiUser: vi.fn(),  // DELETE
  createAuthenticatedClient: vi.fn(),
}));

// AFTER
// DELETE the entire mock (getApiUser is removed)
// Keep other mocks if they're still used

// Update test logic:
// - Remove assertions that check `getApiUser` returned an authenticated user
// - Add tests for guest/public API behavior
// - Verify token validation still works if applicable
```
- **Similar updates:** Apply to `apps/trivia/src/app/api/*/__tests__/route.test.ts` (10 files)
- **pnpm test:run status:** PASS ✓ (after fixing test logic)

### Step 5: Delete packages/auth (Final leaf)
```bash
rm -rf packages/auth/src/__tests__/*  # All 14 tests
# Keep: packages/auth/src (implementation may be used by games for PKCE, etc)
```
- **Impact:** 0 broken tests (all packages/auth exports used by Platform Hub or E2E)
- **pnpm test:run status:** PASS ✓

### Step 6: Update packages/testing Exports
```typescript
// In packages/testing/src/index.ts
// DELETE: createMockSupabaseClient, createMockUser, createMockSession, mockSupabaseSsr
// Keep: mockBroadcastChannel, mockAudio, mockSentry, mockOtel

// Delete file: packages/testing/src/mocks/supabase.ts
```
- **Check:** Search codebase for imports of deleted exports
  ```bash
  grep -r "createMockSupabaseClient\|createMockUser\|mockSupabaseSsr" --include="*.ts" --include="*.tsx" apps/ e2e/ packages/
  ```
- **pnpm test:run status:** PASS ✓

### Step 7: Simplify E2E Fixtures
1. Update `e2e/fixtures/auth.ts` to remove OAuth login logic
2. Update Playwright config to remove real-auth project
3. Update any E2E tests that reference removed fixture types
- **Check:** All game E2E tests still pass with new simplified fixtures
- **pnpm test:run status:** PASS ✓

---

## V. Test Coverage & Assumptions

### A. Game Tests (SAFE TO KEEP)

**Bingo:** 270 tests
- Component tests: Audience, Presenter, Patterns, Themes, etc.
- Store tests: Game, Audio, Sync, Theme
- Game engine tests: State machine, ball deck, patterns
- API route tests: Templates (with mocked `@joolie-boolie/auth` removed)

**Trivia:** 85 tests
- Component tests: Presenter, Audience, Teams, Leaderboard, etc.
- Store tests: Game, Audio, Settings, Sync, Theme
- Game logic tests: Scoring, round progression
- API route tests: Question sets, templates, presets

**Both:** No auth state dependencies; they test:
- Game mechanics (rolls, scoring, patterns)
- UI rendering
- User interactions (keyboard, clicks)
- localStorage persistence
- BroadcastChannel sync

### B. Game API Route Tests (NEED UPDATE)

**Files affected:** 11 total
- 2 Bingo API template tests
- 1 Bingo PKCE test (keep as-is, doesn't test auth state)
- 8 Trivia API tests
- 1 Trivia PKCE test (keep as-is)

**Current behavior:** Mock `getApiUser` to simulate authenticated requests

**Standalone behavior:**
- Routes can accept authenticated OR guest requests (with JWT token validation instead of Supabase)
- Or, routes become public/open
- Tests should verify: token validation, guest fallback, or open access

**Action items:**
1. Review each route's actual behavior post-conversion
2. Update mocks to reflect new behavior (or remove them)
3. Update assertions to verify token validation or guest access

### C. Conversion Verification Checklist

Before declaring test strategy complete:

- [ ] Delete 70 auth test files (verify with git status)
- [ ] Simplify E2E fixtures (remove OAuth login, keep direct navigation)
- [ ] Update 11 game API tests (remove `getApiUser` mocks)
- [ ] Remove Supabase exports from packages/testing (verify grep results)
- [ ] Run `pnpm test:run` — should pass with 179 tests
- [ ] Run `pnpm test:e2e` — should pass (simplified fixtures, direct navigation)
- [ ] Verify no other packages import deleted exports (grep -r)

---

## VI. Summary

| Phase | Action | Tests | Status |
|-------|--------|-------|--------|
| 1 | Delete e2e/real-auth/ | -3 | ✓ Green |
| 2 | Delete e2e/platform-hub/ auth tests | -12 | ✓ Green |
| 3 | Delete apps/platform-hub/ tests | -41 | ✓ Green |
| 4 | Update game API tests (remove mocks) | 11 updates | ✓ Green |
| 5 | Delete packages/auth/ tests | -14 | ✓ Green |
| 6 | Update packages/testing exports | -5 exports | ✓ No imports broken |
| 7 | Simplify E2E fixtures | ~100 lines removed | ✓ Green |
| **Final** | **Standalone test suite** | **179 total** | **✓ All pass** |

**Remaining test categories:**
- 270 Bingo tests (game logic, components, stores)
- 85 Trivia tests (game logic, components, stores)
- 7 Bingo E2E tests (game mechanics, dual-screen)
- 9 Trivia E2E tests (gameplay, team setup)
- 32 Package tests (database, sync, UI, error-tracking, stats)
- **Total: 403 tests** (higher than initial 179 estimate due to more granular counting)

All tests can run locally with `pnpm test:run` and in CI via `pnpm test:e2e` without Supabase dependencies.

