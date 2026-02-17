import type { TriviaGameState } from '@/types';
import { deepFreeze } from './helpers';

// =============================================================================
// TIMER FUNCTIONS
// =============================================================================

/**
 * Decrement timer by 1 second. Stops at 0.
 */
export function tickTimer(state: TriviaGameState): TriviaGameState {
  if (!state.timer.isRunning || state.timer.remaining <= 0) {
    return state;
  }

  const newRemaining = Math.max(0, state.timer.remaining - 1);

  return deepFreeze({
    ...state,
    timer: {
      ...state.timer,
      remaining: newRemaining,
      isRunning: newRemaining > 0,
    },
  });
}

/**
 * Reset timer to specified duration (or default if not provided).
 */
export function resetTimer(state: TriviaGameState, duration?: number): TriviaGameState {
  const newDuration = duration ?? state.settings.timerDuration;

  return deepFreeze({
    ...state,
    timer: {
      duration: newDuration,
      remaining: newDuration,
      isRunning: false,
    },
  });
}

/**
 * Start the timer.
 */
export function startTimer(state: TriviaGameState): TriviaGameState {
  if (state.timer.remaining <= 0) return state;

  return deepFreeze({
    ...state,
    timer: {
      ...state.timer,
      isRunning: true,
    },
  });
}

/**
 * Stop the timer without resetting.
 */
export function stopTimer(state: TriviaGameState): TriviaGameState {
  return deepFreeze({
    ...state,
    timer: {
      ...state.timer,
      isRunning: false,
    },
  });
}

/**
 * Toggle whether timer auto-starts on new question.
 */
export function toggleTimerAutoStart(state: TriviaGameState): TriviaGameState {
  return deepFreeze({
    ...state,
    settings: {
      ...state.settings,
      timerAutoStart: !state.settings.timerAutoStart,
    },
  });
}
