# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Beak Bingo** - A cloud-based, web-accessible Bingo system designed for retirement communities. Replaces USB-based solutions with a modern PWA that works offline, supports dual-screen presentation (presenter controls + audience display), and provides admin accounts for saved configurations.

**Current State:** Fully functional with audio, patterns, themes, and dual-screen sync.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| Frontend | React + Tailwind CSS |
| Backend (BFF) | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | OAuth 2.1 via Platform Hub |
| State Management | Zustand |
| PWA | Serwist (Service Worker) |
| Hosting | Vercel |

## Implemented Features

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
- Roll sounds: Metal Cage, Tumbler, Lottery Ball
- Roll duration options: 1s, 2s, 3s (varies by sound type)
- Reveal chimes: Optional chime when ball is revealed
- Separate volume controls: Voice, Roll Sound, Chime
- Web Speech API fallback for TTS
- Audio pooling to prevent memory leaks

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
- BroadcastChannel API for same-device sync
- Message types: `GAME_STATE_UPDATE`, `BALL_CALLED`, `GAME_RESET`, `PATTERN_CHANGED`, `REQUEST_SYNC`

### PWA Support
- Service worker with Serwist
- Voice pack audio caching
- Roll sound caching
- Offline-capable game play
- Cache management hooks

### Fullscreen Mode
- Fullscreen toggle for audience display
- Keyboard shortcut support

### Room Creation Flow
- **Online Mode:** Create room with Supabase session, generates 4-digit PIN (1000-9999)
- **Offline Mode:** Local-only session with 6-character session ID (no ambiguous chars: 0, O, 1, I)
- **Join Room:** Enter room code and 4-digit PIN to join existing session
- **Session Recovery:** Automatic recovery from localStorage on page refresh
- **Create New Game:** Clear current session and start fresh (with confirmation if game active)

#### PIN Generation
- Uses `crypto.getRandomValues()` for cryptographic security (no `Math.random()`)
- 4-digit PINs: Range 1000-9999 (9000 possible values)
- Stored in localStorage key: `bingo_pin`
- Persists across page refreshes for session recovery

#### Offline Session IDs
- 6-character alphanumeric IDs (uppercase)
- Character set: `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (32 chars, excludes 0/O/1/I)
- Stored in localStorage key: `bingo_offline_session_id`
- Session data stored in key: `bingo_offline_session_{sessionId}`
- Total possibilities: 32^6 = 1,073,741,824

#### localStorage Schema
```typescript
// PIN storage
localStorage.setItem('bingo_pin', '1234');

// Offline session ID
localStorage.setItem('bingo_offline_session_id', 'A3B7K9');

// Offline session data
localStorage.setItem('bingo_offline_session_A3B7K9', JSON.stringify({
  sessionId: 'A3B7K9',
  isOffline: true,
  gameState: { /* serialized game state */ },
  createdAt: '2024-01-20T12:00:00.000Z',
  lastUpdated: '2024-01-20T12:30:00.000Z',
}));
```

## Architecture

Frontend never talks directly to Supabase. All requests go through API routes (BFF pattern).

**Dual-Screen System:**
- Presenter window (controls): Game controls, pattern selector, speed control, audio toggle
- Audience window (projection): Large ball display, full bingo board, winning pattern
- Sync via BroadcastChannel API for same-device window communication

## Key Commands

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

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Roll next ball |
| P | Pause/Resume game |
| R | Reset game |
| U | Undo last call |
| M | Mute/unmute audio |

## Project Structure

```
src/
├── app/
│   ├── api/health/    # Health check endpoint
│   ├── play/          # Presenter view (page.tsx)
│   ├── display/       # Audience view (page.tsx)
│   └── layout.tsx     # Root layout with theme provider
├── components/
│   ├── presenter/     # ControlPanel, PatternSelector, BallDisplay, ThemeSelector, etc.
│   ├── audience/      # AudienceBallDisplay, AudienceBoard
│   └── ui/            # Button, Modal, Toggle, Card, Toast, etc.
├── contexts/          # React contexts
├── hooks/
│   ├── use-game.ts    # Game state + keyboard shortcuts
│   ├── use-audio.ts   # Audio playback hook
│   ├── use-sync.ts    # Dual-screen sync hook
│   ├── use-theme.ts   # Theme management
│   ├── use-fullscreen.ts
│   ├── use-online-status.ts
│   └── use-sw-cache.ts
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

## Design Requirements

- **Senior-friendly:** Large fonts (min 18px body), high contrast, large click targets (min 44x44px)
- **Audience display:** Optimized for projector/large TV, readable from back of room
- **Keyboard shortcuts:** Space=roll, P=pause, R=reset, U=undo, M=mute

## Testing

Tests are located alongside the code in `__tests__` directories:
- `stores/__tests__/` - Store tests
- `hooks/__tests__/` - Hook tests
- `components/**/__tests__/` - Component tests
- `lib/game/__tests__/` - Engine tests
- `app/api/**/__tests__/` - API route tests

Run with:
```bash
pnpm test             # Watch mode
pnpm test:run         # Single run
pnpm test:coverage    # With coverage
```

## Future Work (TODO)

- [x] User authentication (OAuth 2.1 via Platform Hub)
- [ ] Saved game templates
- [ ] Pattern editor
- [ ] Voice pack selection UI improvements
- [ ] Analytics/history tracking
