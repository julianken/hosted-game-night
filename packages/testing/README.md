# @beak-gaming/testing

**Status:** ✅ Production Ready (100% Complete)

Shared test utilities and mocks for the Beak Gaming Platform. Provides mock implementations for BroadcastChannel, Audio, and Supabase, plus jest-dom matchers. Enables consistent testing patterns across all apps and packages.

## Installation

```json
{
  "devDependencies": {
    "@beak-gaming/testing": "workspace:*"
  },
  "peerDependencies": {
    "@testing-library/react": "^15.0.0",
    "vitest": "^4.0.0"
  }
}
```

## Export Paths

The package provides multiple export paths for different use cases:

```typescript
// Main export - includes mocks and helpers
import { mockBroadcastChannel, createMockSupabaseClient } from '@beak-gaming/testing';

// Mocks only
import { mockAudio, MockBroadcastChannel } from '@beak-gaming/testing/mocks';

// Jest-dom setup (add to vitest setupFiles)
import '@beak-gaming/testing/setup';

// Helpers (for future expansion)
import { HELPERS_PLACEHOLDER } from '@beak-gaming/testing/helpers';
```

## Features

- ✅ **BroadcastChannel Mock** - Full mock for dual-screen sync testing
- ✅ **Audio Mock** - HTML5 Audio API mock for sound testing
- ✅ **Supabase Mock** - Client and auth mocking utilities
- ✅ **jest-dom Setup** - Automatic setup for DOM matchers
- ✅ **Multiple Export Paths** - Granular imports for mocks, setup, helpers
- ✅ **TypeScript Support** - Full type definitions for all mocks
- ✅ **Zero Runtime Dependencies** - Dev-only package

## Available Mocks

### BroadcastChannel Mock

Mock for the BroadcastChannel API used in dual-screen synchronization.

```typescript
import { mockBroadcastChannel, MockBroadcastChannel } from '@beak-gaming/testing/mocks';

// In your test setup
beforeEach(() => {
  mockBroadcastChannel();
});

afterEach(() => {
  MockBroadcastChannel.reset();
});

// In tests
test('syncs state between windows', () => {
  const channel1 = new BroadcastChannel('test-channel');
  const channel2 = new BroadcastChannel('test-channel');

  const received: unknown[] = [];
  channel2.onmessage = (event) => {
    received.push(event.data);
  };

  channel1.postMessage({ type: 'TEST', payload: 'hello' });

  expect(received).toContainEqual({ type: 'TEST', payload: 'hello' });
});
```

### Audio Mock

Mock for the HTML5 Audio API used in sound playback.

```typescript
import { mockAudio, MockAudio, createMockAudio } from '@beak-gaming/testing/mocks';

// In your test setup
beforeEach(() => {
  mockAudio();
});

// In tests
test('plays audio', async () => {
  const audio = new Audio('/test.mp3');
  await audio.play();

  expect(audio.paused).toBe(false);
});

// Or create instances directly for testing
test('tracks audio behavior', () => {
  const audio = createMockAudio();
  audio.volume = 0.5;
  expect(audio.volume).toBe(0.5);
});
```

### Supabase Mock

Mock for Supabase client and authentication.

```typescript
import { createMockSupabaseClient, createMockUser, createMockSession } from '@beak-gaming/testing/mocks';

// Create mock users
test('creates users', () => {
  const user = createMockUser({
    email: 'user@example.com',
    user_metadata: { firstName: 'John' },
  });
  expect(user.email).toBe('user@example.com');
});

// Create mock sessions
test('creates sessions', () => {
  const session = createMockSession({}, { expires_in: 7200 });
  expect(session.expires_in).toBe(7200);
  expect(session.user).toBeDefined();
});

// Create a mock Supabase client
test('mocks Supabase auth', async () => {
  const mockClient = createMockSupabaseClient();
  const { data: { session } } = await mockClient.auth.getSession();
  expect(session).toBeNull();

  // Simulate sign in
  mockClient.__helpers.simulateAuthChange('SIGNED_IN', createMockSession());

  // Use getState to inspect current auth state
  const state = mockClient.__helpers.getState();
  expect(state.user).toBeDefined();
});
```

