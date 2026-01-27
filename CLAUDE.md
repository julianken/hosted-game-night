# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# 🚨 CRITICAL: Workflow 🚨

## ⚠️ YOU MUST USE `Skill(subagent-workflow)` FOR ALL MULTI-STEP WORK ⚠️

**THIS IS NOT OPTIONAL. THIS IS THE CORE WORKFLOW.**

### When to Use (ALWAYS for multi-step work)

✅ **ANY task with implementation plan**
✅ **ANY task with multiple steps**
✅ **ANY coding work beyond trivial single-line fixes**

### The Workflow Enforces

1. **Linear Integration** - Query Linear for issue context BEFORE starting work
2. **Parallel Task Execution** - Run independent tasks concurrently in separate worktrees
3. **Sequential Per-Task Reviews** - Each task goes through: Implementer → Spec Review → Quality Review
4. **Status Tracking** - Update Linear at every stage (Backlog → Todo → In Progress → In Review → Done)
5. **PR Mechanics** - Create PRs, get reviews, merge in dependency order

### Skip ONLY for

❌ Single-line typo fixes
❌ Pure research tasks (no code changes)
❌ Reading files to answer questions

**Everything else MUST use `Skill(subagent-workflow)`.**

### Quick Reference

```bash
# Invoke the skill
Skill(subagent-workflow)

# The skill will guide you through:
# Step 0: GET WORK FROM LINEAR (mandatory)
# Step 1: Plan parallel work
# Step 2: Create git worktrees (isolation)
# Step 3: Dispatch implementer agents
# Step 4: Dispatch spec reviewers
# Step 5: Dispatch quality reviewers
# Step 6: Merge and integrate
```

### Why This Matters

- **Quality:** Two-stage review (spec + quality) catches issues early
- **Traceability:** Linear integration provides full audit trail
- **Speed:** Parallel execution is faster than sequential
- **Isolation:** Worktrees prevent conflicts
- **Discipline:** Prevents rushed, incomplete work

**Full details:** `.claude/skills/subagent-workflow/SKILL.md` (693 lines)

---

# 🚨 CRITICAL: E2E Testing 🚨

## ⚠️ ALL CODE MUST PASS E2E TESTS LOCALLY BEFORE COMMITTING ⚠️

**GitHub Actions are DISABLED to avoid billing costs. Local E2E validation is MANDATORY.**

### Quick E2E Test Commands

```bash
# 1. Start dev servers (required for E2E tests)
pnpm dev

# 2. Run E2E tests for your changes
pnpm test:e2e e2e/<your-feature>.spec.ts

# 3. Run ALL E2E tests before creating PR
pnpm test:e2e

# 4. If tests fail: FIX CODE, DO NOT COMMIT
```

### E2E Test Checklist (MANDATORY)

Before marking ANY task complete or creating a PR:

- [ ] Dev servers running (bingo, trivia, platform-hub on ports 3000, 3001, 3002)
- [ ] `.env.local` files exist in ALL apps (bingo, trivia, platform-hub)
- [ ] SESSION_TOKEN_SECRET is valid 64-char hex (generate with `openssl rand -hex 32`)
- [ ] E2E tests pass: `pnpm test:e2e e2e/<feature>.spec.ts`
- [ ] NO test failures (0 failures required)
- [ ] Test screenshots reviewed (check `test-results/` directory)

**If E2E tests fail: DO NOT COMMIT. Fix the code first.**

### Port Isolation for Worktrees

**When running E2E tests in a git worktree (parallel development), you MUST use port isolation:**

```bash
# In your worktree directory
./scripts/setup-worktree-e2e.sh    # Creates .env.e2e with isolated ports
./start-e2e-servers.sh             # Starts servers on isolated ports
pnpm test:e2e                       # Playwright auto-detects ports
```

**Why:** Default ports 3000-3002 conflict with main repo dev servers.

**See:** `docs/E2E_TESTING_GUIDE.md` section "Parallel Task Execution with Port Isolation" for details.

### E2E Test Output Format

**CRITICAL:** Always check the JSON summary after running tests.

