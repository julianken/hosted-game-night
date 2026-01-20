import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSync, type AutoSyncConfig } from '../use-auto-sync';

interface TestState {
  count: number;
  calledBalls: number[];
  pattern: string;
  status: string;
  _isHydrating?: boolean;
}

describe('useAutoSync', () => {
  let mockSyncFn: ReturnType<typeof vi.fn<(state: TestState) => Promise<void>>>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSyncFn = vi.fn<(state: TestState) => Promise<void>>().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('debouncing', () => {
    it('should batch rapid state changes within 2s window', async () => {
      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      // First render establishes initial state
      expect(mockSyncFn).not.toHaveBeenCalled();

      // Trigger multiple rapid changes
      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle' } });
        rerender({ state: { count: 2, calledBalls: [], pattern: 'X', status: 'idle' } });
        rerender({ state: { count: 3, calledBalls: [], pattern: 'X', status: 'idle' } });
      });

      // Should not sync immediately
      expect(mockSyncFn).not.toHaveBeenCalled();

      // Wait 1 second - still within debounce window
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(mockSyncFn).not.toHaveBeenCalled();

      // Complete the debounce period
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      // Should sync once with final state
      expect(mockSyncFn).toHaveBeenCalledTimes(1);
      expect(mockSyncFn).toHaveBeenCalledWith({ count: 3, calledBalls: [], pattern: 'X', status: 'idle' });
    });

    it('should sync after debounce period expires', async () => {
      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle' } });
      });

      // Fast-forward past debounce period (2s)
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockSyncFn).toHaveBeenCalledTimes(1);
    });

    it('should reset debounce timer on each change', async () => {
      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      // Change 1
      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle' } });
      });
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Change 2 - resets timer
      act(() => {
        rerender({ state: { count: 2, calledBalls: [], pattern: 'X', status: 'idle' } });
      });
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Still should not have synced
      expect(mockSyncFn).not.toHaveBeenCalled();

      // Wait remaining 500ms to complete the 2s debounce from change 2
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(mockSyncFn).toHaveBeenCalledTimes(1);
      expect(mockSyncFn).toHaveBeenCalledWith({ count: 2, calledBalls: [], pattern: 'X', status: 'idle' });
    });
  });

  describe('throttling', () => {
    it('should sync critical events immediately if > throttleMs elapsed', async () => {
      const config: AutoSyncConfig<TestState> = {
        throttleMs: 500,
        isCriticalChange: (prev, next) => {
          if (prev?.calledBalls.length !== next.calledBalls.length) {
            return 'BALL_CALLED';
          }
          return null;
        },
      };

      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn, config),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      // Trigger critical event
      await act(async () => {
        rerender({ state: { count: 0, calledBalls: [1] as number[], pattern: 'X', status: 'idle' } as TestState });
        await Promise.resolve();
      });

      // Should sync immediately
      expect(mockSyncFn).toHaveBeenCalledTimes(1);
    });

    it('should throttle rapid critical events within throttleMs', async () => {
      const config: AutoSyncConfig<TestState> = {
        throttleMs: 500,
        isCriticalChange: (prev, next) => {
          if (prev?.calledBalls.length !== next.calledBalls.length) {
            return 'BALL_CALLED';
          }
          return null;
        },
      };

      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn, config),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      // First critical event - syncs immediately
      await act(async () => {
        rerender({ state: { count: 0, calledBalls: [1] as number[], pattern: 'X', status: 'idle' } as TestState });
        await Promise.resolve();
      });
      expect(mockSyncFn).toHaveBeenCalledTimes(1);

      // Second critical event within throttle window
      act(() => {
        rerender({ state: { count: 0, calledBalls: [1, 2] as number[], pattern: 'X', status: 'idle' } as TestState });
      });

      // Should not sync immediately
      expect(mockSyncFn).toHaveBeenCalledTimes(1);
    });

    it('should schedule throttled sync after throttleMs', async () => {
      const config: AutoSyncConfig<TestState> = {
        throttleMs: 500,
        isCriticalChange: (prev, next) => {
          if (prev?.calledBalls.length !== next.calledBalls.length) {
            return 'BALL_CALLED';
          }
          return null;
        },
      };

      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn, config),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      // First critical event
      await act(async () => {
        rerender({ state: { count: 0, calledBalls: [1] as number[], pattern: 'X', status: 'idle' } as TestState });
        await Promise.resolve();
      });
      expect(mockSyncFn).toHaveBeenCalledTimes(1);

      // Second critical event within throttle window
      act(() => {
        rerender({ state: { count: 0, calledBalls: [1, 2] as number[], pattern: 'X', status: 'idle' } as TestState });
      });

      // Wait for throttle period
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      // Should now sync the second event
      expect(mockSyncFn).toHaveBeenCalledTimes(2);
      expect(mockSyncFn).toHaveBeenLastCalledWith({ count: 0, calledBalls: [1, 2], pattern: 'X', status: 'idle' });
    });
  });

  describe('critical events', () => {
    it('should sync BALL_CALLED immediately', async () => {
      const config: AutoSyncConfig<TestState> = {
        isCriticalChange: (prev, next) => {
          if (prev?.calledBalls.length !== next.calledBalls.length) {
            return 'BALL_CALLED';
          }
          return null;
        },
      };

      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn, config),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      await act(async () => {
        rerender({ state: { count: 0, calledBalls: [5] as number[], pattern: 'X', status: 'idle' } as TestState });
        await Promise.resolve();
      });

      expect(mockSyncFn).toHaveBeenCalledTimes(1);
      expect(mockSyncFn).toHaveBeenCalledWith({ count: 0, calledBalls: [5], pattern: 'X', status: 'idle' });
    });

    it('should sync PATTERN_CHANGED immediately', async () => {
      const config: AutoSyncConfig<TestState> = {
        isCriticalChange: (prev, next) => {
          if (prev?.pattern !== next.pattern) {
            return 'PATTERN_CHANGED';
          }
          return null;
        },
      };

      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn, config),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      await act(async () => {
        rerender({ state: { count: 0, calledBalls: [], pattern: 'T', status: 'idle' } });
        await Promise.resolve();
      });

      expect(mockSyncFn).toHaveBeenCalledTimes(1);
    });

    it('should sync STATUS_CHANGED immediately', async () => {
      const config: AutoSyncConfig<TestState> = {
        isCriticalChange: (prev, next) => {
          if (prev?.status !== next.status) {
            return 'STATUS_CHANGED';
          }
          return null;
        },
      };

      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn, config),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      await act(async () => {
        rerender({ state: { count: 0, calledBalls: [], pattern: 'X', status: 'playing' } });
        await Promise.resolve();
      });

      expect(mockSyncFn).toHaveBeenCalledTimes(1);
    });

    it('should clear debounce timer when critical event fires', async () => {
      const config: AutoSyncConfig<TestState> = {
        debounceMs: 2000,
        isCriticalChange: (prev, next) => {
          if (prev?.calledBalls.length !== next.calledBalls.length) {
            return 'BALL_CALLED';
          }
          return null;
        },
      };

      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn, config),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      // Non-critical change (starts debounce)
      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle' } });
        vi.advanceTimersByTime(1000);
      });

      // Critical change before debounce expires
      await act(async () => {
        rerender({ state: { count: 1, calledBalls: [5] as number[], pattern: 'X', status: 'idle' } as TestState });
        await Promise.resolve();
      });

      // Critical event should sync immediately
      expect(mockSyncFn).toHaveBeenCalledTimes(1);
      expect(mockSyncFn).toHaveBeenCalledWith({ count: 1, calledBalls: [5], pattern: 'X', status: 'idle' });

      // Complete the original debounce period
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      // Should not trigger another sync
      expect(mockSyncFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('hydration protection', () => {
    it('should skip sync when _isHydrating is true', async () => {
      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn),
        { initialProps: { state: { count: 0, calledBalls: [], pattern: 'X', status: 'idle', _isHydrating: true } } }
      );

      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle', _isHydrating: true } });
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockSyncFn).not.toHaveBeenCalled();
    });

    it('should resume sync when _isHydrating becomes false', async () => {
      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn),
        { initialProps: { state: { count: 0, calledBalls: [], pattern: 'X', status: 'idle', _isHydrating: true } } }
      );

      // Change while hydrating
      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle', _isHydrating: true } });
      });
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve();
      });
      expect(mockSyncFn).not.toHaveBeenCalled();

      // Hydration completes
      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle', _isHydrating: false } });
      });

      // This change shouldn't trigger sync (first non-hydrating state is used as baseline)
      expect(mockSyncFn).not.toHaveBeenCalled();

      // Next change should trigger sync
      act(() => {
        rerender({ state: { count: 2, calledBalls: [], pattern: 'X', status: 'idle', _isHydrating: false } });
      });
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockSyncFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('manual trigger', () => {
    it('should sync immediately when triggerSync() called', async () => {
      const { result } = renderHook(() =>
        useAutoSync({ count: 0, calledBalls: [], pattern: 'X', status: 'idle' }, mockSyncFn)
      );

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockSyncFn).toHaveBeenCalledTimes(1);
      expect(mockSyncFn).toHaveBeenCalledWith({ count: 0, calledBalls: [], pattern: 'X', status: 'idle' });
    });

    it('should bypass debounce when manually triggered', async () => {
      const { result, rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      // Trigger a debounced change
      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle' } });
        vi.advanceTimersByTime(1000);
      });

      // Manually trigger sync before debounce expires
      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockSyncFn).toHaveBeenCalledTimes(1);
      expect(mockSyncFn).toHaveBeenCalledWith({ count: 1, calledBalls: [], pattern: 'X', status: 'idle' });

      // Complete debounce period - should not trigger another sync
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      expect(mockSyncFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should clear debounce timer on unmount', async () => {
      const { rerender, unmount } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle' } });
      });

      // Unmount before debounce expires
      unmount();

      // Complete debounce period
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      // Should not sync after unmount
      expect(mockSyncFn).not.toHaveBeenCalled();
    });

    it('should clear throttle timer on unmount', async () => {
      const config: AutoSyncConfig<TestState> = {
        throttleMs: 500,
        isCriticalChange: (prev, next) => {
          if (prev?.calledBalls.length !== next.calledBalls.length) {
            return 'BALL_CALLED';
          }
          return null;
        },
      };

      const { rerender, unmount } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn, config),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      // First critical event
      await act(async () => {
        rerender({ state: { count: 0, calledBalls: [1] as number[], pattern: 'X', status: 'idle' } as TestState });
        await Promise.resolve();
      });
      expect(mockSyncFn).toHaveBeenCalledTimes(1);

      // Second critical event (throttled)
      act(() => {
        rerender({ state: { count: 0, calledBalls: [1, 2] as number[], pattern: 'X', status: 'idle' } as TestState });
      });

      // Unmount before throttle expires
      unmount();

      // Complete throttle period
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      // Should not sync after unmount
      expect(mockSyncFn).toHaveBeenCalledTimes(1);
    });

    it('should not update state after unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useAutoSync({ count: 0, calledBalls: [], pattern: 'X', status: 'idle' }, mockSyncFn)
      );

      unmount();

      // Try to trigger sync after unmount
      await result.current.triggerSync();

      // Should not have synced or updated state
      expect(mockSyncFn).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should set error state when sync fails', async () => {
      const testError = new Error('Sync failed');
      const failingSyncFn = vi.fn<(state: TestState) => Promise<void>>().mockRejectedValue(testError);

      const { result, rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, failingSyncFn),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle' } });
      });
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(result.current.error).toEqual(testError);
    });

    it('should call onSyncError callback', async () => {
      const testError = new Error('Sync failed');
      const failingSyncFn = vi.fn<(state: TestState) => Promise<void>>().mockRejectedValue(testError);
      const onSyncError = vi.fn();

      const config: AutoSyncConfig<TestState> = {
        onSyncError,
      };

      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, failingSyncFn, config),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle' } });
      });
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(onSyncError).toHaveBeenCalledWith(testError);
    });

    it('should continue syncing after error', async () => {
      const testError = new Error('Sync failed');
      const failingSyncFn = vi.fn<(state: TestState) => Promise<void>>()
        .mockRejectedValueOnce(testError)
        .mockResolvedValueOnce(undefined);

      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, failingSyncFn),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      // First change - fails
      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle' } });
      });
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve();
      });
      expect(failingSyncFn).toHaveBeenCalledTimes(1);

      // Second change - succeeds
      act(() => {
        rerender({ state: { count: 2, calledBalls: [], pattern: 'X', status: 'idle' } });
      });
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve();
      });
      expect(failingSyncFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('callbacks', () => {
    it('should call onSyncStart when sync begins', async () => {
      const onSyncStart = vi.fn();
      const config: AutoSyncConfig<TestState> = {
        onSyncStart,
      };

      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn, config),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle' } });
      });
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(onSyncStart).toHaveBeenCalledTimes(1);
    });

    it('should call onSyncSuccess when sync completes', async () => {
      const onSyncSuccess = vi.fn();
      const config: AutoSyncConfig<TestState> = {
        onSyncSuccess,
      };

      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn, config),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle' } });
      });
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(onSyncSuccess).toHaveBeenCalledTimes(1);
      expect(onSyncSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          lastSyncTime: expect.any(Date),
        })
      );
    });
  });

  describe('enabled flag', () => {
    it('should not sync when enabled is false', async () => {
      const config: AutoSyncConfig<TestState> = {
        enabled: false,
      };

      const { rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn, config),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle' } });
      });
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockSyncFn).not.toHaveBeenCalled();
    });

    it('should not sync manually when enabled is false', async () => {
      const config: AutoSyncConfig<TestState> = {
        enabled: false,
      };

      const { result } = renderHook(() =>
        useAutoSync({ count: 0, calledBalls: [], pattern: 'X', status: 'idle' }, mockSyncFn, config)
      );

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockSyncFn).not.toHaveBeenCalled();
    });
  });

  describe('sync status', () => {
    it('should set isSyncing to true during sync', async () => {
      let resolveFn: (() => void) | null = null;
      const slowSyncFn = vi.fn<(state: TestState) => Promise<void>>().mockImplementation(
        () => new Promise<void>(resolve => { resolveFn = resolve; })
      );

      const { result, rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, slowSyncFn),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      expect(result.current.isSyncing).toBe(false);

      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle' } });
      });
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(result.current.isSyncing).toBe(true);

      await act(async () => {
        resolveFn?.();
        await Promise.resolve();
      });

      expect(result.current.isSyncing).toBe(false);
    });

    it('should update lastSyncTime on successful sync', async () => {
      const { result, rerender } = renderHook(
        ({ state }: { state: TestState }) => useAutoSync(state, mockSyncFn),
        { initialProps: { state: { count: 0, calledBalls: [] as number[], pattern: 'X', status: 'idle' } as TestState } }
      );

      expect(result.current.lastSyncTime).toBeNull();

      act(() => {
        rerender({ state: { count: 1, calledBalls: [], pattern: 'X', status: 'idle' } });
      });
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(result.current.lastSyncTime).toBeInstanceOf(Date);
    });
  });
});
