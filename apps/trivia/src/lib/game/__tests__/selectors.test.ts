import { describe, it, expect, vi, beforeEach } from 'vitest';
import { derivePerRoundBreakdown } from '../selectors';
import type { Question } from '@/types';

// Mock normalizeCategoryId to be an identity function for testing simplicity.
// This avoids any dependency on category config internals.
vi.mock('@/lib/categories', () => ({
  normalizeCategoryId: (id: string) => id,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQuestion(
  id: string,
  roundIndex: number,
  category = 'general_knowledge'
): Question {
  return {
    id: id as import('@/types').QuestionId,
    text: `Question ${id}`,
    type: 'multiple_choice',
    correctAnswers: ['A'],
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['Alpha', 'Beta', 'Gamma', 'Delta'],
    category: category as Question['category'],
    roundIndex,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('derivePerRoundBreakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: empty questions, By Category mode
  it('returns roundsCount entries all with isMatch: false and totalCount: 0 (By Category, empty)', () => {
    const result = derivePerRoundBreakdown([], 3, true);

    expect(result).toHaveLength(3);
    for (const entry of result) {
      expect(entry.isMatch).toBe(false);
      expect(entry.totalCount).toBe(0);
      expect(entry.categories).toHaveLength(0);
    }
    expect(result.map(e => e.roundIndex)).toEqual([0, 1, 2]);
  });

  // Test 2: empty questions, By Count mode — expectedCount should be 0 (no questions)
  it('returns entries with expectedCount 0 when empty (By Count)', () => {
    const result = derivePerRoundBreakdown([], 3, false);

    expect(result).toHaveLength(3);
    for (const entry of result) {
      expect(entry.isMatch).toBe(false);
      expect(entry.totalCount).toBe(0);
      expect(entry.expectedCount).toBe(0);
    }
  });

  // Test 3: By Count mode — isMatch true for any non-empty round
  it('sets isMatch correctly in By Count mode', () => {
    const questions = [
      // Round 0: 5 questions
      makeQuestion('q1', 0),
      makeQuestion('q2', 0),
      makeQuestion('q3', 0),
      makeQuestion('q4', 0),
      makeQuestion('q5', 0),
      // Round 1: 4 questions
      makeQuestion('q6', 1),
      makeQuestion('q7', 1),
      makeQuestion('q8', 1),
      makeQuestion('q9', 1),
    ];

    // 9 questions across 3 rounds → ceil(9/3) = 3 expected per round
    const result = derivePerRoundBreakdown(questions, 3, false);

    expect(result).toHaveLength(3);
    expect(result[0].isMatch).toBe(true);   // 5 > 0
    expect(result[0].totalCount).toBe(5);
    expect(result[0].expectedCount).toBe(3); // ceil(9/3)

    expect(result[1].isMatch).toBe(true);   // 4 > 0
    expect(result[1].totalCount).toBe(4);

    expect(result[2].isMatch).toBe(false);  // 0 — empty round
    expect(result[2].totalCount).toBe(0);
  });

  // Test 4: By Category mode — isMatch true for any non-empty round, false for empty
  it('sets isMatch correctly in By Category mode', () => {
    const questions = [
      // Round 0: 1 question (non-empty → match)
      makeQuestion('q1', 0, 'science'),
      // Round 1: 0 questions (empty → no match)
      // Round 2: 3 questions (non-empty → match)
      makeQuestion('q2', 2, 'history'),
      makeQuestion('q3', 2, 'history'),
      makeQuestion('q4', 2, 'geography'),
    ];

    const result = derivePerRoundBreakdown(questions, 3, true);

    expect(result).toHaveLength(3);
    expect(result[0].isMatch).toBe(true);   // 1 > 0
    expect(result[1].isMatch).toBe(false);  // 0 is not > 0
    expect(result[2].isMatch).toBe(true);   // 3 > 0
  });

  // Test 4b: By Category mode expectedCount matches totalCount
  it('sets expectedCount equal to totalCount in By Category mode', () => {
    const questions = [
      makeQuestion('q1', 0, 'science'),
      makeQuestion('q2', 0, 'history'),
    ];

    const result = derivePerRoundBreakdown(questions, 1, true);

    expect(result[0].totalCount).toBe(2);
    expect(result[0].expectedCount).toBe(2);
  });

  // Test 5: Categories are aggregated by categoryId (same category counts accumulate)
  it('aggregates questions by category — same category adds up, not duplicated', () => {
    const questions = [
      makeQuestion('q1', 0, 'science'),
      makeQuestion('q2', 0, 'science'),   // same category as q1
      makeQuestion('q3', 0, 'history'),
    ];

    const result = derivePerRoundBreakdown(questions, 1, false);

    expect(result).toHaveLength(1);
    const { categories } = result[0];

    // Should have 2 unique categories, not 3 entries
    expect(categories).toHaveLength(2);

    const scienceCat = categories.find(c => c.categoryId === 'science');
    const historyCat = categories.find(c => c.categoryId === 'history');

    expect(scienceCat).toBeDefined();
    expect(scienceCat!.questionCount).toBe(2);

    expect(historyCat).toBeDefined();
    expect(historyCat!.questionCount).toBe(1);
  });

  // Test 6: roundIndex values are correct in output
  it('assigns correct roundIndex values to each entry', () => {
    const questions = [makeQuestion('q1', 0), makeQuestion('q2', 2)];
    const result = derivePerRoundBreakdown(questions, 4, false);

    expect(result.map(e => e.roundIndex)).toEqual([0, 1, 2, 3]);
  });

  // Test 7: By Count mode expectedCount is ceil(total/rounds)
  it('computes expectedCount as ceil(total/rounds) in By Count mode', () => {
    const questions = [
      makeQuestion('q1', 0),
      makeQuestion('q2', 0),
      makeQuestion('q3', 0),
      makeQuestion('q4', 1),
      makeQuestion('q5', 1),
    ];

    // 5 questions, 2 rounds → ceil(5/2) = 3
    const result = derivePerRoundBreakdown(questions, 2, false);
    expect(result[0].expectedCount).toBe(3);
    expect(result[1].expectedCount).toBe(3);
  });
});