```bash
# Run tests (generates test-results/results.json)
$ pnpm test:e2e

# View clear summary with failure counts
$ pnpm test:e2e:summary

Test Results Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  155 failed      ← ALWAYS clearly visible
  45 skipped
  138 passed
  338 total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Why this matters:**
- Terminal output from `pnpm test:e2e` may not show failure counts (background runs, TTY detection issues)
- The JSON reporter (`test-results/results.json`) has complete, structured results
- The summary script (`pnpm test:e2e:summary`) parses JSON and shows counts clearly
- **NEVER claim "no failures" without running `pnpm test:e2e:summary`**
- Exit code 1 = failures exist (even if terminal output doesn't show count)

### Common E2E Issues

| Issue | Fix |
|-------|-----|
| "Missing environment variables" | Create `.env` in project root: `cp apps/bingo/.env.local .env` |
| Tests timeout at login page | Platform Hub crashed - restart: `pnpm dev:hub` |
| "SESSION_TOKEN_SECRET must contain only hexadecimal" | Generate valid secret: `openssl rand -hex 32` and update ALL `.env.local` files |
| Servers hung at 100%+ CPU | Kill and restart: `pkill -f next-server && pnpm dev` |

### Integration with Parallel Workflow

**Implementer agents**: Run E2E tests BEFORE marking task complete
**Spec reviewers**: Verify E2E tests pass as part of review
**Quality reviewers**: Run full E2E suite before approval

**Full E2E Testing Guide:** `docs/E2E_TESTING_GUIDE.md`

---

## Project Overview

**Beak Gaming Platform** - A unified gaming platform for retirement communities, featuring Bingo, Trivia, and future games. Built as a Turborepo monorepo with shared packages.

## ⚠️ CRITICAL: Development Model

**This project is developed EXCLUSIVELY with AI agents (Claude Code).**

**NEVER include:**
- ❌ Time estimates (weeks, days, hours, sprints)
- ❌ Effort estimates (man-hours, engineer-days)
- ❌ Team size assumptions (number of developers)
- ❌ Timeline projections ("Week 1-2", "Phase 1: 3 weeks")
- ❌ Resource planning ("1 frontend dev + 1 backend dev")

**Why:** All work is done by AI agents, not human developers on schedules. Time-based planning is meaningless in this context.

**Instead, focus on:**
- ✅ Dependencies (what blocks what)
- ✅ Complexity (simple, medium, complex)
- ✅ Scope (number of tasks)
- ✅ Critical path (order of execution)
- ✅ Completion status (done vs. remaining)

## 🚨 CRITICAL: Issue Tracking 🚨

**THIS PROJECT USES LINEAR FOR ISSUE TRACKING - NOT GITHUB ISSUES**

### ❌ NEVER Use GitHub Issues

- ❌ DO NOT search GitHub issues (`mcp__plugin_github_github__search_issues`)
- ❌ DO NOT create GitHub issues (`mcp__plugin_github_github__issue_write`)
- ❌ DO NOT list GitHub issues (`mcp__plugin_github_github__list_issues`)

### ✅ ALWAYS Use Linear MCP

When asked about issues, tasks, or work tracking:

```bash
# List open issues
mcp__linear-server__list_issues

# Get issue details
mcp__linear-server__get_issue

# Create new issue
mcp__linear-server__create_issue

# Update existing issue
mcp__linear-server__update_issue
```

### Issue Identifier Format

Linear issues use the format: `BEA-###` (e.g., BEA-319, BEA-320)

**NOT GitHub format:** `#123` or `owner/repo#123`

### Why This Matters

