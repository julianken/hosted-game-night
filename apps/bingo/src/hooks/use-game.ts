'use client';

import { useEffect, useCallback } from 'react';
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
    if (audioEnabled) {
      await audioStore.playRollSound();  // Roll sound plays first
    }
    const ball = gameStore.callBall();   // Ball appears after roll completes
    if (ball && audioEnabled) {
      await audioStore.playBallVoice(ball);  // Voice announcement plays
    }
    return ball;
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
    if (status !== 'playing' || !autoCallEnabled) {
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const scheduleNextCall = () => {
      timeoutId = setTimeout(async () => {
        const state = useGameStore.getState();
        if (
          state.status === 'playing' &&
          state.autoCallEnabled &&
          state.remainingBalls.length > 0
        ) {
          const ball = state.callBall();
          if (ball && state.audioEnabled) {
            try {
              await useAudioStore.getState().playBallCall(ball);
            } catch {
              // Audio failed, continue game
            }
          }
          // Schedule next call only if game is still active
          if (state.remainingBalls.length > 1) {
            scheduleNextCall();
          }
        }
      }, autoCallSpeed * 1000);
    };

    scheduleNextCall();

    return () => clearTimeout(timeoutId);
  }, [status, autoCallEnabled, autoCallSpeed]);

  // Computed values
  const recentBalls = getRecentBalls(gameStore, 5);

  return {
    // State
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
