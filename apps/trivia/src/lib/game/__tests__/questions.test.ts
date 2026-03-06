import { describe, it, expect, vi } from 'vitest';
import type { TriviaGameState, Question, QuestionId } from '@/types';
import { redistributeQuestions, addQuestion, updateQuestion } from '../questions';

// =============================================================================
// MOCK normalizeCategoryId — return input as-is for deterministic testing
// =============================================================================

vi.mock('@/lib/categories', () => ({
  normalizeCategoryId: vi.fn((id: string) => id),
}));

// =============================================================================
// HELPERS
// =============================================================================

function makeQuestion(id: string, category: Question['category'], roundIndex: number = 0): Question {
  return {
    id: id as QuestionId,
    text: 'Sample question?',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctAnswers: ['A'],
    explanation: undefined,
    category,
    roundIndex,
  };
}

function makeState(overrides?: Partial<TriviaGameState>): TriviaGameState {
  return {
    status: 'setup',
    questions: [],
    selectedQuestionIndex: 0,
    displayQuestionIndex: null,
    currentRound: 0,
    totalRounds: 3,
    teams: [],
    teamAnswers: [],
    timer: { duration: 30, remaining: 30, isRunning: false },
    settings: {
      roundsCount: 2,
      questionsPerRound: 5,
      timerDuration: 30,
      timerAutoStart: false,
      timerVisible: true,
      ttsEnabled: false,
    },
    showScoreboard: false,
    emergencyBlank: false,
    ttsEnabled: false,
    audienceScene: 'waiting',
    sceneBeforePause: null,
    sceneTimestamp: 0,
    scoreDeltas: [],
    revealPhase: null,
    recapShowingAnswer: null,
    questionStartScores: {},
    roundScoringInProgress: false,
    roundScoringEntries: {},
    ...overrides,
  } as TriviaGameState;
}

// =============================================================================
// redistributeQuestions — by_count
// =============================================================================

describe('redistributeQuestions — by_count', () => {
  it('10 questions, 2 rounds: evenly split [0,0,0,0,0,1,1,1,1,1]', () => {
    const questions = Array.from({ length: 10 }, (_, i) =>
      makeQuestion(`q${i}`, 'general_knowledge', 0)
    );
    const state = makeState({ questions });
    const result = redistributeQuestions(state, 2, 'by_count');

    // ceil(10/2)=5 per round
    expect(result.questions.map((q) => q.roundIndex)).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
  });

  it('3 questions, 2 rounds: ceil(3/2)=2 per round → [0,0,1]', () => {
    const questions = Array.from({ length: 3 }, (_, i) =>
      makeQuestion(`q${i}`, 'general_knowledge', 0)
    );
    const state = makeState({ questions });
    const result = redistributeQuestions(state, 2, 'by_count');

    // ceil(3/2)=2 → first 2 in round 0, last 1 in round 1
    expect(result.questions.map((q) => q.roundIndex)).toEqual([0, 0, 1]);
  });

  it('7 questions, 3 rounds: ceil(7/3)=3 per round → [0,0,0,1,1,1,2]', () => {
    const questions = Array.from({ length: 7 }, (_, i) =>
      makeQuestion(`q${i}`, 'general_knowledge', 0)
    );
    const state = makeState({ questions });
    const result = redistributeQuestions(state, 3, 'by_count');

    expect(result.questions.map((q) => q.roundIndex)).toEqual([0, 0, 0, 1, 1, 1, 2]);
  });

  it('20 questions, 6 rounds: ceil(20/6)=4 per round, last round gets remainder', () => {
    const questions = Array.from({ length: 20 }, (_, i) =>
      makeQuestion(`q${i}`, 'general_knowledge', 0)
    );
    const state = makeState({ questions });
    const result = redistributeQuestions(state, 6, 'by_count');

    // ceil(20/6)=4 per round: 4,4,4,4,4,0? No — Math.min(floor(i/4), 5) caps at 5
    // 0-3→0, 4-7→1, 8-11→2, 12-15→3, 16-19→4 — that's only 5 rounds used
    // The last round (5) is empty. All 20 questions fit in rounds 0-4.
    const counts = [0, 0, 0, 0, 0, 0];
    for (const q of result.questions) counts[q.roundIndex]++;
    // Each of the used rounds gets 4, last round is empty
    expect(counts).toEqual([4, 4, 4, 4, 4, 0]);
  });
});

