/**
 * Trivia question set CRUD operations (questions only, no settings)
 */

import type { TypedSupabaseClient } from '../client';
import type {
  TriviaQuestionSet,
  TriviaQuestionSetInsert,
  TriviaQuestionSetUpdate,
  TriviaQuestion,
} from '../types';
import { ValidationError, withErrorHandling } from '../errors';
import {
  getById,
  getOne,
  list,
  listAll,
  create,
  update,
  remove,
  fromTable,
  type ListOptions,
} from '../queries';
import { filters } from '../filters';
import type { PaginatedResult } from '../pagination';

// =============================================================================
// Constants
// =============================================================================

export const TRIVIA_QUESTION_SET_SEARCH_COLUMNS = ['name', 'description'];

// =============================================================================
// Validation
// =============================================================================

function validateQuestions(questions: TriviaQuestion[]): void {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    if (!q.question || typeof q.question !== 'string') {
      throw new ValidationError(`Question ${i + 1}: question text is required`, `questions[${i}].question`);
    }

    if (!Array.isArray(q.options) || q.options.length < 2) {
      throw new ValidationError(
        `Question ${i + 1}: at least 2 options are required`,
        `questions[${i}].options`
      );
    }

    if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      throw new ValidationError(
        `Question ${i + 1}: correctIndex must be a valid option index`,
        `questions[${i}].correctIndex`
      );
    }
  }
}

function validateTriviaQuestionSet(
  data: Partial<TriviaQuestionSetInsert | TriviaQuestionSetUpdate>
): void {
  if (data.questions !== undefined) {
    validateQuestions(data.questions);
  }
}

// =============================================================================
// Trivia Question Set Operations
// =============================================================================

/**
 * Gets a trivia question set by ID
 */
export async function getTriviaQuestionSet(
  client: TypedSupabaseClient,
  id: string
): Promise<TriviaQuestionSet> {
  return getById(client, 'trivia_question_sets', id);
}

/**
 * Lists trivia question sets for the current user
 */
export async function listTriviaQuestionSets(
  client: TypedSupabaseClient,
  userId: string,
  options: Omit<ListOptions, 'filters'> & { search?: string } = {}
): Promise<PaginatedResult<TriviaQuestionSet>> {
  return list(client, 'trivia_question_sets', {
    ...options,
    filters: [filters.byUser(userId)],
    searchColumns: options.search ? TRIVIA_QUESTION_SET_SEARCH_COLUMNS : undefined,
    count: true,
  });
}

/**
 * Lists all trivia question sets for a user (no pagination)
 */
export async function listAllTriviaQuestionSets(
  client: TypedSupabaseClient,
  userId: string
): Promise<TriviaQuestionSet[]> {
  return listAll(client, 'trivia_question_sets', {
    filters: [filters.byUser(userId)],
  });
}

/**
 * Gets the default trivia question set for a user
 */
export async function getDefaultTriviaQuestionSet(
  client: TypedSupabaseClient,
  userId: string
): Promise<TriviaQuestionSet | null> {
  return getOne(client, 'trivia_question_sets', {
    filters: [filters.byUser(userId), filters.eq('is_default', true)],
  });
}

/**
 * Creates a new trivia question set
 */
export async function createTriviaQuestionSet(
  client: TypedSupabaseClient,
  data: TriviaQuestionSetInsert
): Promise<TriviaQuestionSet> {
  validateTriviaQuestionSet(data);

  return withErrorHandling(async () => {
    if (data.is_default) {
      await unsetDefaultTriviaQuestionSet(client, data.user_id);
    }

    return create(client, 'trivia_question_sets', data);
  });
}

/**
 * Updates a trivia question set
 */
export async function updateTriviaQuestionSet(
  client: TypedSupabaseClient,
  id: string,
  data: TriviaQuestionSetUpdate
): Promise<TriviaQuestionSet> {
  validateTriviaQuestionSet(data);

  return withErrorHandling(async () => {
    if (data.is_default) {
      const existing = await getTriviaQuestionSet(client, id);
      await unsetDefaultTriviaQuestionSet(client, existing.user_id);
    }

    return update(client, 'trivia_question_sets', id, data);
  });
}

/**
 * Deletes a trivia question set
 */
export async function deleteTriviaQuestionSet(
  client: TypedSupabaseClient,
  id: string
): Promise<void> {
  return remove(client, 'trivia_question_sets', id);
}

/**
 * Sets a question set as the default
 */
