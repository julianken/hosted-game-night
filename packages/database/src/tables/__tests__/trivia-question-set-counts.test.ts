import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  countTriviaQuestionSets,
  getQuestionSetTotalCount,
} from '../trivia-question-sets';
import type { TypedSupabaseClient } from '../../client';
import type { TriviaQuestion } from '../../types';

// =============================================================================
// Mock Setup
// =============================================================================

function makeQuestion(overrides: Partial<TriviaQuestion> = {}): TriviaQuestion {
  return {
    question: 'What is 2+2?',
    options: ['3', '4', '5'],
    correctIndex: 1,
    ...overrides,
  };
}

/**
 * Creates a mock client specifically for countTriviaQuestionSets
 * which uses .select('*', { count: 'exact', head: true }).eq()
 */
function createCountMockClient(options: {
  count?: number | null;
  error?: { code?: string; message?: string };
}): TypedSupabaseClient {
  const { count, error } = options;

  const mockQueryBuilder = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        count: count ?? null,
        error: error ?? null,
      }),
    }),
  };

  return {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
  } as unknown as TypedSupabaseClient;
}

/**
 * Creates a mock client for getQuestionSetTotalCount
 * which uses fromTable().select('questions').eq('user_id', userId)
 */
function createQuestionCountMockClient(options: {
  data?: Array<{ questions: TriviaQuestion[] }>;
  error?: { code?: string; message?: string };
}): TypedSupabaseClient {
  const { data, error } = options;

  const mockQueryBuilder = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: data ?? [],
        error: error ?? null,
      }),
    }),
  };

  return {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
  } as unknown as TypedSupabaseClient;
}

// =============================================================================
// Tests
// =============================================================================

describe('Trivia Question Set Count Functions', () => {
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('countTriviaQuestionSets', () => {
    it('returns exact count of question sets for a user', async () => {
      const mockClient = createCountMockClient({ count: 5 });
      const result = await countTriviaQuestionSets(mockClient, userId);

      expect(result).toBe(5);
      expect(mockClient.from).toHaveBeenCalledWith('trivia_question_sets');
    });

    it('returns 0 when count is null', async () => {
      const mockClient = createCountMockClient({ count: null });
      const result = await countTriviaQuestionSets(mockClient, userId);

      expect(result).toBe(0);
    });

    it('throws on error', async () => {
      const mockClient = createCountMockClient({
        error: { message: 'DB error' },
      });

      await expect(countTriviaQuestionSets(mockClient, userId)).rejects.toEqual(
        expect.objectContaining({ message: 'DB error' })
      );
    });

    it('uses head:true to avoid fetching row data', async () => {
      const mockClient = createCountMockClient({ count: 3 });
      await countTriviaQuestionSets(mockClient, userId);

      const fromResult = (mockClient.from as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(fromResult.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });
  });

  describe('getQuestionSetTotalCount', () => {
    it('returns total question count across all sets', async () => {
      const mockClient = createQuestionCountMockClient({
        data: [
          { questions: [makeQuestion(), makeQuestion(), makeQuestion()] },
          { questions: [makeQuestion(), makeQuestion()] },
        ],
      });

      const result = await getQuestionSetTotalCount(mockClient, userId);
      expect(result).toBe(5);
    });

    it('returns 0 when user has no question sets', async () => {
      const mockClient = createQuestionCountMockClient({ data: [] });

      const result = await getQuestionSetTotalCount(mockClient, userId);
      expect(result).toBe(0);
    });

    it('handles question sets with empty question arrays', async () => {
      const mockClient = createQuestionCountMockClient({
        data: [
          { questions: [] },
          { questions: [makeQuestion()] },
          { questions: [] },
        ],
      });

      const result = await getQuestionSetTotalCount(mockClient, userId);
      expect(result).toBe(1);
    });

    it('only selects the questions column', async () => {
      const mockClient = createQuestionCountMockClient({ data: [] });
      await getQuestionSetTotalCount(mockClient, userId);

      const fromResult = (mockClient.from as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(fromResult.select).toHaveBeenCalledWith('questions');
    });

    it('filters by user_id', async () => {
      const mockClient = createQuestionCountMockClient({ data: [] });
      await getQuestionSetTotalCount(mockClient, userId);

      const fromResult = (mockClient.from as ReturnType<typeof vi.fn>).mock.results[0].value;
      const selectResult = fromResult.select.mock.results[0].value;
      expect(selectResult.eq).toHaveBeenCalledWith('user_id', userId);
    });

    it('throws on error', async () => {
      const mockClient = createQuestionCountMockClient({
        error: { message: 'DB error' },
      });

      await expect(getQuestionSetTotalCount(mockClient, userId)).rejects.toEqual(
        expect.objectContaining({ message: 'DB error' })
      );
    });

    it('handles null data gracefully', async () => {
      // Simulate null data from Supabase
      const mockQueryBuilder = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      };
      const mockClient = {
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      } as unknown as TypedSupabaseClient;

      const result = await getQuestionSetTotalCount(mockClient, userId);
      expect(result).toBe(0);
    });
  });
});
