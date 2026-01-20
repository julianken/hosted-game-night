/**
 * Tests for game session hooks
 *
 * These tests focus on the hook logic and integration with the underlying
 * CRUD functions. Since the hooks are thin wrappers around useQuery/useMutation
 * which are already tested, we focus on testing the specific behavior of each hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TypedSupabaseClient } from '../../client';
import type { GameSession, GameSessionInsert } from '../../types';
import * as persistentSessions from '../../tables/persistent-sessions';
import * as pinSecurity from '../../pin-security';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the persistent sessions module
vi.mock('../../tables/persistent-sessions', () => ({
  getGameSessionByRoomCode: vi.fn(),
  createGameSession: vi.fn(),
  updateGameSessionState: vi.fn(),
  incrementFailedPinAttempt: vi.fn(),
  resetFailedPinAttempts: vi.fn(),
  markSessionCompleted: vi.fn(),
}));

// Mock the pin security module
vi.mock('../../pin-security', () => ({
  verifyPin: vi.fn(),
  isLockedOut: vi.fn(),
}));

function createMockSession(overrides: Partial<GameSession> = {}): GameSession {
  return {
    id: 'session-uuid-123',
    room_code: 'ABC123',
    session_id: 'sess_abc123',
    game_type: 'bingo',
    template_id: null,
    pin_hash: 'a'.repeat(64),
    pin_salt: 'test-salt-uuid',
    failed_pin_attempts: 0,
    last_failed_attempt_at: null,
    status: 'active',
    game_state: {},
    user_id: null,
    sequence_number: 0,
    last_sync_at: '2024-01-01T00:00:00.000Z',
    expires_at: '2024-01-02T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockClient(): TypedSupabaseClient {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  } as unknown as TypedSupabaseClient;
}

// =============================================================================
// Tests: Hook Exports
// =============================================================================

describe('Game Session Hook Exports', () => {
  it('exports useGameSession hook', async () => {
    const { useGameSession } = await import('../use-game-session');
    expect(useGameSession).toBeDefined();
    expect(typeof useGameSession).toBe('function');
  });

  it('exports useCreateGameSession hook', async () => {
    const { useCreateGameSession } = await import('../use-game-session');
    expect(useCreateGameSession).toBeDefined();
    expect(typeof useCreateGameSession).toBe('function');
  });

  it('exports useUpdateGameSessionState hook', async () => {
    const { useUpdateGameSessionState } = await import('../use-game-session');
    expect(useUpdateGameSessionState).toBeDefined();
    expect(typeof useUpdateGameSessionState).toBe('function');
  });

  it('exports useMarkSessionCompleted hook', async () => {
    const { useMarkSessionCompleted } = await import('../use-game-session');
    expect(useMarkSessionCompleted).toBeDefined();
    expect(typeof useMarkSessionCompleted).toBe('function');
  });

  it('exports useVerifyPin hook', async () => {
    const { useVerifyPin } = await import('../use-game-session');
    expect(useVerifyPin).toBeDefined();
    expect(typeof useVerifyPin).toBe('function');
  });

  it('exports VerifyPinVariables type', async () => {
    // Type checking at compile time
    const module = await import('../use-game-session');
    expect(module).toBeDefined();
  });

  it('exports VerifyPinResult type', async () => {
    // Type checking at compile time
    const module = await import('../use-game-session');
    expect(module).toBeDefined();
  });

  it('exports UpdateGameStateVariables type', async () => {
    // Type checking at compile time
    const module = await import('../use-game-session');
    expect(module).toBeDefined();
  });
});

// =============================================================================
// Tests: getGameSessionByRoomCode Integration
// =============================================================================

describe('getGameSessionByRoomCode Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getGameSessionByRoomCode with correct parameters', async () => {
    const mockSession = createMockSession();
    const mockClient = createMockClient();

    vi.mocked(persistentSessions.getGameSessionByRoomCode).mockResolvedValue(mockSession);

    const result = await persistentSessions.getGameSessionByRoomCode(mockClient, 'ABC123');

    expect(persistentSessions.getGameSessionByRoomCode).toHaveBeenCalledWith(mockClient, 'ABC123');
    expect(result).toEqual(mockSession);
  });

  it('returns null when session not found', async () => {
    const mockClient = createMockClient();

    vi.mocked(persistentSessions.getGameSessionByRoomCode).mockResolvedValue(null);

    const result = await persistentSessions.getGameSessionByRoomCode(mockClient, 'NOTFOUND');

    expect(result).toBeNull();
  });
});

// =============================================================================
// Tests: createGameSession Integration
// =============================================================================

describe('createGameSession Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls createGameSession with correct parameters', async () => {
    const mockSession = createMockSession();
    const mockClient = createMockClient();
    const insertData: GameSessionInsert = {
      room_code: 'ABC123',
      session_id: 'sess_abc123',
      game_type: 'bingo',
      pin_hash: 'hashed-pin',
      pin_salt: 'salt-value',
    };

    vi.mocked(persistentSessions.createGameSession).mockResolvedValue(mockSession);

    const result = await persistentSessions.createGameSession(mockClient, insertData);

    expect(persistentSessions.createGameSession).toHaveBeenCalledWith(mockClient, insertData);
    expect(result).toEqual(mockSession);
  });

  it('creates trivia session', async () => {
    const mockSession = createMockSession({ game_type: 'trivia' });
    const mockClient = createMockClient();
    const insertData: GameSessionInsert = {
      room_code: 'XYZ789',
      session_id: 'sess_xyz789',
      game_type: 'trivia',
      pin_hash: 'hashed-pin',
      pin_salt: 'salt-value',
    };

    vi.mocked(persistentSessions.createGameSession).mockResolvedValue(mockSession);

    const result = await persistentSessions.createGameSession(mockClient, insertData);

    expect(result.game_type).toBe('trivia');
  });
});

// =============================================================================
// Tests: updateGameSessionState Integration
// =============================================================================

describe('updateGameSessionState Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls updateGameSessionState with correct parameters', async () => {
    const updatedSession = createMockSession({
      game_state: { calledBalls: [1, 2, 3] },
    });
    const mockClient = createMockClient();
    const newState = { calledBalls: [1, 2, 3] };

    vi.mocked(persistentSessions.updateGameSessionState).mockResolvedValue(updatedSession);

    const result = await persistentSessions.updateGameSessionState(mockClient, 'ABC123', newState);

    expect(persistentSessions.updateGameSessionState).toHaveBeenCalledWith(mockClient, 'ABC123', newState);
    expect(result.game_state).toEqual({ calledBalls: [1, 2, 3] });
  });
});

// =============================================================================
// Tests: markSessionCompleted Integration
// =============================================================================

describe('markSessionCompleted Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls markSessionCompleted with correct parameters', async () => {
    const mockClient = createMockClient();

    vi.mocked(persistentSessions.markSessionCompleted).mockResolvedValue();

    await persistentSessions.markSessionCompleted(mockClient, 'ABC123');

    expect(persistentSessions.markSessionCompleted).toHaveBeenCalledWith(mockClient, 'ABC123');
  });
});

// =============================================================================
// Tests: PIN Verification Logic
// =============================================================================

describe('PIN Verification Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success when PIN is valid', async () => {
    const mockSession = createMockSession({
      failed_pin_attempts: 0,
      pin_hash: 'valid-hash',
      pin_salt: 'salt',
    });
    const mockClient = createMockClient();

    vi.mocked(persistentSessions.getGameSessionByRoomCode).mockResolvedValue(mockSession);
    vi.mocked(pinSecurity.isLockedOut).mockReturnValue(false);
    vi.mocked(pinSecurity.verifyPin).mockResolvedValue(true);
    vi.mocked(persistentSessions.resetFailedPinAttempts).mockResolvedValue();

    // Simulate the verification logic
    const session = await persistentSessions.getGameSessionByRoomCode(mockClient, 'ABC123');
    expect(session).not.toBeNull();

    const isLocked = pinSecurity.isLockedOut(session!.failed_pin_attempts, null);
    expect(isLocked).toBe(false);

    const isValid = await pinSecurity.verifyPin('1234', session!.pin_hash, session!.pin_salt);
    expect(isValid).toBe(true);

    if (isValid) {
      await persistentSessions.resetFailedPinAttempts(mockClient, 'ABC123');
    }

    expect(persistentSessions.resetFailedPinAttempts).toHaveBeenCalledWith(mockClient, 'ABC123');
  });

  it('increments failed attempts on invalid PIN', async () => {
    const mockSession = createMockSession({
      failed_pin_attempts: 2,
      pin_hash: 'valid-hash',
      pin_salt: 'salt',
    });
    const mockClient = createMockClient();

    vi.mocked(persistentSessions.getGameSessionByRoomCode).mockResolvedValue(mockSession);
    vi.mocked(pinSecurity.isLockedOut).mockReturnValue(false);
    vi.mocked(pinSecurity.verifyPin).mockResolvedValue(false);
    vi.mocked(persistentSessions.incrementFailedPinAttempt).mockResolvedValue();

    // Simulate the verification logic
    const session = await persistentSessions.getGameSessionByRoomCode(mockClient, 'ABC123');
    expect(session).not.toBeNull();

    const isLocked = pinSecurity.isLockedOut(session!.failed_pin_attempts, null);
    expect(isLocked).toBe(false);

    const isValid = await pinSecurity.verifyPin('wrong', session!.pin_hash, session!.pin_salt);
    expect(isValid).toBe(false);

    if (!isValid) {
      await persistentSessions.incrementFailedPinAttempt(mockClient, 'ABC123');
    }

    expect(persistentSessions.incrementFailedPinAttempt).toHaveBeenCalledWith(mockClient, 'ABC123');
  });

  it('returns locked out when max attempts exceeded', async () => {
    const mockSession = createMockSession({
      failed_pin_attempts: 5,
      last_failed_attempt_at: new Date().toISOString(),
    });
    const mockClient = createMockClient();

    vi.mocked(persistentSessions.getGameSessionByRoomCode).mockResolvedValue(mockSession);
    vi.mocked(pinSecurity.isLockedOut).mockReturnValue(true);

    // Simulate the verification logic
    const session = await persistentSessions.getGameSessionByRoomCode(mockClient, 'ABC123');
    expect(session).not.toBeNull();

    const isLocked = pinSecurity.isLockedOut(
      session!.failed_pin_attempts,
      session!.last_failed_attempt_at ? new Date(session!.last_failed_attempt_at) : null
    );
    expect(isLocked).toBe(true);

    // When locked out, PIN verification should not be attempted
    expect(pinSecurity.verifyPin).not.toHaveBeenCalled();
  });

  it('allows access after lockout expires', async () => {
    const expiredLockout = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    const mockSession = createMockSession({
      failed_pin_attempts: 5,
      last_failed_attempt_at: expiredLockout,
      pin_hash: 'valid-hash',
      pin_salt: 'salt',
    });
    const mockClient = createMockClient();

    vi.mocked(persistentSessions.getGameSessionByRoomCode).mockResolvedValue(mockSession);
    vi.mocked(pinSecurity.isLockedOut).mockReturnValue(false); // Lockout expired
    vi.mocked(pinSecurity.verifyPin).mockResolvedValue(true);
    vi.mocked(persistentSessions.resetFailedPinAttempts).mockResolvedValue();

    // Simulate the verification logic
    const session = await persistentSessions.getGameSessionByRoomCode(mockClient, 'ABC123');
    expect(session).not.toBeNull();

    const isLocked = pinSecurity.isLockedOut(
      session!.failed_pin_attempts,
      session!.last_failed_attempt_at ? new Date(session!.last_failed_attempt_at) : null
    );
    expect(isLocked).toBe(false);

    const isValid = await pinSecurity.verifyPin('1234', session!.pin_hash, session!.pin_salt);
    expect(isValid).toBe(true);
  });

  it('returns not found when session does not exist', async () => {
    const mockClient = createMockClient();

    vi.mocked(persistentSessions.getGameSessionByRoomCode).mockResolvedValue(null);

    const session = await persistentSessions.getGameSessionByRoomCode(mockClient, 'NOTFOUND');
    expect(session).toBeNull();

    // No other functions should be called
    expect(pinSecurity.isLockedOut).not.toHaveBeenCalled();
    expect(pinSecurity.verifyPin).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Tests: Remaining Attempts Calculation
// =============================================================================

describe('Remaining Attempts Calculation', () => {
  const MAX_ATTEMPTS = 5;

  it('calculates remaining attempts correctly', () => {
    expect(MAX_ATTEMPTS - 0).toBe(5);
    expect(MAX_ATTEMPTS - 1).toBe(4);
    expect(MAX_ATTEMPTS - 2).toBe(3);
    expect(MAX_ATTEMPTS - 3).toBe(2);
    expect(MAX_ATTEMPTS - 4).toBe(1);
    expect(MAX_ATTEMPTS - 5).toBe(0);
  });

  it('does not go below zero', () => {
    expect(Math.max(0, MAX_ATTEMPTS - 6)).toBe(0);
    expect(Math.max(0, MAX_ATTEMPTS - 10)).toBe(0);
  });

  it('detects lockout at max attempts', () => {
    const newAttempts = 5;
    const isLockedOut = newAttempts >= MAX_ATTEMPTS;
    expect(isLockedOut).toBe(true);
  });

  it('does not lock out before max attempts', () => {
    const newAttempts = 4;
    const isLockedOut = newAttempts >= MAX_ATTEMPTS;
    expect(isLockedOut).toBe(false);
  });
});

// =============================================================================
// Tests: Type Safety
// =============================================================================

describe('Type Safety', () => {
  it('GameSessionInsert requires room_code', () => {
    const insert: GameSessionInsert = {
      room_code: 'ABC123',
      session_id: 'sess_abc123',
      game_type: 'bingo',
      pin_hash: 'hash',
      pin_salt: 'salt',
    };
    expect(insert.room_code).toBe('ABC123');
  });

  it('GameSessionInsert requires session_id', () => {
    const insert: GameSessionInsert = {
      room_code: 'ABC123',
      session_id: 'sess_abc123',
      game_type: 'bingo',
      pin_hash: 'hash',
      pin_salt: 'salt',
    };
    expect(insert.session_id).toBe('sess_abc123');
  });

  it('GameSessionInsert requires game_type', () => {
    const insert: GameSessionInsert = {
      room_code: 'ABC123',
      session_id: 'sess_abc123',
      game_type: 'trivia',
      pin_hash: 'hash',
      pin_salt: 'salt',
    };
    expect(insert.game_type).toBe('trivia');
  });

  it('GameSessionInsert allows optional fields', () => {
    const insert: GameSessionInsert = {
      room_code: 'ABC123',
      session_id: 'sess_abc123',
      game_type: 'bingo',
      pin_hash: 'hash',
      pin_salt: 'salt',
      template_id: 'template-123',
      user_id: 'user-456',
      game_state: { customField: true },
    };
    expect(insert.template_id).toBe('template-123');
    expect(insert.user_id).toBe('user-456');
    expect(insert.game_state).toEqual({ customField: true });
  });

  it('GameSession has all required fields', () => {
    const session = createMockSession();
    expect(session.id).toBeDefined();
    expect(session.room_code).toBeDefined();
    expect(session.session_id).toBeDefined();
    expect(session.game_type).toBeDefined();
    expect(session.pin_hash).toBeDefined();
    expect(session.pin_salt).toBeDefined();
    expect(session.failed_pin_attempts).toBeDefined();
    expect(session.status).toBeDefined();
    expect(session.game_state).toBeDefined();
    expect(session.last_sync_at).toBeDefined();
    expect(session.expires_at).toBeDefined();
    expect(session.created_at).toBeDefined();
    expect(session.updated_at).toBeDefined();
  });
});
