'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useSyncStore, useSyncHeartbeat, type SyncRole } from '@joolie-boolie/sync';
import { useGameStore } from '@/stores/game-store';
import { BroadcastSync } from '@joolie-boolie/sync';
import { getChannelName } from '@/lib/sync/session';
import type { TriviaGameState, ThemeMode, TriviaSyncPayload, TriviaSyncMessage } from '@/types';
import { useThemeStore } from '@/stores/theme-store';

/**
 * Extended BroadcastSync with trivia-specific convenience methods.
 */
class TriviaBroadcastSync extends BroadcastSync<TriviaSyncPayload> {
  /**
   * Override to use STATE_UPDATE instead of base class's STATE_UPDATE.
   */
  broadcastState(state: TriviaGameState): void {
    this.send('STATE_UPDATE', state);
  }

  broadcastDisplayTheme(theme: ThemeMode): void {
    this.send('DISPLAY_THEME_CHANGED', { theme });
  }
}

/**
 * Factory function to create a session-scoped TriviaBroadcastSync instance.
 */
function createTriviaBroadcastSync(sessionId: string): TriviaBroadcastSync {
  const channelName = getChannelName(sessionId);
  // Enable debug mode in development/E2E only to trace message flow
  const isDebug = process.env.NODE_ENV === 'development' || process.env.E2E_TESTING === 'true';
  return new TriviaBroadcastSync(channelName, { debug: isDebug });
}

/**
 * Pure function: maps GameStore state to TriviaGameState for broadcasting.
 *
 * The explicit `: TriviaGameState` return type ensures TypeScript raises a
 * compile error if any field is added to TriviaGameState but not mapped here.
 * This is the single source of truth for sync serialization.
 */
function storeToGameState(state: import('@/stores/game-store').GameStore): TriviaGameState {
  return {
    // -- Session --
    sessionId: state.sessionId,
    status: state.status,
    statusBeforePause: state.statusBeforePause,

    // -- Questions --
    questions: state.questions,
    selectedQuestionIndex: state.selectedQuestionIndex,
    displayQuestionIndex: state.displayQuestionIndex,

    // -- Rounds --
    currentRound: state.currentRound,
    totalRounds: state.totalRounds,

    // -- Teams --
    teams: state.teams,
    teamAnswers: state.teamAnswers,

    // -- Timer & Settings --
    timer: state.timer,
    settings: state.settings,

    // -- Display --
    showScoreboard: state.showScoreboard,
    emergencyBlank: state.emergencyBlank,

    // -- Audio --
    ttsEnabled: state.ttsEnabled,

    // -- Scene fields --
    audienceScene: state.audienceScene,
    sceneBeforePause: state.sceneBeforePause,
    sceneTimestamp: state.sceneTimestamp,
    scoreDeltas: state.scoreDeltas,
    revealPhase: state.revealPhase,
    recapShowingAnswer: state.recapShowingAnswer,
    // Round start score snapshot (BEA-601)
    questionStartScores: state.questionStartScores,
  };
}

type MessageHandler = (message: TriviaSyncMessage) => void;

/**
 * Create a message handler that routes messages by type.
 * Uses discriminated union narrowing -- no manual type casts required.
 */
