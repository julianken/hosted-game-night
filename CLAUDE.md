# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Instructions

**Workflow:** Use `Skill(subagent-workflow)` for ALL multi-step work. Skip only for single-line fixes, pure research, or reading files. Full details: `.claude/skills/subagent-workflow/SKILL.md`

**Issue Tracking:** This project uses **Linear** (BEA-### format), NOT GitHub Issues. Use `mcp__linear-server__*` tools for all issue operations. Never use GitHub issue tools.

**E2E Testing:** All code must pass E2E tests locally before committing (GitHub Actions are disabled). Run `pnpm test:e2e` and check `pnpm test:e2e:summary`. See [docs/E2E_TESTING_GUIDE.md](docs/E2E_TESTING_GUIDE.md).

**Development Model:** This project is developed exclusively with AI agents. Never include time estimates, effort estimates, team size assumptions, or timeline projections. Focus on dependencies, complexity, scope, and completion status.

**PRs:** All pull requests MUST use the template at `.github/PULL_REQUEST_TEMPLATE.md` (includes Five-Level Explanation).

**Pre-Commit Hooks:** Husky + lint-staged run `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` on changed packages. Bypass with `--no-verify` when needed.

---

## Project Context

**Joolie Boolie** - A unified gaming platform for groups and communities, featuring Bingo, Trivia, and future games. Built as a Turborepo monorepo with shared packages.

**Design:** Accessible (min 18px body, high contrast, 44x44px touch targets). Audience display optimized for projector/large TV.

### Current State

| App/Package | Status | Notes |
|-------------|--------|-------|
| `apps/bingo` | **Production Ready (85%)** | 75-ball bingo, 29 patterns, audio, themes, dual-screen, PWA, OAuth |
| `apps/trivia` | **Production Ready (95%)** | Trivia, rounds, scoring, TTS, themes, dual-screen, PWA, OAuth, CSV import |
| `apps/platform-hub` | **Backend Complete (55-60%)** | OAuth 2.1 server, CORS, rate limiting, security. Missing: BEA-319 to BEA-329 |
| `packages/sync` | **Complete (100%)** | BroadcastChannel sync, Zustand store, React hook |
| `packages/ui` | **Partial (88%)** | 15 components. Missing: Card |
| `packages/theme` | **Complete (100%)** | Design tokens (3 modes (light/dark/system), typography, spacing, touch targets) |
| `packages/game-engine` | **Partial (40%)** | Base GameStatus type, transition functions, statistics |
| `packages/auth` | **Complete (95%)** | AuthProvider, hooks, ProtectedRoute. Integrated in platform-hub, bingo, trivia (middleware-based) |
| `packages/database` | **Complete (98%)** | Type-safe client, CRUD, pagination, hooks, PIN security, API factories |
| `packages/testing` | **Complete (100%)** | BroadcastChannel and Audio mocks |
| `packages/types` | **Complete** | Shared TypeScript types |
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
pnpm clean                # Clean all build artifacts
pnpm test:e2e             # Build + run E2E tests
pnpm test:e2e:summary     # Show E2E pass/fail counts
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
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SESSION_TOKEN_SECRET=your-64-character-hex-string  # openssl rand -hex 32
# Optional (platform-hub only): REDIS_URL, REDIS_TOKEN (Upstash, for production rate limiting)
# Optional (platform-hub only): CRON_SECRET (for Vercel Cron job authentication)
```

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
- `apps/bingo/CLAUDE.md` - 75-ball bingo, 29 patterns, game mechanics, keyboard shortcuts
- `apps/trivia/CLAUDE.md` - Team trivia, rounds, scoring, keyboard shortcuts
- `apps/platform-hub/CLAUDE.md` - Auth, game selector, dashboard
