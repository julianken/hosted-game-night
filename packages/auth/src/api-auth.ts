/**
 * API Route Authentication Utilities
 *
 * Provides JWT-based authentication for Next.js API routes in game apps
 * (Bingo, Trivia). Replaces the broken `supabase.auth.getUser()` pattern
 * which requires Supabase session cookies that don't exist in the OAuth flow.
 *
 * The Platform Hub OAuth flow sets `beak_access_token` cookies containing
 * JWTs signed with either SUPABASE_JWT_SECRET or SESSION_TOKEN_SECRET.
 * These utilities verify those JWTs and create RLS-compatible Supabase
 * clients that pass the JWT as an Authorization header.
 *
 * Verification chain (tried in order):
 * 1. E2E test secret (when E2E_TESTING=true)
 * 2. SUPABASE_JWT_SECRET (production — matches PostgRES HS256 verification)
 * 3. SESSION_TOKEN_SECRET (backward compatibility during migration)
 *
 * @module api-auth
 */

import { jwtVerify } from 'jose';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Production guard: E2E mode must never run in production
if (process.env.E2E_TESTING === 'true' && process.env.NODE_ENV === 'production') {
  throw new Error('E2E mode cannot run in production');
}

// E2E Testing: Secret loaded from environment variable (never hardcoded)
function getE2EJwtSecret(): Uint8Array {
  const secret = process.env.E2E_JWT_SECRET;
  if (!secret) {
    throw new Error(
      'E2E_JWT_SECRET environment variable is required when E2E_TESTING=true. ' +
      'Set it in your .env.local file.'
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * User identity extracted from a verified JWT
 */
export interface ApiUser {
  id: string;
  email: string;
}

/**
 * Get the secret to use for JWT verification.
 * Returns an array of { secret, issuer } pairs to try in order.
 */
function getVerificationChain(): Array<{ secret: Uint8Array; issuer: string }> {
  const chain: Array<{ secret: Uint8Array; issuer: string }> = [];
  const isE2ETesting = process.env.E2E_TESTING === 'true';

  // 1. E2E test secret (only in E2E mode)
  if (isE2ETesting) {
    chain.push({ secret: getE2EJwtSecret(), issuer: 'e2e-test' });
  }

  // 2. SUPABASE_JWT_SECRET (production — PostgRES-compatible)
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (supabaseJwtSecret) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    chain.push({
      secret: new TextEncoder().encode(supabaseJwtSecret),
      issuer: `${supabaseUrl}/auth/v1`,
    });
  }

  // 3. SESSION_TOKEN_SECRET (backward compatibility)
  const sessionTokenSecret = process.env.SESSION_TOKEN_SECRET;
  if (sessionTokenSecret) {
    chain.push({
      secret: new TextEncoder().encode(sessionTokenSecret),
      issuer: 'beak-gaming-platform',
    });
  }

  return chain;
}

/**
 * Authenticate an API request by verifying the `beak_access_token` JWT cookie.
 *
 * Tries the verification chain: E2E secret -> SUPABASE_JWT_SECRET -> SESSION_TOKEN_SECRET.
 * Returns the user identity (id + email) if the token is valid, or null if not.
 *
 * @param request - The incoming Next.js request
 * @returns The authenticated user, or null if authentication fails
 *
 * @example
 * ```ts
 * import { getApiUser, createAuthenticatedClient } from '@beak-gaming/auth';
 *
 * export async function GET(request: NextRequest) {
 *   const user = await getApiUser(request);
 *   if (!user) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   const supabase = createAuthenticatedClient(
 *     request.cookies.get('beak_access_token')!.value
 *   );
 *   // Use supabase client with RLS enforced via auth.uid()...
 * }
 * ```
 */
export async function getApiUser(request: {
  cookies: { get: (name: string) => { value: string } | undefined };
}): Promise<ApiUser | null> {
  const token = request.cookies.get('beak_access_token')?.value;
  if (!token) return null;

  const chain = getVerificationChain();

  for (const { secret, issuer } of chain) {
    try {
      const { payload } = await jwtVerify(token, secret, {
        issuer,
        audience: 'authenticated',
      });

      const sub = payload.sub;
      const email = (payload.email as string) || '';

      if (!sub) continue;

      return { id: sub, email };
    } catch {
      // This secret/issuer didn't work, try next in chain
      continue;
    }
  }

  // All verification methods failed
  return null;
}

/**
 * Create a Supabase client for authenticated API route operations.
 *
 * Uses the service role key to bypass PostgRES JWT verification. This is
 * necessary because the Supabase project uses ECC (P-256) for JWT signing,
 * and we cannot mint ES256 tokens (we don't have the private key). Data
 * isolation is enforced at the application level — all query functions
 * require user_id as a parameter.
 *
 * Note: RLS is not enforced with this client. If the project switches back
 * to HS256 or provides a way to mint ES256 tokens, this can be updated to
 * use the anon key + JWT Bearer header approach for RLS enforcement.
 *
 * @returns A Supabase client with service role access
 *
 * @example
 * ```ts
 * const supabase = createAuthenticatedClient();
 * const { data } = await supabase.from('templates').select('*').eq('user_id', user.id);
 * ```
 */
export function createAuthenticatedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
