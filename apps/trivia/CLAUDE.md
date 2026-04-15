# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Trivia** - A presenter-controlled trivia system for groups and communities. Part of the Hosted Game Night monorepo.

**Current State:** Fully functional with team management, rounds, scoring, TTS, timer auto-reveal, presets, themes, and dual-screen sync.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| Frontend | React + Tailwind CSS |
| Backend | Next.js API Routes (trivia-api proxy only) |
| State Management | Zustand (localStorage persistence) |
| Dual-Screen Sync | @hosted-game-night/sync |
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

### Timer & Auto-Reveal
- Configurable question timer with countdown display
- Auto-reveal answer when timer expires
- Presenter timer display (`components/presenter/TimerDisplay.tsx`)
- Timer hook: `hooks/use-timer-auto-reveal.ts`

### Question Import
- Fetch from Trivia API, upload JSON file, or create manually
- All import methods load questions directly into the game
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
- Audience view (`/display`): Large question display, scoreboard, waiting screen
- BroadcastChannel API for same-device sync via `@hosted-game-night/sync`
- Emergency blank (blanks audience display, visual only)

### PWA Support
- Service worker with Serwist
- Offline-capable
- Cache management

### Templates
- Saved game templates in localStorage
- Template selector UI for quick game setup

## Shared Packages

- `@hosted-game-night/sync` - Dual-screen synchronization
- `@hosted-game-night/ui` - Shared UI components
- `@hosted-game-night/theme` - Accessible design tokens
- `@hosted-game-night/audio` - Shared audio utilities
- `@hosted-game-night/game-stats` - Game statistics types and calculators
- `@hosted-game-night/types` - Shared TypeScript types
- `@hosted-game-night/error-tracking` - Error logging

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

### API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/csp-report` | POST | CSP violation report endpoint |
| `/api/monitoring-tunnel` | POST | Sentry/OTel monitoring tunnel |
| `/api/trivia-api/categories` | GET | List trivia question categories (proxy) |
| `/api/trivia-api/questions` | GET | Fetch trivia questions (proxy) |

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| Arrow Up | Navigate to previous question | Always |
| Arrow Down | Navigate to next question | Always |
| Arrow Left | Backward navigation in between-rounds flow: `recap_qa` → previous question (or back to `round_scoring` at Q1); `round_scoring` → `round_summary`; `recap_scores` → `recap_qa` (last question, answer face) | `between_rounds` + `recap_qa`, `round_scoring`, or `recap_scores` |
| Arrow Right | Advance scene | Always |
| Space | Toggle display question on audience | Always |
| P | Peek answer (local only) | Always |
| N | Next round | `between_rounds`: `round_summary`, `recap_qa`, `round_scoring`, `recap_scores` |
| E | Toggle emergency blank (visual only) | `playing` or `between_rounds` |
| R | New game (with confirmation) | `playing`, `between_rounds`, `ended` (no-op during `setup`) |
| M | Mute/unmute TTS | Always |
| T | Start timer / Toggle scoreboard | `question_display`: starts timer; `question_anticipation`: starts timer + advances to `question_display`; otherwise: toggle scoreboard |
| S | Close question | `question_display` or `question_closed` |
| Enter | Skip timed scene | Always except `round_scoring` (blocked; use Right Arrow to advance) |
| F | Toggle fullscreen | Always |
| 1-9, 0 | Quick score: toggle point for team N | Scoring phases: `question_closed`, `answer_reveal`, `round_summary`, `round_scoring`, `recap_*` |
| Shift+1-9 | Remove point from team N | Scoring phases |
| Ctrl/Cmd+Z | Undo last score action | Scoring phases except `round_scoring` (panel owns undo in that scene) |
| ? | Show help modal | Always |

## Architecture Notes

- **Standalone:** No backend or auth. All data stored in localStorage.
- **localStorage Stores:**
  - `useTriviaTemplateStore` (key: `hgn-trivia-templates`) -- saved game templates
  - `useTriviaPresetStore` (key: `hgn-trivia-presets`) -- game configuration presets
