import type { Question, QuestionType, QuestionCategory } from '@/types';

// =============================================================================
// IMPORT/EXPORT FORMATS
// =============================================================================

export type ImportFormat = 'json' | 'csv';
export type ExportFormat = 'json' | 'csv';

// =============================================================================
// RAW IMPORT DATA (before validation)
// =============================================================================

/**
 * Raw question data from JSON import (before validation)
 */
export interface RawJsonQuestion {
  id?: string;
  text?: string;
  question?: string; // Alternative field name
  type?: string;
  correctAnswers?: string[];
  correctAnswer?: string; // Alternative: single answer
  options?: string[];
  optionTexts?: string[];
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  category?: string;
  explanation?: string;
  roundIndex?: number;
  round?: number; // Alternative field name
}

/**
 * Raw question data from CSV import (all fields are strings)
 */
export interface RawCsvQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  roundIndex: string;
  category?: string;
  explanation?: string;
  type?: string;
}

// =============================================================================
// VALIDATION RESULTS
// =============================================================================

export interface ValidationError {
  row: number; // 0-based row index (-1 for general errors)
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationWarning {
  row: number;
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  questions: Question[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// =============================================================================
// IMPORT RESULTS
// =============================================================================

export interface ParseResult {
  success: boolean;
  data: RawJsonQuestion[] | RawCsvQuestion[];
  error?: string;
}

export interface ImportResult {
  success: boolean;
  questions: Question[];
  totalParsed: number;
  totalValid: number;
  totalInvalid: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// =============================================================================
// EXPORT OPTIONS
// =============================================================================

export interface ExportOptions {
  format: ExportFormat;
  includeIds?: boolean;
  includeExplanations?: boolean;
}

export interface ExportResult {
  success: boolean;
  content: string;
  filename: string;
  mimeType: string;
  error?: string;
}

// =============================================================================
// CSV COLUMN DEFINITIONS
// =============================================================================

export const CSV_COLUMNS = [
  'question',
  'optionA',
  'optionB',
  'optionC',
  'optionD',
  'correctAnswer',
  'roundIndex',
  'category',
  'explanation',
  'type',
] as const satisfies readonly string[];

export const CSV_REQUIRED_COLUMNS = [
  'question',
  'optionA',
  'optionB',
  'optionC',
  'optionD',
  'correctAnswer',
  'roundIndex',
] as const satisfies readonly string[];

export type CsvColumn = (typeof CSV_COLUMNS)[number];
export type CsvRequiredColumn = (typeof CSV_REQUIRED_COLUMNS)[number];

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isValidQuestionType(type: string): type is QuestionType {
  return type === 'multiple_choice' || type === 'true_false';
}

export function isValidQuestionCategory(category: string): category is QuestionCategory {
  return [
    'general_knowledge',
    'science',
    'history',
    'geography',
    'entertainment',
    'sports',
    'art_literature',
    // Legacy categories (for backwards compatibility)
    'music',
    'movies',
    'tv',
  ].includes(category);
}

export function isValidCorrectAnswer(answer: string): boolean {
  return ['A', 'B', 'C', 'D', 'True', 'False'].includes(answer);
}
