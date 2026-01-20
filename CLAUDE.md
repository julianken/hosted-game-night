# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Beak Gaming Platform** - A unified gaming platform for retirement communities, featuring Bingo, Trivia, and future games. Built as a Turborepo monorepo with shared packages.

## Current State

| App/Package | Status | Notes |
|-------------|--------|-------|
| `apps/bingo` | **Functional** | Full 75-ball bingo with audio, 29 patterns, themes, dual-screen sync, PWA |
| `apps/trivia` | **Functional (95%)** | Team trivia with rounds, scoring, TTS, themes, dual-screen sync, PWA. Has 15 sample questions (needs 5 more for 4 rounds) |
| `apps/platform-hub` | Scaffolded | Game selection UI only; auth not implemented |
| `packages/sync` | **Complete** | BroadcastChannel sync, Zustand store, React hook |
| `packages/ui` | **Complete** | Button, Toggle, Slider components |
| `packages/theme` | **Complete** | Design tokens (colors, font sizes, touch targets) |
| `packages/game-engine` | Partial | Base GameStatus type, transition functions, and statistics module |
| `packages/auth` | **Complete** | 40+ auth utilities, hooks (useAuth, useSession, useUser), components (AuthProvider, ProtectedRoute), server/client wrappers |
| `packages/database` | **Complete** | 150+ database utilities including type-safe client, query builders, pagination, filters, sorting, CRUD helpers, table-specific functions, and React hooks |
| `packages/testing` | **Complete** | BroadcastChannel and Audio mocks |

## Monorepo Structure

```
beak-gaming-platform/
├── apps/
│   ├── bingo/           # Beak Bingo - 75-ball bingo game (port 3000)
│   ├── trivia/          # Trivia Night - Team trivia game (port 3001)
│   └── platform-hub/    # Central hub - auth, dashboard, game selector (port 3002)
├── packages/
│   ├── sync/            # Dual-screen synchronization (BroadcastChannel)
│   ├── ui/              # Shared UI components (Button, Toggle, Slider)
│   ├── theme/           # Senior-friendly design tokens and CSS
│   ├── auth/            # Supabase authentication wrappers (40+ exports)
│   ├── game-engine/     # Abstract game state machine
│   ├── database/        # Supabase database utilities (150+ exports)
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
