import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGame, useGameKeyboard } from '../use-game';
import { useGameStore } from '@/stores/game-store';
import { useAudioStore } from '@/stores/audio-store';
import { BingoPattern } from '@/types';

// Mock Audio globally for all tests
class MockAudio {
  volume = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(() => {
    // Immediately trigger onended
    this.onended?.();
    return Promise.resolve();
  });
}

describe('use-game', () => {
  const mockPattern: BingoPattern = {
    id: 'test-pattern',
    name: 'Test Pattern',
    category: 'lines',
    cells: [{ row: 0, col: 0 }],
  };

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress expected console.error from loadManifest failures
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.stubGlobal('Audio', MockAudio);

    // Reset stores
    useGameStore.setState({
      status: 'idle',
      calledBalls: [],
      currentBall: null,
      previousBall: null,
      remainingBalls: Array.from({ length: 75 }, (_, i) => ({
        column: ['B', 'I', 'N', 'G', 'O'][Math.floor(i / 15)] as 'B' | 'I' | 'N' | 'G' | 'O',
        number: i + 1,
        label: `${['B', 'I', 'N', 'G', 'O'][Math.floor(i / 15)]}-${i + 1}`,
      })),
      pattern: null,
      autoCallEnabled: false,
      autoCallSpeed: 10,
      audioEnabled: true,
    });

    useAudioStore.setState({
      enabled: true,
      voiceVolume: 0.8,
      rollSoundVolume: 0.8,
      chimeVolume: 0.8,
      isPlaying: false,
      voicePack: 'standard',
      useFallbackTTS: true,
      manifest: null,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('useGame', () => {
    describe('state', () => {
      it('returns game state', () => {
        const { result } = renderHook(() => useGame());

        expect(result.current.status).toBe('idle');
        expect(result.current.remainingBalls).toHaveLength(75);
        expect(result.current.calledBalls).toHaveLength(0);
        expect(result.current.currentBall).toBeNull();
      });

      it('returns computed values', () => {
        const { result } = renderHook(() => useGame());

        expect(result.current.ballsRemaining).toBe(75);
        expect(result.current.ballsCalled).toBe(0);
        expect(result.current.canStart).toBe(true);
        expect(result.current.canCall).toBe(false);
      });
    });

    describe('startGame', () => {
      it('starts the game', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
        });

        expect(result.current.status).toBe('playing');
      });

      it('starts with a pattern', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame(mockPattern);
        });

        expect(result.current.pattern).toEqual(mockPattern);
      });
    });

    describe('undoCall', () => {
      it('undoes the last ball call', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
          useGameStore.getState().callBall();
        });

        expect(result.current.calledBalls).toHaveLength(1);

        act(() => {
          result.current.undoCall();
        });

        expect(result.current.calledBalls).toHaveLength(0);
      });
    });

    describe('pauseGame', () => {
      it('pauses the game', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
          result.current.pauseGame();
        });

        expect(result.current.status).toBe('paused');
      });
    });

    describe('resumeGame', () => {
      it('resumes the game', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
          result.current.pauseGame();
          result.current.resumeGame();
        });

        expect(result.current.status).toBe('playing');
      });
    });

    describe('endGame', () => {
      it('ends the game', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
          result.current.endGame();
        });

        expect(result.current.status).toBe('ended');
      });
    });

    describe('resetGame', () => {
      it('resets the game', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
          useGameStore.getState().callBall();
          result.current.resetGame();
        });

        expect(result.current.status).toBe('idle');
        expect(result.current.calledBalls).toHaveLength(0);
      });
    });

    describe('reset confirmation', () => {
      it('requestReset shows confirmation when game is playing', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
        });

        expect(result.current.status).toBe('playing');

        act(() => {
          result.current.requestReset();
        });

        expect(result.current.showResetConfirm).toBe(true);
        expect(result.current.status).toBe('playing'); // Not reset yet
      });

      it('requestReset shows confirmation when game is paused', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
          result.current.pauseGame();
        });

        expect(result.current.status).toBe('paused');

        act(() => {
          result.current.requestReset();
        });

        expect(result.current.showResetConfirm).toBe(true);
        expect(result.current.status).toBe('paused'); // Not reset yet
      });

      it('requestReset resets immediately when game is idle', () => {
        const { result } = renderHook(() => useGame());

        expect(result.current.status).toBe('idle');

        act(() => {
          result.current.requestReset();
        });

        expect(result.current.showResetConfirm).toBe(false);
        expect(result.current.status).toBe('idle');
      });

      it('requestReset resets immediately when game is ended', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
          result.current.endGame();
        });

        expect(result.current.status).toBe('ended');

        act(() => {
          result.current.requestReset();
        });

        expect(result.current.showResetConfirm).toBe(false);
        expect(result.current.status).toBe('idle');
      });

      it('confirmReset resets the game and closes dialog', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
          useGameStore.getState().callBall();
        });

        expect(result.current.calledBalls).toHaveLength(1);

        act(() => {
          result.current.requestReset();
        });

        expect(result.current.showResetConfirm).toBe(true);

        act(() => {
          result.current.confirmReset();
        });

        expect(result.current.showResetConfirm).toBe(false);
        expect(result.current.status).toBe('idle');
        expect(result.current.calledBalls).toHaveLength(0);
      });

      it('cancelReset keeps the game running and closes dialog', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
          useGameStore.getState().callBall();
        });

        const calledBallsCount = result.current.calledBalls.length;

        act(() => {
          result.current.requestReset();
        });

        expect(result.current.showResetConfirm).toBe(true);

        act(() => {
          result.current.cancelReset();
        });

        expect(result.current.showResetConfirm).toBe(false);
        expect(result.current.status).toBe('playing');
        expect(result.current.calledBalls).toHaveLength(calledBallsCount);
      });
    });

    describe('setPattern', () => {
      it('sets the pattern', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.setPattern(mockPattern);
        });

        expect(result.current.pattern).toEqual(mockPattern);
      });
    });

    describe('toggleAutoCall', () => {
      it('toggles auto-call', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.toggleAutoCall();
        });

        expect(result.current.autoCallEnabled).toBe(true);
      });
    });

    describe('setAutoCallSpeed', () => {
      it('sets auto-call speed', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.setAutoCallSpeed(15);
        });

        expect(result.current.autoCallSpeed).toBe(15);
      });
    });

    describe('toggleAudio', () => {
      it('toggles audio', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.toggleAudio();
        });

        expect(result.current.audioEnabled).toBe(false);
      });
    });

    describe('auto-call timeout', () => {
      it('clears timeout on unmount when auto-call enabled', () => {
        vi.useFakeTimers();
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

        const { result, unmount } = renderHook(() => useGame());

        // Start game and enable auto-call
        act(() => {
          result.current.startGame();
          result.current.toggleAutoCall();
        });

        // Verify auto-call is enabled and timeout should be set
        expect(result.current.autoCallEnabled).toBe(true);
        expect(result.current.status).toBe('playing');

        // Unmount and verify cleanup
        unmount();

        expect(clearTimeoutSpy).toHaveBeenCalled();

        clearTimeoutSpy.mockRestore();
        vi.useRealTimers();
      });

      it('calls ball automatically when auto-call is enabled', async () => {
        vi.useFakeTimers();

        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
          result.current.setAutoCallSpeed(5); // 5 seconds
          result.current.toggleAutoCall();
        });

        const initialCalled = result.current.ballsCalled;

        // Advance timer by auto-call speed and flush pending promises
        await act(async () => {
          vi.advanceTimersByTime(5000);
          await Promise.resolve();
        });

        // Should have called a ball
        expect(result.current.ballsCalled).toBe(initialCalled + 1);

        vi.useRealTimers();
      });

      it('auto-calls the last remaining ball (off-by-one bug test)', async () => {
        vi.useFakeTimers();

        // Create a state with only 3 balls remaining
        const threeBalls = [
          { column: 'B' as const, number: 1, label: 'B-1' },
          { column: 'I' as const, number: 16, label: 'I-16' },
          { column: 'N' as const, number: 31, label: 'N-31' },
        ];

        useGameStore.setState({
          status: 'playing',
          calledBalls: [],
          currentBall: null,
          previousBall: null,
          remainingBalls: threeBalls,
          pattern: null,
          autoCallEnabled: true,
          autoCallSpeed: 5,
          audioEnabled: false, // Disable audio to speed up tests
        });

        const { result } = renderHook(() => useGame());

        expect(result.current.ballsRemaining).toBe(3);
        expect(result.current.autoCallEnabled).toBe(true);

        // Call first ball automatically
        await act(async () => {
          vi.advanceTimersByTime(5000);
          await Promise.resolve();
        });
        expect(result.current.ballsRemaining).toBe(2);

        // Call second ball automatically
        await act(async () => {
          vi.advanceTimersByTime(5000);
          await Promise.resolve();
        });
        expect(result.current.ballsRemaining).toBe(1);

        // Call the LAST ball automatically - this is where the bug was reported
        await act(async () => {
          vi.advanceTimersByTime(5000);
          await Promise.resolve();
        });

        // BUG: Last ball should be called but was reported as not being called
        expect(result.current.ballsRemaining).toBe(0);
        expect(result.current.ballsCalled).toBe(3);

        vi.useRealTimers();
      });

    });

    describe('race condition prevention', () => {
      it('prevents concurrent callBall invocations', async () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
        });

        // Call ball multiple times rapidly - only one should succeed per call
        const initialCalled = result.current.ballsCalled;

        // First call should succeed
        await act(async () => {
          await result.current.callBall();
        });

        expect(result.current.ballsCalled).toBe(initialCalled + 1);

        // Subsequent sequential calls should also work (not concurrent)
        await act(async () => {
          await result.current.callBall();
        });

        expect(result.current.ballsCalled).toBe(initialCalled + 2);
      });

      it('clears auto-call timeout when game is paused', async () => {
        vi.useFakeTimers();
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
          result.current.toggleAutoCall();
        });

        expect(result.current.autoCallEnabled).toBe(true);

        // Pause the game - should clear timeout
        act(() => {
          result.current.pauseGame();
        });

        expect(clearTimeoutSpy).toHaveBeenCalled();

        clearTimeoutSpy.mockRestore();
        vi.useRealTimers();
      });
    });

    describe('recentBalls', () => {
      it('returns recent balls in reverse order', () => {
        const { result } = renderHook(() => useGame());

        act(() => {
          result.current.startGame();
          useGameStore.getState().callBall();
          useGameStore.getState().callBall();
          useGameStore.getState().callBall();
        });

        expect(result.current.recentBalls).toHaveLength(3);
        expect(result.current.recentBalls[0]).toEqual(result.current.currentBall);
      });
    });
  });

  describe('useGameKeyboard', () => {
    it('calls ball on Space key when canCall is true', async () => {
      const { result } = renderHook(() => useGameKeyboard());

      act(() => {
        result.current.startGame();
      });

      expect(result.current.canCall).toBe(true);
      const initialCalled = result.current.ballsCalled;

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.ballsCalled).toBe(initialCalled + 1);
      });
    });

    it('does not call ball on Space key when canCall is false', () => {
      const { result } = renderHook(() => useGameKeyboard());

      // Not started yet - canCall should be false
      expect(result.current.canCall).toBe(false);
      const initialCalled = result.current.ballsCalled;

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      });

      expect(result.current.ballsCalled).toBe(initialCalled);
    });

    it('prevents default on Space key', async () => {
      const { result } = renderHook(() => useGameKeyboard());

      act(() => {
        result.current.startGame();
      });

      const event = new KeyboardEvent('keydown', { code: 'Space', cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      await act(async () => {
        window.dispatchEvent(event);
        await Promise.resolve();
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('pauses on P key when playing', () => {
      const { result } = renderHook(() => useGameKeyboard());

      act(() => {
        result.current.startGame();
      });

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' }));
      });

      expect(result.current.status).toBe('paused');
    });

    it('resumes on P key when paused', () => {
      const { result } = renderHook(() => useGameKeyboard());

      act(() => {
        result.current.startGame();
        result.current.pauseGame();
      });

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' }));
      });

      expect(result.current.status).toBe('playing');
    });

    it('shows confirmation dialog on R key when game is playing', () => {
      const { result } = renderHook(() => useGameKeyboard());

      act(() => {
        result.current.startGame();
        useGameStore.getState().callBall();
      });

      expect(result.current.status).toBe('playing');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
      });

      // Should NOT reset immediately - should show confirmation instead
      expect(result.current.status).toBe('playing');
      expect(result.current.showResetConfirm).toBe(true);
    });

    it('resets immediately on R key when game is idle', () => {
      const { result } = renderHook(() => useGameKeyboard());

      // Game starts in idle state
      expect(result.current.status).toBe('idle');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
      });

      // Should reset without confirmation (already idle, no game in progress)
      expect(result.current.showResetConfirm).toBe(false);
      expect(result.current.status).toBe('idle');
    });

    it('undoes on U key when canUndo', () => {
      const { result } = renderHook(() => useGameKeyboard());

      act(() => {
        result.current.startGame();
        useGameStore.getState().callBall();
      });

      const callsBefore = result.current.ballsCalled;

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyU' }));
      });

      expect(result.current.ballsCalled).toBe(callsBefore - 1);
    });

    it('toggles audio on M key', () => {
      const { result } = renderHook(() => useGameKeyboard());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
      });

      expect(result.current.audioEnabled).toBe(false);
    });

    it('ignores keys when typing in input', () => {
      const { result } = renderHook(() => useGameKeyboard());

      act(() => {
        result.current.startGame();
      });

      const input = document.createElement('input');
      document.body.appendChild(input);

      act(() => {
        const event = new KeyboardEvent('keydown', { code: 'KeyR', bubbles: true });
        Object.defineProperty(event, 'target', { value: input, writable: false });
        window.dispatchEvent(event);
      });

      // Should NOT have reset
      expect(result.current.status).toBe('playing');

      document.body.removeChild(input);
    });
  });
});
