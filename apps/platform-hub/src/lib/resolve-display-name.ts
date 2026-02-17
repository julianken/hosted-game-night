/**
 * Resolves a user's display name from Supabase auth metadata with a robust fallback chain.
 *
 * Supabase stores display names in different metadata fields depending on the auth provider:
 * - `display_name`: Set via Supabase dashboard or profile update
 * - `full_name`: Set during email/password signup (our SignupForm uses this)
 * - `name`: Set by some OAuth providers (Google, GitHub, etc.)
 *
 * @param userMetadata - The user's `user_metadata` object from Supabase auth
 * @param email - The user's email address (used as last resort fallback)
 * @param defaultName - Final fallback if no name can be resolved (default: 'Guest')
 * @returns The resolved display name
 */
export function resolveDisplayName(
  userMetadata?: Record<string, unknown> | null,
  email?: string | null,
  defaultName: string = 'Guest'
): string {
  // Check metadata fields in priority order
  const metadataName =
    getStringField(userMetadata, 'display_name') ||
    getStringField(userMetadata, 'full_name') ||
    getStringField(userMetadata, 'name');

  if (metadataName) {
    return metadataName;
  }

  // Fall back to email prefix
  if (email) {
    const prefix = email.split('@')[0];
    if (prefix) {
      return prefix;
    }
  }

  return defaultName;
}

/**
 * Safely extract a non-empty string field from user metadata.
 */
function getStringField(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | undefined {
  if (!metadata) return undefined;
  const value = metadata[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}
