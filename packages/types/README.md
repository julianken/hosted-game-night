# @hosted-game-night/types

**Status:** Production Ready

Shared TypeScript definitions for the Hosted Game Night monorepo. Provides a small, well-scoped surface of theme, sync, and branded types that are used across apps and packages.

## Features

- Theme mode type for the light/dark/system selector
- Generic sync message types for the dual-screen system
- Branded primitive types for compile-time safety (ball numbers, team IDs, question IDs)
- Zero runtime dependencies

## Installation

```json
{
  "dependencies": {
    "@hosted-game-night/types": "workspace:*"
  }
}
```

## Quick Start

### 1. Theme Mode

```typescript
import type { ThemeMode } from '@hosted-game-night/types';

const mode: ThemeMode = 'dark'; // 'light' | 'dark' | 'system'
```

### 2. Generic Sync Messages

```typescript
import type { SyncMessage } from '@hosted-game-night/types';

// Define custom message types
type BingoSyncMessage =
  | SyncMessage<'BALL_CALLED', { number: number }>
  | SyncMessage<'PATTERN_CHANGED', { patternId: string }>
  | SyncMessage<'GAME_RESET', null>;

// Send a sync message
function sendBallCalled(number: number) {
  const message: SyncMessage<'BALL_CALLED', { number: number }> = {
    type: 'BALL_CALLED',
    payload: { number },
    timestamp: Date.now(),
    originId: 'presenter-1',
  };
  broadcastChannel.postMessage(message);
}

// Handle incoming messages
function handleMessage(message: BingoSyncMessage) {
  switch (message.type) {
    case 'BALL_CALLED':
      console.log(`Ball ${message.payload.number} was called`);
      break;
    case 'PATTERN_CHANGED':
      console.log(`Pattern changed to ${message.payload.patternId}`);
      break;
    case 'GAME_RESET':
      console.log('Game reset');
      break;
  }
}
```

### 3. Branded Types

```typescript
import type { BallNumber, TeamId, QuestionId } from '@hosted-game-night/types';
import { makeBallNumber, makeTeamId, makeQuestionId } from '@hosted-game-night/types';

const ball: BallNumber = makeBallNumber(42); // throws if out of 1..75 range
const team: TeamId = makeTeamId('team-alpha');
const question: QuestionId = makeQuestionId('q-1');
```

## API Reference

### Theme Types

#### `ThemeMode`
```typescript
type ThemeMode = 'light' | 'dark' | 'system';
```
Theme mode for the application. Consumed by `packages/ui` theme components.

### Sync Types

#### `SyncRole`
```typescript
type SyncRole = 'presenter' | 'audience';
```
Sync role in the dual-screen system:
- **presenter**: Controls the game, broadcasts state changes
- **audience**: Receives and displays state from presenter

#### `ConnectionState`
```typescript
type ConnectionState = 'disconnected' | 'connected' | 'error';
```
Connection state for the broadcast channel.

#### `BaseSyncMessageType`
```typescript
type BaseSyncMessageType =
  | 'STATE_UPDATE'
  | 'REQUEST_SYNC'
  | 'DISPLAY_THEME_CHANGED';
```
Base sync message types shared across all games. Games can extend with their own message types.

#### `SyncMessage<TType, TPayload>`
```typescript
interface SyncMessage<TType extends string = string, TPayload = unknown> {
  type: TType;
  payload: TPayload | null;
  timestamp: number;      // Unix milliseconds
  originId?: string;      // Unique identifier to prevent echo
}
```
Generic sync message wrapper for the dual-screen system.

**Example:**
```typescript
// Define game-specific messages
type TriviaSyncMessage =
  | SyncMessage<'QUESTION_REVEALED', { questionId: string }>
  | SyncMessage<'ANSWER_SHOWN', { questionId: string; answer: string }>
  | SyncMessage<'ROUND_STARTED', { roundNumber: number }>;

// Create a message
const message: SyncMessage<'QUESTION_REVEALED', { questionId: string }> = {
  type: 'QUESTION_REVEALED',
  payload: { questionId: 'q1' },
  timestamp: Date.now(),
  originId: 'presenter-window',
};
```

#### `ThemeSyncPayload`
```typescript
interface ThemeSyncPayload {
  theme: 'light' | 'dark' | 'system';
}
```
Payload for theme change sync messages.

#### `BaseSyncState`
```typescript
interface BaseSyncState {
  role: SyncRole | null;
  isConnected: boolean;
  lastSyncTimestamp: number | null;
  connectionError: string | null;
}
```
Base sync state shared across all games. Extend this for game-specific sync state.

**Example:**
```typescript
interface BingoSyncState extends BaseSyncState {
  currentPattern: string;
  ballsCalled: number[];
  lastBallNumber: number | null;
}
```

### Branded Types

#### `Branded<T, B>`
```typescript
type Branded<T, B> = T & { readonly __brand: B };
```
Nominal typing helper: a primitive type `T` tagged with brand `B` so two
branded types with the same underlying primitive are not assignable to each
other.

#### `BallNumber`
```typescript
type BallNumber = Branded<number, 'BallNumber'>;
```
Valid bingo ball number in the range `1..75`. Construct with `makeBallNumber(n)`
which throws on out-of-range input.

#### `TeamId`
```typescript
type TeamId = Branded<string, 'TeamId'>;
```
Trivia team identifier. Construct with `makeTeamId(id)`.

#### `QuestionId`
```typescript
type QuestionId = Branded<string, 'QuestionId'>;
```
Trivia question identifier. Construct with `makeQuestionId(id)`.

## Integration Status

| App/Package | Status | Usage |
|-------------|--------|-------|
| `apps/bingo` | Active | `BallNumber` branded type, sync message patterns |
| `apps/trivia` | Active | `TeamId`, `QuestionId` branded types |
| `packages/sync` | Active | Re-exports `SyncRole`, `ConnectionState`, `SyncMessage` |
| `packages/ui` | Active | Imports `ThemeMode` for theme components |

## Design Philosophy

### 1. Type Safety First
All types use strict TypeScript with no `any` types. Union types are preferred over
string literals for IDE autocomplete.

### 2. Minimal Shared Surface
Only types that are genuinely shared across multiple packages live here. Each app
owns its own domain types (game state, patterns, scoring) inside `apps/<app>/src/types/`.

### 3. Generic Types for Flexibility
The `SyncMessage<TType, TPayload>` type is generic, letting each game extend it with
specific payloads while keeping a consistent message envelope.

### 4. Nominal Types via Branding
The `Branded<T, B>` pattern is used to distinguish primitives that share the same
underlying type (for example, `BallNumber` vs raw `number`) without adding runtime overhead.

## Development

### Adding New Types

1. Add the type definition to the appropriate file:
   - `src/game.ts` - Theme-related types
   - `src/sync.ts` - Sync and dual-screen types
   - `src/branded.ts` - Branded primitive types

2. Export from `src/index.ts`:
```typescript
export type { MyNewType } from './game';
```

3. Add JSDoc documentation.

4. Update this README with the new type in the API Reference section.

### Testing Type Exports

```bash
pnpm typecheck
```
