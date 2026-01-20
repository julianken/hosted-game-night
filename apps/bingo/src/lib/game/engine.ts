import { GameState, BingoPattern, BingoBall } from '@/types';
import { createDeck, drawBall, undoDraw } from './ball-deck';
import { transition, canCallBall as canCallBallStatus } from './state-machine';

/**
 * Default auto-call speed in seconds.
 */
export const DEFAULT_AUTO_CALL_SPEED = 10;

/**
 * Minimum auto-call speed in seconds.
 */
export const MIN_AUTO_CALL_SPEED = 5;

/**
 * Maximum auto-call speed in seconds.
 */
export const MAX_AUTO_CALL_SPEED = 30;

// ============ Deep Freeze Utility ============

/**
 * Deeply freezes an object to prevent mutations in development.
 * Only runs in non-production environments to avoid performance impact.
 *
 * @param obj - The object to freeze
 * @returns The frozen object
 */
function deepFreeze<T>(obj: T): T {
  // Skip freezing in production for performance
  if (process.env.NODE_ENV === 'production') {
    return obj;
  }

  // Handle null, undefined, and primitives
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Freeze the object itself
  Object.freeze(obj);

  // Recursively freeze all properties
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = (obj as any)[prop];
    if (value !== null && typeof value === 'object') {
      deepFreeze(value);
    }
  });

  return obj;
}

// ============ State Creation and Mutation Functions ============

/**
 * Create an initial game state.
 */
export function createInitialState(): GameState {
  const deck = createDeck();
  return deepFreeze({
    status: 'idle',
    calledBalls: [],
    currentBall: null,
    previousBall: null,
    remainingBalls: deck.remaining,
    pattern: null,
    autoCallEnabled: false,
    autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
    audioEnabled: true,
  });
}

/**
 * Start a new game with an optional pattern.
 */
export function startGame(
  state: GameState,
  pattern?: BingoPattern
): GameState {
  const newStatus = transition(state.status, 'START_GAME');
  return deepFreeze({
    ...state,
    status: newStatus,
    pattern: pattern ?? state.pattern,
  });
}

/**
 * Call the next ball from the deck.
 * Returns the state unchanged if no balls remain.
 */
export function callNextBall(state: GameState): GameState {
  if (!canCallBallStatus(state.status)) {
    return state;
  }

  if (state.remainingBalls.length === 0) {
    return state;
  }

  const deck = {
    originalOrder: [],
    remaining: state.remainingBalls,
    drawn: state.calledBalls,
  };

  const result = drawBall(deck);
  if (!result) {
    return state;
  }

  return deepFreeze({
    ...state,
    currentBall: result.ball,
    previousBall: state.currentBall,
    calledBalls: result.deck.drawn,
    remainingBalls: result.deck.remaining,
  });
}

/**
 * Undo the last called ball.
 * Returns the state unchanged if no balls have been called.
 */
export function undoLastCall(state: GameState): GameState {
  if (state.calledBalls.length === 0) {
    return state;
  }

  const deck = {
    originalOrder: [],
    remaining: state.remainingBalls,
    drawn: state.calledBalls,
  };

  const result = undoDraw(deck);
  if (!result) {
    return state;
  }

  // Determine new current and previous balls
  const newCalledBalls = result.deck.drawn;
  const newCurrentBall = newCalledBalls.length > 0
    ? newCalledBalls[newCalledBalls.length - 1]
    : null;
  const newPreviousBall = newCalledBalls.length > 1
    ? newCalledBalls[newCalledBalls.length - 2]
    : null;

  return deepFreeze({
    ...state,
    currentBall: newCurrentBall,
    previousBall: newPreviousBall,
    calledBalls: newCalledBalls,
    remainingBalls: result.deck.remaining,
  });
}

/**
 * Pause the game.
 */
export function pauseGame(state: GameState): GameState {
  const newStatus = transition(state.status, 'PAUSE_GAME');
  return deepFreeze({
    ...state,
    status: newStatus,
  });
}

/**
 * Resume the game.
 */
export function resumeGame(state: GameState): GameState {
  const newStatus = transition(state.status, 'RESUME_GAME');
  return deepFreeze({
    ...state,
    status: newStatus,
  });
}

/**
 * End the game.
 */
export function endGame(state: GameState): GameState {
  const newStatus = transition(state.status, 'END_GAME');
  return deepFreeze({
    ...state,
    status: newStatus,
    autoCallEnabled: false,
  });
}

/**
 * Reset the game to initial state with a new shuffled deck.
 */
export function resetGame(state: GameState): GameState {
  const deck = createDeck();
  return deepFreeze({
    ...state,
    status: 'idle',
    calledBalls: [],
    currentBall: null,
    previousBall: null,
    remainingBalls: deck.remaining,
    autoCallEnabled: false,
  });
}

/**
 * Set the current pattern.
 */
export function setPattern(
  state: GameState,
  pattern: BingoPattern
): GameState {
  return deepFreeze({
    ...state,
    pattern,
  });
}

/**
 * Enable or disable auto-call.
 */
export function setAutoCallEnabled(
  state: GameState,
  enabled: boolean
): GameState {
  return deepFreeze({
    ...state,
    autoCallEnabled: enabled,
  });
}

/**
 * Set the auto-call speed (clamped to valid range).
 */
export function setAutoCallSpeed(
  state: GameState,
  speed: number
): GameState {
  const clampedSpeed = Math.max(
    MIN_AUTO_CALL_SPEED,
    Math.min(MAX_AUTO_CALL_SPEED, speed)
  );
  return deepFreeze({
    ...state,
    autoCallSpeed: clampedSpeed,
  });
}

/**
 * Enable or disable audio.
 */
export function setAudioEnabled(
  state: GameState,
  enabled: boolean
): GameState {
  return deepFreeze({
    ...state,
    audioEnabled: enabled,
  });
}

// ============ Selectors (pure functions for derived state) ============

/**
 * Get the number of balls remaining in the deck.
 */
export function getBallsRemaining(state: GameState): number {
  return state.remainingBalls.length;
}

/**
 * Get the number of balls called.
 */
export function getBallsCalled(state: GameState): number {
  return state.calledBalls.length;
}

/**
 * Check if undo is possible.
 */
export function canUndoCall(state: GameState): boolean {
  return state.calledBalls.length > 0 && state.status === 'playing';
}

/**
 * Check if a ball can be called.
 */
export function canCallBall(state: GameState): boolean {
  return (
    canCallBallStatus(state.status) && state.remainingBalls.length > 0
  );
}

/**
 * Check if the game can be started.
 */
export function canStartGame(state: GameState): boolean {
  return state.status === 'idle';
}

/**
 * Check if the game can be paused.
 */
export function canPauseGame(state: GameState): boolean {
  return state.status === 'playing';
}

/**
 * Check if the game can be resumed.
 */
export function canResumeGame(state: GameState): boolean {
  return state.status === 'paused';
}

/**
 * Get the last N called balls (most recent first).
 */
export function getRecentBalls(state: GameState, count: number): BingoBall[] {
  const balls = [...state.calledBalls].reverse();
  return balls.slice(0, count);
}

/**
 * Check if a specific ball number has been called.
 */
export function isBallCalled(state: GameState, ballNumber: number): boolean {
  return state.calledBalls.some((b) => b.number === ballNumber);
}
