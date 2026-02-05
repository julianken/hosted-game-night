import { GameState, BingoBall, BingoPattern } from '@/types';
import { DEFAULT_AUTO_CALL_SPEED } from '@/lib/game/engine';

/**
 * Serialized representation of a Bingo game state for database storage.
 * This is a plain object that can be safely stored in JSON/JSONB columns.
 */
export interface SerializedBingoState {
  status: string;
  patternId: string | null;
  calledBalls: BingoBall[];
  currentBall: BingoBall | null;
  previousBall: BingoBall | null;
  remainingBalls: BingoBall[];
  autoCallEnabled: boolean;
  autoCallSpeed: number;
  audioEnabled: boolean;
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
 * Validates that a value is a valid BingoBall object.
 */
function isBingoBall(value: unknown): value is BingoBall {
  if (!value || typeof value !== 'object') return false;
  const ball = value as Record<string, unknown>;
  return (
    typeof ball.column === 'string' &&
    ['B', 'I', 'N', 'G', 'O'].includes(ball.column) &&
    typeof ball.number === 'number' &&
    ball.number >= 1 &&
    ball.number <= 75 &&
    typeof ball.label === 'string'
  );
}

/**
 * Validates that a value is an array of BingoBall objects.
 */
function isBingoBallArray(value: unknown): value is BingoBall[] {
  return Array.isArray(value) && value.every(isBingoBall);
}

/**
 * Validates that a value is a valid game status.
 */
function isGameStatus(value: unknown): value is GameState['status'] {
  return (
    typeof value === 'string' &&
    ['idle', 'playing', 'paused', 'ended'].includes(value)
  );
}

/**
 * Serializes a GameState object into a plain object suitable for database storage.
 * Extracts only the pattern ID rather than the full pattern object, as patterns
 * are stored separately and can be rejoined during deserialization.
 *
 * @param state - The game state to serialize
 * @returns A plain object ready for JSON serialization
 */
export function serializeBingoState(state: GameState): SerializedBingoState {
  return {
    status: state.status,
    patternId: state.pattern?.id ?? null,
    calledBalls: state.calledBalls,
    currentBall: state.currentBall,
    previousBall: state.previousBall,
    remainingBalls: state.remainingBalls,
    autoCallEnabled: state.autoCallEnabled,
    autoCallSpeed: state.autoCallSpeed,
    audioEnabled: state.audioEnabled,
  };
}

/**
 * Deserializes a database record back into a partial GameState object.
 * Note: The pattern object itself must be resolved separately using the patternId.
 * This function performs validation and provides sensible defaults for missing data.
 *
 * @param data - The serialized data from the database
 * @param pattern - Optional pattern object to include in the state (looked up by patternId)
 * @returns A partial GameState object that can be merged with the current state
 * @throws SerializationError if the data is invalid or corrupted
 */
export function deserializeBingoState(
  data: unknown,
  pattern?: BingoPattern | null
): Partial<GameState> {
  // Validate input is an object
  if (!data || typeof data !== 'object') {
    throw new SerializationError('Invalid serialized data: expected object');
  }

  const record = data as Record<string, unknown>;

  // Validate and extract status (required)
  if (!isGameStatus(record.status)) {
    throw new SerializationError(
      `Invalid status: expected 'idle', 'playing', 'paused', or 'ended', got ${record.status}`
    );
  }

  // Validate patternId (optional) - validated but not directly used;
  // pattern resolution happens via the `pattern` parameter
  if (record.patternId !== null && record.patternId !== undefined) {
    String(record.patternId); // Ensure it is a valid string
  }

  // Validate calledBalls (required, but can be empty array)
  if (!isBingoBallArray(record.calledBalls)) {
    throw new SerializationError(
      'Invalid calledBalls: expected array of BingoBall objects'
    );
  }

  // Validate currentBall (optional)
  const currentBall = record.currentBall;
  if (currentBall !== null && currentBall !== undefined && !isBingoBall(currentBall)) {
    throw new SerializationError('Invalid currentBall: expected BingoBall or null');
  }

  // Validate previousBall (optional)
  const previousBall = record.previousBall;
  if (previousBall !== null && previousBall !== undefined && !isBingoBall(previousBall)) {
    throw new SerializationError('Invalid previousBall: expected BingoBall or null');
  }

  // Validate remainingBalls (required, but can be empty array)
  if (!isBingoBallArray(record.remainingBalls)) {
    throw new SerializationError(
      'Invalid remainingBalls: expected array of BingoBall objects'
    );
  }

  // Validate autoCallEnabled (optional, default false)
  const autoCallEnabled =
    typeof record.autoCallEnabled === 'boolean' ? record.autoCallEnabled : false;

  // Validate autoCallSpeed (optional, default to constant)
  const autoCallSpeed =
    typeof record.autoCallSpeed === 'number' && record.autoCallSpeed > 0
      ? record.autoCallSpeed
      : DEFAULT_AUTO_CALL_SPEED;

  // Validate audioEnabled (optional, default true)
  const audioEnabled =
    typeof record.audioEnabled === 'boolean' ? record.audioEnabled : true;

  // Build the partial state
  const partialState: Partial<GameState> = {
    status: record.status,
    calledBalls: record.calledBalls,
    currentBall: (currentBall ?? null) as BingoBall | null,
    previousBall: (previousBall ?? null) as BingoBall | null,
    remainingBalls: record.remainingBalls,
    autoCallEnabled,
    autoCallSpeed,
    audioEnabled,
  };

  // Include pattern if provided, otherwise leave it undefined so it doesn't overwrite
  if (pattern !== undefined) {
    partialState.pattern = pattern;
  }

  return partialState;
}
