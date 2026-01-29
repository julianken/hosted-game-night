import { describe, it, expect } from 'vitest';
import {
  parseQuestions,
  parseJsonQuestions,
  parseCsvQuestions,
  detectFormat,
} from '../parser';

describe('parseJsonQuestions', () => {
  it('should parse valid JSON array', () => {
    const content = JSON.stringify([
      {
        text: 'What is 2 + 2?',
        optionTexts: ['3', '4', '5', '6'],
        correctAnswers: ['B'],
        roundIndex: 0,
      },
    ]);

    const result = parseJsonQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(1);
    expect(result.totalParsed).toBe(1);
    expect(result.totalValid).toBe(1);
  });

  it('should parse JSON object with questions property', () => {
    const content = JSON.stringify({
      questions: [
        {
          text: 'Test question',
          optionTexts: ['A', 'B', 'C', 'D'],
          correctAnswers: ['A'],
          roundIndex: 0,
        },
      ],
    });

    const result = parseJsonQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(1);
  });

  it('should handle invalid JSON', () => {
    const content = 'not valid json {';

    const result = parseJsonQuestions(content);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('json');
  });

  it('should handle empty content', () => {
    const result = parseJsonQuestions('');

    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('Empty');
  });

  it('should handle empty array', () => {
    const result = parseJsonQuestions('[]');

    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('No questions');
  });

  it('should handle non-array JSON', () => {
    const result = parseJsonQuestions('{"foo": "bar"}');

    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('must be an array');
  });

  it('should accept options as alias for optionTexts', () => {
    const content = JSON.stringify([
      {
        text: 'Who directed Oppenheimer?',
        options: ['Nolan', 'Spielberg', 'Scorsese', 'Tarantino'],
        correctAnswers: ['A'],
        roundIndex: 0,
      },
    ]);

    const result = parseJsonQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].optionTexts).toEqual(['Nolan', 'Spielberg', 'Scorsese', 'Tarantino']);
  });

  it('should resolve full-text correct answer to letter label', () => {
    const content = JSON.stringify([
      {
        text: 'Who directed Oppenheimer?',
        optionTexts: ['Nolan', 'Spielberg', 'Scorsese', 'Tarantino'],
        correctAnswer: 'Nolan',
        roundIndex: 0,
      },
    ]);

    const result = parseJsonQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions[0].correctAnswers).toEqual(['A']);
  });

  it('should resolve full-text correct answer case-insensitively', () => {
    const content = JSON.stringify([
      {
        text: 'Who directed Oppenheimer?',
        optionTexts: ['Nolan', 'Spielberg', 'Scorsese', 'Tarantino'],
        correctAnswer: 'nolan',
        roundIndex: 0,
      },
    ]);

    const result = parseJsonQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions[0].correctAnswers).toEqual(['A']);
  });

  it('should error on non-matching full-text correct answer', () => {
    const content = JSON.stringify([
      {
        text: 'Who directed Oppenheimer?',
        optionTexts: ['Nolan', 'Spielberg', 'Scorsese', 'Tarantino'],
        correctAnswer: 'Kubrick',
        roundIndex: 0,
      },
    ]);

    const result = parseJsonQuestions(content);

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.field === 'correctAnswers' && e.message.includes('Kubrick'))).toBe(true);
  });

  it('should handle mixed letter labels and full-text answers in same batch', () => {
    const content = JSON.stringify([
      {
        text: 'Q1',
        optionTexts: ['Alpha', 'Beta', 'Gamma', 'Delta'],
        correctAnswers: ['A'],
        roundIndex: 0,
      },
      {
        text: 'Q2',
        optionTexts: ['Red', 'Blue', 'Green', 'Yellow'],
        correctAnswer: 'Blue',
        roundIndex: 0,
      },
    ]);

    const result = parseJsonQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].correctAnswers).toEqual(['A']);
    expect(result.questions[1].correctAnswers).toEqual(['B']);
  });

  it('should accept options alias combined with full-text correct answer', () => {
    const content = JSON.stringify([
      {
        text: 'What color is the sky?',
        options: ['Red', 'Blue', 'Green', 'Yellow'],
        correctAnswer: 'Blue',
        roundIndex: 0,
      },
    ]);

    const result = parseJsonQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions[0].optionTexts).toEqual(['Red', 'Blue', 'Green', 'Yellow']);
    expect(result.questions[0].correctAnswers).toEqual(['B']);
  });

  it('should report validation errors', () => {
    const content = JSON.stringify([
      {
        text: 'Valid question',
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A'],
        roundIndex: 0,
      },
      {
        // Missing text
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A'],
        roundIndex: 0,
      },
    ]);

    const result = parseJsonQuestions(content);

    expect(result.success).toBe(false);
    expect(result.totalParsed).toBe(2);
    expect(result.totalValid).toBe(1);
    expect(result.totalInvalid).toBe(1);
    expect(result.questions).toHaveLength(1);
  });
});

