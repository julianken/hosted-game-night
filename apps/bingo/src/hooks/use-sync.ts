'use client';

import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useSyncStore, useSyncHeartbeat, type SyncRole } from '@joolie-boolie/sync';
import { useGameStore } from '@/stores/game-store';
import { BroadcastSync } from '@joolie-boolie/sync';
import { getChannelName } from '@/lib/sync/session';
import type { GameState, BingoBall, BingoPattern, ThemeMode, AudioSettingsPayload, BingoSyncMessage } from '@/types';
import { useThemeStore } from '@/stores/theme-store';
import { useAudioStore } from '@/stores/audio-store';

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

  broadcastPlayBallSequence(ball: BingoBall): void {
    this.send('PLAY_BALL_SEQUENCE', ball);
  }

  broadcastBallRevealReady(): void {
    this.send('BALL_REVEAL_READY', null);
  }

  broadcastBallSequenceComplete(): void {
    this.send('BALL_SEQUENCE_COMPLETE', null);
  }

  broadcastDisplayClosing(): void {
    this.send('DISPLAY_CLOSING', null);
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
  onChannelReady: () => void;
  onPlayBallSequence: (ball: BingoBall) => void;
  onBallRevealReady: () => void;
  onBallSequenceComplete: () => void;
  onAudioUnlocked: () => void;
  onDisplayClosing: () => void;
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
      case 'CHANNEL_READY':
        handlers.onChannelReady?.();
        break;
      case 'PLAY_BALL_SEQUENCE':
        handlers.onPlayBallSequence?.(message.payload);
        break;
      case 'BALL_REVEAL_READY':
        handlers.onBallRevealReady?.();
        break;
      case 'BALL_SEQUENCE_COMPLETE':
        handlers.onBallSequenceComplete?.();
        break;
      case 'AUDIO_UNLOCKED':
        handlers.onAudioUnlocked?.();
        break;
      case 'DISPLAY_CLOSING':
        handlers.onDisplayClosing?.();
        break;
    }
  };
}

interface UseSyncOptions {
  role: SyncRole;
  sessionId: string;
  /** Whether audio has been unlocked on the display window (audience role only) */
  displayAudioUnlocked?: boolean;
  /** Callback invoked on the audience when a PLAY_BALL_SEQUENCE message arrives.
   *  Must return a Promise that resolves when the full display-side sequence
   *  (roll → reveal → chime → voice) is complete. */
  onPlayBallSequence?: (ball: BingoBall) => Promise<void>;
}

/**
 * Hook for managing dual-screen synchronization.
 *
 * Presenter: Broadcasts state changes to audience windows.
 * Audience: Receives and applies state updates from presenter.
 */
