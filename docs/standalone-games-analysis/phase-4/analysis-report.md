# Standalone Games Conversion: Final Analysis Report

## A) Executive Summary

Converting the Joolie Boolie monorepo from "Platform Hub + two OAuth-dependent games" to "two standalone games with localStorage" is technically feasible and architecturally clean. The game engines, UI, audio system, dual-screen sync, PWA, and observability stack are completely decoupled from auth — auth was layered on top of working game systems and is mechanically removable. The deletion scope is substantial but bounded: **261 files and ~43,000 lines (33% of the monorepo)** delete cleanly, leaving **~85,500 lines** of game logic, UI, and infrastructure untouched. The primary new construction is **4 Zustand stores** following an existing persist pattern already used in 5 stores across both games. The trivia-api CORS proxy and monitoring tunnels must be retained as server routes; full static export is not viable. What makes this conversion consequential is not technical complexity but product consequences: existing user data in Supabase is permanently lost without a migration tool, and the product transforms from multi-device/cross-device capable to single-device/browser-local. This is a product decision masquerading as a technical one.

---

## B) Analysis Question & Scope

**Question:** What would it take to convert this monorepo from "Platform Hub + two game apps with OAuth" to "two standalone game apps (Bingo/Trivia) with no OAuth, no Platform Hub, localStorage for game state"?

**Scope:** Three apps (platform-hub, bingo, trivia) and 10 packages. Analysis examined auth coupling depth, deletion scope by file/line count, CRUD replacement architecture, deployment changes, test infrastructure impact, configuration changes, and product-level consequences.

**What "standalone" means:** Each game deploys independently with no dependency on Platform Hub. Users play without accounts. Game configuration (templates, presets, question sets) stored in browser localStorage. The trivia external API proxy remains for CORS.

---

## C) Key Findings

### Theme 1: Auth Is a Wrapper, Not a Foundation

Auth was added to working game systems. The game engines (`apps/bingo/src/lib/game/engine.ts`, `apps/trivia/src/lib/game/engine.ts`) are pure functions with zero auth imports. Auth appears only at two narrow surfaces: the middleware layer (37-line wrappers) and API route handlers (`getApiUser()` calls). Both games already set `guestModeEnabled: true` — unauthenticated users pass through to `/play`. Both home pages render a "Play as Guest" path today.

**Confidence: High.** Verified by direct source inspection.

### Theme 2: The Deletion Boundary Is Clean and Quantified

| Category | Files | Lines |
|----------|-------|-------|
| Platform Hub (entire app) | 159 | 28,240 |
| Auth package (entire package) | 43 | 8,364 |
| Auth API routes in games | 7 | 378 |
| Template/preset/question-set API routes | 19 | 4,960 |
| Middleware files | 2 | 72 |
| OAuth callback pages | 2 | 2 |
| Supabase directory (auth migrations) | ~15 | ~1,000 |
| Testing package (Supabase mocks) | 12 | 915 |
| Auth lib files in games | 2 | 118 |
| **Total** | **261** | **~43,049** |

**Confidence: High.**

### Theme 3: localStorage Replacement Follows Existing Patterns

Five Zustand stores already use `persist` middleware with localStorage. Four new stores are needed:

| Store | App | localStorage Key | Size per Item |
|-------|-----|------------------|---------------|
| useBingoTemplateStore | Bingo | `jb-bingo-templates` | ~200 bytes |
| useTriviaTemplateStore | Trivia | `jb-trivia-templates` | ~500-5,000 bytes |
| useTriviaPresetStore | Trivia | `jb-trivia-presets` | ~100 bytes |
| useTriviaQuestionSetStore | Trivia | `jb-trivia-question-sets` | ~2-50 KB |

Total worst-case localStorage usage: ~500 KB (under 1% of 5-10 MB limit). All parsing/conversion logic (`parseJsonQuestions`, `questionsToTriviaQuestions`, `convertTemplateQuestion`) is already client-side.

**Confidence: High.**

### Theme 4: The Server Layer Survives, Hollowed Out

Static export NOT viable. Three server concerns survive:
1. **Trivia API proxy** — CORS bypass for the-trivia-api.com (zero auth dependency)
2. **Monitoring tunnels** — Required for Sentry
3. **CSP report endpoints** — Passive logging

Everything else (34 routes, 27 auth-gated) deletes entirely.

