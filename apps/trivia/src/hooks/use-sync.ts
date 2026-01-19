'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useSyncStore, SyncRole } from '@/stores/sync-store';
import { useGameStore } from '@/stores/game-store';
import {
  createTriviaBroadcastSync,
  createMessageRouter,
  BroadcastSync,
} from '@/lib/sync/broadcast';
import type { TriviaGameState } from '@/types';

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
  const broadcastSyncRef = useRef<BroadcastSync | null>(null);
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
      questions: state.questions,
      selectedQuestionIndex: state.selectedQuestionIndex,
      displayQuestionIndex: state.displayQuestionIndex,
      currentRound: state.currentRound,
      totalRounds: state.totalRounds,
      teams: state.teams,
      showScoreboard: state.showScoreboard,
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
  }, [role, broadcastState]);

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
          questions: state.questions,
          selectedQuestionIndex: state.selectedQuestionIndex,
          displayQuestionIndex: state.displayQuestionIndex,
          currentRound: state.currentRound,
          totalRounds: state.totalRounds,
          teams: state.teams,
          showScoreboard: state.showScoreboard,
          ttsEnabled: state.ttsEnabled,
        });
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
