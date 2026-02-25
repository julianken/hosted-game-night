import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '../route';
import { NextRequest } from 'next/server';

// Mock the auth utilities
vi.mock('@joolie-boolie/auth', () => ({
  getApiUser: vi.fn(),
  createAuthenticatedClient: vi.fn(),
}));

// Mock the database functions
vi.mock('@joolie-boolie/database/tables', () => ({
  getTriviaTemplate: vi.fn(),
  updateTriviaTemplate: vi.fn(),
  deleteTriviaTemplate: vi.fn(),
}));

vi.mock('@joolie-boolie/database/errors', () => ({
  isDatabaseError: vi.fn(),
}));

import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import {
  getTriviaTemplate,
  updateTriviaTemplate,
  deleteTriviaTemplate,
} from '@joolie-boolie/database/tables';
import { isDatabaseError } from '@joolie-boolie/database/errors';
import type { TriviaTemplate } from '@joolie-boolie/database/types';

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

describe('GET /api/templates/[id]', () => {
  const mockGet = getTriviaTemplate as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/templates/template-1');
    const params = Promise.resolve({ id: 'template-1' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns template by id', async () => {
    const mockTemplate: TriviaTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'My Template',
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
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGet.mockResolvedValue(mockTemplate);

    const request = createMockRequest('http://localhost/api/templates/template-1');
    const params = Promise.resolve({ id: 'template-1' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.template).toEqual(mockTemplate);
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'template-1');
  });

  it('returns 404 when user does not own the template', async () => {
    const otherUsersTemplate: TriviaTemplate = {
      id: 'template-1',
      user_id: 'other-user-id',
      name: 'Other User Template',
      questions: [],
      rounds_count: 3,
      questions_per_round: 10,
      timer_duration: 30,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'requesting-user-id', email: 'test@example.com' });
    mockGet.mockResolvedValue(otherUsersTemplate);

    const request = createMockRequest('http://localhost/api/templates/template-1');
    const params = Promise.resolve({ id: 'template-1' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Not found');
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'template-1');
  });

  it('handles not found errors', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const notFoundError = { message: 'Template not found', statusCode: 404 };
    mockGet.mockRejectedValue(notFoundError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/templates/nonexistent');
    const params = Promise.resolve({ id: 'nonexistent' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Template not found');
  });
});

describe('PATCH /api/templates/[id]', () => {
  const mockGet = getTriviaTemplate as ReturnType<typeof vi.fn>;
  const mockUpdate = updateTriviaTemplate as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Name' }),
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when user does not own the template', async () => {
    const otherUsersTemplate: TriviaTemplate = {
      id: 'template-1',
      user_id: 'other-user-id',
      name: 'Other User Template',
      questions: [],
      rounds_count: 3,
      questions_per_round: 10,
      timer_duration: 30,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'requesting-user-id', email: 'test@example.com' });
    mockGet.mockResolvedValue(otherUsersTemplate);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Hijacked Name' }),
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Not found');
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'template-1');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates template successfully', async () => {
    const existingTemplate: TriviaTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'My Template',
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
      updated_at: '2024-01-01T00:00:00Z',
    };

    const updatedTemplate: TriviaTemplate = {
      ...existingTemplate,
      name: 'Updated Name',
      rounds_count: 5,
      questions_per_round: 15,
      timer_duration: 45,
      is_default: true,
      updated_at: '2024-01-02T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGet.mockResolvedValue(existingTemplate);
    mockUpdate.mockResolvedValue(updatedTemplate);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Updated Name',
        rounds_count: 5,
        questions_per_round: 15,
        timer_duration: 45,
        is_default: true,
      }),
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.template).toEqual(updatedTemplate);
    expect(mockUpdate).toHaveBeenCalledWith(
      mockSupabaseClient,
      'template-1',
      expect.objectContaining({
        name: 'Updated Name',
        rounds_count: 5,
        questions_per_round: 15,
        timer_duration: 45,
        is_default: true,
      })
    );
  });

  it('returns 400 when questions is not an array', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({ questions: 'not-an-array' }),
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('questions must be an array');
  });

  it('returns 400 when question has invalid structure', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/templates/template-1', {
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
    const params = Promise.resolve({ id: 'template-1' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('at least 2 options are required');
  });

  it('returns 400 when correctIndex is out of range', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({
        questions: [
          {
            question: 'What is 2+2?',
            options: ['3', '4'],
            correctIndex: 10, // Out of range
          },
        ],
      }),
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('correctIndex must be a valid option index');
  });

  it('returns 400 when question text is empty', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({
        questions: [
          {
            question: '   ',
            options: ['A', 'B'],
            correctIndex: 0,
          },
        ],
      }),
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('question text is required');
  });

  it('updates only provided fields', async () => {
    const existingTemplate: TriviaTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'My Template',
      questions: [],
      rounds_count: 3,
      questions_per_round: 10,
      timer_duration: 30,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const updatedTemplate: TriviaTemplate = {
      ...existingTemplate,
      name: 'Updated Name',
      updated_at: '2024-01-02T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGet.mockResolvedValue(existingTemplate);
    mockUpdate.mockResolvedValue(updatedTemplate);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Name' }),
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await PATCH(request, { params });

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      mockSupabaseClient,
      'template-1',
      { name: 'Updated Name' }
    );
  });

  it('handles database errors', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const notFoundError = { message: 'Template not found', statusCode: 404 };
    mockGet.mockRejectedValue(notFoundError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/templates/nonexistent', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });
    const params = Promise.resolve({ id: 'nonexistent' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Template not found');
  });
});

describe('DELETE /api/templates/[id]', () => {
  const mockGet = getTriviaTemplate as ReturnType<typeof vi.fn>;
  const mockDelete = deleteTriviaTemplate as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('deletes template successfully', async () => {
    const existingTemplate: TriviaTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'My Template',
      questions: [],
      rounds_count: 3,
      questions_per_round: 10,
      timer_duration: 30,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGet.mockResolvedValue(existingTemplate);
    mockDelete.mockResolvedValue(undefined);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'template-1');
    expect(mockDelete).toHaveBeenCalledWith(mockSupabaseClient, 'template-1');
  });

  it('returns 404 when user does not own the template', async () => {
    const otherUsersTemplate: TriviaTemplate = {
      id: 'template-1',
      user_id: 'other-user-id',
      name: 'Other User Template',
      questions: [],
      rounds_count: 3,
      questions_per_round: 10,
      timer_duration: 30,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'requesting-user-id', email: 'test@example.com' });
    mockGet.mockResolvedValue(otherUsersTemplate);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Not found');
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'template-1');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('handles not found errors', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const notFoundError = { message: 'Template not found', statusCode: 404 };
    mockGet.mockRejectedValue(notFoundError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/templates/nonexistent', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'nonexistent' });
    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Template not found');
  });

  it('handles database errors', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const dbError = { message: 'Database error', statusCode: 503 };
    mockGet.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('Database error');
  });
});
