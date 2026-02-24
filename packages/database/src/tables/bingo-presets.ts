/**
 * Bingo preset CRUD operations
 */

import type { TypedSupabaseClient } from '../client';
import type { BingoPreset, BingoPresetInsert, BingoPresetUpdate } from '../types';
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

export const BINGO_PRESET_SEARCH_COLUMNS = ['name', 'pattern_id', 'voice_pack'];

const AUTO_CALL_INTERVAL_MIN = 1000;
const AUTO_CALL_INTERVAL_MAX = 30000;

// =============================================================================
// Validation
// =============================================================================

function validateBingoPreset(data: Partial<BingoPresetInsert | BingoPresetUpdate>): void {
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
// Bingo Preset Operations
// =============================================================================

/**
 * Gets a bingo preset by ID
 */
export async function getBingoPreset(
  client: TypedSupabaseClient,
  id: string
): Promise<BingoPreset> {
  return getById(client, 'bingo_presets', id);
}

/**
 * Lists bingo presets for the current user
 */
export async function listBingoPresets(
  client: TypedSupabaseClient,
  userId: string,
  options: Omit<ListOptions, 'filters'> & { search?: string } = {}
): Promise<PaginatedResult<BingoPreset>> {
  return list(client, 'bingo_presets', {
    ...options,
    filters: [filters.byUser(userId)],
    searchColumns: options.search ? BINGO_PRESET_SEARCH_COLUMNS : undefined,
    count: true,
  });
}

/**
 * Lists all bingo presets for a user (no pagination)
 */
export async function listAllBingoPresets(
  client: TypedSupabaseClient,
  userId: string
): Promise<BingoPreset[]> {
  return listAll(client, 'bingo_presets', {
    filters: [filters.byUser(userId)],
  });
}

/**
 * Gets the default bingo preset for a user
 */
export async function getDefaultBingoPreset(
  client: TypedSupabaseClient,
  userId: string
): Promise<BingoPreset | null> {
  return getOne(client, 'bingo_presets', {
    filters: [filters.byUser(userId), filters.eq('is_default', true)],
  });
}

/**
 * Creates a new bingo preset
 */
export async function createBingoPreset(
  client: TypedSupabaseClient,
  data: BingoPresetInsert
): Promise<BingoPreset> {
  validateBingoPreset(data);

  return withErrorHandling(async () => {
    // If this is set as default, unset other defaults first
    if (data.is_default) {
      await unsetDefaultBingoPreset(client, data.user_id);
    }

    return create(client, 'bingo_presets', data);
  });
}

/**
 * Updates a bingo preset
 */
export async function updateBingoPreset(
  client: TypedSupabaseClient,
  id: string,
  data: BingoPresetUpdate
): Promise<BingoPreset> {
  validateBingoPreset(data);

  return withErrorHandling(async () => {
    // If setting as default, need to unset others first
    if (data.is_default) {
      const existing = await getBingoPreset(client, id);
      await unsetDefaultBingoPreset(client, existing.user_id);
    }

    return update(client, 'bingo_presets', id, data);
  });
}

/**
 * Deletes a bingo preset
 */
export async function deleteBingoPreset(
  client: TypedSupabaseClient,
  id: string
): Promise<void> {
  return remove(client, 'bingo_presets', id);
}

/**
 * Sets a preset as the default
 */
export async function setDefaultBingoPreset(
  client: TypedSupabaseClient,
  id: string
): Promise<BingoPreset> {
  return withErrorHandling(async () => {
    const preset = await getBingoPreset(client, id);
    await unsetDefaultBingoPreset(client, preset.user_id);
    return update(client, 'bingo_presets', id, { is_default: true });
  });
}

/**
 * Unsets the default preset for a user
 */
async function unsetDefaultBingoPreset(
  client: TypedSupabaseClient,
  userId: string
): Promise<void> {
  await fromTable(client, 'bingo_presets')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);
}

/**
 * Duplicates a bingo preset
 */
export async function duplicateBingoPreset(
  client: TypedSupabaseClient,
  id: string,
  newName?: string
): Promise<BingoPreset> {
  return withErrorHandling(async () => {
    const existing = await getBingoPreset(client, id);

    const duplicateData: BingoPresetInsert = {
      user_id: existing.user_id,
      name: newName ?? `${existing.name} (Copy)`,
      pattern_id: existing.pattern_id,
      voice_pack: existing.voice_pack,
      auto_call_enabled: existing.auto_call_enabled,
      auto_call_interval: existing.auto_call_interval,
      is_default: false, // Duplicates are never default
    };

    return create(client, 'bingo_presets', duplicateData);
  });
}

/**
 * Checks if a user owns a preset
 */
export async function userOwnsBingoPreset(
  client: TypedSupabaseClient,
  userId: string,
  presetId: string
): Promise<boolean> {
  const preset = await getOne(client, 'bingo_presets', {
    filters: [filters.eq('id', presetId), filters.byUser(userId)],
  });
  return preset !== null;
}

/**
 * Counts bingo presets for a user
 */
export async function countBingoPresets(
  client: TypedSupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await client
    .from('bingo_presets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count ?? 0;
}
