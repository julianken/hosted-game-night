import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { GET as GET_BY_ID, PATCH, DELETE } from '../[id]/route';
import { sessionHistoryStorage } from '@/lib/api/storage';
import type { TriviaSessionHistory, CreateSessionHistoryRequest } from '@/types';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-123'),
});

// Helper to create a valid session history request
function createValidSessionRequest(overrides?: Partial<CreateSessionHistoryRequest>): CreateSessionHistoryRequest {
  return {
    startedAt: '2024-01-15T10:00:00.000Z',
    endedAt: '2024-01-15T11:00:00.000Z',
    roundsPlayed: 3,
    totalRounds: 3,
    questionsAnswered: 15,
    totalQuestions: 15,
    teamScores: [
      {
        teamId: 'team-1',
        teamName: 'Table 1',
        totalScore: 100,
        roundScores: [30, 40, 30],
      },
      {
        teamId: 'team-2',
        teamName: 'Table 2',
        totalScore: 85,
        roundScores: [25, 35, 25],
      },
    ],
    winnerTeamId: 'team-1',
    winnerTeamName: 'Table 1',
    userId: 'user-123',
    questionSetId: 'qset-1',
    questionSetName: 'General Trivia',
    questionSummaries: [
      {
        questionId: 'q1',
        questionText: 'What is 2+2?',
        correctAnswers: ['4'],
        teamsCorrect: 2,
        teamsIncorrect: 0,
      },
    ],
    ...overrides,
  };
}

// Helper to create a mock NextRequest
function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3001'), options);
}

