# Investigation: Platform Hub Dependency & Deletion Analysis

## Summary

Platform Hub functions as a multi-purpose application providing OAuth 2.1 authentication, user account management, template aggregation, and game routing. The architecture has **hard coupling** via OAuth cookies (`jb_access_token`, `jb_refresh_token`) that the game apps depend on for authentication and authorization. Platform Hub owns 7 database tables for OAuth and user management; 3 tables are game-agnostic (profiles, oauth_clients, oauth_authorizations) while 4 are OAuth infrastructure (refresh_tokens, oauth_audit_log). Template aggregation happens only in Platform Hub, but individual games already have independent template storage (bingo_templates, trivia_templates). **Deletion is NOT possible without extensive refactoring**: games would lose authentication entirely and require a replacement authentication mechanism. However, most Platform Hub **features CAN be deleted** (dashboard, settings, template aggregation, profile management) if authentication is re-implemented in each game.

## Key Findings

### Finding 1: OAuth 2.1 Authentication Server — Hard Dependency
- **Evidence:** 
  - Games require `NEXT_PUBLIC_PLATFORM_HUB_URL` env var (used in token exchange at `/api/auth/token` and `/api/auth/token-redirect`)
  - Games call `${PLATFORM_HUB_URL}/api/oauth/token` to exchange authorization codes
  - `@joolie-boolie/auth` package's `api-auth.ts` (line 87) reads `jb_access_token` cookie set by Platform Hub
  - Bingo: `/apps/bingo/src/app/api/auth/token/route.ts` and Trivia: `/apps/trivia/src/app/api/auth/token/route.ts` both hardcode `platformHubUrl` config
  - 32+ references to `jb_access_token` and `jb_refresh_token` in game auth code
  - Database migrations: `20260123000001_create_oauth_tables.sql` creates `oauth_clients` (Bingo & Trivia registered) and `oauth_authorizations`
  - Platform Hub runs scheduled cleanup cron (Vercel cron every 6 hours) for expired authorizations
- **Confidence:** HIGH
- **Implication:** Games cannot function without OAuth endpoint. Deleting Platform Hub breaks ALL authentication. Even removing just the game features (dashboard, settings) still requires keeping the OAuth server running.

### Finding 2: Cookie-Based SSO & JWT Verification Chain
- **Evidence:**
  - `/packages/auth/src/api-auth.ts` (lines 84-123) implements `getApiUser()` which reads `jb_access_token` and verifies via 4-step chain: E2E secret → SUPABASE_JWT_SECRET → SESSION_TOKEN_SECRET → JWKS
  - Games use this to authenticate API routes (templates, game state)
  - Platform Hub sets SSO cookies with prefix `jb_*` (not Supabase native `sb_*`)
  - Cross-origin requests from games to Platform Hub templates API authenticated via cookie forwarding (see `/apps/platform-hub/src/app/dashboard/page.tsx` line 36-42 which fetches `/api/templates?recent=true`)
  - Both game apps require `NEXT_PUBLIC_OAUTH_CLIENT_ID` and `NEXT_PUBLIC_OAUTH_REDIRECT_URI` (OAuth client IDs: Bingo `0d87a03a-d90a-4ccc-a46b-85fdd8d53c21`, Trivia `0cd92ba6-459b-4c07-ab9d-b9bf9dbb1936`)
- **Confidence:** HIGH
- **Implication:** SSO cookie/JWT architecture is tightly integrated. Removing Platform Hub requires implementing equivalent JWT signing and verification in games or replacing with alternative auth (Supabase Auth, third-party OAuth).

### Finding 3: Template Aggregation API — Optional Feature
- **Evidence:**
  - Platform Hub `/api/templates` (route: `/apps/platform-hub/src/app/api/templates/route.ts`) queries BOTH `bingo_templates` and `trivia_templates` tables directly
  - Returns discriminated union of BingoTemplate | TriviaTemplate (lines 18-48)
  - Supports query params: `recent=true` (returns 3 most recent per game) and `limit=N`
  - Dashboard fetches this endpoint (line 36-42 of `/apps/platform-hub/src/app/dashboard/page.tsx`)
  - **Games do NOT call this endpoint.** Each game has its own `/api/templates` routes:
    - Bingo: `/apps/bingo/src/app/api/templates/route.ts` queries only `bingo_templates`
    - Trivia: `/apps/trivia/src/app/api/templates/route.ts` queries only `trivia_templates`
  - Template aggregation is ONLY used by Platform Hub dashboard's RecentTemplates component
  - There is NO feature requiring both games' templates in one place (no cross-game template sharing, no unified catalog)
