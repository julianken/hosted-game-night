// @deprecated-canonical - This package is NOT used by bingo/trivia. Apps use local implementations.
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthConfig } from './types';

/**
 * Environment variable validation result
 */
interface EnvVariables {
  url: string;
  anonKey: string;
}

/**
 * Validates that all required Supabase environment variables are set.
 * Throws descriptive errors at module load time if any are missing.
 */
function validateEnvVariables(config?: AuthConfig): EnvVariables {
  const url = config?.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = config?.supabaseAnonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build time, use placeholder values to avoid build failures
  // The validation will still run at runtime when the client is actually used
  const isBuildTime = typeof window === 'undefined' && process.env.NODE_ENV !== 'test';

  if (isBuildTime && (!url || !anonKey)) {
    return { url: 'https://placeholder.supabase.co', anonKey: 'placeholder-key' };
  }

  if (!url) {
    throw new Error(
      'Missing required Supabase URL.\n' +
      'Either pass supabaseUrl in config or set NEXT_PUBLIC_SUPABASE_URL environment variable.\n' +
      'Expected format: https://your-project-ref.supabase.co'
    );
  }

  if (!anonKey) {
    throw new Error(
      'Missing required Supabase anon key.\n' +
      'Either pass supabaseAnonKey in config or set NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.\n' +
      'Expected format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (JWT token)'
    );
  }

  return { url, anonKey };
}

// Cache for the default client instance
let defaultClient: SupabaseClient | null = null;

/**
 * Creates a Supabase client for browser/client-side usage.
 * This client is suitable for use in React components and client-side code.
 *
 * @param config - Optional configuration overrides
 * @returns Supabase client instance
 *
 * @example
 * ```typescript
 * // Using environment variables (recommended)
 * const supabase = createClient();
 *
 * // With custom config
 * const supabase = createClient({
 *   supabaseUrl: 'https://your-project.supabase.co',
 *   supabaseAnonKey: 'your-anon-key',
 * });
 * ```
 */
export function createClient(config?: AuthConfig): SupabaseClient {
  const { url, anonKey } = validateEnvVariables(config);
  return createBrowserClient(url, anonKey);
}

/**
 * Gets or creates a singleton Supabase client for browser usage.
 * Use this when you want to share a single client instance across your app.
 *
 * @returns Singleton Supabase client instance
 *
 * @example
 * ```typescript
 * const supabase = getClient();
 * const { data: user } = await supabase.auth.getUser();
 * ```
 */
export function getClient(): SupabaseClient {
  if (!defaultClient) {
    defaultClient = createClient();
  }
  return defaultClient;
}

/**
 * Resets the cached client instance.
 * Useful for testing or when environment variables change.
 */
export function resetClient(): void {
  defaultClient = null;
}

// Re-export SupabaseClient type for convenience
export type { SupabaseClient };
