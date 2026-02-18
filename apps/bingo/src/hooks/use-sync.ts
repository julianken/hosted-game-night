'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useSyncStore, useSyncHeartbeat, type SyncRole } from '@joolie-boolie/sync';
import { useGameStore } from '@/stores/game-store';
import { BroadcastSync } from '@joolie-boolie/sync';
import { getChannelName } from '@/lib/sync/session';
import type { GameState, BingoBall, BingoPattern, ThemeMode, AudioSettingsPayload, BingoSyncMessage } from '@/types';
import { useThemeStore } from '@/stores/theme-store';

// Bingo-specific payload union type (used for BroadcastSync generic parameter)
type BingoSyncPayload = GameState | BingoBall | BingoPattern | AudioSettingsPayload | { theme: ThemeMode } | null;

/**
 * Extended BroadcastSync with bingo-specific convenience methods.
 */
class BingoBroadcastSync extends BroadcastSync<BingoSyncPayload> {
  /**
   * Override to use GAME_STATE_UPDATE instead of base class's STATE_UPDATE.
   */
  broadcastState(state: BingoSyncPayload): void {
    this.send('GAME_STATE_UPDATE', state);
  }

  broadcastBallCalled(ball: BingoBall): void {
    this.send('BALL_CALLED', ball);
  }

  broadcastReset(): void {
    this.send('GAME_RESET', null);
  }

  broadcastPatternChanged(pattern: BingoPattern): void {
    this.send('PATTERN_CHANGED', pattern);
  }

  broadcastAudioSettings(settings: AudioSettingsPayload): void {
    this.send('AUDIO_SETTINGS_CHANGED', settings);
  }

  broadcastDisplayTheme(theme: ThemeMode): void {
    this.send('DISPLAY_THEME_CHANGED', { theme });
  }
}

/**
 * Factory function to create a session-scoped BingoBroadcastSync instance.
 */
function createBingoBroadcastSync(sessionId: string): BingoBroadcastSync {
  const channelName = getChannelName(sessionId);
  return new BingoBroadcastSync(channelName);
}

type MessageHandler = (message: BingoSyncMessage) => void;

/**
 * Create a message handler that routes messages by type.
 * Uses discriminated union narrowing -- no manual type casts required.
 */
export function createMessageRouter(handlers: Partial<{
  onStateUpdate: (state: GameState) => void;
  onBallCalled: (ball: BingoBall) => void;
  onReset: () => void;
  onPatternChanged: (pattern: BingoPattern) => void;
  onSyncRequest: () => void;
  onAudioSettingsChanged: (settings: AudioSettingsPayload) => void;
  onDisplayThemeChanged: (theme: ThemeMode) => void;
}>): MessageHandler {
  return (message: BingoSyncMessage) => {
    switch (message.type) {
      case 'GAME_STATE_UPDATE':
        handlers.onStateUpdate?.(message.payload);
        break;
      case 'BALL_CALLED':
        handlers.onBallCalled?.(message.payload);
        break;
      case 'GAME_RESET':
        handlers.onReset?.();
        break;
      case 'PATTERN_CHANGED':
        handlers.onPatternChanged?.(message.payload);
        break;
      case 'REQUEST_SYNC':
        handlers.onSyncRequest?.();
        break;
      case 'AUDIO_SETTINGS_CHANGED':
        handlers.onAudioSettingsChanged?.(message.payload);
        break;
      case 'DISPLAY_THEME_CHANGED':
        handlers.onDisplayThemeChanged?.(message.payload.theme);
        break;
    }
  };
}

interface UseSyncOptions {
  role: SyncRole;
  sessionId: string;
}

/**
 * Hook for managing dual-screen synchronization.
 *
 * Presenter: Broadcasts state changes to audience windows.
 * Audience: Receives and applies state updates from presenter.
 */