describe('Sessions API Routes', () => {
  beforeEach(() => {
    // Clear storage before each test
    sessionHistoryStorage.clear();
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET /api/sessions - List sessions
  // ============================================================================
  describe('GET /api/sessions', () => {
    it('should return empty list when no sessions exist', async () => {
      const request = createRequest('http://localhost:3001/api/sessions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.error).toBeNull();
    });

    it('should return all sessions', async () => {
      // Create some sessions
      const session1: TriviaSessionHistory = {
        id: 'session-1',
        startedAt: '2024-01-15T10:00:00.000Z',
        endedAt: '2024-01-15T11:00:00.000Z',
        roundsPlayed: 3,
        totalRounds: 3,
        questionsAnswered: 15,
        totalQuestions: 15,
        teamScores: [],
        winnerTeamId: null,
        winnerTeamName: null,
        userId: null,
        questionSetId: null,
        questionSetName: null,
        questionSummaries: [],
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T11:00:00.000Z',
      };
      sessionHistoryStorage.create(session1);

      const request = createRequest('http://localhost:3001/api/sessions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.total).toBe(1);
      expect(data.data[0].id).toBe('session-1');
    });

    it('should support pagination', async () => {
      // Create 15 sessions
      for (let i = 0; i < 15; i++) {
        sessionHistoryStorage.create({
          id: `session-${i}`,
          startedAt: new Date(Date.now() - i * 1000).toISOString(),
          endedAt: null,
          roundsPlayed: 3,
          totalRounds: 3,
          questionsAnswered: 15,
          totalQuestions: 15,
          teamScores: [],
          winnerTeamId: null,
          winnerTeamName: null,
          userId: null,
          questionSetId: null,
          questionSetName: null,
          questionSummaries: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      const request = createRequest('http://localhost:3001/api/sessions?page=2&pageSize=5');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(5);
      expect(data.total).toBe(15);
      expect(data.page).toBe(2);
      expect(data.pageSize).toBe(5);
    });

    it('should filter by userId', async () => {
      sessionHistoryStorage.create({
        id: 'session-user1',
        startedAt: '2024-01-15T10:00:00.000Z',
        endedAt: null,
        roundsPlayed: 3,
        totalRounds: 3,
        questionsAnswered: 15,
        totalQuestions: 15,
        teamScores: [],
        winnerTeamId: null,
        winnerTeamName: null,
        userId: 'user-1',
        questionSetId: null,
        questionSetName: null,
        questionSummaries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      sessionHistoryStorage.create({
        id: 'session-user2',
        startedAt: '2024-01-15T11:00:00.000Z',
        endedAt: null,
        roundsPlayed: 3,
        totalRounds: 3,
        questionsAnswered: 15,
        totalQuestions: 15,
        teamScores: [],
        winnerTeamId: null,
        winnerTeamName: null,
        userId: 'user-2',
        questionSetId: null,
        questionSetName: null,
        questionSummaries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const request = createRequest('http://localhost:3001/api/sessions?userId=user-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].userId).toBe('user-1');
    });
  });

  // ============================================================================
  // POST /api/sessions - Create session
  // ============================================================================
  describe('POST /api/sessions', () => {
    it('should create a new session with valid data', async () => {
      const sessionData = createValidSessionRequest();
      const request = createRequest('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.error).toBeNull();
      expect(data.data).not.toBeNull();
      expect(data.data.id).toBe('test-uuid-123');
      expect(data.data.roundsPlayed).toBe(3);
      expect(data.data.teamScores).toHaveLength(2);
      expect(data.data.winnerTeamName).toBe('Table 1');
    });

    it('should reject missing startedAt', async () => {
      const sessionData = createValidSessionRequest();
      delete (sessionData as any).startedAt;

      const request = createRequest('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('startedAt');
    });

    it('should reject invalid startedAt date', async () => {
      const sessionData = createValidSessionRequest({ startedAt: 'not-a-date' });

      const request = createRequest('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('startedAt');
    });

    it('should reject negative roundsPlayed', async () => {
      const sessionData = createValidSessionRequest({ roundsPlayed: -1 });

      const request = createRequest('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('roundsPlayed');
    });

    it('should reject totalRounds less than 1', async () => {
      const sessionData = createValidSessionRequest({ totalRounds: 0 });

      const request = createRequest('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('totalRounds');
    });

    it('should reject invalid teamScores', async () => {
      const sessionData = createValidSessionRequest();
      (sessionData.teamScores as any) = 'not-an-array';

      const request = createRequest('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('teamScores');
    });

    it('should reject team score without teamId', async () => {
      const sessionData = createValidSessionRequest();
      sessionData.teamScores[0].teamId = '';

      const request = createRequest('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('teamId');
    });

    it('should create session with minimal data', async () => {
      const minimalData: CreateSessionHistoryRequest = {
        startedAt: '2024-01-15T10:00:00.000Z',
        roundsPlayed: 1,
        totalRounds: 3,
        questionsAnswered: 5,
        totalQuestions: 15,
        teamScores: [
          {
            teamId: 'team-1',
            teamName: 'Table 1',
            totalScore: 50,
            roundScores: [50],
          },
        ],
      };

      const request = createRequest('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(minimalData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.endedAt).toBeNull();
      expect(data.data.winnerTeamId).toBeNull();
      expect(data.data.userId).toBeNull();
      expect(data.data.questionSummaries).toEqual([]);
    });
  });

  // ============================================================================
  // GET /api/sessions/[id] - Get single session
  // ============================================================================
  describe('GET /api/sessions/[id]', () => {
    it('should return session by ID', async () => {
      const session: TriviaSessionHistory = {
        id: 'session-123',
        startedAt: '2024-01-15T10:00:00.000Z',
        endedAt: '2024-01-15T11:00:00.000Z',
        roundsPlayed: 3,
        totalRounds: 3,
        questionsAnswered: 15,
        totalQuestions: 15,
        teamScores: [],
        winnerTeamId: 'team-1',
        winnerTeamName: 'Winners',
        userId: 'user-1',
        questionSetId: null,
        questionSetName: null,
        questionSummaries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessionHistoryStorage.create(session);

      const request = createRequest('http://localhost:3001/api/sessions/session-123');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeNull();
      expect(data.data.id).toBe('session-123');
      expect(data.data.winnerTeamName).toBe('Winners');
    });

    it('should return 404 for non-existent session', async () => {
      const request = createRequest('http://localhost:3001/api/sessions/non-existent');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  // ============================================================================
  // PATCH /api/sessions/[id] - Update session
  // ============================================================================
  describe('PATCH /api/sessions/[id]', () => {
    it('should update session', async () => {
      const session: TriviaSessionHistory = {
        id: 'session-update',
        startedAt: '2024-01-15T10:00:00.000Z',
        endedAt: null,
        roundsPlayed: 2,
        totalRounds: 3,
        questionsAnswered: 10,
        totalQuestions: 15,
        teamScores: [],
        winnerTeamId: null,
        winnerTeamName: null,
        userId: null,
        questionSetId: null,
        questionSetName: null,
        questionSummaries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessionHistoryStorage.create(session);

      const request = createRequest('http://localhost:3001/api/sessions/session-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endedAt: '2024-01-15T11:00:00.000Z',
          roundsPlayed: 3,
          winnerTeamId: 'team-1',
          winnerTeamName: 'Champions',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-update' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeNull();
      expect(data.data.endedAt).toBe('2024-01-15T11:00:00.000Z');
      expect(data.data.roundsPlayed).toBe(3);
      expect(data.data.winnerTeamName).toBe('Champions');
    });

    it('should return 404 for non-existent session', async () => {
      const request = createRequest('http://localhost:3001/api/sessions/non-existent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundsPlayed: 3 }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should reject invalid endedAt date', async () => {
      const session: TriviaSessionHistory = {
        id: 'session-invalid-date',
        startedAt: '2024-01-15T10:00:00.000Z',
        endedAt: null,
        roundsPlayed: 2,
        totalRounds: 3,
        questionsAnswered: 10,
        totalQuestions: 15,
        teamScores: [],
        winnerTeamId: null,
        winnerTeamName: null,
        userId: null,
        questionSetId: null,
        questionSetName: null,
        questionSummaries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessionHistoryStorage.create(session);

      const request = createRequest('http://localhost:3001/api/sessions/session-invalid-date', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endedAt: 'invalid-date' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-invalid-date' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('endedAt');
    });

    it('should update teamScores', async () => {
      const session: TriviaSessionHistory = {
        id: 'session-scores',
        startedAt: '2024-01-15T10:00:00.000Z',
        endedAt: null,
        roundsPlayed: 2,
        totalRounds: 3,
        questionsAnswered: 10,
        totalQuestions: 15,
        teamScores: [
          { teamId: 'team-1', teamName: 'Table 1', totalScore: 50, roundScores: [25, 25] },
        ],
        winnerTeamId: null,
        winnerTeamName: null,
        userId: null,
        questionSetId: null,
        questionSetName: null,
        questionSummaries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessionHistoryStorage.create(session);

      const newTeamScores = [
        { teamId: 'team-1', teamName: 'Table 1', totalScore: 75, roundScores: [25, 25, 25] },
      ];

      const request = createRequest('http://localhost:3001/api/sessions/session-scores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamScores: newTeamScores }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-scores' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.teamScores[0].totalScore).toBe(75);
    });

    it('should update questionSummaries', async () => {
      const session: TriviaSessionHistory = {
        id: 'session-summaries',
        startedAt: '2024-01-15T10:00:00.000Z',
        endedAt: null,
        roundsPlayed: 1,
        totalRounds: 3,
        questionsAnswered: 5,
        totalQuestions: 15,
        teamScores: [],
        winnerTeamId: null,
        winnerTeamName: null,
        userId: null,
        questionSetId: null,
        questionSetName: null,
        questionSummaries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessionHistoryStorage.create(session);

      const questionSummaries = [
        {
          questionId: 'q1',
          questionText: 'Test question?',
          correctAnswers: ['A'],
          teamsCorrect: 3,
          teamsIncorrect: 1,
        },
      ];

      const request = createRequest('http://localhost:3001/api/sessions/session-summaries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionSummaries }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-summaries' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.questionSummaries).toHaveLength(1);
      expect(data.data.questionSummaries[0].teamsCorrect).toBe(3);
    });
  });

  // ============================================================================
  // DELETE /api/sessions/[id] - Delete session
  // ============================================================================
  describe('DELETE /api/sessions/[id]', () => {
    it('should delete session', async () => {
      const session: TriviaSessionHistory = {
        id: 'session-delete',
        startedAt: '2024-01-15T10:00:00.000Z',
        endedAt: null,
        roundsPlayed: 3,
        totalRounds: 3,
        questionsAnswered: 15,
        totalQuestions: 15,
        teamScores: [],
        winnerTeamId: null,
        winnerTeamName: null,
        userId: null,
        questionSetId: null,
        questionSetName: null,
        questionSummaries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessionHistoryStorage.create(session);

      const request = createRequest('http://localhost:3001/api/sessions/session-delete', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'session-delete' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.deleted).toBe(true);

      // Verify it's actually deleted
      expect(sessionHistoryStorage.getById('session-delete')).toBeUndefined();
    });

    it('should return 404 for non-existent session', async () => {
      const request = createRequest('http://localhost:3001/api/sessions/non-existent', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });
});
