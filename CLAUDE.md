# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Instructions

**Workflow:** Use `Skill(subagent-workflow)` for ALL multi-step work. Skip only for single-line fixes, pure research, or reading files. Full details: `.claude/skills/subagent-workflow/SKILL.md`

**Issue Tracking:** This project uses **Linear** (BEA-### format), NOT GitHub Issues. Use `mcp__linear-server__*` tools for all issue operations. Never use GitHub issue tools.

**E2E Testing:** All code must pass E2E tests locally before committing (GitHub Actions are disabled). Run `pnpm test:e2e` and check `pnpm test:e2e:summary`. See [docs/E2E_TESTING_GUIDE.md](docs/E2E_TESTING_GUIDE.md).

**Manual Testing:** Use Playwright MCP browser tools for visual, audio, and interactive verification. The canonical guide is [docs/MANUAL_TEST_PLAN.md](docs/MANUAL_TEST_PLAN.md). Always launch Playwright MCP in dark mode (`page.emulateMedia({ colorScheme: 'dark' })`). Start servers with `pnpm dev`. **NEVER use `pnpm dev:e2e` or `E2E_TESTING=true` for manual/Playwright MCP testing.**

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
| `apps/bingo` | **Production Ready** | 75-ball bingo, 29 patterns, audio, themes, dual-screen, PWA |
| `apps/trivia` | **Production Ready** | Trivia, rounds, scoring, TTS, buzz-in, themes, dual-screen, PWA |
| `packages/sync` | **Complete** | BroadcastChannel sync, Zustand store, React hook |
| `packages/ui` | **Complete** | Shared UI components (Button, Modal, Input, Toast, Toggle, Skeleton, etc.) |
| `packages/theme` | **Complete** | Design tokens (3 modes, typography, spacing, touch targets) |
| `packages/game-stats` | **Shared Types** | Base GameStatus type, statistics module (types, calculators, localStorage storage). `transition()` / `canTransition()` are deprecated -- each app has its own state machine. |
| `packages/testing` | **Complete** | BroadcastChannel, Audio, Sentry, and OTel mocks |
| `packages/types` | **Complete** | Shared TypeScript types |
| `packages/audio` | **Complete** | Shared audio utilities (voice packs, sound effects) |
| `packages/error-tracking` | **Complete** | Error logging and tracking |

### Tech Stack

Turborepo + pnpm 9.15 | Next.js 16 (App Router) | React 19 + Tailwind CSS 4 | Zustand 5 | Vitest 4 + Testing Library

---

## Reference

### Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Run all apps (dev:bingo, dev:trivia for individual)
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

### Environment Variables

Create `.env.local` in each app:
```
# Trivia only — required for trivia-api proxy
THE_TRIVIA_API_KEY=your-api-key

# Optional: Observability (both apps)
SENTRY_DSN=your-sentry-dsn
OTEL_EXPORTER_OTLP_ENDPOINT=your-otel-endpoint
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic ...

# Feature flags (trivia)
NEXT_PUBLIC_FEATURE_QUESTION_SETS=false  # Set to 'false' to disable question sets (default: enabled)
```

No auth-related env vars are needed. Both apps run as standalone with localStorage-only persistence.

### API Routes

API routes are minimal -- only CSP reports, monitoring tunnels, and the trivia-api proxy remain. No CRUD or auth API surface. All data persistence is via localStorage.

### AI Assistant Configuration

**Context7 MCP:** Automatically use Context7 for up-to-date documentation. Key libraries and versions:

- **Next.js** (v16.1.3) - App Router, Server Components, API routes, middleware
- **React** (v19.2.3) / **React DOM** (v19.2.3) - Hooks, Server Components
- **Tailwind CSS** (v4) - Utilities, configuration, plugins
- **TypeScript** (v5.7.0) - Type system, compiler options
- **Zustand** (v5.0.10) - Store creation, persistence, middleware
- **Vitest** (v4.0.17) / **Testing Library React** (v16.3.1) / **Playwright** (v1.57.0)
- **Serwist** (v9.5.0) / **@serwist/turbopack** (v9.5.4) - PWA, service workers (Turbopack-native)
- **React Aria Components** (v1.14.0) - Accessible UI primitives
- **Turborepo** (v2.3.0) / **pnpm** (v9.15.0) / **ESLint** (v9)

---

## Docs & App-Specific Context

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Monorepo structure, dual-screen system, game engine
- [docs/APP_STRUCTURE.md](docs/APP_STRUCTURE.md) - Canonical `lib/` layout
- [docs/E2E_TESTING_GUIDE.md](docs/E2E_TESTING_GUIDE.md) - E2E commands, checklist, port isolation, troubleshooting
- [docs/MANUAL_TEST_PLAN.md](docs/MANUAL_TEST_PLAN.md) - Playwright MCP manual test cases (visual/audio)
- `apps/bingo/CLAUDE.md` - 75-ball bingo, 29 patterns, game mechanics, keyboard shortcuts
- `apps/trivia/CLAUDE.md` - Team trivia, rounds, scoring, keyboard shortcuts
