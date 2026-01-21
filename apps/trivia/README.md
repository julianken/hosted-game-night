# Trivia Night

**Status:** ✅ Production Ready (95% Complete)

A presenter-controlled trivia system designed for retirement communities. Supports team management, multi-round gameplay, text-to-speech question reading, dual-screen presentation (presenter controls + audience display), and offline PWA functionality.

## Features

- ✅ **20-Question Rounds** - Configurable rounds (2-6) with 3-10 questions per round
- ✅ **Text-to-Speech (TTS)** - Web Speech API for question/answer reading with voice selection
- ✅ **Team Management** - Add/remove/rename up to 20 teams with dynamic scoring
- ✅ **Scoring System** - Manual score adjustments (+1, -1, direct set) with automatic re-scoring
- ✅ **Question Display** - Toggle question visibility on audience display, peek answers locally
- ✅ **Round Progression** - Multi-round gameplay with round completion and winner tracking
- ✅ **Dual-Screen Sync** - BroadcastChannel API synchronizes presenter + audience windows
- ✅ **Theme System** - Light/Dark/System mode with 10+ color themes
- ✅ **PWA Support** - Service worker, offline-capable gameplay
- ✅ **Fullscreen Mode** - Optimized for projector/large TV displays
- ✅ **Keyboard Shortcuts** - Arrow Up/Down, Space, D, P, E, R for quick control
- 🚧 **User Authentication** - Integration with @beak-gaming/auth (pending)
- 🚧 **Question Import** - CSV/JSON import functionality (pending)

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm 9.15+
- Supabase project (for online mode)

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

- **`/`** - Home page (future: room creation/join)
- **`/play`** - Presenter view (question list, team manager, scoring, controls)
- **`/display`** - Audience view (large question display, scoreboard, waiting screen)

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
│   ├── api/           # BFF routes (sessions, questions, teams, scoring)
│   ├── play/          # Presenter view (page.tsx)
│   ├── display/       # Audience view (page.tsx)
│   └── layout.tsx     # Root layout with theme provider
├── components/
│   ├── presenter/     # QuestionDisplay, QuestionList, TeamManager, TeamScoreboard, etc.
│   ├── audience/      # AudienceQuestionDisplay, AudienceScoreboard, WaitingDisplay
│   └── ui/            # KeyboardShortcutsModal
├── hooks/
│   ├── use-game.ts    # Game state hook
│   ├── use-game-keyboard.ts # Keyboard shortcuts
│   ├── use-sync.ts    # Dual-screen sync hook
│   ├── use-tts.ts     # Text-to-speech hook
│   ├── use-theme.ts   # Theme management
│   └── use-fullscreen.ts
├── lib/
│   └── game/          # engine.ts (pure functions for state transitions)
├── stores/
│   ├── game-store.ts  # Zustand game state
│   ├── audio-store.ts # Zustand audio/TTS state (persisted)
│   ├── sync-store.ts  # Zustand sync state
│   ├── theme-store.ts # Zustand theme state (persisted)
│   └── settings-store.ts
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
- `lib/game/engine.ts` - Pure functions for state transitions (team management, scoring, navigation)
- `stores/game-store.ts` - Zustand store wrapping engine functions
- `hooks/use-game.ts` - React hook for game state access
- `hooks/use-game-keyboard.ts` - Keyboard shortcut handling

### Dual-Screen Sync

Uses BroadcastChannel API for same-device window communication:

- **Presenter window** (`/play`): Question list, team manager, scoring controls, navigation
- **Audience window** (`/display`): Large question display, scoreboard, waiting screen
- **Message types**: `GAME_STATE_UPDATE`, `QUESTION_DISPLAYED`, `ANSWER_REVEALED`, `EMERGENCY_PAUSE`, `REQUEST_SYNC`

**Implementation:** `@beak-gaming/sync` package + `hooks/use-sync.ts` (React hook)

## Environment Variables

Create `.env.local` in `apps/trivia`:

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
# From apps/trivia
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
| **Arrow Up/Down** | Navigate questions |
| **Space** | Peek answer (local only, not shown on display) |
| **D** | Toggle display question on audience |
| **P** | Pause/Resume game |
| **E** | Emergency pause (blanks audience display) |
| **R** | Reset game |

**Implementation:** `hooks/use-game-keyboard.ts`

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
| **PWA** | ✅ Complete | Service worker, offline gameplay |
| **Dual-Screen Sync** | ✅ Complete | BroadcastChannel API via @beak-gaming/sync |
| **TTS System** | ✅ Complete | Web Speech API with voice selection, rate/pitch/volume controls |
| **Theme System** | ✅ Complete | 10+ themes, light/dark mode, persistence |
| **Testing** | ✅ Complete | Vitest, Testing Library, BroadcastChannel mocks |

## Known Issues & Limitations

- **Authentication:** Not yet integrated - all sessions are guest sessions
- **Question Import:** No CSV/JSON import functionality yet (questions are hardcoded)
- **Question Timer:** Auto-reveal timer not implemented
- **Question Categories:** No category filtering or organization
- **Safari TTS:** Web Speech API has limitations on iOS Safari (TTS may not work)

## Future Work

- [ ] User authentication via @beak-gaming/auth
- [ ] Question import from CSV/JSON files
- [ ] Question timer with auto-reveal
- [ ] Question categories and filtering
- [ ] Saved game templates (backend storage)
- [ ] Analytics/history tracking
- [ ] Multi-room support

## Design Requirements

- **Senior-friendly:** Large fonts (min 18px body), high contrast, large click targets (min 44x44px)
- **Audience display:** Optimized for projector/large TV, readable from back of room
- **Touch targets:** Minimum 44x44px for all interactive elements
- **Color contrast:** WCAG AA compliant for text and interactive elements

## Related Documentation

- **AI Context:** [`CLAUDE.md`](./CLAUDE.md) - Detailed architecture, game mechanics, state management
- **Monorepo:** [`../../README.md`](../../README.md) - Root README with project overview
- **Pull Request Template:** [`../../.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md)

## Contributing

See the [root README](../../README.md) for monorepo setup instructions and the [CLAUDE.md](./CLAUDE.md) file for AI assistant guidance.
