/**
 * OAuth JWT Signing Utilities
 *
 * Consolidated JWT signing for all OAuth token paths:
 * - authorization_code grant
 * - refresh_token grant
 * - E2E testing bypass
 *
 * Spec: OAuth 2.1 (https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-11)
 */

import { SignJWT } from 'jose';

/**
 * Standard token pair returned by the OAuth token endpoint.
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Parameters for signing a production token pair.
 * The refresh token is supplied by the caller (already generated and persisted).
 */
export interface SignTokenPairParams {
  userId: string;
  userEmail: string | undefined;
  /** Pre-generated, persisted refresh token (plaintext). */
  refreshToken: string;
}

/**
 * Resolve the JWT signing secret and issuer from environment variables.
 *
 * Preference order:
 * 1. SUPABASE_JWT_SECRET — Supabase-compatible issuer so PostgRES accepts the JWT for RLS
 * 2. SESSION_TOKEN_SECRET — fallback for non-Supabase environments
 *
 * @throws Error if neither secret is configured
 */
export function resolveJwtConfig(): { secret: Uint8Array; issuer: string } {
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
  const sessionSecret = process.env.SESSION_TOKEN_SECRET;
  const signingSecret = supabaseJwtSecret || sessionSecret;

  if (!signingSecret) {
    throw new Error(
      'Server misconfiguration: neither SUPABASE_JWT_SECRET nor SESSION_TOKEN_SECRET is set'
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const issuer = supabaseJwtSecret
    ? `${supabaseUrl}/auth/v1`
    : 'joolie-boolie-platform';

  return {
    secret: new TextEncoder().encode(signingSecret),
    issuer,
  };
}

/**
 * Sign a production access token (HS256 JWT).
 * The access token expires in 1 hour.
 */
async function signAccessToken(
  userId: string,
  userEmail: string | undefined,
  secret: Uint8Array,
  issuer: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 3600; // 1 hour

  return new SignJWT({
    sub: userId,
    email: userEmail,
    role: 'authenticated',
    aud: 'authenticated',
    iss: issuer,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { email: userEmail },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .sign(secret);
}

/**
 * Sign a production token pair for a user.
 *
 * The caller is responsible for generating and persisting the refresh token
 * before calling this function. This function only signs the access token
 * and assembles the pair.
 *
 * @param params - User identity and pre-generated refresh token
 * @returns Signed access token, refresh token, and expiry
 * @throws Error if JWT secrets are not configured
 */
export async function signTokenPair(params: SignTokenPairParams): Promise<TokenPair> {
  const { userId, userEmail, refreshToken } = params;
  const { secret, issuer } = resolveJwtConfig();
  const expiresIn = 3600; // 1 hour

  const accessToken = await signAccessToken(userId, userEmail, secret, issuer);

  return { accessToken, refreshToken, expiresIn };
}

// ---------------------------------------------------------------------------
// E2E Testing
// ---------------------------------------------------------------------------

/** E2E test user constants — must match the values used in middleware. */
export const E2E_TEST_USER_ID = '00000000-0000-4000-a000-000000000e2e';
export const E2E_TEST_EMAIL = 'e2e-test@joolie-boolie.test';

/**
 * Returns the E2E JWT signing secret from the environment.
 * @throws Error if E2E_JWT_SECRET is not set
 */
export function getE2EJwtSecret(): Uint8Array {
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
 * Sign an E2E access token for the test user.
 * Uses a separate E2E secret so production secrets are never exposed in tests.
 */
export async function signE2EAccessToken(): Promise<string> {
  const secret = getE2EJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 3600;

  return new SignJWT({
    sub: E2E_TEST_USER_ID,
    email: E2E_TEST_EMAIL,
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'e2e-test',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { email: E2E_TEST_EMAIL },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .sign(secret);
}
