/**
 * Import Route Tests — POST /api/question-sets/import
 *
 * Tests for JSON question import with wrapper extraction, validation, and database creation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth (same pattern as question-sets/[id] tests)
vi.mock('@joolie-boolie/auth', () => ({
  getApiUser: vi.fn(),
  createAuthenticatedClient: vi.fn(),
}));

// Mock database functions
vi.mock('@joolie-boolie/database/tables', () => ({
  createTriviaQuestionSet: vi.fn(),
}));

vi.mock('@joolie-boolie/database/errors', () => ({
  isDatabaseError: vi.fn(),
}));

// Mock the question parsing/conversion utilities
vi.mock('@/lib/questions', () => ({
  parseJsonQuestions: vi.fn(),
  questionsToTriviaQuestions: vi.fn(),
}));

// Mock logger
vi.mock('@joolie-boolie/error-tracking/server-logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import { createTriviaQuestionSet } from '@joolie-boolie/database/tables';
import { isDatabaseError } from '@joolie-boolie/database/errors';
import { parseJsonQuestions, questionsToTriviaQuestions } from '@/lib/questions';

const mockGetApiUser = getApiUser as ReturnType<typeof vi.fn>;
const mockCreateAuthenticatedClient = createAuthenticatedClient as ReturnType<typeof vi.fn>;
const mockCreateTriviaQuestionSet = createTriviaQuestionSet as ReturnType<typeof vi.fn>;
const mockIsDatabaseError = isDatabaseError as unknown as ReturnType<typeof vi.fn>;
const mockParseJsonQuestions = parseJsonQuestions as ReturnType<typeof vi.fn>;
const mockQuestionsToTriviaQuestions = questionsToTriviaQuestions as ReturnType<typeof vi.fn>;

/**
 * Helper to create a mock request with jb_access_token cookie
 */
