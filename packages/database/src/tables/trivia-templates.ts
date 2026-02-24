/**
 * Trivia template CRUD operations
 */

import type { TypedSupabaseClient } from '../client';
import type {
  TriviaTemplate,
  TriviaTemplateInsert,
  TriviaTemplateUpdate,
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

export const TRIVIA_TEMPLATE_SEARCH_COLUMNS = ['name'];

export const ROUNDS_COUNT_MIN = 1;
export const ROUNDS_COUNT_MAX = 20;
export const QUESTIONS_PER_ROUND_MIN = 1;
export const QUESTIONS_PER_ROUND_MAX = 50;
export const TIMER_DURATION_MIN = 5;
export const TIMER_DURATION_MAX = 300;

// =============================================================================
// Validation
// =============================================================================

function validateTriviaTemplate(data: Partial<TriviaTemplateInsert | TriviaTemplateUpdate>): void {
  if (
    data.rounds_count !== undefined &&
    (data.rounds_count < ROUNDS_COUNT_MIN || data.rounds_count > ROUNDS_COUNT_MAX)
  ) {
    throw new ValidationError(
      `rounds_count must be between ${ROUNDS_COUNT_MIN} and ${ROUNDS_COUNT_MAX}`,
      'rounds_count'
    );
  }

  if (
    data.questions_per_round !== undefined &&
    (data.questions_per_round < QUESTIONS_PER_ROUND_MIN ||
      data.questions_per_round > QUESTIONS_PER_ROUND_MAX)
  ) {
    throw new ValidationError(
      `questions_per_round must be between ${QUESTIONS_PER_ROUND_MIN} and ${QUESTIONS_PER_ROUND_MAX}`,
      'questions_per_round'
    );
  }

  if (
    data.timer_duration !== undefined &&
    (data.timer_duration < TIMER_DURATION_MIN || data.timer_duration > TIMER_DURATION_MAX)
  ) {
    throw new ValidationError(
      `timer_duration must be between ${TIMER_DURATION_MIN} and ${TIMER_DURATION_MAX} seconds`,
      'timer_duration'
    );
  }

  if (data.questions !== undefined) {
    validateQuestions(data.questions);
  }
}

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

// =============================================================================
// Trivia Template Operations
// =============================================================================

/**
 * Gets a trivia template by ID
 */
export async function getTriviaTemplate(
  client: TypedSupabaseClient,
  id: string
): Promise<TriviaTemplate> {
  return getById(client, 'trivia_templates', id);
}

/**
 * Lists trivia templates for the current user
 */
export async function listTriviaTemplates(
  client: TypedSupabaseClient,
  userId: string,
  options: Omit<ListOptions, 'filters'> & { search?: string } = {}
): Promise<PaginatedResult<TriviaTemplate>> {
  return list(client, 'trivia_templates', {
    ...options,
    filters: [filters.byUser(userId)],
    searchColumns: options.search ? TRIVIA_TEMPLATE_SEARCH_COLUMNS : undefined,
    count: true,
  });
}

/**
 * Lists all trivia templates for a user (no pagination)
 */
export async function listAllTriviaTemplates(
  client: TypedSupabaseClient,
  userId: string
): Promise<TriviaTemplate[]> {
  return listAll(client, 'trivia_templates', {
    filters: [filters.byUser(userId)],
  });
}

/**
 * Gets the default trivia template for a user
 */
export async function getDefaultTriviaTemplate(
  client: TypedSupabaseClient,
  userId: string
): Promise<TriviaTemplate | null> {
  return getOne(client, 'trivia_templates', {
    filters: [filters.byUser(userId), filters.eq('is_default', true)],
  });
}

/**
 * Creates a new trivia template
 */
export async function createTriviaTemplate(
  client: TypedSupabaseClient,
  data: TriviaTemplateInsert
): Promise<TriviaTemplate> {
  validateTriviaTemplate(data);

  return withErrorHandling(async () => {
    // If this is set as default, unset other defaults first
    if (data.is_default) {
      await unsetDefaultTriviaTemplate(client, data.user_id);
    }

    return create(client, 'trivia_templates', data);
  });
}

/**
 * Updates a trivia template
 */
export async function updateTriviaTemplate(
  client: TypedSupabaseClient,
  id: string,
  data: TriviaTemplateUpdate
): Promise<TriviaTemplate> {
  validateTriviaTemplate(data);

  return withErrorHandling(async () => {
    // If setting as default, need to unset others first
    if (data.is_default) {
      const existing = await getTriviaTemplate(client, id);
      await unsetDefaultTriviaTemplate(client, existing.user_id);
    }

    return update(client, 'trivia_templates', id, data);
  });
}

/**
 * Deletes a trivia template
 */
export async function deleteTriviaTemplate(
  client: TypedSupabaseClient,
  id: string
): Promise<void> {
  return remove(client, 'trivia_templates', id);
}

/**
 * Sets a template as the default
 */
export async function setDefaultTriviaTemplate(
  client: TypedSupabaseClient,
  id: string
): Promise<TriviaTemplate> {
  return withErrorHandling(async () => {
    const template = await getTriviaTemplate(client, id);
    await unsetDefaultTriviaTemplate(client, template.user_id);
    return update(client, 'trivia_templates', id, { is_default: true });
  });
}

/**
 * Unsets the default template for a user
 */
async function unsetDefaultTriviaTemplate(
  client: TypedSupabaseClient,
  userId: string
): Promise<void> {
  await fromTable(client, 'trivia_templates')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);
}

