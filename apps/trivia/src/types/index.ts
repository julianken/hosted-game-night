// =============================================================================
// TYPE GUARDS & DISCRIMINATED UNION
// =============================================================================

export {
  // State variant types
  type SetupState,
  type PlayingState,
  type BetweenRoundsState,
  type PausedState,
  type EndedState,
  type GameStateVariant,
  // Type guard functions
  isSetupState,
  isPlayingState,
  isBetweenRoundsState,
  isPausedState,
  isEndedState,
  isGameActive,
  canPauseState,
  isConfigurable,
  // Accessors
  getEffectiveDisplayStatus,
  getResumeTarget,
  // Assertion helpers
  assertNever,
  assertSetupState,
  assertPlayingState,
  assertBetweenRoundsState,
  assertPausedState,
  assertEndedState,
} from './guards';

// =============================================================================
// CONSTANTS
// =============================================================================

export const MAX_TEAMS = 20;
export const DEFAULT_TEAM_PREFIX = 'Table';
export const DEFAULT_ROUNDS = 3;
export const QUESTIONS_PER_ROUND = 5;

// =============================================================================
// CORE TYPES
// =============================================================================

export type QuestionType = 'multiple_choice' | 'true_false';

/**
 * Question categories for organizing trivia questions.
 * Note: 'music', 'movies', 'tv' are legacy categories mapped to 'entertainment'.
 * Use normalizeCategoryId() from lib/categories.ts when processing questions.
 */
export type QuestionCategory =
  | 'general_knowledge'
  | 'science'
  | 'history'
  | 'geography'
  | 'entertainment'
  | 'sports'
  | 'art_literature'
  // Legacy categories (for backwards compatibility)
  | 'music'
  | 'movies'
  | 'tv';

export type GameStatus = 'setup' | 'playing' | 'between_rounds' | 'paused' | 'ended';

// =============================================================================
// TIMER
// =============================================================================

export const DEFAULT_TIMER_DURATION = 30;

export interface Timer {
  duration: number; // Total timer duration in seconds
  remaining: number; // Time remaining in seconds
  isRunning: boolean; // Whether timer is currently counting down
}

// =============================================================================
// QUESTION
// =============================================================================

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  correctAnswers: string[]; // Array to support multiple correct answers
  options: string[]; // ['A', 'B', 'C', 'D'] for MC; ['True', 'False'] for T/F
  optionTexts: string[]; // Human-readable option text for each option
  category: QuestionCategory;
  explanation?: string; // Optional: shown on answer reveal
  roundIndex: number; // 0-based round index
}

// =============================================================================
// TEAM
// =============================================================================

export interface Team {
  id: string;
  name: string; // "Table 1" or custom name
  score: number; // Total score (computed from roundScores sum)
  tableNumber: number; // 1-20
  roundScores: number[]; // Per-round scores, total computed from sum
}

// =============================================================================
// GAME SETTINGS
// =============================================================================

export interface GameSettings {
  roundsCount: number;
  questionsPerRound: number;
  timerDuration: number;
  timerAutoStart: boolean;
  timerVisible: boolean;
  ttsEnabled: boolean;
}

// =============================================================================
// TEAM ANSWER
// =============================================================================

export interface TeamAnswer {
  teamId: string;
  questionId: string;
  answer: string;
  isCorrect: boolean;
  pointsAwarded: number;
}

// =============================================================================
// GAME STATE
// =============================================================================

export interface TriviaGameState {
  // Session
  sessionId: string;
  status: GameStatus;
  statusBeforePause: GameStatus | null; // For pause/resume functionality

  // Questions
  questions: Question[]; // All questions for the game
  selectedQuestionIndex: number; // Which question presenter is viewing (0-based)
  displayQuestionIndex: number | null; // Which question shown on audience (null = none)

  // Rounds
  currentRound: number; // 0-based current round index
  totalRounds: number; // Total number of rounds (default 3)

  // Teams
  teams: Team[]; // Max 20
  teamAnswers: TeamAnswer[]; // All team answers for scoring

