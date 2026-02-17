# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Trivia** - A presenter-controlled trivia system for groups and communities. Part of the Joolie Boolie monorepo.

**Current State:** Fully functional with team management, rounds, scoring, TTS, buzz-in, timer auto-reveal, question sets, presets, themes, and dual-screen sync.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| Frontend | React + Tailwind CSS |
| Backend (BFF) | Next.js API Routes |
| Database | Supabase (PostgreSQL) - shared with platform |
| Auth | OAuth 2.1 via Platform Hub (middleware-based JWT verification) |
| State Management | Zustand |
| Dual-Screen Sync | @joolie-boolie/sync |
| PWA | Serwist (Service Worker) |

## Features

### Game Engine
- Multi-round trivia with configurable rounds and questions
- Pure function-based state management (`lib/game/engine.ts`)
- State transitions and game flow control
- Round completion and progression

### Team System
- Add/remove teams dynamically
- Rename teams
- Score adjustment (+1, -1, direct set)
- Sorted scoreboard display
- Round winners and overall leaders

### Question Display
- Presenter question list with navigation
- Display question toggle (show/hide on audience)
- Peek answer (presenter only, local state)
- Answer reveal flow

### Buzz-In System
- Real-time buzz-in for audience participants
- Presenter buzz-in panel for managing responses (`components/presenter/BuzzInPanel.tsx`)
- Audience buzz-in display with feedback (`components/audience/BuzzInDisplay.tsx`)
- Core logic in `lib/game/buzz-in.ts`, exposed via `hooks/use-buzz-in.ts`

### Timer & Auto-Reveal
- Configurable question timer with countdown display
- Auto-reveal answer when timer expires
- Presenter timer display (`components/presenter/TimerDisplay.tsx`)
- Audience timer display (`components/audience/AudienceTimerDisplay.tsx`)
- Timer hook: `hooks/use-timer-auto-reveal.ts`

### Question Sets & Import
- Question set management page (`/question-sets`)
- CRUD API for question sets
- CSV/JSON import with drag-drop UI
- Question parser, validator, converter, and exporter (`lib/questions/`)
- 7 predefined categories with filtering

### Presets
- Save and load game configuration presets
- Preset selector in presenter view (`components/presenter/PresetSelector.tsx`)
- Save preset modal for quick access

### Question Editor
- Full question editing interface (`components/question-editor/`, 8 components)
- Create, edit, and organize questions
- Category assignment and management

### Audio/TTS System
- Text-to-speech for questions and answers
- Voice selection from available browser voices
- Configurable rate, pitch, volume
- Convenience methods: announceQuestion, announceAnswer, announceScores
- Web Speech API integration

### Sound Effects
- Game event sound effects (`hooks/use-sounds.ts`, `lib/sounds.ts`)
- Configurable sound playback

### Statistics
- Game statistics display (`components/stats/StatsDisplay.tsx`)
- Score tracking and analytics via `hooks/use-statistics.ts`

### Theme System
- Light/Dark/System mode
- 10+ color themes
- Persisted preferences
- Smooth transitions

### Dual-Screen Sync
- Presenter view (`/play`): Question list, team manager, scoring, controls
- Audience view (`/display`): Large question display, scoreboard, timer, buzz-in, waiting screen
- BroadcastChannel API for same-device sync via `@joolie-boolie/sync`
- Emergency pause (blanks audience display)

### PWA Support
- Service worker with Serwist
- Offline-capable
- Cache management

### Session Management
- Share session with room codes (`components/presenter/ShareSession.tsx`)
- Session persistence and recovery

### Templates
- Saved game templates with CRUD API
- Template selector UI for quick game setup

## Shared Packages

- `@joolie-boolie/sync` - Dual-screen synchronization
- `@joolie-boolie/ui` - Shared UI components
- `@joolie-boolie/theme` - Accessible design tokens
- `@joolie-boolie/auth` - Auth utilities (token refresh, JWT verification)
- `@joolie-boolie/database` - Database utilities
- `@joolie-boolie/types` - Shared TypeScript types
- `@joolie-boolie/error-tracking` - Error logging

