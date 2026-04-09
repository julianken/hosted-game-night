# Phase 0: Analysis Brief — Standalone Games Conversion

## Analysis Question

What would it take to convert this monorepo from a "Platform Hub + two game apps with OAuth" architecture to "two standalone game apps (Bingo and Trivia) with no OAuth, no Platform Hub, using localStorage for game state"?

### Restated as specific sub-questions:

1. **What gets removed?** — Which apps, packages, API routes, database tables, middleware, and infrastructure can be deleted entirely?
2. **What gets simplified?** — Which existing code paths become simpler without auth/OAuth (middleware, API routes, session management)?
3. **What breaks?** — Which features currently depend on Supabase/auth/Platform Hub and would stop working?
4. **What needs replacing?** — What functionality must be reimplemented (e.g., templates currently stored in Supabase need a localStorage alternative)?
5. **What does the end state look like?** — Two standalone Next.js apps with no server-side auth, localStorage for persistence, no shared hub.

## Assumptions & Unknowns

### Known Knowns
- Platform Hub provides: OAuth 2.1 server, login/signup, dashboard, settings, template management
- Game apps use OAuth PKCE flow to authenticate against Platform Hub
- Game apps have BFF pattern — API routes talk to Supabase for templates, sessions, presets, question-sets
- Game state (active gameplay) is already managed client-side in Zustand stores
- Dual-screen sync uses BroadcastChannel (no server involvement)
- Game engines are pure functions operating on client-side state

### Known Unknowns
- How deeply do templates, presets, and sessions depend on Supabase persistence?
- Can templates/presets work as localStorage-only data?
- What database tables exist and which are auth-coupled vs game-data?
- How many API routes exist per game app and which ones are auth-gated?
- What does the middleware chain do beyond auth verification?
- Are there features (like template sharing between devices) that fundamentally require a server?

### Suspected Unknowns
- Hidden coupling between packages (e.g., does `@joolie-boolie/database` get used for non-auth purposes?)
- Service worker / PWA implications of removing auth
- E2E test infrastructure dependencies on the auth system
- Vercel deployment configuration tied to the three-app model

## Domain Tags

1. **Architecture** — System design, module boundaries, coupling analysis
2. **Auth/Security** — OAuth removal, token handling, middleware chain
3. **API/Backend** — BFF routes, Supabase integration, data persistence
4. **State Management** — Zustand stores, localStorage, data migration
5. **DevOps/Infra** — Monorepo structure, deployment, testing infrastructure

## Quality Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Evidence strength | 25% | Are findings backed by actual code references and file counts? |
| Completeness | 25% | Does it cover all apps, packages, routes, and infrastructure? |
| Accuracy | 20% | Are claims about dependencies and coupling technically correct? |
| Actionability | 15% | Could someone start executing based on this analysis? |
| Nuance | 10% | Does it flag trade-offs and things that might be harder than they look? |
| Clarity | 5% | Is it organized so the reader can find what they need? |

## 5 Investigation Areas

### Area 1: Auth & OAuth Removal Scope
**Domain:** Auth/Security
**Focus:** Map every piece of auth infrastructure: Platform Hub OAuth server, game app OAuth clients, middleware chains, token verification, cookie handling, PKCE flows, session management. Quantify what gets deleted.

### Area 2: Platform Hub Dependency & Deletion Analysis
**Domain:** Architecture
**Focus:** What does Platform Hub provide beyond auth? Template aggregation, dashboard, settings, profiles. What do the game apps import or call from Platform Hub? Can the entire app be deleted cleanly?

### Area 3: Database & API Route Inventory
**Domain:** API/Backend
**Focus:** Enumerate every API route in bingo and trivia. Which ones talk to Supabase? What tables do they use? Which are auth-gated? What data currently lives in the database that would need to move to localStorage?

### Area 4: Package Dependency Untangling
**Domain:** Architecture
**Focus:** For each of the 10 shared packages, determine: does it survive, get deleted, or need modification? Focus on `auth`, `database`, `sync`, `game-stats`, `types`. Map cross-package dependencies.

### Area 5: Client-Side State & localStorage Migration
**Domain:** State Management
**Focus:** What data currently flows through Zustand stores vs API/database? What would a localStorage-only persistence model look like for templates, presets, sessions, game history? What features would be lost or degraded?
