/**
 * Bingo template CRUD operations
 */

import type { TypedSupabaseClient } from '../client';
import type { BingoTemplate, BingoTemplateInsert, BingoTemplateUpdate } from '../types';
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

export const BINGO_TEMPLATE_SEARCH_COLUMNS = ['name', 'pattern_id', 'voice_pack'];

export const AUTO_CALL_INTERVAL_MIN = 1000;
export const AUTO_CALL_INTERVAL_MAX = 30000;

// =============================================================================
// Validation
// =============================================================================

function validateBingoTemplate(data: Partial<BingoTemplateInsert | BingoTemplateUpdate>): void {
  if (
    data.auto_call_interval !== undefined &&
    (data.auto_call_interval < AUTO_CALL_INTERVAL_MIN ||
      data.auto_call_interval > AUTO_CALL_INTERVAL_MAX)
  ) {
    throw new ValidationError(
      `auto_call_interval must be between ${AUTO_CALL_INTERVAL_MIN} and ${AUTO_CALL_INTERVAL_MAX} milliseconds`,
      'auto_call_interval'
    );
  }
}

// =============================================================================
// Bingo Template Operations
// =============================================================================

/**
 * Gets a bingo template by ID
 */
export async function getBingoTemplate(
  client: TypedSupabaseClient,
  id: string
): Promise<BingoTemplate> {
  return getById(client, 'bingo_templates', id);
}

/**
 * Lists bingo templates for the current user
 */
export async function listBingoTemplates(
  client: TypedSupabaseClient,
  userId: string,
  options: Omit<ListOptions, 'filters'> & { search?: string } = {}
): Promise<PaginatedResult<BingoTemplate>> {
  return list(client, 'bingo_templates', {
    ...options,
    filters: [filters.byUser(userId)],
    searchColumns: options.search ? BINGO_TEMPLATE_SEARCH_COLUMNS : undefined,
    count: true,
  });
}

/**
 * Lists all bingo templates for a user (no pagination)
 */
export async function listAllBingoTemplates(
  client: TypedSupabaseClient,
  userId: string
): Promise<BingoTemplate[]> {
  return listAll(client, 'bingo_templates', {
    filters: [filters.byUser(userId)],
  });
}

/**
 * Gets the default bingo template for a user
 */
export async function getDefaultBingoTemplate(
  client: TypedSupabaseClient,
  userId: string
): Promise<BingoTemplate | null> {
  return getOne(client, 'bingo_templates', {
    filters: [filters.byUser(userId), filters.eq('is_default', true)],
  });
}

/**
 * Creates a new bingo template
 */
export async function createBingoTemplate(
  client: TypedSupabaseClient,
  data: BingoTemplateInsert
): Promise<BingoTemplate> {
  validateBingoTemplate(data);

  return withErrorHandling(async () => {
    // If this is set as default, unset other defaults first
    if (data.is_default) {
      await unsetDefaultBingoTemplate(client, data.user_id);
    }

    return create(client, 'bingo_templates', data);
  });
}

/**
 * Updates a bingo template
 */
export async function updateBingoTemplate(
  client: TypedSupabaseClient,
  id: string,
  data: BingoTemplateUpdate
): Promise<BingoTemplate> {
  validateBingoTemplate(data);

  return withErrorHandling(async () => {
    // If setting as default, need to unset others first
    if (data.is_default) {
      const existing = await getBingoTemplate(client, id);
      await unsetDefaultBingoTemplate(client, existing.user_id);
    }

    return update(client, 'bingo_templates', id, data);
  });
}

/**
 * Deletes a bingo template
 */
export async function deleteBingoTemplate(
  client: TypedSupabaseClient,
  id: string
): Promise<void> {
  return remove(client, 'bingo_templates', id);
}

/**
 * Sets a template as the default
 */
export async function setDefaultBingoTemplate(
  client: TypedSupabaseClient,
  id: string
): Promise<BingoTemplate> {
  return withErrorHandling(async () => {
    const template = await getBingoTemplate(client, id);
    await unsetDefaultBingoTemplate(client, template.user_id);
    return update(client, 'bingo_templates', id, { is_default: true });
  });
}

/**
 * Unsets the default template for a user
 */
async function unsetDefaultBingoTemplate(
  client: TypedSupabaseClient,
  userId: string
): Promise<void> {
  await fromTable(client, 'bingo_templates')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);
}

/**
 * Duplicates a bingo template
 */
export async function duplicateBingoTemplate(
  client: TypedSupabaseClient,
  id: string,
  newName?: string
): Promise<BingoTemplate> {
  return withErrorHandling(async () => {
    const existing = await getBingoTemplate(client, id);

    const duplicateData: BingoTemplateInsert = {
      user_id: existing.user_id,
      name: newName ?? `${existing.name} (Copy)`,
      pattern_id: existing.pattern_id,
      voice_pack: existing.voice_pack,
      auto_call_enabled: existing.auto_call_enabled,
      auto_call_interval: existing.auto_call_interval,
      is_default: false, // Duplicates are never default
    };

    return create(client, 'bingo_templates', duplicateData);
  });
}

/**
 * Checks if a user owns a template
 */
export async function userOwnsBingoTemplate(
  client: TypedSupabaseClient,
  userId: string,
  templateId: string
): Promise<boolean> {
  const template = await getOne(client, 'bingo_templates', {
    filters: [filters.eq('id', templateId), filters.byUser(userId)],
  });
  return template !== null;
}

/**
 * Counts bingo templates for a user
 */
export async function countBingoTemplates(
  client: TypedSupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await client
    .from('bingo_templates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count ?? 0;
}
