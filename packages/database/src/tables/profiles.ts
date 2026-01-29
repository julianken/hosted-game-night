/**
 * Profile (user) CRUD operations
 */

import type { TypedSupabaseClient } from '../client';
import type { Profile, ProfileUpdate } from '../types';
import { NotFoundError, withErrorHandling } from '../errors';
import { getById, update as genericUpdate } from '../queries';

// =============================================================================
// Types
// =============================================================================

export interface ProfileWithStats extends Profile {
  bingo_presets_count?: number;
  trivia_presets_count?: number;
}

// =============================================================================
// Profile Operations
// =============================================================================

/**
 * Gets the current user's profile
 */
export async function getCurrentProfile(
  client: TypedSupabaseClient
): Promise<Profile> {
  return withErrorHandling(async () => {
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      throw new NotFoundError('Profile', undefined, { reason: 'Not authenticated' });
    }

    return getById(client, 'profiles', user.id);
  });
}

/**
 * Gets a profile by ID
 */
export async function getProfile(
  client: TypedSupabaseClient,
  id: string
): Promise<Profile> {
  return getById(client, 'profiles', id);
}

/**
 * Gets a profile with preset counts
 */
export async function getProfileWithStats(
  client: TypedSupabaseClient,
  id: string
): Promise<ProfileWithStats> {
  return withErrorHandling(async () => {
    // Get profile with related counts using separate queries
    // (Supabase doesn't support COUNT in select with relations easily)
    const [profile, bingoCount, triviaCount] = await Promise.all([
      getById(client, 'profiles', id),
      client
        .from('bingo_presets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id)
        .then(({ count }) => count ?? 0),
      client
        .from('trivia_presets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id)
        .then(({ count }) => count ?? 0),
    ]);

    return {
      ...profile,
      bingo_presets_count: bingoCount,
      trivia_presets_count: triviaCount,
    };
  });
}

/**
 * Updates the current user's profile
 */
export async function updateCurrentProfile(
  client: TypedSupabaseClient,
  data: ProfileUpdate
): Promise<Profile> {
  return withErrorHandling(async () => {
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      throw new NotFoundError('Profile', undefined, { reason: 'Not authenticated' });
    }

    return genericUpdate(client, 'profiles', user.id, data);
  });
}

/**
 * Updates a profile by ID
 */
export async function updateProfile(
  client: TypedSupabaseClient,
  id: string,
  data: ProfileUpdate
): Promise<Profile> {
  return genericUpdate(client, 'profiles', id, data);
}

/**
 * Updates facility name
 */
export async function updateFacilityName(
  client: TypedSupabaseClient,
  facilityName: string
): Promise<Profile> {
  return updateCurrentProfile(client, { facility_name: facilityName });
}

/**
 * Updates default game title
 */
export async function updateDefaultGameTitle(
  client: TypedSupabaseClient,
  gameTitle: string
): Promise<Profile> {
  return updateCurrentProfile(client, { default_game_title: gameTitle });
}

/**
 * Updates logo URL
 */
export async function updateLogoUrl(
  client: TypedSupabaseClient,
  logoUrl: string | null
): Promise<Profile> {
  return updateCurrentProfile(client, { logo_url: logoUrl });
}

/**
 * Checks if the current user has a profile
 */
export async function hasProfile(client: TypedSupabaseClient): Promise<boolean> {
  try {
    await getCurrentProfile(client);
    return true;
  } catch {
    return false;
  }
}
