import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BroadcastSync,
  createTriviaBroadcastSync,
  createMessageRouter,
} from '../broadcast';
import type { TriviaGameState, SyncMessage } from '@/types';

// Inline mock for BroadcastChannel
type MessageHandler = (event: MessageEvent) => void;

class MockBroadcastChannel {
  name: string;
  onmessage: MessageHandler | null = null;
  private static channels: Map<string, Set<MockBroadcastChannel>> = new Map();

  constructor(name: string) {
    this.name = name;
    const channels = MockBroadcastChannel.channels.get(name) || new Set();
    channels.add(this);
    MockBroadcastChannel.channels.set(name, channels);
  }

  postMessage(message: unknown): void {
    const channels = MockBroadcastChannel.channels.get(this.name);
    if (!channels) return;

    channels.forEach((channel) => {
      if (channel !== this && channel.onmessage) {
        const event = new MessageEvent('message', { data: message });
        channel.onmessage(event);
      }
    });
  }

  close(): void {
    const channels = MockBroadcastChannel.channels.get(this.name);
    if (channels) {
      channels.delete(this);
      if (channels.size === 0) {
        MockBroadcastChannel.channels.delete(this.name);
      }
    }
  }

  static reset(): void {
    MockBroadcastChannel.channels.clear();
  }
}

function mockBroadcastChannel(): void {
  // @ts-expect-error - Mocking global
  global.BroadcastChannel = MockBroadcastChannel;
}