  // Timer
  timer: Timer;
  settings: GameSettings;

  // Display settings
  showScoreboard: boolean; // Manual toggle
  emergencyBlank: boolean; // Emergency pause blanks audience

  // Audio
  ttsEnabled: boolean; // Off by default
}

// =============================================================================
// THEME TYPES
// =============================================================================

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemePayload {
  theme: ThemeMode;
}

// =============================================================================
// SYNC MESSAGES
// =============================================================================

export type SyncMessageType = 'STATE_UPDATE' | 'REQUEST_SYNC' | 'DISPLAY_THEME_CHANGED';

// Trivia-specific payload union type
export type TriviaSyncPayload = TriviaGameState | ThemePayload | null;

export interface SyncMessage {
  type: SyncMessageType;
  payload: TriviaSyncPayload;
  timestamp: number;
}

// =============================================================================
// GAME SESSION TYPES (API)
// =============================================================================

export type TriviaGameSessionStatus = 'setup' | 'playing' | 'between_rounds' | 'paused' | 'ended';

export interface TriviaGameSession {
  id: string;
  name: string;
  status: TriviaGameSessionStatus;
  currentRound: number;
  totalRounds: number;
  teams: Team[];
  questionSetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTriviaGameRequest {
  name: string;
  totalRounds?: number;
  questionsPerRound?: number;
  questionSetId?: string;
}

export interface UpdateTriviaGameRequest {
  name?: string;
  status?: TriviaGameSessionStatus;
  currentRound?: number;
  totalRounds?: number;
  teams?: Team[];
  questionSetId?: string;
}

// =============================================================================
// QUESTION SET TYPES (API)
// =============================================================================

export interface QuestionSet {
  id: string;
  name: string;
  description: string | null;
  questions: Question[];
  category: QuestionCategory | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionSetRequest {
  name: string;
  description?: string;
  questions: Omit<Question, 'id' | 'roundIndex'>[];
  category?: QuestionCategory;
}

export interface UpdateQuestionSetRequest {
  name?: string;
  description?: string;
  questions?: Omit<Question, 'id' | 'roundIndex'>[];
  category?: QuestionCategory;
}

// =============================================================================
// SESSION HISTORY TYPES (API)
// =============================================================================

/**
 * Summary of team scores for a completed session
 */
export interface SessionTeamScore {
  teamId: string;
  teamName: string;
  totalScore: number;
  roundScores: number[];
}

/**
 * Summary of a question answer for session history
 */
export interface SessionQuestionSummary {
  questionId: string;
  questionText: string;
  correctAnswers: string[];
  teamsCorrect: number;
  teamsIncorrect: number;
}

/**
 * Complete session history record
 */
export interface TriviaSessionHistory {
  id: string;
  startedAt: string;
  endedAt: string | null;
  roundsPlayed: number;
  totalRounds: number;
  questionsAnswered: number;
  totalQuestions: number;
  teamScores: SessionTeamScore[];
  winnerTeamId: string | null;
  winnerTeamName: string | null;
  userId: string | null; // For future auth integration
  questionSetId: string | null;
  questionSetName: string | null;
  questionSummaries: SessionQuestionSummary[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Request to create a new session history record
 */
export interface CreateSessionHistoryRequest {
  startedAt: string;
  endedAt?: string;
  roundsPlayed: number;
  totalRounds: number;
  questionsAnswered: number;
  totalQuestions: number;
  teamScores: SessionTeamScore[];
  winnerTeamId?: string;
  winnerTeamName?: string;
  userId?: string;
  questionSetId?: string;
  questionSetName?: string;
  questionSummaries?: SessionQuestionSummary[];
}

/**
 * Request to update an existing session history record
 */
export interface UpdateSessionHistoryRequest {
  endedAt?: string;
  roundsPlayed?: number;
  questionsAnswered?: number;
  teamScores?: SessionTeamScore[];
  winnerTeamId?: string;
  winnerTeamName?: string;
  questionSummaries?: SessionQuestionSummary[];
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
}
