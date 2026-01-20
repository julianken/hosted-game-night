import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BroadcastSync, createBroadcastSync, createDebugBroadcastSync, createSyncDebugger } from '../broadcast';
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
      const originalWindow = globalThis.window;
      // @ts-expect-error - Testing SSR
      delete globalThis.window;

      const sync = new BroadcastSync('test-channel');
      const result = sync.initialize();
      expect(result).toBe(false);
      expect(sync.connected).toBe(false);

      globalThis.window = originalWindow;
    });

    it('should return false when BroadcastChannel unsupported', () => {
      // @ts-expect-error - Testing unsupported environment
      delete globalThis.BroadcastChannel;

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

    it('should accept options parameter', () => {
      const onError = vi.fn();
      const sync = createBroadcastSync('options-channel', { onError, debug: true });
      expect(sync).toBeInstanceOf(BroadcastSync);
    });
  });

  describe('connectionState', () => {
    it('should be disconnected before initialization', () => {
      const sync = new BroadcastSync('test-channel');
      expect(sync.connectionState).toBe('disconnected');
    });

    it('should be connected after successful initialization', () => {
      const sync = new BroadcastSync('test-channel');
      sync.initialize();
      expect(sync.connectionState).toBe('connected');
    });

    it('should be disconnected after close', () => {
      const sync = new BroadcastSync('test-channel');
      sync.initialize();
      sync.close();
      expect(sync.connectionState).toBe('disconnected');
    });

    it('should be error when BroadcastChannel unavailable', () => {
      // @ts-expect-error - Testing unsupported environment
      delete globalThis.BroadcastChannel;

      const sync = new BroadcastSync('test-channel');
      sync.initialize();
      expect(sync.connectionState).toBe('error');

      mockBroadcastChannel();
    });
  });

  describe('error observability', () => {
    it('should call onError when send fails on uninitialized channel', () => {
      const onError = vi.fn();
      const sync = new BroadcastSync('test-channel', { onError });

      sync.send('TEST', { data: 'test' });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'CHANNEL_UNAVAILABLE',
        message: expect.stringContaining('channel not initialized'),
      }));
    });

    it('should call onError when initialization fails', () => {
      // @ts-expect-error - Testing unsupported environment
      delete globalThis.BroadcastChannel;

      const onError = vi.fn();
      const sync = new BroadcastSync('test-channel', { onError });
      sync.initialize();

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'CHANNEL_UNAVAILABLE',
        message: expect.stringContaining('not available'),
      }));

      mockBroadcastChannel();
    });

    it('should call onError when handler throws', () => {
      const onError = vi.fn();
      const sync1 = new BroadcastSync('test-channel');
      const sync2 = new BroadcastSync('test-channel', { onError });
      sync1.initialize();
      sync2.initialize();

      sync2.subscribe(() => {
        throw new Error('Handler error');
      });

      sync1.send('TEST', { data: 'test' });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'HANDLER_ERROR',
        message: expect.stringContaining('handler threw'),
        originalError: expect.any(Error),
      }));
    });
  });

  describe('debug mode', () => {
    it('should log messages when debug is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const sync = new BroadcastSync('test-channel', { debug: true });
      sync.initialize();
      sync.send('TEST', { data: 'test' });

      // Should have logged initialization and send
      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(c => c.includes('Initializing'))).toBe(true);
      expect(calls.some(c => c.includes('Sending'))).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should not log when debug is disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const sync = new BroadcastSync('test-channel', { debug: false });
      sync.initialize();
      sync.send('TEST', { data: 'test' });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should log errors to console.error when debug is enabled and no onError', () => {
      // @ts-expect-error - Testing unsupported environment
      delete globalThis.BroadcastChannel;

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const sync = new BroadcastSync('test-channel', { debug: true });
      sync.initialize();

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      mockBroadcastChannel();
    });
  });

  describe('createDebugBroadcastSync factory', () => {
    it('should create a BroadcastSync with debug enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const sync = createDebugBroadcastSync('debug-channel');
      sync.initialize();

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should use provided onError callback', () => {
      const onError = vi.fn();
      const sync = createDebugBroadcastSync('debug-channel', onError);

      // Trigger an error by sending before initialization
      sync.send('TEST', { data: 'test' });

      expect(onError).toHaveBeenCalled();
    });

    it('should use default error handler when none provided', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const sync = createDebugBroadcastSync('debug-channel');
      sync.send('TEST', { data: 'test' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[BroadcastSync Debug]',
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('createSyncDebugger utility', () => {
    it('should return getState function', () => {
      const sync = new BroadcastSync('test-channel');
      const debugger_ = createSyncDebugger(sync);

      expect(typeof debugger_.getState).toBe('function');

      const state = debugger_.getState();
      expect(state).toEqual({
        connected: false,
        connectionState: 'disconnected',
      });
    });

    it('should reflect current state after initialization', () => {
      const sync = new BroadcastSync('test-channel');
      const debugger_ = createSyncDebugger(sync);

      sync.initialize();

      expect(debugger_.getState()).toEqual({
        connected: true,
        connectionState: 'connected',
      });
    });

    it('should return logState function', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const sync = new BroadcastSync('test-channel');
      const debugger_ = createSyncDebugger(sync);

      debugger_.logState();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[BroadcastSync State]',
        expect.objectContaining({
          connected: false,
          connectionState: 'disconnected',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('origin getter', () => {
    it('should return unique instance ID', () => {
      const sync1 = new BroadcastSync('test-channel');
      const sync2 = new BroadcastSync('test-channel');

      expect(typeof sync1.origin).toBe('string');
      expect(sync1.origin.length).toBeGreaterThan(0);
      expect(sync1.origin).not.toBe(sync2.origin);
    });
  });
});
