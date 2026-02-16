/**
 * Game Statistics Types
 *
 * Shared types for tracking game statistics across all games in the Joolie Boolie.
 */

// =============================================================================
// BASE TYPES
// =============================================================================

/**
 * Base statistics interface shared by all games.
 */
export interface BaseGameStatistics {
  /** Total number of games played */
  gamesPlayed: number;
  /** Total time spent playing in milliseconds */
  totalPlayTime: number;
  /** First game timestamp (ISO string) */
  firstGameAt: string | null;
  /** Last game timestamp (ISO string) */
  lastGameAt: string | null;
}

// =============================================================================
// BINGO STATISTICS
// =============================================================================

/**
 * Individual bingo session record for tracking.
 */
export interface BingoSessionRecord {
  /** Unique session ID */
  id: string;
  /** Pattern ID used in the game */
  patternId: string;
  /** Pattern name for display */
  patternName: string;
  /** Number of balls called before win/end */
  ballsCalled: number;
  /** Whether there was a winner */
  hasWinner: boolean;
  /** Session start timestamp (ISO string) */
  startedAt: string;
  /** Session end timestamp (ISO string) */
  endedAt: string;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Aggregated pattern statistics for bingo.
 */
export interface BingoPatternStats {
  /** Pattern ID */
  patternId: string;
  /** Pattern name */
  patternName: string;
  /** Number of times this pattern was played */
  timesPlayed: number;
  /** Average balls to win for this pattern */
  averageBallsToWin: number;
  /** Total wins with this pattern */
  wins: number;
}

/**
 * Complete bingo statistics.
 */
export interface BingoStatistics extends BaseGameStatistics {
  /** Game type identifier */
  gameType: 'bingo';
  /** Average balls called before a winner */
  averageBallsToWin: number;
  /** Total balls called across all games */
  totalBallsCalled: number;
  /** Statistics per pattern */
  patternStats: BingoPatternStats[];
  /** Recent session records (limited to last N) */
  recentSessions: BingoSessionRecord[];
}

// =============================================================================
// TRIVIA STATISTICS
// =============================================================================

/**
 * Individual trivia session record for tracking.
 */
export interface TriviaSessionRecord {
  /** Unique session ID */
  id: string;
  /** Number of rounds played */
  roundsPlayed: number;
  /** Total rounds in the game */
  totalRounds: number;
  /** Number of questions answered */
  questionsAnswered: number;
  /** Total questions in the game */
  totalQuestions: number;
  /** Number of teams */
  teamCount: number;
  /** Winning team name (if any) */
  winnerTeamName: string | null;
  /** Winning team score */
  winnerScore: number | null;
  /** Average score across all teams */
  averageTeamScore: number;
  /** Categories played (unique list) */
  categoriesPlayed: string[];
  /** Session start timestamp (ISO string) */
  startedAt: string;
  /** Session end timestamp (ISO string) */
  endedAt: string;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Aggregated category statistics for trivia.
 */
export interface TriviaCategoryStats {
  /** Category name */
  category: string;
  /** Number of questions answered in this category */
  questionsAnswered: number;
  /** Number of questions answered correctly across all teams */
  correctAnswers: number;
  /** Accuracy percentage */
  accuracy: number;
}

/**
 * Complete trivia statistics.
 */
export interface TriviaStatistics extends BaseGameStatistics {
  /** Game type identifier */
  gameType: 'trivia';
  /** Total questions answered across all games */
  totalQuestionsAnswered: number;
  /** Total correct answers across all games */
  totalCorrectAnswers: number;
  /** Overall accuracy percentage */
  overallAccuracy: number;
  /** Average team score across all games */
  averageTeamScore: number;
  /** Highest team score ever achieved */
  highestTeamScore: number;
  /** Statistics per category */
  categoryStats: TriviaCategoryStats[];
  /** Recent session records (limited to last N) */
  recentSessions: TriviaSessionRecord[];
}

// =============================================================================
// STORAGE TYPES
// =============================================================================

/**
 * Storage keys for localStorage persistence.
 */
export const STORAGE_KEYS = {
  BINGO_STATS: 'jb:bingo-statistics',
  TRIVIA_STATS: 'jb:trivia-statistics',
} as const;

/**
 * Maximum number of recent sessions to store.
 */
export const MAX_RECENT_SESSIONS = 20;
