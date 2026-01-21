# Beak Bingo

**Status:** ✅ Production Ready (85% Complete)

A cloud-based, web-accessible Bingo system designed for retirement communities. Replaces USB-based solutions with a modern PWA that works offline, supports dual-screen presentation (presenter controls + audience display), and provides admin accounts for saved configurations.

## Features

- ✅ **75-Ball Bingo Format** - Standard B-I-N-G-O grid (B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75)
- ✅ **29 Built-in Patterns** - Lines, corners, frames, shapes, letters, blackout, and more
- ✅ **Voice Packs** - 4 voice options (Standard, Standard Hall, British Slang, British Slang Hall)
- ✅ **Audio System** - Roll sounds (Metal Cage, Tumbler, Lottery Ball) with separate volume controls
- ✅ **Auto-Call Mode** - Configurable speed (5-30 seconds) for automated gameplay
- ✅ **Dual-Screen Sync** - BroadcastChannel API synchronizes presenter + audience windows
- ✅ **Theme System** - Light/Dark/System mode with 10+ color themes
- ✅ **PWA Support** - Service worker, audio caching, offline-capable gameplay
- ✅ **Fullscreen Mode** - Optimized for projector/large TV displays
- ✅ **Room Creation** - Online (Supabase) and offline (localStorage) modes with PIN security
- ✅ **Keyboard Shortcuts** - Space, P, R, U, M for quick control
- 🚧 **User Authentication** - Integration with @beak-gaming/auth (pending)
- 🚧 **Saved Game Templates** - Store favorite patterns and settings (pending)

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm 9.15+
- Supabase project (for online mode)

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

- **`/`** - Home page with room creation/join
- **`/play`** - Presenter view (game controls, pattern selector, audio settings)
- **`/display`** - Audience view (large ball display, bingo board, pattern visualization)

### First-Time Setup

