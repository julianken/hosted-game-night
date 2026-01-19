import { describe, it, expect, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '../route';
import { questionSetStorage, generateId } from '@/lib/api/storage';
import { NextRequest } from 'next/server';

// Helper to create mock NextRequest
function createRequest(options: {
  method?: string;
  body?: unknown;
} = {}) {
  return new NextRequest('http://localhost:3001/api/questions/test-id', {
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  });
}

// Helper to create route context
function createContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// Valid question for testing
const validQuestion = {
  text: 'What is 2 + 2?',
  type: 'multiple_choice' as const,
  correctAnswers: ['C'],
  options: ['A', 'B', 'C', 'D'],
  optionTexts: ['2', '3', '4', '5'],
  category: 'history' as const,
};

describe('GET /api/questions/[id]', () => {
  beforeEach(() => {
    questionSetStorage.clear();
  });

  it('returns question set when found', async () => {
    const response = await GET(createRequest(), createContext('default-music'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.id).toBe('default-music');
    expect(data.data.name).toBe('Classic Music Trivia');
    expect(data.error).toBeNull();
  });

  it('returns 404 when question set not found', async () => {
    const response = await GET(createRequest(), createContext('nonexistent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Question set not found');
    expect(data.data).toBeNull();
  });
});

describe('PATCH /api/questions/[id]', () => {
  beforeEach(() => {
    questionSetStorage.clear();
    const now = new Date().toISOString();
    questionSetStorage.create({
      id: 'qs-123',
      name: 'Original Name',
      description: 'Original description',
      questions: [{ ...validQuestion, id: 'q1', roundIndex: 0 }],
      category: 'history',
      createdAt: now,
      updatedAt: now,
    });
  });

  it('updates question set name', async () => {
    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { name: 'Updated Name' } }),
      createContext('qs-123')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.name).toBe('Updated Name');
    expect(data.error).toBeNull();
  });

  it('updates question set description', async () => {
    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { description: 'New description' } }),
      createContext('qs-123')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.description).toBe('New description');
  });

  it('updates question set category', async () => {
    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { category: 'music' } }),
      createContext('qs-123')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.category).toBe('music');
  });

  it('updates questions', async () => {
    const newQuestions = [
      { ...validQuestion, text: 'New question 1' },
      { ...validQuestion, text: 'New question 2' },
    ];

    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { questions: newQuestions } }),
      createContext('qs-123')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.questions).toHaveLength(2);
    expect(data.data.questions[0].text).toBe('New question 1');
    expect(data.data.questions[1].text).toBe('New question 2');
  });

  it('returns 404 when question set not found', async () => {
    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { name: 'Test' } }),
      createContext('nonexistent')
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Question set not found');
  });

  it('returns 400 for empty name', async () => {
    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { name: '' } }),
      createContext('qs-123')
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name must be a non-empty string');
  });

  it('returns 400 for empty questions array', async () => {
    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { questions: [] } }),
      createContext('qs-123')
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Questions must be a non-empty array');
  });

  it('returns 400 for invalid question in array', async () => {
    const response = await PATCH(
      createRequest({
        method: 'PATCH',
        body: {
          questions: [{ ...validQuestion, text: '' }],
        },
      }),
      createContext('qs-123')
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Question 1: text is required and must be a non-empty string');
  });

  it('returns 400 for invalid category', async () => {
    const response = await PATCH(
      createRequest({ method: 'PATCH', body: { category: 'sports' } }),
      createContext('qs-123')
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid category');
  });
});

describe('DELETE /api/questions/[id]', () => {
  beforeEach(() => {
    questionSetStorage.clear();
    const now = new Date().toISOString();
    questionSetStorage.create({
      id: 'qs-123',
      name: 'To Be Deleted',
      description: null,
      questions: [{ ...validQuestion, id: 'q1', roundIndex: 0 }],
      category: 'history',
      createdAt: now,
      updatedAt: now,
    });
  });

  it('deletes existing question set', async () => {
    const response = await DELETE(
      createRequest({ method: 'DELETE' }),
      createContext('qs-123')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.deleted).toBe(true);
    expect(data.error).toBeNull();

    // Verify question set is deleted
    expect(questionSetStorage.getById('qs-123')).toBeUndefined();
  });

  it('returns 404 when question set not found', async () => {
    const response = await DELETE(
      createRequest({ method: 'DELETE' }),
      createContext('nonexistent')
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Question set not found');
  });

  it('returns 403 when trying to delete default question set', async () => {
    const response = await DELETE(
      createRequest({ method: 'DELETE' }),
      createContext('default-music')
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Cannot delete default question sets');
  });
});