export function createMessageRouter(handlers: Partial<{
  onStateUpdate: (state: TriviaGameState) => void;
  onSyncRequest: () => void;
  onDisplayThemeChanged: (theme: ThemeMode) => void;
  onChannelReady: () => void;
}>): MessageHandler {
  return (message: TriviaSyncMessage) => {
    switch (message.type) {
      case 'STATE_UPDATE':
        handlers.onStateUpdate?.(message.payload);
        break;
      case 'REQUEST_SYNC':
        handlers.onSyncRequest?.();
        break;
      case 'DISPLAY_THEME_CHANGED':
        handlers.onDisplayThemeChanged?.(message.payload.theme);
        break;
      case 'CHANNEL_READY':
        handlers.onChannelReady?.();
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
  const broadcastSyncRef = useRef<TriviaBroadcastSync | null>(null);
  const _broadcastSync = useMemo(() => {
    const instance = createTriviaBroadcastSync(sessionId);
    broadcastSyncRef.current = instance;
    return instance;
  }, [sessionId]);

  // Get current game state for broadcasting
  const getCurrentState = useCallback((): TriviaGameState => {
    return storeToGameState(useGameStore.getState());
  }, []);

  // Broadcast state update (presenter only)
  const broadcastState = useCallback(() => {
    if (role !== 'presenter') return;
    if (!broadcastSyncRef.current) return;
    const state = getCurrentState();
    broadcastSyncRef.current.broadcastState(state);
  }, [role, getCurrentState]);

  // Handle incoming messages
  const handleStateUpdate = useCallback(
    (state: TriviaGameState) => {
      if (role !== 'audience') return;
      useGameStore.getState()._hydrate(state);
      useSyncStore.getState().updateLastSync();
    },
    [role]
  );

  const handleSyncRequest = useCallback(() => {
    if (role !== 'presenter') return;
    if (!broadcastSyncRef.current) return;
    // Audience requested sync, broadcast current state
    const state = getCurrentState();
    broadcastSyncRef.current.broadcastState(state);
    // Also broadcast current display theme
    const { displayTheme } = useThemeStore.getState();
    broadcastSyncRef.current.broadcastDisplayTheme(displayTheme);
  }, [role, getCurrentState]);

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
    if (!broadcastSyncRef.current) return;

    // CRITICAL FIX (BEA-374): Don't initialize with empty sessionId
    // Wait for offline session ID to load asynchronously before initializing channel
    if (!sessionId) {
      return;
    }

    const sync = broadcastSyncRef.current;
    const success = sync.initialize();
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
      onSyncRequest: handleSyncRequest,
      onDisplayThemeChanged: handleDisplayThemeChanged,
      onChannelReady: () => {
        // Audience: when presenter signals ready, request sync immediately
        if (role === 'audience') {
          sync.requestSync();
        }
      },
    });

    // Cast at the transport boundary: BroadcastSync uses a generic SyncMessage<TPayload>
    // while our router expects the discriminated TriviaSyncMessage union.
    // This is safe because the TriviaBroadcastSync class only sends valid TriviaSyncMessage types.
    const unsubscribe = sync.subscribe(
      router as unknown as (message: import('@joolie-boolie/sync').SyncMessage<TriviaSyncPayload>) => void
    );

    // If audience, request initial sync with retry logic
    // This handles the race condition where presenter may not be ready yet
    let retryCount = 0;
    const maxRetries = 5;
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

    function requestSyncWithRetry() {
      sync.requestSync();

      // Schedule retry if we haven't received state yet
      retryTimeoutId = setTimeout(() => {
        if (!hasReceivedStateRef.current && retryCount < maxRetries) {
          retryCount++;
          requestSyncWithRetry();
        }
      }, 100 * Math.pow(2, retryCount)); // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
    }

    if (role === 'audience') {
      requestSyncWithRetry();
    }

    // CRITICAL FIX (BEA-374): Presenter broadcasts initial state immediately
    // to fix race where display REQUEST_SYNC arrives before handler ready
    if (role === 'presenter') {
      // Send CHANNEL_READY signal
      sync.broadcastChannelReady();

      // Broadcast initial state
      const state = getCurrentState();
      sync.broadcastState(state);
    }

    return () => {
      unsubscribe();
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
      sync.close();
      useSyncStore.getState().reset();
      isInitializedRef.current = false;
      hasReceivedStateRef.current = false;
    };
  }, [
    role,
    sessionId, // CRITICAL: Re-initialize when sessionId changes (e.g., offline ID loads)
    getCurrentState,
    handleStateUpdate,
    handleSyncRequest,
    handleDisplayThemeChanged,
  ]);

  // Subscribe to game state changes (presenter only)
  useEffect(() => {
    if (role !== 'presenter') return;
    if (!broadcastSyncRef.current) return;

    const sync = broadcastSyncRef.current;
    // Subscribe to game store changes
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      // SYNC LOOP PROTECTION: Skip broadcast if state is being hydrated
      if (state._isHydrating) {
        return;
      }
      // Broadcast on any state change
      if (state !== prevState) {
        sync.broadcastState(storeToGameState(state));
      }
    });

    return unsubscribe;
  }, [role, sessionId]); // Re-subscribe when sessionId changes (new channel)

  // Subscribe to display theme changes (presenter only)
  useEffect(() => {
    if (role !== 'presenter') return;
    if (!broadcastSyncRef.current) return;

    const sync = broadcastSyncRef.current;
    // Subscribe to theme store changes
    const unsubscribe = useThemeStore.subscribe((state, prevState) => {
      // Broadcast on display theme change
      if (state.displayTheme !== prevState.displayTheme) {
        sync.broadcastDisplayTheme(state.displayTheme);
      }
    });

    return unsubscribe;
  }, [role, sessionId]); // Re-subscribe when sessionId changes (new channel)

  // Heartbeat monitoring for state divergence detection
  const getHeartbeatState = useCallback(() => {
    return getCurrentState() as TriviaSyncPayload;
  }, [getCurrentState]);

  useSyncHeartbeat({
    broadcastSync: _broadcastSync,
    getState: getHeartbeatState,
    role,
    channelName: getChannelName(sessionId),
  });

  return {
    isConnected: useSyncStore((state) => state.isConnected),
    lastSyncTimestamp: useSyncStore((state) => state.lastSyncTimestamp),
    connectionError: useSyncStore((state) => state.connectionError),
    broadcastState,
    requestSync: () => broadcastSyncRef.current?.requestSync(),
  };
}
