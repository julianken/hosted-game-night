import { describe, it, expect, vi } from 'vitest';
import type { Question, QuestionId } from '@/types';
import type { TriviaQuestion } from '@/types/trivia-question';

// Mock uuid
vi.mock('uuid', () => ({ v4: () => 'test-uuid' }));

import {
  questionToTriviaQuestion,
  triviaQuestionToQuestion,
  questionsToTriviaQuestions,
  triviaQuestionsToQuestions,
} from '../conversion';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mcQuestion: Question = {
  id: 'q1' as QuestionId,
  text: 'What is the capital of France?',
  type: 'multiple_choice',
  correctAnswers: ['B'],
  options: ['A', 'B', 'C', 'D'],
  optionTexts: ['London', 'Paris', 'Berlin', 'Madrid'],
  category: 'geography',
  explanation: 'Paris is the capital of France.',
  roundIndex: 1,
};

const tfQuestion: Question = {
  id: 'q2' as QuestionId,
  text: 'The Earth is flat.',
  type: 'true_false',
  correctAnswers: ['False'],
  options: ['True', 'False'],
  optionTexts: ['True', 'False'],
  category: 'science',
  roundIndex: 0,
};

const mcTriviaQuestion: TriviaQuestion = {
  question: 'What is the capital of France?',
  options: ['London', 'Paris', 'Berlin', 'Madrid'],
  correctIndex: 1,
  category: 'geography',
};

const tfTriviaQuestion: TriviaQuestion = {
  question: 'The Earth is flat.',
  options: ['True', 'False'],
  correctIndex: 1,
  category: 'science',
};

// ---------------------------------------------------------------------------
// Question -> TriviaQuestion
// ---------------------------------------------------------------------------

describe('questionToTriviaQuestion', () => {
  it('converts multiple choice question', () => {
    const result = questionToTriviaQuestion(mcQuestion);
    expect(result).toEqual({
      question: 'What is the capital of France?',
      options: ['London', 'Paris', 'Berlin', 'Madrid'],
      correctIndex: 1,
      category: 'geography',
    });
  });

  it('converts true/false question', () => {
    const result = questionToTriviaQuestion(tfQuestion);
    expect(result).toEqual({
      question: 'The Earth is flat.',
      options: ['True', 'False'],
      correctIndex: 1,
      category: 'science',
    });
  });

  it('converts correctAnswers A -> 0', () => {
    const q: Question = { ...mcQuestion, correctAnswers: ['A'] };
    expect(questionToTriviaQuestion(q).correctIndex).toBe(0);
  });

  it('converts correctAnswers C -> 2', () => {
    const q: Question = { ...mcQuestion, correctAnswers: ['C'] };
    expect(questionToTriviaQuestion(q).correctIndex).toBe(2);
  });

  it('converts correctAnswers D -> 3', () => {
    const q: Question = { ...mcQuestion, correctAnswers: ['D'] };
    expect(questionToTriviaQuestion(q).correctIndex).toBe(3);
  });

  it('preserves category', () => {
    const q: Question = { ...mcQuestion, category: 'entertainment' };
    expect(questionToTriviaQuestion(q).category).toBe('entertainment');
  });
});

// ---------------------------------------------------------------------------
// TriviaQuestion -> Question
// ---------------------------------------------------------------------------

describe('triviaQuestionToQuestion', () => {
  it('converts multiple choice TriviaQuestion', () => {
    const result = triviaQuestionToQuestion(mcTriviaQuestion);
    expect(result.text).toBe('What is the capital of France?');
    expect(result.type).toBe('multiple_choice');
    expect(result.correctAnswers).toEqual(['B']);
    expect(result.options).toEqual(['A', 'B', 'C', 'D']);
    expect(result.optionTexts).toEqual(['London', 'Paris', 'Berlin', 'Madrid']);
    expect(result.category).toBe('geography');
    expect(result.id).toBe('test-uuid');
  });

  it('converts true/false TriviaQuestion', () => {
    const result = triviaQuestionToQuestion(tfTriviaQuestion);
    expect(result.type).toBe('true_false');
    expect(result.correctAnswers).toEqual(['False']);
    expect(result.options).toEqual(['True', 'False']);
  });

  it('uses provided index as roundIndex', () => {
    expect(triviaQuestionToQuestion(mcTriviaQuestion, 5).roundIndex).toBe(5);
  });

  it('defaults roundIndex to 0', () => {
    expect(triviaQuestionToQuestion(mcTriviaQuestion).roundIndex).toBe(0);
  });

  it('defaults missing category to general_knowledge', () => {
    const tq: TriviaQuestion = { question: 'Q?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 };
    expect(triviaQuestionToQuestion(tq).category).toBe('general_knowledge');
  });

  it('does not set explanation', () => {
    expect(triviaQuestionToQuestion(mcTriviaQuestion).explanation).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Batch conversions
// ---------------------------------------------------------------------------

describe('questionsToTriviaQuestions', () => {
  it('converts array of questions', () => {
    const result = questionsToTriviaQuestions([mcQuestion, tfQuestion]);
    expect(result).toHaveLength(2);
    expect(result[0].question).toBe('What is the capital of France?');
    expect(result[1].question).toBe('The Earth is flat.');
  });

  it('handles empty array', () => {
    expect(questionsToTriviaQuestions([])).toEqual([]);
  });
});

describe('triviaQuestionsToQuestions', () => {
  it('converts array with sequential indices', () => {
    const result = triviaQuestionsToQuestions([mcTriviaQuestion, tfTriviaQuestion]);
    expect(result).toHaveLength(2);
    expect(result[0].roundIndex).toBe(0);
    expect(result[1].roundIndex).toBe(1);
  });

  it('handles empty array', () => {
    expect(triviaQuestionsToQuestions([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------

describe('round-trip conversion', () => {
  it('Question -> TriviaQuestion -> Question preserves core data', () => {
    const tq = questionToTriviaQuestion(mcQuestion);
    const roundTripped = triviaQuestionToQuestion(tq, mcQuestion.roundIndex);

    expect(roundTripped.text).toBe(mcQuestion.text);
    expect(roundTripped.type).toBe(mcQuestion.type);
    expect(roundTripped.correctAnswers).toEqual(mcQuestion.correctAnswers);
    expect(roundTripped.optionTexts).toEqual(mcQuestion.optionTexts);
    expect(roundTripped.category).toBe(mcQuestion.category);
    expect(roundTripped.roundIndex).toBe(mcQuestion.roundIndex);
  });

  it('true/false round-trip preserves core data', () => {
    const tq = questionToTriviaQuestion(tfQuestion);
    const roundTripped = triviaQuestionToQuestion(tq, tfQuestion.roundIndex);

    expect(roundTripped.text).toBe(tfQuestion.text);
    expect(roundTripped.type).toBe(tfQuestion.type);
    expect(roundTripped.correctAnswers).toEqual(tfQuestion.correctAnswers);
    expect(roundTripped.category).toBe(tfQuestion.category);
  });
});

// ---------------------------------------------------------------------------
// All categories
// ---------------------------------------------------------------------------

describe('all category values', () => {
  const categories = [
    'general_knowledge',
    'science',
    'history',
    'geography',
    'entertainment',
    'sports',
    'art_literature',
    'music',
    'movies',
    'tv',
  ] as const;

  for (const cat of categories) {
    it(`handles category: ${cat}`, () => {
      const q: Question = { ...mcQuestion, category: cat };
      const tq = questionToTriviaQuestion(q);
      expect(tq.category).toBe(cat);

      const back = triviaQuestionToQuestion(tq);
      expect(back.category).toBe(cat);
    });
  }
});
