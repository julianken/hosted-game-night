import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore, useGameSelectors } from '../game-store';
import { renderHook } from '@testing-library/react';
import { BingoPattern } from '@/types';
import { patternRegistry, initializePatterns } from '@/lib/game/patterns';

// Ensure patterns are registered before any test runs
initializePatterns();

/**
 * Seed localStorage with a persisted game state in the format Zustand persist
 * middleware expects, then call rehydrate() to trigger the merge callback.
 */
async function seedAndRehydrate(persistedState: Record<string, unknown>): Promise<void> {
  localStorage.setItem(
    'hgn-bingo-game',
    JSON.stringify({ state: persistedState, version: 1 })
  );
  await useGameStore.persist.rehydrate();
}

describe('game-store', () => {
  const mockPattern: BingoPattern = {
    id: 'test-pattern',
    name: 'Test Pattern',
    category: 'lines',
    cells: [{ row: 0, col: 0 }],
  };

  beforeEach(() => {
    // Clear localStorage so persist middleware starts fresh each test
    localStorage.clear();
    useGameStore.getState().resetGame();
    // Re-set to idle since resetGame sets to idle but preserves pattern
    useGameStore.setState({
      status: 'idle',
      calledBalls: [],
      currentBall: null,
      previousBall: null,
      pattern: null,
      autoCallEnabled: false,
      audioEnabled: true,
      _isHydrating: false,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('has idle status', () => {
      expect(useGameStore.getState().status).toBe('idle');
    });

    it('has 75 remaining balls', () => {
      expect(useGameStore.getState().remainingBalls).toHaveLength(75);
    });

    it('has no called balls', () => {
      expect(useGameStore.getState().calledBalls).toHaveLength(0);
    });

    it('has no current ball', () => {
      expect(useGameStore.getState().currentBall).toBeNull();
    });

    it('has auto-call disabled', () => {
      expect(useGameStore.getState().autoCallEnabled).toBe(false);
    });

    it('has audio enabled', () => {
      expect(useGameStore.getState().audioEnabled).toBe(true);
    });
  });

  describe('startGame', () => {
    it('sets status to playing', () => {
      useGameStore.getState().startGame();
      expect(useGameStore.getState().status).toBe('playing');
    });

    it('accepts optional pattern', () => {
      useGameStore.getState().startGame(mockPattern);
      expect(useGameStore.getState().pattern).toEqual(mockPattern);
    });
  });

  describe('callBall', () => {
    beforeEach(() => {
      useGameStore.getState().startGame();
    });

    it('returns the called ball', () => {
      const ball = useGameStore.getState().callBall();
      expect(ball).not.toBeNull();
      expect(ball?.number).toBeGreaterThanOrEqual(1);
      expect(ball?.number).toBeLessThanOrEqual(75);
    });

    it('updates current ball', () => {
      const ball = useGameStore.getState().callBall();
      expect(useGameStore.getState().currentBall).toEqual(ball);
    });

    it('adds ball to called balls', () => {
      useGameStore.getState().callBall();
      expect(useGameStore.getState().calledBalls).toHaveLength(1);
    });

    it('removes ball from remaining balls', () => {
      useGameStore.getState().callBall();
      expect(useGameStore.getState().remainingBalls).toHaveLength(74);
    });

    it('returns null when not playing', () => {
      useGameStore.getState().pauseGame();
      const ball = useGameStore.getState().callBall();
      expect(ball).toBeNull();
    });
  });

  describe('undoCall', () => {
    beforeEach(() => {
      useGameStore.getState().startGame();
    });

    it('returns null when no balls called', () => {
      const result = useGameStore.getState().undoCall();
      expect(result).toBeNull();
    });

    it('returns the previous current ball', () => {
      const firstBall = useGameStore.getState().callBall();
      const returned = useGameStore.getState().undoCall();
      expect(returned).toEqual(firstBall);
    });

    it('restores ball to remaining', () => {
      useGameStore.getState().callBall();
      useGameStore.getState().undoCall();
      expect(useGameStore.getState().remainingBalls).toHaveLength(75);
    });

    it('returns null when paused', () => {
      useGameStore.getState().callBall();
      useGameStore.getState().pauseGame();
      const result = useGameStore.getState().undoCall();
      expect(result).toBeNull();
    });
  });

  describe('pauseGame', () => {
    it('sets status to paused', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().pauseGame();
      expect(useGameStore.getState().status).toBe('paused');
    });
  });

  describe('resumeGame', () => {
    it('sets status to playing', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().pauseGame();
      useGameStore.getState().resumeGame();
      expect(useGameStore.getState().status).toBe('playing');
    });
  });

  describe('endGame', () => {
    it('sets status to ended', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().endGame();
      expect(useGameStore.getState().status).toBe('ended');
    });
  });

  describe('resetGame', () => {
    it('resets status to idle', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().callBall();
      useGameStore.getState().resetGame();
      expect(useGameStore.getState().status).toBe('idle');
    });

    it('clears called balls', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().callBall();
      useGameStore.getState().resetGame();
      expect(useGameStore.getState().calledBalls).toHaveLength(0);
    });

    it('restores 75 remaining balls', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().callBall();
      useGameStore.getState().resetGame();
      expect(useGameStore.getState().remainingBalls).toHaveLength(75);
    });
  });

  describe('setPattern', () => {
    it('sets the pattern', () => {
      useGameStore.getState().setPattern(mockPattern);
      expect(useGameStore.getState().pattern).toEqual(mockPattern);
    });
  });

  describe('toggleAutoCall', () => {
    it('toggles auto-call on', () => {
      useGameStore.getState().toggleAutoCall();
      expect(useGameStore.getState().autoCallEnabled).toBe(true);
    });

    it('toggles auto-call off', () => {
      useGameStore.getState().toggleAutoCall();
      useGameStore.getState().toggleAutoCall();
      expect(useGameStore.getState().autoCallEnabled).toBe(false);
    });
  });

  describe('setAutoCallSpeed', () => {
    it('sets auto-call speed', () => {
      useGameStore.getState().setAutoCallSpeed(15);
      expect(useGameStore.getState().autoCallSpeed).toBe(15);
    });

    it('clamps to minimum', () => {
      useGameStore.getState().setAutoCallSpeed(1);
      expect(useGameStore.getState().autoCallSpeed).toBe(5);
    });

    it('clamps to maximum', () => {
      useGameStore.getState().setAutoCallSpeed(100);
      expect(useGameStore.getState().autoCallSpeed).toBe(30);
    });
  });

  describe('toggleAudio', () => {
    it('toggles audio off', () => {
      useGameStore.getState().toggleAudio();
      expect(useGameStore.getState().audioEnabled).toBe(false);
    });

    it('toggles audio on', () => {
      useGameStore.getState().toggleAudio();
      useGameStore.getState().toggleAudio();
      expect(useGameStore.getState().audioEnabled).toBe(true);
    });
  });

  describe('_hydrate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('merges partial state', () => {
      useGameStore.getState()._hydrate({ status: 'playing' });
      vi.runAllTimers();
      expect(useGameStore.getState().status).toBe('playing');
    });

    it('preserves unaffected state', () => {
      const originalSpeed = useGameStore.getState().autoCallSpeed;
      useGameStore.getState()._hydrate({ status: 'playing' });
      vi.runAllTimers();
      expect(useGameStore.getState().autoCallSpeed).toBe(originalSpeed);
    });

    it('sets _isHydrating flag during hydration', () => {
      // Capture hydrating state during the synchronous part
      let capturedHydrating = false;
      const unsubscribe = useGameStore.subscribe((state) => {
        if (state.status === 'playing') {
          capturedHydrating = state._isHydrating!;
        }
      });

      useGameStore.getState()._hydrate({ status: 'playing' });

      // During hydration (before timers run), the flag should have been true
      expect(capturedHydrating).toBe(true);

      unsubscribe();
    });

    it('clears _isHydrating flag after hydration completes', () => {
      useGameStore.getState()._hydrate({ status: 'playing' });

      // Flag is still true before the setTimeout(0) fires
      expect(useGameStore.getState()._isHydrating).toBe(true);

      // After running all timers, the flag should be cleared
      vi.runAllTimers();
      expect(useGameStore.getState()._isHydrating).toBe(false);
    });

    it('has _isHydrating false initially', () => {
      expect(useGameStore.getState()._isHydrating).toBe(false);
    });
  });

  describe('persist middleware (BEA-722 session recovery)', () => {
    it('writes game state to localStorage when state changes', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().callBall();

      const stored = localStorage.getItem('hgn-bingo-game');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.state).toBeDefined();
      expect(parsed.state.status).toBe('playing');
      expect(parsed.state.calledBalls).toHaveLength(1);
    });

    it('persists autoCallEnabled as false regardless of actual value (safety)', () => {
      useGameStore.getState().startGame();
      // Toggle auto-call on
      useGameStore.setState({ autoCallEnabled: true });

      const stored = localStorage.getItem('hgn-bingo-game');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      // partialize always persists autoCallEnabled=false
      expect(parsed.state.autoCallEnabled).toBe(false);
    });

    it('persists patternId (not the full pattern object)', () => {
      // Use a real registered pattern so the registry can resolve it
      const allPatterns = patternRegistry.getAll();
      expect(allPatterns.length).toBeGreaterThan(0);
      const firstPattern = allPatterns[0];

      useGameStore.getState().setPattern(firstPattern);

      const stored = localStorage.getItem('hgn-bingo-game');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      // patternId is stored, not the full pattern object
      expect(parsed.state.patternId).toBe(firstPattern.id);
      expect(parsed.state.pattern).toBeUndefined();
    });

    it('rehydrate: restores status and called balls from localStorage', async () => {
      const allPatterns = patternRegistry.getAll();
      const targetPattern = allPatterns[0];

      await seedAndRehydrate({
        status: 'playing',
        calledBalls: [{ number: 5, column: 'B', label: 'B5' }],
        currentBall: { number: 5, column: 'B', label: 'B5' },
        previousBall: null,
        remainingBalls: [],
        patternId: targetPattern.id,
        autoCallEnabled: false,
        autoCallSpeed: 10,
        audioEnabled: true,
      });

      // After rehydration the store should reflect the persisted values
      expect(useGameStore.getState().status).toBe('playing');
      expect(useGameStore.getState().calledBalls).toHaveLength(1);
    });

    it('rehydrate: merge resolves BingoPattern from patternId via patternRegistry', async () => {
      const allPatterns = patternRegistry.getAll();
      expect(allPatterns.length).toBeGreaterThan(0);
      const targetPattern = allPatterns[0];

      await seedAndRehydrate({
        status: 'playing',
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        patternId: targetPattern.id,
        autoCallEnabled: false,
        autoCallSpeed: 10,
        audioEnabled: true,
      });

      // The merge callback must resolve the full pattern object from the registry
      expect(useGameStore.getState().pattern).toEqual(targetPattern);
    });

    it('rehydrate: merge sets pattern=null when patternId is null', async () => {
      await seedAndRehydrate({
        status: 'idle',
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        patternId: null,
        autoCallEnabled: false,
        autoCallSpeed: 10,
        audioEnabled: true,
      });

      expect(useGameStore.getState().pattern).toBeNull();
    });

    it('rehydrate: merge sets pattern=null for unknown patternId', async () => {
      await seedAndRehydrate({
        status: 'playing',
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        patternId: 'non-existent-pattern-xyz',
        autoCallEnabled: false,
        autoCallSpeed: 10,
        audioEnabled: true,
      });

      expect(useGameStore.getState().pattern).toBeNull();
    });

    it('rehydrate: merge forces autoCallEnabled=false even if stored as true', async () => {
      await seedAndRehydrate({
        status: 'playing',
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        patternId: null,
        autoCallEnabled: true, // persisted incorrectly; merge must override
        autoCallSpeed: 10,
        audioEnabled: true,
      });

      expect(useGameStore.getState().autoCallEnabled).toBe(false);
    });

    it('rehydrate: _isHydrating is false after rehydration completes', async () => {
      vi.useFakeTimers();
      try {
        await seedAndRehydrate({
          status: 'playing',
          calledBalls: [],
          currentBall: null,
          previousBall: null,
          remainingBalls: [],
          patternId: null,
          autoCallEnabled: false,
          autoCallSpeed: 10,
          audioEnabled: true,
        });

        // After the setTimeout(0) in onRehydrateStorage the flag should clear
        vi.runAllTimers();
        expect(useGameStore.getState()._isHydrating).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('useGameSelectors', () => {
    it('returns computed values', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().callBall();

      const { result } = renderHook(() => useGameSelectors());

      expect(result.current.ballsRemaining).toBe(74);
      expect(result.current.ballsCalled).toBe(1);
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canCall).toBe(true);
      expect(result.current.canStart).toBe(false);
      expect(result.current.canPause).toBe(true);
      expect(result.current.canResume).toBe(false);
    });
  });
});