describe('parseCsvQuestions', () => {
  it('should parse valid CSV', () => {
    const content = `question,optionA,optionB,optionC,optionD,correctAnswer,roundIndex
What is 2 + 2?,3,4,5,6,B,0`;

    const result = parseCsvQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].text).toBe('What is 2 + 2?');
  });

  it('should handle quoted fields', () => {
    const content = `question,optionA,optionB,optionC,optionD,correctAnswer,roundIndex
"What is ""quoted""?",A,B,C,D,A,0`;

    const result = parseCsvQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions[0].text).toBe('What is "quoted"?');
  });

  it('should handle fields with commas', () => {
    const content = `question,optionA,optionB,optionC,optionD,correctAnswer,roundIndex
"Hello, world?",A,B,C,D,A,0`;

    const result = parseCsvQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions[0].text).toBe('Hello, world?');
  });

  it('should handle fields with newlines', () => {
    const content = `question,optionA,optionB,optionC,optionD,correctAnswer,roundIndex
"Line 1
Line 2",A,B,C,D,A,0`;

    const result = parseCsvQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions[0].text).toBe('Line 1\nLine 2');
  });

  it('should handle Windows line endings (CRLF)', () => {
    const content = `question,optionA,optionB,optionC,optionD,correctAnswer,roundIndex\r\nTest?,A,B,C,D,A,0\r\n`;

    const result = parseCsvQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(1);
  });

  it('should handle column name aliases', () => {
    // Using alternative column names
    const content = `text,a,b,c,d,correct,round
Test?,A,B,C,D,A,0`;

    const result = parseCsvQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(1);
  });

  it('should skip empty rows', () => {
    const content = `question,optionA,optionB,optionC,optionD,correctAnswer,roundIndex
Q1?,A,B,C,D,A,0

Q2?,A,B,C,D,B,0`;

    const result = parseCsvQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(2);
  });

  it('should handle optional columns', () => {
    const content = `question,optionA,optionB,optionC,optionD,correctAnswer,roundIndex,category,explanation
Test?,A,B,C,D,A,0,music,This is why`;

    const result = parseCsvQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions[0].category).toBe('music');
    expect(result.questions[0].explanation).toBe('This is why');
  });

  it('should error on missing required columns', () => {
    const content = `question,optionA,optionB
Test?,A,B`;

    const result = parseCsvQuestions(content);

    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('Missing required columns');
  });

  it('should error on empty content', () => {
    const result = parseCsvQuestions('');

    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('Empty');
  });

  it('should error on header only (no data rows)', () => {
    const content = `question,optionA,optionB,optionC,optionD,correctAnswer,roundIndex`;

    const result = parseCsvQuestions(content);

    expect(result.success).toBe(false);
    // The error message could be either about no data rows or no valid questions
    expect(result.errors[0].message).toMatch(/header row|data row|No valid/i);
  });

  it('should parse multiple questions', () => {
    const content = `question,optionA,optionB,optionC,optionD,correctAnswer,roundIndex
Q1?,A,B,C,D,A,0
Q2?,E,F,G,H,B,1
Q3?,I,J,K,L,C,1`;

    const result = parseCsvQuestions(content);

    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(3);
    expect(result.questions[0].roundIndex).toBe(0);
    expect(result.questions[1].roundIndex).toBe(1);
    expect(result.questions[2].roundIndex).toBe(1);
  });
});

describe('parseQuestions', () => {
  it('should use JSON parser for json format', () => {
    const content = JSON.stringify([
      {
        text: 'Test',
        optionTexts: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A'],
        roundIndex: 0,
      },
    ]);

    const result = parseQuestions(content, 'json');

    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(1);
  });

  it('should use CSV parser for csv format', () => {
    const content = `question,optionA,optionB,optionC,optionD,correctAnswer,roundIndex
Test?,A,B,C,D,A,0`;

    const result = parseQuestions(content, 'csv');

    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(1);
  });

  it('should error on unsupported format', () => {
    const result = parseQuestions('content', 'xml' as 'json' | 'csv');

    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('Unsupported format');
  });
});

describe('detectFormat', () => {
  it('should detect JSON from extension', () => {
    expect(detectFormat('questions.json')).toBe('json');
    expect(detectFormat('QUESTIONS.JSON')).toBe('json');
  });

  it('should detect CSV from extension', () => {
    expect(detectFormat('questions.csv')).toBe('csv');
    expect(detectFormat('QUESTIONS.CSV')).toBe('csv');
  });

  it('should detect JSON from content starting with [', () => {
    expect(detectFormat('unknown.txt', '[{"text":"test"}]')).toBe('json');
  });

  it('should detect JSON from content starting with {', () => {
    expect(detectFormat('unknown.txt', '{"questions":[]}')).toBe('json');
  });

  it('should detect CSV from content with commas and newlines', () => {
    expect(detectFormat('unknown.txt', 'a,b,c\n1,2,3')).toBe('csv');
  });

  it('should return null for unknown format', () => {
    expect(detectFormat('unknown.txt')).toBe(null);
    expect(detectFormat('unknown.txt', 'just plain text')).toBe(null);
  });
});
