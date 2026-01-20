/**
 * Persistent game session CRUD operations
 *
 * These functions operate on the game_sessions table for persistent,
 * database-backed game sessions with room codes and PIN security.
 */

import type { TypedSupabaseClient } from '../client';
import type {
  GameSession,
  GameSessionInsert,
  GameSessionUpdate,
} from '../types';
import { NotFoundError, withErrorHandling } from '../errors';
import { getOne, create, update } from '../queries';

// =============================================================================
// Create Operations
// =============================================================================

/**
 * Creates a new persistent game session
 */
export async function createGameSession(
  client: TypedSupabaseClient,
  data: GameSessionInsert
): Promise<GameSession> {
  return withErrorHandling(async () => {
    return create(client, 'game_sessions', data);
  });
}

// =============================================================================
// Read Operations
// =============================================================================

/**
 * Gets a game session by room code
 */
export async function getGameSessionByRoomCode(
  client: TypedSupabaseClient,
  roomCode: string
): Promise<GameSession | null> {
  return getOne(client, 'game_sessions', {
    filters: [{ column: 'room_code', operator: 'eq', value: roomCode }],
  });
}

/**
 * Gets a game session by session ID
 */
export async function getGameSessionBySessionId(
  client: TypedSupabaseClient,
  sessionId: string
): Promise<GameSession | null> {
  return getOne(client, 'game_sessions', {
    filters: [{ column: 'session_id', operator: 'eq', value: sessionId }],
  });
}

// =============================================================================
// Update Operations
// =============================================================================

/**
 * Updates the game state for a session
 */
export async function updateGameSessionState(
  client: TypedSupabaseClient,
  roomCode: string,
  state: Record<string, unknown>
): Promise<GameSession> {
  const session = await getGameSessionByRoomCode(client, roomCode);
  if (!session) {
    throw new NotFoundError('GameSession', roomCode);
  }
  return update(client, 'game_sessions', session.id, {
    game_state: state,
    last_sync_at: new Date().toISOString(),
  });
}

/**
 * Increments the failed PIN attempt counter
 */
export async function incrementFailedPinAttempt(
  client: TypedSupabaseClient,
  roomCode: string
): Promise<void> {
  const session = await getGameSessionByRoomCode(client, roomCode);
  if (!session) {
    throw new NotFoundError('GameSession', roomCode);
  }

  await update(client, 'game_sessions', session.id, {
    failed_pin_attempts: session.failed_pin_attempts + 1,
    last_failed_attempt_at: new Date().toISOString(),
  });
}

/**
 * Resets the failed PIN attempts counter
 */
export async function resetFailedPinAttempts(
  client: TypedSupabaseClient,
  roomCode: string
): Promise<void> {
  const session = await getGameSessionByRoomCode(client, roomCode);
  if (!session) {
    throw new NotFoundError('GameSession', roomCode);
  }

  await update(client, 'game_sessions', session.id, {
    failed_pin_attempts: 0,
    last_failed_attempt_at: undefined,
  } as GameSessionUpdate);
}

/**
 * Marks a session as completed
 */
export async function markSessionCompleted(
  client: TypedSupabaseClient,
  roomCode: string
): Promise<void> {
  const session = await getGameSessionByRoomCode(client, roomCode);
  if (!session) {
    throw new NotFoundError('GameSession', roomCode);
  }

  await update(client, 'game_sessions', session.id, {
    status: 'completed',
  });
}

// =============================================================================
// Cleanup Operations
// =============================================================================

/**
 * Deletes expired sessions and returns the count of deleted sessions
 */
export async function cleanupExpiredSessions(
  client: TypedSupabaseClient
): Promise<number> {
  const { data, error } = await client
    .from('game_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select();

  if (error) throw error;
  return data?.length ?? 0;
}
