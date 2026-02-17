# Architecture

## BFF Pattern

Apps never talk directly to Supabase. All requests go through Next.js API routes (`app/api/`).

## Dual-Screen System

Each game app has two views synced via BroadcastChannel API:
- **Presenter window** (`/play`): Game controls for the host
- **Audience window** (`/display`): Large display optimized for projectors

The `BroadcastSync` class in `@joolie-boolie/sync` (`packages/sync/src/broadcast.ts`) handles same-device window communication. Each app defines its own message types (e.g., bingo uses `GAME_STATE_UPDATE`, `BALL_CALLED`, `GAME_RESET`, `PATTERN_CHANGED`, `REQUEST_SYNC`). The sync package itself provides a generic string-typed message API with `REQUEST_SYNC` as its only built-in type.

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
joolie-boolie-platform/
├── apps/
│   ├── bingo/           # Bingo - 75-ball bingo game (port 3000)
│   ├── trivia/          # Trivia - Team trivia game (port 3001)
│   └── platform-hub/    # Central hub - auth, dashboard, game selector (port 3002)
├── packages/
│   ├── sync/            # Dual-screen synchronization (BroadcastChannel)
│   ├── ui/              # Shared UI components (Button, Modal, Toggle, Input, etc.)
│   ├── theme/           # Accessible design tokens and CSS
│   ├── auth/            # Supabase authentication wrappers
│   ├── game-engine/     # Abstract game state machine
│   ├── database/        # Supabase database utilities (268 exports)
│   ├── types/           # Shared TypeScript type definitions
│   ├── error-tracking/  # Error logging and tracking utilities
│   └── testing/         # Shared test utilities and mocks
└── supabase/            # Database migrations and functions
```

## App Structure

Each game app (bingo, trivia) follows this pattern:

```
src/
├── app/              # Next.js App Router pages
│   ├── api/          # BFF routes (auth, templates, sessions)
│   ├── play/         # Presenter view
│   ├── display/      # Audience view
│   └── auth/callback/# OAuth callback handler
├── components/
│   ├── presenter/    # Host control components
│   ├── audience/     # Display components
│   └── ui/           # App-specific UI
├── lib/
│   ├── auth/         # OAuth client (PKCE flow utilities)
│   ├── game/         # Game engine, patterns, state machine
│   ├── session/      # Session management
│   └── sync/         # BroadcastChannel session wrapper
├── stores/           # Zustand stores
├── hooks/            # Custom React hooks
└── types/            # TypeScript types
```

Platform Hub uses a different layout (no presenter/audience views, has middleware directory). See [APP_STRUCTURE.md](APP_STRUCTURE.md) for details.
