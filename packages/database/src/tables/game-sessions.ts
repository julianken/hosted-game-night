/**
 * Game session tracking utilities
 *
 * @deprecated This in-memory session module will be removed in v0.2.0.
 *
 * ## Migration Path
 *
 * Please migrate to the new persistent sessions system:
 * - **Database operations**: Use `persistent-sessions.ts` for database-backed sessions
 * - **Client-side state**: Use `@joolie-boolie/sync/session-storage` for BroadcastChannel sync
 *
 * ## Why Deprecated?
 *
 * This module was designed for in-memory, non-persistent sessions that don't survive
 * browser refreshes. The new persistent-sessions module provides:
 * - URL-based room codes (e.g., SWAN-42) for easy sharing
 * - Database persistence with automatic sync
 * - PIN protection for presenter controls
 * - HMAC-signed tokens for security
 * - Rejoinable sessions after disconnect/refresh
 *
 * ## Backwards Compatibility
 *
 * This file remains for one release cycle (until v0.2.0) to allow gradual migration.
 * No new features will be added to this module.
 *
 * @see packages/database/src/tables/persistent-sessions.ts
 * @see packages/sync/src/session-storage.ts
 * @see docs/features/persistent-sessions-refined.md
 */

import type { TypedSupabaseClient } from '../client';
import { withErrorHandling } from '../errors';

// =============================================================================
// Types
// =============================================================================

export type GameType = 'bingo' | 'trivia';

