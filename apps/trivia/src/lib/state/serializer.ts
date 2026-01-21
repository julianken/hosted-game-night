import {
  TriviaGameState,
  Question,
  Team,
  TeamAnswer,
  Timer,
  GameSettings,
  GameStatus,
  QuestionType,
  QuestionCategory,
} from '@/types';
import {
  DEFAULT_ROUNDS,
  QUESTIONS_PER_ROUND,
  DEFAULT_TIMER_DURATION
} from '@/types';

/**
 * Serialized representation of a Trivia game state for database storage.
 * This is a plain object that can be safely stored in JSON/JSONB columns.
 */
export interface SerializedTriviaState {
  sessionId: string;
  status: string;
  statusBeforePause: string | null;
  questions: Question[];
  selectedQuestionIndex: number;
  displayQuestionIndex: number | null;
  currentRound: number;
  totalRounds: number;
  teams: Team[];
  teamAnswers: TeamAnswer[];
  timer: Timer;
  settings: GameSettings;
  showScoreboard: boolean;
  emergencyBlank: boolean;
  ttsEnabled: boolean;
}

/**
 * Validation error thrown when deserializing invalid data.
 */
export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SerializationError';
  }
}

/**
 * Validates that a value is a valid Question object.
 */
function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== 'object') return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.id === 'string' &&
    typeof q.text === 'string' &&
    typeof q.type === 'string' &&
    ['multiple_choice', 'true_false'].includes(q.type) &&
    Array.isArray(q.correctAnswers) &&
    q.correctAnswers.every((a) => typeof a === 'string') &&
    Array.isArray(q.options) &&
    q.options.every((o) => typeof o === 'string') &&
    Array.isArray(q.optionTexts) &&
    q.optionTexts.every((t) => typeof t === 'string') &&
    typeof q.category === 'string' &&
    typeof q.roundIndex === 'number'
  );
}

/**
 * Validates that a value is an array of Question objects.
 */
function isQuestionArray(value: unknown): value is Question[] {
  return Array.isArray(value) && value.every(isQuestion);
}

/**
 * Validates that a value is a valid Team object.
 */
function isTeam(value: unknown): value is Team {
  if (!value || typeof value !== 'object') return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.name === 'string' &&
    typeof t.score === 'number' &&
    typeof t.tableNumber === 'number' &&
    t.tableNumber >= 1 &&
    t.tableNumber <= 20 &&
    Array.isArray(t.roundScores) &&
    t.roundScores.every((s) => typeof s === 'number')
  );
}

/**
 * Validates that a value is an array of Team objects.
 */
function isTeamArray(value: unknown): value is Team[] {
  return Array.isArray(value) && value.every(isTeam);
}

/**
 * Validates that a value is a valid TeamAnswer object.
 */
function isTeamAnswer(value: unknown): value is TeamAnswer {
  if (!value || typeof value !== 'object') return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.teamId === 'string' &&
    typeof a.questionId === 'string' &&
    typeof a.answer === 'string' &&
    typeof a.isCorrect === 'boolean' &&
    typeof a.pointsAwarded === 'number'
  );
}

/**
 * Validates that a value is an array of TeamAnswer objects.
 */
function isTeamAnswerArray(value: unknown): value is TeamAnswer[] {
  return Array.isArray(value) && value.every(isTeamAnswer);
}

/**
 * Validates that a value is a valid Timer object.
 */
function isTimer(value: unknown): value is Timer {
  if (!value || typeof value !== 'object') return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.duration === 'number' &&
    t.duration >= 0 &&
    typeof t.remaining === 'number' &&
    t.remaining >= 0 &&
    typeof t.isRunning === 'boolean'
  );
}

/**
 * Validates that a value is a valid GameSettings object.
 */
function isGameSettings(value: unknown): value is GameSettings {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.roundsCount === 'number' &&
    s.roundsCount > 0 &&
    typeof s.questionsPerRound === 'number' &&
    s.questionsPerRound > 0 &&
    typeof s.timerDuration === 'number' &&
    s.timerDuration >= 0 &&
    typeof s.timerAutoStart === 'boolean' &&
    typeof s.timerVisible === 'boolean' &&
    typeof s.ttsEnabled === 'boolean'
  );
}

/**
 * Validates that a value is a valid game status.
 */
function isGameStatus(value: unknown): value is GameStatus {
  return (
    typeof value === 'string' &&
    ['setup', 'playing', 'between_rounds', 'paused', 'ended'].includes(value)
  );
}

/**
 * Serializes a TriviaGameState object into a plain object suitable for database storage.
 * Extracts all serializable fields from the game state.
 *
 * @param state - The game state to serialize
 * @returns A plain object ready for JSON serialization
 */
