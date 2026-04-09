# Architecture

## Standalone Apps

Both Bingo and Trivia run as standalone apps with no backend database or authentication. All data persistence is via localStorage (Zustand stores with persist middleware). The only server-side API routes are for CSP reports, monitoring tunnels, and the trivia-api proxy (which keeps the API key server-side).

## Dual-Screen System

Each game app has two views synced via BroadcastChannel API:
- **Presenter window** (`/play`): Game controls for the host
- **Audience window** (`/display`): Large display optimized for projectors

The `BroadcastSync` class in `@joolie-boolie/sync` (`packages/sync/src/broadcast.ts`) handles same-device window communication. Each app defines its own message types (e.g., bingo uses `GAME_STATE_UPDATE`, `BALL_CALLED`, `GAME_RESET`, `PATTERN_CHANGED`, `REQUEST_SYNC`). The sync package itself provides a generic string-typed message API with `REQUEST_SYNC` as its only built-in type.

## Game Engine Pattern

Pure function-based state management. The engine (`lib/game/engine.ts`) contains pure functions that transform `GameState`. The Zustand store wraps these functions to provide React integration. In trivia, the game engine is augmented by a separate AudienceScene layer (`types/audience-scene.ts`, `lib/game/scene.ts`) that controls audience display routing orthogonally to the 5-state GameStatus.

```
GameState (immutable) -> engine functions -> new GameState
                              |
                    Zustand store (reactive)
                              |
                    React components via hooks
```

## Monorepo Structure

```
joolie-boolie/
├── apps/
│   ├── bingo/           # Bingo - 75-ball bingo game (port 3000)
│   └── trivia/          # Trivia - Team trivia game (port 3001)
├── packages/
│   ├── sync/            # Dual-screen synchronization (BroadcastChannel)
│   ├── ui/              # Shared UI components (Button, Modal, Toggle, Input, etc.)
│   ├── theme/           # Accessible design tokens and CSS
│   ├── game-stats/      # Game statistics types, calculators, storage
│   ├── types/           # Shared TypeScript type definitions
│   ├── audio/           # Shared audio utilities (voice packs, sound effects)
│   ├── error-tracking/  # Error logging and tracking utilities
│   └── testing/         # Shared test utilities and mocks
```

## App Structure

Each game app (bingo, trivia) follows this pattern:

```
src/
├── app/              # Next.js App Router pages
│   ├── api/          # Minimal API routes (CSP, monitoring, trivia-api proxy)
│   ├── play/         # Presenter view
│   └── display/      # Audience view
├── components/
│   ├── presenter/    # Host control components
│   ├── audience/     # Display components
│   └── ui/           # App-specific UI
├── lib/
│   ├── game/         # Game engine, patterns, state machine
│   └── sync/         # BroadcastChannel session wrapper
├── stores/           # Zustand stores (localStorage persistence)
├── hooks/            # Custom React hooks
└── types/            # TypeScript types
```
