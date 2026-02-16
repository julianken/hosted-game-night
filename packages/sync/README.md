# @joolie-boolie/sync

**Status:** ✅ Production Ready (100% Complete)

Dual-screen synchronization package for the Joolie Boolie. Provides BroadcastChannel-based communication between presenter and audience windows.

## Why Apps Have Their Own Implementations

While this package provides a generic `BroadcastSync<TPayload>` class, each game app (bingo, trivia) maintains its own sync implementation because:

1. **Game-specific message types**: Each game has unique events (e.g., bingo has `BALL_CALLED`, `PATTERN_CHANGED`; trivia has `QUESTION_REVEALED`, `TIMER_UPDATE`)
2. **Type safety**: App-specific implementations provide full TypeScript type checking for payloads
3. **Custom routing**: Each game needs different message handlers for its specific events
4. **Flexibility**: Games can add new message types without modifying the shared package

The shared package provides the **foundation** (generic broadcast, sync state management, hooks), while apps extend it with their specific message types and handlers.

## Installation

Already included in the monorepo. Add to your app's dependencies:

```json
{
  "dependencies": {
    "@joolie-boolie/sync": "workspace:*"
  }
}
```

## Usage

### Basic Setup (Generic)

```typescript
import { BroadcastSync, createSyncStore } from '@joolie-boolie/sync';

// Create a typed broadcast sync instance
interface MyGameState {
  score: number;
  players: string[];
}

const broadcastSync = new BroadcastSync<MyGameState>('my-game-channel');
broadcastSync.initialize();

// Send state updates
broadcastSync.broadcastState({ score: 100, players: ['Alice', 'Bob'] });

// Subscribe to messages
const unsubscribe = broadcastSync.subscribe((message) => {
  if (message.type === 'STATE_UPDATE' && message.payload) {
    console.log('New state:', message.payload);
  }
});

// Clean up
unsubscribe();
broadcastSync.close();
```

### Extending for a New Game

Create your own sync module in `lib/sync/broadcast.ts`:

```typescript
import type { MyGameState, SyncMessage, SyncMessageType } from '@/types';
import { getChannelName } from './session';

// Define game-specific message types in your types file:
// export type SyncMessageType =
//   | 'STATE_UPDATE'
//   | 'REQUEST_SYNC'
//   | 'SCORE_CHANGED'
//   | 'ROUND_STARTED';

export type MessageHandler = (message: SyncMessage) => void;

export class BroadcastSync {
  private channel: BroadcastChannel | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private isInitialized = false;
  private channelName: string;

  constructor(channelName: string) {
    this.channelName = channelName;
  }

  initialize(): boolean {
    if (this.isInitialized) return true;
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      return false;
    }

    try {
      this.channel = new BroadcastChannel(this.channelName);
      this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        this.notifyHandlers(event.data);
      };
      this.isInitialized = true;
      return true;
    } catch {
      return false;
    }
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  // Add game-specific broadcast methods
  broadcastState(state: MyGameState): void {
    this.send('STATE_UPDATE', state);
  }

  broadcastScoreChanged(teamId: string, newScore: number): void {
    this.send('SCORE_CHANGED', { teamId, newScore });
  }

  requestSync(): void {
    this.send('REQUEST_SYNC', null);
  }

  close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.handlers.clear();
    this.isInitialized = false;
  }

  get connected(): boolean {
    return this.isInitialized && this.channel !== null;
  }

  private send(type: SyncMessageType, payload: unknown): void {
    if (!this.channel) return;

    const message: SyncMessage = {
      type,
      payload,
      timestamp: Date.now(),
    };

    try {
      this.channel.postMessage(message);
    } catch {
      // Silently fail
    }
  }

  private notifyHandlers(message: SyncMessage): void {
    for (const handler of this.handlers) {
      try {
        handler(message);
      } catch {
        // Silently fail
      }
    }
  }
}

// Factory function with session-scoped channels
export function createMyGameBroadcastSync(sessionId: string): BroadcastSync {
  const channelName = getChannelName(sessionId);
  return new BroadcastSync(channelName);
}

// Message router for cleaner handler code
export function createMessageRouter(handlers: Partial<{
  onStateUpdate: (state: MyGameState) => void;
  onScoreChanged: (data: { teamId: string; newScore: number }) => void;
  onSyncRequest: () => void;
}>): MessageHandler {
  return (message: SyncMessage) => {
    switch (message.type) {
      case 'STATE_UPDATE':
        handlers.onStateUpdate?.(message.payload as MyGameState);
        break;
      case 'SCORE_CHANGED':
        handlers.onScoreChanged?.(message.payload as { teamId: string; newScore: number });
        break;
      case 'REQUEST_SYNC':
        handlers.onSyncRequest?.();
        break;
    }
  };
}
```

### Using the Sync Store

The package provides a Zustand store factory for managing sync connection state:

```typescript
import { createSyncStore } from '@joolie-boolie/sync';

// Create a store instance for your app
export const useSyncStore = createSyncStore();

// Use in components
function SyncStatus() {
  const isConnected = useSyncStore((state) => state.isConnected);
  const role = useSyncStore((state) => state.role);

  return (
    <div>
      {isConnected ? 'Connected' : 'Disconnected'} as {role}
    </div>
  );
}
```

### Using the useSync Hook

The generic `useSync` hook handles common sync patterns:

```typescript
import { useSync } from '@joolie-boolie/sync';

function PresenterView() {
  const { isConnected, broadcastState } = useSync({
    role: 'presenter',
    broadcastSync: myBroadcastSync,
    syncStore: useSyncStore.getState(),
    getCurrentState: () => useGameStore.getState(),
    onStateUpdate: (state) => useGameStore.setState(state),
    subscribeToStateChanges: (callback) => {
      return useGameStore.subscribe(callback);
    },
  });

  return <div>Connected: {isConnected}</div>;
}
```

## API Reference

### BroadcastSync<TPayload>

Generic class for BroadcastChannel communication.

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize the channel. Returns `true` if successful. |
| `subscribe(handler)` | Subscribe to messages. Returns unsubscribe function. |
| `broadcastState(state)` | Send a `STATE_UPDATE` message with the full state. |
| `requestSync()` | Send a `REQUEST_SYNC` message (used by audience). |
| `close()` | Close the channel and clean up handlers. |
| `connected` | Property indicating if channel is active. |

### createSyncStore()

Creates a Zustand store for sync state management.

**State:**
- `role: 'presenter' | 'audience' | null`
- `isConnected: boolean`
- `lastSyncTimestamp: number | null`
- `connectionError: string | null`

**Actions:**
- `setRole(role)` - Set the sync role
- `setConnected(connected)` - Update connection status
- `updateLastSync()` - Update the last sync timestamp
- `setConnectionError(error)` - Set an error message
- `reset()` - Reset to initial state

### Types

```typescript
type SyncRole = 'presenter' | 'audience';

interface SyncMessage<TPayload = unknown> {
  type: string;
  payload: TPayload | null;
  timestamp: number;
}

interface SyncState {
  role: SyncRole | null;
  isConnected: boolean;
  lastSyncTimestamp: number | null;
  connectionError: string | null;
}
```

## Features

- ✅ Generic BroadcastChannel wrapper with TypeScript support
- ✅ Zustand store for sync state management
- ✅ React hook (useSync) for common patterns
- ✅ Session-scoped channels for multi-game isolation
- ✅ Message routing and type-safe handlers
- ✅ Automatic cleanup and error handling
- ✅ Support for presenter/audience roles
- ✅ Comprehensive test coverage

## Integration Status

| App/Package | Status | Usage |
|-------------|--------|-------|
| **apps/bingo** | ✅ Integrated | Dual-screen sync for presenter/audience views |
| **apps/trivia** | ✅ Integrated | Dual-screen sync for presenter/audience views |
| **apps/platform-hub** | ❌ Not Used | No dual-screen requirement |
| **@joolie-boolie/testing** | ✅ Integrated | MockBroadcastChannel for tests |

## Related Packages

- [`@joolie-boolie/types`](../types/README.md) - Shared type definitions including SyncMessage<T>
- [`@joolie-boolie/testing`](../testing/README.md) - BroadcastChannel mocks for testing

## Related Documentation

- **Root README:** [`../../README.md`](../../README.md) - Monorepo overview
- **Bingo Implementation:** [`../../apps/bingo/src/lib/sync/broadcast.ts`](../../apps/bingo/src/lib/sync/broadcast.ts)
- **Trivia Implementation:** [`../../apps/trivia/src/lib/sync/broadcast.ts`](../../apps/trivia/src/lib/sync/broadcast.ts)

## Architecture

```
Presenter Window                    Audience Window
┌─────────────────┐                ┌─────────────────┐
│  Game Store     │                │  Game Store     │
│  (Zustand)      │                │  (Zustand)      │
└────────┬────────┘                └────────▲────────┘
         │                                  │
         ▼                                  │
┌─────────────────┐  BroadcastChannel ┌─────────────────┐
│  BroadcastSync  │◄────────────────►│  BroadcastSync  │
│  (presenter)    │   STATE_UPDATE   │  (audience)     │
└─────────────────┘   REQUEST_SYNC   └─────────────────┘
```

## Session Isolation

Each presenter/audience pair uses a session-scoped channel name to prevent interference between multiple game instances:

```typescript
// In lib/sync/session.ts
export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getChannelName(sessionId: string): string {
  return `my-game-sync-${sessionId}`;
}
```

The session ID is passed via URL query parameter when opening the display window:
```typescript
const displayUrl = `${window.location.origin}/display?session=${sessionId}`;
```