- **Confidence:** HIGH
- **Implication:** Template aggregation is a Platform Hub UI feature. Can be deleted without impacting games. Games already have independent template management. **Deletion candidate.**

### Finding 4: Profiles & User Settings — Platform Hub Specific
- **Evidence:**
  - `profiles` table (migration `20260119000001_create_profiles.sql`) extends `auth.users` with `facility_name`, `default_game_title`, `logo_url`
  - Platform Hub Settings page (`/apps/platform-hub/src/app/settings/page.tsx`) allows users to update facility_name, email, theme, password
  - `POST /api/profile/update` (route: `/apps/platform-hub/src/app/api/profile/update/route.ts`) updates profiles table
  - Games **do not reference or use** profiles table or settings endpoints
  - `@joolie-boolie/auth` package provides `useAuth()` hook returning basic user (id, email) but not facility data
  - No shared profile UI or settings functionality between apps
  - Platform Hub dashboard displays facility_name as welcome header greeting (line 195 of `/apps/platform-hub/src/app/dashboard/page.tsx` via `WelcomeHeader` component)
- **Confidence:** HIGH
- **Implication:** Profiles table and settings UI are Platform Hub-only. Deleting them does NOT affect games. Games could store preferences locally (localStorage) as per the conversion goal. **Deletion candidate.**

### Finding 5: Database Tables Breakdown
- **Evidence:** Migrations analysis:
  - **OAuth Infrastructure (Platform Hub core, 4 tables):**
    - `oauth_clients`: Stores Bingo & Trivia client registrations with redirect URIs & consent_page_url
    - `oauth_authorizations`: Pending/approved authorization requests with PKCE code challenges
    - `refresh_tokens`: Token rotation family tracking with reuse detection (migration `20260205014105_create_refresh_tokens.sql`)
    - `oauth_audit_log`: OAuth event audit trail (migration `20260121172853_create_oauth_audit_log.sql`)
  - **User Management (Platform Hub specific, 1 table):**
    - `profiles`: Facility & branding info, settings (can be deleted)
  - **Game Templates (Shared DB, 2 tables):**
    - `bingo_templates`: Game-specific, games own this
    - `trivia_templates`: Game-specific, games own this
  - **RBAC (Unused infrastructure, created by `20260122001758_create_rbac_tables.sql`):**
    - Multiple role/permission tables for admin features (not exposed in UI, can be deleted)
- **Confidence:** HIGH
- **Implication:** OAuth tables are REQUIRED for auth system. Template tables are owned by games. Profiles table is optional. RBAC tables are unused scaffolding.

### Finding 6: Pages & Features in Platform Hub
- **Evidence:** Routes in `/apps/platform-hub/src/app/`:
  - **Auth-related (REQUIRED for OAuth flow):**
    - `/login` - OAuth redirect after login, sets SSO cookies
    - `/signup` - User registration
    - `/forgot-password` & `/reset-password` - Password recovery
    - `/oauth/consent` - OAuth authorization consent screen (users approve game access)
  - **Dashboard & Management (OPTIONAL, can be deleted):**
    - `/` (home) - Game selector cards linking to game URLs (NEXT_PUBLIC_BINGO_URL, NEXT_PUBLIC_TRIVIA_URL)
    - `/dashboard` - User dashboard with game cards, recent templates, recent sessions placeholder, preferences
    - `/dashboard/templates` - Template listing with delete UI (calls game APIs, not Platform Hub templates API)
    - `/dashboard/templates/[id]` - Template editor (proxies to game API)
    - `/settings` - Account settings (facility_name, email, theme, password change)
  - **API Routes:**
    - `/api/auth/*` - Login, logout, password reset, session sync (REQUIRED)
    - `/api/oauth/*` - OAuth authorization flow (REQUIRED)
    - `/api/profile` & `/api/profile/update` - Profile management (OPTIONAL)
    - `/api/templates` - Template aggregation (OPTIONAL)
    - `/api/templates/[id]` - Template proxy delete (OPTIONAL)
    - `/api/cron/cleanup-authorizations` - Scheduled OAuth cleanup (REQUIRED for OAuth)
- **Confidence:** HIGH
- **Implication:** Dashboard, settings, and template aggregation pages are non-critical features. Auth pages and OAuth API are **mandatory**. However, auth pages could be moved to games or replaced with third-party auth.

