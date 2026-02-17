/**
 * Common game-related types shared across the Joolie Boolie.
 *
 * These types represent the core concepts that are common to all games
 * in the platform (bingo, trivia, etc.).
 */

// =============================================================================
// GAME STATUS
// =============================================================================

/**
 * Base game status shared across all games.
 * Individual games may extend with additional statuses.
 */
export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';

/**
 * Extended game status for trivia that includes additional states.
 */
export type TriviaGameStatus = GameStatus | 'setup' | 'between_rounds';

// =============================================================================
// GAME TYPES
// =============================================================================

/**
 * Available game types in the Joolie Boolie.
 */
export type GameType = 'bingo' | 'trivia';

/**
 * Map of game types to their display names.
 */
export const GAME_TYPE_NAMES = {
  bingo: 'Bingo',
  trivia: 'Trivia',
} as const satisfies Record<GameType, string>;

// =============================================================================
// GAME SESSION
// =============================================================================

/**
 * Base interface for a game session.
 * Individual games should extend this with game-specific fields.
 */
export interface GameSession {
  /** Unique identifier for the session */
  id: string;
  /** Display name for the session */
  name: string;
  /** Current status of the game */
  status: GameStatus;
  /** ISO 8601 timestamp when the session was created */
  createdAt: string;
  /** ISO 8601 timestamp when the session was last updated */
  updatedAt: string;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Theme mode for the application.
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Available color themes in the platform.
 */
export type ColorTheme =
  | 'blue'
  | 'green'
  | 'purple'
  | 'orange'
  | 'red'
  | 'teal'
  | 'pink'
  | 'amber'
  | 'indigo'
  | 'cyan';

// =============================================================================
// TIMESTAMPS
// =============================================================================

/**
 * Standard timestamp fields for database entities.
 */
export interface Timestamps {
  /** ISO 8601 timestamp when the entity was created */
  createdAt: string;
  /** ISO 8601 timestamp when the entity was last updated */
  updatedAt: string;
}
