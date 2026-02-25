// Game Engine package - Abstract game state machine
// Base types and utilities for all games

export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';

export interface BaseGameState {
  status: GameStatus;
  audioEnabled: boolean;
}

export type GameTransition =
  | 'START_GAME'
  | 'PAUSE_GAME'
  | 'RESUME_GAME'
  | 'END_GAME'
  | 'RESET_GAME';

/**
 * Generic game state transition function.
 * Returns the new status based on current status and action.
 *
 * @deprecated Each game app implements its own state machine. Not used by any current app.
 */
export function transition(current: GameStatus, action: GameTransition): GameStatus {
  switch (action) {
    case 'START_GAME':
      return current === 'idle' ? 'playing' : current;
    case 'PAUSE_GAME':
      return current === 'playing' ? 'paused' : current;
    case 'RESUME_GAME':
      return current === 'paused' ? 'playing' : current;
    case 'END_GAME':
      return 'ended';
    case 'RESET_GAME':
      return 'idle';
    default:
      return current;
  }
}

/**
 * Check if a transition is valid from the current state.
 *
 * @deprecated Each game app implements its own state machine. Not used by any current app.
 */
export function canTransition(current: GameStatus, action: GameTransition): boolean {
  switch (action) {
    case 'START_GAME':
      return current === 'idle';
    case 'PAUSE_GAME':
      return current === 'playing';
    case 'RESUME_GAME':
      return current === 'paused';
    case 'END_GAME':
      return current === 'playing' || current === 'paused';
    case 'RESET_GAME':
      return true; // Can always reset
    default:
      return false;
  }
}

// Export statistics module
export * from './stats';
