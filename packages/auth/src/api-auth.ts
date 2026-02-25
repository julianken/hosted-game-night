/**
 * API Route Authentication Utilities
 *
 * Provides JWT-based authentication for Next.js API routes in game apps
 * (Bingo, Trivia). Replaces the broken `supabase.auth.getUser()` pattern
 * which requires Supabase session cookies that don't exist in the OAuth flow.
 *
 * The Platform Hub OAuth flow sets `jb_access_token` cookies containing
 * JWTs signed with either SUPABASE_JWT_SECRET or SESSION_TOKEN_SECRET.
 * These utilities verify those JWTs and create RLS-compatible Supabase
 * clients that pass the JWT as an Authorization header.
 *
 * Verification chain (tried in order, delegated to verifyToken):
 * 1. E2E test secret (when E2E_TESTING=true)
 * 2. SUPABASE_JWT_SECRET (production -- matches PostgRES HS256 verification)
 * 3. SESSION_TOKEN_SECRET (backward compatibility during migration)
 * 4. Supabase JWKS (ES256 fallback -- fixes the 401 bug for SSO tokens)
 *
 * @module api-auth
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { verifyToken, createJwksGetter } from './verify-token';

// Production guard: E2E mode must never run on actual production (Vercel)
// Allows local production builds/servers for E2E testing (VERCEL=1 is auto-set by Vercel)
if (process.env.E2E_TESTING === 'true' && process.env.VERCEL === '1') {
  throw new Error('E2E mode cannot run in production');
}

// ────────────────────────────────────────────────────────────────────────────
// JWKS getter for API routes (lazy-initialized, module-level singleton)
// ────────────────────────────────────────────────────────────────────────────

let _jwksGetter: ReturnType<typeof createJwksGetter> | null = null;

/**
 * Returns the lazily-initialized JWKS getter for API routes.
 * Returns undefined if NEXT_PUBLIC_SUPABASE_URL is not set (test environments).
 */
function getJWKSForApiRoutes() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return undefined;

  if (!_jwksGetter) {
    _jwksGetter = createJwksGetter(supabaseUrl);
  }
  return _jwksGetter();
}

/**
 * User identity extracted from a verified JWT
 */
export interface ApiUser {
  id: string;
  email: string;
}

/**
 * Authenticate an API request by verifying the `jb_access_token` JWT cookie.
 *
 * Tries the 4-step verification chain via `verifyToken()`:
 *   E2E secret -> SUPABASE_JWT_SECRET -> SESSION_TOKEN_SECRET -> JWKS
 *
 * Returns the user identity (id + email) if the token is valid, or null if not.
 *
 * @param request - The incoming Next.js request
 * @returns The authenticated user, or null if authentication fails
 *
 * @example
 * ```ts
 * import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
 *
 * export async function GET(request: NextRequest) {
 *   const user = await getApiUser(request);
 *   if (!user) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   const supabase = createAuthenticatedClient();
 *   // Use supabase client with application-level data isolation...
 * }
 * ```
 */
export async function getApiUser(request: {
  cookies: { get: (name: string) => { value: string } | undefined };
}): Promise<ApiUser | null> {
  const token = request.cookies.get('jb_access_token')?.value;
  if (!token) {
    // E2E dev bypass: return a test user when no cookie is present
    // This allows browser-based local dev without going through OAuth
    if (process.env.E2E_TESTING === 'true') {
      return {
        id: '00000000-0000-4000-a000-000000000e2e',
        email: 'e2e-test@joolie-boolie.test',
      };
    }
    return null;
  }

  const result = await verifyToken(token, {
    e2eSecret:
      process.env.E2E_TESTING === 'true'
        ? process.env.E2E_JWT_SECRET
        : undefined,
    supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET,
    sessionTokenSecret: process.env.SESSION_TOKEN_SECRET,
    getJWKS: getJWKSForApiRoutes(),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

  if (!result.ok) {
    return null;
  }

  const sub = result.payload.sub;
  const email = (result.payload.email as string) || '';

  if (!sub) {
    return null;
  }

  return { id: sub, email };
}

/**
 * Create a Supabase client for authenticated API route operations.
 *
 * Uses the service role key to bypass PostgRES JWT verification. This is
 * necessary because the Supabase project uses ECC (P-256) for JWT signing,
 * and we cannot mint ES256 tokens (we don't have the private key). Data
 * isolation is enforced at the application level -- all query functions
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