### Finding 7: Deployment Coupling
- **Evidence:**
  - `turbo.json` lists `NEXT_PUBLIC_PLATFORM_HUB_URL` in globalEnv (line 12), broadcast to all apps during build
  - Each game app's `.env.example` requires `NEXT_PUBLIC_PLATFORM_HUB_URL=http://localhost:3002`
  - Platform Hub `vercel.json` (line 6) uses `turbo build --filter=@joolie-boolie/platform-hub...` to build all dependencies
  - Games' vercel.json (inferred from monorepo structure) build independently but require Platform Hub URL at runtime
  - Vercel cron configured in Platform Hub to cleanup authorizations every 6 hours (line 14-16 of `vercel.json`)
  - Redirects in Platform Hub `/bingo` → `https://bingo.joolie-boolie.com` and `/trivia` → `https://trivia.joolie-boolie.com`
- **Confidence:** MEDIUM
- **Implication:** Build time: Platform Hub is shared dependency in Turbo. Runtime: apps only need Platform Hub URL as env var. Deployment can be decoupled (separate Vercel projects) but requires environment variable coordination. **Decoupling is possible but requires coordination.**

### Finding 8: Shared Package Dependencies — OAuth Library Tight Coupling
- **Evidence:**
  - `@joolie-boolie/auth` package used by all 3 apps:
    - Platform Hub imports: `AuthProvider`, `useAuth`, `useSession`, middleware components
    - Games import: `getApiUser` (API auth), middleware, OAuth callback handler
    - Package exports OAuth client utilities (pkce.ts, oauth-client.ts) used by games
  - `@joolie-boolie/database` used by Platform Hub to query game tables directly (migration `20260119000001`, migrations for both template tables)
  - `@joolie-boolie/ui`, `@joolie-boolie/theme` are styling/UI utilities (easily replaceable)
  - `@joolie-boolie/error-tracking` is logging (replaceable)
- **Confidence:** MEDIUM
- **Implication:** `@joolie-boolie/auth` is tightly coupled to Platform Hub's OAuth server. Replacing OAuth requires either: (1) updating the auth package to use alternative provider, or (2) removing Platform Hub entirely and implementing auth in each game.

### Finding 9: Cross-App Features Requiring All 3 Apps
- **Evidence:**
  - **No hard cross-app dependencies found.** Games function independently:
    - Bingo doesn't call Trivia endpoints
    - Trivia doesn't call Bingo endpoints
    - Platform Hub aggregates templates for dashboard (cosmetic feature, no game logic dependency)
  - No unified game state
  - No shared play sessions
  - Template sharing between games: Does NOT exist. Each user has separate template collections.
  - SSO: Works via OAuth, which centralizes on Platform Hub but is not multi-game-aware (each app is registered separately)
- **Confidence:** HIGH
- **Implication:** Games are already decoupled functionally. Coupling is architectural (through Platform Hub as OAuth server and package dependencies). **Games could run independently with minimal changes.**

### Finding 10: Environment Variable Propagation & Configuration
- **Evidence:**
  - Turbo `globalEnv` (turbo.json line 9-14) includes:
    - `NEXT_PUBLIC_PLATFORM_HUB_URL` - broadcast to all apps
    - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - shared DB
    - `NEXT_PUBLIC_BINGO_URL`, `NEXT_PUBLIC_TRIVIA_URL` - game URLs (used by Platform Hub redirects)
    - `NEXT_PUBLIC_OAUTH_CLIENT_ID` - each app has its own client ID (different for Bingo vs Trivia)
  - Platform Hub uses relative URL fetches to games (no env var for Bingo/Trivia APIs in Platform Hub)
  - Games hard-code `/api/templates` as relative paths (no Platform Hub API calls except auth token endpoint)
- **Confidence:** HIGH
- **Implication:** Monorepo makes env var management easy. If games are split into separate repos, each would need its own build-time config. Platform Hub URL could be optional (only for OAuth).

## Surprises

1. **Template aggregation is purely cosmetic:** Platform Hub queries both game tables to populate a dashboard widget, but games don't use this endpoint. Each game independently manages its own templates. This suggests Platform Hub was over-engineered for a feature users don't need.

2. **No shared RLS policies:** Each game's template table has independent RLS policies. Platform Hub bypasses them with service role (line 187 of `/api/templates/route.ts`). This confirms games don't use Platform Hub for data isolation—they implement their own.

3. **RBAC tables exist but unused:** Migrations create comprehensive role/permission infrastructure (20260122001758_create_rbac_tables.sql ~15KB) with admin features, but no UI or routes consume them. This suggests planned admin dashboard was never built.

4. **Profiles table is sparse:** Facility_name, default_game_title, logo_url are defined in schema but none are actively used in game apps. The settings UI updates them, but no downstream consumers reference these fields.

