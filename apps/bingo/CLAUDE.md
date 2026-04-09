# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Bingo** - A cloud-based, web-accessible Bingo system designed for groups and communities. Replaces USB-based solutions with a modern PWA that works offline, supports dual-screen presentation (presenter controls + audience display), and provides admin accounts for saved configurations.

**Current State:** Fully functional with audio, patterns, themes, and dual-screen sync.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| Frontend | React + Tailwind CSS |
| State Management | Zustand (localStorage persistence) |
| PWA | Serwist (Service Worker) |
| Hosting | Vercel |

## Features

### Game Engine
- 75-ball format: B:1-15, I:16-30, N:31-45, G:46-60, O:61-75
- Free space in center (automatic)
- Pure function-based state management (`lib/game/engine.ts`)
- State machine for game status transitions (`lib/game/state-machine.ts`)
- Ball deck with Fisher-Yates shuffle (`lib/game/ball-deck.ts`)

### Patterns (29 patterns across 7 categories)
- **Lines (12):** 5 rows, 5 columns, 2 diagonals
- **Corners (1):** Four Corners
- **Frames (2):** Large Frame, Small Frame
- **Shapes (4):** X Pattern, Diamond, Heart, Cross
- **Letters (2):** T, L
- **Coverage (5):** 4 postage stamps (corners), Blackout
- **Combinations (3):** Corners + Row/Column/Diagonal

### Audio System
- Voice packs: Standard, Standard (Hall), British Slang, British Slang (Hall)
- Hall reverb variants for ambient sound
- Roll sounds: Metal Cage, Plastic Cage, Plastic Swirl, Lottery Balls
- Roll durations: 2s, 4s, 6s, 8s (Plastic Cage supports 2s and 4s only)
- Reveal chimes: Optional chime when ball is revealed
- Separate volume controls: Voice, Roll Sound, Chime
- Web Speech API fallback for TTS
- Audio pooling to prevent memory leaks
- Audio logic in `hooks/use-audio.ts` and `stores/audio-store.ts`

### Theme System
- Light/Dark/System mode
- 10+ color themes
- Persisted preferences
- Smooth transitions

### Auto-Call
- Enable/disable auto-call mode
- Speed: 5-30 seconds (configurable)
- Proper cleanup on disable/pause

### Dual-Screen Sync
- Presenter view (`/play`): Game controls, pattern selector, audio settings
- Audience view (`/display`): Large ball display, bingo board, pattern visualization
- BroadcastChannel API for same-device sync via `@joolie-boolie/sync`
- Message types: `GAME_STATE_UPDATE`, `BALL_CALLED`, `GAME_RESET`, `PATTERN_CHANGED`, `REQUEST_SYNC`

### PWA Support
- Service worker with Serwist
- Voice pack audio caching
- Roll sound caching
- Offline-capable game play
- Cache management hooks

## Shared Packages

- `@joolie-boolie/sync` - Dual-screen synchronization
- `@joolie-boolie/ui` - Shared UI components
- `@joolie-boolie/theme` - Accessible design tokens
- `@joolie-boolie/audio` - Shared audio utilities
- `@joolie-boolie/game-stats` - Game statistics types and calculators
- `@joolie-boolie/types` - Shared TypeScript types
- `@joolie-boolie/error-tracking` - Error logging

## Commands

```bash
# From monorepo root
pnpm dev:bingo        # Start dev server on port 3000

# From apps/bingo
pnpm dev              # Start dev server
pnpm build            # Build the app
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once
pnpm test:coverage    # Run tests with coverage
```

## Routes

### Page Routes

| Route | Description |
|-------|-------------|
| `/play` | Presenter view (host controls) |
| `/display` | Audience view (projector/TV) |

### API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/csp-report` | POST | CSP violation report endpoint |
| `/api/monitoring-tunnel` | POST | Sentry/OTel monitoring tunnel |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Roll next ball |
| P | Pause/Resume game |
| R | Reset game |
| U | Undo last call |
| M | Mute/unmute audio |

## Architecture Notes

- **Standalone:** No backend or auth. All data (templates, settings) stored in localStorage.
- **Templates:** Stored in localStorage via `useBingoTemplateStore` (key: `jb-bingo-templates`).
- **Game Engine:** Pure functions in `lib/game/engine.ts` transform `GameState`. Zustand store wraps these for React integration.
- **Middleware:** Passthrough -- no auth verification (`middleware.ts` returns `NextResponse.next()`).
- **Audio:** Audio logic lives in `hooks/use-audio.ts` and `stores/audio-store.ts`. The `lib/audio/` directory is a placeholder (`.gitkeep` only).
- **Sync:** Session ID generation and BroadcastChannel naming in `lib/sync/session.ts`, built on `@joolie-boolie/sync`
- **Patterns:** 29 patterns defined in `lib/game/patterns/` across 7 category files using `createPattern()`

## Design Requirements

- **Accessible:** Large fonts (min 18px body), high contrast, large click targets (min 44x44px)
- **Audience display:** Optimized for projector/large TV, readable from back of room
- **Keyboard shortcuts:** Space=roll, P=pause, R=reset, U=undo, M=mute

## Testing

Tests are located alongside code in `__tests__` directories:
- `stores/__tests__/` - Store tests
- `hooks/__tests__/` - Hook tests
- `components/**/__tests__/` - Component tests
- `lib/game/__tests__/` - Engine tests
- `app/api/**/__tests__/` - API route tests

```bash
pnpm test             # Watch mode
pnpm test:run         # Single run
pnpm test:coverage    # With coverage
```

## Future Work (TODO)

- [ ] Pattern editor
- [ ] Voice pack selection UI improvements
- [ ] Analytics/history tracking

## Update Triggers

When modifying any of the files below, update the corresponding section in this CLAUDE.md.

| Source File | Doc Section to Update | What to Check |
|-------------|----------------------|---------------|
| `src/hooks/use-game.ts` (keyboard section) | Keyboard Shortcuts | New/changed/removed key handlers |
| `src/app/api/**` | API Routes (under Routes) | New/renamed/removed route directories |
| `src/hooks/use-audio.ts` | Audio System (under Features) | Changed audio patterns, new sounds |
| `src/lib/game/patterns/**` | Patterns (under Features) | New/modified bingo patterns |
| `src/stores/game-store.ts` | Architecture Notes | State transitions, new states |
| `package.json` | Tech Stack | Major version bumps, new dependencies |
