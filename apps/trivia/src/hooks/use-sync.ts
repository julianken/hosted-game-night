'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useSyncStore, SyncRole } from '@/stores/sync-store';
import { useGameStore } from '@/stores/game-store';
import { BroadcastSync, type SyncMessage } from '@beak-gaming/sync';
import { getChannelName } from '@/lib/sync/session';
import type { TriviaGameState, ThemeMode, ThemePayload, TriviaSyncPayload } from '@/types';
import { useThemeStore } from '@/stores/theme-store';

// Trivia message types
type TriviaMessageType = 'STATE_UPDATE' | 'REQUEST_SYNC' | 'DISPLAY_THEME_CHANGED';

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
  return new TriviaBroadcastSync(channelName);
}

type MessageHandler = (message: SyncMessage<TriviaSyncPayload>) => void;

/**
 * Create a message handler that routes messages by type.
 */
export function createMessageRouter(handlers: Partial<{
  onStateUpdate: (state: TriviaGameState) => void;
  onSyncRequest: () => void;
  onDisplayThemeChanged: (theme: ThemeMode) => void;
}>): MessageHandler {
  return (message: SyncMessage<TriviaSyncPayload>) => {
    switch (message.type as TriviaMessageType) {
      case 'STATE_UPDATE':
        handlers.onStateUpdate?.(message.payload as TriviaGameState);
        break;
      case 'REQUEST_SYNC':
        handlers.onSyncRequest?.();
        break;
      case 'DISPLAY_THEME_CHANGED':
        handlers.onDisplayThemeChanged?.((message.payload as ThemePayload).theme);
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
  const { setRole, setConnected, updateLastSync, setConnectionError, reset } =
    useSyncStore();
  const gameStore = useGameStore();
  const isInitializedRef = useRef(false);

  // Create a session-scoped BroadcastSync instance
  const broadcastSyncRef = useRef<TriviaBroadcastSync | null>(null);
  const broadcastSync = useMemo(() => {
    const instance = createTriviaBroadcastSync(sessionId);
    broadcastSyncRef.current = instance;
    return instance;
  }, [sessionId]);

  // Get current game state for broadcasting
  const getCurrentState = useCallback((): TriviaGameState => {
    const state = useGameStore.getState();
    return {
      sessionId: state.sessionId,
      status: state.status,
      statusBeforePause: state.statusBeforePause,
      questions: state.questions,
      selectedQuestionIndex: state.selectedQuestionIndex,
      displayQuestionIndex: state.displayQuestionIndex,
      currentRound: state.currentRound,
      totalRounds: state.totalRounds,
      teams: state.teams,
      teamAnswers: state.teamAnswers,
      timer: state.timer,
      settings: state.settings,
      showScoreboard: state.showScoreboard,
      emergencyBlank: state.emergencyBlank,
      ttsEnabled: state.ttsEnabled,
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
    (state: TriviaGameState) => {
      if (role !== 'audience') return;
      gameStore._hydrate(state);
      updateLastSync();
    },
    [role, gameStore, updateLastSync]
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
      updateLastSync();
    },
    [role, updateLastSync]
  );

  // Initialize broadcast channel
  useEffect(() => {
    if (isInitializedRef.current) return;

    const success = broadcastSync.initialize();
    if (!success) {
      setConnectionError('Failed to initialize sync channel');
      return;
    }

    setRole(role);
    setConnected(true);
    isInitializedRef.current = true;

    // Subscribe to messages
    const router = createMessageRouter({
      onStateUpdate: handleStateUpdate,
      onSyncRequest: handleSyncRequest,
      onDisplayThemeChanged: handleDisplayThemeChanged,
    });

    const unsubscribe = broadcastSync.subscribe(router);

    // If audience, request initial sync
    if (role === 'audience') {
      broadcastSync.requestSync();
    }

    return () => {
      unsubscribe();
      broadcastSync.close();
      reset();
      isInitializedRef.current = false;
    };
  }, [
    role,
    broadcastSync,
    setRole,
    setConnected,
    setConnectionError,
    reset,
    handleStateUpdate,
    handleSyncRequest,
    handleDisplayThemeChanged,
  ]);

  // Subscribe to game state changes (presenter only)
  useEffect(() => {
    if (role !== 'presenter') return;

    // Subscribe to game store changes
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      // Broadcast on any state change
      if (state !== prevState) {
        broadcastSync.broadcastState({
          sessionId: state.sessionId,
          status: state.status,
          statusBeforePause: state.statusBeforePause,
          questions: state.questions,
          selectedQuestionIndex: state.selectedQuestionIndex,
          displayQuestionIndex: state.displayQuestionIndex,
          currentRound: state.currentRound,
          totalRounds: state.totalRounds,
          teams: state.teams,
          teamAnswers: state.teamAnswers,
          timer: state.timer,
          settings: state.settings,
          showScoreboard: state.showScoreboard,
          emergencyBlank: state.emergencyBlank,
          ttsEnabled: state.ttsEnabled,
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

  return {
    isConnected: useSyncStore((state) => state.isConnected),
    lastSyncTimestamp: useSyncStore((state) => state.lastSyncTimestamp),
    connectionError: useSyncStore((state) => state.connectionError),
    broadcastState,
    requestSync: () => broadcastSync.requestSync(),
  };
}
