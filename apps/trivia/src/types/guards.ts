/**
 * Type guards and discriminated union types for TriviaGameState.
 *
 * This module layers compile-time type safety on top of the flat TriviaGameState
 * interface. Rather than changing the runtime shape of the state (which would be
 * extremely invasive across engine, store, serializer, sync, and components),
 * we define branded state variants and type guard functions that narrow the
 * flat interface to status-specific views.
 *
 * Usage:
 *   if (isPlayingState(state)) {
 *     // state is narrowed to PlayingState
 *     // state.currentRound, state.selectedQuestionIndex are guaranteed meaningful
 *   }
 *
 * For component hooks, see use-status-state.ts which wraps these guards
 * into React-friendly hooks.
 */

import type { TriviaGameState, GameStatus } from './index';

// =============================================================================
// STATUS-SPECIFIC STATE INTERFACES
// =============================================================================

/**
 * State when the game is in setup mode.
 * - No game in progress
 * - Settings and questions can be modified
 * - Teams can be added/removed
 * - statusBeforePause is always null
 */
export interface SetupState extends TriviaGameState {
  readonly status: 'setup';
  readonly statusBeforePause: null;
  readonly emergencyBlank: false;
}

/**
 * State when the game is actively being played.
 * - Questions are being shown to teams
 * - Timer may be running
 * - Scores can be adjusted
 * - statusBeforePause is always null (not paused)
 */
export interface PlayingState extends TriviaGameState {
  readonly status: 'playing';
  readonly statusBeforePause: null;
}

/**
 * State between rounds.
 * - Current round just completed
 * - Scoreboard typically shown
 * - Waiting for presenter to advance to next round
 * - statusBeforePause is always null (not paused)
 */
export interface BetweenRoundsState extends TriviaGameState {
  readonly status: 'between_rounds';
  readonly statusBeforePause: null;
  readonly displayQuestionIndex: null;
}

/**
 * State when the game is paused.
 * - statusBeforePause records where to resume
 * - Timer is stopped
 * - emergencyBlank may or may not be set
 */
export interface PausedState extends TriviaGameState {
  readonly status: 'paused';
  readonly statusBeforePause: 'playing' | 'between_rounds';
}

/**
 * State when the game has ended.
 * - Final scores are shown
 * - No more actions except reset
 * - statusBeforePause is always null
 */
export interface EndedState extends TriviaGameState {
  readonly status: 'ended';
  readonly statusBeforePause: null;
  readonly displayQuestionIndex: null;
}

// =============================================================================
// DISCRIMINATED UNION TYPE
// =============================================================================

/**
 * Discriminated union of all game state variants.
 * Use type guards below to narrow from TriviaGameState to a specific variant.
 */
export type GameStateVariant =
  | SetupState
  | PlayingState
  | BetweenRoundsState
  | PausedState
  | EndedState;

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Narrows TriviaGameState to SetupState.
 */
export function isSetupState(state: TriviaGameState): state is SetupState {
  return state.status === 'setup';
}

/**
 * Narrows TriviaGameState to PlayingState.
 */
export function isPlayingState(state: TriviaGameState): state is PlayingState {
  return state.status === 'playing';
}

/**
 * Narrows TriviaGameState to BetweenRoundsState.
 */
export function isBetweenRoundsState(state: TriviaGameState): state is BetweenRoundsState {
  return state.status === 'between_rounds';
}

/**
 * Narrows TriviaGameState to PausedState.
 */
export function isPausedState(state: TriviaGameState): state is PausedState {
  return state.status === 'paused';
}

/**
 * Narrows TriviaGameState to EndedState.
 */
export function isEndedState(state: TriviaGameState): state is EndedState {
  return state.status === 'ended';
}

// =============================================================================
// COMPOUND TYPE GUARDS
// =============================================================================

/**
 * Returns true if the game is actively in progress (playing, between rounds, or paused).
 * Excludes setup and ended states.
 */
export function isGameActive(state: TriviaGameState): state is PlayingState | BetweenRoundsState | PausedState {
  return state.status === 'playing' || state.status === 'between_rounds' || state.status === 'paused';
}

/**
 * Returns true if the game can be paused (playing or between rounds).
 */
export function canPauseState(state: TriviaGameState): state is PlayingState | BetweenRoundsState {
  return state.status === 'playing' || state.status === 'between_rounds';
}

/**
 * Returns true if the game is in a state where settings can be modified.
 */
export function isConfigurable(state: TriviaGameState): state is SetupState {
  return state.status === 'setup';
}

// =============================================================================
// STATUS-AWARE ACCESSORS
// =============================================================================

/**
 * Get the effective status for display purposes.
 * During emergency pause, this returns 'paused' but indicates the emergency.
 */
export function getEffectiveDisplayStatus(state: TriviaGameState): {
  status: GameStatus;
  isEmergency: boolean;
} {
  return {
    status: state.status,
    isEmergency: state.status === 'paused' && state.emergencyBlank,
  };
}

/**
 * Get the status the game will return to after resuming from pause.
 * Returns null if the game is not paused.
 */
export function getResumeTarget(state: TriviaGameState): 'playing' | 'between_rounds' | null {
  if (!isPausedState(state)) return null;
  return state.statusBeforePause;
}

/**
 * Exhaustive status handler. Ensures all status values are handled at compile time.
 * If a new status is added to GameStatus, any switch using this pattern will
 * produce a compile error until the new case is handled.
 *
 * Usage:
 *   function renderByStatus(state: TriviaGameState) {
 *     switch (state.status) {
 *       case 'setup': return renderSetup(state);
 *       case 'playing': return renderPlaying(state);
 *       case 'between_rounds': return renderBetweenRounds(state);
 *       case 'paused': return renderPaused(state);
 *       case 'ended': return renderEnded(state);
 *       default: return assertNever(state.status);
 *     }
 *   }
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected game status: ${value}`);
}

// =============================================================================
// TRANSITION VALIDATORS
// =============================================================================

/**
 * Validates that a state transition is safe and returns a narrowed type.
 * This pairs with the state-machine module but adds type-level guarantees.
 */
export function assertSetupState(state: TriviaGameState): SetupState {
  if (!isSetupState(state)) {
    throw new Error(`Expected setup state, got '${state.status}'`);
  }
  return state;
}

export function assertPlayingState(state: TriviaGameState): PlayingState {
  if (!isPlayingState(state)) {
    throw new Error(`Expected playing state, got '${state.status}'`);
  }
  return state;
}

export function assertBetweenRoundsState(state: TriviaGameState): BetweenRoundsState {
  if (!isBetweenRoundsState(state)) {
    throw new Error(`Expected between_rounds state, got '${state.status}'`);
  }
  return state;
}

export function assertPausedState(state: TriviaGameState): PausedState {
  if (!isPausedState(state)) {
    throw new Error(`Expected paused state, got '${state.status}'`);
  }
  return state;
}

export function assertEndedState(state: TriviaGameState): EndedState {
  if (!isEndedState(state)) {
    throw new Error(`Expected ended state, got '${state.status}'`);
  }
  return state;
}
