# @hosted-game-night/game-stats

Shared game statistics types, calculators, and localStorage storage for the Hosted Game Night platform. Also exports the base `GameStatus` type used by Bingo.

## Installation

```json
{
  "dependencies": {
    "@hosted-game-night/game-stats": "workspace:*"
  }
}
```

## Package Exports

| Specifier | Resolves to | Description |
|-----------|-------------|-------------|
| `.` | `src/index.ts` | Types (`GameStatus`, `BaseGameState`) + re-exported stats |
| `./types` | `src/stats/types.ts` | Statistics type definitions |
| `./calculator` | `src/stats/calculator.ts` | Stats calculation functions |
| `./storage` | `src/stats/storage.ts` | localStorage read/write helpers |

## Usage

### Statistics Types

```typescript
import type { BingoStatistics, BingoSessionRecord } from '@hosted-game-night/game-stats';
import type { TriviaStatistics, TriviaSessionRecord } from '@hosted-game-night/game-stats';
```

### Calculator Functions

```typescript
import {
  createEmptyBingoStats,
  calculateBingoStats,
  getMostCommonPatterns,
  formatDuration,
} from '@hosted-game-night/game-stats';

const stats = createEmptyBingoStats();
const formatted = formatDuration(stats.totalPlayTime);
```

### Storage Functions

```typescript
import {
  loadBingoStats,
  addBingoSession,
  clearBingoStats,
  generateSessionId,
} from '@hosted-game-night/game-stats';

const stats = loadBingoStats();
const updated = addBingoSession({ id: generateSessionId(), /* ... */ });
```

### Base Game Types

```typescript
import type { GameStatus, BaseGameState } from '@hosted-game-night/game-stats';

// GameStatus: 'idle' | 'playing' | 'paused' | 'ended'
// BaseGameState: { status: GameStatus; audioEnabled: boolean }
```

## API Reference

### Types (`./types`)

- `BaseGameStatistics` -- shared base (gamesPlayed, totalPlayTime, firstGameAt, lastGameAt)
- `BingoSessionRecord`, `BingoPatternStats`, `BingoStatistics`
- `TriviaSessionRecord`, `TriviaCategoryStats`, `TriviaStatistics`
- `STORAGE_KEYS` -- localStorage key constants (`hgn:bingo-statistics`, `hgn:trivia-statistics`)
- `MAX_RECENT_SESSIONS` -- cap on stored session records (20)

### Calculator (`./calculator`)

- `createEmptyBingoStats()`, `calculateBingoStats()`, `getMostCommonPatterns()`
- `createEmptyTriviaStats()`, `calculateTriviaStats()`, `getMostPopularCategories()`
- `formatDuration()` -- milliseconds to human-readable string

### Storage (`./storage`)

- `loadBingoStats()`, `saveBingoStats()`, `addBingoSession()`, `clearBingoStats()`
- `loadTriviaStats()`, `saveTriviaStats()`, `addTriviaSession()`, `clearTriviaStats()`
- `clearAllStats()`, `generateSessionId()`

## Design Notes

- **Trivia has its own GameStatus.** Trivia uses a 5-state type (`setup | playing | between_rounds | paused | ended`). The base 4-state `GameStatus` here is only used by Bingo.
- **State machines are per-app.** The deprecated `transition()` / `canTransition()` functions still exist in `src/index.ts` but are unused. Each app has its own state machine.
- **Stats module is the primary value.** The statistics types, calculators, and storage utilities are the main active exports consumed by both apps.