- **All project tracking is in Linear** - GitHub issues are not monitored
- **Issue references in code** use Linear IDs (BEA-###)
- **Workflow integration** is with Linear, not GitHub

## Current State

| App/Package | Status | Notes |
|-------------|--------|-------|
| `apps/bingo` | **✅ Production Ready (85%)** | Full 75-ball bingo with 29 patterns, audio, themes, dual-screen, PWA, OAuth auth, template CRUD API |
| `apps/trivia` | **✅ Production Ready (95%)** | Full trivia with 20 questions, rounds, scoring, TTS, themes, dual-screen, PWA, OAuth auth, CSV import |
| `apps/platform-hub` | **⚠️ Backend Complete (55-60%)** | OAuth 2.1 server complete (3,479 lines), CORS, rate limiting, request size limits, security hardening. Game selector UI complete. Missing features tracked as BEA-319 to BEA-329: password reset token page, session timeout, theme switching, avatar upload, notification preferences, template list/selector UI, PWA support |
| `packages/sync` | **✅ Complete (100%)** | BroadcastChannel sync, Zustand store, React hook. Actively used in Bingo/Trivia |
| `packages/ui` | **⚠️ Partial (88%)** | 15 components. Missing from package: Card, Toast (Toast duplicated in apps instead) |
| `packages/theme` | **✅ Complete (100%)** | Design tokens (10+ themes, typography, spacing, touch targets) |
| `packages/game-engine` | **⚠️ Partial (40%)** | Base GameStatus type, transition functions, statistics module |
| `packages/auth` | **✅ Complete (95%)** | 30 exports: AuthProvider, hooks (useAuth, useSession, useUser), ProtectedRoute, client wrappers. Not integrated in Bingo/Trivia (apps have duplicate OAuth clients) |
| `packages/database` | **✅ Complete (98%)** | 212 exports: type-safe client, CRUD, pagination, filters, React hooks, session tokens, PIN security (PBKDF2), API factories. Used in Bingo/Trivia |
| `packages/testing` | **✅ Complete (100%)** | BroadcastChannel and Audio mocks for tests |
| `packages/types` | **✅ Complete** | Shared TypeScript type definitions |
| `packages/error-tracking` | **Complete** | Error logging and tracking utilities |

## Monorepo Structure

```
beak-gaming-platform/
├── apps/
│   ├── bingo/           # Beak Bingo - 75-ball bingo game (port 3000)
│   ├── trivia/          # Trivia Night - Team trivia game (port 3001)
│   └── platform-hub/    # Central hub - auth, dashboard, game selector (port 3002)
├── packages/
│   ├── sync/            # Dual-screen synchronization (BroadcastChannel)
│   ├── ui/              # Shared UI components (Button, Modal, Toggle, Input, etc.)
│   ├── theme/           # Senior-friendly design tokens and CSS
│   ├── auth/            # Supabase authentication wrappers (30 exports)
│   ├── game-engine/     # Abstract game state machine
│   ├── database/        # Supabase database utilities (212 exports)
│   ├── types/           # Shared TypeScript type definitions
│   ├── error-tracking/  # Error logging and tracking utilities
│   └── testing/         # Shared test utilities and mocks
└── supabase/            # Database migrations and functions
```

## Tech Stack

- **Monorepo:** Turborepo + pnpm 9.15
- **Framework:** Next.js 16 (App Router)
- **Frontend:** React 19 + Tailwind CSS 4
- **State:** Zustand 5
- **Database:** Supabase (PostgreSQL)
- **Testing:** Vitest 4 + Testing Library

## AI Assistant Configuration

**Context7 MCP:** Automatically use Context7 for up-to-date documentation when working with these libraries. You don't need to explicitly ask - Context7 should be invoked automatically when you need API references, setup guides, or code examples.

### Core Framework & Frontend
- **Next.js** (v16.1.3) - App Router, Server Components, API routes, middleware, caching
- **React** (v19.2.3) - Hooks, Server Components, use client/server directives
- **React DOM** (v19.2.3) - Client/server rendering
- **Tailwind CSS** (v4) - Utilities, configuration, plugins
- **TypeScript** (v5.7.0) - Type system, compiler options

### Database & Auth
- **Supabase JS** (@supabase/supabase-js v2.90.1) - Database client, auth, realtime
- **Supabase SSR** (@supabase/ssr v0.8.0) - Server-side auth, cookies, sessions
- **Supabase PostgREST** (@supabase/postgrest-js v1.19.4) - Query builder, filters

### State Management
- **Zustand** (v5.0.10) - Store creation, persistence, middleware

### Testing
- **Vitest** (v4.0.17) - Test runner, mocking, coverage
- **Testing Library React** (v16.3.1) - Component testing, queries, events
- **Testing Library Jest DOM** (v6.9.1) - DOM matchers
- **Playwright** (v1.57.0) - E2E testing, browser automation
- **vitest-axe** (v0.1.0) - Accessibility testing
- **jsdom** (v27.4.0) - DOM environment for tests

### PWA & Service Workers
- **Serwist** (v9.5.0) - Service worker generation, caching strategies
- **@serwist/next** (v9.5.0) - Next.js integration

### Build Tools & Monorepo
- **Turborepo** (v2.3.0) - Task orchestration, caching
- **pnpm** (v9.15.0) - Package manager, workspace protocol
- **ESLint** (v9) - Linting rules, plugins
- **@typescript-eslint** (v8.33.0) - TypeScript ESLint rules

### UI Components & Accessibility
- **React Aria Components** (v1.14.0) - Accessible UI primitives

### Utilities
- **uuid** (v13.0.0) - UUID generation
- **web-vitals** (v5.1.0) - Performance metrics

## Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Run all apps
pnpm dev:bingo            # Run bingo only
pnpm dev:trivia           # Run trivia only
pnpm dev:hub              # Run platform-hub only
pnpm build                # Build all apps and packages
pnpm test                 # Run all tests
pnpm lint                 # Lint all apps and packages
pnpm clean                # Clean all build artifacts
```

### Running Tests

```bash
# From app directory (e.g., apps/bingo)
pnpm test                 # Watch mode
pnpm test:run             # Single run
pnpm test:coverage        # With coverage report

# Run specific test file
pnpm vitest src/lib/game/__tests__/engine.test.ts
```

### Pre-Commit Hooks

**Automatic Quality Checks:** Husky + lint-staged run checks on every commit to catch issues early.

**What runs automatically:**
- `pnpm lint` - ESLint checks on changed packages
- `pnpm typecheck` - TypeScript type checking on changed packages
- `pnpm test:run` - Unit tests on changed packages

**Why:** GitHub Actions were disabled to avoid billing overages. Pre-commit hooks replace CI checks with local validation.

**Bypass when needed:**
```bash
git commit --no-verify -m "WIP: bypass hooks for work-in-progress"
```

**How it works:**
- Uses Turborepo's `--filter=[HEAD^1]` to only check changed packages
- Turbo's caching makes repeated runs instant
- Build validation still happens in Vercel CI (free unlimited builds)

**Configuration:**
- Hooks: `.husky/pre-commit`
- Lint-staged: `.lintstagedrc.js`
- Installed via: `prepare` script in `package.json` (runs automatically on `pnpm install`)

## Architecture

### BFF Pattern
Apps never talk directly to Supabase. All requests go through Next.js API routes (`app/api/`).

### Dual-Screen System
Each game app has two views synced via BroadcastChannel API:
- **Presenter window** (`/play`): Game controls for the host
- **Audience window** (`/display`): Large display optimized for projectors

The `BroadcastSync` class in `lib/sync/broadcast.ts` handles same-device window communication with message types: `GAME_STATE_UPDATE`, `BALL_CALLED`, `GAME_RESET`, `PATTERN_CHANGED`, `REQUEST_SYNC`.

### Game Engine Pattern
Pure function-based state management. The engine (`lib/game/engine.ts`) contains pure functions that transform `GameState`. The Zustand store wraps these functions to provide React integration.

```
GameState (immutable) → engine functions → new GameState
                              ↓
                    Zustand store (reactive)
                              ↓
                    React components via hooks
```

### App Structure (each app follows this pattern)
```
src/
├── app/              # Next.js App Router pages
│   ├── api/          # BFF routes
│   ├── play/         # Presenter view
│   └── display/      # Audience view
├── components/
│   ├── presenter/    # Host control components
│   ├── audience/     # Display components
│   └── ui/           # App-specific UI
├── lib/
│   ├── game/         # Game engine, patterns, state machine
│   └── sync/         # BroadcastChannel wrapper
├── stores/           # Zustand stores
├── hooks/            # Custom React hooks
└── types/            # TypeScript types
```

### Next.js Middleware Best Practices

**CRITICAL:** Middleware files execute during module compilation, BEFORE the Next.js server is ready. Never make network requests or perform async operations at module-load time.

#### ❌ NEVER: Module-Load-Time Network Requests

```typescript
// ❌ WRONG - Causes server to hang indefinitely
import { createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
// Network request executes during compilation → infinite retry loop → server hangs

export async function middleware(request: NextRequest) {
  await jwtVerify(token, JWKS, { ... });
}
```

**Why this fails:**
- Module runs during Next.js compilation (before server starts)
- `createRemoteJWKSet()` tries to fetch JWKS from Supabase
- Network stack not ready → request fails → error handler retries → infinite recursion
- Server consumes 100%+ CPU, never responds to HTTP requests

**Evidence of failure:**
```bash
$ ps -o pid,state,time
  PID STAT      TIME
93817 R    111:42.93  # Server hung for 111+ minutes at 117% CPU
```

#### ✅ ALWAYS: Lazy Initialization

```typescript
// ✅ CORRECT - Defers network request until first use
import { createRemoteJWKSet } from 'jose';

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  }
  return jwksCache;
}

