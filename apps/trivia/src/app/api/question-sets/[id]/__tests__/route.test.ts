import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '../route';
import { NextRequest } from 'next/server';

const skipIfDisabled = !process.env.NEXT_PUBLIC_FEATURE_QUESTION_SETS || process.env.NEXT_PUBLIC_FEATURE_QUESTION_SETS === 'false';

// Mock the auth utilities
vi.mock('@joolie-boolie/auth', () => ({
  getApiUser: vi.fn(),
  createAuthenticatedClient: vi.fn(),
}));

// Mock the database functions
vi.mock('@joolie-boolie/database/tables', () => ({
  getTriviaQuestionSet: vi.fn(),
  updateTriviaQuestionSet: vi.fn(),
  deleteTriviaQuestionSet: vi.fn(),
}));

vi.mock('@joolie-boolie/database/errors', () => ({
  isDatabaseError: vi.fn(),
}));

import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import {
  getTriviaQuestionSet,
  updateTriviaQuestionSet,
  deleteTriviaQuestionSet,
} from '@joolie-boolie/database/tables';
import { isDatabaseError } from '@joolie-boolie/database/errors';
import type { TriviaQuestionSet } from '@joolie-boolie/database/types';

const mockGetApiUser = getApiUser as ReturnType<typeof vi.fn>;
const mockCreateAuthenticatedClient = createAuthenticatedClient as ReturnType<typeof vi.fn>;

/**
 * Helper to create a mock request with jb_access_token cookie
 */
function createMockRequest(url: string, init?: { method?: string; body?: string }) {
  const request = new NextRequest(url, init);
  request.cookies.set('jb_access_token', 'test-jwt-token');
  return request;
}

const mockQuestionSet: TriviaQuestionSet = {
  id: 'qs-1',
  user_id: 'user-123',
  name: 'My Question Set',
  description: 'A test question set',
  questions: [
    {
      question: 'What is 2+2?',
      options: ['3', '4', '5'],
      correctIndex: 1,
    },
  ],
  is_default: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe.skipIf(skipIfDisabled)('GET /api/question-sets/[id]', () => {
  const mockGet = getTriviaQuestionSet as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/question-sets/qs-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'qs-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns question set successfully', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGet.mockResolvedValue(mockQuestionSet);

    const request = createMockRequest('http://localhost/api/question-sets/qs-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'qs-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.questionSet).toEqual(mockQuestionSet);
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'qs-1');
  });

  it('returns 404 when user does not own the question set', async () => {
    const otherUsersQuestionSet: TriviaQuestionSet = {
      ...mockQuestionSet,
      user_id: 'other-user-id',
    };

    mockGetApiUser.mockResolvedValue({ id: 'requesting-user-id', email: 'test@example.com' });
    mockGet.mockResolvedValue(otherUsersQuestionSet);

    const request = createMockRequest('http://localhost/api/question-sets/qs-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'qs-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Not found');
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'qs-1');
  });

  it('handles not found errors from database', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const notFoundError = { message: 'Question set not found', statusCode: 404 };
    mockGet.mockRejectedValue(notFoundError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/question-sets/nonexistent');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Question set not found');
  });

  it('handles non-database errors with 500', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const genericError = new Error('Unexpected runtime error');
    mockGet.mockRejectedValue(genericError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    const request = createMockRequest('http://localhost/api/question-sets/qs-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'qs-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe.skipIf(skipIfDisabled)('PATCH /api/question-sets/[id]', () => {
  const mockGet = getTriviaQuestionSet as ReturnType<typeof vi.fn>;
  const mockUpdate = updateTriviaQuestionSet as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/question-sets/qs-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'qs-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when user does not own the question set', async () => {
    const otherUsersQuestionSet: TriviaQuestionSet = {
      ...mockQuestionSet,
      user_id: 'other-user-id',
    };

    mockGetApiUser.mockResolvedValue({ id: 'requesting-user-id', email: 'test@example.com' });
    mockGet.mockResolvedValue(otherUsersQuestionSet);

    const request = createMockRequest('http://localhost/api/question-sets/qs-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Hijacked Name' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'qs-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Not found');
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'qs-1');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates question set successfully', async () => {
    const updatedQuestionSet: TriviaQuestionSet = {
      ...mockQuestionSet,
      name: 'Updated Question Set',
      updated_at: '2024-01-02T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGet.mockResolvedValue(mockQuestionSet);
    mockUpdate.mockResolvedValue(updatedQuestionSet);

    const request = createMockRequest('http://localhost/api/question-sets/qs-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Question Set' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'qs-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.questionSet).toEqual(updatedQuestionSet);
    expect(mockUpdate).toHaveBeenCalledWith(
      mockSupabaseClient,
      'qs-1',
      { name: 'Updated Question Set' },
      'user-123'
    );
  });

  it('returns 400 when questions is not an array', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/question-sets/qs-1', {
      method: 'PATCH',
      body: JSON.stringify({ questions: 'not-an-array' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'qs-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('questions must be an array');
  });

  it('returns 400 when question has invalid structure', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/question-sets/qs-1', {
      method: 'PATCH',
      body: JSON.stringify({
        questions: [
          {
            question: 'What is 2+2?',
            options: ['4'], // Only 1 option
            correctIndex: 0,
          },
        ],
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'qs-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('at least 2 options are required');
  });

  it('handles database errors', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const notFoundError = { message: 'Question set not found', statusCode: 404 };
    mockGet.mockRejectedValue(notFoundError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/question-sets/nonexistent', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Question set not found');
  });
});

describe.skipIf(skipIfDisabled)('DELETE /api/question-sets/[id]', () => {
  const mockGet = getTriviaQuestionSet as ReturnType<typeof vi.fn>;
  const mockDelete = deleteTriviaQuestionSet as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/question-sets/qs-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'qs-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('deletes question set successfully', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGet.mockResolvedValue(mockQuestionSet);
    mockDelete.mockResolvedValue(undefined);

    const request = createMockRequest('http://localhost/api/question-sets/qs-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'qs-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'qs-1');
    expect(mockDelete).toHaveBeenCalledWith(mockSupabaseClient, 'qs-1', 'user-123');
  });

  it('returns 404 when user does not own the question set', async () => {
    const otherUsersQuestionSet: TriviaQuestionSet = {
      ...mockQuestionSet,
      user_id: 'other-user-id',
    };

    mockGetApiUser.mockResolvedValue({ id: 'requesting-user-id', email: 'test@example.com' });
    mockGet.mockResolvedValue(otherUsersQuestionSet);

    const request = createMockRequest('http://localhost/api/question-sets/qs-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'qs-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Not found');
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'qs-1');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('handles database errors', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const dbError = { message: 'Database error', statusCode: 503 };
    mockGet.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/question-sets/qs-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'qs-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('Database error');
  });
});