1. Create `.env.local` in `apps/bingo` (see Environment Variables below)
2. Run `pnpm dev:bingo` from root or `pnpm dev` from `apps/bingo`
3. Open [http://localhost:3000](http://localhost:3000)
4. Create a room (online or offline mode)
5. Open `/display` in a second window for audience view

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19 + Tailwind CSS 4 |
| Backend (BFF) | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (via BFF) |
| State Management | Zustand 5 |
| PWA | Serwist (Service Worker) |
| Testing | Vitest 4 + Testing Library |

### Project Structure

```
src/
├── app/
│   ├── api/health/    # Health check endpoint
│   ├── play/          # Presenter view (page.tsx)
│   ├── display/       # Audience view (page.tsx)
│   └── layout.tsx     # Root layout with theme provider
├── components/
│   ├── presenter/     # ControlPanel, PatternSelector, BallDisplay, ThemeSelector
│   ├── audience/      # AudienceBallDisplay, AudienceBoard
│   └── ui/            # Button, Modal, Toggle, Card, Toast
├── hooks/
│   ├── use-game.ts    # Game state + keyboard shortcuts
│   ├── use-audio.ts   # Audio playback hook
│   ├── use-sync.ts    # Dual-screen sync hook
│   └── use-theme.ts   # Theme management
├── lib/
│   ├── game/          # engine.ts, patterns.ts, state-machine.ts, ball-deck.ts
│   ├── session/       # secure-generation.ts (PIN/session ID), serializer.ts
│   └── sync/          # broadcast.ts (BroadcastChannel), session.ts, offline-session.ts
├── stores/
│   ├── game-store.ts  # Zustand game state
│   ├── audio-store.ts # Zustand audio state (persisted)
│   ├── sync-store.ts  # Zustand sync state
│   └── theme-store.ts # Zustand theme state (persisted)
├── types/             # TypeScript types
├── test/              # Test utilities and mocks
└── sw.ts              # Service worker (Serwist)
```

### State Management

Pure function-based game engine wrapped in Zustand stores:

```
GameState (immutable) → engine functions → new GameState
                              ↓
                    Zustand store (reactive)
                              ↓
                    React components via hooks
```

**Key Files:**
- `lib/game/engine.ts` - Pure functions for state transitions
- `lib/game/patterns.ts` - 29 pattern definitions with validation
- `lib/game/state-machine.ts` - Game status transitions (idle → ready → active → paused → completed)
- `stores/game-store.ts` - Zustand store wrapping engine functions

### Dual-Screen Sync

Uses BroadcastChannel API for same-device window communication:

- **Presenter window** (`/play`): Game controls, pattern selector, speed control, audio toggle
- **Audience window** (`/display`): Large ball display, full bingo board, winning pattern
- **Message types**: `GAME_STATE_UPDATE`, `BALL_CALLED`, `GAME_RESET`, `PATTERN_CHANGED`, `REQUEST_SYNC`

**Implementation:** `lib/sync/broadcast.ts` (BroadcastSync class) + `hooks/use-sync.ts` (React hook)

## Environment Variables

Create `.env.local` in `apps/bingo`:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SESSION_TOKEN_SECRET` | Secret key for HMAC-signing session tokens | Generate with `openssl rand -base64 32` |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | For admin operations (optional) |

**Example `.env.local`:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SESSION_TOKEN_SECRET=vGOwoWTO69KP5QXIcNYjyHGonXJZh3nFH3oq3XOCSwY=
```

## Development Workflow

### Running Tests

Tests are located alongside code in `__tests__` directories:

```bash
# From apps/bingo
pnpm test             # Watch mode
pnpm test:run         # Single run
pnpm test:coverage    # With coverage report

# Run specific test file
pnpm vitest src/lib/game/__tests__/engine.test.ts
```

**Test Locations:**
- `stores/__tests__/` - Store tests
- `hooks/__tests__/` - Hook tests
- `components/**/__tests__/` - Component tests
- `lib/game/__tests__/` - Engine tests
- `app/api/**/__tests__/` - API route tests

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Space** | Roll next ball |
| **P** | Pause/Resume game |
| **R** | Reset game |
| **U** | Undo last call |
| **M** | Mute/unmute audio |

**Implementation:** `hooks/use-game.ts:75`

## Shared Packages

This app depends on the following shared packages:

- [`@beak-gaming/sync`](../../packages/sync/README.md) - BroadcastChannel dual-screen synchronization
- [`@beak-gaming/ui`](../../packages/ui/README.md) - Button, Toggle, Slider, Card, Modal, Toast components
- [`@beak-gaming/theme`](../../packages/theme/README.md) - Design tokens (10+ themes, typography, spacing)
- [`@beak-gaming/database`](../../packages/database/README.md) - Type-safe Supabase client wrappers (150+ exports)
- [`@beak-gaming/auth`](../../packages/auth/README.md) - Supabase authentication wrappers (40+ exports) - *not yet integrated*
- [`@beak-gaming/game-engine`](../../packages/game-engine/README.md) - Abstract game state machine (partial usage)
- [`@beak-gaming/testing`](../../packages/testing/README.md) - BroadcastChannel and Audio mocks for tests

## Integration Status

| Feature | Status | Notes |
|---------|--------|-------|
| **Database** | ✅ Integrated | Session tokens, CRUD helpers, API factories |
| **Authentication** | ❌ Not Integrated | @beak-gaming/auth ready but not wired up |
| **PWA** | ✅ Complete | Service worker, audio caching, offline gameplay |
| **Dual-Screen Sync** | ✅ Complete | BroadcastChannel API via @beak-gaming/sync |
| **Audio System** | ✅ Complete | Voice packs, roll sounds, volume controls, pooling |
| **Theme System** | ✅ Complete | 10+ themes, light/dark mode, persistence |
| **Testing** | ✅ Complete | Vitest, Testing Library, BroadcastChannel mocks |

## Known Issues & Limitations

- **Authentication:** Not yet integrated - all sessions are guest sessions
- **Saved Templates:** No backend storage for game templates
- **Pattern Editor:** Patterns are hardcoded in `lib/game/patterns.ts`
- **Safari Audio:** Web Audio API has limitations on iOS Safari (voice packs may not work)

## Future Work

- [ ] User authentication via @beak-gaming/auth
- [ ] Saved game templates (backend storage)
- [ ] Pattern editor UI
- [ ] Voice pack selection UI improvements
- [ ] Analytics/history tracking
- [ ] Multi-room support

## Design Requirements

- **Senior-friendly:** Large fonts (min 18px body), high contrast, large click targets (min 44x44px)
- **Audience display:** Optimized for projector/large TV, readable from back of room
- **Touch targets:** Minimum 44x44px for all interactive elements
- **Color contrast:** WCAG AA compliant for text and interactive elements

## Related Documentation

- **AI Context:** [`CLAUDE.md`](./CLAUDE.md) - Detailed architecture, game mechanics, state machine
- **Monorepo:** [`../../README.md`](../../README.md) - Root README with project overview
- **Pull Request Template:** [`../../.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md)

## Contributing

See the [root README](../../README.md) for monorepo setup instructions and the [CLAUDE.md](./CLAUDE.md) file for AI assistant guidance.
