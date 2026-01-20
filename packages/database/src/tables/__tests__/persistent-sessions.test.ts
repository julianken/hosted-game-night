import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createGameSession,
  getGameSessionByRoomCode,
  getGameSessionBySessionId,
  updateGameSessionState,
  incrementFailedPinAttempt,
  resetFailedPinAttempts,
  markSessionCompleted,
  cleanupExpiredSessions,
} from '../persistent-sessions';
import { NotFoundError } from '../../errors';
import type { TypedSupabaseClient } from '../../client';
import type { GameSession, GameSessionInsert } from '../../types';

// =============================================================================
// Mock Setup
// =============================================================================

function createMockSession(overrides: Partial<GameSession> = {}): GameSession {
  return {
    id: 'session-uuid-123',
    room_code: 'ABC123',
    session_id: 'sess_abc123',
    game_type: 'bingo',
    template_id: null,
    pin_hash: 'hashed-pin',
    pin_salt: 'salt-value',
    failed_pin_attempts: 0,
    last_failed_attempt_at: null,
    status: 'active',
    game_state: {},
    user_id: null,
    last_sync_at: '2024-01-01T00:00:00.000Z',
    sequence_number: 0,
    expires_at: '2024-01-02T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockClient(options: {
  selectResult?: GameSession | GameSession[] | null;
  insertResult?: GameSession;
  updateResult?: GameSession;
  deleteResult?: GameSession[];
  error?: { code?: string; message?: string };
}): TypedSupabaseClient {
  const {
    selectResult,
    insertResult,
    updateResult,
    deleteResult,
    error,
  } = options;

  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: insertResult || updateResult || selectResult,
      error,
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: Array.isArray(selectResult) ? selectResult[0] : selectResult,
      error,
    }),
    // For delete with select, return a resolved promise with data
    then: vi.fn((resolve) => {
      resolve({
        data: deleteResult ?? [],
        error,
      });
    }),
  };

  // Make delete().lt().select() return the mock with data
  mockQueryBuilder.delete = vi.fn().mockReturnValue({
    lt: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: deleteResult ?? [],
        error,
      }),
    }),
  });

  return {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
  } as unknown as TypedSupabaseClient;
}

// =============================================================================
// Tests
// =============================================================================

