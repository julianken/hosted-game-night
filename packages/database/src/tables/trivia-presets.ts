/**
 * Trivia preset CRUD operations (settings only, no questions)
 */

import type { TypedSupabaseClient } from '../client';
import type { TriviaPreset, TriviaPresetInsert, TriviaPresetUpdate } from '../types';
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
import {
  ROUNDS_COUNT_MIN,
  ROUNDS_COUNT_MAX,
  QUESTIONS_PER_ROUND_MIN,
  QUESTIONS_PER_ROUND_MAX,
  TIMER_DURATION_MIN,
  TIMER_DURATION_MAX,
} from './trivia-templates';

// =============================================================================
// Constants
// =============================================================================

export const TRIVIA_PRESET_SEARCH_COLUMNS = ['name'];

// =============================================================================
// Validation
// =============================================================================

function validateTriviaPreset(data: Partial<TriviaPresetInsert | TriviaPresetUpdate>): void {
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
}

// =============================================================================
// Trivia Preset Operations
// =============================================================================

/**
 * Gets a trivia preset by ID
 */
export async function getTriviaPreset(
  client: TypedSupabaseClient,
  id: string
): Promise<TriviaPreset> {
  return getById(client, 'trivia_presets', id);
}

/**
 * Lists trivia presets for the current user
 */
export async function listTriviaPresets(
  client: TypedSupabaseClient,
  userId: string,
  options: Omit<ListOptions, 'filters'> & { search?: string } = {}
): Promise<PaginatedResult<TriviaPreset>> {
  return list(client, 'trivia_presets', {
    ...options,
    filters: [filters.byUser(userId)],
    searchColumns: options.search ? TRIVIA_PRESET_SEARCH_COLUMNS : undefined,
    count: true,
  });
}

/**
 * Lists all trivia presets for a user (no pagination)
 */
export async function listAllTriviaPresets(
  client: TypedSupabaseClient,
  userId: string
): Promise<TriviaPreset[]> {
  return listAll(client, 'trivia_presets', {
    filters: [filters.byUser(userId)],
  });
}

/**
 * Gets the default trivia preset for a user
 */
export async function getDefaultTriviaPreset(
  client: TypedSupabaseClient,
  userId: string
): Promise<TriviaPreset | null> {
  return getOne(client, 'trivia_presets', {
    filters: [filters.byUser(userId), filters.eq('is_default', true)],
  });
}

/**
 * Creates a new trivia preset
 */
export async function createTriviaPreset(
  client: TypedSupabaseClient,
  data: TriviaPresetInsert
): Promise<TriviaPreset> {
  validateTriviaPreset(data);

  return withErrorHandling(async () => {
    if (data.is_default) {
      await unsetDefaultTriviaPreset(client, data.user_id);
    }

    return create(client, 'trivia_presets', data);
  });
}

/**
 * Updates a trivia preset
 */
export async function updateTriviaPreset(
  client: TypedSupabaseClient,
  id: string,
  data: TriviaPresetUpdate
): Promise<TriviaPreset> {
  validateTriviaPreset(data);

  return withErrorHandling(async () => {
    if (data.is_default) {
      const existing = await getTriviaPreset(client, id);
      await unsetDefaultTriviaPreset(client, existing.user_id);
    }

    return update(client, 'trivia_presets', id, data);
  });
}

/**
 * Deletes a trivia preset
 */
export async function deleteTriviaPreset(
  client: TypedSupabaseClient,
  id: string
): Promise<void> {
  return remove(client, 'trivia_presets', id);
}

/**
 * Sets a preset as the default
 */
export async function setDefaultTriviaPreset(
  client: TypedSupabaseClient,
  id: string
): Promise<TriviaPreset> {
  return withErrorHandling(async () => {
    const preset = await getTriviaPreset(client, id);
    await unsetDefaultTriviaPreset(client, preset.user_id);
    return update(client, 'trivia_presets', id, { is_default: true });
  });
}

/**
 * Unsets the default preset for a user
 */
async function unsetDefaultTriviaPreset(
  client: TypedSupabaseClient,
  userId: string
): Promise<void> {
  await fromTable(client, 'trivia_presets')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);
}

/**
 * Duplicates a trivia preset
 */
export async function duplicateTriviaPreset(
  client: TypedSupabaseClient,
  id: string,
  newName?: string
): Promise<TriviaPreset> {
  return withErrorHandling(async () => {
    const existing = await getTriviaPreset(client, id);

    const duplicateData: TriviaPresetInsert = {
      user_id: existing.user_id,
      name: newName ?? `${existing.name} (Copy)`,
      rounds_count: existing.rounds_count,
      questions_per_round: existing.questions_per_round,
      timer_duration: existing.timer_duration,
      is_default: false,
    };

    return create(client, 'trivia_presets', duplicateData);
  });
}

/**
 * Checks if a user owns a preset
 */
export async function userOwnsTriviaPreset(
  client: TypedSupabaseClient,
  userId: string,
  presetId: string
): Promise<boolean> {
  const preset = await getOne(client, 'trivia_presets', {
    filters: [filters.eq('id', presetId), filters.byUser(userId)],
  });
  return preset !== null;
}

/**
 * Counts trivia presets for a user
 */
export async function countTriviaPresets(
  client: TypedSupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await client
    .from('trivia_presets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count ?? 0;
}
