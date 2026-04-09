/**
 * Adapter: The Trivia API v2 -> App/DB question types.
 *
 * Pure functions. All are side-effect-free. Injectable RNG for deterministic tests.
 *
 * Imports TriviaApiQuestion from the client module (canonical definition).
 * Imports mapApiCategory from categories.ts (same lib/ directory).
 */

import { v4 as uuidv4 } from 'uuid';
import type { Question, QuestionCategory, QuestionId, QuestionType } from '@/types';
import type { TriviaQuestion } from '@/types/trivia-question';
import type { TriviaApiQuestion } from '@/lib/trivia-api/client';
import type { ApiAdapterOptions, ApiConversionSummary } from './types';
import { mapApiCategory } from '@/lib/categories';

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_QUESTIONS_PER_ROUND = 5;
const DEFAULT_SOURCE = 'the-trivia-api';

// =============================================================================
// SHUFFLE
// =============================================================================

/**
 * Fisher-Yates shuffle. Returns a new array, does not mutate input.
 *
 * @param items - Array to shuffle.
 * @param rng - Random number generator in [0, 1). Defaults to Math.random.
 */
export function fisherYatesShuffle<T>(
  items: readonly T[],
  rng: () => number = Math.random
): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

// =============================================================================
// TEXT SANITIZATION
// =============================================================================

/**
 * Sanitize answer or question text from the external API.
 *
 * Trims leading/trailing whitespace including non-breaking spaces (\u00a0),
 * and collapses internal runs of whitespace. The API has known data quality
 * issues such as "Kahlua\u00a0" with a trailing NBSP.
 */
export function sanitizeText(text: string): string {
  return text.replace(/[\s\u00a0]+/g, ' ').trim();
}

// =============================================================================
// SINGLE QUESTION: API -> App Question (in-memory)
// =============================================================================

/**
 * Convert a single TriviaApiQuestion into the app's in-memory Question type.
 *
 * - Shuffles the four answers so the correct answer is not always at position A.
 * - Detects true/false questions (2 options that are both "true"/"false").
 * - Sanitizes all text fields (trims NBSP and excess whitespace).
 * - Assigns a fresh UUID as the question ID (IDs are ephemeral).
 * - Maps the API category to an internal QuestionCategory.
 *
 * @param apiQuestion - Raw API question.
 * @param roundIndex - 0-based round index. Default: 0.
 * @param rng - Optional injectable RNG for deterministic tests.
 */
export function triviaApiQuestionToQuestion(
  apiQuestion: TriviaApiQuestion,
  roundIndex: number = 0,
  rng?: () => number
): Question {
  const correctText = sanitizeText(apiQuestion.correctAnswer);
  const incorrectTexts = apiQuestion.incorrectAnswers.map(sanitizeText);

  const allOptions = [
    { text: correctText, isCorrect: true },
    ...incorrectTexts.map((text) => ({ text, isCorrect: false })),
  ];

  const shuffled = fisherYatesShuffle(allOptions, rng);

  // Detect true/false: exactly 2 options both matching 'true'/'false' (case-insensitive)
  const isTrueFalse =
    shuffled.length === 2 &&
    shuffled.every(
      (opt) =>
        opt.text.toLowerCase() === 'true' || opt.text.toLowerCase() === 'false'
    );

  const type: QuestionType = isTrueFalse ? 'true_false' : 'multiple_choice';

  let options: string[];
  let optionTexts: string[];
  let correctAnswers: string[];

  if (type === 'true_false') {
    options = ['True', 'False'];
    optionTexts = ['True', 'False'];
    const correctNormalized = correctText.charAt(0).toUpperCase() + correctText.slice(1).toLowerCase();
    correctAnswers = [correctNormalized === 'True' ? 'True' : 'False'];
  } else {
    const letters = ['A', 'B', 'C', 'D'];
    options = letters.slice(0, shuffled.length);
    optionTexts = shuffled.map((opt) => opt.text);
    const correctIndex = shuffled.findIndex((opt) => opt.isCorrect);
    correctAnswers = [letters[correctIndex]];
  }

  const category: QuestionCategory = mapApiCategory(apiQuestion.category);

  return {
    id: uuidv4() as QuestionId,
    text: sanitizeText(apiQuestion.question.text),
    type,
    correctAnswers,
    options,
    optionTexts,
    category,
    roundIndex,
  };
}

// =============================================================================
// SINGLE QUESTION: API -> DB TriviaQuestion
// =============================================================================

/**
 * Convert a single TriviaApiQuestion into the database TriviaQuestion type.
 *
 * Used when saving API questions to a question set for later reuse.
 * Sets source and externalId for provenance tracking.
 *
 * @param apiQuestion - Raw API question.
 * @param source - Source identifier. Default: 'the-trivia-api'.
 * @param rng - Optional injectable RNG for deterministic tests.
 */
