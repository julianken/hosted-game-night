import type { GameStatus } from '@/types';

/**
 * Game actions that trigger state transitions in trivia.
 */
export type TriviaGameAction =
  | 'START_GAME'
  | 'COMPLETE_ROUND'
  | 'NEXT_ROUND'
  | 'END_GAME'
  | 'RESET_GAME'
  | 'PAUSE_GAME'
  | 'RESUME_GAME'
  | 'EMERGENCY_PAUSE';

/**
 * Valid actions from each game status.
 * Maps each current status to the set of actions that can be taken from it.
 */
export const VALID_TRANSITIONS = {
  setup: ['START_GAME'],
  playing: ['COMPLETE_ROUND', 'END_GAME', 'RESET_GAME', 'PAUSE_GAME', 'EMERGENCY_PAUSE'],
  between_rounds: ['NEXT_ROUND', 'END_GAME', 'RESET_GAME', 'PAUSE_GAME', 'EMERGENCY_PAUSE'],
  paused: ['RESUME_GAME', 'END_GAME', 'RESET_GAME'],
  ended: ['RESET_GAME'],
} as const satisfies Record<GameStatus, readonly TriviaGameAction[]>;

/**
 * Resulting status after each action.
 * Note: NEXT_ROUND can result in either 'playing' or 'ended' depending on
 * whether there are more rounds — the engine handles that branching logic.
 * RESUME_GAME restores statusBeforePause — also handled in the engine.
 */
export const ACTION_RESULTS = {
  START_GAME: 'playing',
  COMPLETE_ROUND: 'between_rounds',
  NEXT_ROUND: 'playing', // may become 'ended' if last round — see nextRound()
  END_GAME: 'ended',
  RESET_GAME: 'setup',
  PAUSE_GAME: 'paused',
  RESUME_GAME: 'playing', // restores statusBeforePause — see resumeGame()
  EMERGENCY_PAUSE: 'paused',
} as const satisfies Record<TriviaGameAction, GameStatus>;

/**
 * Check if an action is valid for the current game status.
 */
export function canTransition(status: GameStatus, action: TriviaGameAction): boolean {
  return VALID_TRANSITIONS[status].includes(action);
}

/**
 * Get the expected next status after an action.
 * Returns null if the transition is invalid.
 */
export function getNextStatus(
  currentStatus: GameStatus,
  action: TriviaGameAction
): GameStatus | null {
  if (!canTransition(currentStatus, action)) {
    return null;
  }
  return ACTION_RESULTS[action];
}

/**
 * Assert that an action is valid for the current status.
 * Throws a descriptive error if the transition is invalid.
 * Used to guard lifecycle functions against invalid state transitions.
 */
export function transition(
  currentStatus: GameStatus,
  action: TriviaGameAction
): GameStatus {
  const nextStatus = getNextStatus(currentStatus, action);
  if (nextStatus === null) {
    throw new Error(
      `Invalid transition: cannot ${action} when game is '${currentStatus}'`
    );
  }
  return nextStatus;
}

/**
 * Get all valid actions for the current status.
 */
export function getValidActions(status: GameStatus): TriviaGameAction[] {
  return [...VALID_TRANSITIONS[status]];
}

/**
 * Check if the game can be started (requires setup status and teams).
 */
export function canStart(status: GameStatus): boolean {
  return status === 'setup';
}

/**
 * Check if the game can be paused from the current status.
 */
export function canPause(status: GameStatus): boolean {
  return status === 'playing' || status === 'between_rounds';
}

/**
 * Check if the game can be resumed from the current status.
 */
export function canResume(status: GameStatus): boolean {
  return status === 'paused';
}

/**
 * Check if the game is actively in progress (not setup or ended).
 */
export function isGameActive(status: GameStatus): boolean {
  return status === 'playing' || status === 'between_rounds' || status === 'paused';
}
