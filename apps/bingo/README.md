# Bingo

**Status:** Production Ready

A web-accessible Bingo system designed for groups and communities. Replaces USB-based solutions with a modern PWA that works offline, supports dual-screen presentation (presenter controls + audience display), and saves configurations locally.

## Features

- **75-Ball Bingo Format** - Standard B-I-N-G-O grid (B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75)
- **29 Built-in Patterns** - Lines, corners, frames, shapes, letters, blackout, and more
- **Voice Packs** - 4 voice options (Standard, Standard Hall, British Slang, British Slang Hall)
- **Audio System** - Roll sounds (Metal Cage, Plastic Cage, Plastic Swirl, Lottery Balls) with separate volume controls
- **Auto-Call Mode** - Configurable speed (5-30 seconds) for automated gameplay
- **Dual-Screen Sync** - BroadcastChannel API synchronizes presenter + audience windows
- **Theme System** - Light/Dark/System mode with 10+ color themes
- **PWA Support** - Service worker, audio caching, offline-capable gameplay
- **Fullscreen Mode** - Optimized for projector/large TV displays
- **Saved Templates** - Store favorite patterns and settings in localStorage
- **Keyboard Shortcuts** - Space, P, R, U, M for quick control

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm 9.15+

### Installation

From monorepo root:

```bash
# Install dependencies
pnpm install

# Run bingo app on port 3000
pnpm dev:bingo
```

From `apps/bingo`:

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test              # Watch mode
pnpm test:run          # Single run
pnpm test:coverage     # With coverage report
```

### Key Routes

- **`/`** - Home page
- **`/play`** - Presenter view (game controls, pattern selector, audio settings)
- **`/display`** - Audience view (large ball display, bingo board, pattern visualization)

### First-Time Setup

1. Create `.env.local` in `apps/bingo` (see Environment Variables below)
2. Run `pnpm dev:bingo` from root or `pnpm dev` from `apps/bingo`
3. Open [http://localhost:3000](http://localhost:3000)
4. Navigate to `/play` for presenter controls
5. Open `/display` in a second window for audience view

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19 + Tailwind CSS 4 |
| State Management | Zustand 5 (localStorage persistence) |
| PWA | Serwist (Service Worker) |
| Testing | Vitest 4 + Testing Library |

### State Management

Pure function-based game engine wrapped in Zustand stores:

```
GameState (immutable) -> engine functions -> new GameState
                              |
                    Zustand store (reactive)
                              |
                    React components via hooks
```

**Key Files:**
- `lib/game/engine.ts` - Pure functions for state transitions
- `lib/game/patterns.ts` - 29 pattern definitions with validation
- `lib/game/state-machine.ts` - Game status transitions
- `stores/game-store.ts` - Zustand store wrapping engine functions

### Dual-Screen Sync

Uses BroadcastChannel API for same-device window communication:

- **Presenter window** (`/play`): Game controls, pattern selector, speed control, audio toggle
- **Audience window** (`/display`): Large ball display, full bingo board, winning pattern

**Implementation:** `@joolie-boolie/sync` package + `hooks/use-sync.ts` (React hook)

## Environment Variables

Create `.env.local` in `apps/bingo`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | App URL (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_FARO_URL` | No | Grafana Faro collector URL for frontend observability |

No auth or database env vars are needed. The app runs standalone with localStorage-only persistence.

## Development Workflow

### Running Tests

Tests are located alongside code in `__tests__` directories:

```bash
# From apps/bingo
pnpm test             # Watch mode
pnpm test:run         # Single run
pnpm test:coverage    # With coverage report
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Space** | Roll next ball |
| **P** | Pause/Resume game |
| **R** | Reset game |
| **U** | Undo last call |
| **M** | Mute/unmute audio |

**Implementation:** `hooks/use-game.ts`

## Shared Packages

This app depends on the following shared packages:

- [`@joolie-boolie/sync`](../../packages/sync/README.md) - BroadcastChannel dual-screen synchronization
- [`@joolie-boolie/ui`](../../packages/ui/README.md) - Button, Toggle, Slider, Card, Modal, Toast components
- [`@joolie-boolie/theme`](../../packages/theme/README.md) - Design tokens (10+ themes, typography, spacing)
- [`@joolie-boolie/game-stats`](../../packages/game-stats/README.md) - Game statistics types, calculators, storage
- [`@joolie-boolie/testing`](../../packages/testing/README.md) - BroadcastChannel and Audio mocks for tests
- [`@joolie-boolie/types`](../../packages/types/README.md) - Shared TypeScript types
- [`@joolie-boolie/audio`](../../packages/audio/README.md) - Shared audio utilities
- [`@joolie-boolie/error-tracking`](../../packages/error-tracking/README.md) - Error logging and tracking

## Known Issues & Limitations

- **Pattern Editor:** Patterns are hardcoded in `lib/game/patterns.ts`
- **Safari Audio:** Web Audio API has limitations on iOS Safari (voice packs may not work)

## Future Work

- [ ] Pattern editor UI
- [ ] Voice pack selection UI improvements
- [ ] Analytics/history tracking

## Design Requirements

- **Accessible:** Large fonts (min 18px body), high contrast, large click targets (min 44x44px)
- **Audience display:** Optimized for projector/large TV, readable from back of room
- **Touch targets:** Minimum 44x44px for all interactive elements
- **Color contrast:** WCAG AA compliant for text and interactive elements

## Related Documentation

- **AI Context:** [`CLAUDE.md`](./CLAUDE.md) - Detailed architecture, game mechanics, state machine
- **Monorepo:** [`../../README.md`](../../README.md) - Root README with project overview

## Contributing

See the [root README](../../README.md) for monorepo setup instructions and the [CLAUDE.md](./CLAUDE.md) file for AI assistant guidance.
