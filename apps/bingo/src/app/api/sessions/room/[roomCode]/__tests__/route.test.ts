import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import type { TypedSupabaseClient } from '@beak-gaming/database/client';

// Mock dependencies
vi.mock('@beak-gaming/database/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@beak-gaming/database/tables', () => ({
  getGameSessionByRoomCode: vi.fn(),
}));

import { createClient } from '@beak-gaming/database/server';
import { getGameSessionByRoomCode } from '@beak-gaming/database/tables';

describe('/api/sessions/room/[roomCode] endpoint', () => {
  const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
  const mockGetGameSessionByRoomCode = getGameSessionByRoomCode as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns session data when room code exists', async () => {
    const mockSupabase = {} as unknown as TypedSupabaseClient;
    const mockSession = {
      session_id: 'session-123',
      room_code: 'SWAN-42',
      game_type: 'bingo',
      status: 'active',
      user_id: 'user-456',
      created_at: '2024-01-01T00:00:00Z',
    };

    mockCreateClient.mockResolvedValue(mockSupabase);
    mockGetGameSessionByRoomCode.mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/sessions/room/SWAN-42');
    const params = Promise.resolve({ roomCode: 'SWAN-42' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      sessionId: 'session-123',
      roomCode: 'SWAN-42',
      gameType: 'bingo',
      status: 'active',
    });
    expect(mockGetGameSessionByRoomCode).toHaveBeenCalledWith(mockSupabase, 'SWAN-42');
  });

  it('returns 404 when session not found', async () => {
    const mockSupabase = {} as unknown as TypedSupabaseClient;

    mockCreateClient.mockResolvedValue(mockSupabase);
    mockGetGameSessionByRoomCode.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/sessions/room/INVALID-99');
    const params = Promise.resolve({ roomCode: 'INVALID-99' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Session not found' });
    expect(mockGetGameSessionByRoomCode).toHaveBeenCalledWith(mockSupabase, 'INVALID-99');
  });

  it('returns 500 when database query fails', async () => {
    const mockSupabase = {} as unknown as TypedSupabaseClient;

    mockCreateClient.mockResolvedValue(mockSupabase);
    mockGetGameSessionByRoomCode.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/sessions/room/SWAN-42');
    const params = Promise.resolve({ roomCode: 'SWAN-42' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });

  it('returns 500 when client creation fails', async () => {
    mockCreateClient.mockRejectedValue(new Error('Supabase client creation failed'));

    const request = new NextRequest('http://localhost:3000/api/sessions/room/SWAN-42');
    const params = Promise.resolve({ roomCode: 'SWAN-42' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });

  it('handles different room code formats', async () => {
    const mockSupabase = {} as unknown as TypedSupabaseClient;
    const mockSession = {
      session_id: 'session-789',
      room_code: 'DUCK-01',
      game_type: 'bingo',
      status: 'pending',
      user_id: 'user-999',
      created_at: '2024-01-02T00:00:00Z',
    };

    mockCreateClient.mockResolvedValue(mockSupabase);
    mockGetGameSessionByRoomCode.mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/sessions/room/DUCK-01');
    const params = Promise.resolve({ roomCode: 'DUCK-01' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.roomCode).toBe('DUCK-01');
    expect(mockGetGameSessionByRoomCode).toHaveBeenCalledWith(mockSupabase, 'DUCK-01');
  });
});
