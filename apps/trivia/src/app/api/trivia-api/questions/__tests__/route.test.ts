import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks -- matching existing route.test.ts patterns exactly
// ---------------------------------------------------------------------------

vi.mock('@joolie-boolie/auth', () => ({
  getApiUser: vi.fn(),
  createAuthenticatedClient: vi.fn(),
}));

vi.mock('@joolie-boolie/error-tracking/server-logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@/lib/trivia-api/client', () => ({
  fetchTriviaApiQuestions: vi.fn(),
}));

vi.mock('@/lib/trivia-api/cache', () => ({
  getCached: vi.fn(),
  setCached: vi.fn(),
  buildCacheKey: vi.fn(),
}));

vi.mock('@/lib/questions/api-adapter', () => ({
  triviaApiQuestionsToQuestions: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET } from '../route';
import { getApiUser } from '@joolie-boolie/auth';
import { fetchTriviaApiQuestions } from '@/lib/trivia-api/client';
import { getCached, setCached } from '@/lib/trivia-api/cache';
import { triviaApiQuestionsToQuestions } from '@/lib/questions/api-adapter';

import { SCIENCE_HISTORY_BATCH } from '@/lib/trivia-api/__fixtures__/trivia-api';

// Cast mocks -- matching existing codebase pattern
const mockGetApiUser = getApiUser as ReturnType<typeof vi.fn>;
const mockFetch = fetchTriviaApiQuestions as ReturnType<typeof vi.fn>;
const mockGetCached = getCached as ReturnType<typeof vi.fn>;
const mockSetCached = setCached as ReturnType<typeof vi.fn>;
const mockAdapt = triviaApiQuestionsToQuestions as ReturnType<typeof vi.fn>;

const MOCK_USER = { id: 'user-123', email: 'test@example.com' };

const MOCK_ADAPTED = [
  {
    id: 'q-1',
    text: 'What is Nanotechnology the study of?',
    type: 'multiple_choice',
    correctAnswers: ['A'],
    options: ['A', 'B', 'C', 'D'],
    optionTexts: [
      'the study and design of machines at the molecular level',
      'things in order of time or time',
      'movement in relation to human anatomy; a branch of medicine',
      'wine',
    ],
    category: 'science',
    roundIndex: 0,
  },
];

// ---------------------------------------------------------------------------
// Helper -- matches existing createMockRequest pattern
// ---------------------------------------------------------------------------

function createMockRequest(queryString = ''): NextRequest {
  const url = `http://localhost:3001/api/trivia-api/questions${queryString ? `?${queryString}` : ''}`;
  const request = new NextRequest(url);
  request.cookies.set('jb_access_token', 'test-jwt-token');
  return request;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/trivia-api/questions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCached.mockReturnValue(null);
  });

  // -----------------------------------------------------------------------
  // Authentication
  // -----------------------------------------------------------------------

  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetApiUser.mockResolvedValue(null);

      const request = createMockRequest('limit=5');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('proceeds for authenticated user', async () => {
      mockGetApiUser.mockResolvedValue(MOCK_USER);
      mockFetch.mockResolvedValue({ ok: true, questions: SCIENCE_HISTORY_BATCH });
      mockAdapt.mockReturnValue(MOCK_ADAPTED);

      const request = createMockRequest('limit=5');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // Query parameter validation
  // -----------------------------------------------------------------------

  describe('query parameter validation', () => {
    it('returns 400 for non-integer limit', async () => {
      mockGetApiUser.mockResolvedValue(MOCK_USER);

      const response = await GET(createMockRequest('limit=abc'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('limit');
    });

    it('returns 400 for limit below 1', async () => {
      mockGetApiUser.mockResolvedValue(MOCK_USER);

      const response = await GET(createMockRequest('limit=0'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('limit');
    });

    it('returns 400 for limit above 50', async () => {
      mockGetApiUser.mockResolvedValue(MOCK_USER);

      const response = await GET(createMockRequest('limit=51'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('limit');
    });

    it('returns 400 for invalid category', async () => {
      mockGetApiUser.mockResolvedValue(MOCK_USER);

      const response = await GET(
        createMockRequest('limit=5&categories=science,invalid_cat')
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid categories');
    });

    it('returns 400 for invalid difficulty', async () => {
      mockGetApiUser.mockResolvedValue(MOCK_USER);

      const response = await GET(
        createMockRequest('limit=5&difficulties=super_hard')
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('difficult');
    });

    it('uses default limit of 10 when not specified', async () => {
      mockGetApiUser.mockResolvedValue(MOCK_USER);
      mockFetch.mockResolvedValue({ ok: true, questions: SCIENCE_HISTORY_BATCH });
      mockAdapt.mockReturnValue(MOCK_ADAPTED);

      const response = await GET(createMockRequest(''));

      expect(response.status).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // Cache behavior
  // -----------------------------------------------------------------------

  describe('cache behavior', () => {
    it('returns cached data without calling external API', async () => {
      mockGetApiUser.mockResolvedValue(MOCK_USER);
      mockGetCached.mockReturnValue(SCIENCE_HISTORY_BATCH);
      mockAdapt.mockReturnValue(MOCK_ADAPTED);

      const response = await GET(createMockRequest('limit=5'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.cached).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('fetches from API on cache miss and stores result', async () => {
      mockGetApiUser.mockResolvedValue(MOCK_USER);
      mockGetCached.mockReturnValue(null);
      mockFetch.mockResolvedValue({ ok: true, questions: SCIENCE_HISTORY_BATCH });
      mockAdapt.mockReturnValue(MOCK_ADAPTED);

      const response = await GET(createMockRequest('limit=5'));

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockSetCached).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Success response
  // -----------------------------------------------------------------------

  describe('success response', () => {
    it('returns questions with meta on success', async () => {
      mockGetApiUser.mockResolvedValue(MOCK_USER);
      mockFetch.mockResolvedValue({ ok: true, questions: SCIENCE_HISTORY_BATCH });
      mockAdapt.mockReturnValue(MOCK_ADAPTED);

      const response = await GET(createMockRequest('limit=5'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.questions).toEqual(MOCK_ADAPTED);
      expect(data.meta.source).toBe('the-trivia-api');
      expect(data.meta.cached).toBe(false);
      expect(data.meta.totalFetched).toBe(MOCK_ADAPTED.length);
    });

    it('returns empty array when API returns empty', async () => {
      mockGetApiUser.mockResolvedValue(MOCK_USER);
      mockFetch.mockResolvedValue({ ok: true, questions: [] });
      mockAdapt.mockReturnValue([]);

      const response = await GET(createMockRequest('limit=5'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.questions).toEqual([]);
      expect(data.meta.totalFetched).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('returns 503 when external API times out', async () => {
      mockGetApiUser.mockResolvedValue(MOCK_USER);
      mockFetch.mockResolvedValue({
        ok: false,
        error: 'Trivia API request timed out after 5000ms',
      });

      const response = await GET(createMockRequest('limit=5'));

      expect(response.status).toBe(503);
    });

    it('returns 502 when external API returns non-200', async () => {
      mockGetApiUser.mockResolvedValue(MOCK_USER);
      mockFetch.mockResolvedValue({
        ok: false,
        error: 'Trivia API returned 500: Server Error',
        statusCode: 500,
      });

      const response = await GET(createMockRequest('limit=5'));

      expect(response.status).toBe(502);
    });

    it('returns 500 on unexpected error', async () => {
      mockGetApiUser.mockResolvedValue(MOCK_USER);
      mockFetch.mockImplementation(() => {
        throw new Error('Unexpected crash');
      });

      const response = await GET(createMockRequest('limit=5'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
