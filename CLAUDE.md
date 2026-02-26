# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Instructions

**Workflow:** Use `Skill(subagent-workflow)` for ALL multi-step work. Skip only for single-line fixes, pure research, or reading files. Full details: `.claude/skills/subagent-workflow/SKILL.md`

**Issue Tracking:** This project uses **Linear** (BEA-### format), NOT GitHub Issues. Use `mcp__linear-server__*` tools for all issue operations. Never use GitHub issue tools.

**E2E Testing:** All code must pass E2E tests locally before committing (GitHub Actions are disabled). Run `pnpm test:e2e` and check `pnpm test:e2e:summary`. See [docs/E2E_TESTING_GUIDE.md](docs/E2E_TESTING_GUIDE.md).

**Manual Testing:** Use Playwright MCP browser tools for visual, audio, cross-app, and interactive verification. The canonical guide is [docs/MANUAL_TEST_PLAN.md](docs/MANUAL_TEST_PLAN.md) — it has 189 test cases organized by app and feature. Always launch Playwright MCP in dark mode (`page.emulateMedia({ colorScheme: 'dark' })`). Start servers with `pnpm dev:e2e` for E2E auth mode.

**Development Model:** This project is developed exclusively with AI agents. Never include time estimates, effort estimates, team size assumptions, or timeline projections. Focus on dependencies, complexity, scope, and completion status.

**PRs:** All pull requests MUST use the template at `.github/PULL_REQUEST_TEMPLATE.md` (includes Five-Level Explanation).

**Pre-Commit Hooks:** Husky + lint-staged run `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` on changed packages. **NEVER use `--no-verify`** — if hooks fail, fix the underlying issue before committing.

---

## Project Context

**Joolie Boolie** - A unified gaming platform for groups and communities, featuring Bingo, Trivia, and future games. Built as a Turborepo monorepo with shared packages.

**Design:** Accessible (min 18px body, high contrast, 44x44px touch targets). Audience display optimized for projector/large TV.

### Current State

| App/Package | Status | Notes |
|-------------|--------|-------|
| `apps/bingo` | **Production Ready** | 75-ball bingo, 29 patterns, audio, themes, dual-screen, PWA, OAuth |
| `apps/trivia` | **Production Ready** | Trivia, rounds, scoring, TTS, buzz-in, themes, dual-screen, PWA, OAuth |
| `apps/platform-hub` | **Production Ready** | OAuth 2.1 server, auth, dashboard, settings, templates, middleware stack |
| `packages/sync` | **Complete** | BroadcastChannel sync, Zustand store, React hook |
| `packages/ui` | **Complete** | Shared UI components (Button, Modal, Input, Toast, Toggle, Skeleton, etc.) |
| `packages/theme` | **Complete** | Design tokens (3 modes, typography, spacing, touch targets) |
| `packages/game-engine` | **Shared Types** | Base GameStatus type, statistics module (types, calculators, localStorage storage). `transition()` / `canTransition()` are deprecated -- each app has its own state machine. |
| `packages/auth` | **Complete** | AuthProvider, hooks, ProtectedRoute. Integrated in platform-hub, bingo, trivia |
| `packages/database` | **Complete** | Type-safe client, CRUD, pagination, hooks, PIN security, API factories |
| `packages/testing` | **Complete** | BroadcastChannel, Audio, Supabase, Sentry, and OTel mocks |
| `packages/types` | **Complete** | Shared TypeScript types |
| `packages/audio` | **Complete** | Shared audio utilities (voice packs, sound effects) |
| `packages/error-tracking` | **Complete** | Error logging and tracking |

### Tech Stack

Turborepo + pnpm 9.15 | Next.js 16 (App Router) | React 19 + Tailwind CSS 4 | Zustand 5 | Supabase (PostgreSQL) | Vitest 4 + Testing Library

---

## Reference

### Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Run all apps (dev:bingo, dev:trivia, dev:hub for individual)
pnpm build                # Build all apps and packages
pnpm test                 # Run all tests (test:run for single run, test:coverage for coverage)
pnpm lint                 # Lint all apps and packages
pnpm typecheck            # Type check all packages
pnpm clean                # Clean all build artifacts
pnpm test:e2e             # Build + run E2E tests
pnpm test:e2e:summary     # Show E2E pass/fail counts
pnpm test:e2e:dev         # E2E tests against dev servers (no build)
pnpm test:e2e:bingo       # E2E tests for bingo only
pnpm test:e2e:trivia      # E2E tests for trivia only
pnpm dev:e2e              # Dev mode with E2E_TESTING=true
```

### Production Test Account

Credentials for manual QA against the deployed Vercel apps are stored locally (gitignored):

```
.secrets/prod-test-account.json
```

Structure: `{ email, password, supabase_user_id, urls: { platform_hub, bingo, trivia }, notes }`

### Environment Variables

Create `.env.local` in each app:
```
# Required for all apps
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SESSION_TOKEN_SECRET=your-64-character-hex-string  # openssl rand -hex 32

# Required for all apps (JWT verification in middleware and OAuth token signing)
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Required for bingo/trivia (OAuth flow)
NEXT_PUBLIC_PLATFORM_HUB_URL=http://localhost:3002
NEXT_PUBLIC_OAUTH_CLIENT_ID=your-oauth-client-id

# Required for E2E testing
E2E_JWT_SECRET=your-e2e-jwt-secret

# Optional (production only)
COOKIE_DOMAIN=.joolie-boolie.com                   # Cross-app SSO cookies
# Optional (platform-hub only): REDIS_URL, REDIS_TOKEN (Upstash, for production rate limiting)
# Optional (platform-hub only): CRON_SECRET (for Vercel Cron job authentication)
```

### API Response Envelopes

Two intentional tiers exist. Do not mix them.

**Tier 1 — CRUD routes** (templates, sessions, presets, question-sets, profiles)

Success responses use resource-keyed objects:
```json
{ "template": { "id": "...", "name": "..." } }
{ "templates": [...] }
{ "session": { ... } }
```

Paginated success (via `@joolie-boolie/database` pagination helpers):
```json
{ "data": [...], "pagination": { "page": 1, "pageSize": 20, "total": 42, "hasMore": false } }
```

Error — same shape regardless of status code:
```json
{ "error": "Human-readable message" }
```

**Tier 2 — OAuth and Auth routes** (`/api/oauth/*`, `/api/auth/*`)

Follow RFC 6749 format. Do not wrap in resource-keyed objects. The divergence from Tier 1 is intentional.

```json
{ "access_token": "...", "token_type": "Bearer", "expires_in": 3600 }
{ "error": "invalid_grant", "error_description": "..." }
```

**Rule for new routes:** Use Tier 1 for any authenticated CRUD endpoint. Use Tier 2 only for OAuth or token endpoints. The `@joolie-boolie/database` API factories return Tier 1 shapes automatically.

### AI Assistant Configuration

**Context7 MCP:** Automatically use Context7 for up-to-date documentation. Key libraries and versions:

- **Next.js** (v16.1.3) - App Router, Server Components, API routes, middleware
- **React** (v19.2.3) / **React DOM** (v19.2.3) - Hooks, Server Components
- **Tailwind CSS** (v4) - Utilities, configuration, plugins
- **TypeScript** (v5.7.0) - Type system, compiler options
- **Supabase JS** (v2.90.1) / **SSR** (v0.8.0) / **PostgREST** (v1.19.4)
- **Zustand** (v5.0.10) - Store creation, persistence, middleware
- **Vitest** (v4.0.17) / **Testing Library React** (v16.3.1) / **Playwright** (v1.57.0)
- **Serwist** (v9.5.0) / **@serwist/turbopack** (v9.5.4) - PWA, service workers (Turbopack-native)
- **React Aria Components** (v1.14.0) - Accessible UI primitives
- **Turborepo** (v2.3.0) / **pnpm** (v9.15.0) / **ESLint** (v9)

---

## Docs & App-Specific Context

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Monorepo structure, BFF pattern, dual-screen system, game engine
- [docs/APP_STRUCTURE.md](docs/APP_STRUCTURE.md) - Canonical `lib/` layout
- [docs/MIDDLEWARE_PATTERNS.md](docs/MIDDLEWARE_PATTERNS.md) - Next.js middleware rules (lazy init, JWKS caching)
- [docs/E2E_TESTING_GUIDE.md](docs/E2E_TESTING_GUIDE.md) - E2E commands, checklist, port isolation, troubleshooting
- [docs/MANUAL_TEST_PLAN.md](docs/MANUAL_TEST_PLAN.md) - Playwright MCP manual test cases (189 cases, visual/audio/cross-app)
- `apps/bingo/CLAUDE.md` - 75-ball bingo, 29 patterns, game mechanics, keyboard shortcuts
- `apps/trivia/CLAUDE.md` - Team trivia, rounds, scoring, keyboard shortcuts
- `apps/platform-hub/CLAUDE.md` - Auth, game selector, dashboard
