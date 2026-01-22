import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '../route';
import { NextRequest } from 'next/server';

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock the database functions
vi.mock('@beak-gaming/database/tables', () => ({
  getTriviaTemplate: vi.fn(),
  updateTriviaTemplate: vi.fn(),
  deleteTriviaTemplate: vi.fn(),
}));

vi.mock('@beak-gaming/database/errors', () => ({
  isDatabaseError: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import {
  getTriviaTemplate,
  updateTriviaTemplate,
  deleteTriviaTemplate,
} from '@beak-gaming/database/tables';
import { isDatabaseError } from '@beak-gaming/database/errors';
import type { TriviaTemplate } from '@beak-gaming/database/types';

describe('GET /api/templates/[id]', () => {
  const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
  const mockGet = getTriviaTemplate as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates/template-1');
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

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockGet.mockResolvedValue(mockTemplate);

    const request = new NextRequest('http://localhost/api/templates/template-1');
    const params = Promise.resolve({ id: 'template-1' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.template).toEqual(mockTemplate);
    expect(mockGet).toHaveBeenCalledWith(expect.anything(), 'template-1');
  });

  it('handles not found errors', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const notFoundError = { message: 'Template not found', statusCode: 404 };
    mockGet.mockRejectedValue(notFoundError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = new NextRequest('http://localhost/api/templates/nonexistent');
    const params = Promise.resolve({ id: 'nonexistent' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Template not found');
  });
});

describe('PATCH /api/templates/[id]', () => {
  const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
  const mockUpdate = updateTriviaTemplate as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Name' }),
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('updates template successfully', async () => {
    const mockTemplate: TriviaTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'Updated Name',
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
      is_default: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    };

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockUpdate.mockResolvedValue(mockTemplate);

    const request = new NextRequest('http://localhost/api/templates/template-1', {
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
    expect(data.template).toEqual(mockTemplate);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.anything(),
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
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates/template-1', {
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
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates/template-1', {
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
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates/template-1', {
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
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates/template-1', {
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
    const mockTemplate: TriviaTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'Updated Name',
      questions: [],
      rounds_count: 3,
      questions_per_round: 10,
      timer_duration: 30,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    };

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockUpdate.mockResolvedValue(mockTemplate);

    const request = new NextRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Name' }),
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await PATCH(request, { params });

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.anything(),
      'template-1',
      { name: 'Updated Name' }
    );
  });

  it('handles database errors', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const notFoundError = { message: 'Template not found', statusCode: 404 };
    mockUpdate.mockRejectedValue(notFoundError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = new NextRequest('http://localhost/api/templates/nonexistent', {
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
  const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
  const mockDelete = deleteTriviaTemplate as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates/template-1', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('deletes template successfully', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockDelete.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/templates/template-1', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith(expect.anything(), 'template-1');
  });

  it('handles not found errors', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const notFoundError = { message: 'Template not found', statusCode: 404 };
    mockDelete.mockRejectedValue(notFoundError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = new NextRequest('http://localhost/api/templates/nonexistent', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'nonexistent' });
    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Template not found');
  });

  it('handles database errors', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const dbError = { message: 'Database error', statusCode: 503 };
    mockDelete.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = new NextRequest('http://localhost/api/templates/template-1', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'template-1' });
    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('Database error');
  });
});
