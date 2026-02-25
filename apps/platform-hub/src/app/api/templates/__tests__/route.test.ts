/**
 * Tests for template aggregation API (direct DB queries)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock getApiUser
vi.mock('@joolie-boolie/auth', () => ({
  getApiUser: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
}));

// Mock Supabase server client (fallback auth)
const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    })
  ),
  createServiceRoleClient: vi.fn(() => 'mock-service-client'),
}));

// Mock database functions
const mockListAllBingoTemplates = vi.fn();
const mockListAllTriviaTemplates = vi.fn();
vi.mock('@joolie-boolie/database', () => ({
  listAllBingoTemplates: (...args: unknown[]) => mockListAllBingoTemplates(...args),
  listAllTriviaTemplates: (...args: unknown[]) => mockListAllTriviaTemplates(...args),
}));

// Helper to create mock NextRequest objects
function createMockRequest(url: string = 'http://localhost:3002/api/templates'): NextRequest {
  return new NextRequest(url);
}

describe('GET /api/templates', () => {
  beforeEach(() => {
    mockListAllBingoTemplates.mockReset();
    mockListAllTriviaTemplates.mockReset();
    mockGetUser.mockReset();
    // Default: Supabase session auth also fails (no user)
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });
  });

  it('should return 401 when not authenticated via any method', async () => {
    const { getApiUser } = await import('@joolie-boolie/auth');
    vi.mocked(getApiUser).mockResolvedValueOnce(null);
    // Supabase fallback also fails (default mock above)

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should authenticate via Supabase session when OAuth token is absent', async () => {
    const { getApiUser } = await import('@joolie-boolie/auth');
    // OAuth SSO auth fails (no jb_access_token)
    vi.mocked(getApiUser).mockResolvedValueOnce(null);
    // Supabase session auth succeeds
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'supabase-user-1', email: 'supabase@example.com' } },
      error: null,
    });

    // Mock DB queries to return empty arrays
    mockListAllBingoTemplates.mockResolvedValueOnce([]);
    mockListAllTriviaTemplates.mockResolvedValueOnce([]);

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.templates).toEqual([]);
  });

  it('should fetch and combine templates from both games via DB', async () => {
    const bingoTemplates = [
      {
        id: 'bingo-1',
        user_id: 'user-1',
        name: 'Bingo Template 1',
        pattern_id: 'standard',
        voice_pack: 'classic',
        auto_call_enabled: false,
        auto_call_interval: 5000,
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ];

    const triviaTemplates = [
      {
        id: 'trivia-1',
        user_id: 'user-1',
        name: 'Trivia Template 1',
        questions: [
          {
            question: 'What is 2+2?',
            options: ['3', '4', '5'],
            correctIndex: 1,
          },
        ],
        rounds_count: 3,
        questions_per_round: 10,
        timer_duration: 30,
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      },
    ];

    mockListAllBingoTemplates.mockResolvedValueOnce(bingoTemplates);
    mockListAllTriviaTemplates.mockResolvedValueOnce(triviaTemplates);

    const response = await GET(createMockRequest());
    const data = await response.json();

    // Should have called DB functions with service client and user ID
    expect(mockListAllBingoTemplates).toHaveBeenCalledWith('mock-service-client', 'user-1');
    expect(mockListAllTriviaTemplates).toHaveBeenCalledWith('mock-service-client', 'user-1');

    expect(data.templates).toHaveLength(2);

    // Should be sorted by updated_at descending (trivia is more recent)
    expect(data.templates[0].game).toBe('trivia');
    expect(data.templates[0].id).toBe('trivia-1');
    expect(data.templates[1].game).toBe('bingo');
    expect(data.templates[1].id).toBe('bingo-1');

    expect(data.errors).toBeUndefined();
  });

  it('should handle bingo DB query failure gracefully', async () => {
    const triviaTemplates = [
      {
        id: 'trivia-1',
        user_id: 'user-1',
        name: 'Trivia Template 1',
        questions: [],
        rounds_count: 3,
        questions_per_round: 10,
        timer_duration: 30,
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    // Bingo query fails
    mockListAllBingoTemplates.mockRejectedValueOnce(new Error('Database connection error'));
    mockListAllTriviaTemplates.mockResolvedValueOnce(triviaTemplates);

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(data.templates).toHaveLength(1);
    expect(data.templates[0].game).toBe('trivia');
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0]).toContain('Bingo templates unavailable');
  });

  it('should handle trivia DB query failure gracefully', async () => {
    const bingoTemplates = [
      {
        id: 'bingo-1',
        user_id: 'user-1',
        name: 'Bingo Template 1',
        pattern_id: 'standard',
        voice_pack: 'classic',
        auto_call_enabled: false,
        auto_call_interval: 5000,
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    mockListAllBingoTemplates.mockResolvedValueOnce(bingoTemplates);
    // Trivia query fails
    mockListAllTriviaTemplates.mockRejectedValueOnce(new Error('Database connection error'));

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(data.templates).toHaveLength(1);
    expect(data.templates[0].game).toBe('bingo');
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0]).toContain('Trivia templates unavailable');
  });

  it('should handle both DB queries failing', async () => {
    mockListAllBingoTemplates.mockRejectedValueOnce(new Error('DB error'));
    mockListAllTriviaTemplates.mockRejectedValueOnce(new Error('DB error'));

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(data.templates).toHaveLength(0);
    expect(data.errors).toHaveLength(2);
    expect(data.errors[0]).toContain('Bingo templates unavailable');
    expect(data.errors[1]).toContain('Trivia templates unavailable');
  });

  it('should sort templates by updated_at descending', async () => {
    const bingoTemplates = [
      {
        id: 'bingo-1',
        user_id: 'user-1',
        name: 'Older Bingo',
        pattern_id: 'standard',
        voice_pack: 'classic',
        auto_call_enabled: false,
        auto_call_interval: 5000,
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z', // Oldest
      },
      {
        id: 'bingo-2',
        user_id: 'user-1',
        name: 'Newer Bingo',
        pattern_id: 'blackout',
        voice_pack: 'classic',
        auto_call_enabled: false,
        auto_call_interval: 5000,
        is_default: false,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z', // Newest
      },
    ];

    const triviaTemplates = [
      {
        id: 'trivia-1',
        user_id: 'user-1',
        name: 'Middle Trivia',
        questions: [],
        rounds_count: 3,
        questions_per_round: 10,
        timer_duration: 30,
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z', // Middle
      },
    ];

    mockListAllBingoTemplates.mockResolvedValueOnce(bingoTemplates);
    mockListAllTriviaTemplates.mockResolvedValueOnce(triviaTemplates);

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(data.templates).toHaveLength(3);
    expect(data.templates[0].id).toBe('bingo-2'); // Newest
    expect(data.templates[1].id).toBe('trivia-1'); // Middle
    expect(data.templates[2].id).toBe('bingo-1'); // Oldest
  });

  it('should apply recent filter (3 per game)', async () => {
    const bingoTemplates = Array.from({ length: 5 }, (_, i) => ({
      id: `bingo-${i + 1}`,
      user_id: 'user-1',
      name: `Bingo ${i + 1}`,
      pattern_id: 'standard',
      voice_pack: 'classic',
      auto_call_enabled: false,
      auto_call_interval: 5000,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: `2024-01-0${i + 1}T00:00:00Z`,
    }));

    const triviaTemplates = Array.from({ length: 4 }, (_, i) => ({
      id: `trivia-${i + 1}`,
      user_id: 'user-1',
      name: `Trivia ${i + 1}`,
      questions: [],
      rounds_count: 3,
      questions_per_round: 10,
      timer_duration: 30,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: `2024-02-0${i + 1}T00:00:00Z`,
    }));

    mockListAllBingoTemplates.mockResolvedValueOnce(bingoTemplates);
    mockListAllTriviaTemplates.mockResolvedValueOnce(triviaTemplates);

    const response = await GET(createMockRequest('http://localhost:3002/api/templates?recent=true'));
    const data = await response.json();

    // 3 bingo + 3 trivia = 6 max
    expect(data.templates).toHaveLength(6);
    // Should only have the 3 most recent of each game
    const bingoIds = data.templates.filter((t: { game: string }) => t.game === 'bingo').map((t: { id: string }) => t.id);
    const triviaIds = data.templates.filter((t: { game: string }) => t.game === 'trivia').map((t: { id: string }) => t.id);
    expect(bingoIds).toHaveLength(3);
    expect(triviaIds).toHaveLength(3);
  });

  it('should apply limit parameter', async () => {
    const bingoTemplates = Array.from({ length: 5 }, (_, i) => ({
      id: `bingo-${i + 1}`,
      user_id: 'user-1',
      name: `Bingo ${i + 1}`,
      pattern_id: 'standard',
      voice_pack: 'classic',
      auto_call_enabled: false,
      auto_call_interval: 5000,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: `2024-01-0${i + 1}T00:00:00Z`,
    }));

    mockListAllBingoTemplates.mockResolvedValueOnce(bingoTemplates);
    mockListAllTriviaTemplates.mockResolvedValueOnce([]);

    const response = await GET(createMockRequest('http://localhost:3002/api/templates?limit=2'));
    const data = await response.json();

    expect(data.templates).toHaveLength(2);
  });

  it('should pass user ID to database queries', async () => {
    mockListAllBingoTemplates.mockResolvedValueOnce([]);
    mockListAllTriviaTemplates.mockResolvedValueOnce([]);

    await GET(createMockRequest());

    expect(mockListAllBingoTemplates).toHaveBeenCalledWith('mock-service-client', 'user-1');
    expect(mockListAllTriviaTemplates).toHaveBeenCalledWith('mock-service-client', 'user-1');
  });
});
