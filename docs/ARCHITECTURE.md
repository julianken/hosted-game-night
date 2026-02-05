# Architecture

## BFF Pattern

Apps never talk directly to Supabase. All requests go through Next.js API routes (`app/api/`).

## Dual-Screen System

Each game app has two views synced via BroadcastChannel API:
- **Presenter window** (`/play`): Game controls for the host
- **Audience window** (`/display`): Large display optimized for projectors

The `BroadcastSync` class in `lib/sync/broadcast.ts` handles same-device window communication with message types: `GAME_STATE_UPDATE`, `BALL_CALLED`, `GAME_RESET`, `PATTERN_CHANGED`, `REQUEST_SYNC`.

## Game Engine Pattern

Pure function-based state management. The engine (`lib/game/engine.ts`) contains pure functions that transform `GameState`. The Zustand store wraps these functions to provide React integration.

```
GameState (immutable) → engine functions → new GameState
                              ↓
                    Zustand store (reactive)
                              ↓
                    React components via hooks
```

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
│   ├── auth/            # Supabase authentication wrappers (34 exports)
│   ├── game-engine/     # Abstract game state machine
│   ├── database/        # Supabase database utilities (268 exports)
│   ├── types/           # Shared TypeScript type definitions
│   ├── error-tracking/  # Error logging and tracking utilities
│   └── testing/         # Shared test utilities and mocks
└── supabase/            # Database migrations and functions
```

## App Structure

Each app follows this pattern:

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