export function useSync({ role, sessionId }: UseSyncOptions) {
  const isInitializedRef = useRef(false);

  // Create a session-scoped BroadcastSync instance
  const broadcastSync = useMemo(() => {
    return createBingoBroadcastSync(sessionId);
  }, [sessionId]);

  // Get current game state for broadcasting
  const getCurrentState = useCallback((): GameState => {
    const state = useGameStore.getState();
    return {
      status: state.status,
      calledBalls: state.calledBalls,
      currentBall: state.currentBall,
      previousBall: state.previousBall,
      remainingBalls: state.remainingBalls,
      pattern: state.pattern,
      autoCallEnabled: state.autoCallEnabled,
      autoCallSpeed: state.autoCallSpeed,
      audioEnabled: state.audioEnabled,
    };
  }, []);

  // Broadcast state update (presenter only)
  const broadcastState = useCallback(() => {
    if (role !== 'presenter') return;
    const state = getCurrentState();
    broadcastSync.broadcastState(state);
  }, [role, getCurrentState, broadcastSync]);

  // Handle incoming messages
  const handleStateUpdate = useCallback(
    (state: GameState) => {
      if (role !== 'audience') return;
      useGameStore.getState()._hydrate(state);
      useSyncStore.getState().updateLastSync();
    },
    [role]
  );

  const handleBallCalled = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_ball: BingoBall) => {
      if (role !== 'audience') return;
      // Ball called events are handled via state updates
      // This handler can be used for additional UI effects
      useSyncStore.getState().updateLastSync();
    },
    [role]
  );

  const handleReset = useCallback(() => {
    if (role !== 'audience') return;
    useGameStore.getState().resetGame();
    useSyncStore.getState().updateLastSync();
  }, [role]);

  const handlePatternChanged = useCallback(
    (pattern: BingoPattern) => {
      if (role !== 'audience') return;
      useGameStore.getState().setPattern(pattern);
      useSyncStore.getState().updateLastSync();
    },
    [role]
  );

  const handleSyncRequest = useCallback(() => {
    if (role !== 'presenter') return;
    // Audience requested sync, broadcast current state
    broadcastState();
    // Also broadcast current display theme
    const { displayTheme } = useThemeStore.getState();
    broadcastSync.broadcastDisplayTheme(displayTheme);
  }, [role, broadcastState, broadcastSync]);

  // Handle display theme change from presenter (audience only)
  const handleDisplayThemeChanged = useCallback(
    (theme: ThemeMode) => {
      if (role !== 'audience') return;
      useThemeStore.getState().setDisplayTheme(theme);
      useSyncStore.getState().updateLastSync();
    },
    [role]
  );

  // Track whether we've received state from presenter (for retry logic)
  const hasReceivedStateRef = useRef(false);

  // Initialize broadcast channel
  useEffect(() => {
    if (isInitializedRef.current) return;

    const success = broadcastSync.initialize();
    if (!success) {
      useSyncStore.getState().setConnectionError('Failed to initialize sync channel');
      return;
    }

    useSyncStore.getState().setRole(role);
    useSyncStore.getState().setConnected(true);
    isInitializedRef.current = true;
    hasReceivedStateRef.current = false; // Reset state received flag

    // Subscribe to messages
    const router = createMessageRouter({
      onStateUpdate: (state) => {
        hasReceivedStateRef.current = true; // Mark that we received state
        handleStateUpdate(state);
      },
      onBallCalled: handleBallCalled,
      onReset: handleReset,
      onPatternChanged: handlePatternChanged,
      onSyncRequest: handleSyncRequest,
      onDisplayThemeChanged: handleDisplayThemeChanged,
    });

    // Cast at the transport boundary: BroadcastSync uses a generic SyncMessage<TPayload>
    // while our router expects the discriminated BingoSyncMessage union.
    // This is safe because the BingoBroadcastSync class only sends valid BingoSyncMessage types.
    const unsubscribe = broadcastSync.subscribe(
      router as unknown as (message: import('@joolie-boolie/sync').SyncMessage<BingoSyncPayload>) => void
    );

    // If audience, request initial sync with retry logic
    // This handles the race condition where presenter may not be ready yet
    let retryCount = 0;
    const maxRetries = 5;
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

    function requestSyncWithRetry() {
      broadcastSync.requestSync();

      // Schedule retry if we haven't received state yet
      retryTimeoutId = setTimeout(() => {
        if (!hasReceivedStateRef.current && retryCount < maxRetries) {
          retryCount++;
          console.log(`[Display] REQUEST_SYNC retry ${retryCount}/${maxRetries}`);
          requestSyncWithRetry();
        }
      }, 100 * Math.pow(2, retryCount)); // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
    }

    if (role === 'audience') {
      requestSyncWithRetry();
    }

    return () => {
      unsubscribe();
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
      broadcastSync.close();
      useSyncStore.getState().reset();
      isInitializedRef.current = false;
      hasReceivedStateRef.current = false;
    };
  }, [
    role,
    broadcastSync,
    handleStateUpdate,
    handleBallCalled,
    handleReset,
    handlePatternChanged,
    handleSyncRequest,
    handleDisplayThemeChanged,
  ]); // Zustand actions accessed via getState() - no subscription, no re-renders

  // Subscribe to game state changes (presenter only)
  useEffect(() => {
    if (role !== 'presenter') return;

    // Subscribe to game store changes
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      // SYNC LOOP PROTECTION: Skip broadcast if state is being hydrated from sync
      if (state._isHydrating) {
        return;
      }

      // Broadcast on any state change
      if (state !== prevState) {
        broadcastSync.broadcastState({
          status: state.status,
          calledBalls: state.calledBalls,
          currentBall: state.currentBall,
          previousBall: state.previousBall,
          remainingBalls: state.remainingBalls,
          pattern: state.pattern,
          autoCallEnabled: state.autoCallEnabled,
          autoCallSpeed: state.autoCallSpeed,
          audioEnabled: state.audioEnabled,
        });
      }
    });

    return unsubscribe;
  }, [role, broadcastSync]);

  // Subscribe to display theme changes (presenter only)
  useEffect(() => {
    if (role !== 'presenter') return;

    // Subscribe to theme store changes
    const unsubscribe = useThemeStore.subscribe((state, prevState) => {
      // Broadcast on display theme change
      if (state.displayTheme !== prevState.displayTheme) {
        broadcastSync.broadcastDisplayTheme(state.displayTheme);
      }
    });

    return unsubscribe;
  }, [role, broadcastSync]);

  // Heartbeat monitoring for state divergence detection
  const getHeartbeatState = useCallback(() => {
    return getCurrentState() as BingoSyncPayload;
  }, [getCurrentState]);

  useSyncHeartbeat({
    broadcastSync,
    getState: getHeartbeatState,
    role,
    channelName: getChannelName(sessionId),
  });

  return {
    isConnected: useSyncStore((state) => state.isConnected),
    lastSyncTimestamp: useSyncStore((state) => state.lastSyncTimestamp),
    connectionError: useSyncStore((state) => state.connectionError),
    broadcastState,
    requestSync: () => broadcastSync.requestSync(),
  };
}
