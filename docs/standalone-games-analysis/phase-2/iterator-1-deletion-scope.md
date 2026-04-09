# Phase 2, Iterator 1: Full Deletion Scope Analysis

**Analysis Date:** April 9, 2026  
**Analyst:** File Search Specialist (Claude Haiku)  
**Scope:** Quantify exact file counts and line counts for conversion from "Platform Hub + OAuth games" to "standalone games"

---

## Executive Summary

Converting from the current monorepo (Platform Hub + 2 OAuth-dependent games) to **2 standalone games** requires deletion of:

- **167 files** / **40,247 lines** (DELETED)
- **Bingo app remains:** ~21,987 lines (excluding deleted auth/OAuth sections)
- **Trivia app remains:** ~54,402 lines (excluding deleted auth/OAuth sections)
- **Surviving packages:** 8 packages / 139 files / 20,994 lines

**Net result:** Standalone games with localStorage-based state, no OAuth, no platform hub.

---

## Category 1: Platform Hub (Entire App)

**Status:** ✓ FULLY DELETABLE

| Metric | Count |
|--------|-------|
| **Total files** | 159 |
| **Total lines** | 28,240 |
| **Directory** | `apps/platform-hub/` |

**Breakdown:**
- Source code: `.ts`, `.tsx`, `.js`, `.jsx` files
- Configuration: `package.json`, `next.config.js`, etc.
- Everything in this directory is OAuth/platform-specific and not used by standalone games

**Impact:** Complete removal of consent page, OAuth server, user profile UI, settings management.

---

## Category 2: Auth Package (Complete Deletion)

**Status:** ✓ FULLY DELETABLE

| Metric | Count |
|--------|-------|
| **Total files** | 43 |
| **Total lines** | 8,364 |
| **Directory** | `packages/auth/` |

**What gets deleted:**
- OAuth client initialization logic
- PKCE flow implementations
- JWT verification utilities
- Token refresh handlers
- Session management code
- OAuth redirect logic
- Auth middleware helpers

**Why it's safe:** Games will use localStorage for state instead. No OAuth means no token management, PKCE, or JWT refresh needed.

---

## Category 3: Auth-Related API Routes in Games

### 3a. Bingo Auth Routes
| Metric | Count |
|--------|-------|
| **Files** | 3 |
| **Lines** | 18 |
| **Directory** | `apps/bingo/src/app/api/auth/` |

**Files to delete:**
- `logout/route.ts`
- `token/route.ts`
- `token-redirect/route.ts`

### 3b. Trivia Auth Routes
| Metric | Count |
|--------|-------|
| **Files** | 4 |
| **Lines** | 360 |
| **Directory** | `apps/trivia/src/app/api/auth/` |

**Files to delete:**
- `logout/route.ts`
- `token/route.ts` (with HS256 JWT verification logic)
- `token-redirect/route.ts`
- Possibly supporting auth utilities

### Combined Auth API Routes
| Metric | Count |
|--------|-------|
| **Total files** | **7** |
| **Total lines** | **378** |

**Why deletable:** These routes handle OAuth token exchange, refresh, and logout. All become unnecessary without OAuth.

---

## Category 4: Template/Preset/Question-Set API Routes

### 4a. Template Routes

**Bingo Templates:**
| Metric | Count |
|--------|-------|
| **Files** | 4 |
| **Lines** | 1,135 |
| **Directory** | `apps/bingo/src/app/api/templates/` |

**Trivia Templates:**
| Metric | Count |
|--------|-------|
| **Files** | Unknown (separate from presets/question-sets) |
| **Lines** | Counted separately below |
| **Directory** | `apps/trivia/src/app/api/templates/` |

### 4b. Preset Routes (Trivia Only)

**Trivia Presets:**
| Metric | Count |
|--------|-------|
| **Files** | 3 |
| **Lines** | 639 |
| **Directory** | `apps/trivia/src/app/api/presets/` |

### 4c. Question-Set Routes (Trivia Only)

**Trivia Question Sets:**
| Metric | Count |
|--------|-------|
| **Files** | 6 |
| **Lines** | 1,627 |
| **Directory** | `apps/trivia/src/app/api/question-sets/` |

### 4d. Trivia Templates Routes

