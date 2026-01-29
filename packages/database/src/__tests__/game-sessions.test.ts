import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSessionId,
  createLocalSession,
  getLocalSession,
  updateLocalSession,
  deleteLocalSession,
  getLocalSessionsByUser,
  getActiveLocalSessions,
  clearLocalSessions,
  startSession,
  pauseSession,
  resumeSession,
  completeSession,
  cancelSession,
  updateSessionMetadata,
  getBingoMetadata,
  getTriviaMetadata,
  getSessionDuration,
  formatSessionDuration,
  type GameSession,
} from '../tables/game-sessions';

describe('generateSessionId', () => {
  it('generates unique session IDs', () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();

    expect(id1).not.toBe(id2);
  });

  it('generates IDs with correct prefix', () => {
    const id = generateSessionId();

    expect(id.startsWith('session_')).toBe(true);
  });
});

describe('local session store', () => {
  beforeEach(() => {
    clearLocalSessions();
  });

  describe('createLocalSession', () => {
    it('creates a session with required fields', () => {
      const session = createLocalSession({
        game_type: 'bingo',
        user_id: 'user-123',
      });

      expect(session.id).toBeDefined();
      expect(session.game_type).toBe('bingo');
      expect(session.user_id).toBe('user-123');
      expect(session.status).toBe('pending');
      expect(session.started_at).toBeNull();
      expect(session.ended_at).toBeNull();
      expect(session.metadata).toEqual({});
    });

    it('creates a session with optional fields', () => {
      const session = createLocalSession({
        game_type: 'trivia',
        user_id: 'user-123',
        status: 'active',
        metadata: { custom: 'data' },
      });

      expect(session.status).toBe('active');
      expect(session.metadata).toEqual({ custom: 'data' });
    });
  });

  describe('getLocalSession', () => {
    it('retrieves a session by ID', () => {
      const created = createLocalSession({
        game_type: 'bingo',
        user_id: 'user-123',
      });

      const retrieved = getLocalSession(created.id);

      expect(retrieved).toEqual(created);
    });

    it('returns null for non-existent session', () => {
      const result = getLocalSession('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateLocalSession', () => {
    it('updates session fields', () => {
      const session = createLocalSession({
        game_type: 'bingo',
        user_id: 'user-123',
      });

      const updated = updateLocalSession(session.id, {
        status: 'active',
        started_at: new Date().toISOString(),
      });

      expect(updated?.status).toBe('active');
      expect(updated?.started_at).not.toBeNull();
    });

    it('returns null for non-existent session', () => {
      const result = updateLocalSession('non-existent', { status: 'active' });

      expect(result).toBeNull();
    });
  });

  describe('deleteLocalSession', () => {
    it('deletes a session', () => {
      const session = createLocalSession({
        game_type: 'bingo',
        user_id: 'user-123',
      });

      const deleted = deleteLocalSession(session.id);
      const retrieved = getLocalSession(session.id);

      expect(deleted).toBe(true);
      expect(retrieved).toBeNull();
    });

    it('returns false for non-existent session', () => {
      const result = deleteLocalSession('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getLocalSessionsByUser', () => {
    it('returns all sessions for a user', () => {
      createLocalSession({ game_type: 'bingo', user_id: 'user-1' });
      createLocalSession({ game_type: 'trivia', user_id: 'user-1' });
      createLocalSession({ game_type: 'bingo', user_id: 'user-2' });

      const sessions = getLocalSessionsByUser('user-1');

      expect(sessions).toHaveLength(2);
    });
  });

  describe('getActiveLocalSessions', () => {
    it('returns only active and paused sessions', () => {
      createLocalSession({ game_type: 'bingo', user_id: 'user-1', status: 'active' });
      createLocalSession({ game_type: 'bingo', user_id: 'user-1', status: 'paused' });
      createLocalSession({ game_type: 'bingo', user_id: 'user-1', status: 'completed' });
      createLocalSession({ game_type: 'bingo', user_id: 'user-1', status: 'pending' });

      const active = getActiveLocalSessions('user-1');

      expect(active).toHaveLength(2);
    });
  });
});

describe('session state transitions', () => {
  const createTestSession = (): GameSession => ({
    id: 'test-123',
    game_type: 'bingo',
    user_id: 'user-123',
    status: 'pending',
    started_at: null,
    ended_at: null,
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  });

  describe('startSession', () => {
    it('sets status to active and records start time', () => {
      const session = createTestSession();
      const started = startSession(session);

      expect(started.status).toBe('active');
      expect(started.started_at).not.toBeNull();
    });
  });

  describe('pauseSession', () => {
    it('sets status to paused', () => {
      const session = { ...createTestSession(), status: 'active' as const };
      const paused = pauseSession(session);

      expect(paused.status).toBe('paused');
    });
  });

  describe('resumeSession', () => {
    it('sets status back to active', () => {
      const session = { ...createTestSession(), status: 'paused' as const };
      const resumed = resumeSession(session);

      expect(resumed.status).toBe('active');
    });
  });

  describe('completeSession', () => {
    it('sets status to completed and records end time', () => {
      const session = { ...createTestSession(), status: 'active' as const };
      const completed = completeSession(session);

      expect(completed.status).toBe('completed');
      expect(completed.ended_at).not.toBeNull();
    });
  });

  describe('cancelSession', () => {
    it('sets status to cancelled and records end time', () => {
      const session = createTestSession();
      const cancelled = cancelSession(session);

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.ended_at).not.toBeNull();
    });
  });
});

describe('session metadata', () => {
  const createTestSession = (): GameSession => ({
    id: 'test-123',
    game_type: 'bingo',
    user_id: 'user-123',
    status: 'active',
    started_at: '2024-01-01T10:00:00Z',
    ended_at: null,
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  });

  describe('updateSessionMetadata', () => {
    it('merges metadata updates', () => {
      const session = {
        ...createTestSession(),
        metadata: { existing: 'data' },
      };
      const updated = updateSessionMetadata(session, { new: 'value' });

      expect(updated.metadata).toEqual({
        existing: 'data',
        new: 'value',
      });
    });
  });

  describe('getBingoMetadata', () => {
    it('returns metadata for bingo sessions', () => {
      const session = {
        ...createTestSession(),
        game_type: 'bingo' as const,
        metadata: { pattern_id: 'regular', called_balls: [1, 2, 3] },
      };

      const metadata = getBingoMetadata(session);

      expect(metadata?.pattern_id).toBe('regular');
      expect(metadata?.called_balls).toEqual([1, 2, 3]);
    });

    it('returns null for non-bingo sessions', () => {
      const session = {
        ...createTestSession(),
        game_type: 'trivia' as const,
      };

      expect(getBingoMetadata(session)).toBeNull();
    });
  });

  describe('getTriviaMetadata', () => {
    it('returns metadata for trivia sessions', () => {
      const session = {
        ...createTestSession(),
        game_type: 'trivia' as const,
        metadata: { current_round: 1, team_scores: { 'Team A': 10 } },
      };

      const metadata = getTriviaMetadata(session);

      expect(metadata?.current_round).toBe(1);
      expect(metadata?.team_scores).toEqual({ 'Team A': 10 });
    });

    it('returns null for non-trivia sessions', () => {
      const session = createTestSession();

      expect(getTriviaMetadata(session)).toBeNull();
    });
  });
});

describe('session duration', () => {
  describe('getSessionDuration', () => {
    it('returns null for unstarted sessions', () => {
      const session: GameSession = {
        id: 'test',
        game_type: 'bingo',
            user_id: 'user-123',
        status: 'pending',
        started_at: null,
        ended_at: null,
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(getSessionDuration(session)).toBeNull();
    });

    it('calculates duration for completed sessions', () => {
      const session: GameSession = {
        id: 'test',
        game_type: 'bingo',
            user_id: 'user-123',
        status: 'completed',
        started_at: '2024-01-01T10:00:00.000Z',
        ended_at: '2024-01-01T10:30:00.000Z',
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const duration = getSessionDuration(session);

      expect(duration).toBe(30 * 60 * 1000); // 30 minutes in ms
    });
  });

  describe('formatSessionDuration', () => {
    it('returns null for unstarted sessions', () => {
      const session: GameSession = {
        id: 'test',
        game_type: 'bingo',
            user_id: 'user-123',
        status: 'pending',
        started_at: null,
        ended_at: null,
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(formatSessionDuration(session)).toBeNull();
    });

    it('formats seconds only', () => {
      const session: GameSession = {
        id: 'test',
        game_type: 'bingo',
            user_id: 'user-123',
        status: 'completed',
        started_at: '2024-01-01T10:00:00.000Z',
        ended_at: '2024-01-01T10:00:45.000Z',
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(formatSessionDuration(session)).toBe('45s');
    });

    it('formats minutes and seconds', () => {
      const session: GameSession = {
        id: 'test',
        game_type: 'bingo',
            user_id: 'user-123',
        status: 'completed',
        started_at: '2024-01-01T10:00:00.000Z',
        ended_at: '2024-01-01T10:15:30.000Z',
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(formatSessionDuration(session)).toBe('15m 30s');
    });

    it('formats hours and minutes', () => {
      const session: GameSession = {
        id: 'test',
        game_type: 'bingo',
            user_id: 'user-123',
        status: 'completed',
        started_at: '2024-01-01T10:00:00.000Z',
        ended_at: '2024-01-01T12:30:00.000Z',
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(formatSessionDuration(session)).toBe('2h 30m');
    });
  });
});