## Setup for jest-dom Matchers

To use jest-dom matchers like `toBeInTheDocument()`, `toBeVisible()`, etc., add the setup file to your vitest config:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['@beak-gaming/testing/setup'],
  },
});
```

## Test Setup Example

Create app-specific test setup files if needed:

```typescript
// apps/my-game/src/test/setup.ts
import { mockBroadcastChannel, MockBroadcastChannel, mockAudio } from '@beak-gaming/testing/mocks';

beforeEach(() => {
  mockBroadcastChannel();
  mockAudio();
});

afterEach(() => {
  MockBroadcastChannel.reset();
});
```

Then configure in your vitest config:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [
      '@beak-gaming/testing/setup',
      './src/test/setup.ts',  // Optional: app-specific setup
    ],
  },
});
```

## App-Specific Test Helpers

Apps maintain their own test helpers for store resetting and app-specific utilities:

```typescript
// apps/my-game/src/test/helpers/store.ts
import { useGameStore } from '@/stores/game-store';
import { createInitialState } from '@/lib/game/engine';

export function resetGameStore(): void {
  useGameStore.setState(createInitialState());
}

export function resetAllStores(): void {
  resetGameStore();
  // Reset other stores...
}
```

## API Reference

### mockBroadcastChannel()

Sets up the global BroadcastChannel mock. Call in `beforeEach`.

### MockBroadcastChannel

The mock class itself. Provides:
- `static reset()`: Clear all channels between tests
- `name`: Channel name
- `postMessage(message)`: Broadcasts to other channels with same name
- `close()`: Removes this channel instance
- `onmessage`: Message handler

### mockAudio()

Sets up the global Audio mock. Call in `beforeEach`.

### MockAudio

The mock class itself. Provides:
- `src`: Audio source URL
- `volume`: Volume level (0-1)
- `muted`: Muted state
- `paused`: Paused state
- `currentTime`: Current playback position
- `duration`: Audio duration
- `play()`: Returns Promise<void>
- `pause()`: Pauses playback
- `load()`: No-op
- `addEventListener()`: No-op
- `removeEventListener()`: No-op

## Extending Mocks

To add app-specific mocks, create them in your app's test directory:

```typescript
// apps/my-game/src/test/mocks/my-mock.ts
import { vi } from 'vitest';

export function mockMyService() {
  vi.stubGlobal('myService', {
    fetch: vi.fn(),
    // ...
  });
}
```

Then export from a central location:

```typescript
// apps/my-game/src/test/mocks/index.ts
export * from '@beak-gaming/testing/mocks';
export { mockMyService } from './my-mock';
```

## Future Additions

Planned utilities:
- React component test helpers
- Zustand store test utilities
- Supabase mock helpers
- Common fixture generators

## Integration Status

| App/Package | Status | Mocks Used |
|-------------|--------|------------|
| **apps/bingo** | ✅ Integrated | BroadcastChannel, Audio, jest-dom |
| **apps/trivia** | ✅ Integrated | BroadcastChannel, Audio, jest-dom |
| **apps/platform-hub** | ✅ Integrated | jest-dom, Supabase (partial) |
| **@beak-gaming/sync** | ✅ Integrated | BroadcastChannel for testing |
| **@beak-gaming/ui** | ✅ Integrated | jest-dom for component tests |

## Related Packages

- [`@beak-gaming/sync`](../sync/README.md) - Uses BroadcastChannel mock for sync tests
- All apps use these mocks for testing

## Related Documentation

- **Root README:** [`../../README.md`](../../README.md) - Monorepo overview
- **Vitest:** [vitest.dev](https://vitest.dev) - Test runner documentation
- **Testing Library:** [testing-library.com](https://testing-library.com) - Component testing docs