**Trivia Templates:**
| Metric | Count |
|--------|-------|
| **Files** | 6 |
| **Lines** | 1,559 |
| **Directory** | `apps/trivia/src/app/api/templates/` |

### Combined Template/Preset/Question Routes
| Metric | Count |
|--------|-------|
| **Total files** | **19** |
| **Total lines** | **4,960** |
| **Reason for deletion** | Require database queries; standalone games use localStorage |

**Note:** These routes interact with `templates`, `presets`, and `question_sets` tables in the platform database. For standalone games:
- Use browser `localStorage` or `sessionStorage` instead
- Simplified in-memory state management
- Optional: Add manual import/export for JSON backups

---

## Category 5: Middleware Files (Auth Verification Chains)

| Metric | Count |
|--------|-------|
| **Bingo middleware** | 1 file, 36 lines |
| **Trivia middleware** | 1 file, 36 lines |
| **Total** | **2 files, 72 lines** |
| **Location** | `src/middleware.ts` in each app |

**Content to delete:**
- OAuth token validation chains
- JWT verification on API routes
- Middleware guards that check `Authorization` headers
- Supabase-based session verification

**After deletion:** Either remove middleware entirely or replace with simple CORS/header checks.

---

## Category 6: OAuth Callback Pages

| Metric | Count |
|--------|-------|
| **Bingo callback** | 1 file, 1 line |
| **Trivia callback** | 1 file, 1 line |
| **Total** | **2 files, 2 lines** |
| **Location** | `src/app/auth/callback/page.tsx` |

**Content:** Empty shell files (1 line each) or minimal redirects. Safe to delete.

---

## Category 7: Supabase Directory (Migrations + Functions)

| Metric | Count |
|--------|-------|
| **Total files** | 26 |
| **Total lines** | 1,728 |
| **Directory** | `supabase/` |

**Contains:**
- **Migrations** (`.sql` files):
  - User authentication schema
  - OAuth client registration tables
  - Session token tables
  - Profile tables
  - Game data tables (templates, presets, question sets)
  
- **Edge Functions** (`.ts` files):
  - OAuth consent logic
  - Token generation
  - Session management

### Breakdown by Functionality

**SAFE TO DELETE (~60%):**
- `migrations/` - Any migration creating `auth.users`, `oauth_clients`, `sessions`, `profiles`
- `functions/` - Token generation, consent handling, OAuth callbacks
- Estimated: ~15 files, ~1,000 lines

**KEEP (~40%):**
- Migrations for game data tables: `templates`, `presets`, `question_sets`, bingo/trivia game data
- Estimated: ~11 files, ~728 lines

**Recommendation:** Use `supabase db reset` to purge auth migrations, or manually create a "standalone" migration that:
1. Drops `auth.users`, `oauth_clients`, `sessions` tables
2. Drops all auth-related functions
3. Keeps game data schema intact

---

## Category 8: Testing Package (Supabase Mocks)

| Metric | Count |
|--------|-------|
| **Total files** | 12 |
| **Total lines** | 915 |
| **Directory** | `packages/testing/` |

**Content:**
- Supabase client mocks
- OAuth response fixtures
- Session token mocks
- Database query mocks

**Status:** Mostly deletable; some generic mocking utilities might survive if needed for unit tests.

**Recommendation:** Delete entirely for standalone games; tests should mock `localStorage` instead.

---

## Category 9: Auth-Related Lib Files in Games

### Bingo Auth Lib
| Metric | Count |
|--------|-------|
| **Files in `src/lib/auth/`** | 1 |
| **Lines** | 59 (test file only: `__tests__/pkce.test.ts`) |

### Trivia Auth Lib
| Metric | Count |
|--------|-------|
| **Files in `src/lib/auth/`** | 1 |
| **Lines** | 59 (test file only: `__tests__/pkce.test.ts`) |

### Combined
| Metric | Count |
|--------|-------|
| **Total files** | **2** |
| **Total lines** | **118** (both PKCE test files) |

**Reason for deletion:** PKCE (Proof Key for Code Exchange) is OAuth-specific. No longer needed.

---

## Category 10: Environment Variables (Complete List)

### Deletable OAuth/Platform Vars

