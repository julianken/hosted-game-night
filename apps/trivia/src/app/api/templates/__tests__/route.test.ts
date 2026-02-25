import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the auth utilities
vi.mock('@joolie-boolie/auth', () => ({
  getApiUser: vi.fn(),
  createAuthenticatedClient: vi.fn(),
}));

// Mock the database functions
vi.mock('@joolie-boolie/database/tables', () => ({
  listTriviaTemplates: vi.fn(),
  createTriviaTemplate: vi.fn(),
}));

vi.mock('@joolie-boolie/database/errors', () => ({
  isDatabaseError: vi.fn(),
}));

vi.mock('@joolie-boolie/database/pagination', () => ({
  parsePaginationParams: vi.fn().mockReturnValue({
    page: undefined,
    pageSize: undefined,
    cursor: undefined,
  }),
}));

import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import {
  listTriviaTemplates,
  createTriviaTemplate,
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

describe('GET /api/templates', () => {
  const mockList = listTriviaTemplates as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns paginated templates for authenticated user', async () => {
    const mockPaginatedResult = {
      data: [
        {
          id: 'template-1',
          user_id: 'user-123',
          name: 'My Template',
          rounds_count: 3,
          questions_per_round: 10,
          timer_duration: 30,
          is_default: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
      },
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockList.mockResolvedValue(mockPaginatedResult);

    const request = createMockRequest('http://localhost/api/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(mockPaginatedResult.data);
    expect(data.pagination).toEqual(mockPaginatedResult.pagination);
    expect(mockList).toHaveBeenCalledWith(mockSupabaseClient, 'user-123', expect.objectContaining({
      select: expect.any(String),
    }));
  });

  it('handles database errors', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const dbError = { message: 'Database error', statusCode: 503 };
    mockList.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('Database error');
  });
});

describe('POST /api/templates', () => {
  const mockCreate = createTriviaTemplate as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when name is missing', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({ questions: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('name');
  });

  it('returns 400 when questions is not an array', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', questions: 'not-an-array' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('questions must be an array');
  });

  it('returns 400 when question has less than 2 options', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        questions: [
          {
            question: 'What is 2+2?',
            options: ['4'],
            correctIndex: 0,
          },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('at least 2 options are required');
  });

  it('returns 400 when correctIndex is out of range', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        questions: [
          {
            question: 'What is 2+2?',
            options: ['3', '4'],
            correctIndex: 5, // Out of range
          },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('correctIndex must be a valid option index');
  });

  it('returns 400 when correctIndex is negative', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        questions: [
          {
            question: 'What is 2+2?',
            options: ['3', '4'],
            correctIndex: -1,
          },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('correctIndex must be a valid option index');
  });

  it('returns 400 when question text is empty', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        questions: [
          {
            question: '',
            options: ['A', 'B'],
            correctIndex: 0,
          },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('question text is required');
  });

  it('creates template successfully with questions', async () => {
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
      rounds_count: 5,
      questions_per_round: 15,
      timer_duration: 45,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockCreate.mockResolvedValue(mockTemplate);

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'My Template',
        questions: [
          {
            question: 'What is 2+2?',
            options: ['3', '4', '5'],
            correctIndex: 1,
          },
        ],
        rounds_count: 5,
        questions_per_round: 15,
        timer_duration: 45,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.template).toEqual(mockTemplate);
    expect(mockCreate).toHaveBeenCalledWith(
      mockSupabaseClient,
      expect.objectContaining({
        user_id: 'user-123',
        name: 'My Template',
        questions: [
          {
            question: 'What is 2+2?',
            options: ['3', '4', '5'],
            correctIndex: 1,
          },
        ],
        rounds_count: 5,
        questions_per_round: 15,
        timer_duration: 45,
      })
    );
  });

  it('applies default values when optional fields are missing', async () => {
    const mockTemplate: TriviaTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'Basic Template',
      questions: [],
      rounds_count: 3,
      questions_per_round: 10,
      timer_duration: 30,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockCreate.mockResolvedValue(mockTemplate);

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Basic Template',
      }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      mockSupabaseClient,
      expect.objectContaining({
        questions: [],
        rounds_count: 3,
        questions_per_round: 10,
        timer_duration: 30,
        is_default: false,
      })
    );
  });

  it('handles database errors', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const dbError = { message: 'Duplicate template name', statusCode: 409 };
    mockCreate.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Duplicate',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('Duplicate template name');
  });

  it('validates multiple questions correctly', async () => {
    const mockTemplate: TriviaTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'Multi-Question Template',
      questions: [
        {
          question: 'What is 2+2?',
          options: ['3', '4', '5'],
          correctIndex: 1,
        },
        {
          question: 'What is the capital of France?',
          options: ['London', 'Paris', 'Berlin', 'Madrid'],
          correctIndex: 1,
          category: 'Geography',
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
    mockCreate.mockResolvedValue(mockTemplate);

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Multi-Question Template',
        questions: [
          {
            question: 'What is 2+2?',
            options: ['3', '4', '5'],
            correctIndex: 1,
          },
          {
            question: 'What is the capital of France?',
            options: ['London', 'Paris', 'Berlin', 'Madrid'],
            correctIndex: 1,
            category: 'Geography',
          },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.template.questions).toHaveLength(2);
  });
});
