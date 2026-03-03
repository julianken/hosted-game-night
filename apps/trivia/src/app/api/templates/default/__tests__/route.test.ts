import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock the auth utilities
vi.mock('@joolie-boolie/auth', () => ({
  getApiUser: vi.fn(),
  createAuthenticatedClient: vi.fn(),
}));

// Mock the database functions
vi.mock('@joolie-boolie/database/tables', () => ({
  getDefaultTriviaTemplate: vi.fn(),
}));

vi.mock('@joolie-boolie/database/errors', () => ({
  isDatabaseError: vi.fn(),
}));

import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import { getDefaultTriviaTemplate } from '@joolie-boolie/database/tables';
import { isDatabaseError } from '@joolie-boolie/database/errors';
import type { TriviaTemplate } from '@joolie-boolie/database/types';

const mockGetApiUser = getApiUser as ReturnType<typeof vi.fn>;
const mockCreateAuthenticatedClient = createAuthenticatedClient as ReturnType<typeof vi.fn>;

/**
 * Helper to create a mock request with jb_access_token cookie
 */
function createMockRequest(url: string) {
  const request = new NextRequest(url);
  request.cookies.set('jb_access_token', 'test-jwt-token');
  return request;
}

describe('GET /api/templates/default', () => {
  const mockGetDefault = getDefaultTriviaTemplate as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns template when default exists', async () => {
    const mockTemplate: TriviaTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'My Default Template',
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
      is_default: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGetDefault.mockResolvedValue(mockTemplate);

    const request = createMockRequest('http://localhost/api/templates/default');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.template).toEqual(mockTemplate);
    expect(mockGetDefault).toHaveBeenCalledWith(mockSupabaseClient, 'user-123');
  });

  it('returns { template: null } with HTTP 200 when no default', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGetDefault.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/templates/default');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.template).toBeNull();
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/templates/default');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 500 for database errors', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const dbError = new Error('Connection failed');
    mockGetDefault.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    const request = createMockRequest('http://localhost/api/templates/default');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('response matches Tier 1 envelope shape', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGetDefault.mockResolvedValue({
      id: 'template-1',
      user_id: 'user-123',
      name: 'Default',
      questions: [],
      rounds_count: 3,
      questions_per_round: 10,
      timer_duration: 30,
      is_default: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    const request = createMockRequest('http://localhost/api/templates/default');
    const response = await GET(request);
    const data = await response.json();

    // Tier 1 envelope: resource-keyed object with "template" key
    expect(data).toHaveProperty('template');
    expect(Object.keys(data)).toEqual(['template']);
    expect(data).not.toHaveProperty('error');
    expect(data).not.toHaveProperty('data');
  });
});
