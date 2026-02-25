import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  countTriviaTemplates,
  getTotalQuestionCount,
} from '../trivia-templates';
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
 * Creates a mock client for countTriviaTemplates
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
 * Creates a mock client for getTotalQuestionCount
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

describe('Trivia Template Count Functions', () => {
  const userId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('countTriviaTemplates', () => {
    it('returns exact count of templates for a user', async () => {
      const mockClient = createCountMockClient({ count: 3 });
      const result = await countTriviaTemplates(mockClient, userId);

      expect(result).toBe(3);
      expect(mockClient.from).toHaveBeenCalledWith('trivia_templates');
    });

    it('returns 0 when count is null', async () => {
      const mockClient = createCountMockClient({ count: null });
      const result = await countTriviaTemplates(mockClient, userId);

      expect(result).toBe(0);
    });

    it('throws on error', async () => {
      const mockClient = createCountMockClient({
        error: { message: 'DB error' },
      });

      await expect(countTriviaTemplates(mockClient, userId)).rejects.toEqual(
        expect.objectContaining({ message: 'DB error' })
      );
    });

    it('uses head:true to avoid fetching row data', async () => {
      const mockClient = createCountMockClient({ count: 7 });
      await countTriviaTemplates(mockClient, userId);

      const fromResult = (mockClient.from as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(fromResult.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });
  });

  describe('getTotalQuestionCount', () => {
    it('returns total question count across all templates', async () => {
      const mockClient = createQuestionCountMockClient({
        data: [
          { questions: [makeQuestion(), makeQuestion(), makeQuestion()] },
          { questions: [makeQuestion()] },
        ],
      });

      const result = await getTotalQuestionCount(mockClient, userId);
      expect(result).toBe(4);
    });

    it('returns 0 when user has no templates', async () => {
      const mockClient = createQuestionCountMockClient({ data: [] });

      const result = await getTotalQuestionCount(mockClient, userId);
      expect(result).toBe(0);
    });

    it('handles templates with empty question arrays', async () => {
      const mockClient = createQuestionCountMockClient({
        data: [
          { questions: [] },
          { questions: [makeQuestion(), makeQuestion()] },
          { questions: [] },
        ],
      });

      const result = await getTotalQuestionCount(mockClient, userId);
      expect(result).toBe(2);
    });

    it('only selects the questions column', async () => {
      const mockClient = createQuestionCountMockClient({ data: [] });
      await getTotalQuestionCount(mockClient, userId);

      const fromResult = (mockClient.from as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(fromResult.select).toHaveBeenCalledWith('questions');
    });

    it('filters by user_id', async () => {
      const mockClient = createQuestionCountMockClient({ data: [] });
      await getTotalQuestionCount(mockClient, userId);

      const fromResult = (mockClient.from as ReturnType<typeof vi.fn>).mock.results[0].value;
      const selectResult = fromResult.select.mock.results[0].value;
      expect(selectResult.eq).toHaveBeenCalledWith('user_id', userId);
    });

    it('throws on error', async () => {
      const mockClient = createQuestionCountMockClient({
        error: { message: 'DB error' },
      });

      await expect(getTotalQuestionCount(mockClient, userId)).rejects.toEqual(
        expect.objectContaining({ message: 'DB error' })
      );
    });

    it('handles null data gracefully', async () => {
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

      const result = await getTotalQuestionCount(mockClient, userId);
      expect(result).toBe(0);
    });
  });
});
