# @joolie-boolie/game-engine

Abstract game state machine for the Joolie Boolie. Provides a generic foundation for game state management that individual games can extend.

## Installation

```json
{
  "dependencies": {
    "@joolie-boolie/game-engine": "workspace:*"
  }
}
```

## Usage

### Basic State Transitions

```typescript
import { transition, canTransition, type GameStatus } from '@joolie-boolie/game-engine';

// Check if a transition is valid
if (canTransition('idle', 'START_GAME')) {
  const newStatus = transition('idle', 'START_GAME');
  // newStatus = 'playing'
}

// Invalid transitions return the current state
const status = transition('idle', 'PAUSE_GAME');
// status = 'idle' (can't pause when not playing)
```

### Game Status Values

| Status | Description |
|--------|-------------|
| `idle` | Game not started or has been reset |
| `playing` | Game is actively in progress |
| `paused` | Game is temporarily paused |
| `ended` | Game has concluded |

### Valid Transitions

| From | Action | To |
|------|--------|-----|
| `idle` | `START_GAME` | `playing` |
| `playing` | `PAUSE_GAME` | `paused` |
| `paused` | `RESUME_GAME` | `playing` |
| `playing` | `END_GAME` | `ended` |
| `paused` | `END_GAME` | `ended` |
| any | `RESET_GAME` | `idle` |

## Extending for Your Game

Each game app extends the base types with game-specific state:

```typescript
// apps/my-game/src/types/index.ts
import type { GameStatus, BaseGameState } from '@joolie-boolie/game-engine';

// Extend the base game state
export interface MyGameState extends BaseGameState {
  status: GameStatus;
  audioEnabled: boolean;
  // Add game-specific state
  score: number;
  currentRound: number;
  players: Player[];
}

// Define game-specific actions
export type MyGameAction =
  | { type: 'ADD_SCORE'; playerId: string; points: number }
  | { type: 'NEXT_ROUND' }
  | { type: 'SKIP_TURN' };
```

### Creating a Game Engine

```typescript
// apps/my-game/src/lib/game/engine.ts
import { transition, canTransition, type GameStatus } from '@joolie-boolie/game-engine';
import type { MyGameState, MyGameAction } from '@/types';

export function createInitialState(): MyGameState {
  return {
    status: 'idle',
    audioEnabled: true,
    score: 0,
    currentRound: 1,
    players: [],
  };
}

export function startGame(state: MyGameState): MyGameState {
  if (!canTransition(state.status, 'START_GAME')) {
    return state;
  }

  return {
    ...state,
    status: transition(state.status, 'START_GAME'),
    score: 0,
    currentRound: 1,
  };
}

export function addScore(state: MyGameState, playerId: string, points: number): MyGameState {
  if (state.status !== 'playing') {
    return state;
  }

  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, score: p.score + points } : p
    ),
  };
}

export function resetGame(state: MyGameState): MyGameState {
  return {
    ...createInitialState(),
    audioEnabled: state.audioEnabled, // Preserve settings
  };
}
```

### Integrating with Zustand

```typescript
// apps/my-game/src/stores/game-store.ts
import { create } from 'zustand';
import * as engine from '@/lib/game/engine';
import type { MyGameState } from '@/types';

interface GameStore extends MyGameState {
  startGame: () => void;
  addScore: (playerId: string, points: number) => void;
  resetGame: () => void;
  toggleAudio: () => void;
}

export const useGameStore = create<GameStore>()((set) => ({
  ...engine.createInitialState(),

  startGame: () => set((state) => engine.startGame(state)),
  addScore: (playerId, points) => set((state) => engine.addScore(state, playerId, points)),
  resetGame: () => set((state) => engine.resetGame(state)),
  toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),
}));
```

## API Reference

### Types

```typescript
// Game status
type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';

// Base state interface all games extend
interface BaseGameState {
  status: GameStatus;
  audioEnabled: boolean;
}

// Available transitions
type GameTransition =
  | 'START_GAME'
  | 'PAUSE_GAME'
  | 'RESUME_GAME'
  | 'END_GAME'
  | 'RESET_GAME';
```

### Functions

#### `transition(current: GameStatus, action: GameTransition): GameStatus`

Apply a state transition. Returns the new status if the transition is valid, otherwise returns the current status unchanged.

```typescript
transition('idle', 'START_GAME');  // 'playing'
transition('idle', 'PAUSE_GAME');  // 'idle' (invalid)
```

#### `canTransition(current: GameStatus, action: GameTransition): boolean`

Check if a transition is valid from the current state.

```typescript
canTransition('idle', 'START_GAME');   // true
canTransition('idle', 'PAUSE_GAME');   // false
canTransition('playing', 'END_GAME');  // true
```

## Design Philosophy

The game engine follows a **pure function** approach:

1. **Immutable State**: Engine functions never mutate state; they return new state objects
2. **Pure Functions**: No side effects; same inputs always produce same outputs
3. **Composable**: Small, focused functions that can be combined
4. **Testable**: Easy to test without mocking

This pattern works well with Zustand, which manages reactivity while the engine handles state logic.
