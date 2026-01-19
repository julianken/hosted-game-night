import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { gameSessionStorage } from '@/lib/api/storage';
import { NextRequest } from 'next/server';

// Helper to create mock NextRequest
function createRequest(options: {
  method?: string;
  body?: unknown;
  searchParams?: Record<string, string>;
} = {}) {
  const url = new URL('http://localhost:3001/api/games');
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return new NextRequest(url, {
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  });
}

describe('GET /api/games', () => {
  beforeEach(() => {
    gameSessionStorage.clear();
  });

  it('returns empty list when no games exist', async () => {
    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.error).toBeNull();
  });

  it('returns list of games with pagination', async () => {
    // Create some test games
    const now = new Date().toISOString();
    gameSessionStorage.create({
      id: 'game-1',
      name: 'Game 1',
      status: 'setup',
      currentRound: 0,
      totalRounds: 3,
      teams: [],
      questionSetId: null,
      createdAt: now,
      updatedAt: now,
    });
    gameSessionStorage.create({
      id: 'game-2',
      name: 'Game 2',
      status: 'playing',
      currentRound: 1,
      totalRounds: 5,
      teams: [],
      questionSetId: 'qs-1',
      createdAt: now,
      updatedAt: now,
    });

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(10);
  });

  it('respects pagination parameters', async () => {
    // Create 15 test games
    const now = new Date().toISOString();
    for (let i = 1; i <= 15; i++) {
      gameSessionStorage.create({
        id: `game-${i}`,
        name: `Game ${i}`,
        status: 'setup',
        currentRound: 0,
        totalRounds: 3,
        teams: [],
        questionSetId: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    const response = await GET(createRequest({
      searchParams: { page: '2', pageSize: '5' },
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(5);
    expect(data.total).toBe(15);
    expect(data.page).toBe(2);
    expect(data.pageSize).toBe(5);
  });
});

describe('POST /api/games', () => {
  beforeEach(() => {
    gameSessionStorage.clear();
  });

  it('creates a new game with valid data', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: { name: 'My Trivia Night' },
    }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data).toBeDefined();
    expect(data.data.name).toBe('My Trivia Night');
    expect(data.data.status).toBe('setup');
    expect(data.data.currentRound).toBe(0);
    expect(data.data.totalRounds).toBe(3);
    expect(data.data.teams).toHaveLength(4); // Default teams
    expect(data.error).toBeNull();
  });

  it('creates a game with all optional parameters', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: {
        name: 'Custom Game',
        totalRounds: 5,
        questionsPerRound: 10,
        questionSetId: 'default-music',
      },
    }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.name).toBe('Custom Game');
    expect(data.data.totalRounds).toBe(5);
    expect(data.data.questionSetId).toBe('default-music');
  });

  it('returns 400 when name is missing', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: {},
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required and must be a non-empty string');
    expect(data.data).toBeNull();
  });

  it('returns 400 when name is empty', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: { name: '   ' },
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required and must be a non-empty string');
  });

  it('returns 400 when totalRounds is out of range', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: { name: 'Test Game', totalRounds: 20 },
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('totalRounds must be a number between 1 and 10');
  });

  it('returns 400 when questionsPerRound is out of range', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: { name: 'Test Game', questionsPerRound: 50 },
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('questionsPerRound must be a number between 1 and 20');
  });

  it('trims whitespace from name', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: { name: '  Trimmed Name  ' },
    }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.name).toBe('Trimmed Name');
  });
});
