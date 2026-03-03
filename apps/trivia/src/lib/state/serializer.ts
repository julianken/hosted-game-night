import { z } from 'zod';
import {
  TriviaGameState,
  Question,
  Team,
  TeamAnswer,
  Timer,
  GameSettings,
  GameStatus,
} from '@/types';

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const GameStatusSchema = z.enum(['setup', 'playing', 'between_rounds', 'ended']);

const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(['multiple_choice', 'true_false']),
  correctAnswers: z.array(z.string()),
  options: z.array(z.string()),
  optionTexts: z.array(z.string()),
  category: z.string(),
  roundIndex: z.number(),
  explanation: z.string().optional(),
});

const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  score: z.number(),
  tableNumber: z.number().min(1).max(20),
  roundScores: z.array(z.number()),
});

const TeamAnswerSchema = z.object({
  teamId: z.string(),
  questionId: z.string(),
  answer: z.string(),
  isCorrect: z.boolean(),
  pointsAwarded: z.number(),
});

const TimerSchema = z.object({
  duration: z.number().min(0),
  remaining: z.number().min(0),
  isRunning: z.boolean(),
});

const GameSettingsSchema = z.object({
  roundsCount: z.number().min(1),
  questionsPerRound: z.number().min(1),
  timerDuration: z.number().min(0),
  timerAutoStart: z.boolean(),
  timerVisible: z.boolean(),
  ttsEnabled: z.boolean(),
});

// =============================================================================
// PUBLIC TYPES
// =============================================================================

/**
 * Serialized representation of a Trivia game state for database storage.
 * This is a plain object that can be safely stored in JSON/JSONB columns.
 */
export interface SerializedTriviaState {
  sessionId: string;
  status: string;
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

// =============================================================================
// SERIALIZATION
// =============================================================================

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

// =============================================================================
// DESERIALIZATION
// =============================================================================

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

  // Validate sessionId first (with targeted error message matching original)
  if (typeof record.sessionId !== 'string') {
    throw new SerializationError('Invalid sessionId: expected string');
  }

  // Validate status (with targeted error message matching original)
  if (!GameStatusSchema.safeParse(record.status).success) {
    throw new SerializationError(
      `Invalid status: expected 'setup', 'playing', 'between_rounds', or 'ended', got ${record.status}`
    );
  }

  // Validate questions (with targeted error message)
  const questionsResult = z.array(QuestionSchema).safeParse(record.questions);
  if (!questionsResult.success) {
    throw new SerializationError('Invalid questions: expected array of Question objects');
  }

  // Validate selectedQuestionIndex (with targeted error message)
  if (typeof record.selectedQuestionIndex !== 'number' || record.selectedQuestionIndex < 0) {
    throw new SerializationError(
      'Invalid selectedQuestionIndex: expected non-negative number'
    );
  }

  // Validate displayQuestionIndex (with targeted error message)
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

  // Validate currentRound (with targeted error message)
  if (typeof record.currentRound !== 'number' || record.currentRound < 0) {
    throw new SerializationError('Invalid currentRound: expected non-negative number');
  }

  // Validate totalRounds (with targeted error message)
  if (typeof record.totalRounds !== 'number' || record.totalRounds < 1) {
    throw new SerializationError('Invalid totalRounds: expected positive number');
  }

  // Validate teams (with targeted error message)
  const teamsResult = z.array(TeamSchema).safeParse(record.teams);
  if (!teamsResult.success) {
    throw new SerializationError('Invalid teams: expected array of Team objects');
  }

  // Validate teamAnswers (with targeted error message)
  const teamAnswersResult = z.array(TeamAnswerSchema).safeParse(record.teamAnswers);
  if (!teamAnswersResult.success) {
    throw new SerializationError('Invalid teamAnswers: expected array of TeamAnswer objects');
  }

  // Validate timer (with targeted error message)
  const timerResult = TimerSchema.safeParse(record.timer);
  if (!timerResult.success) {
    throw new SerializationError('Invalid timer: expected Timer object');
  }

  // Validate settings (with targeted error message)
  const settingsResult = GameSettingsSchema.safeParse(record.settings);
  if (!settingsResult.success) {
    throw new SerializationError('Invalid settings: expected GameSettings object');
  }

  // Optional boolean fields with defaults
  const showScoreboard =
    typeof record.showScoreboard === 'boolean' ? record.showScoreboard : false;
  const emergencyBlank =
    typeof record.emergencyBlank === 'boolean' ? record.emergencyBlank : false;
  const ttsEnabled =
    typeof record.ttsEnabled === 'boolean' ? record.ttsEnabled : false;

  return {
    sessionId: record.sessionId as string,
    status: record.status as GameStatus,
    questions: questionsResult.data as Question[],
    selectedQuestionIndex: record.selectedQuestionIndex as number,
    displayQuestionIndex: (displayQuestionIndex ?? null) as number | null,
    currentRound: record.currentRound as number,
    totalRounds: record.totalRounds as number,
    teams: teamsResult.data as Team[],
    teamAnswers: teamAnswersResult.data as TeamAnswer[],
    timer: timerResult.data as Timer,
    settings: settingsResult.data as GameSettings,
    showScoreboard,
    emergencyBlank,
    ttsEnabled,
  };
}
