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

// E2E Testing: Same secret used by Platform Hub login API and game app middleware
const E2E_JWT_SECRET = new TextEncoder().encode(
  'e2e-test-secret-key-that-is-at-least-32-characters-long'
);

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
    chain.push({ secret: E2E_JWT_SECRET, issuer: 'e2e-test' });
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
 * Create a Supabase client that authenticates with the given JWT.
 *
 * The JWT is passed as an `Authorization: Bearer` header, which PostgRES
 * verifies using the project's HS256 JWT secret. This sets `auth.uid()` to
 * the `sub` claim, enabling RLS policies to enforce row-level access.
 *
 * @param accessToken - The verified JWT access token
 * @returns A Supabase client authenticated with the given token
 *
 * @example
 * ```ts
 * const supabase = createAuthenticatedClient(accessToken);
 * // RLS policies will enforce that auth.uid() = user's ID
 * const { data } = await supabase.from('templates').select('*');
 * ```
 */
export function createAuthenticatedClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
