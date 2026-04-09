# Context Packet: Phase 0

## Analysis Question
What would it take to convert this monorepo from "Platform Hub + two game apps with OAuth" to "two standalone game apps (Bingo/Trivia) with no OAuth, no Platform Hub, localStorage for game state"?

## Scope
- All 3 apps: `apps/bingo`, `apps/trivia`, `apps/platform-hub`
- All 10 packages: `auth`, `database`, `sync`, `ui`, `theme`, `game-stats`, `types`, `audio`, `error-tracking`, `testing`
- Supabase database tables and migrations
- Vercel deployment configuration
- E2E and unit test infrastructure

## Key Context
- Game engines are pure functions (client-side Zustand). Gameplay itself doesn't need a server.
- Dual-screen sync uses BroadcastChannel (no server). 
- BFF pattern: game apps have API routes that proxy to Supabase for templates, sessions, presets, question-sets.
- OAuth 2.1 PKCE flow authenticates game apps against Platform Hub.
- Middleware chain in game apps: E2E check → HS256 verify → session token verify → JWKS ES256 verify.
- `@joolie-boolie/database` has 268 exports and is used for CRUD operations.
- `@joolie-boolie/auth` provides AuthProvider, hooks, ProtectedRoute, middleware, token verification.

## Quality Criteria (weighted)
- Evidence strength (25%): cite file paths, line counts, route counts
- Completeness (25%): cover all apps, packages, routes, infra
- Accuracy (20%): technically correct dependency claims
- Actionability (15%): findings someone could act on
- Nuance (10%): flag hidden complexity and trade-offs
- Clarity (5%): well-organized findings

## Non-Goals
- We are NOT creating an implementation plan
- We are NOT recommending whether to do this — just analyzing what it would take
- We are NOT considering partial migrations (e.g., keep auth but drop hub)