- **Game Engine:** Pure functions in `lib/game/engine.ts` transform `GameState`. Zustand store wraps these for React integration. Engine logic is split across multiple modules in `lib/game/` (engine.ts, scene.ts, etc.) re-exported via barrel pattern.
- **Timer:** `hooks/use-timer-auto-reveal.ts` manages countdown and auto-reveal behavior
- **Questions:** `lib/questions/` contains parser, validator, converter, exporter, and types for question import/export
- **Trivia API Proxy:** `/api/trivia-api/*` routes proxy requests to The Trivia API, keeping the API key server-side.
- **Sync:** Session sync wrapper in `lib/sync/session.ts`, built on `@hosted-game-night/sync`
- **Session Persistence (BEA-722):** `useGameStore` persists to localStorage key `hgn-trivia-game` (version `1`). Persisted fields: `status`, `teams`, `questions`, `teamAnswers`, `selectedQuestionIndex`, `currentRound`, `totalRounds`, `settings`, `ttsEnabled`, `showScoreboard`, `questionStartScores`, `roundScoringEntries`, `roundScoringSubmitted`, `scoreDeltas`, `recapShowingAnswer`. Transient/display state (`audienceScene`, `revealPhase`, `emergencyBlank`, `_isHydrating`, actions) is excluded. The rehydration race guard (`_isHydrating`) is raised to `true` in both `merge` and `_hydrate`, held so `use-sync.ts` skips any broadcast triggered during the merge, then cleared via `setTimeout(0)` in `onRehydrateStorage`/after `_hydrate`.

### Scene Engine (AudienceScene)

The AudienceScene system is a visual routing layer orthogonal to the 4-state GameStatus engine (`setup`, `playing`, `between_rounds`, `ended`). It controls what the audience display renders without changing game state.

**16 scene values:** `waiting`, `game_intro`, `round_intro`, `question_anticipation`, `question_display`, `question_closed`, `answer_reveal`, `round_summary`, `recap_title`, `recap_qa`, `round_scoring`, `recap_scores`, `final_buildup`, `final_podium`, `paused`, `emergency_blank`

**Core files:**
- `types/audience-scene.ts` — `AudienceScene` type, timing constants, scene validity maps
- `lib/game/scene.ts` — `getNextScene()` state machine, scene triggers, transition logic
- `hooks/use-audience-scene.ts` — React hook for scene state and auto-advance timers
- `components/audience/scenes/SceneRouter.tsx` — Routes `audienceScene` value to the correct display component

**Scene transitions** flow through `store.advanceScene(trigger)` which calls `getNextScene()` as the single source of truth. Keyboard handlers dispatch triggers (e.g., `SCENE_TRIGGERS.ADVANCE`, `SCENE_TRIGGERS.SKIP`), never set scenes directly — except E (emergency blank) and R (reset) which bypass the state machine.

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

- **Format:** 1-6 rounds (configurable), 3-10 questions per round
- **Question Types:** Multiple choice, True/False
- **Timing:** 30 seconds default (configurable), optional auto-start, auto-reveal
- **Scoring:** Hybrid - presenter records team answers, auto-scored
- **Correct Answers:** Can be amended on-the-fly with automatic re-scoring
- **Teams:** Up to 20 teams, default "Table N" naming (renameable)
- **Emergency Blank:** Blanks audience display for emergencies (visual only, doesn't change game status)

## Future Work (TODO)

- [ ] Analytics/history tracking

## Update Triggers

When modifying any of the files below, update the corresponding section in this CLAUDE.md.

| Source File | Doc Section to Update | What to Check |
|-------------|----------------------|---------------|
| `src/hooks/use-game-keyboard.ts` | Keyboard Shortcuts | New/changed/removed key handlers |
| `src/app/api/**` | API Routes (under Routes) | New/renamed/removed route directories |
| `src/types/audience-scene.ts` | Scene Engine section (under Architecture Notes) | Added/removed/renamed scene values |
| `src/stores/settings-store.ts` | Game Mechanics | Changed defaults, ranges, or options |
| `src/lib/game/**` engine modules | Architecture Notes | New modules, changed barrel exports |
| `package.json` | Tech Stack | Major version bumps, new dependencies |
