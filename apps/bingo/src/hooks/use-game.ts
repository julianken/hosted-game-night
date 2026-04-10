'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { useAudioStore } from '@/stores/audio-store';
import { BingoPattern, GameStatus } from '@/types';
import { getRecentBalls, canCallBall } from '@/lib/game';

/**
 * Audio broadcast functions for routing sound to the display window.
 * The presenter broadcasts a single PLAY_BALL_SEQUENCE message and then
 * awaits two acks from the display:
 *  - BALL_REVEAL_READY (mid-sequence): commit ball locally
 *  - BALL_SEQUENCE_COMPLETE (end): sequence is done
 */
interface AudioBroadcast {
  broadcastPlayBallSequence: (ball: import('@/types').BingoBall) => void;
  waitForReveal: () => Promise<void>;
  waitForComplete: () => Promise<void>;
}

/**
 * Executes the audio call sequence for a bingo ball: roll sound → call → reveal chime → voice.
 * Returns the called ball, or null if no ball was called.
 *
 * When display audio is active, audio events are broadcast to the display window
 * instead of playing locally on the presenter. If display audio is NOT active,
 * falls back to playing audio locally on the presenter.
 *
 * @param audioStore - The audio store instance (from hook capture or getState())
 * @param callBallFn - Function that calls the next ball and returns it
 * @param audioEnabled - Whether audio is enabled
 * @param audioBroadcast - Optional broadcast functions for routing audio to display
 * @param displayAudioActive - Whether display audio has been confirmed active
 */
async function executeCallSequence(
  audioStore: ReturnType<typeof useAudioStore.getState>,
  callBallFn: () => ReturnType<ReturnType<typeof useGameStore.getState>['callBall']>,
  audioEnabled: boolean,
  audioBroadcast?: AudioBroadcast,
  displayAudioActive?: boolean
) {
  const useDisplayAudio = displayAudioActive && audioBroadcast;

  if (useDisplayAudio && audioEnabled) {
    // Broadcast path: display owns the audio sequence. Peek the next ball
    // without committing, broadcast PLAY_BALL_SEQUENCE, then wait for the
    // display to ack BALL_REVEAL_READY before committing state. This keeps
    // the presenter and display visually in sync — both reveal the ball at
    // the same moment (end of the roll sound on the display).
    const state = useGameStore.getState();
    if (!canCallBall(state) || state.remainingBalls.length === 0) {
      return null;
    }
    const nextBall = state.remainingBalls[0];

    // Register ack listeners BEFORE broadcasting to avoid a race where the
    // ack arrives before we're listening for it.
    const revealPromise = audioBroadcast.waitForReveal();
    const completePromise = audioBroadcast.waitForComplete();

    audioBroadcast.broadcastPlayBallSequence(nextBall);

    await revealPromise;
    const ball = callBallFn();
    await completePromise;
    return ball;
  }

  // Local path (no display audio): presenter plays audio itself.
  if (audioEnabled) {
    await audioStore.playRollSound();
  }
  const ball = callBallFn();
  if (ball && audioEnabled) {
    await new Promise<void>((r) => setTimeout(r, 400));
    await audioStore.playRevealChime();
    await audioStore.playBallVoice(ball);
  }
  return ball;
}

/**
 * Returns true if the game is in a state where reset should require confirmation.
 * Confirmation is required when the game is actively in progress (playing or paused).
 */
function requiresResetConfirmation(status: GameStatus): boolean {
  return status === 'playing' || status === 'paused';
}

interface UseGameOptions {
  /** Optional audio broadcast functions for routing sound to display */
  audioBroadcast?: AudioBroadcast;
  /** Whether display audio has been confirmed active */
  displayAudioActive?: boolean;
}

/**
 * Main game hook combining game state, audio, and auto-call functionality.
 */
