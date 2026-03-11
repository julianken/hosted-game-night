import type {
  TeamId as BrandedTeamId,
  QuestionId as BrandedQuestionId,
} from '@joolie-boolie/types/branded';

// =============================================================================
// BRANDED TYPE RE-EXPORTS
// =============================================================================

/**
 * Team identifier, branded for compile-time safety.
 * Prevents accidental mixing with QuestionId or other string IDs.
 */
export type TeamId = BrandedTeamId;

/**
 * Question identifier, branded for compile-time safety.
 * Prevents accidental mixing with TeamId or other string IDs.
 */
export type QuestionId = BrandedQuestionId;

// =============================================================================
// TYPE GUARDS & DISCRIMINATED UNION
// =============================================================================

export {
  // State variant types
  type SetupState,
  type PlayingState,
  type BetweenRoundsState,
  type EndedState,
  type GameStateVariant,
  // Type guard functions
  isSetupState,
  isPlayingState,
  isBetweenRoundsState,
  isEndedState,
  isGameActive,
  isConfigurable,
  // Assertion helpers
  assertNever,
  assertSetupState,
  assertPlayingState,
  assertBetweenRoundsState,
  assertEndedState,
} from './guards';

// =============================================================================
// AUDIENCE SCENE LAYER
// =============================================================================

export type {
  AudienceScene,
  RevealPhase,
  ScoreDelta,
} from './audience-scene';

export {
  SCENE_TIMING,
  REVEAL_TIMING,
  TIMED_SCENES,
  VALID_SCENES_BY_STATUS,
} from './audience-scene';

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

/**
 * Trivia-specific game status values.
 *
 * Differs from the shared `GameStatus` in `@joolie-boolie/game-stats`
 * which uses `'idle'` instead of `'setup'` and lacks `'between_rounds'`.
 * Trivia needs `'setup'` for its configuration phase and `'between_rounds'`
 * for multi-round game flow.
 */
export type GameStatus = 'setup' | 'playing' | 'between_rounds' | 'ended';

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
  id: QuestionId;
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
  id: TeamId;
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
// ROUND BREAKDOWN
// =============================================================================

export interface RoundCategoryEntry {
  categoryId: QuestionCategory;
  questionCount: number;
}

/** Per-round distribution breakdown used by both WizardStepSettings (badge pills) and WizardStepReview (grid coloring).
 * Array length always equals `roundsCount`. 0-based `roundIndex`. Empty rounds included, not omitted.
 * `isMatch` is precomputed — consumers read it directly without recalculating. */
export interface PerRoundBreakdown {
  roundIndex: number;
  totalCount: number;
  expectedCount: number;
  isMatch: boolean;
  categories: RoundCategoryEntry[];
}

// =============================================================================
// TEAM ANSWER
// =============================================================================

export interface TeamAnswer {
  teamId: TeamId;
  questionId: QuestionId;
  answer: string;
  isCorrect: boolean;
  pointsAwarded: number;
}

// =============================================================================
// GAME STATE
// =============================================================================

export interface TriviaGameState {
  status: GameStatus;

  // -- Questions --
  questions: Question[]; // All questions for the game
  selectedQuestionIndex: number; // Which question presenter is viewing (0-based)
  displayQuestionIndex: number | null; // Which question shown on audience (null = none)

  // -- Rounds --
  currentRound: number; // 0-based current round index
  totalRounds: number; // Total number of rounds (default 3)

  // -- Teams --
  teams: Team[]; // Max 20
  teamAnswers: TeamAnswer[]; // All team answers for scoring

  // -- Timer --
  timer: Timer;
  settings: GameSettings;

  // -- Display settings (legacy flags, preserved for compatibility) --
  showScoreboard: boolean; // Manual toggle
  emergencyBlank: boolean; // Emergency pause blanks audience

  // -- Audio --
  ttsEnabled: boolean; // Off by default

  // =========================================================================
  // AUDIENCE SCENE LAYER (new -- phase 5)
  // =========================================================================

  /**
   * Current audience display scene. Controls what the audience display renders.
   * Orthogonal to GameStatus -- the engine does not set this directly (except
   * through scene-setting helpers). Synced via BroadcastChannel STATE_UPDATE.
   *
   * Default: 'waiting'. Resets to valid default via deriveSceneFromStatus()
   * if a GameStatus change invalidates the current scene.
   */
  audienceScene: import('./audience-scene').AudienceScene;

  /**
   * Scene to restore after pause or emergency blank.
   * Set when transitioning to 'paused' or 'emergency_blank'.
   * Cleared on resume. null when not in an interruptible state.
   */
  sceneBeforePause: import('./audience-scene').AudienceScene | null;

  /**
   * Epoch milliseconds when audienceScene was last set.
   * Used by timed scenes on the audience display to compute remaining duration
   * after a reconnect (REQUEST_SYNC). BroadcastChannel is same-device only,
   * so clock skew is not a concern.
   */
  sceneTimestamp: number;

  /**
   * Current phase of the 3-beat reveal choreography.
   * null when no reveal is in progress.
   *
   * SYNCED (not presenter-local) so the audience display can render the
   * settled state on reconnect without replaying the animation.
   * See RevealPhase in types/audience-scene.ts for beat descriptions.
   */
  revealPhase: import('./audience-scene').RevealPhase;

  /**
   * Score changes for the most recent scoring event.
   * Per-question deltas shown in round_summary.
   * Cleared when advancing to the next round.
   */
  scoreDeltas: import('./audience-scene').ScoreDelta[];

  /**
   * Snapshot of each team's cumulative score at the start of the current round.
   * Keyed by teamId. Used to compute scoreDeltas when the round completes.
   * Populated by startGame (round 0) and nextRound (subsequent rounds).
   * Reset to {} on game reset.
   */
  questionStartScores: Record<string, number>;

  /**
   * Sub-state for the recap_qa scene controlling question vs answer face.
   *
   * - `null`  -- not in recap (default, reset on exit)
   * - `false` -- question face showing
   * - `true`  -- answer face showing
   *
   * SYNCED via BroadcastChannel STATE_UPDATE so the audience display
   * renders the correct face on reconnect.
   */
  recapShowingAnswer: boolean | null;

  /**
   * Partial entries during per-round scoring. Maps teamId to the
   * score value entered so far. Cleared when leaving round_scoring.
   */
  roundScoringEntries: Record<string, number>;

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

export type SyncMessageType = 'STATE_UPDATE' | 'REQUEST_SYNC' | 'DISPLAY_THEME_CHANGED' | 'CHANNEL_READY';

// Trivia-specific payload union type (kept for backwards compatibility)
export type TriviaSyncPayload = TriviaGameState | ThemePayload | null;

/** Base fields shared by all sync messages */
interface SyncMessageBase {
  timestamp: number;
  originId?: string;
  sequenceNumber?: number;
}

/**
 * Discriminated union of all Trivia sync messages.
 * Each variant maps a `type` to its exact `payload` type, enabling
 * exhaustive `switch` blocks with full type narrowing and zero casts.
 */
export type TriviaSyncMessage =
  | (SyncMessageBase & { type: 'STATE_UPDATE'; payload: TriviaGameState })
  | (SyncMessageBase & { type: 'REQUEST_SYNC'; payload: null })
  | (SyncMessageBase & { type: 'DISPLAY_THEME_CHANGED'; payload: ThemePayload })
  | (SyncMessageBase & { type: 'CHANNEL_READY'; payload: null });

/**
 * @deprecated Use `TriviaSyncMessage` instead. Kept for backwards compatibility.
 */
export type SyncMessage = TriviaSyncMessage;

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

