# CLAUDE.md - game-stats

Shared game statistics module and base types for the Hosted Game Night platform.

## Package Scope

`@hosted-game-night/game-stats`

## What This Package Provides

### Types (from `src/index.ts`)

| Export | Kind | Description |
|--------|------|-------------|
| `GameStatus` | type | `'idle' \| 'playing' \| 'paused' \| 'ended'` -- base 4-state enum. Bingo re-exports this; Trivia has its own 5-state variant. |
| `BaseGameState` | interface | `{ status: GameStatus; audioEnabled: boolean }` |
| `GameTransition` | type | `'START_GAME' \| 'PAUSE_GAME' \| 'RESUME_GAME' \| 'END_GAME' \| 'RESET_GAME'` |

### Statistics Module (from `src/stats/`)

Provides localStorage-backed statistics tracking for both Bingo and Trivia.

**Types** (`src/stats/types.ts`):
- `BaseGameStatistics` -- shared base (gamesPlayed, totalPlayTime, firstGameAt, lastGameAt)
- `BingoSessionRecord`, `BingoPatternStats`, `BingoStatistics`
- `TriviaSessionRecord`, `TriviaCategoryStats`, `TriviaStatistics`
- `STORAGE_KEYS` -- localStorage key constants (`hgn:bingo-statistics`, `hgn:trivia-statistics`)
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
- **State machines are per-app.** Bingo uses `lib/game/state-machine.ts`; Trivia uses its own. The deprecated `transition()` / `canTransition()` functions in `src/index.ts` are unused.
- **Stats module is the primary value.** The statistics types, calculators, and storage utilities are the main active exports consumed by both apps.