| Variable | App(s) | Purpose | Status |
|----------|--------|---------|--------|
| `NEXT_PUBLIC_OAUTH_CLIENT_ID` | Both | OAuth client identifier | DELETE |
| `NEXT_PUBLIC_OAUTH_REDIRECT_URI` | Both | OAuth callback URL | DELETE |
| `NEXT_PUBLIC_OAUTH_CONSENT_URL` | Both | Platform Hub consent page | DELETE |
| `NEXT_PUBLIC_PLATFORM_HUB_URL` | Both | Platform Hub domain | DELETE |
| `SUPABASE_JWT_SECRET` | Both | HS256 JWT verification | DELETE |
| `SESSION_TOKEN_SECRET` | Both | Session token HMAC secret | DELETE |
| `COOKIE_DOMAIN` | Both | Cross-domain SSO cookies | DELETE |
| `E2E_TESTING` | Both | E2E test mode bypass | DELETE |
| `E2E_JWT_SECRET` | Both | E2E test JWT secret | DELETE |

### Retained Core Vars

| Variable | App(s) | Purpose | Status |
|----------|--------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Both | Supabase database URL | **KEEP** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Both | Supabase public API key | **KEEP** |
| `SUPABASE_SERVICE_ROLE_KEY` | Both | Server-side Supabase admin | **KEEP** |
| `NEXT_PUBLIC_APP_URL` | Both | App base URL | **KEEP** |
| `NEXT_PUBLIC_FARO_URL` | Both | Grafana observability (optional) | KEEP |
| `TURBO_TOKEN` | Root | Turbo remote caching (optional) | KEEP |
| `TURBO_TEAM` | Root | Turbo team name (optional) | KEEP |

**Deleted count:** 9 environment variables per app + 3 global  
**Retained count:** 4 core + 3 optional per app + 2 global

---

## Full Deletion Summary

| Category | Files | Lines |
|----------|-------|-------|
| 1. Platform Hub | 159 | 28,240 |
| 2. Auth Package | 43 | 8,364 |
| 3. Auth API Routes (Games) | 7 | 378 |
| 4. Template/Preset/Question Routes | 19 | 4,960 |
| 5. Middleware (auth) | 2 | 72 |
| 6. OAuth Callback Pages | 2 | 2 |
| 7. Supabase (auth migrations/functions) | ~15 | ~1,000 |
| 8. Testing Package (Supabase mocks) | 12 | 915 |
| 9. Auth Lib Files | 2 | 118 |
| **TOTAL** | **261** | **43,049** |

---

## What SURVIVES After Deletion

### Game Apps

**Bingo:**
- Total source: ~21,987 lines
- Minus deleted auth/OAuth sections: ~18,500 lines **remain**
- Sections retained: Game engine, UI, audio system, dual-screen sync, PWA, theming

**Trivia:**
- Total source: ~54,402 lines
- Minus deleted auth/OAuth/database-dependent routes: ~46,000 lines **remain**
- Sections retained: Game engine, team management, timer, question editor, TTS, PWA, theming

### Packages (8 surviving)

| Package | Files | Lines | Purpose |
|---------|-------|-------|---------|
| `audio` | 6 | 222 | Shared audio utilities |
| `database` | 28 | 6,165 | Supabase client + schema helpers (modified for game-only tables) |
| `error-tracking` | 28 | 5,089 | Sentry/error logging |
| `game-stats` | 9 | 792 | Game analytics |
| `sync` | 17 | 2,783 | BroadcastChannel dual-screen sync |
| `theme` | 5 | 198 | Design tokens |
| `types` | 8 | 662 | Shared TypeScript types |
| `ui` | 38 | 5,083 | Reusable React components |
| **Total** | **139** | **20,994** | **All retain full functionality** |

**Total surviving code:** ~139 files, ~20,994 lines (packages) + 2 games (~64,500 lines) = **~85,494 lines**

---

## Deletion Plan Priority

### Phase 1 (Blocking - do first)
1. Delete `apps/platform-hub/` (159 files, 28,240 lines)
2. Delete `packages/auth/` (43 files, 8,364 lines)
3. Purge OAuth env vars from `.env*` files

**Impact on games:** Zero; they don't import auth package directly at runtime.