/**
 * Duplicates a trivia template
 */
export async function duplicateTriviaTemplate(
  client: TypedSupabaseClient,
  id: string,
  newName?: string
): Promise<TriviaTemplate> {
  return withErrorHandling(async () => {
    const existing = await getTriviaTemplate(client, id);

    const duplicateData: TriviaTemplateInsert = {
      user_id: existing.user_id,
      name: newName ?? `${existing.name} (Copy)`,
      questions: existing.questions,
      rounds_count: existing.rounds_count,
      questions_per_round: existing.questions_per_round,
      timer_duration: existing.timer_duration,
      is_default: false, // Duplicates are never default
    };

    return create(client, 'trivia_templates', duplicateData);
  });
}

/**
 * Adds questions to a template
 */
export async function addQuestions(
  client: TypedSupabaseClient,
  id: string,
  newQuestions: TriviaQuestion[]
): Promise<TriviaTemplate> {
  return withErrorHandling(async () => {
    const existing = await getTriviaTemplate(client, id);
    const allQuestions = [...existing.questions, ...newQuestions];
    validateQuestions(allQuestions);
    return update(client, 'trivia_templates', id, { questions: allQuestions });
  });
}

/**
 * Removes a question from a template by index
 */
export async function removeQuestion(
  client: TypedSupabaseClient,
  id: string,
  questionIndex: number
): Promise<TriviaTemplate> {
  return withErrorHandling(async () => {
    const existing = await getTriviaTemplate(client, id);
    if (questionIndex < 0 || questionIndex >= existing.questions.length) {
      throw new ValidationError('Invalid question index', 'questionIndex');
    }
    const updatedQuestions = existing.questions.filter((_, i) => i !== questionIndex);
    return update(client, 'trivia_templates', id, { questions: updatedQuestions });
  });
}

/**
 * Updates a specific question in a template
 */
export async function updateQuestion(
  client: TypedSupabaseClient,
  id: string,
  questionIndex: number,
  questionData: Partial<TriviaQuestion>
): Promise<TriviaTemplate> {
  return withErrorHandling(async () => {
    const existing = await getTriviaTemplate(client, id);
    if (questionIndex < 0 || questionIndex >= existing.questions.length) {
      throw new ValidationError('Invalid question index', 'questionIndex');
    }

    const updatedQuestions = [...existing.questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      ...questionData,
    };

    validateQuestions(updatedQuestions);
    return update(client, 'trivia_templates', id, { questions: updatedQuestions });
  });
}

/**
 * Reorders questions in a template
 */
export async function reorderQuestions(
  client: TypedSupabaseClient,
  id: string,
  newOrder: number[]
): Promise<TriviaTemplate> {
  return withErrorHandling(async () => {
    const existing = await getTriviaTemplate(client, id);

    if (newOrder.length !== existing.questions.length) {
      throw new ValidationError('New order must include all question indices', 'newOrder');
    }

    const reordered = newOrder.map((index) => {
      if (index < 0 || index >= existing.questions.length) {
        throw new ValidationError(`Invalid index ${index} in new order`, 'newOrder');
      }
      return existing.questions[index];
    });

    return update(client, 'trivia_templates', id, { questions: reordered });
  });
}

/**
 * Checks if a user owns a template
 */
export async function userOwnsTriviaTemplate(
  client: TypedSupabaseClient,
  userId: string,
  templateId: string
): Promise<boolean> {
  const template = await getOne(client, 'trivia_templates', {
    filters: [filters.eq('id', templateId), filters.byUser(userId)],
  });
  return template !== null;
}

/**
 * Counts trivia templates for a user
 */
export async function countTriviaTemplates(
  client: TypedSupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await client
    .from('trivia_templates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Gets total question count for a user across all templates
 */
export async function getTotalQuestionCount(
  client: TypedSupabaseClient,
  userId: string
): Promise<number> {
  const templates = await listAllTriviaTemplates(client, userId);
  return templates.reduce((sum, t) => sum + t.questions.length, 0);
}