export async function middleware(request: NextRequest) {
  await jwtVerify(token, getJWKS(), { ... }); // Network request only on first HTTP request
}
```

**Why this works:**
- No network requests during module compilation
- JWKS fetch only happens on first middleware invocation (when server is ready)
- Server starts in <1 second
- Singleton pattern ensures JWKS is only fetched once

#### Files Using This Pattern

- `apps/bingo/src/middleware.ts` - OAuth token verification
- `apps/trivia/src/middleware.ts` - OAuth token verification
- `e2e/fixtures/auth.ts` - E2E test authentication

**Related:** See `docs/plans/2026-01-23-fix-e2e-auth.md` for full debugging analysis of the server hanging issue.

## Design Requirements

- **Senior-friendly:** Large fonts (min 18px body), high contrast, large click targets (min 44x44px)
- **Audience display:** Optimized for projector/large TV, readable from back of room
- **Keyboard shortcuts:** See app-specific CLAUDE.md files for keyboard shortcuts

## Keyboard Shortcuts

### Bingo
| Key | Action |
|-----|--------|
| Space | Roll next ball |
| P | Pause/Resume |
| R | Reset game |
| U | Undo last call |
| M | Mute audio |

### Trivia
| Key | Action |
|-----|--------|
| Arrow Up/Down | Navigate questions |
| Space | Peek answer (local only) |
| D | Toggle display question |
| P | Pause/Resume |
| E | Emergency pause |
| R | Reset game |

## Environment Variables

Create `.env.local` in each app:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Session Token Secret (for HMAC-signed JWT tokens)
# Generate with: openssl rand -hex 32
SESSION_TOKEN_SECRET=your-64-character-hex-string

# Redis (Optional - platform-hub only, for production rate limiting)
# Required for multi-instance deployments to share rate limit state
# If not set, rate limiting falls back to in-memory (single instance only)
# Get from: https://console.upstash.com/
REDIS_URL=https://your-redis-instance.upstash.io
REDIS_TOKEN=your-redis-token
```

## Pull Request Template

**IMPORTANT:** All pull requests MUST use the template at `.github/PULL_REQUEST_TEMPLATE.md`.

When creating PRs:
1. Read the template file first: `.github/PULL_REQUEST_TEMPLATE.md`
2. Fill in all required sections (Five-Level Explanation is mandatory)
3. Complete the Testing checklist
4. Add diagrams/screenshots if relevant

The template includes:
- Human Summary (2-4 bullets)
- Five-Level Explanation (required: non-technical → deep technical)
- Changes, Testing, Risk/Impact, Notes for Reviewers

## App-Specific Context

Each app has its own CLAUDE.md with detailed context:
- `apps/bingo/CLAUDE.md` - 75-ball bingo, 29 patterns, game mechanics
- `apps/trivia/CLAUDE.md` - Team trivia, rounds, scoring (15 sample questions)
- `apps/platform-hub/CLAUDE.md` - Auth, game selector, dashboard