export function serializeTriviaState(state: TriviaGameState): SerializedTriviaState {
  return {
    sessionId: state.sessionId,
    status: state.status,
    statusBeforePause: state.statusBeforePause,
    questions: state.questions,
    selectedQuestionIndex: state.selectedQuestionIndex,
    displayQuestionIndex: state.displayQuestionIndex,
    currentRound: state.currentRound,
    totalRounds: state.totalRounds,
    teams: state.teams,
    teamAnswers: state.teamAnswers,
    timer: state.timer,
    settings: state.settings,
    showScoreboard: state.showScoreboard,
    emergencyBlank: state.emergencyBlank,
    ttsEnabled: state.ttsEnabled,
  };
}

/**
 * Deserializes a database record back into a partial TriviaGameState object.
 * This function performs validation and provides sensible defaults for missing data.
 *
 * @param data - The serialized data from the database
 * @returns A partial TriviaGameState object that can be merged with the current state
 * @throws SerializationError if the data is invalid or corrupted
 */
export function deserializeTriviaState(data: unknown): Partial<TriviaGameState> {
  // Validate input is an object
  if (!data || typeof data !== 'object') {
    throw new SerializationError('Invalid serialized data: expected object');
  }

  const record = data as Record<string, unknown>;

  // Validate and extract sessionId (required)
  if (typeof record.sessionId !== 'string') {
    throw new SerializationError('Invalid sessionId: expected string');
  }

  // Validate and extract status (required)
  if (!isGameStatus(record.status)) {
    throw new SerializationError(
      `Invalid status: expected 'setup', 'playing', 'between_rounds', 'paused', or 'ended', got ${record.status}`
    );
  }

  // Validate statusBeforePause (optional)
  const statusBeforePause = record.statusBeforePause;
  if (
    statusBeforePause !== null &&
    statusBeforePause !== undefined &&
    !isGameStatus(statusBeforePause)
  ) {
    throw new SerializationError(
      'Invalid statusBeforePause: expected valid GameStatus or null'
    );
  }

  // Validate questions (required, can be empty array)
  if (!isQuestionArray(record.questions)) {
    throw new SerializationError(
      'Invalid questions: expected array of Question objects'
    );
  }

  // Validate selectedQuestionIndex (required)
  if (typeof record.selectedQuestionIndex !== 'number' || record.selectedQuestionIndex < 0) {
    throw new SerializationError(
      'Invalid selectedQuestionIndex: expected non-negative number'
    );
  }

  // Validate displayQuestionIndex (optional)
  const displayQuestionIndex = record.displayQuestionIndex;
  if (
    displayQuestionIndex !== null &&
    displayQuestionIndex !== undefined &&
    (typeof displayQuestionIndex !== 'number' || displayQuestionIndex < 0)
  ) {
    throw new SerializationError(
      'Invalid displayQuestionIndex: expected non-negative number or null'
    );
  }

  // Validate currentRound (required)
  if (typeof record.currentRound !== 'number' || record.currentRound < 0) {
    throw new SerializationError(
      'Invalid currentRound: expected non-negative number'
    );
  }

  // Validate totalRounds (required)
  if (typeof record.totalRounds !== 'number' || record.totalRounds < 1) {
    throw new SerializationError(
      'Invalid totalRounds: expected positive number'
    );
  }

  // Validate teams (required, can be empty array)
  if (!isTeamArray(record.teams)) {
    throw new SerializationError(
      'Invalid teams: expected array of Team objects'
    );
  }

  // Validate teamAnswers (required, can be empty array)
  if (!isTeamAnswerArray(record.teamAnswers)) {
    throw new SerializationError(
      'Invalid teamAnswers: expected array of TeamAnswer objects'
    );
  }

  // Validate timer (required)
  if (!isTimer(record.timer)) {
    throw new SerializationError(
      'Invalid timer: expected Timer object'
    );
  }

  // Validate settings (required)
  if (!isGameSettings(record.settings)) {
    throw new SerializationError(
      'Invalid settings: expected GameSettings object'
    );
  }

  // Validate showScoreboard (optional, default false)
  const showScoreboard =
    typeof record.showScoreboard === 'boolean' ? record.showScoreboard : false;

  // Validate emergencyBlank (optional, default false)
  const emergencyBlank =
    typeof record.emergencyBlank === 'boolean' ? record.emergencyBlank : false;

  // Validate ttsEnabled (optional, default false)
  const ttsEnabled =
    typeof record.ttsEnabled === 'boolean' ? record.ttsEnabled : false;

  // Build the partial state
  const partialState: Partial<TriviaGameState> = {
    sessionId: record.sessionId,
    status: record.status,
    statusBeforePause: (statusBeforePause ?? null) as GameStatus | null,
    questions: record.questions,
    selectedQuestionIndex: record.selectedQuestionIndex,
    displayQuestionIndex: (displayQuestionIndex ?? null) as number | null,
    currentRound: record.currentRound,
    totalRounds: record.totalRounds,
    teams: record.teams,
    teamAnswers: record.teamAnswers,
    timer: record.timer,
    settings: record.settings,
    showScoreboard,
    emergencyBlank,
    ttsEnabled,
  };

  return partialState;
}