**Confidence: High.**

### Theme 5: 72% of Tests Survive Unchanged

| Category | Count | Outcome |
|----------|-------|---------|
| Game/package tests | ~179 | Survive unchanged |
| Auth/platform tests | ~68 | Delete |

E2E: 16 of 31 files survive. Auth fixture simplifies from Platform Hub SSO dance to direct access. 4 new stores need new tests.

**Confidence: High.**

### Theme 6: Middleware Simplifies Dramatically

Current: 4-step JWT verification chain (E2E → HS256 → session token → JWKS ES256) with proactive refresh calling Platform Hub.

Post-conversion: `return NextResponse.next()` with E2E/Vercel guard preserved.

Eliminates the entire bug class around Service Worker cookie stripping, JWKS lazy init, and HS256/ES256 divergence.

**Confidence: High.**

### Theme 7: Environment Variables Reduce from 13+ to 0-4

OAuth vars deleted: `SESSION_TOKEN_SECRET`, `SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_PLATFORM_HUB_URL`, `NEXT_PUBLIC_OAUTH_CLIENT_ID`, `COOKIE_DOMAIN`, plus others. Trivia-api proxy confirmed zero Supabase dependency, so even Supabase vars may be removable.

**Confidence: High.**

### Theme 8: game_sessions Table Is a Non-Regression

The table has room_code + PIN structure but `grep game_sessions` across all game source returns **zero matches**. Feature was designed at DB level but never built in UI/API. Loss is non-regression.

**Confidence: High** (confirmed by grep).

---

## D) What Gets Removed (Quantified)

- **Platform Hub**: Complete deletion — 159 files, 28,240 lines. OAuth 2.1 server, login/signup, dashboard, settings, template aggregation, rate limiting, CSRF, audit logging.
- **Auth Package**: Complete deletion — 43 files, 8,364 lines. Middleware factory, PKCE, JWT verification, OAuth client, auth hooks/components.
- **API Routes**: 26 route files across both games (auth + CRUD). Surviving: trivia-api proxy, monitoring tunnel, CSP report, health check.
- **Supabase**: Entire `supabase/` directory. All migrations, functions, seed data.
- **Testing Mocks**: Supabase-related mocks in `packages/testing`.
- **LoginButton**: Single UI component in `packages/ui` that triggers OAuth.

---

## E) What Gets Built

1. **4 Zustand stores** with persist middleware (~150-200 lines each, following `settings-store.ts` pattern)
2. **Simplified middleware** (5-line passthrough with E2E guard)
3. **Simplified home pages** (remove auth-conditional rendering)
4. **Shared validation module** (`lib/validation/questions.ts` — consolidated from 4 API routes)
5. **Feature flag adjustment** (remove `isAuthenticated` gate on question-sets)

Estimated net-new code: ~800 lines. Net reduction: ~42,000 lines.

---

## F) What Gets Lost

| Feature | Current State | Standalone |
|---------|--------------|------------|
| Cross-device template access | Server-backed, any device | Browser-local, one device |
| Template sharing between users | Per-user via Supabase | Not possible |
| Data backup | Implicit in Supabase | None (browser clear = data loss) |
| Multi-device presenter/display | Possible via server | Same-device only (BroadcastChannel) |
| User accounts | OAuth 2.1 with PKCE | None |
| Institutional management | Profiles, dashboard | None |
| game_sessions room codes | Designed but never built | N/A (non-regression) |

---

## G) What Survives Unchanged

- Game engines (pure Zustand functions)
- All presenter and audience components
- Dual-screen sync (BroadcastChannel — zero server dependency)
- Audio system (voice packs, sound effects)
- Theme system (design tokens, dark/light modes)
- PWA/Service Worker
- Game statistics (already localStorage-native)
- Question import/export (already client-side parsing)
- Trivia API proxy routes
- Observability (Sentry, OTel — confirmed no Supabase imports)
- Keyboard shortcuts
- All 6 untouched packages: sync, game-stats, types, theme, audio, error-tracking

---

## H) Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Permanent user data loss | HIGH (if prod users exist) | Query Supabase counts first; build export tool if non-zero |
| localStorage eviction on mobile | MEDIUM | Expose export/import UI from day one |
| Observability breaking silently | MEDIUM | Audit instrumentation.ts files before auth deletion |
| is_default singleton invariant | LOW | Enforce in store's setDefault action (clear all, set one) |
| E2E mode guard lost in simplification | LOW | Copy guard verbatim to new middleware |