// =============================================================================
// redistributeQuestions — by_category
// =============================================================================

describe('redistributeQuestions — by_category', () => {
  // Sorted unique categories: geography(0), history(1), science(2)
  // With 3 rounds → each category gets its own round: geography→0, history→1, science→2
  it('3 categories, 3 rounds: each category gets its own round (sorted alphabetically)', () => {
    const questions = [
      makeQuestion('q0', 'science', 0),
      makeQuestion('q1', 'history', 0),
      makeQuestion('q2', 'science', 0),
      makeQuestion('q3', 'geography', 0),
    ];
    const state = makeState({ questions });
    const result = redistributeQuestions(state, 3, 'by_category');

    // geography→0, history→1, science→2
    expect(result.questions.map((q) => q.roundIndex)).toEqual([2, 1, 2, 0]);
  });

  // Sorted unique: geography(0), history(1), science(2)
  // With 2 rounds → round-robin: geography→0%2=0, history→1%2=1, science→2%2=0
  it('3 categories, 2 rounds: first 2 categories to rounds 0,1; third category wraps to round 0', () => {
    const questions = [
      makeQuestion('q0', 'science', 0),
      makeQuestion('q1', 'history', 0),
      makeQuestion('q2', 'geography', 0),
    ];
    const state = makeState({ questions });
    const result = redistributeQuestions(state, 2, 'by_category');

    // geography→0, history→1, science→0
    expect(result.questions.map((q) => q.roundIndex)).toEqual([0, 1, 0]);
  });

  // 2 categories, 4 rounds: each category gets 2 rounds (split questions)
  // geography(1q)→rounds[0,1], history(2q)→rounds[2,3]
  it('2 categories, 4 rounds: each category splits across 2 rounds', () => {
    const questions = [
      makeQuestion('q0', 'history', 0),
      makeQuestion('q1', 'geography', 0),
      makeQuestion('q2', 'history', 0),
    ];
    const state = makeState({ questions });
    const result = redistributeQuestions(state, 4, 'by_category');

    // geography gets rounds [0,1] (1q → round 0 only), history gets rounds [2,3]
    expect(result.questions.map((q) => q.roundIndex)).toEqual([2, 0, 3]);
  });

  // 2 categories (equal size), 3 rounds: larger-alphabet gets extra round by tie-break
  // art_literature(10q) gets 2 rounds, history(10q) gets 1 round
  it('2 equal categories, 3 rounds: one category splits to 2 rounds, other gets 1', () => {
    const questions = [
      ...Array.from({ length: 10 }, (_, i) => makeQuestion(`a${i}`, 'art_literature', 0)),
      ...Array.from({ length: 10 }, (_, i) => makeQuestion(`h${i}`, 'history', 0)),
    ];
    const state = makeState({ questions });
    const result = redistributeQuestions(state, 3, 'by_category');

    // art_literature→rounds[0,1] (5 each), history→round[2] (10)
    const counts = [0, 0, 0];
    for (const q of result.questions) counts[q.roundIndex]++;
    expect(counts).toEqual([5, 5, 10]);
  });

  // 2 equal categories, 4 rounds: each gets 2 rounds
  it('2 equal categories, 4 rounds: each splits evenly into 2 rounds', () => {
    const questions = [
      ...Array.from({ length: 10 }, (_, i) => makeQuestion(`a${i}`, 'art_literature', 0)),
      ...Array.from({ length: 10 }, (_, i) => makeQuestion(`h${i}`, 'history', 0)),
    ];
    const state = makeState({ questions });
    const result = redistributeQuestions(state, 4, 'by_category');

    const counts = [0, 0, 0, 0];
    for (const q of result.questions) counts[q.roundIndex]++;
    expect(counts).toEqual([5, 5, 5, 5]);
  });

  // 2 unequal categories, 4 rounds: proportional allocation gives more rounds to larger
  // science(18q), geography(2q) → science gets 3 rounds, geography gets 1
  it('2 unequal categories, 4 rounds: larger category gets proportionally more rounds', () => {
    const questions = [
      ...Array.from({ length: 18 }, (_, i) => makeQuestion(`s${i}`, 'science', 0)),
      ...Array.from({ length: 2 }, (_, i) => makeQuestion(`g${i}`, 'geography', 0)),
    ];
    const state = makeState({ questions });
    const result = redistributeQuestions(state, 4, 'by_category');

    // geography→round[0] (2q), science→rounds[1,2,3] (6,6,6)
    const counts = [0, 0, 0, 0];
    for (const q of result.questions) counts[q.roundIndex]++;
    expect(counts).toEqual([2, 6, 6, 6]);
  });
});

