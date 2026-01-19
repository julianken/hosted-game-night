import { describe, it, expect, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '../route';
import { gameSessionStorage } from '@/lib/api/storage';
import { NextRequest } from 'next/server';

// Helper to create mock NextRequest
function createRequest(options: {
  method?: string;
  body?: unknown;
} = {}) {
  return new NextRequest('http://localhost:3001/api/games/test-id', {
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  });
}

// Helper to create route context
function createContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/games/[id]', () => {
  beforeEach(() => {
    gameSessionStorage.clear();
  });

  it('returns game when found', async () => {
    const now = new Date().toISOString();
    gameSessionStorage.create({
      id: 'game-123',
      name: 'Test Game',
      status: 'setup',
      currentRound: 0,
      totalRounds: 3,
      teams: [],
      questionSetId: 'qs-1',
      createdAt: now,
      updatedAt: now,
    });

    const response = await GET(createRequest(), createContext('game-123'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.id).toBe('game-123');
    expect(data.data.name).toBe('Test Game');
    expect(data.error).toBeNull();
  });

  it('returns 404 when game not found', async () => {
    const response = await GET(createRequest(), createContext('nonexistent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Game session not found');
    expect(data.data).toBeNull();
  });
});

describe('PATCH /api/games/[id]', () => {
  beforeEach(() => {
    gameSessionStorage.clear();
    const now = new Date().toISOString();
    gameSessionStorage.create({
      id: 'game-123',
      name: 'Original Name',
      status: 'setup',
      currentRound: 0,
      totalRounds: 3,
      teams: [],
      questionSetId: null,
      createdAt: now,
      updatedAt: now,
    });
  });

  it('updates game name', async () => {
    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { name: 'Updated Name' } }),
      createContext('game-123')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.name).toBe('Updated Name');
    expect(data.error).toBeNull();
  });

  it('updates game status', async () => {
    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { status: 'playing' } }),
      createContext('game-123')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.status).toBe('playing');
  });

  it('updates multiple fields', async () => {
    const response = await PATCH(
      createRequest({
        method: 'PATCH',
        body: {
          name: 'New Name',
          status: 'between_rounds',
          currentRound: 2,
          totalRounds: 5,
        },
      }),
      createContext('game-123')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.name).toBe('New Name');
    expect(data.data.status).toBe('between_rounds');
    expect(data.data.currentRound).toBe(2);
    expect(data.data.totalRounds).toBe(5);
  });

  it('updates teams', async () => {
    const teams = [
      { id: 't1', name: 'Team A', score: 10, tableNumber: 1, roundScores: [10] },
      { id: 't2', name: 'Team B', score: 15, tableNumber: 2, roundScores: [15] },
    ];

    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { teams } }),
      createContext('game-123')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.teams).toHaveLength(2);
    expect(data.data.teams[0].name).toBe('Team A');
  });

  it('returns 404 when game not found', async () => {
    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { name: 'Test' } }),
      createContext('nonexistent')
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Game session not found');
  });

  it('returns 400 for invalid status', async () => {
    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { status: 'invalid' } }),
      createContext('game-123')
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Status must be one of');
  });

  it('returns 400 for invalid currentRound', async () => {
    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { currentRound: -1 } }),
      createContext('game-123')
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('currentRound must be a non-negative number');
  });

  it('returns 400 for invalid totalRounds', async () => {
    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { totalRounds: 15 } }),
      createContext('game-123')
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('totalRounds must be a number between 1 and 10');
  });

  it('returns 400 for too many teams', async () => {
    const teams = Array.from({ length: 25 }, (_, i) => ({
      id: `t${i}`,
      name: `Team ${i}`,
      score: 0,
      tableNumber: i + 1,
      roundScores: [],
    }));

    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { teams } }),
      createContext('game-123')
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Maximum 20 teams allowed');
  });
});

describe('DELETE /api/games/[id]', () => {
  beforeEach(() => {
    gameSessionStorage.clear();
    const now = new Date().toISOString();
    gameSessionStorage.create({
      id: 'game-123',
      name: 'To Be Deleted',
      status: 'setup',
      currentRound: 0,
      totalRounds: 3,
      teams: [],
      questionSetId: null,
      createdAt: now,
      updatedAt: now,
    });
  });

  it('deletes existing game', async () => {
    const response = await DELETE(
      createRequest({ method: 'DELETE' }),
      createContext('game-123')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.deleted).toBe(true);
    expect(data.error).toBeNull();

    // Verify game is deleted
    expect(gameSessionStorage.getById('game-123')).toBeUndefined();
  });

  it('returns 404 when game not found', async () => {
    const response = await DELETE(
      createRequest({ method: 'DELETE' }),
      createContext('nonexistent')
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Game session not found');
  });
});
