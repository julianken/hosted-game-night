/**
 * Types and utilities for the Question Set Editor Modal
 *
 * This file defines the form data structures used when creating or editing
 * question sets. The editor uses "rounds" as a UI concept, which maps to
 * categories in the database.
 */

import type { TriviaQuestion } from '@beak-gaming/database/types';

/**
 * Form data for a single question within a round/category
 */
export interface QuestionFormData {
  question: string;
  options: string[];
  correctIndex: number;
}

/**
 * Form data for a category/round
 * This represents a grouping of questions in the editor UI
 */
export interface CategoryFormData {
  id: string;           // Category ID (e.g., 'science', 'history', or user-generated)
  name: string;         // Display name (e.g., 'Science & Nature', 'Round 1')
  questions: QuestionFormData[];
}

/**
 * Form data for the entire question set
 */
export interface QuestionSetFormData {
  name: string;
  description: string;
  categories: CategoryFormData[];
}

/**
 * Convert QuestionFormData to TriviaQuestion
 */
export function questionFormToTrivia(question: QuestionFormData): TriviaQuestion {
  return {
    question: question.question,
    options: question.options,
    correctIndex: question.correctIndex,
  };
}

/**
 * Convert TriviaQuestion to QuestionFormData
 */
export function triviaToQuestionForm(question: TriviaQuestion): QuestionFormData {
  return {
    question: question.question,
    options: question.options,
    correctIndex: question.correctIndex,
  };
}

/**
 * Check if a question has any content (non-empty question text)
 */
export function hasQuestionContent(question: QuestionFormData): boolean {
  return question.question.trim().length > 0;
}

/**
 * Check if a category/round has any questions with content
 */
export function hasRoundContent(category: CategoryFormData): boolean {
  return category.questions.some(hasQuestionContent);
}

/**
 * Generate a unique ID for a new category/round
 */
export function generateCategoryId(): string {
  return `round-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create an empty question
 */
export function createEmptyQuestion(): QuestionFormData {
  return {
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
  };
}

/**
 * Create an empty category/round
 */
export function createEmptyCategory(roundNumber: number): CategoryFormData {
  return {
    id: generateCategoryId(),
    name: `Round ${roundNumber}`,
    questions: [],
  };
}
