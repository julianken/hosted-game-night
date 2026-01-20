import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import * as supabaseServer from '@/lib/supabase/server';
import * as database from '@beak-gaming/database';

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock the database functions
vi.mock('@beak-gaming/database', () => ({
  getGameSessionByRoomCode: vi.fn(),
}));

describe('GET /api/sessions/room/[roomCode]', () => {
  const mockClient = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient);
  });

  it('returns session data for valid room code', async () => {
    const mockSession = {
      session_id: 'test-session-123',
      room_code: 'ABC123',
      game_type: 'bingo',
      status: 'active',
      game_state: {},
    };

    vi.mocked(database.getGameSessionByRoomCode).mockResolvedValue(mockSession as any);

    const request = new NextRequest('http://localhost:3000/api/sessions/room/ABC123');
    const params = Promise.resolve({ roomCode: 'ABC123' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      sessionId: 'test-session-123',
      roomCode: 'ABC123',
      gameType: 'bingo',
      status: 'active',
    });
    expect(database.getGameSessionByRoomCode).toHaveBeenCalledWith(mockClient, 'ABC123');
  });

  it('returns 404 when session not found', async () => {
    vi.mocked(database.getGameSessionByRoomCode).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/sessions/room/INVALID');
    const params = Promise.resolve({ roomCode: 'INVALID' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Session not found' });
  });

  it('returns 500 on database error', async () => {
    vi.mocked(database.getGameSessionByRoomCode).mockRejectedValue(
      new Error('Database error')
    );

    const request = new NextRequest('http://localhost:3000/api/sessions/room/ABC123');
    const params = Promise.resolve({ roomCode: 'ABC123' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch session' });
  });

  it('handles different game types', async () => {
    const mockSession = {
      session_id: 'trivia-session-456',
      room_code: 'XYZ789',
      game_type: 'trivia',
      status: 'active',
      game_state: {},
    };

    vi.mocked(database.getGameSessionByRoomCode).mockResolvedValue(mockSession as any);

    const request = new NextRequest('http://localhost:3000/api/sessions/room/XYZ789');
    const params = Promise.resolve({ roomCode: 'XYZ789' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.gameType).toBe('trivia');
  });

  it('handles completed session status', async () => {
    const mockSession = {
      session_id: 'completed-session',
      room_code: 'DONE99',
      game_type: 'bingo',
      status: 'completed',
      game_state: {},
    };

    vi.mocked(database.getGameSessionByRoomCode).mockResolvedValue(mockSession as any);

    const request = new NextRequest('http://localhost:3000/api/sessions/room/DONE99');
    const params = Promise.resolve({ roomCode: 'DONE99' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('completed');
  });
});
