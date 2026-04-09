# Trivia

**Status:** Production Ready

A presenter-controlled trivia system designed for groups and communities. Supports team management, multi-round gameplay, text-to-speech question reading, dual-screen presentation (presenter controls + audience display), and offline PWA functionality.

## Features

- **20-Question Rounds** - Configurable rounds (2-6) with 3-10 questions per round
- **Text-to-Speech (TTS)** - Web Speech API for question/answer reading with voice selection
- **Team Management** - Add/remove/rename up to 20 teams with dynamic scoring
- **Scoring System** - Manual score adjustments (+1, -1, direct set) with automatic re-scoring
- **Question Display** - Toggle question visibility on audience display, peek answers locally
- **Question Sets** - Import, organize, and manage question libraries (localStorage)
- **Question Import** - JSON import with drag-drop UI, plus Trivia API integration
- **Round Progression** - Multi-round gameplay with round completion and winner tracking
- **Dual-Screen Sync** - BroadcastChannel API synchronizes presenter + audience windows
- **Theme System** - Light/Dark/System mode with 10+ color themes
- **PWA Support** - Service worker, offline-capable gameplay
- **Fullscreen Mode** - Optimized for projector/large TV displays
- **Keyboard Shortcuts** - Full keyboard control for presenters

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm 9.15+

### Installation

From monorepo root:

```bash
# Install dependencies
pnpm install

# Run trivia app on port 3001
pnpm dev:trivia
```

From `apps/trivia`:

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
- **`/play`** - Presenter view (question list, team manager, scoring, controls)
- **`/display`** - Audience view (large question display, scoreboard, waiting screen)
- **`/question-sets`** - Question set management

### First-Time Setup

1. Create `.env.local` in `apps/trivia` (see Environment Variables below)
2. Run `pnpm dev:trivia` from root or `pnpm dev` from `apps/trivia`
3. Open [http://localhost:3001](http://localhost:3001)
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
- `lib/game/engine.ts` - Pure functions for state transitions (team management, scoring, navigation)
- `stores/game-store.ts` - Zustand store wrapping engine functions
- `hooks/use-game.ts` - React hook for game state access
- `hooks/use-game-keyboard.ts` - Keyboard shortcut handling

### Dual-Screen Sync

Uses BroadcastChannel API for same-device window communication:

- **Presenter window** (`/play`): Question list, team manager, scoring controls, navigation
- **Audience window** (`/display`): Large question display, scoreboard, waiting screen

**Implementation:** `@joolie-boolie/sync` package + `hooks/use-sync.ts` (React hook)

## Environment Variables

Create `.env.local` in `apps/trivia`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | App URL (default: `http://localhost:3001`) |
| `THE_TRIVIA_API_KEY` | For API | Key for The Trivia API (free at https://the-trivia-api.com) |
| `NEXT_PUBLIC_FEATURE_QUESTION_SETS` | No | Set to `'false'` to disable question sets (default: enabled) |
| `NEXT_PUBLIC_FARO_URL` | No | Grafana Faro collector URL for frontend observability |

No auth or database env vars are needed. The app runs standalone with localStorage-only persistence.

## Development Workflow

### Running Tests

Tests are located alongside code in `__tests__` directories:

```bash
# From apps/trivia
pnpm test             # Watch mode
pnpm test:run         # Single run
pnpm test:coverage    # With coverage report
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Arrow Up/Down** | Navigate questions |
| **Space** | Toggle display question on audience |
| **P** | Peek answer (local only) |
| **E** | Emergency blank (blanks audience display) |
| **R** | New game (with confirmation) |
| **M** | Mute/unmute TTS |
| **N** | Next round |
| **T** | Start timer / Toggle scoreboard |
| **F** | Toggle fullscreen |

**Implementation:** `hooks/use-game-keyboard.ts`

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

- **Safari TTS:** Web Speech API has limitations on iOS Safari (TTS may not work)

## Future Work

- [ ] Pattern editor
- [ ] Analytics/history tracking

## Design Requirements

- **Accessible:** Large fonts (min 18px body), high contrast, large click targets (min 44x44px)
- **Audience display:** Optimized for projector/large TV, readable from back of room
- **Touch targets:** Minimum 44x44px for all interactive elements
- **Color contrast:** WCAG AA compliant for text and interactive elements

## Related Documentation

- **AI Context:** [`CLAUDE.md`](./CLAUDE.md) - Detailed architecture, game mechanics, state management
- **Monorepo:** [`../../README.md`](../../README.md) - Root README with project overview

## Contributing

See the [root README](../../README.md) for monorepo setup instructions and the [CLAUDE.md](./CLAUDE.md) file for AI assistant guidance.