// =============================================================================
// Idempotency
// =============================================================================

describe('redistributeQuestions — idempotency', () => {
  it('by_count: returns the SAME state reference when assignments are already correct', () => {
    const questions = [
      makeQuestion('q0', 'general_knowledge', 0),
      makeQuestion('q1', 'general_knowledge', 0),
      makeQuestion('q2', 'general_knowledge', 1),
      makeQuestion('q3', 'general_knowledge', 1),
    ];
    const state = makeState({ questions });
    const result = redistributeQuestions(state, 2, 'by_count');

    expect(result).toBe(state);
  });

  it('by_category: returns the SAME state reference when assignments are already correct', () => {
    // Sorted unique: history(0%2=0), science(1%2=1)
    // So science→1, history→0 with roundsCount=2
    const questions = [
      makeQuestion('q0', 'science', 1),
      makeQuestion('q1', 'history', 0),
      makeQuestion('q2', 'science', 1),
    ];
    const state = makeState({ questions });
    const result = redistributeQuestions(state, 2, 'by_category');

    expect(result).toBe(state);
  });
});

// =============================================================================
// Guards
// =============================================================================

describe('redistributeQuestions — status guard', () => {
  it('returns the same state reference when status is "playing"', () => {
    const questions = Array.from({ length: 5 }, (_, i) =>
      makeQuestion(`q${i}`, 'science', 0)
    );
    const state = makeState({ status: 'playing', questions });
    const result = redistributeQuestions(state, 2, 'by_count');

    expect(result).toBe(state);
  });
});

describe('redistributeQuestions — empty guard', () => {
  it('returns the same state reference when questions array is empty', () => {
    const state = makeState({ questions: [] });
    const result = redistributeQuestions(state, 2, 'by_count');

    expect(result).toBe(state);
  });
});

// =============================================================================
// settings.roundsCount must not be mutated
// =============================================================================

describe('redistributeQuestions — settings immutability', () => {
  it('returned state has the same settings.roundsCount as input (not modified)', () => {
    const questions = Array.from({ length: 10 }, (_, i) =>
      makeQuestion(`q${i}`, 'general_knowledge', 0)
    );
    const state = makeState({
      questions,
      settings: {
        roundsCount: 2,
        questionsPerRound: 5,
        timerDuration: 30,
        timerAutoStart: false,
        timerVisible: true,
        ttsEnabled: false,
      },
    });
    const result = redistributeQuestions(state, 3, 'by_count');

    // Function must NOT write to settings.roundsCount
    expect(result.settings.roundsCount).toBe(2);
  });
});

// =============================================================================
// addQuestion — no longer writes settings.roundsCount
// =============================================================================

describe('addQuestion — settings.roundsCount not written', () => {
  it('result settings.roundsCount is unchanged even when question has a high roundIndex', () => {
    const state = makeState({
      settings: {
        roundsCount: 2,
        questionsPerRound: 5,
        timerDuration: 30,
        timerAutoStart: false,
        timerVisible: true,
        ttsEnabled: false,
      },
    });
    const newQuestion = makeQuestion('nq', 'science', 10);
    const result = addQuestion(state, newQuestion);

    // settings.roundsCount must remain 2 — the function no longer modifies it
    expect(result.settings.roundsCount).toBe(2);
  });
});

// =============================================================================
// updateQuestion — no longer writes settings.roundsCount
// =============================================================================

describe('updateQuestion — settings.roundsCount not written', () => {
  it('result settings.roundsCount is unchanged when updated question has a high roundIndex', () => {
    const initial = makeQuestion('q0', 'science', 0);
    const state = makeState({
      questions: [initial],
      settings: {
        roundsCount: 2,
        questionsPerRound: 5,
        timerDuration: 30,
        timerAutoStart: false,
        timerVisible: true,
        ttsEnabled: false,
      },
    });
    const updated = makeQuestion('q0', 'history', 99);
    const result = updateQuestion(state, 0, updated);

    // settings.roundsCount must remain 2 — the function no longer modifies it
    expect(result.settings.roundsCount).toBe(2);
  });
});
