/**
 * Supabase server client for Next.js App Router
 *
 * This module provides server-side Supabase client creation for use in
 * Next.js Server Components, API routes, and middleware.
 *
 * @example
 * ```ts
 * import { createServerClient } from '@beak-gaming/database/server';
 *
 * export async function GET() {
 *   const supabase = await createServerClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   // ...
 * }
 * ```
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// =============================================================================
// Environment Validation
// =============================================================================

/**
 * Validates that all required Supabase environment variables are set.
 * Throws descriptive errors if any are missing.
 *
 * @internal
 */
function validateEnvVariables(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build time, use placeholder values to avoid build failures
  // The validation will still run at runtime when the client is actually used
  const isBuildTime =
    process.env.NODE_ENV !== 'test' && process.env.NEXT_PHASE === 'phase-production-build';

  if (isBuildTime && (!url || !anonKey)) {
    return { url: 'https://placeholder.supabase.co', anonKey: 'placeholder-key' };
  }

  if (!url) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL\n' +
        'Expected format: https://your-project-ref.supabase.co\n' +
        'Please add this variable to your .env.local file.'
    );
  }

  if (!anonKey) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
        'Expected format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (JWT token)\n' +
        'Please add this variable to your .env.local file.'
    );
  }

  return { url, anonKey };
}

// =============================================================================
// Server Client
// =============================================================================

/**
 * Creates a Supabase client for server-side use in Next.js.
 *
 * This client:
 * - Uses cookies for session management
 * - Works in Server Components, API routes, and middleware
 * - Automatically handles session refresh
 *
 * @returns A typed Supabase client configured for server-side use
 *
 * @example
 * ```ts
 * // In an API route
 * import { createServerClient } from '@beak-gaming/database/server';
 *
 * export async function GET() {
 *   const supabase = await createServerClient();
 *   const { data: { user }, error } = await supabase.auth.getUser();
 *
 *   if (error || !user) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *
 *   // Use supabase client...
 * }
 * ```
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = validateEnvVariables();

  return createSupabaseServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from Server Component - ignore
          // The `cookies().set()` method was called from a Server Component.
          // This can be safely ignored, as the cookies will still be set on the response.
        }
      },
    },
  });
}

// =============================================================================
// Service Role Client
// =============================================================================

/**
 * Creates a Supabase client with service role access.
 * Used for E2E testing and admin operations that bypass RLS.
 *
 * WARNING: This client has full database access - use with caution!
 * Never expose this client to the browser or untrusted code.
 *
 * @returns A Supabase client with service role privileges
 *
 * @example
 * ```ts
 * // In a server-only admin script
 * import { createServiceRoleClient } from '@beak-gaming/database/server';
 *
 * const adminClient = createServiceRoleClient();
 * // Can perform any database operation, bypassing RLS
 * ```
 */
/**
 * Alias for createServerClient for backwards compatibility.
 * @deprecated Use createServerClient instead for clarity.
 */
export const createClient = createServerClient;

// =============================================================================
// Service Role Client
// =============================================================================

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase service role configuration.\n' +
        'Required environment variables:\n' +
        '- NEXT_PUBLIC_SUPABASE_URL\n' +
        '- SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