export function triviaApiQuestionToTriviaQuestion(
  apiQuestion: TriviaApiQuestion,
  source: string = DEFAULT_SOURCE,
  rng?: () => number
): TriviaQuestion {
  const correctText = sanitizeText(apiQuestion.correctAnswer);
  const incorrectTexts = apiQuestion.incorrectAnswers.map(sanitizeText);

  const allOptions = [correctText, ...incorrectTexts];
  const shuffled = fisherYatesShuffle(allOptions, rng);
  const correctIndex = shuffled.indexOf(correctText);

  const category = mapApiCategory(apiQuestion.category);

  return {
    question: sanitizeText(apiQuestion.question.text),
    options: shuffled,
    correctIndex,
    category,
    source,
    externalId: apiQuestion.id,
  };
}

// =============================================================================
// BATCH: API -> App Questions (with round assignment)
// =============================================================================

/**
 * Convert an array of TriviaApiQuestion into app Question objects with sequential
 * round assignment.
 *
 * Round assignment:
 * - Questions 0..(questionsPerRound-1) -> round 0
 * - Questions questionsPerRound..(2*questionsPerRound-1) -> round 1
 * - etc.
 *
 * @param apiQuestions - Raw API questions.
 * @param options - Adapter options (questionsPerRound, excludeNiche, source).
 * @param rng - Optional injectable RNG for deterministic tests.
 */
export function triviaApiQuestionsToQuestions(
  apiQuestions: readonly TriviaApiQuestion[],
  options: ApiAdapterOptions = {},
  rng?: () => number
): Question[] {
  const { questionsPerRound = DEFAULT_QUESTIONS_PER_ROUND, excludeNiche = false } = options;

  const filtered = excludeNiche
    ? apiQuestions.filter((q) => !q.isNiche)
    : apiQuestions;

  return filtered.map((apiQ, index) =>
    triviaApiQuestionToQuestion(apiQ, Math.floor(index / questionsPerRound), rng)
  );
}

// =============================================================================
// BATCH: API -> DB TriviaQuestions
// =============================================================================

/**
 * Convert an array of TriviaApiQuestion into database TriviaQuestion objects
 * for saving to a question set.
 *
 * @param apiQuestions - Raw API questions.
 * @param options - Adapter options (excludeNiche, source).
 * @param rng - Optional injectable RNG for deterministic tests.
 */
export function triviaApiQuestionsToTriviaQuestions(
  apiQuestions: readonly TriviaApiQuestion[],
  options: ApiAdapterOptions = {},
  rng?: () => number
): TriviaQuestion[] {
  const { excludeNiche = false, source = DEFAULT_SOURCE } = options;

  const filtered = excludeNiche
    ? apiQuestions.filter((q) => !q.isNiche)
    : apiQuestions;

  return filtered.map((apiQ) =>
    triviaApiQuestionToTriviaQuestion(apiQ, source, rng)
  );
}

// =============================================================================
// NICHE FILTER (standalone utility)
// =============================================================================

/**
 * Filter out niche questions from an API response without converting.
 * Useful for inspecting counts before conversion.
 */
export function filterNicheQuestions(
  apiQuestions: readonly TriviaApiQuestion[]
): TriviaApiQuestion[] {
  return apiQuestions.filter((q) => !q.isNiche);
}

// =============================================================================
// CONVERSION STATISTICS
// =============================================================================

/**
 * Compute statistics about what a batch conversion will produce, without
 * performing the conversion. Useful for preview UIs.
 *
 * @param apiQuestions - Raw API questions.
 * @param options - Same options that would be passed to conversion functions.
 */
export function getApiConversionSummary(
  apiQuestions: readonly TriviaApiQuestion[],
  options: ApiAdapterOptions = {}
): ApiConversionSummary {
  const { questionsPerRound = DEFAULT_QUESTIONS_PER_ROUND, excludeNiche = false } = options;

  const nicheCount = apiQuestions.filter((q) => q.isNiche).length;
  const filtered = excludeNiche
    ? apiQuestions.filter((q) => !q.isNiche)
    : apiQuestions;

  const categoryCounts: Record<string, number> = {};
  const difficultyCounts: Record<string, number> = {};

  for (const q of filtered) {
    const mappedCategory = mapApiCategory(q.category);
    categoryCounts[mappedCategory] = (categoryCounts[mappedCategory] ?? 0) + 1;
    difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] ?? 0) + 1;
  }

  const totalConverted = filtered.length;
  const roundsGenerated =
    totalConverted === 0 ? 0 : Math.ceil(totalConverted / questionsPerRound);

  return {
    totalReceived: apiQuestions.length,
    totalConverted,
    nicheFiltered: excludeNiche ? nicheCount : 0,
    roundsGenerated,
    categoryCounts,
    difficultyCounts,
  };
}
