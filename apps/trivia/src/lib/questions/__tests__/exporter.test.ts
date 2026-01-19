import { describe, it, expect } from 'vitest';
import {
  exportQuestions,
  exportToJson,
  exportToCsv,
  groupQuestionsByRound,
  getExportStats,
} from '../exporter';
import type { Question } from '@/types';

const sampleQuestions: Question[] = [
  {
    id: 'q1',
    text: 'What is 2 + 2?',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['3', '4', '5', '6'],
    correctAnswers: ['B'],
    category: 'history',
    explanation: 'Basic math',
    roundIndex: 0,
  },
  {
    id: 'q2',
    text: 'The sky is blue.',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'history',
    roundIndex: 0,
  },
  {
    id: 'q3',
    text: 'Who wrote Hamlet?',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['Dickens', 'Shakespeare', 'Austen', 'Hemingway'],
    correctAnswers: ['B'],
    category: 'history',
    explanation: 'English literature',
    roundIndex: 1,
  },
];

describe('exportToJson', () => {
  it('should export questions to JSON', () => {
    const result = exportToJson(sampleQuestions, { format: 'json' });

    expect(result.success).toBe(true);
    expect(result.mimeType).toBe('application/json');
    expect(result.filename).toMatch(/trivia-questions-.*\.json/);

    const parsed = JSON.parse(result.content);
    expect(parsed).toHaveLength(3);
  });

  it('should include IDs when option is set', () => {
    const result = exportToJson(sampleQuestions, { format: 'json', includeIds: true });
    const parsed = JSON.parse(result.content);

    expect(parsed[0].id).toBe('q1');
  });

  it('should exclude IDs by default', () => {
    const result = exportToJson(sampleQuestions, { format: 'json' });
    const parsed = JSON.parse(result.content);

    expect(parsed[0].id).toBeUndefined();
  });

  it('should include explanations when option is set', () => {
    const result = exportToJson(sampleQuestions, { format: 'json', includeExplanations: true });
    const parsed = JSON.parse(result.content);

    expect(parsed[0].explanation).toBe('Basic math');
    expect(parsed[1].explanation).toBeUndefined(); // q2 has no explanation
    expect(parsed[2].explanation).toBe('English literature');
  });

  it('should exclude explanations when option is false', () => {
    const result = exportToJson(sampleQuestions, { format: 'json', includeExplanations: false });
    const parsed = JSON.parse(result.content);

    expect(parsed[0].explanation).toBeUndefined();
  });

  it('should format JSON with indentation', () => {
    const result = exportToJson(sampleQuestions, { format: 'json' });

    // Pretty-printed JSON has newlines and indentation
    expect(result.content).toContain('\n');
    expect(result.content).toContain('  ');
  });
});

describe('exportToCsv', () => {
  it('should export questions to CSV', () => {
    const result = exportToCsv(sampleQuestions, { format: 'csv' });

    expect(result.success).toBe(true);
    expect(result.mimeType).toBe('text/csv');
    expect(result.filename).toMatch(/trivia-questions-.*\.csv/);
  });

  it('should include header row', () => {
    const result = exportToCsv(sampleQuestions, { format: 'csv' });
    const lines = result.content.split('\n');

    expect(lines[0]).toContain('question');
    expect(lines[0]).toContain('optionA');
    expect(lines[0]).toContain('correctAnswer');
    expect(lines[0]).toContain('roundIndex');
  });

  it('should include IDs when option is set', () => {
    const result = exportToCsv(sampleQuestions, { format: 'csv', includeIds: true });
    const lines = result.content.split('\n');

    expect(lines[0]).toMatch(/^id,/);
    expect(lines[1]).toMatch(/^q1,/);
  });

  it('should escape fields with commas', () => {
    const questionsWithComma: Question[] = [
      {
        id: 'q1',
        text: 'Hello, world?',
        type: 'multiple_choice',
        options: ['A', 'B', 'C', 'D'],
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A'],
        category: 'history',
        roundIndex: 0,
      },
    ];

    const result = exportToCsv(questionsWithComma, { format: 'csv' });
    const lines = result.content.split('\n');

    expect(lines[1]).toContain('"Hello, world?"');
  });

  it('should escape fields with quotes', () => {
    const questionsWithQuote: Question[] = [
      {
        id: 'q1',
        text: 'What is "this"?',
        type: 'multiple_choice',
        options: ['A', 'B', 'C', 'D'],
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A'],
        category: 'history',
        roundIndex: 0,
      },
    ];

    const result = exportToCsv(questionsWithQuote, { format: 'csv' });
    const lines = result.content.split('\n');

    expect(lines[1]).toContain('""this""');
  });

  it('should include explanations when option is set', () => {
    const result = exportToCsv(sampleQuestions, { format: 'csv', includeExplanations: true });
    const lines = result.content.split('\n');

    expect(lines[0]).toContain('explanation');
    expect(lines[1]).toContain('Basic math');
  });

  it('should pad optionTexts to 4 columns', () => {
    const result = exportToCsv(sampleQuestions, { format: 'csv' });
    const lines = result.content.split('\n');

    // True/False question (q2) should have empty optionC and optionD
    // Count commas in header to verify column count
    const headerCommas = (lines[0].match(/,/g) || []).length;
    expect(headerCommas).toBeGreaterThanOrEqual(8); // at least 9 columns
  });
});

describe('exportQuestions', () => {
  it('should export to JSON format', () => {
    const result = exportQuestions(sampleQuestions, { format: 'json' });

    expect(result.success).toBe(true);
    expect(result.mimeType).toBe('application/json');
  });

  it('should export to CSV format', () => {
    const result = exportQuestions(sampleQuestions, { format: 'csv' });

    expect(result.success).toBe(true);
    expect(result.mimeType).toBe('text/csv');
  });

  it('should error on unsupported format', () => {
    const result = exportQuestions(sampleQuestions, { format: 'xml' as any });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported');
  });
});

describe('groupQuestionsByRound', () => {
  it('should group questions by roundIndex', () => {
    const grouped = groupQuestionsByRound(sampleQuestions);

    expect(grouped.size).toBe(2);
    expect(grouped.get(0)).toHaveLength(2);
    expect(grouped.get(1)).toHaveLength(1);
  });

  it('should handle empty array', () => {
    const grouped = groupQuestionsByRound([]);

    expect(grouped.size).toBe(0);
  });

  it('should preserve question order within rounds', () => {
    const grouped = groupQuestionsByRound(sampleQuestions);
    const round0 = grouped.get(0)!;

    expect(round0[0].id).toBe('q1');
    expect(round0[1].id).toBe('q2');
  });
});

describe('getExportStats', () => {
  it('should count total questions', () => {
    const stats = getExportStats(sampleQuestions);

    expect(stats.totalQuestions).toBe(3);
  });

  it('should count total rounds', () => {
    const stats = getExportStats(sampleQuestions);

    expect(stats.totalRounds).toBe(2);
  });

  it('should group by category', () => {
    const stats = getExportStats(sampleQuestions);

    expect(stats.byCategory.history).toBe(3);
  });

  it('should group by type', () => {
    const stats = getExportStats(sampleQuestions);

    expect(stats.byType.multiple_choice).toBe(2);
    expect(stats.byType.true_false).toBe(1);
  });

  it('should handle empty array', () => {
    const stats = getExportStats([]);

    expect(stats.totalQuestions).toBe(0);
    expect(stats.totalRounds).toBe(0);
    expect(stats.byCategory).toEqual({});
    expect(stats.byType).toEqual({});
  });
});
