'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useSyncStore, SyncRole } from '@/stores/sync-store';
import { useGameStore } from '@/stores/game-store';
import { createBingoBroadcastSync, createMessageRouter, BroadcastSync } from '@/lib/sync/broadcast';
import { GameState, BingoBall, BingoPattern } from '@/types';

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
    const instance = createBingoBroadcastSync(sessionId);
    broadcastSyncRef.current = instance;
    return instance;
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
      gameStore._hydrate(state);
      updateLastSync();
    },
    [role, gameStore, updateLastSync]
  );

  const handleBallCalled = useCallback(
    (_ball: BingoBall) => {
      if (role !== 'audience') return;
      // Ball called events are handled via state updates
      // This handler can be used for additional UI effects
      updateLastSync();
    },
    [role, updateLastSync]
  );

  const handleReset = useCallback(() => {
    if (role !== 'audience') return;
    gameStore.resetGame();
    updateLastSync();
  }, [role, gameStore, updateLastSync]);

  const handlePatternChanged = useCallback(
    (pattern: BingoPattern) => {
      if (role !== 'audience') return;
      gameStore.setPattern(pattern);
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
      onBallCalled: handleBallCalled,
      onReset: handleReset,
      onPatternChanged: handlePatternChanged,
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
    handleBallCalled,
    handleReset,
    handlePatternChanged,
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

  return {
    isConnected: useSyncStore((state) => state.isConnected),
    lastSyncTimestamp: useSyncStore((state) => state.lastSyncTimestamp),
    connectionError: useSyncStore((state) => state.connectionError),
    broadcastState,
    requestSync: () => broadcastSync.requestSync(),
  };
}
