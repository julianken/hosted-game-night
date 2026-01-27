'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { useAudioStore } from '@/stores/audio-store';
import { BingoPattern } from '@/types';
import { getRecentBalls } from '@/lib/game';

/**
 * Main game hook combining game state, audio, and auto-call functionality.
 */
export function useGame() {
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
      if (audioEnabled) {
        await audioStore.playRollSound();  // Roll sound plays first
      }
      const ball = gameStore.callBall();   // Ball appears after roll completes
      if (ball && audioEnabled) {
        await audioStore.playRevealChime();  // Reveal chime plays when ball is shown
        await audioStore.playBallVoice(ball);  // Voice announcement plays
      }
      return ball;
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [gameStore, audioStore, audioEnabled]);

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

            // Use same audio sequence as manual call
            if (state.audioEnabled) {
              await audioStoreState.playRollSound();  // Roll sound plays first
            }
            const ball = state.callBall();       // Ball appears after roll completes
            if (ball && state.audioEnabled) {
              await audioStoreState.playRevealChime();  // Reveal chime plays
              await audioStoreState.playBallVoice(ball);  // Voice announcement plays
            }
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
  }, [status, autoCallEnabled, autoCallSpeed]);

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
  };
}

/**
 * Keyboard shortcut hook for game controls.
 * Space=roll, P=pause, R=reset, U=undo, M=mute
 */
export function useGameKeyboard() {
  const game = useGame();

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
          game.resetGame();
          break;
        case 'KeyU':
          if (game.canUndo) {
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
