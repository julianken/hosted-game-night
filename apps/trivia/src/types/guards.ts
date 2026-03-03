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

import type { TriviaGameState } from './index';

// =============================================================================
// STATUS-SPECIFIC STATE INTERFACES
// =============================================================================

/**
 * State when the game is in setup mode.
 * - No game in progress
 * - Settings and questions can be modified
 * - Teams can be added/removed
 */
export interface SetupState extends TriviaGameState {
  readonly status: 'setup';
  readonly emergencyBlank: false;
}

/**
 * State when the game is actively being played.
 * - Questions are being shown to teams
 * - Timer may be running
 * - Scores can be adjusted
 */
export interface PlayingState extends TriviaGameState {
  readonly status: 'playing';
}

/**
 * State between rounds.
 * - Current round just completed
 * - Scoreboard typically shown
 * - Waiting for presenter to advance to next round
 */
export interface BetweenRoundsState extends TriviaGameState {
  readonly status: 'between_rounds';
  readonly displayQuestionIndex: null;
}

/**
 * State when the game has ended.
 * - Final scores are shown
 * - No more actions except reset
 */
export interface EndedState extends TriviaGameState {
  readonly status: 'ended';
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
  | EndedState;

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isSetupState(state: TriviaGameState): state is SetupState {
  return state.status === 'setup';
}

export function isPlayingState(state: TriviaGameState): state is PlayingState {
  return state.status === 'playing';
}

export function isBetweenRoundsState(state: TriviaGameState): state is BetweenRoundsState {
  return state.status === 'between_rounds';
}

export function isEndedState(state: TriviaGameState): state is EndedState {
  return state.status === 'ended';
}

// =============================================================================
// COMPOUND TYPE GUARDS
// =============================================================================

/**
 * Returns true if the game is actively in progress (playing or between rounds).
 * Excludes setup and ended states.
 */
export function isGameActive(state: TriviaGameState): state is PlayingState | BetweenRoundsState {
  return state.status === 'playing' || state.status === 'between_rounds';
}

/**
 * Returns true if the game is in a state where settings can be modified.
 */
export function isConfigurable(state: TriviaGameState): state is SetupState {
  return state.status === 'setup';
}

// =============================================================================
// EXHAUSTIVENESS HELPER
// =============================================================================

/**
 * Exhaustive status handler. Ensures all status values are handled at compile time.
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected game status: ${value}`);
}

// =============================================================================
// TRANSITION VALIDATORS
// =============================================================================

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

export function assertEndedState(state: TriviaGameState): EndedState {
  if (!isEndedState(state)) {
    throw new Error(`Expected ended state, got '${state.status}'`);
  }
  return state;
}
