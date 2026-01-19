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

export type QuestionCategory = 'music' | 'movies' | 'tv' | 'history';

export type GameStatus = 'setup' | 'playing' | 'between_rounds' | 'ended';

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
// GAME STATE
// =============================================================================

export interface TriviaGameState {
  // Session
  sessionId: string;
  status: GameStatus;

  // Questions
  questions: Question[]; // All questions for the game
  selectedQuestionIndex: number; // Which question presenter is viewing (0-based)
  displayQuestionIndex: number | null; // Which question shown on audience (null = none)

  // Rounds
  currentRound: number; // 0-based current round index
  totalRounds: number; // Total number of rounds (default 3)

  // Teams
  teams: Team[]; // Max 20

  // Display settings
  showScoreboard: boolean; // Manual toggle

  // Audio
  ttsEnabled: boolean; // Off by default
}

// =============================================================================
// SYNC MESSAGES
// =============================================================================

export type SyncMessageType = 'STATE_UPDATE' | 'REQUEST_SYNC';

export interface SyncMessage {
  type: SyncMessageType;
  payload: TriviaGameState | null;
  timestamp: number;
}
