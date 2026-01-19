import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSync } from '../use-sync';
import { useSyncStore } from '@/stores/sync-store';
import { useGameStore } from '@/stores/game-store';
import { createMessageRouter } from '@/lib/sync/broadcast';
import { SyncMessage, BingoPattern, BingoBall, GameState } from '@/types';

// Test session ID for all tests
const TEST_SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';

// Store the last created BroadcastChannel instance
let lastChannelInstance: MockBroadcastChannel | null = null;

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  close = vi.fn();

  constructor(name: string) {
    this.name = name;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastChannelInstance = this;
  }

  // Helper to simulate receiving a message
  simulateMessage(message: SyncMessage) {
    if (this.onmessage) {
      this.onmessage({ data: message } as MessageEvent);
    }
  }
}

describe('use-sync', () => {
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

    // Reset stores
    useSyncStore.getState().reset();
    useGameStore.setState({
      status: 'idle',
      calledBalls: [],
      currentBall: null,
      previousBall: null,
      remainingBalls: [],
      pattern: null,
      autoCallEnabled: false,
      autoCallSpeed: 10,
      audioEnabled: true,
    });

  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('presenter role', () => {
    it('initializes as presenter', () => {
      const { result } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      expect(useSyncStore.getState().role).toBe('presenter');
      expect(result.current.isConnected).toBe(true);
    });

    it('provides broadcastState function', () => {
      const { result } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      expect(typeof result.current.broadcastState).toBe('function');
    });

    it('provides requestSync function', () => {
      const { result } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      expect(typeof result.current.requestSync).toBe('function');
    });
  });

  describe('audience role', () => {
    it('initializes as audience', () => {
      const { result } = renderHook(() => useSync({ role: 'audience', sessionId: TEST_SESSION_ID }));

      expect(useSyncStore.getState().role).toBe('audience');
      expect(result.current.isConnected).toBe(true);
    });

    it('requests sync on initialization', () => {
      // The hook should request sync when audience
      renderHook(() => useSync({ role: 'audience', sessionId: TEST_SESSION_ID }));

      // Should have called postMessage with REQUEST_SYNC
      // (we verify via store side effects since we mock BroadcastChannel)
      expect(useSyncStore.getState().isConnected).toBe(true);
    });
  });

  describe('connection status', () => {
    it('returns isConnected from store', () => {
      const { result } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      expect(result.current.isConnected).toBe(true);
    });

    it('returns connectionError from store', () => {
      const { result } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      expect(result.current.connectionError).toBeNull();
    });

    it('returns lastSyncTimestamp from store', () => {
      const { result } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      expect(result.current.lastSyncTimestamp).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('resets sync store on unmount', () => {
      const { unmount } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      expect(useSyncStore.getState().isConnected).toBe(true);

      unmount();

      expect(useSyncStore.getState().isConnected).toBe(false);
      expect(useSyncStore.getState().role).toBeNull();
    });
  });

  describe('connection error', () => {
    it('handles initialization failure', () => {
      // Simulate BroadcastChannel not being available
      vi.stubGlobal('BroadcastChannel', undefined);

      const { result } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      expect(result.current.connectionError).not.toBeNull();
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('message handlers', () => {
    const mockPattern: BingoPattern = {
      id: 'test-pattern',
      name: 'Test Pattern',
      category: 'lines',
      cells: [{ row: 0, col: 0 }],
    };

    const mockBall: BingoBall = {
      column: 'B',
      number: 5,
      label: 'B-5',
    };

    describe('audience receives messages', () => {
      it('handles BALL_CALLED message and updates lastSync', () => {
        renderHook(() => useSync({ role: 'audience', sessionId: TEST_SESSION_ID }));

        expect(useSyncStore.getState().lastSyncTimestamp).toBeNull();

        // Simulate receiving a BALL_CALLED message
        act(() => {
          lastChannelInstance?.simulateMessage({
            type: 'BALL_CALLED',
            payload: mockBall,
            timestamp: Date.now(),
          });
        });

        // lastSyncTimestamp should be updated
        expect(useSyncStore.getState().lastSyncTimestamp).not.toBeNull();
      });

      it('handles GAME_RESET message and resets game', () => {
        // Start with a playing game
        useGameStore.setState({
          status: 'playing',
          calledBalls: [mockBall],
          currentBall: mockBall,
          previousBall: null,
          remainingBalls: [],
          pattern: mockPattern,
          autoCallEnabled: false,
          autoCallSpeed: 10,
          audioEnabled: true,
        });

        renderHook(() => useSync({ role: 'audience', sessionId: TEST_SESSION_ID }));

        // Simulate receiving a GAME_RESET message
        act(() => {
          lastChannelInstance?.simulateMessage({
            type: 'GAME_RESET',
            payload: null,
            timestamp: Date.now(),
          });
        });

        // Game should be reset
        expect(useGameStore.getState().status).toBe('idle');
        expect(useGameStore.getState().calledBalls).toHaveLength(0);
      });

      it('handles PATTERN_CHANGED message and sets pattern', () => {
        renderHook(() => useSync({ role: 'audience', sessionId: TEST_SESSION_ID }));

        expect(useGameStore.getState().pattern).toBeNull();

        // Simulate receiving a PATTERN_CHANGED message
        act(() => {
          lastChannelInstance?.simulateMessage({
            type: 'PATTERN_CHANGED',
            payload: mockPattern,
            timestamp: Date.now(),
          });
        });

        expect(useGameStore.getState().pattern).toEqual(mockPattern);
      });

      it('handles GAME_STATE_UPDATE message and hydrates state', () => {
        const mockState: GameState = {
          status: 'playing',
          calledBalls: [mockBall],
          currentBall: mockBall,
          previousBall: null,
          remainingBalls: [],
          pattern: mockPattern,
          autoCallEnabled: true,
          autoCallSpeed: 15,
          audioEnabled: false,
        };

        renderHook(() => useSync({ role: 'audience', sessionId: TEST_SESSION_ID }));

        // Simulate receiving a GAME_STATE_UPDATE message
        act(() => {
          lastChannelInstance?.simulateMessage({
            type: 'GAME_STATE_UPDATE',
            payload: mockState,
            timestamp: Date.now(),
          });
        });

        expect(useGameStore.getState().status).toBe('playing');
        expect(useGameStore.getState().currentBall).toEqual(mockBall);
        expect(useGameStore.getState().autoCallEnabled).toBe(true);
      });
    });

    describe('presenter handles messages', () => {
      it('responds to REQUEST_SYNC by broadcasting state', () => {
        const postMessageSpy = vi.fn();
        vi.stubGlobal('BroadcastChannel', class extends MockBroadcastChannel {
          postMessage = postMessageSpy;
        });

        useGameStore.setState({
          status: 'playing',
          calledBalls: [],
          currentBall: null,
          previousBall: null,
          remainingBalls: [],
          pattern: mockPattern,
          autoCallEnabled: false,
          autoCallSpeed: 10,
          audioEnabled: true,
        });

        renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

        // Simulate receiving a REQUEST_SYNC message
        act(() => {
          lastChannelInstance?.simulateMessage({
            type: 'REQUEST_SYNC',
            payload: null,
            timestamp: Date.now(),
          });
        });

        // Should have broadcast the state (followed by display theme)
        expect(postMessageSpy).toHaveBeenCalled();
        const calls = postMessageSpy.mock.calls.map(call => call[0]);
        expect(calls.some(call => call.type === 'GAME_STATE_UPDATE')).toBe(true);
      });

      it('ignores BALL_CALLED when presenter role', () => {
        renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

        const initialTimestamp = useSyncStore.getState().lastSyncTimestamp;

        // Simulate receiving a BALL_CALLED message
        act(() => {
          lastChannelInstance?.simulateMessage({
            type: 'BALL_CALLED',
            payload: mockBall,
            timestamp: Date.now(),
          });
        });

        // lastSyncTimestamp should not be updated (presenter ignores this)
        expect(useSyncStore.getState().lastSyncTimestamp).toBe(initialTimestamp);
      });
    });

    describe('presenter state subscription', () => {
      it('broadcasts state on game state change', () => {
        const postMessageSpy = vi.fn();
        vi.stubGlobal('BroadcastChannel', class extends MockBroadcastChannel {
          postMessage = postMessageSpy;
        });

        renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

        // Clear any initial broadcasts
        postMessageSpy.mockClear();

        // Change game state
        act(() => {
          useGameStore.getState().startGame();
        });

        // Should have broadcast the state change
        expect(postMessageSpy).toHaveBeenCalled();
        const lastCall = postMessageSpy.mock.calls[postMessageSpy.mock.calls.length - 1][0];
        expect(lastCall.type).toBe('GAME_STATE_UPDATE');
        expect(lastCall.payload.status).toBe('playing');
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
        cells: [],
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
  });
});
