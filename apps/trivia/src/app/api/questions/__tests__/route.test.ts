import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { questionSetStorage } from '@/lib/api/storage';
import { NextRequest } from 'next/server';

// Helper to create mock NextRequest
function createRequest(options: {
  method?: string;
  body?: unknown;
  searchParams?: Record<string, string>;
} = {}) {
  const url = new URL('http://localhost:3001/api/questions');
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return new NextRequest(url, {
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  });
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

describe('GET /api/questions', () => {
  beforeEach(() => {
    questionSetStorage.clear();
  });

  it('returns default question sets', async () => {
    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.length).toBeGreaterThan(0);
    expect(data.error).toBeNull();
  });

  it('filters by category', async () => {
    const response = await GET(createRequest({
      searchParams: { category: 'music' },
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    data.data.forEach((qs: { category: string }) => {
      expect(qs.category).toBe('music');
    });
  });

  it('returns 400 for invalid category', async () => {
    const response = await GET(createRequest({
      searchParams: { category: 'invalid' },
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid category');
  });

  it('respects pagination parameters', async () => {
    const response = await GET(createRequest({
      searchParams: { page: '1', pageSize: '1' },
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.length).toBeLessThanOrEqual(1);
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(1);
  });
});

describe('POST /api/questions', () => {
  beforeEach(() => {
    questionSetStorage.clear();
  });

  it('creates a new question set with valid data', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: {
        name: 'My Question Set',
        description: 'A test question set',
        questions: [validQuestion],
        category: 'history',
      },
    }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data).toBeDefined();
    expect(data.data.name).toBe('My Question Set');
    expect(data.data.description).toBe('A test question set');
    expect(data.data.questions).toHaveLength(1);
    expect(data.data.category).toBe('history');
    expect(data.error).toBeNull();
  });

  it('creates a question set without optional fields', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: {
        name: 'Minimal Set',
        questions: [validQuestion],
      },
    }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.name).toBe('Minimal Set');
    expect(data.data.description).toBeNull();
    expect(data.data.category).toBeNull();
  });

  it('returns 400 when name is missing', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: {
        questions: [validQuestion],
      },
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required and must be a non-empty string');
  });

  it('returns 400 when questions array is empty', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: {
        name: 'Empty Set',
        questions: [],
      },
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Questions are required and must be a non-empty array');
  });

  it('returns 400 when question text is missing', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: {
        name: 'Invalid Set',
        questions: [{
          ...validQuestion,
          text: '',
        }],
      },
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Question 1: text is required and must be a non-empty string');
  });

  it('returns 400 when question type is invalid', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: {
        name: 'Invalid Set',
        questions: [{
          ...validQuestion,
          type: 'fill_blank',
        }],
      },
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Question 1: type must be 'multiple_choice' or 'true_false'");
  });

  it('returns 400 when correctAnswers is empty', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: {
        name: 'Invalid Set',
        questions: [{
          ...validQuestion,
          correctAnswers: [],
        }],
      },
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Question 1: correctAnswers is required and must be a non-empty array');
  });

  it('returns 400 when options has less than 2 items', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: {
        name: 'Invalid Set',
        questions: [{
          ...validQuestion,
          options: ['A'],
          optionTexts: ['Only one'],
        }],
      },
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Question 1: options is required and must have at least 2 items');
  });

  it('returns 400 when optionTexts length does not match options', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: {
        name: 'Invalid Set',
        questions: [{
          ...validQuestion,
          optionTexts: ['One', 'Two'],
        }],
      },
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Question 1: optionTexts must match options length');
  });

  it('returns 400 when question category is invalid', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: {
        name: 'Invalid Set',
        questions: [{
          ...validQuestion,
          category: 'sports',
        }],
      },
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Question 1: category must be one of');
  });

  it('returns 400 when set category is invalid', async () => {
    const response = await POST(createRequest({
      method: 'POST',
      body: {
        name: 'Invalid Set',
        questions: [validQuestion],
        category: 'sports',
      },
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid category');
  });

  it('assigns roundIndex to questions', async () => {
    const questions = Array.from({ length: 12 }, (_, i) => ({
      ...validQuestion,
      text: `Question ${i + 1}`,
    }));

    const response = await POST(createRequest({
      method: 'POST',
      body: {
        name: 'Multi-round Set',
        questions,
      },
    }));
    const data = await response.json();

    expect(response.status).toBe(201);
    // First 5 questions should be round 0, next 5 round 1, last 2 round 2
    expect(data.data.questions[0].roundIndex).toBe(0);
    expect(data.data.questions[4].roundIndex).toBe(0);
    expect(data.data.questions[5].roundIndex).toBe(1);
    expect(data.data.questions[10].roundIndex).toBe(2);
  });
});