describe('BroadcastSync', () => {
  beforeEach(() => {
    mockBroadcastChannel();
    MockBroadcastChannel.reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should create instance with channel name', () => {
      const sync = new BroadcastSync('test-channel');
      expect(sync).toBeDefined();
      expect(sync.connected).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should create channel and return true', () => {
      const sync = new BroadcastSync('test-channel');
      const result = sync.initialize();
      expect(result).toBe(true);
      expect(sync.connected).toBe(true);
    });

    it('should return false in SSR (no window)', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR
      delete global.window;

      const sync = new BroadcastSync('test-channel');
      const result = sync.initialize();
      expect(result).toBe(false);

      global.window = originalWindow;
    });

    it('should return false when BroadcastChannel unsupported', () => {
      // @ts-expect-error - Testing unsupported environment
      delete global.BroadcastChannel;

      const sync = new BroadcastSync('test-channel');
      const result = sync.initialize();
      expect(result).toBe(false);

      mockBroadcastChannel();
    });

    it('should be idempotent', () => {
      const sync = new BroadcastSync('test-channel');
      expect(sync.initialize()).toBe(true);
      expect(sync.initialize()).toBe(true);
      expect(sync.connected).toBe(true);
    });
  });

  describe('subscribe', () => {
    it('should add handler and return unsubscribe function', () => {
      const sync = new BroadcastSync('test-channel');
      sync.initialize();

      const handler = vi.fn();
      const unsubscribe = sync.subscribe(handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should remove handler when unsubscribed', () => {
      const sync1 = new BroadcastSync('test-channel');
      const sync2 = new BroadcastSync('test-channel');
      sync1.initialize();
      sync2.initialize();

      const handler = vi.fn();
      const unsubscribe = sync2.subscribe(handler);

      sync1.broadcastState({ sessionId: 'test' } as TriviaGameState);
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      sync1.broadcastState({ sessionId: 'test2' } as TriviaGameState);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('broadcastState', () => {
    it('should send STATE_UPDATE message', () => {
      const sync1 = new BroadcastSync('test-channel');
      const sync2 = new BroadcastSync('test-channel');
      sync1.initialize();
      sync2.initialize();

      const handler = vi.fn();
      sync2.subscribe(handler);

      const state = { sessionId: 'test-session' } as TriviaGameState;
      sync1.broadcastState(state);

      expect(handler).toHaveBeenCalledTimes(1);
      const message = handler.mock.calls[0][0] as SyncMessage;
      expect(message.type).toBe('STATE_UPDATE');
      expect(message.payload).toEqual(state);
      expect(message.timestamp).toBeDefined();
    });
  });

  describe('requestSync', () => {
    it('should send REQUEST_SYNC with null payload', () => {
      const sync1 = new BroadcastSync('test-channel');
      const sync2 = new BroadcastSync('test-channel');
      sync1.initialize();
      sync2.initialize();

      const handler = vi.fn();
      sync2.subscribe(handler);

      sync1.requestSync();

      expect(handler).toHaveBeenCalledTimes(1);
      const message = handler.mock.calls[0][0] as SyncMessage;
      expect(message.type).toBe('REQUEST_SYNC');
      expect(message.payload).toBeNull();
    });
  });

  describe('close', () => {
    it('should close channel and clear handlers', () => {
      const sync1 = new BroadcastSync('test-channel');
      const sync2 = new BroadcastSync('test-channel');
      sync1.initialize();
      sync2.initialize();

      const handler = vi.fn();
      sync2.subscribe(handler);
      sync2.close();

      expect(sync2.connected).toBe(false);

      sync1.broadcastState({ sessionId: 'test' } as TriviaGameState);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('connected getter', () => {
    it('should return correct initialization status', () => {
      const sync = new BroadcastSync('test-channel');
      expect(sync.connected).toBe(false);

      sync.initialize();
      expect(sync.connected).toBe(true);

      sync.close();
      expect(sync.connected).toBe(false);
    });
  });

  describe('notifyHandlers error handling', () => {
    it('should catch exceptions and continue', () => {
      const sync1 = new BroadcastSync('test-channel');
      const sync2 = new BroadcastSync('test-channel');
      sync1.initialize();
      sync2.initialize();

      const failingHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const successHandler = vi.fn();

      sync2.subscribe(failingHandler);
      sync2.subscribe(successHandler);

      expect(() =>
        sync1.broadcastState({ sessionId: 'test' } as TriviaGameState)
      ).not.toThrow();
      expect(failingHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });
  });
});

describe('createTriviaBroadcastSync', () => {
  beforeEach(() => {
    mockBroadcastChannel();
    MockBroadcastChannel.reset();
  });

  it('should create BroadcastSync with session-scoped channel', () => {
    const sync = createTriviaBroadcastSync('session-123');
    expect(sync).toBeInstanceOf(BroadcastSync);
  });

  it('should use different channels for different sessions', () => {
    const sync1 = createTriviaBroadcastSync('session-1');
    const sync2 = createTriviaBroadcastSync('session-2');
    sync1.initialize();
    sync2.initialize();

    const handler = vi.fn();
    sync2.subscribe(handler);

    // Message from session-1 should NOT reach session-2
    sync1.broadcastState({ sessionId: 'session-1' } as TriviaGameState);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('createMessageRouter', () => {
  it('should route STATE_UPDATE messages', () => {
    const onStateUpdate = vi.fn();
    const router = createMessageRouter({ onStateUpdate });

    const state = { sessionId: 'test' } as TriviaGameState;
    router({
      type: 'STATE_UPDATE',
      payload: state,
      timestamp: Date.now(),
    });

    expect(onStateUpdate).toHaveBeenCalledWith(state);
  });

  it('should route REQUEST_SYNC messages', () => {
    const onSyncRequest = vi.fn();
    const router = createMessageRouter({ onSyncRequest });

    router({
      type: 'REQUEST_SYNC',
      payload: null,
      timestamp: Date.now(),
    });

    expect(onSyncRequest).toHaveBeenCalled();
  });

  it('should handle missing handlers gracefully', () => {
    const router = createMessageRouter({});

    expect(() =>
      router({
        type: 'STATE_UPDATE',
        payload: null,
        timestamp: Date.now(),
      })
    ).not.toThrow();
  });
});
