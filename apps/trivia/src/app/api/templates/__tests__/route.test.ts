import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock the database functions
vi.mock('@beak-gaming/database/tables', () => ({
  listAllTriviaTemplates: vi.fn(),
  createTriviaTemplate: vi.fn(),
}));

vi.mock('@beak-gaming/database/errors', () => ({
  isDatabaseError: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import {
  listAllTriviaTemplates,
  createTriviaTemplate,
} from '@beak-gaming/database/tables';
import { isDatabaseError } from '@beak-gaming/database/errors';
import type { TriviaTemplate } from '@beak-gaming/database/types';

describe('GET /api/templates', () => {
  const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
  const mockListAll = listAllTriviaTemplates as ReturnType<typeof vi.fn>;

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

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns templates for authenticated user', async () => {
    const mockTemplates: TriviaTemplate[] = [
      {
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
      },
    ];

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockListAll.mockResolvedValue(mockTemplates);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.templates).toEqual(mockTemplates);
    expect(mockListAll).toHaveBeenCalledWith(expect.anything(), 'user-123');
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
    mockListAll.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('Database error');
  });
});

describe('POST /api/templates', () => {
  const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
  const mockCreate = createTriviaTemplate as ReturnType<typeof vi.fn>;

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

    const request = new NextRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when name is missing', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({ questions: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('name');
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

    const request = new NextRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', questions: 'not-an-array' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('questions must be an array');
  });

  it('returns 400 when question has less than 2 options', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates', {
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
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates', {
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
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates', {
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
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates', {
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

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockCreate.mockResolvedValue(mockTemplate);

    const request = new NextRequest('http://localhost/api/templates', {
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
      expect.anything(),
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

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockCreate.mockResolvedValue(mockTemplate);

    const request = new NextRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Basic Template',
      }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.anything(),
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
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const dbError = { message: 'Duplicate template name', statusCode: 409 };
    mockCreate.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = new NextRequest('http://localhost/api/templates', {
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

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockCreate.mockResolvedValue(mockTemplate);

    const request = new NextRequest('http://localhost/api/templates', {
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