describe('Persistent Sessions CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGameSession', () => {
    it('creates a session with valid data', async () => {
      const mockSession = createMockSession();
      const mockClient = createMockClient({ insertResult: mockSession });

      const insertData: GameSessionInsert = {
        room_code: 'ABC123',
        session_id: 'sess_abc123',
        game_type: 'bingo',
        pin_hash: 'hashed-pin',
        pin_salt: 'salt-value',
      };

      const result = await createGameSession(mockClient, insertData);

      expect(result).toEqual(mockSession);
      expect(mockClient.from).toHaveBeenCalledWith('game_sessions');
    });

    it('creates a trivia session', async () => {
      const mockSession = createMockSession({ game_type: 'trivia' });
      const mockClient = createMockClient({ insertResult: mockSession });

      const insertData: GameSessionInsert = {
        room_code: 'XYZ789',
        session_id: 'sess_xyz789',
        game_type: 'trivia',
        pin_hash: 'hashed-pin',
        pin_salt: 'salt-value',
      };

      const result = await createGameSession(mockClient, insertData);

      expect(result.game_type).toBe('trivia');
    });

    it('creates a session with optional fields', async () => {
      const mockSession = createMockSession({
        template_id: 'template-123',
        user_id: 'user-456',
        game_state: { currentBall: 42 },
      });
      const mockClient = createMockClient({ insertResult: mockSession });

      const insertData: GameSessionInsert = {
        room_code: 'ABC123',
        session_id: 'sess_abc123',
        game_type: 'bingo',
        pin_hash: 'hashed-pin',
        pin_salt: 'salt-value',
        template_id: 'template-123',
        user_id: 'user-456',
        game_state: { currentBall: 42 },
      };

      const result = await createGameSession(mockClient, insertData);

      expect(result.template_id).toBe('template-123');
      expect(result.user_id).toBe('user-456');
      expect(result.game_state).toEqual({ currentBall: 42 });
    });
  });

  describe('getGameSessionByRoomCode', () => {
    it('returns session when found', async () => {
      const mockSession = createMockSession({ room_code: 'FIND123' });
      const mockClient = createMockClient({ selectResult: mockSession });

      const result = await getGameSessionByRoomCode(mockClient, 'FIND123');

      expect(result).toEqual(mockSession);
      expect(mockClient.from).toHaveBeenCalledWith('game_sessions');
    });

    it('returns null when session not found', async () => {
      const mockClient = createMockClient({ selectResult: null });

      const result = await getGameSessionByRoomCode(mockClient, 'NOTFOUND');

      expect(result).toBeNull();
    });
  });

  describe('getGameSessionBySessionId', () => {
    it('returns session when found', async () => {
      const mockSession = createMockSession({ session_id: 'sess_find123' });
      const mockClient = createMockClient({ selectResult: mockSession });

      const result = await getGameSessionBySessionId(mockClient, 'sess_find123');

      expect(result).toEqual(mockSession);
      expect(mockClient.from).toHaveBeenCalledWith('game_sessions');
    });

    it('returns null when session not found', async () => {
      const mockClient = createMockClient({ selectResult: null });

      const result = await getGameSessionBySessionId(mockClient, 'sess_notfound');

      expect(result).toBeNull();
    });
  });

  describe('updateGameSessionState', () => {
    it('updates state and last_sync_at', async () => {
      const existingSession = createMockSession();
      const updatedSession = createMockSession({
        game_state: { calledBalls: [1, 2, 3] },
        last_sync_at: '2024-01-01T12:00:00.000Z',
      });

      // Create a more complex mock that handles the lookup then update
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: existingSession,
          error: null,
        }),
        single: vi.fn().mockResolvedValue({
          data: updatedSession,
          error: null,
        }),
      };

      const mockClient = {
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      } as unknown as TypedSupabaseClient;

      const newState = { calledBalls: [1, 2, 3] };
      const result = await updateGameSessionState(mockClient, 'ABC123', newState);

      expect(result.game_state).toEqual({ calledBalls: [1, 2, 3] });
    });

    it('throws NotFoundError when session does not exist', async () => {
      const mockClient = createMockClient({ selectResult: null });

      await expect(
        updateGameSessionState(mockClient, 'NOTFOUND', { test: 'state' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('incrementFailedPinAttempt', () => {
    it('increments the counter and sets last_failed_attempt_at', async () => {
      const existingSession = createMockSession({ failed_pin_attempts: 2 });
      const updatedSession = createMockSession({
        failed_pin_attempts: 3,
        last_failed_attempt_at: '2024-01-01T12:00:00.000Z',
      });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: existingSession,
          error: null,
        }),
        single: vi.fn().mockResolvedValue({
          data: updatedSession,
          error: null,
        }),
      };

      const mockClient = {
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      } as unknown as TypedSupabaseClient;

      await incrementFailedPinAttempt(mockClient, 'ABC123');

      // Verify update was called
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it('throws NotFoundError when session does not exist', async () => {
      const mockClient = createMockClient({ selectResult: null });

      await expect(
        incrementFailedPinAttempt(mockClient, 'NOTFOUND')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('resetFailedPinAttempts', () => {
    it('resets counter to 0 and clears last_failed_attempt_at', async () => {
      const existingSession = createMockSession({
        failed_pin_attempts: 5,
        last_failed_attempt_at: '2024-01-01T10:00:00.000Z',
      });
      const updatedSession = createMockSession({
        failed_pin_attempts: 0,
        last_failed_attempt_at: null,
      });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: existingSession,
          error: null,
        }),
        single: vi.fn().mockResolvedValue({
          data: updatedSession,
          error: null,
        }),
      };

      const mockClient = {
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      } as unknown as TypedSupabaseClient;

      await resetFailedPinAttempts(mockClient, 'ABC123');

      // Verify update was called
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it('throws NotFoundError when session does not exist', async () => {
      const mockClient = createMockClient({ selectResult: null });

      await expect(
        resetFailedPinAttempts(mockClient, 'NOTFOUND')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('markSessionCompleted', () => {
    it('updates status to completed', async () => {
      const existingSession = createMockSession({ status: 'active' });
      const updatedSession = createMockSession({ status: 'completed' });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: existingSession,
          error: null,
        }),
        single: vi.fn().mockResolvedValue({
          data: updatedSession,
          error: null,
        }),
      };

      const mockClient = {
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      } as unknown as TypedSupabaseClient;

      await markSessionCompleted(mockClient, 'ABC123');

      // Verify update was called
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it('throws NotFoundError when session does not exist', async () => {
      const mockClient = createMockClient({ selectResult: null });

      await expect(
        markSessionCompleted(mockClient, 'NOTFOUND')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('deletes expired sessions and returns count', async () => {
      const expiredSessions = [
        createMockSession({ id: '1' }),
        createMockSession({ id: '2' }),
        createMockSession({ id: '3' }),
      ];
      const mockClient = createMockClient({ deleteResult: expiredSessions });

      const result = await cleanupExpiredSessions(mockClient);

      expect(result).toBe(3);
    });

    it('returns 0 when no sessions are expired', async () => {
      const mockClient = createMockClient({ deleteResult: [] });

      const result = await cleanupExpiredSessions(mockClient);

      expect(result).toBe(0);
    });

    it('throws error when delete fails', async () => {
      const mockDeleteBuilder = {
        lt: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'ERROR', message: 'Delete failed' },
          }),
        }),
      };

      const mockClient = {
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue(mockDeleteBuilder),
        }),
      } as unknown as TypedSupabaseClient;

      await expect(cleanupExpiredSessions(mockClient)).rejects.toThrow();
    });
  });

  describe('NotFoundError handling', () => {
    it('includes room code in error message for updateGameSessionState', async () => {
      const mockClient = createMockClient({ selectResult: null });

      try {
        await updateGameSessionState(mockClient, 'MISSING_CODE', {});
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).message).toContain('MISSING_CODE');
      }
    });

    it('includes room code in error message for incrementFailedPinAttempt', async () => {
      const mockClient = createMockClient({ selectResult: null });

      try {
        await incrementFailedPinAttempt(mockClient, 'MISSING_CODE');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).message).toContain('MISSING_CODE');
      }
    });

    it('includes room code in error message for resetFailedPinAttempts', async () => {
      const mockClient = createMockClient({ selectResult: null });

      try {
        await resetFailedPinAttempts(mockClient, 'MISSING_CODE');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).message).toContain('MISSING_CODE');
      }
    });

    it('includes room code in error message for markSessionCompleted', async () => {
      const mockClient = createMockClient({ selectResult: null });

      try {
        await markSessionCompleted(mockClient, 'MISSING_CODE');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).message).toContain('MISSING_CODE');
      }
    });
  });
});