5. **OAuth clients are hardcoded:** OAuth client IDs and redirect URIs are seeded directly into database during migration (oauth_tables.sql lines 78-90). This makes the OAuth client registration immutable and tied to this monorepo structure.

## Unknowns & Gaps

1. **How does token refresh work in the game apps?** The auth library includes `token-refresh.ts` but it's not clear if games actively refresh tokens or rely on middleware. Need to examine game middleware to understand refresh flow.

2. **Does Platform Hub have analytics or logging beyond OAuth audit?** The OAuth audit log captures OAuth events, but there's no evidence of game play analytics or user behavior tracking. Games might be sending analytics elsewhere.

3. **Are there any admin features in Platform Hub UI that aren't documented?** The RBAC tables suggest admin functionality exists in schema but was never surfaced in UI. Unknown if planned.

4. **What happens if a user creates an account in Platform Hub but never launches a game?** The profiles table would have an entry, but games wouldn't know about it. This suggests profiles are optional/unused.

5. **Is localStorage sufficient for game state persistence?** The conversion goal mentions localStorage for game state, but unclear if both games currently use any server-side game session storage (game_sessions table exists in migrations).

## Raw Evidence

### API Route Inventory
**Platform Hub API Routes** (`/apps/platform-hub/src/app/api/`):
- Auth: `/auth/login`, `/auth/logout`, `/auth/reset-password`, `/auth/sync-session`
- OAuth: `/oauth/authorize`, `/oauth/token`, `/oauth/csrf`, `/oauth/approve`, `/oauth/deny`, `/oauth/authorization-details`
- Profile: `/profile`, `/profile/update`, `/profile/reset-e2e`
- Templates: `/templates` (aggregate GET), `/templates/[id]` (proxy DELETE)
- Monitoring: `/csp-report`, `/health`, `/monitoring-tunnel`
- Cron: `/api/cron/cleanup-authorizations`

**Game API Routes (Example: Bingo)** (`/apps/bingo/src/app/api/`):
- Auth: `/auth/token`, `/auth/token-redirect`, `/auth/logout`
- Templates: `/templates` (GET, POST), `/templates/[id]` (GET, PATCH, DELETE)
- Health/Monitoring: `/csp-report`, `/health`, `/monitoring-tunnel`

### Database Table Ownership
```
Shared Supabase Project:
├── auth.users (Supabase managed)
├── profiles (Platform Hub managed, user settings)
├── oauth_clients (Platform Hub managed, OAuth server)
├── oauth_authorizations (Platform Hub managed, OAuth flow state)
├── refresh_tokens (Platform Hub managed, token rotation)
├── oauth_audit_log (Platform Hub managed, audit trail)
├── bingo_templates (Bingo game owns, RLS enforced)
├── trivia_templates (Trivia game owns, RLS enforced)
├── bingo_presets (Bingo game owns)
├── trivia_presets (Trivia game owns)
├── trivia_question_sets (Trivia game owns)
├── game_sessions (Shared, both games write)
└── rbac_* (Platform Hub, unused)
```

### Key File Sizes & Line Counts
- OAuth server implementation: ~2000 LOC across token, authorize, approve, deny routes
- Template aggregation endpoint: ~257 lines (route.ts)
- Dashboard pages: ~300-400 LOC each (dashboard/page.tsx, settings/page.tsx)
- Auth middleware in shared package: ~300 LOC (api-auth.ts, game-middleware.ts, middleware.ts)
- Database migrations for OAuth: 7 migrations, ~40KB total SQL

### Environment Dependencies
```
Platform Hub:
- NEXT_PUBLIC_PLATFORM_HUB_URL: http://localhost:3002 (self-reference)
- NEXT_PUBLIC_BINGO_URL: http://localhost:3000 (for game links)
- NEXT_PUBLIC_TRIVIA_URL: http://localhost:3001 (for game links)
- NEXT_PUBLIC_SUPABASE_URL: Shared
- NEXT_PUBLIC_OAUTH_CLIENT_ID: (unused, client IDs in DB)

Games:
- NEXT_PUBLIC_PLATFORM_HUB_URL: http://localhost:3002 (for OAuth token endpoint)
- NEXT_PUBLIC_OAUTH_CLIENT_ID: Game-specific (Bingo: 0d87a03a-..., Trivia: 0cd92ba6-...)
- NEXT_PUBLIC_OAUTH_REDIRECT_URI: Game-specific callback URL
- NEXT_PUBLIC_SUPABASE_URL: Shared
```