export function useSync({ role, sessionId, displayAudioUnlocked, onPlayBallSequence }: UseSyncOptions) {
  const isInitializedRef = useRef(false);

  // Latest onPlayBallSequence callback (ref so init effect doesn't need re-run on every render)
  const onPlayBallSequenceRef = useRef(onPlayBallSequence);
  useEffect(() => {
    onPlayBallSequenceRef.current = onPlayBallSequence;
  }, [onPlayBallSequence]);

  // One-shot resolvers for ack-based Promises on the presenter side
  const pendingRevealResolverRef = useRef<(() => void) | null>(null);
  const pendingCompleteResolverRef = useRef<(() => void) | null>(null);

  // Track whether the display has confirmed audio is active (presenter uses this)
  const [displayAudioActive, setDisplayAudioActive] = useState(false);

  // Create a session-scoped BroadcastSync instance
  const broadcastSyncRef = useRef<BingoBroadcastSync | null>(null);
  const _broadcastSync = useMemo(() => {
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
    if (!broadcastSyncRef.current) return;
    const state = getCurrentState();
    broadcastSyncRef.current.broadcastState(state);
  }, [role, getCurrentState]);

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
    if (!broadcastSyncRef.current) return;
    // Audience requested sync, broadcast current state
    const state = getCurrentState();
    broadcastSyncRef.current.broadcastState(state);
    // Also broadcast current display theme
    const { displayTheme } = useThemeStore.getState();
    broadcastSyncRef.current.broadcastDisplayTheme(displayTheme);
    // Also broadcast current audio settings
    const { voicePack, voiceVolume, enabled, rollSoundVolume, chimeVolume, rollSoundType, rollDuration, revealChime } = useAudioStore.getState();
    broadcastSyncRef.current.broadcastAudioSettings({
      voicePack,
      volume: voiceVolume,
      enabled,
      rollSoundVolume,
      chimeVolume,
      rollSoundType,
      rollDuration,
      revealChime,
    });
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

    // CRITICAL FIX (BEA-374): Don't initialize with empty sessionId.
    // Wait for offline session ID to load asynchronously before initializing channel.
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
      onBallCalled: handleBallCalled,
      onReset: handleReset,
      onPatternChanged: handlePatternChanged,
      onSyncRequest: handleSyncRequest,
      onDisplayThemeChanged: handleDisplayThemeChanged,
      // Handle CHANNEL_READY from presenter
      onChannelReady: () => {
        // Audience: when presenter signals ready, request sync immediately
        if (role === 'audience') {
          sync.requestSync();
        }
      },
      // Audience runs the full audio sequence locally via the onPlayBallSequence callback.
      // After chime+voice finish it acks BALL_SEQUENCE_COMPLETE. The REVEAL ack is sent
      // mid-sequence by the caller via sendBallRevealReady.
      onPlayBallSequence: async (ball) => {
        if (role !== 'audience') return;
        const callback = onPlayBallSequenceRef.current;
        if (!callback) return;
        try {
          await callback(ball);
        } finally {
          sync.broadcastBallSequenceComplete();
        }
      },
      // Presenter receives these acks from the display
      onBallRevealReady: () => {
        if (role !== 'presenter') return;
        const resolver = pendingRevealResolverRef.current;
        pendingRevealResolverRef.current = null;
        resolver?.();
      },
      onBallSequenceComplete: () => {
        if (role !== 'presenter') return;
        const resolver = pendingCompleteResolverRef.current;
        pendingCompleteResolverRef.current = null;
        resolver?.();
      },
      // Audience receives audio settings changes from presenter
      onAudioSettingsChanged: (settings) => {
        if (role !== 'audience') return;
        const audioStore = useAudioStore.getState();
        audioStore.setVoicePack(settings.voicePack);
        audioStore.setVoiceVolume(settings.volume);
        audioStore.setEnabled(settings.enabled);
        audioStore.setRollSoundVolume(settings.rollSoundVolume);
        audioStore.setChimeVolume(settings.chimeVolume);
        audioStore.setRollSound(settings.rollSoundType, settings.rollDuration);
        audioStore.setRevealChime(settings.revealChime);
        useSyncStore.getState().updateLastSync();
      },
      // Presenter receives this when display audio is unlocked
      onAudioUnlocked: () => {
        if (role !== 'presenter') return;
        setDisplayAudioActive(true);
      },
      // Presenter receives this when display window is closing
      onDisplayClosing: () => {
        if (role !== 'presenter') return;
        setDisplayAudioActive(false);
      },
    });

    // Cast at the transport boundary: BroadcastSync uses a generic SyncMessage<TPayload>
    // while our router expects the discriminated BingoSyncMessage union.
    // This is safe because the BingoBroadcastSync class only sends valid BingoSyncMessage types.
    const unsubscribe = sync.subscribe(
      router as unknown as (message: import('@joolie-boolie/sync').SyncMessage<BingoSyncPayload>) => void
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
          console.log(`[Display] REQUEST_SYNC retry ${retryCount}/${maxRetries}`);
          requestSyncWithRetry();
        }
      }, 100 * Math.pow(2, retryCount)); // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
    }

    if (role === 'audience') {
      requestSyncWithRetry();
    }

    // CRITICAL FIX (BEA-374): Presenter broadcasts initial state immediately
    // to fix race where display REQUEST_SYNC arrives before handler is ready.
    if (role === 'presenter') {
      // Send CHANNEL_READY signal so any already-listening audience can request sync
      sync.broadcastChannelReady();

      // Broadcast initial state immediately
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
    sessionId,       // Re-run when sessionId arrives (empty → populated)
    getCurrentState, // Called directly in presenter init block
    handleStateUpdate,
    handleBallCalled,
    handleReset,
    handlePatternChanged,
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
      // SYNC LOOP PROTECTION: Skip broadcast if state is being hydrated from sync
      if (state._isHydrating) {
        return;
      }

      // Broadcast on any state change
      if (state !== prevState) {
        sync.broadcastState({
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

  // Subscribe to audio settings changes (presenter only)
  // Broadcasts AUDIO_SETTINGS_CHANGED so the display uses the same voice pack, volume, and enabled state
  useEffect(() => {
    if (role !== 'presenter') return;
    if (!broadcastSyncRef.current) return;

    const sync = broadcastSyncRef.current;
    const unsubscribe = useAudioStore.subscribe((state, prevState) => {
      if (
        state.voicePack !== prevState.voicePack ||
        state.voiceVolume !== prevState.voiceVolume ||
        state.enabled !== prevState.enabled ||
        state.rollSoundVolume !== prevState.rollSoundVolume ||
        state.chimeVolume !== prevState.chimeVolume ||
        state.rollSoundType !== prevState.rollSoundType ||
        state.rollDuration !== prevState.rollDuration ||
        state.revealChime !== prevState.revealChime
      ) {
        sync.broadcastAudioSettings({
          voicePack: state.voicePack,
          volume: state.voiceVolume,
          enabled: state.enabled,
          rollSoundVolume: state.rollSoundVolume,
          chimeVolume: state.chimeVolume,
          rollSoundType: state.rollSoundType,
          rollDuration: state.rollDuration,
          revealChime: state.revealChime,
        });
      }
    });

    return unsubscribe;
  }, [role, sessionId]); // Re-subscribe when sessionId changes (new channel)

  // Broadcast DISPLAY_CLOSING on beforeunload (audience only)
  useEffect(() => {
    if (role !== 'audience') return;
    if (!broadcastSyncRef.current) return;

    const sync = broadcastSyncRef.current;
    const handleBeforeUnload = () => {
      sync.send('DISPLAY_CLOSING', null);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [role, sessionId]);

  // Broadcast AUDIO_UNLOCKED when display audio is unlocked (audience only)
  useEffect(() => {
    if (role !== 'audience') return;
    if (!displayAudioUnlocked) return;
    if (!broadcastSyncRef.current) return;

    broadcastSyncRef.current.send('AUDIO_UNLOCKED', null);
  }, [role, displayAudioUnlocked]);

  const REVEAL_TIMEOUT_MS = 15_000;
  const COMPLETE_TIMEOUT_MS = 15_000;

  // Broadcast PLAY_BALL_SEQUENCE (presenter only).
  const broadcastPlayBallSequence = useCallback((ball: BingoBall) => {
    if (role !== 'presenter') return;
    broadcastSyncRef.current?.broadcastPlayBallSequence(ball);
  }, [role]);

  // Returns a Promise that resolves when the next BALL_REVEAL_READY arrives,
  // or after REVEAL_TIMEOUT_MS as a safety fallback.
  const waitForReveal = useCallback((): Promise<void> => {
    if (role !== 'presenter') return Promise.resolve();
    return new Promise<void>((resolve) => {
      // `resolverWithTimeout` and `timeoutId` reference each other. Because
      // closures capture bindings (not values), both are initialized by the
      // time either function actually runs.
      const resolverWithTimeout = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      const timeoutId = setTimeout(() => {
        if (pendingRevealResolverRef.current === resolverWithTimeout) {
          pendingRevealResolverRef.current = null;
          console.warn('[Bingo sync] BALL_REVEAL_READY timed out after', REVEAL_TIMEOUT_MS, 'ms');
          resolve();
        }
      }, REVEAL_TIMEOUT_MS);
      pendingRevealResolverRef.current = resolverWithTimeout;
    });
  }, [role]);

  // Returns a Promise that resolves when the next BALL_SEQUENCE_COMPLETE arrives,
  // or after COMPLETE_TIMEOUT_MS as a safety fallback.
  const waitForComplete = useCallback((): Promise<void> => {
    if (role !== 'presenter') return Promise.resolve();
    return new Promise<void>((resolve) => {
      // Same closure-capture pattern as waitForReveal above.
      const resolverWithTimeout = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      const timeoutId = setTimeout(() => {
        if (pendingCompleteResolverRef.current === resolverWithTimeout) {
          pendingCompleteResolverRef.current = null;
          console.warn('[Bingo sync] BALL_SEQUENCE_COMPLETE timed out after', COMPLETE_TIMEOUT_MS, 'ms');
          resolve();
        }
      }, COMPLETE_TIMEOUT_MS);
      pendingCompleteResolverRef.current = resolverWithTimeout;
    });
  }, [role]);

  // Audience ack: "my roll sound is done, presenter can commit the ball now"
  const sendBallRevealReady = useCallback(() => {
    if (role !== 'audience') return;
    broadcastSyncRef.current?.broadcastBallRevealReady();
  }, [role]);

  // Heartbeat monitoring for state divergence detection
  const getHeartbeatState = useCallback(() => {
    return getCurrentState() as BingoSyncPayload;
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
    // Audio routing
    displayAudioActive,
    broadcastPlayBallSequence,
    waitForReveal,
    waitForComplete,
    sendBallRevealReady,
  };
}
