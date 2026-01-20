'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Configuration for auto-sync behavior
 */
export interface AutoSyncConfig<TState = unknown> {
  /**
   * Debounce delay for general state changes (ms)
   * @default 2000
   */
  debounceMs?: number;

  /**
   * Throttle delay for rapid critical events (ms)
   * @default 500
   */
  throttleMs?: number;

  /**
   * Events that bypass debounce and sync immediately
   * @default ['BALL_CALLED', 'PATTERN_CHANGED', 'STATUS_CHANGED']
   */
  criticalEvents?: string[];

  /**
   * Enable/disable auto-sync
   * @default true
   */
  enabled?: boolean;

  /**
   * Callback when sync starts
   */
  onSyncStart?: () => void;

  /**
   * Callback when sync succeeds
   */
  onSyncSuccess?: (data: { lastSyncTime: Date; sequenceNumber?: number }) => void;

  /**
   * Callback when sync fails
   */
  onSyncError?: (error: Error) => void;

  /**
   * Function to determine if a state change is critical
   * If not provided, hook will not auto-detect critical events
   */
  isCriticalChange?: (
    prevState: TState | null,
    nextState: TState
  ) => string | null;
}

/**
 * Return value from useAutoSync hook
 */
export interface UseAutoSyncReturn {
  /** Whether a sync operation is currently in progress */
  isSyncing: boolean;
  /** Timestamp of last successful sync */
  lastSyncTime: Date | null;
  /** Last error that occurred during sync */
  error: Error | null;
  /** Manually trigger a sync (bypasses debounce) */
  triggerSync: () => Promise<void>;
}

/**
 * Hook that automatically syncs game state to database with smart debouncing
 *
 * Implements the auto-sync strategy from the persistent sessions feature:
 * - Debounces general state changes (default 2s) to batch rapid updates
 * - Immediately syncs critical events (ball called, pattern changed, etc.)
 * - Throttles rapid successive events to prevent database spam
 * - Skips sync during hydration to avoid overwriting fresh data
 * - Provides sync status and error reporting
 *
 * @example
 * ```tsx
 * const { isSyncing, lastSyncTime, error } = useAutoSync(
 *   gameState,
 *   async (state) => {
 *     await fetch('/api/sessions/SWAN-42/state', {
 *       method: 'PATCH',
 *       body: JSON.stringify({ state })
 *     });
 *   },
 *   {
 *     debounceMs: 2000,
 *     criticalEvents: ['BALL_CALLED', 'PATTERN_CHANGED'],
 *     isCriticalChange: (prev, next) => {
 *       if (prev?.calledBalls?.length !== next?.calledBalls?.length) {
 *         return 'BALL_CALLED';
 *       }
 *       return null;
 *     }
 *   }
 * );
 * ```
 */
export function useAutoSync<TState extends { _isHydrating?: boolean }>(
  state: TState,
  syncFn: (state: TState) => Promise<unknown>,
  config: AutoSyncConfig<TState> = {}
): UseAutoSyncReturn {
  const {
    debounceMs = 2000,
    throttleMs = 500,
    criticalEvents = ['BALL_CALLED', 'PATTERN_CHANGED', 'STATUS_CHANGED'],
    enabled = true,
    onSyncStart,
    onSyncSuccess,
    onSyncError,
    isCriticalChange,
  } = config;

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs for timers and tracking
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastThrottledSyncRef = useRef<number>(0);
  const prevStateRef = useRef<TState | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Core sync function with error handling
   */
  const performSync = useCallback(
    async (stateToSync: TState) => {
      if (!enabled || !isMountedRef.current) return;

      try {
        setIsSyncing(true);
        setError(null);
        onSyncStart?.();

        await syncFn(stateToSync);

        if (isMountedRef.current) {
          const syncTime = new Date();
          setLastSyncTime(syncTime);
          onSyncSuccess?.({ lastSyncTime: syncTime });
        }
      } catch (err) {
        const syncError = err instanceof Error ? err : new Error(String(err));
        if (isMountedRef.current) {
          setError(syncError);
          onSyncError?.(syncError);
        }
      } finally {
        if (isMountedRef.current) {
          setIsSyncing(false);
        }
      }
    },
    [enabled, syncFn, onSyncStart, onSyncSuccess, onSyncError]
  );

  /**
   * Immediate sync (for critical events)
   */
  const syncImmediate = useCallback(
    async (stateToSync: TState) => {
      // Clear any pending debounced sync
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      await performSync(stateToSync);
    },
    [performSync]
  );

  /**
   * Throttled sync (for rapid critical events)
   */
  const syncThrottled = useCallback(
    async (stateToSync: TState) => {
      const now = Date.now();
      const timeSinceLastSync = now - lastThrottledSyncRef.current;

      if (timeSinceLastSync >= throttleMs) {
        // Enough time has passed, sync immediately
        lastThrottledSyncRef.current = now;
        await syncImmediate(stateToSync);
      } else {
        // Too soon, schedule sync after throttle period
        if (throttleTimerRef.current) {
          clearTimeout(throttleTimerRef.current);
        }

        throttleTimerRef.current = setTimeout(() => {
          lastThrottledSyncRef.current = Date.now();
          void performSync(stateToSync);
        }, throttleMs - timeSinceLastSync);
      }
    },
    [throttleMs, syncImmediate, performSync]
  );

  /**
   * Debounced sync (for general state changes)
   */
  const syncDebounced = useCallback(
    (stateToSync: TState) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        void performSync(stateToSync);
      }, debounceMs);
    },
    [debounceMs, performSync]
  );

  /**
   * Manual sync trigger (bypasses debounce)
   */
  const triggerSync = useCallback(async () => {
    await syncImmediate(state);
  }, [state, syncImmediate]);

  /**
   * Main effect: Watch state changes and trigger appropriate sync strategy
   */
  useEffect(() => {
    // Skip if disabled
    if (!enabled) return;

    // Skip during hydration
    if (state._isHydrating) {
      prevStateRef.current = state;
      return;
    }

    // Skip if this is the first render (no previous state to compare)
    if (prevStateRef.current === null) {
      prevStateRef.current = state;
      return;
    }

    // Determine if this is a critical change
    const criticalEventType = isCriticalChange?.(prevStateRef.current, state);
    const isCritical = criticalEventType && criticalEvents.includes(criticalEventType);

    // Update previous state
    prevStateRef.current = state;

    if (isCritical) {
      // Critical events: use throttled sync to prevent spam while ensuring delivery
      void syncThrottled(state);
    } else {
      // General state changes: use debounced sync to batch updates
      syncDebounced(state);
    }
  }, [state, enabled, criticalEvents, isCriticalChange, syncThrottled, syncDebounced]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, []);

  return {
    isSyncing,
    lastSyncTime,
    error,
    triggerSync,
  };
}