export type SessionStatus = 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface GameSession {
  id: string;
  game_type: GameType;
  template_id: string | null;
  user_id: string;
  status: SessionStatus;
  started_at: string | null;
  ended_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GameSessionInsert {
  game_type: GameType;
  template_id?: string | null;
  user_id: string;
  status?: SessionStatus;
  metadata?: Record<string, unknown>;
}

export interface GameSessionUpdate {
  status?: SessionStatus;
  started_at?: string | null;
  ended_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface BingoSessionMetadata {
  pattern_id: string;
  called_balls: number[];
  winner_info?: {
    name?: string;
    card_id?: string;
    won_at: string;
  };
  total_balls_called: number;
}

export interface TriviaSessionMetadata {
  current_round: number;
  current_question: number;
  team_scores: Record<string, number>;
  total_rounds: number;
  questions_per_round: number;
}

// =============================================================================
// Session ID Generation
// =============================================================================

/**
 * Generates a unique session ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `session_${timestamp}_${randomPart}`;
}

// =============================================================================
// In-Memory Session Store (for local/offline use)
// =============================================================================

const sessionStore = new Map<string, GameSession>();

/**
 * Creates a new game session in memory
 */
export function createLocalSession(data: GameSessionInsert): GameSession {
  const now = new Date().toISOString();
  const session: GameSession = {
    id: generateSessionId(),
    game_type: data.game_type,
    template_id: data.template_id ?? null,
    user_id: data.user_id,
    status: data.status ?? 'pending',
    started_at: null,
    ended_at: null,
    metadata: data.metadata ?? {},
    created_at: now,
    updated_at: now,
  };

  sessionStore.set(session.id, session);
  return session;
}

/**
 * Gets a session from memory
 */
export function getLocalSession(id: string): GameSession | null {
  return sessionStore.get(id) ?? null;
}

/**
 * Updates a session in memory
 */
export function updateLocalSession(id: string, data: GameSessionUpdate): GameSession | null {
  const session = sessionStore.get(id);
  if (!session) return null;

  const updated: GameSession = {
    ...session,
    ...data,
    updated_at: new Date().toISOString(),
  };

  sessionStore.set(id, updated);
  return updated;
}

/**
 * Deletes a session from memory
 */
export function deleteLocalSession(id: string): boolean {
  return sessionStore.delete(id);
}

/**
 * Gets all sessions for a user from memory
 */
export function getLocalSessionsByUser(userId: string): GameSession[] {
  return Array.from(sessionStore.values()).filter((s) => s.user_id === userId);
}

/**
 * Gets active sessions for a user from memory
 */
export function getActiveLocalSessions(userId: string): GameSession[] {
  return getLocalSessionsByUser(userId).filter(
    (s) => s.status === 'active' || s.status === 'paused'
  );
}

/**
 * Clears all sessions from memory (useful for testing)
 */
export function clearLocalSessions(): void {
  sessionStore.clear();
}

// =============================================================================
// Session State Transitions
// =============================================================================

/**
 * Starts a session
 */
export function startSession(session: GameSession): GameSession {
  return {
    ...session,
    status: 'active',
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Pauses a session
 */
export function pauseSession(session: GameSession): GameSession {
  return {
    ...session,
    status: 'paused',
    updated_at: new Date().toISOString(),
  };
}

/**
 * Resumes a paused session
 */
export function resumeSession(session: GameSession): GameSession {
  return {
    ...session,
    status: 'active',
    updated_at: new Date().toISOString(),
  };
}

/**
 * Completes a session
 */
export function completeSession(session: GameSession): GameSession {
  return {
    ...session,
    status: 'completed',
    ended_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Cancels a session
 */
export function cancelSession(session: GameSession): GameSession {
  return {
    ...session,
    status: 'cancelled',
    ended_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// =============================================================================
// Session Metadata Helpers
// =============================================================================

/**
 * Updates session metadata
 */
export function updateSessionMetadata<T extends Record<string, unknown>>(
  session: GameSession,
  updates: Partial<T>
): GameSession {
  return {
    ...session,
    metadata: {
      ...session.metadata,
      ...updates,
    },
    updated_at: new Date().toISOString(),
  };
}

/**
 * Gets typed metadata from a bingo session
 */
export function getBingoMetadata(session: GameSession): BingoSessionMetadata | null {
  if (session.game_type !== 'bingo') return null;
  return session.metadata as unknown as BingoSessionMetadata;
}

/**
 * Gets typed metadata from a trivia session
 */
export function getTriviaMetadata(session: GameSession): TriviaSessionMetadata | null {
  if (session.game_type !== 'trivia') return null;
  return session.metadata as unknown as TriviaSessionMetadata;
}

// =============================================================================
// Session Duration Helpers
// =============================================================================

/**
 * Calculates session duration in milliseconds
 */
export function getSessionDuration(session: GameSession): number | null {
  if (!session.started_at) return null;
  const start = new Date(session.started_at).getTime();
  const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
  return end - start;
}

/**
 * Formats session duration as human-readable string
 */
export function formatSessionDuration(session: GameSession): string | null {
  const duration = getSessionDuration(session);
  if (duration === null) return null;

  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// =============================================================================
// Database Operations (for future sessions table)
// =============================================================================

/**
 * Logs a completed session to the database
 * This can be used for analytics and history tracking
 */
export async function logSession(
  client: TypedSupabaseClient,
  session: GameSession
): Promise<void> {
  // This is a placeholder for future database logging
  // When a game_sessions table is added, this would insert the session data
  return withErrorHandling(async () => {
    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Session Log]', {
        id: session.id,
        game_type: session.game_type,
        status: session.status,
        duration: formatSessionDuration(session),
      });
    }

    // Future implementation:
    // await client.from('game_sessions').insert(session);
  });
}

/**
 * Gets session history from the database
 */
export async function getSessionHistory(
  _client: TypedSupabaseClient,
  _userId: string,
  _options: { gameType?: GameType; limit?: number } = {}
): Promise<GameSession[]> {
  // Placeholder for future database implementation
  // For now, return from local store
  return withErrorHandling(async () => {
    // Future implementation:
    // let query = client.from('game_sessions')
    //   .select('*')
    //   .eq('user_id', userId)
    //   .eq('status', 'completed')
    //   .order('ended_at', { ascending: false });
    //
    // if (options.gameType) {
    //   query = query.eq('game_type', options.gameType);
    // }
    // if (options.limit) {
    //   query = query.limit(options.limit);
    // }
    //
    // const { data, error } = await query;
    // if (error) throw error;
    // return data ?? [];

    return [];
  });
}
