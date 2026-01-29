import { v4 as uuidv4 } from 'uuid';
import type { Question, QuestionType, QuestionCategory } from '@/types';
import type {
  RawJsonQuestion,
  RawCsvQuestion,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './types';
import { isValidQuestionType, isValidQuestionCategory, isValidCorrectAnswer } from './types';

// =============================================================================
// MAIN VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate and transform raw JSON questions into Question objects
 */
export function validateJsonQuestions(rawQuestions: RawJsonQuestion[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const questions: Question[] = [];

  rawQuestions.forEach((raw, index) => {
    const result = validateSingleJsonQuestion(raw, index);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    if (result.question) {
      questions.push(result.question);
    }
  });

  return {
    valid: errors.length === 0,
    questions,
    errors,
    warnings,
  };
}

/**
 * Validate and transform raw CSV questions into Question objects
 */
export function validateCsvQuestions(rawQuestions: RawCsvQuestion[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const questions: Question[] = [];

  rawQuestions.forEach((raw, index) => {
    const result = validateSingleCsvQuestion(raw, index);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    if (result.question) {
      questions.push(result.question);
    }
  });

  return {
    valid: errors.length === 0,
    questions,
    errors,
    warnings,
  };
}

// =============================================================================
// SINGLE QUESTION VALIDATION
// =============================================================================

interface SingleValidationResult {
  question: Question | null;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

function validateSingleJsonQuestion(
  raw: RawJsonQuestion,
  row: number
): SingleValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Extract text (support alternative field names)
  const text = raw.text || raw.question;
  if (!text || typeof text !== 'string' || text.trim() === '') {
    errors.push({
      row,
      field: 'text',
      message: 'Question text is required',
      value: text,
    });
  }

  // Determine question type
  let type: QuestionType = 'multiple_choice';
  if (raw.type) {
    if (isValidQuestionType(raw.type)) {
      type = raw.type;
    } else {
      warnings.push({
        row,
        field: 'type',
        message: `Invalid question type "${raw.type}", defaulting to "multiple_choice"`,
        value: raw.type,
      });
    }
  }

  // Extract options and optionTexts
  let optionTexts: string[] = [];
  let options: string[] = [];

  if (raw.optionTexts && Array.isArray(raw.optionTexts) && raw.optionTexts.length > 0) {
    optionTexts = raw.optionTexts;
  } else if (raw.options && Array.isArray(raw.options) && raw.options.length > 0) {
    // Accept `options` as alias for `optionTexts` (natural for AI-generated output)
    optionTexts = raw.options;
  } else if (raw.optionA !== undefined) {
    // Support individual option fields
    optionTexts = [
      raw.optionA || '',
      raw.optionB || '',
      raw.optionC || '',
      raw.optionD || '',
    ].filter(Boolean);
  }

  if (raw.options && Array.isArray(raw.options) && raw.options.length > 0) {
    options = raw.options;
  } else if (type === 'true_false') {
    options = ['True', 'False'];
    if (optionTexts.length === 0) {
      optionTexts = ['True', 'False'];
    }
  } else {
    // Default to A, B, C, D for multiple choice
    options = ['A', 'B', 'C', 'D'].slice(0, optionTexts.length || 4);
  }

  // Validate options
  if (type === 'multiple_choice') {
    if (optionTexts.length < 2) {
      errors.push({
        row,
        field: 'optionTexts',
        message: 'Multiple choice questions must have at least 2 options',
        value: optionTexts,
      });
    }
    if (optionTexts.length > 4) {
      warnings.push({
        row,
        field: 'optionTexts',
        message: 'Question has more than 4 options, only first 4 will be used',
        value: optionTexts.length,
      });
      optionTexts = optionTexts.slice(0, 4);
      options = options.slice(0, 4);
    }
  }

  // Extract correct answers
  let correctAnswers: string[] = [];
  if (raw.correctAnswers && Array.isArray(raw.correctAnswers)) {
    correctAnswers = raw.correctAnswers;
  } else if (raw.correctAnswer && typeof raw.correctAnswer === 'string') {
    correctAnswers = [raw.correctAnswer];
  }

  // Validate correct answers
  if (correctAnswers.length === 0) {
    errors.push({
      row,
      field: 'correctAnswers',
      message: 'At least one correct answer is required',
      value: correctAnswers,
    });
  } else {
    // Resolve and validate each answer
    correctAnswers = correctAnswers.map((answer) => {
      // If it's already a valid letter label, use as-is
      if (isValidCorrectAnswer(answer)) {
        return answer;
      }
      // Try to resolve full-text answer against optionTexts (case-insensitive)
      const lowerAnswer = answer.toLowerCase();
      const matchIndex = optionTexts.findIndex(
        (opt) => opt.toLowerCase() === lowerAnswer
      );
      if (matchIndex >= 0) {
        const labels = ['A', 'B', 'C', 'D'];
        return labels[matchIndex];
      }
      // No match found — will be caught by validation below
      return answer;
    });

    correctAnswers.forEach((answer) => {
      if (!isValidCorrectAnswer(answer)) {
        errors.push({
          row,
          field: 'correctAnswers',
          message: `Invalid correct answer "${answer}". Must be A, B, C, D, True, False, or match an option text`,
          value: answer,
        });
      }
    });
  }

  // Extract roundIndex (support alternative field names)
  let roundIndex = 0;
  if (typeof raw.roundIndex === 'number') {
    roundIndex = raw.roundIndex;
  } else if (typeof raw.round === 'number') {
    roundIndex = raw.round;
  }

  if (roundIndex < 0) {
    errors.push({
      row,
      field: 'roundIndex',
      message: 'Round index cannot be negative',
      value: roundIndex,
    });
  }

  // Extract category
  let category: QuestionCategory = 'general_knowledge';
  if (raw.category) {
    if (isValidQuestionCategory(raw.category)) {
      category = raw.category;
    } else {
      warnings.push({
        row,
        field: 'category',
        message: `Invalid category "${raw.category}", defaulting to "general_knowledge"`,
        value: raw.category,
      });
    }
  }

  // If there are errors, return null question
  if (errors.length > 0) {
    return { question: null, errors, warnings };
  }

  // Build the question object
  const question: Question = {
    id: raw.id || uuidv4(),
    text: text!.trim(),
    type,
    correctAnswers,
    options,
    optionTexts,
    category,
    roundIndex,
  };

  if (raw.explanation && typeof raw.explanation === 'string') {
    question.explanation = raw.explanation.trim();
  }

  return { question, errors, warnings };
}

function validateSingleCsvQuestion(
  raw: RawCsvQuestion,
  row: number
): SingleValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate question text
  const text = raw.question?.trim();
  if (!text) {
    errors.push({
      row,
      field: 'question',
      message: 'Question text is required',
      value: raw.question,
    });
  }

  // Extract and validate options
  const optionTexts = [
    raw.optionA?.trim() || '',
    raw.optionB?.trim() || '',
    raw.optionC?.trim() || '',
    raw.optionD?.trim() || '',
  ];

  // For true/false, we only need two options
  const isTrueFalse = raw.type?.toLowerCase() === 'true_false' ||
    (optionTexts[0].toLowerCase() === 'true' && optionTexts[1].toLowerCase() === 'false');

  let type: QuestionType = 'multiple_choice';
  let options: string[] = ['A', 'B', 'C', 'D'];
  let filteredOptionTexts = optionTexts;

  if (isTrueFalse) {
    type = 'true_false';
    options = ['True', 'False'];
    filteredOptionTexts = ['True', 'False'];
  } else {
    // Filter out empty options for multiple choice
    const nonEmptyOptions = optionTexts.filter(Boolean);
    if (nonEmptyOptions.length < 2) {
      errors.push({
        row,
        field: 'options',
        message: 'Multiple choice questions must have at least 2 options',
        value: optionTexts,
      });
    }
    filteredOptionTexts = nonEmptyOptions;
    options = ['A', 'B', 'C', 'D'].slice(0, filteredOptionTexts.length);
  }

  // Validate correct answer
  let correctAnswer = raw.correctAnswer?.trim();
  if (!correctAnswer) {
    errors.push({
      row,
      field: 'correctAnswer',
      message: 'Correct answer is required',
      value: raw.correctAnswer,
    });
  } else {
    // Normalize: A-D to uppercase, True/False to proper case
    const upper = correctAnswer.toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(upper)) {
      correctAnswer = upper;
    } else if (upper === 'TRUE') {
      correctAnswer = 'True';
    } else if (upper === 'FALSE') {
      correctAnswer = 'False';
    }

    if (!isValidCorrectAnswer(correctAnswer)) {
      errors.push({
        row,
        field: 'correctAnswer',
        message: `Invalid correct answer "${correctAnswer}". Must be A, B, C, D, True, or False`,
        value: raw.correctAnswer,
      });
    }
  }

  // Validate round index
  const roundIndexStr = raw.roundIndex?.trim();
  let roundIndex = 0;
  if (roundIndexStr) {
    const parsed = parseInt(roundIndexStr, 10);
    if (isNaN(parsed)) {
      errors.push({
        row,
        field: 'roundIndex',
        message: 'Round index must be a number',
        value: raw.roundIndex,
      });
    } else if (parsed < 0) {
      errors.push({
        row,
        field: 'roundIndex',
        message: 'Round index cannot be negative',
        value: raw.roundIndex,
      });
    } else {
      roundIndex = parsed;
    }
  }

  // Validate category
  let category: QuestionCategory = 'general_knowledge';
  if (raw.category?.trim()) {
    const cat = raw.category.trim().toLowerCase();
    if (isValidQuestionCategory(cat)) {
      category = cat;
    } else {
      warnings.push({
        row,
        field: 'category',
        message: `Invalid category "${raw.category}", defaulting to "general_knowledge"`,
        value: raw.category,
      });
    }
  }

  // If there are errors, return null question
  if (errors.length > 0) {
    return { question: null, errors, warnings };
  }

  // Build the question object
  const question: Question = {
    id: uuidv4(),
    text: text!,
    type,
    correctAnswers: [correctAnswer!],
    options,
    optionTexts: filteredOptionTexts,
    category,
    roundIndex,
  };

  if (raw.explanation?.trim()) {
    question.explanation = raw.explanation.trim();
  }

  return { question, errors, warnings };
}

// =============================================================================
// UTILITY VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate that a question object is complete and valid
 */
export function validateQuestion(question: unknown): question is Question {
  if (!question || typeof question !== 'object') return false;

  const q = question as Record<string, unknown>;

  // Required fields
  if (typeof q.id !== 'string' || !q.id) return false;
  if (typeof q.text !== 'string' || !q.text) return false;
  if (!isValidQuestionType(q.type as string)) return false;
  if (!Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0) return false;
  if (!Array.isArray(q.options) || q.options.length === 0) return false;
  if (!Array.isArray(q.optionTexts) || q.optionTexts.length === 0) return false;
  if (!isValidQuestionCategory(q.category as string)) return false;
  if (typeof q.roundIndex !== 'number' || q.roundIndex < 0) return false;

  return true;
}

/**
 * Get a summary of validation errors grouped by field
 */
export function getErrorSummary(errors: ValidationError[]): Record<string, number> {
  const summary: Record<string, number> = {};
  errors.forEach((error) => {
    summary[error.field] = (summary[error.field] || 0) + 1;
  });
  return summary;
}
