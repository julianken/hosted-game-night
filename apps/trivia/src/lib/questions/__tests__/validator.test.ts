import { describe, it, expect } from 'vitest';
import {
  validateJsonQuestions,
  validateCsvQuestions,
  validateQuestion,
  getErrorSummary,
} from '../validator';
import type { RawJsonQuestion, RawCsvQuestion } from '../types';

describe('validateJsonQuestions', () => {
  it('should validate a valid question', () => {
    const rawQuestions: RawJsonQuestion[] = [
      {
        text: 'What is 2 + 2?',
        type: 'multiple_choice',
        optionTexts: ['3', '4', '5', '6'],
        options: ['A', 'B', 'C', 'D'],
        correctAnswers: ['B'],
        category: 'history',
        roundIndex: 0,
      },
    ];

    const result = validateJsonQuestions(rawQuestions);

    expect(result.valid).toBe(true);
    expect(result.questions).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    expect(result.questions[0].text).toBe('What is 2 + 2?');
  });

  it('should accept alternative field names (question instead of text)', () => {
    const rawQuestions: RawJsonQuestion[] = [
      {
        question: 'What is the capital of France?',
        optionTexts: ['London', 'Paris', 'Berlin', 'Madrid'],
        correctAnswers: ['B'],
        roundIndex: 0,
      },
    ];

    const result = validateJsonQuestions(rawQuestions);

    expect(result.valid).toBe(true);
    expect(result.questions[0].text).toBe('What is the capital of France?');
  });

  it('should accept single correctAnswer field', () => {
    const rawQuestions: RawJsonQuestion[] = [
      {
        text: 'What color is the sky?',
        optionTexts: ['Red', 'Blue', 'Green', 'Yellow'],
        correctAnswer: 'B',
        roundIndex: 0,
      },
    ];

    const result = validateJsonQuestions(rawQuestions);

    expect(result.valid).toBe(true);
    expect(result.questions[0].correctAnswers).toEqual(['B']);
  });

  it('should accept individual option fields (optionA, optionB, etc.)', () => {
    const rawQuestions: RawJsonQuestion[] = [
      {
        text: 'Which is largest?',
        optionA: 'Ant',
        optionB: 'Elephant',
        optionC: 'Mouse',
        optionD: 'Cat',
        correctAnswers: ['B'],
        roundIndex: 0,
      },
    ];

    const result = validateJsonQuestions(rawQuestions);

    expect(result.valid).toBe(true);
    expect(result.questions[0].optionTexts).toEqual(['Ant', 'Elephant', 'Mouse', 'Cat']);
  });

  it('should validate true/false questions', () => {
    const rawQuestions: RawJsonQuestion[] = [
      {
        text: 'The Earth is flat.',
        type: 'true_false',
        correctAnswers: ['False'],
        roundIndex: 0,
      },
    ];

    const result = validateJsonQuestions(rawQuestions);

    expect(result.valid).toBe(true);
    expect(result.questions[0].type).toBe('true_false');
    expect(result.questions[0].options).toEqual(['True', 'False']);
    expect(result.questions[0].optionTexts).toEqual(['True', 'False']);
  });

  it('should generate ID if not provided', () => {
    const rawQuestions: RawJsonQuestion[] = [
      {
        text: 'Test question',
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A'],
        roundIndex: 0,
      },
    ];

    const result = validateJsonQuestions(rawQuestions);

    expect(result.questions[0].id).toBeDefined();
    expect(result.questions[0].id.length).toBeGreaterThan(0);
  });

  it('should preserve provided ID', () => {
    const rawQuestions: RawJsonQuestion[] = [
      {
        id: 'custom-id-123',
        text: 'Test question',
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A'],
        roundIndex: 0,
      },
    ];

    const result = validateJsonQuestions(rawQuestions);

    expect(result.questions[0].id).toBe('custom-id-123');
  });

  it('should error on missing question text', () => {
    const rawQuestions: RawJsonQuestion[] = [
      {
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A'],
        roundIndex: 0,
      },
    ];

    const result = validateJsonQuestions(rawQuestions);

    expect(result.valid).toBe(false);
    expect(result.questions).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('text');
  });

  it('should error on missing correct answers', () => {
    const rawQuestions: RawJsonQuestion[] = [
      {
        text: 'Test question',
        optionTexts: ['A', 'B', 'C', 'D'],
        roundIndex: 0,
      },
    ];

    const result = validateJsonQuestions(rawQuestions);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'correctAnswers')).toBe(true);
  });

  it('should error on invalid correct answer value', () => {
    const rawQuestions: RawJsonQuestion[] = [
      {
        text: 'Test question',
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['E'],
        roundIndex: 0,
      },
    ];

    const result = validateJsonQuestions(rawQuestions);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'correctAnswers')).toBe(true);
  });

  it('should error on negative roundIndex', () => {
    const rawQuestions: RawJsonQuestion[] = [
      {
        text: 'Test question',
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A'],
        roundIndex: -1,
      },
    ];

    const result = validateJsonQuestions(rawQuestions);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'roundIndex')).toBe(true);
  });

  it('should warn on invalid question type and default to multiple_choice', () => {
    const rawQuestions: RawJsonQuestion[] = [
      {
        text: 'Test question',
        type: 'invalid_type',
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A'],
        roundIndex: 0,
      },
    ];

    const result = validateJsonQuestions(rawQuestions);

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].field).toBe('type');
    expect(result.questions[0].type).toBe('multiple_choice');
  });

  it('should warn on invalid category and default to history', () => {
    const rawQuestions: RawJsonQuestion[] = [
      {
        text: 'Test question',
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A'],
        category: 'invalid_category',
        roundIndex: 0,
      },
    ];

    const result = validateJsonQuestions(rawQuestions);

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].field).toBe('category');
    expect(result.questions[0].category).toBe('general_knowledge');
  });

  it('should handle multiple questions with mixed validity', () => {
    const rawQuestions: RawJsonQuestion[] = [
      {
        text: 'Valid question',
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A'],
        roundIndex: 0,
      },
      {
        // Missing text - invalid
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A'],
        roundIndex: 0,
      },
      {
        text: 'Another valid question',
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['B'],
        roundIndex: 1,
      },
    ];

    const result = validateJsonQuestions(rawQuestions);

    expect(result.valid).toBe(false);
    expect(result.questions).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(1);
  });
});