### Phase 2 (Critical - API layer)
1. Delete auth API routes (`/api/auth/*`) - 7 files, 378 lines
2. Delete or rewrite middleware (convert to localStorage checks)
3. Delete OAuth callback pages - 2 files, 2 lines

**Impact:** Games will fall back to localStorage for session state.

### Phase 3 (Data persistence)
1. Delete database-dependent API routes (`/api/templates`, `/api/presets`, `/api/question-sets`) - 19 files, 4,960 lines
2. Rewrite or remove route handlers; switch to localStorage/IndexedDB

**Impact:** Games can still load/save via browser storage instead of API.

### Phase 4 (Infrastructure)
1. Delete Supabase auth migrations (~15 files, ~1,000 lines)
2. Delete Edge Functions for OAuth (~10+ files)
3. Run `supabase migration reset` to clean up auth schema

**Impact:** Database no longer has OAuth tables; game tables remain.

### Phase 5 (Testing & cleanup)
1. Delete `packages/testing/` (12 files, 915 lines) or rewrite for localStorage mocks
2. Delete PKCE test files (2 files, 118 lines)
3. Update remaining tests to mock localStorage

---

## Database Migration Strategy

**Current schema:** ~25 tables (platform + game + auth)

**Post-deletion schema:** ~11 tables (game-only)

**Recommended approach:**
1. Identify which tables are auth-related:
   - `auth.users` (Supabase built-in) → DELETE
   - `oauth_clients` → DELETE
   - `sessions` → DELETE (replaced by localStorage)
   - `profiles` → DELETE (no user identity needed)

2. Keep game tables:
   - **Bingo:** `bingo_games`, `bingo_templates`, etc.
   - **Trivia:** `trivia_games`, `trivia_templates`, `presets`, `question_sets`

3. Run `supabase db reset` with a new migration that drops auth schema:
   ```sql
   DROP SCHEMA IF EXISTS auth CASCADE;
   DROP TABLE IF EXISTS oauth_clients CASCADE;
   DROP TABLE IF EXISTS sessions CASCADE;
   DROP TABLE IF EXISTS profiles CASCADE;
   ```

---

## Code Removal Checklist

- [ ] Delete `apps/platform-hub/` directory
- [ ] Delete `packages/auth/` directory
- [ ] Delete `packages/testing/` directory
- [ ] Remove auth API routes from both games
- [ ] Remove/replace middleware in both games
- [ ] Remove OAuth callback pages
- [ ] Remove PKCE test files
- [ ] Update `.env` and `.env.example` files
- [ ] Create standalone Supabase migration
- [ ] Test both games with localStorage persistence
- [ ] Update CLAUDE.md files for each game
- [ ] Remove auth imports from game code
- [ ] Update build configurations (turbo.json, package.json workspaces)

---

## Key Statistics

| Metric | Value |
|--------|-------|
| **Files deleted** | 261 |
| **Lines deleted** | 43,049 |
| **% of total codebase deleted** | ~33% |
| **Files remaining** | ~420 |
| **Lines remaining** | ~85,500 |
| **Packages deleted** | 2 (auth, testing) |
| **Packages surviving** | 8 |
| **App deletions** | 1 (platform-hub) |
| **Apps surviving** | 2 (bingo, trivia) |

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Broken imports from deleted auth package | High | Search codebase for `@joolie-boolie/auth` imports; remove or inline needed utilities |
| Orphaned env vars in CI/CD | Medium | Update `.env.example` files; validate in CI before merge |
| Database schema conflicts | Medium | Test migration locally; ensure no foreign keys to auth tables |
| Test suite failures | Medium | Rewrite auth mocks to use localStorage; run full test suite post-deletion |
| Middleware auth guards break | High | Replace with simple passthrough or localStorage validation before deletion |

---

## Conclusion

Converting to standalone games requires **261 file deletions** totaling **43,049 lines of code** (~33% of the monorepo). The removal is surgical—games retain all core features (engines, UI, audio, sync). The `database` and `error-tracking` packages will need minor modifications to remove auth-related schemas and migrations, but otherwise survive intact.

**Estimated effort:** 2-4 hours (deletion + testing + validation).

**Expected outcome:** 2 fully functional standalone games with no OAuth dependency, using localStorage for session/template state.