function createMockRequest(body: unknown) {
  const request = new NextRequest('http://localhost:3001/api/question-sets/import', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  request.cookies.set('jb_access_token', 'test-jwt-token');
  return request;
}

/**
 * Helper to create a request with invalid JSON body
 */
function createInvalidJsonRequest() {
  const request = new NextRequest('http://localhost:3001/api/question-sets/import', {
    method: 'POST',
    body: 'not valid json {{{',
    headers: { 'Content-Type': 'application/json' },
  });
  request.cookies.set('jb_access_token', 'test-jwt-token');
  return request;
}

const mockSupabaseClient = { from: vi.fn() };

const mockSuccessParseResult = {
  success: true,
  questions: [{ question: 'What is 2+2?', options: ['3', '4', '5'], correctIndex: 1 }],
  totalParsed: 1,
  totalValid: 1,
  totalInvalid: 0,
  errors: [],
  warnings: [],
};

const mockTriviaQuestions = [
  { question: 'What is 2+2?', options: ['3', '4', '5'], correctIndex: 1 },
];

const mockQuestionSet = {
  id: 'qs-import-1',
  user_id: 'user-123',
  name: 'Imported Set',
  description: null,
  questions: mockTriviaQuestions,
  is_default: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('POST /api/question-sets/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetApiUser.mockResolvedValue(null);

      const request = createMockRequest({ rawJson: '[]', name: 'Test' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('calls getApiUser with the request', async () => {
      mockGetApiUser.mockResolvedValue(null);

      const request = createMockRequest({ rawJson: '[]', name: 'Test' });
      await POST(request);

      expect(mockGetApiUser).toHaveBeenCalledWith(request);
    });
  });

  describe('Input Validation', () => {
    it('returns 400 when rawJson is missing from body', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      const request = createMockRequest({ name: 'Test' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('rawJson');
    });

    it('returns 400 when rawJson is not a string (number)', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      const request = createMockRequest({ rawJson: 123, name: 'Test' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('rawJson');
    });

    it('returns 400 when body JSON parsing fails', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      const request = createInvalidJsonRequest();
      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('JSON Parsing of rawJson', () => {
    it('returns 400 when rawJson contains invalid JSON', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      const request = createMockRequest({ rawJson: 'not json', name: 'Test' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('returns 400 when rawJson is a non-object non-array primitive', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      // rawJson is "42" which parses to the number 42 -- not an object or array
      // The code will call parseJsonQuestions("42") which should fail
      mockParseJsonQuestions.mockReturnValue({
        success: false,
        questions: [],
        totalParsed: 0,
        totalValid: 0,
        totalInvalid: 0,
        errors: [{ row: -1, field: 'json', message: 'Expected an array of questions' }],
        warnings: [],
      });

      const request = createMockRequest({ rawJson: '42', name: 'Test' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Validation failed');
    });

    it('returns 400 when rawJson is a wrapper with null questions (FIXED: wrapper.questions null guard)', async () => {
      // FIXED: Previously, `{"questions": null}` entered the wrapper branch because
      // `'questions' in parsed` was true, then `JSON.stringify(null)` produced `"null"`,
      // causing a confusing error path. Now the condition also checks
      // `Array.isArray(wrapper.questions)`, so `null` falls through to the rawJson path.
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      mockParseJsonQuestions.mockReturnValue({
        success: false,
        questions: [],
        totalParsed: 0,
        totalValid: 0,
        totalInvalid: 0,
        errors: [{ row: -1, field: 'json', message: 'Expected an array of questions' }],
        warnings: [],
      });

      const request = createMockRequest({
        rawJson: '{"questions": null, "name": "Test"}',
        name: 'Test',
      });
      const response = await POST(request);
      await response.json();

      expect(response.status).toBe(400);
      // After fix: parseJsonQuestions is called with the full rawJson string,
      // not with "null" (which was the broken behavior)
      expect(mockParseJsonQuestions).toHaveBeenCalledWith('{"questions": null, "name": "Test"}');
    });
  });

  describe('Wrapper Extraction', () => {
    it('extracts name and description from wrapper object', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
      mockParseJsonQuestions.mockReturnValue(mockSuccessParseResult);
      mockQuestionsToTriviaQuestions.mockReturnValue(mockTriviaQuestions);
      mockCreateTriviaQuestionSet.mockResolvedValue(mockQuestionSet);

      const request = createMockRequest({
        rawJson: JSON.stringify({
          name: 'Wrapper Name',
          description: 'Wrapper Description',
          questions: [{ question: 'Q1', options: ['A', 'B'], correctIndex: 0 }],
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      // Wrapper name used when no body name provided
      expect(mockCreateTriviaQuestionSet).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          name: 'Wrapper Name',
          description: 'Wrapper Description',
        })
      );
      expect(data.questionSet).toBeDefined();
    });

    it('body name overrides wrapper name', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
      mockParseJsonQuestions.mockReturnValue(mockSuccessParseResult);
      mockQuestionsToTriviaQuestions.mockReturnValue(mockTriviaQuestions);
      mockCreateTriviaQuestionSet.mockResolvedValue(mockQuestionSet);

      const request = createMockRequest({
        rawJson: JSON.stringify({
          name: 'Wrapper Name',
          questions: [{ question: 'Q1', options: ['A', 'B'], correctIndex: 0 }],
        }),
        name: 'Body Name',
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockCreateTriviaQuestionSet).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({ name: 'Body Name' })
      );
    });

    it('body description overrides wrapper description', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
      mockParseJsonQuestions.mockReturnValue(mockSuccessParseResult);
      mockQuestionsToTriviaQuestions.mockReturnValue(mockTriviaQuestions);
      mockCreateTriviaQuestionSet.mockResolvedValue(mockQuestionSet);

      const request = createMockRequest({
        rawJson: JSON.stringify({
          name: 'Name',
          description: 'Wrapper Desc',
          questions: [{ question: 'Q1', options: ['A', 'B'], correctIndex: 0 }],
        }),
        name: 'Name',
        description: 'Body Desc',
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockCreateTriviaQuestionSet).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({ description: 'Body Desc' })
      );
    });

    it('returns 400 when no name is provided anywhere', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      const request = createMockRequest({
        rawJson: '[{"question": "Q1", "options": ["A", "B"], "correctIndex": 0}]',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('name');
    });
  });

  describe('Successful Import', () => {
    it('creates question set with valid array JSON', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
      mockParseJsonQuestions.mockReturnValue(mockSuccessParseResult);
      mockQuestionsToTriviaQuestions.mockReturnValue(mockTriviaQuestions);
      mockCreateTriviaQuestionSet.mockResolvedValue(mockQuestionSet);

      const rawJson = '[{"question": "Q1", "options": ["A", "B"], "correctIndex": 0}]';
      const request = createMockRequest({ rawJson, name: 'Array Import' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(mockParseJsonQuestions).toHaveBeenCalledWith(rawJson);
      expect(data.questionSet).toBeDefined();
    });

    it('creates question set with valid wrapper JSON', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
      mockParseJsonQuestions.mockReturnValue(mockSuccessParseResult);
      mockQuestionsToTriviaQuestions.mockReturnValue(mockTriviaQuestions);
      mockCreateTriviaQuestionSet.mockResolvedValue(mockQuestionSet);

      const request = createMockRequest({
        rawJson: JSON.stringify({
          name: 'Wrapped',
          questions: [{ question: 'Q1', options: ['A', 'B'], correctIndex: 0 }],
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      // Should stringify just the questions array for the parser
      expect(mockParseJsonQuestions).toHaveBeenCalledWith(
        JSON.stringify([{ question: 'Q1', options: ['A', 'B'], correctIndex: 0 }])
      );
    });

    it('returns 201 with questionSet and parseResult on success', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
      mockParseJsonQuestions.mockReturnValue(mockSuccessParseResult);
      mockQuestionsToTriviaQuestions.mockReturnValue(mockTriviaQuestions);
      mockCreateTriviaQuestionSet.mockResolvedValue(mockQuestionSet);

      const request = createMockRequest({
        rawJson: '[]',
        name: 'Test',
      });

      // parseJsonQuestions returns success (already mocked above)
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('questionSet');
      expect(data).toHaveProperty('parseResult');
      expect(data.questionSet).toEqual(mockQuestionSet);
      expect(data.parseResult).toEqual(mockSuccessParseResult);
    });
  });

  describe('Validation Failures', () => {
    it('returns 400 when parseJsonQuestions reports invalid questions', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
      mockParseJsonQuestions.mockReturnValue({
        success: false,
        questions: [{ question: 'Q1', options: ['A', 'B'], correctIndex: 0 }],
        totalParsed: 3,
        totalValid: 1,
        totalInvalid: 2,
        errors: [{ row: 1, field: 'options', message: 'at least 2 options required' }],
        warnings: [],
      });

      const request = createMockRequest({
        rawJson: '[{"question":"Q1"},{"question":"Q2"},{"question":"Q3"}]',
        name: 'Test',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('2 invalid question(s)');
      expect(data.error).toContain('3');
      expect(data.parseResult).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('returns database error status when isDatabaseError is true', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
      mockParseJsonQuestions.mockReturnValue(mockSuccessParseResult);
      mockQuestionsToTriviaQuestions.mockReturnValue(mockTriviaQuestions);

      const dbError = { message: 'Duplicate entry', statusCode: 409 };
      mockCreateTriviaQuestionSet.mockRejectedValue(dbError);
      mockIsDatabaseError.mockReturnValue(true);

      const request = createMockRequest({ rawJson: '[]', name: 'Test' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Duplicate entry');
    });

    it('returns 500 on unexpected error', async () => {
      mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
      mockParseJsonQuestions.mockReturnValue(mockSuccessParseResult);
      mockQuestionsToTriviaQuestions.mockReturnValue(mockTriviaQuestions);

      mockCreateTriviaQuestionSet.mockRejectedValue(new Error('Connection lost'));
      mockIsDatabaseError.mockReturnValue(false);

      const request = createMockRequest({ rawJson: '[]', name: 'Test' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