---

## I) Confidence Assessment

### Overall Confidence: HIGH

**Strongest claims (high confidence):**
- Auth has zero coupling to game engines, UI, audio, sync, themes
- 261 files / 43K lines delete cleanly
- 4 new stores follow established patterns
- 72% of tests survive unchanged
- game_sessions is unbuilt (zero UI code)

**Moderate claims (medium confidence):**
- packages/database can be stripped to types-only (type import graph not fully traced)
- Net-new test scope for 4 stores (~20-30 test files)

**Unknown (requires data):**
- Production user count and saved data volume
- Whether Supabase project is currently active or paused

---

## J) Pre-Conversion Decisions Required

1. **Is this an explicit product decision?** The conversion changes the value proposition. Confirm before any code changes.
2. **How many production users have saved data?** Query Supabase. If non-zero, build export tool first.
3. **Keep monorepo or split into two repos?** Affects package handling strategy.
4. **Retain Sentry/Grafana?** If yes, monitoring tunnel stays. If no, more deletion possible.
5. **packages/database fate:** Keep as types-only, migrate types to packages/types, or leave unchanged?

---

## K) Recommendations (Prioritized)

### P1 — Before any code:
1. Query production Supabase for user data counts
2. Confirm product decision explicitly
3. Decide monorepo vs split

### P2 — Implementation order:
4. Delete Platform Hub + auth package (36K lines, zero game impact)
5. Replace middleware with passthrough
6. Simplify home pages
7. Delete auth API routes
8. Build 4 Zustand stores (start with Bingo — simplest)
9. Wire UI components to stores
10. Delete CRUD API routes
11. Fix question-sets feature flag
12. Clean up env vars
13. Delete packages/database (or strip to types)
14. Delete supabase/ directory
15. Run full test suite; delete auth tests; write store tests

### P3 — Post-deletion:
16. Verify Sentry context
17. Verify E2E passes without Platform Hub
18. Update CLAUDE.md

---

## L) Open Questions

1. **How many production users have saved data?** (Supabase query needed)
2. **Is the Supabase project currently active or paused?** (affects migration urgency)
3. **Which types from packages/database are imported by game source (not API routes)?** (determines package fate)
4. **Is there production monitoring on Platform Hub login events?** (Grafana dashboards to sunset)
5. **What replaces the home page auth UI?** (Product/design decision)

---

## M) Evidence Index

| Finding | Evidence Source | Location |
|---------|---------------|----------|
| guestModeEnabled: true | Source code | `apps/bingo/src/middleware.ts:10-14`, `apps/trivia/src/middleware.ts:10-14` |
| 4-step JWT chain | Source code | `packages/auth/src/middleware-factory.ts:118-264` |
| Platform Hub scope | File enumeration | `apps/platform-hub/` (159 files, 28,240 lines) |
| Auth package scope | File enumeration | `packages/auth/src/` (43 files, 8,364 lines) |
| Trivia-api no auth | Source code | `apps/trivia/src/app/api/trivia-api/questions/route.ts:1-20` |
| game_sessions unused | grep result | Zero matches in `apps/` for "game_sessions" |
| Persist pattern (5 stores) | Source code | `apps/bingo/src/stores/audio-store.ts:211-478`, `apps/trivia/src/stores/settings-store.ts:86-154` |
| TemplateSelector fetch | Source code | `apps/bingo/src/components/presenter/TemplateSelector.tsx:33-61` |
| SavePresetModal exists | Source code | `apps/trivia/src/components/presenter/SavePresetModal.tsx` |
| error-tracking no Supabase | grep result | Zero Supabase imports in `packages/error-tracking/src/` |
| Feature flag | Source code | `apps/trivia/src/lib/feature-flags.ts:10-11` |
| Home page auth rendering | Source code | `apps/bingo/src/app/page.tsx:8-73`, `apps/trivia/src/app/page.tsx:8-58` |
| Test counts (247 total) | File enumeration | Phase-2 iterator-4 analysis |
| Env var inventory | Source code | `apps/bingo/src/lib/env-validation.ts:52-70` |
| LoginButton OAuth trigger | Source code | `packages/ui/src/login-button.tsx` |
