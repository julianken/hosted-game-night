# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Beak Gaming Platform** - A unified gaming platform for retirement communities, featuring Bingo, Trivia, and future games. Built as a Turborepo monorepo with shared packages.

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
│   ├── auth/            # Supabase authentication wrappers
│   ├── game-engine/     # Abstract game state machine
│   ├── database/        # Supabase database utilities
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
- **Keyboard shortcuts:** Space=roll, P=pause, R=reset, U=undo, M=mute

## Environment Variables

Create `.env.local` in each app:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## App-Specific Context

Each app has its own CLAUDE.md with detailed context:
- `apps/bingo/CLAUDE.md` - 75-ball bingo, patterns, game mechanics
- `apps/trivia/CLAUDE.md` - Team trivia, rounds, scoring
- `apps/platform-hub/CLAUDE.md` - Auth, game selector, dashboard
