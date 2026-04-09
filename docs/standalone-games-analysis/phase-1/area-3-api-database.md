# Investigation: Database & API Route Inventory

## Summary

The monorepo contains 34 API routes across Bingo (11) and Trivia (23), with 27 total auth checks via `getApiUser()`. The database has 6 game-data tables (bingo_templates, bingo_presets, trivia_templates, trivia_presets, trivia_question_sets, game_sessions) plus 5 platform infrastructure tables (oauth_clients, oauth_authorizations, oauth_audit_log, user_roles, facilities, profiles). All game data is user-scoped with RLS. For standalone mode, all persistent game data must migrate to localStorage; the BFF layer for templates/presets becomes unnecessary.

## Key Findings

### Finding 1: Bingo API Routes (11 routes, 5 hit DB, 6 auth-gated)
- **Evidence:** `apps/bingo/src/app/api/templates/route.ts` (142 lines), `apps/bingo/src/app/api/templates/[id]/route.ts` (194 lines)
- **Routes:** GET/POST /api/templates, GET/PATCH/DELETE /api/templates/[id], POST /api/auth/logout, POST /api/auth/token, GET /api/auth/token-redirect, GET /api/health, POST /api/csp-report, POST /api/monitoring-tunnel
- **Confidence:** High
- **Implication:** All template CRUD routes are auth-gated. For standalone: delete or convert to localStorage operations.

### Finding 2: Trivia API Routes (23 routes, 14 hit DB, 12 auth-gated)
- **Evidence:** `apps/trivia/src/app/api/templates/route.ts` (170 lines), `apps/trivia/src/app/api/presets/route.ts` (120 lines), `apps/trivia/src/app/api/question-sets/route.ts` (175 lines), `apps/trivia/src/app/api/question-sets/import/route.ts` (135 lines)
- **Routes:** Full CRUD for templates, presets, question-sets; import endpoint; default template endpoint; 2 public trivia-api proxy routes (categories, questions); auth routes
- **Confidence:** High
- **Implication:** Trivia has 3x more API surface than Bingo. Question-sets are feature-flagged (QUESTION_SETS_ENABLED). Public trivia-api routes have no auth dependency and could remain as server-side proxies.

### Finding 3: Supabase Schema — 6 Game Tables + 5 Platform Tables
- **Evidence:** `supabase/migrations/` — 24 migration files, ~800 lines total
- **Game-Data Tables (migrate to localStorage):** bingo_templates, bingo_presets, trivia_templates, trivia_presets, trivia_question_sets
- **Mixed (game_sessions):** room_code, game_state JSONB, user_id nullable; RLS allows unauthenticated audience
- **Auth-Only Tables (delete):** oauth_clients, oauth_authorizations, oauth_audit_log, user_roles, facilities, profiles
- **Confidence:** High
- **Implication:** Clean separation between game data and platform infrastructure tables.

### Finding 4: Database Package CRUD Patterns
- **Evidence:** `packages/database/src/tables/bingo-templates.ts` (235 lines), `packages/database/src/queries.ts` (237 lines)
- **Operations:** list, listAll, getById, getOne, create, update, remove — all take a Supabase client
- **Special operations:** setDefault, unsetDefault, duplicate, getDefault, countByUser
- **Confidence:** High
- **Implication:** All operations are backend-only via Supabase client. For standalone: replace with localStorage CRUD. Validation logic in routes must move to client.

### Finding 5: Universal `getApiUser()` Auth Gating
- **Evidence:** 27 total auth checks across game routes. Pattern: `const user = await getApiUser(request); if (!user) return 401`
- **Confidence:** High
- **Implication:** Every template/preset/question-set endpoint is unreachable without OAuth token. Routes must be deleted entirely in standalone mode.

### Finding 6: Data Complexity & localStorage Feasibility
- **Bingo Templates:** ~200 bytes each, ~20KB for 100 templates — TRIVIAL
- **Trivia Templates:** ~15KB each (50 questions), ~300KB for 20 templates — FEASIBLE
- **Trivia Presets:** ~100 bytes each, ~5KB for 50 presets — TRIVIAL
- **Trivia Question Sets:** ~15KB each, ~150KB for 10 sets — FEASIBLE
- **Confidence:** High
- **Implication:** All game data fits easily in localStorage (<500KB total worst case vs 5-10MB limit).

### Finding 7: External API Integration (Trivia)
- **Evidence:** `apps/trivia/src/app/api/trivia-api/questions/route.ts` (225 lines) — proxies to the-trivia-api.com with in-process LRU cache
- **Confidence:** High
- **Implication:** Can remain server-side or be replaced with client-side fetch. No auth dependency.

## Surprises
1. game_sessions table supports unauthenticated audience via RLS (user_id IS NULL pattern)
2. Trivia question validation happens in 3 places (route handler, import route, database layer)
3. Feature flag gates entire trivia_question_sets table
4. No API versioning exists — route changes are all-or-nothing

## Unknowns & Gaps
1. game_sessions.game_state JSONB schema not documented in migrations
2. PIN hash/salt columns in game_sessions — unclear if server-enforced
3. No conflict resolution for offline changes
4. Migration path for existing deployed user data
5. External API (the-trivia-api.com) rate limits unknown

## Raw Evidence
- Bingo API: 11 files, ~500 lines in `apps/bingo/src/app/api/`
- Trivia API: 23 files, ~2000 lines in `apps/trivia/src/app/api/`
- Database layer: ~1400 lines in `packages/database/src/`
- Migrations: 24 files, ~800 lines in `supabase/migrations/`
- Types: 384 lines in `packages/database/src/types.ts`
