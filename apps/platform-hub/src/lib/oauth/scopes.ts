import type { ScopeMetadata } from '@/types/oauth';

/**
 * Metadata for standard OAuth scopes
 * Maps scope strings to user-friendly display information
 */
export const SCOPE_METADATA: Record<string, ScopeMetadata> = {
  openid: {
    name: 'Identity',
    description: 'Access your basic profile information',
    icon: 'profile',
    required: true,
  },
  email: {
    name: 'Email Address',
    description: 'Access your email address',
    icon: 'email',
    required: true,
  },
  profile: {
    name: 'Profile',
    description: 'Access your full profile details',
    icon: 'profile',
  },
  offline_access: {
    name: 'Stay Signed In',
    description: 'Keep you signed in across sessions',
    icon: 'refresh',
  },
};

/**
 * Get metadata for a specific scope
 */
export function getScopeMetadata(scope: string): ScopeMetadata {
  return (
    SCOPE_METADATA[scope] || {
      name: scope,
      description: `Access to ${scope}`,
      icon: 'default',
    }
  );
}

/**
 * Get all scope metadata for an array of scopes
 */
export function getScopes(scopes: string[]): ScopeMetadata[] {
  return scopes.map(getScopeMetadata);
}

/**
 * Categorize scopes into required and optional
 */
export function categorizeScopes(scopes: string[]): {
  required: ScopeMetadata[];
  optional: ScopeMetadata[];
} {
  const allScopes = getScopes(scopes);
  return {
    required: allScopes.filter((s) => s.required),
    optional: allScopes.filter((s) => !s.required),
  };
}
