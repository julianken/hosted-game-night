# CLAUDE.md - game-engine

Shared game types, deprecated state-machine helpers, and statistics module for the Joolie Boolie platform.

## Package Scope

`@joolie-boolie/game-engine`

## What This Package Provides

### Types (from `src/index.ts`)

| Export | Kind | Description |
|--------|------|-------------|
| `GameStatus` | type | `'idle' \| 'playing' \| 'paused' \| 'ended'` -- base 4-state enum. Bingo re-exports this; Trivia has its own 5-state variant. |
| `BaseGameState` | interface | `{ status: GameStatus; audioEnabled: boolean }` |
| `GameTransition` | type | `'START_GAME' \| 'PAUSE_GAME' \| 'RESUME_GAME' \| 'END_GAME' \| 'RESET_GAME'` |

### Deprecated Functions (from `src/index.ts`)

| Export | Deprecated? | Reason |
|--------|-------------|--------|
| `transition()` | Yes | Each game app implements its own state machine. Not used by any current app. |
| `canTransition()` | Yes | Each game app implements its own state machine. Not used by any current app. |

### Statistics Module (from `src/stats/`)

Provides localStorage-backed statistics tracking for both Bingo and Trivia.

**Types** (`src/stats/types.ts`):
- `BaseGameStatistics` -- shared base (gamesPlayed, totalPlayTime, firstGameAt, lastGameAt)
- `BingoSessionRecord`, `BingoPatternStats`, `BingoStatistics`
- `TriviaSessionRecord`, `TriviaCategoryStats`, `TriviaStatistics`
- `STORAGE_KEYS` -- localStorage key constants (`jb:bingo-statistics`, `jb:trivia-statistics`)
- `MAX_RECENT_SESSIONS` -- cap on stored session records (20)

**Calculator** (`src/stats/calculator.ts`):
- `createEmptyBingoStats()`, `calculateBingoStats()`, `getMostCommonPatterns()`
- `createEmptyTriviaStats()`, `calculateTriviaStats()`, `getMostPopularCategories()`
- `formatDuration()` -- milliseconds to human-readable string

**Storage** (`src/stats/storage.ts`):
- `loadBingoStats()`, `saveBingoStats()`, `addBingoSession()`, `clearBingoStats()`
- `loadTriviaStats()`, `saveTriviaStats()`, `addTriviaSession()`, `clearTriviaStats()`
- `clearAllStats()`, `generateSessionId()`

## Package Exports (package.json)

| Specifier | Resolves to |
|-----------|-------------|
| `.` | `src/index.ts` (types + deprecated functions + re-exported stats) |
| `./types` | `src/stats/types.ts` |
| `./calculator` | `src/stats/calculator.ts` |
| `./storage` | `src/stats/storage.ts` |

## Key Design Decisions

- **Trivia has its own GameStatus.** Trivia uses a 5-state `'setup' | 'playing' | 'between_rounds' | 'paused' | 'ended'` type. Do NOT attempt to unify it with the 4-state base type.
- **State machines are per-app.** Bingo uses `lib/game/state-machine.ts`; Trivia uses its own. The generic `transition()` / `canTransition()` functions here are unused and deprecated.
- **Stats module is the primary value.** The statistics types, calculators, and storage utilities are the main active exports consumed by both apps.
