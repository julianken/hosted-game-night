# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Trivia** - A presenter-controlled trivia system for groups and communities. Part of the Joolie Boolie monorepo.

**Current State:** Fully functional with team management, rounds, scoring, TTS, themes, and dual-screen sync.

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

## Implemented Features

### Game Engine
- Multi-round trivia with configurable rounds and questions
- Team management (add, remove, rename teams)
- Score tracking with manual adjustments
- Question navigation and display control
- Round completion and progression
- Pure function-based state management (`lib/game/engine.ts`)

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

### Audio/TTS System
- Text-to-speech for questions and answers
- Voice selection from available browser voices
- Configurable rate, pitch, volume
- Convenience methods: announceQuestion, announceAnswer, announceScores, etc.
- Web Speech API integration

### Theme System
- Light/Dark/System mode
- 10+ color themes
- Persisted preferences
- Smooth transitions

### Dual-Screen Sync
- Presenter view (`/play`): Question list, team manager, scoring, controls
- Audience view (`/display`): Large question display, scoreboard, waiting screen
- BroadcastChannel API for same-device sync
- Emergency pause (blanks audience display)

### PWA Support
- Service worker with Serwist
- Offline-capable
- Cache management

### Fullscreen Mode
- Fullscreen toggle for audience display
- Keyboard shortcut support

## Monorepo Structure

This app uses shared packages from the monorepo:
- `@joolie-boolie/sync` - Dual-screen synchronization
- `@joolie-boolie/ui` - Shared UI components (Button, Toggle, Slider)
- `@joolie-boolie/theme` - Accessible design tokens
- `@joolie-boolie/auth` - Auth utilities (token refresh, JWT verification)

## Key Commands

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

## Project Structure

```
src/
├── app/
│   ├── play/          # Presenter view (page.tsx)
│   ├── display/       # Audience view (page.tsx)
│   ├── sw.ts          # Service worker (@serwist/turbopack)
│   └── layout.tsx     # Root layout with theme provider
├── components/
│   ├── presenter/     # QuestionDisplay, QuestionList, TeamManager, TeamScoreboard, etc.
│   ├── audience/      # AudienceQuestionDisplay, AudienceScoreboard, WaitingDisplay, etc.
│   └── ui/            # KeyboardShortcutsModal
├── hooks/
│   ├── use-game.ts    # Game state hook
│   ├── use-game-keyboard.ts # Keyboard shortcuts
│   ├── use-sync.ts    # Dual-screen sync hook
│   ├── use-tts.ts     # Text-to-speech hook
│   ├── use-theme.ts   # Theme management
│   └── use-fullscreen.ts
├── lib/
│   └── game/          # engine.ts (pure functions)
├── stores/
│   ├── game-store.ts  # Zustand game state
│   ├── audio-store.ts # Zustand audio/TTS state (persisted)
│   ├── sync-store.ts  # Zustand sync state
│   ├── theme-store.ts # Zustand theme state (persisted)
│   └── settings-store.ts
├── types/             # TypeScript types
└── test/              # Test utilities and mocks
```

## Game Mechanics (MVP)

- **Format:** 2-6 rounds (configurable), 3-10 questions per round
- **Question Types:** Multiple choice, True/False (MVP only)
- **Timing:** 30 seconds default (configurable), optional auto-start
- **Scoring:** Hybrid - presenter records team answers, auto-scored
- **Correct Answers:** Can be amended on-the-fly with automatic re-scoring
- **Teams:** Up to 20 teams, default "Table N" naming (renameable)
- **Emergency Pause:** Blanks audience display for emergencies

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Arrow Up/Down | Navigate questions |
| Space | Peek answer (local only, not shown on display) |
| D | Toggle display question on audience |
| P | Pause/Resume game |
| E | Emergency pause (blanks audience display) |
| R | Reset game |

## Design Requirements

- **Accessible:** Large fonts (min 18px), high contrast, large click targets (min 44x44px)
- **Dual-screen:** Presenter dashboard + audience projection
- **Accessible:** Keyboard navigation, screen reader support
- **Offline-capable:** PWA with service worker

## Testing

Tests are located alongside the code in `__tests__` directories:
- `stores/__tests__/` - Store tests
- `hooks/__tests__/` - Hook tests
- `components/**/__tests__/` - Component tests

Run with:
```bash
pnpm test             # Watch mode
pnpm test:run         # Single run
pnpm test:coverage    # With coverage
```

## Completed Features

- ✅ Question import from file (CSV/JSON) - Full parser with drag-drop UI
- ✅ Question categories - 7 predefined categories with filtering UI
- ✅ Saved game templates - Complete CRUD API + template selector UI
- ✅ User authentication - OAuth 2.1 with middleware protection

## Future Work (TODO)

- [ ] Question timer with auto-reveal
- [ ] Analytics/history tracking