## Commands

```bash
# From monorepo root
pnpm dev:trivia        # Start dev server on port 3001

# From apps/trivia
pnpm dev               # Start dev server
pnpm build             # Build trivia app
pnpm test              # Run tests in watch mode
pnpm test:run          # Run tests once
pnpm test:coverage     # Run tests with coverage
```

## Routes

### Page Routes

| Route | Description |
|-------|-------------|
| `/play` | Presenter view (host controls) |
| `/display` | Audience view (projector/TV) |
| `/question-sets` | Question set management |
| `/auth/callback` | OAuth callback handler |

### API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth/logout` | POST | Logout and clear session |
| `/api/auth/token` | POST | Token exchange/refresh |
| `/api/templates` | GET, POST | Template CRUD |
| `/api/templates/[id]` | GET, PUT, DELETE | Template by ID |
| `/api/sessions` | POST | Create game session |
| `/api/sessions/[roomCode]` | GET | Get session by room code |
| `/api/presets` | GET, POST | Preset CRUD |
| `/api/presets/[id]` | GET, PUT, DELETE | Preset by ID |
| `/api/question-sets` | GET, POST | Question set CRUD |
| `/api/question-sets/[id]` | GET, PUT, DELETE | Question set by ID |
| `/api/question-sets/import` | POST | Import questions (CSV/JSON) |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Arrow Up/Down | Navigate questions |
| Space | Peek answer (local only, not shown on display) |
| D | Toggle display question on audience |
| N | Next round |
| P | Pause/Resume game |
| E | Emergency pause (blanks audience display) |
| R | Reset game |
| M | Mute/unmute TTS |
| T | Toggle scoreboard |
| ? | Help modal (keyboard shortcuts) |

## Architecture Notes

- **BFF Pattern:** Frontend never talks directly to Supabase. All requests go through API routes.
- **Game Engine:** Pure functions in `lib/game/engine.ts` transform `GameState`. Zustand store wraps these for React integration.
- **Buzz-In:** `lib/game/buzz-in.ts` handles buzz-in logic, exposed via `hooks/use-buzz-in.ts`
- **Timer:** `hooks/use-timer-auto-reveal.ts` manages countdown and auto-reveal behavior
- **Questions:** `lib/questions/` contains parser, validator, converter, exporter, and types for question import/export
- **Auth:** OAuth 2.1 via Platform Hub. OAuth client utilities in `lib/auth/` (oauth-client.ts, pkce.ts). Middleware-based JWT verification with lazy JWKS initialization.
- **Sync:** Session sync wrapper in `lib/sync/session.ts`, built on `@joolie-boolie/sync`

## Design Requirements

- **Accessible:** Large fonts (min 18px), high contrast, large click targets (min 44x44px)
- **Dual-screen:** Presenter dashboard + audience projection
- **Keyboard navigation:** Full keyboard support with shortcuts
- **Offline-capable:** PWA with service worker

## Testing

Tests are located alongside code in `__tests__` directories:
- `stores/__tests__/` - Store tests
- `hooks/__tests__/` - Hook tests
- `components/**/__tests__/` - Component tests

```bash
pnpm test             # Watch mode
pnpm test:run         # Single run
pnpm test:coverage    # With coverage
```

## Game Mechanics

- **Format:** 2-6 rounds (configurable), 3-10 questions per round
- **Question Types:** Multiple choice, True/False
- **Timing:** 30 seconds default (configurable), optional auto-start, auto-reveal
- **Scoring:** Hybrid - presenter records team answers, auto-scored
- **Correct Answers:** Can be amended on-the-fly with automatic re-scoring
- **Teams:** Up to 20 teams, default "Table N" naming (renameable)
- **Emergency Pause:** Blanks audience display for emergencies

## Future Work (TODO)

- [ ] Analytics/history tracking
