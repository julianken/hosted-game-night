import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BroadcastSync, createMessageRouter } from '../broadcast';
import { GameState, BingoBall, BingoPattern } from '@/types';

// Mock BroadcastChannel
class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn((message: unknown) => {
    // Broadcast to other instances with same name
    for (const instance of MockBroadcastChannel.instances) {
      if (instance !== this && instance.name === this.name && instance.onmessage) {
        instance.onmessage({ data: message } as MessageEvent);
      }
    }
  });
  close = vi.fn(() => {
    const index = MockBroadcastChannel.instances.indexOf(this);
    if (index > -1) {
      MockBroadcastChannel.instances.splice(index, 1);
    }
  });

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  static reset() {
    MockBroadcastChannel.instances = [];
  }
}

describe('broadcast', () => {
  beforeEach(() => {
    MockBroadcastChannel.reset();
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('BroadcastSync', () => {
    describe('initialize', () => {
      it('returns true when BroadcastChannel is available', () => {
        const sync = new BroadcastSync();
        expect(sync.initialize()).toBe(true);
      });

      it('returns true on subsequent calls (idempotent)', () => {
        const sync = new BroadcastSync();
        sync.initialize();
        expect(sync.initialize()).toBe(true);
      });

      it('returns false when BroadcastChannel is not available', () => {
        vi.stubGlobal('BroadcastChannel', undefined);
        const sync = new BroadcastSync();
        expect(sync.initialize()).toBe(false);
      });

      it('returns false in SSR environment (no window)', () => {
        const originalWindow = globalThis.window;
        // @ts-expect-error - Intentionally deleting window to simulate SSR
        delete globalThis.window;

        const sync = new BroadcastSync();
        expect(sync.initialize()).toBe(false);

        globalThis.window = originalWindow;
      });

      it('returns false when constructor throws', () => {
        vi.stubGlobal('BroadcastChannel', class {
          constructor() {
            throw new Error('Not supported');
          }
        });
        const sync = new BroadcastSync();
        expect(sync.initialize()).toBe(false);
      });
    });

    describe('connected', () => {
      it('returns false before initialization', () => {
        const sync = new BroadcastSync();
        expect(sync.connected).toBe(false);
      });

      it('returns true after initialization', () => {
        const sync = new BroadcastSync();
        sync.initialize();
        expect(sync.connected).toBe(true);
      });

      it('returns false after close', () => {
        const sync = new BroadcastSync();
        sync.initialize();
        sync.close();
        expect(sync.connected).toBe(false);
      });
    });

    describe('subscribe', () => {
      it('registers a message handler', () => {
        const sync = new BroadcastSync();
        sync.initialize();

        const handler = vi.fn();
        sync.subscribe(handler);

        // Simulate incoming message
        const instance = MockBroadcastChannel.instances[0];
        instance.onmessage?.({ data: { type: 'GAME_RESET', payload: null, timestamp: Date.now() } } as MessageEvent);

        expect(handler).toHaveBeenCalled();
      });

      it('returns unsubscribe function', () => {
        const sync = new BroadcastSync();
        sync.initialize();

        const handler = vi.fn();
        const unsubscribe = sync.subscribe(handler);

        unsubscribe();

        // Simulate incoming message
        const instance = MockBroadcastChannel.instances[0];
        instance.onmessage?.({ data: { type: 'GAME_RESET', payload: null, timestamp: Date.now() } } as MessageEvent);

        expect(handler).not.toHaveBeenCalled();
      });

      it('handles multiple subscribers', () => {
        const sync = new BroadcastSync();
        sync.initialize();

        const handler1 = vi.fn();
        const handler2 = vi.fn();
        sync.subscribe(handler1);
        sync.subscribe(handler2);

        const instance = MockBroadcastChannel.instances[0];
        instance.onmessage?.({ data: { type: 'GAME_RESET', payload: null, timestamp: Date.now() } } as MessageEvent);

        expect(handler1).toHaveBeenCalled();
        expect(handler2).toHaveBeenCalled();
      });

      it('handles handler errors gracefully', () => {
        const sync = new BroadcastSync();
        sync.initialize();

        const errorHandler = vi.fn(() => {
          throw new Error('Handler error');
        });
        const normalHandler = vi.fn();

        sync.subscribe(errorHandler);
        sync.subscribe(normalHandler);

        const instance = MockBroadcastChannel.instances[0];
        // Should not throw
        instance.onmessage?.({ data: { type: 'GAME_RESET', payload: null, timestamp: Date.now() } } as MessageEvent);

        expect(errorHandler).toHaveBeenCalled();
        expect(normalHandler).toHaveBeenCalled();
      });
    });

    describe('broadcast methods', () => {
      const mockState: GameState = {
        status: 'playing',
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        pattern: null,
        autoCallEnabled: false,
        autoCallSpeed: 10,
        audioEnabled: true,
      };

      const mockBall: BingoBall = {
        column: 'B',
        number: 5,
        label: 'B-5',
      };

      const mockPattern: BingoPattern = {
        id: 'test',
        name: 'Test',
        category: 'lines',
        cells: [{ row: 0, col: 0 }],
      };

      it('broadcastState sends GAME_STATE_UPDATE message', () => {
        const sync = new BroadcastSync();
        sync.initialize();
        sync.broadcastState(mockState);

        const instance = MockBroadcastChannel.instances[0];
        expect(instance.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'GAME_STATE_UPDATE',
            payload: mockState,
          })
        );
      });

      it('broadcastBallCalled sends BALL_CALLED message', () => {
        const sync = new BroadcastSync();
        sync.initialize();
        sync.broadcastBallCalled(mockBall);

        const instance = MockBroadcastChannel.instances[0];
        expect(instance.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'BALL_CALLED',
            payload: mockBall,
          })
        );
      });

      it('broadcastReset sends GAME_RESET message', () => {
        const sync = new BroadcastSync();
        sync.initialize();
        sync.broadcastReset();

        const instance = MockBroadcastChannel.instances[0];
        expect(instance.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'GAME_RESET',
            payload: null,
          })
        );
      });

      it('broadcastPatternChanged sends PATTERN_CHANGED message', () => {
        const sync = new BroadcastSync();
        sync.initialize();
        sync.broadcastPatternChanged(mockPattern);

        const instance = MockBroadcastChannel.instances[0];
        expect(instance.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'PATTERN_CHANGED',
            payload: mockPattern,
          })
        );
      });

      it('requestSync sends REQUEST_SYNC message', () => {
        const sync = new BroadcastSync();
        sync.initialize();
        sync.requestSync();

        const instance = MockBroadcastChannel.instances[0];
        expect(instance.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'REQUEST_SYNC',
            payload: null,
          })
        );
      });

      it('does not send when not initialized', () => {
        const sync = new BroadcastSync();
        sync.broadcastState(mockState);
        expect(MockBroadcastChannel.instances).toHaveLength(0);
      });

      it('handles postMessage errors gracefully', () => {
        const sync = new BroadcastSync();
        sync.initialize();

        const instance = MockBroadcastChannel.instances[0];
        instance.postMessage.mockImplementation(() => {
          throw new Error('PostMessage error');
        });

        // Should not throw
        expect(() => sync.broadcastState(mockState)).not.toThrow();
      });
    });

    describe('close', () => {
      it('closes the channel', () => {
        const sync = new BroadcastSync();
        sync.initialize();
        const instance = MockBroadcastChannel.instances[0];

        sync.close();

        expect(instance.close).toHaveBeenCalled();
      });

      it('clears handlers', () => {
        const sync = new BroadcastSync();
        sync.initialize();

        const handler = vi.fn();
        sync.subscribe(handler);
        sync.close();

        // Re-initialize and trigger message
        sync.initialize();
        const instance = MockBroadcastChannel.instances[0];
        instance.onmessage?.({ data: { type: 'GAME_RESET', payload: null, timestamp: Date.now() } } as MessageEvent);

        expect(handler).not.toHaveBeenCalled();
      });

      it('allows re-initialization after close', () => {
        const sync = new BroadcastSync();
        sync.initialize();
        sync.close();
        expect(sync.initialize()).toBe(true);
        expect(sync.connected).toBe(true);
      });
    });
  });

  describe('createMessageRouter', () => {
    it('routes GAME_STATE_UPDATE to onStateUpdate', () => {
      const onStateUpdate = vi.fn();
      const router = createMessageRouter({ onStateUpdate });

      const mockState: GameState = {
        status: 'playing',
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        pattern: null,
        autoCallEnabled: false,
        autoCallSpeed: 10,
        audioEnabled: true,
      };

      router({
        type: 'GAME_STATE_UPDATE',
        payload: mockState,
        timestamp: Date.now(),
      });

      expect(onStateUpdate).toHaveBeenCalledWith(mockState);
    });

    it('routes BALL_CALLED to onBallCalled', () => {
      const onBallCalled = vi.fn();
      const router = createMessageRouter({ onBallCalled });

      const mockBall: BingoBall = { column: 'B', number: 5, label: 'B-5' };

      router({
        type: 'BALL_CALLED',
        payload: mockBall,
        timestamp: Date.now(),
      });

      expect(onBallCalled).toHaveBeenCalledWith(mockBall);
    });

    it('routes GAME_RESET to onReset', () => {
      const onReset = vi.fn();
      const router = createMessageRouter({ onReset });

      router({
        type: 'GAME_RESET',
        payload: null,
        timestamp: Date.now(),
      });

      expect(onReset).toHaveBeenCalled();
    });

    it('routes PATTERN_CHANGED to onPatternChanged', () => {
      const onPatternChanged = vi.fn();
      const router = createMessageRouter({ onPatternChanged });

      const mockPattern: BingoPattern = {
        id: 'test',
        name: 'Test',
        category: 'lines',
        cells: [{ row: 0, col: 0 }],
      };

      router({
        type: 'PATTERN_CHANGED',
        payload: mockPattern,
        timestamp: Date.now(),
      });

      expect(onPatternChanged).toHaveBeenCalledWith(mockPattern);
    });

    it('routes REQUEST_SYNC to onSyncRequest', () => {
      const onSyncRequest = vi.fn();
      const router = createMessageRouter({ onSyncRequest });

      router({
        type: 'REQUEST_SYNC',
        payload: null,
        timestamp: Date.now(),
      });

      expect(onSyncRequest).toHaveBeenCalled();
    });

    it('handles missing handlers gracefully', () => {
      const router = createMessageRouter({});

      // Should not throw
      expect(() =>
        router({
          type: 'GAME_RESET',
          payload: null,
          timestamp: Date.now(),
        })
      ).not.toThrow();
    });
  });
});