export function useGame(options?: UseGameOptions) {
  const { audioBroadcast, displayAudioActive } = options ?? {};
  const gameStore = useGameStore();
  const audioStore = useAudioStore();
  const selectors = useGameSelectors();

  // Ref to track if a ball call is currently processing (prevents race conditions)
  const isProcessingRef = useRef(false);
  // Reactive state for UI to disable buttons during processing
  const [isProcessing, setIsProcessing] = useState(false);
  // Ref to track the auto-call timeout for proper cleanup
  const autoCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get game state
  const {
    status,
    currentBall,
    previousBall,
    calledBalls,
    remainingBalls,
    pattern,
    autoCallEnabled,
    autoCallSpeed,
    audioEnabled,
  } = gameStore;

  // Game actions
  const startGame = useCallback(
    (selectedPattern?: BingoPattern) => {
      gameStore.startGame(selectedPattern);
    },
    [gameStore]
  );

  const callBall = useCallback(async () => {
    // Guard against duplicate calls while processing
    if (isProcessingRef.current) {
      return null;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    try {
      return await executeCallSequence(
        audioStore,
        () => gameStore.callBall(),
        audioEnabled,
        audioBroadcast,
        displayAudioActive
      );
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [gameStore, audioStore, audioEnabled, audioBroadcast, displayAudioActive]);

  const undoCall = useCallback(() => {
    return gameStore.undoCall();
  }, [gameStore]);

  const pauseGame = useCallback(() => {
    gameStore.pauseGame();
  }, [gameStore]);

  const resumeGame = useCallback(() => {
    gameStore.resumeGame();
  }, [gameStore]);

  const endGame = useCallback(() => {
    gameStore.endGame();
  }, [gameStore]);

  const resetGame = useCallback(() => {
    gameStore.resetGame();
  }, [gameStore]);

  // Reset confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  /**
   * Request a game reset. If the game is in progress (playing/paused),
   * shows a confirmation dialog instead of resetting immediately.
   * If idle or ended, resets immediately.
   */
  const requestReset = useCallback(() => {
    const currentStatus = useGameStore.getState().status;
    if (requiresResetConfirmation(currentStatus)) {
      setShowResetConfirm(true);
    } else {
      gameStore.resetGame();
    }
  }, [gameStore]);

  const confirmReset = useCallback(() => {
    setShowResetConfirm(false);
    gameStore.resetGame();
  }, [gameStore]);

  const cancelReset = useCallback(() => {
    setShowResetConfirm(false);
  }, []);

  const setPattern = useCallback(
    (newPattern: BingoPattern) => {
      gameStore.setPattern(newPattern);
    },
    [gameStore]
  );

  const toggleAutoCall = useCallback(() => {
    gameStore.toggleAutoCall();
  }, [gameStore]);

  const setAutoCallSpeed = useCallback(
    (speed: number) => {
      gameStore.setAutoCallSpeed(speed);
    },
    [gameStore]
  );

  const toggleAudio = useCallback(() => {
    gameStore.toggleAudio();
  }, [gameStore]);

  // Auto-call timeout management (self-scheduling to prevent race conditions)
  useEffect(() => {
    // Clear any existing timeout when effect re-runs or unmounts
    const clearAutoCallTimeout = () => {
      if (autoCallTimeoutRef.current) {
        clearTimeout(autoCallTimeoutRef.current);
        autoCallTimeoutRef.current = null;
      }
    };

    if (status !== 'playing' || !autoCallEnabled) {
      clearAutoCallTimeout();
      return;
    }

    const scheduleNextCall = () => {
      autoCallTimeoutRef.current = setTimeout(async () => {
        // Check if already processing (manual call in progress or previous auto-call)
        if (isProcessingRef.current) {
          // Retry scheduling after a short delay
          scheduleNextCall();
          return;
        }

        const state = useGameStore.getState();
        if (
          state.status === 'playing' &&
          state.autoCallEnabled &&
          state.remainingBalls.length > 0
        ) {
          isProcessingRef.current = true;
          setIsProcessing(true);
          try {
            const audioStoreState = useAudioStore.getState();
            await executeCallSequence(
              audioStoreState,
              () => state.callBall(),
              state.audioEnabled,
              audioBroadcast,
              displayAudioActive
            );
          } finally {
            isProcessingRef.current = false;
            setIsProcessing(false);
          }

          // Schedule next call only if game is still active
          const updatedState = useGameStore.getState();
          if (
            updatedState.status === 'playing' &&
            updatedState.autoCallEnabled &&
            updatedState.remainingBalls.length > 0
          ) {
            scheduleNextCall();
          }
        }
      }, autoCallSpeed * 1000);
    };

    scheduleNextCall();

    // Cleanup on unmount or when dependencies change
    return clearAutoCallTimeout;
  }, [status, autoCallEnabled, autoCallSpeed, audioBroadcast, displayAudioActive]);

  // Computed values
  const recentBalls = getRecentBalls(gameStore, 5);

  return {
    // State
    isProcessing,
    status,
    currentBall,
    previousBall,
    calledBalls,
    remainingBalls,
    pattern,
    autoCallEnabled,
    autoCallSpeed,
    audioEnabled,

    // Computed
    ballsRemaining: selectors.ballsRemaining,
    ballsCalled: selectors.ballsCalled,
    canUndo: selectors.canUndo,
    canCall: selectors.canCall,
    canStart: selectors.canStart,
    canPause: selectors.canPause,
    canResume: selectors.canResume,
    recentBalls,

    // Actions
    startGame,
    callBall,
    undoCall,
    pauseGame,
    resumeGame,
    endGame,
    resetGame,
    setPattern,
    toggleAutoCall,
    setAutoCallSpeed,
    toggleAudio,

    // Reset confirmation
    showResetConfirm,
    requestReset,
    confirmReset,
    cancelReset,
  };
}

/**
 * Keyboard shortcut hook for game controls.
 * Space=roll, P=pause, R=reset, U=undo, M=mute
 */
export function useGameKeyboard(options?: UseGameOptions) {
  const game = useGame(options);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (game.canCall) {
            game.callBall();
          }
          break;
        case 'KeyP':
          if (game.canPause) {
            game.pauseGame();
          } else if (game.canResume) {
            game.resumeGame();
          }
          break;
        case 'KeyR':
          game.requestReset();
          break;
        case 'KeyU':
          if (game.canUndo && !game.isProcessing) {
            game.undoCall();
          }
          break;
        case 'KeyM':
          game.toggleAudio();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [game]);

  return game;
}
