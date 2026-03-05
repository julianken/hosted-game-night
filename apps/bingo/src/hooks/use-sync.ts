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

  broadcastPlayRollSound(): void {
    this.send('PLAY_ROLL_SOUND', null);
  }

  broadcastPlayRevealChime(): void {
    this.send('PLAY_REVEAL_CHIME', null);
  }

  broadcastPlayBallVoice(ball: BingoBall): void {
    this.send('PLAY_BALL_VOICE', ball);
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
  onPlayRollSound: () => void;
  onPlayRevealChime: () => void;
  onPlayBallVoice: (ball: BingoBall) => void;
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
      case 'PLAY_ROLL_SOUND':
        handlers.onPlayRollSound?.();
        break;
      case 'PLAY_REVEAL_CHIME':
        handlers.onPlayRevealChime?.();
        break;
      case 'PLAY_BALL_VOICE':
        handlers.onPlayBallVoice?.(message.payload);
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
}

/**
 * Hook for managing dual-screen synchronization.
 *
 * Presenter: Broadcasts state changes to audience windows.
 * Audience: Receives and applies state updates from presenter.
 */
export function useSync({ role, sessionId, displayAudioUnlocked }: UseSyncOptions) {
  const isInitializedRef = useRef(false);
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
      // Audio playback handlers (audience/display receives these from presenter)
      onPlayRollSound: () => {
        if (role !== 'audience') return;
        const audioStore = useAudioStore.getState();
        audioStore.playRollSound();
      },
      onPlayRevealChime: () => {
        if (role !== 'audience') return;
        const audioStore = useAudioStore.getState();
        audioStore.playRevealChime();
      },
      onPlayBallVoice: (ball) => {
        if (role !== 'audience') return;
        const audioStore = useAudioStore.getState();
        audioStore.playBallVoice(ball);
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

  // Broadcast audio event methods (presenter sends these to display)
  const broadcastPlayRollSound = useCallback(() => {
    if (role !== 'presenter') return;
    broadcastSyncRef.current?.broadcastPlayRollSound();
  }, [role]);

  const broadcastPlayRevealChime = useCallback(() => {
    if (role !== 'presenter') return;
    broadcastSyncRef.current?.broadcastPlayRevealChime();
  }, [role]);

  const broadcastPlayBallVoice = useCallback((ball: BingoBall) => {
    if (role !== 'presenter') return;
    broadcastSyncRef.current?.broadcastPlayBallVoice(ball);
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
    broadcastPlayRollSound,
    broadcastPlayRevealChime,
    broadcastPlayBallVoice,
  };
}