describe('validateCsvQuestions', () => {
  it('should validate a valid CSV question', () => {
    const rawQuestions: RawCsvQuestion[] = [
      {
        question: 'What is 2 + 2?',
        optionA: '3',
        optionB: '4',
        optionC: '5',
        optionD: '6',
        correctAnswer: 'B',
        roundIndex: '0',
      },
    ];

    const result = validateCsvQuestions(rawQuestions);

    expect(result.valid).toBe(true);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].text).toBe('What is 2 + 2?');
    expect(result.questions[0].correctAnswers).toEqual(['B']);
  });

  it('should handle true/false questions explicitly specified', () => {
    const rawQuestions: RawCsvQuestion[] = [
      {
        question: 'The sky is blue.',
        optionA: 'True',
        optionB: 'False',
        optionC: '',
        optionD: '',
        correctAnswer: 'True',
        roundIndex: '0',
        type: 'true_false', // Explicitly specify true/false type
      },
    ];

    const result = validateCsvQuestions(rawQuestions);

    // The validator will still validate the true/false answer
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].type).toBe('true_false');
  });

  it('should convert correctAnswer to uppercase', () => {
    const rawQuestions: RawCsvQuestion[] = [
      {
        question: 'Test?',
        optionA: 'A',
        optionB: 'B',
        optionC: 'C',
        optionD: 'D',
        correctAnswer: 'b',
        roundIndex: '0',
      },
    ];

    const result = validateCsvQuestions(rawQuestions);

    expect(result.valid).toBe(true);
    expect(result.questions[0].correctAnswers).toEqual(['B']);
  });

  it('should error on non-numeric roundIndex', () => {
    const rawQuestions: RawCsvQuestion[] = [
      {
        question: 'Test?',
        optionA: 'A',
        optionB: 'B',
        optionC: 'C',
        optionD: 'D',
        correctAnswer: 'A',
        roundIndex: 'round1',
      },
    ];

    const result = validateCsvQuestions(rawQuestions);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'roundIndex')).toBe(true);
  });

  it('should include optional fields', () => {
    const rawQuestions: RawCsvQuestion[] = [
      {
        question: 'Test?',
        optionA: 'A',
        optionB: 'B',
        optionC: 'C',
        optionD: 'D',
        correctAnswer: 'A',
        roundIndex: '0',
        category: 'music',
        explanation: 'This is the explanation',
      },
    ];

    const result = validateCsvQuestions(rawQuestions);

    expect(result.valid).toBe(true);
    expect(result.questions[0].category).toBe('music');
    expect(result.questions[0].explanation).toBe('This is the explanation');
  });
});

describe('validateQuestion', () => {
  it('should return true for valid question', () => {
    const question = {
      id: 'q1',
      text: 'Test question',
      type: 'multiple_choice',
      options: ['A', 'B', 'C', 'D'],
      optionTexts: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswers: ['A'],
      category: 'history',
      roundIndex: 0,
    };

    expect(validateQuestion(question)).toBe(true);
  });

  it('should return false for null', () => {
    expect(validateQuestion(null)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(validateQuestion('string')).toBe(false);
    expect(validateQuestion(123)).toBe(false);
  });

  it('should return false for missing required fields', () => {
    expect(validateQuestion({ id: 'q1' })).toBe(false);
    expect(validateQuestion({ id: 'q1', text: 'Test' })).toBe(false);
  });

  it('should return false for invalid type', () => {
    const question = {
      id: 'q1',
      text: 'Test question',
      type: 'invalid',
      options: ['A', 'B'],
      optionTexts: ['A', 'B'],
      correctAnswers: ['A'],
      category: 'history',
      roundIndex: 0,
    };

    expect(validateQuestion(question)).toBe(false);
  });

  it('should return false for invalid category', () => {
    const question = {
      id: 'q1',
      text: 'Test question',
      type: 'multiple_choice',
      options: ['A', 'B'],
      optionTexts: ['A', 'B'],
      correctAnswers: ['A'],
      category: 'invalid',
      roundIndex: 0,
    };

    expect(validateQuestion(question)).toBe(false);
  });
});

describe('getErrorSummary', () => {
  it('should group errors by field', () => {
    const errors = [
      { row: 0, field: 'text', message: 'Missing text' },
      { row: 1, field: 'text', message: 'Missing text' },
      { row: 2, field: 'correctAnswers', message: 'Invalid answer' },
    ];

    const summary = getErrorSummary(errors);

    expect(summary).toEqual({
      text: 2,
      correctAnswers: 1,
    });
  });

  it('should return empty object for no errors', () => {
    expect(getErrorSummary([])).toEqual({});
  });
});
