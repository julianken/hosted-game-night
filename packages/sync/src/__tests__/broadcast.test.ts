import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BroadcastSync, createBroadcastSync } from '../broadcast';
import { SyncMessage } from '../types';
import { mockBroadcastChannel, MockBroadcastChannel } from '@beak-gaming/testing/mocks';

describe('BroadcastSync', () => {
  beforeEach(() => {
    mockBroadcastChannel();
    MockBroadcastChannel.reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should accept a channel name', () => {
      const sync = new BroadcastSync('test-channel');
      expect(sync).toBeDefined();
      expect(sync.connected).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should create BroadcastChannel and return true', () => {
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
      expect(sync.connected).toBe(false);

      global.window = originalWindow;
    });

    it('should return false when BroadcastChannel unsupported', () => {
      // @ts-expect-error - Testing unsupported environment
      delete global.BroadcastChannel;

      const sync = new BroadcastSync('test-channel');
      const result = sync.initialize();
      expect(result).toBe(false);
      expect(sync.connected).toBe(false);

      mockBroadcastChannel();
    });

    it('should be idempotent (safe to call multiple times)', () => {
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

    it('should remove handler when unsubscribe is called', () => {
      const sync1 = new BroadcastSync('test-channel');
      const sync2 = new BroadcastSync('test-channel');
      sync1.initialize();
      sync2.initialize();

      const handler = vi.fn();
      const unsubscribe = sync2.subscribe(handler);

      // Verify handler is called
      sync1.send('TEST', { data: 'test1' });
      expect(handler).toHaveBeenCalledTimes(1);

      // Unsubscribe and verify handler is no longer called
      unsubscribe();
      sync1.send('TEST', { data: 'test2' });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('send', () => {
    it('should post message with type, payload, and timestamp', () => {
      const sync1 = new BroadcastSync<{ value: string }>('test-channel');
      const sync2 = new BroadcastSync<{ value: string }>('test-channel');
      sync1.initialize();
      sync2.initialize();

      const handler = vi.fn();
      sync2.subscribe(handler);

      const beforeTime = Date.now();
      sync1.send('TEST_MESSAGE', { value: 'test' });
      const afterTime = Date.now();

      expect(handler).toHaveBeenCalledTimes(1);
      const message = handler.mock.calls[0][0] as SyncMessage<{ value: string }>;
      expect(message.type).toBe('TEST_MESSAGE');
      expect(message.payload).toEqual({ value: 'test' });
      expect(message.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(message.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should silently fail if not initialized', () => {
      const sync = new BroadcastSync('test-channel');
      // Should not throw
      expect(() => sync.send('TEST', { data: 'test' })).not.toThrow();
    });
  });

  describe('broadcastState', () => {
    it('should send STATE_UPDATE message', () => {
      const sync1 = new BroadcastSync<{ count: number }>('test-channel');
      const sync2 = new BroadcastSync<{ count: number }>('test-channel');
      sync1.initialize();
      sync2.initialize();

      const handler = vi.fn();
      sync2.subscribe(handler);

      sync1.broadcastState({ count: 42 });

      expect(handler).toHaveBeenCalledTimes(1);
      const message = handler.mock.calls[0][0] as SyncMessage<{ count: number }>;
      expect(message.type).toBe('STATE_UPDATE');
      expect(message.payload).toEqual({ count: 42 });
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
      const message = handler.mock.calls[0][0] as SyncMessage<unknown>;
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

      // Messages should no longer be received
      sync1.send('TEST', { data: 'test' });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('connected getter', () => {
    it('should return false before initialization', () => {
      const sync = new BroadcastSync('test-channel');
      expect(sync.connected).toBe(false);
    });

    it('should return true after initialization', () => {
      const sync = new BroadcastSync('test-channel');
      sync.initialize();
      expect(sync.connected).toBe(true);
    });

    it('should return false after close', () => {
      const sync = new BroadcastSync('test-channel');
      sync.initialize();
      sync.close();
      expect(sync.connected).toBe(false);
    });
  });

  describe('notifyHandlers error handling', () => {
    it('should catch exceptions from handlers and continue notifying others', () => {
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

      // Should not throw, and second handler should still be called
      expect(() => sync1.send('TEST', { data: 'test' })).not.toThrow();
      expect(failingHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });
  });

  describe('generic typing', () => {
    it('should work with custom payload types', () => {
      interface CustomPayload {
        id: number;
        name: string;
      }

      const sync1 = new BroadcastSync<CustomPayload>('test-channel');
      const sync2 = new BroadcastSync<CustomPayload>('test-channel');
      sync1.initialize();
      sync2.initialize();

      const handler = vi.fn();
      sync2.subscribe(handler);

      sync1.broadcastState({ id: 1, name: 'test' });

      const message = handler.mock.calls[0][0] as SyncMessage<CustomPayload>;
      expect(message.payload?.id).toBe(1);
      expect(message.payload?.name).toBe('test');
    });
  });

  describe('createBroadcastSync factory', () => {
    it('should create a BroadcastSync instance', () => {
      const sync = createBroadcastSync('factory-channel');
      expect(sync).toBeInstanceOf(BroadcastSync);
    });

    it('should work with generic types', () => {
      interface MyState {
        value: number;
      }
      const sync = createBroadcastSync<MyState>('typed-channel');
      sync.initialize();
      // Type checking at compile time - if this compiles, types work
      sync.broadcastState({ value: 42 });
    });
  });
});