export async function setDefaultTriviaQuestionSet(
  client: TypedSupabaseClient,
  id: string
): Promise<TriviaQuestionSet> {
  return withErrorHandling(async () => {
    const questionSet = await getTriviaQuestionSet(client, id);
    await unsetDefaultTriviaQuestionSet(client, questionSet.user_id);
    return update(client, 'trivia_question_sets', id, { is_default: true });
  });
}

/**
 * Unsets the default question set for a user
 */
async function unsetDefaultTriviaQuestionSet(
  client: TypedSupabaseClient,
  userId: string
): Promise<void> {
  await fromTable(client, 'trivia_question_sets')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);
}

/**
 * Duplicates a trivia question set
 */
export async function duplicateTriviaQuestionSet(
  client: TypedSupabaseClient,
  id: string,
  newName?: string
): Promise<TriviaQuestionSet> {
  return withErrorHandling(async () => {
    const existing = await getTriviaQuestionSet(client, id);

    const duplicateData: TriviaQuestionSetInsert = {
      user_id: existing.user_id,
      name: newName ?? `${existing.name} (Copy)`,
      description: existing.description,
      questions: existing.questions,
      is_default: false,
    };

    return create(client, 'trivia_question_sets', duplicateData);
  });
}

/**
 * Checks if a user owns a question set
 */
export async function userOwnsTriviaQuestionSet(
  client: TypedSupabaseClient,
  userId: string,
  questionSetId: string
): Promise<boolean> {
  const questionSet = await getOne(client, 'trivia_question_sets', {
    filters: [filters.eq('id', questionSetId), filters.byUser(userId)],
  });
  return questionSet !== null;
}

/**
 * Counts trivia question sets for a user
 */
export async function countTriviaQuestionSets(
  client: TypedSupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await client
    .from('trivia_question_sets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count ?? 0;
}

// =============================================================================
// Question Operations
// =============================================================================

/**
 * Adds questions to a question set
 */
export async function addQuestionsToSet(
  client: TypedSupabaseClient,
  id: string,
  newQuestions: TriviaQuestion[]
): Promise<TriviaQuestionSet> {
  return withErrorHandling(async () => {
    const existing = await getTriviaQuestionSet(client, id);
    const allQuestions = [...existing.questions, ...newQuestions];
    validateQuestions(allQuestions);
    return update(client, 'trivia_question_sets', id, { questions: allQuestions });
  });
}

/**
 * Removes a question from a question set by index
 */
export async function removeQuestionFromSet(
  client: TypedSupabaseClient,
  id: string,
  questionIndex: number
): Promise<TriviaQuestionSet> {
  return withErrorHandling(async () => {
    const existing = await getTriviaQuestionSet(client, id);
    if (questionIndex < 0 || questionIndex >= existing.questions.length) {
      throw new ValidationError('Invalid question index', 'questionIndex');
    }
    const updatedQuestions = existing.questions.filter((_, i) => i !== questionIndex);
    return update(client, 'trivia_question_sets', id, { questions: updatedQuestions });
  });
}

/**
 * Updates a specific question in a question set
 */
export async function updateQuestionInSet(
  client: TypedSupabaseClient,
  id: string,
  questionIndex: number,
  questionData: Partial<TriviaQuestion>
): Promise<TriviaQuestionSet> {
  return withErrorHandling(async () => {
    const existing = await getTriviaQuestionSet(client, id);
    if (questionIndex < 0 || questionIndex >= existing.questions.length) {
      throw new ValidationError('Invalid question index', 'questionIndex');
    }

    const updatedQuestions = [...existing.questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      ...questionData,
    };

    validateQuestions(updatedQuestions);
    return update(client, 'trivia_question_sets', id, { questions: updatedQuestions });
  });
}

/**
 * Reorders questions in a question set
 */
export async function reorderQuestionsInSet(
  client: TypedSupabaseClient,
  id: string,
  newOrder: number[]
): Promise<TriviaQuestionSet> {
  return withErrorHandling(async () => {
    const existing = await getTriviaQuestionSet(client, id);

    if (newOrder.length !== existing.questions.length) {
      throw new ValidationError('New order must include all question indices', 'newOrder');
    }

    const reordered = newOrder.map((index) => {
      if (index < 0 || index >= existing.questions.length) {
        throw new ValidationError(`Invalid index ${index} in new order`, 'newOrder');
      }
      return existing.questions[index];
    });

    return update(client, 'trivia_question_sets', id, { questions: reordered });
  });
}

/**
 * Gets total question count for a user across all question sets
 */
export async function getQuestionSetTotalCount(
  client: TypedSupabaseClient,
  userId: string
): Promise<number> {
  const sets = await listAllTriviaQuestionSets(client, userId);
  return sets.reduce((sum, s) => sum + s.questions.length, 0);
}
