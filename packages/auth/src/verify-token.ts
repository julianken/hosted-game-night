/**
 * Unified JWT Verification Chain
 *
 * Provides a single `verifyToken()` function that tries up to 4 verification
 * methods in order, returning a discriminated result indicating which method
 * succeeded (or that all failed).
 *
 * The 4-step chain:
 * 1. E2E secret       (only when E2E_TESTING=true; HS256)
 * 2. SUPABASE_JWT_SECRET  (HS256 -- Platform Hub OAuth tokens)
 * 3. SESSION_TOKEN_SECRET (HS256 -- backward compatibility)
 * 4. Supabase JWKS        (ES256 -- remote key set fallback)
 *
 * This module is the canonical implementation. Both `game-middleware.ts`
 * (Edge Runtime middleware) and `api-auth.ts` (API routes) delegate to it.
 *
 * @module verify-token
 */

import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

/** The verification method that successfully validated the token. */
export type VerifyTokenMethod = 'e2e' | 'hs256-supabase' | 'hs256-session' | 'jwks';

/** Discriminated union result from `verifyToken()`. */
export type VerifyTokenOutcome =
  | { ok: true; type: VerifyTokenMethod; payload: JWTPayload }
  | { ok: false; error: string };

/** Configuration for the verification chain. All fields are optional. */
export interface VerifyTokenConfig {
  /** E2E test JWT secret (only tried when `process.env.E2E_TESTING === 'true'`). */
  e2eSecret?: string;
  /** SUPABASE_JWT_SECRET for HS256 verification of Platform Hub OAuth tokens. */
  supabaseJwtSecret?: string;
  /** SESSION_TOKEN_SECRET for HS256 backward-compatibility verification. */
  sessionTokenSecret?: string;
  /** Lazily-cached JWKS getter (from `createJwksGetter`). */
  getJWKS?: ReturnType<typeof createRemoteJWKSet>;
  /** The Supabase project URL (used to construct the expected issuer). */
  supabaseUrl?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// JWKS helper (defined here to avoid circular deps with game-middleware)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Lazily initialises and returns the JWKS endpoint for Supabase JWT verification.
 * Lazy init avoids module-load-time network requests (see docs/MIDDLEWARE_PATTERNS.md).
 *
 * @param supabaseUrl - The NEXT_PUBLIC_SUPABASE_URL value.
 */
export function createJwksGetter(supabaseUrl: string) {
  let cache: ReturnType<typeof createRemoteJWKSet> | null = null;

  return function getJWKS() {
    if (!cache) {
      cache = createRemoteJWKSet(
        new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
      );
    }
    return cache;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Core verification function
// ────────────────────────────────────────────────────────────────────────────

/**
 * Verify a JWT token using a 4-step chain.
 *
 * Steps are tried in order; the first success wins. Steps with `undefined`
 * config values are silently skipped. The E2E step is additionally gated on
 * `process.env.E2E_TESTING === 'true'`.
 *
 * @param token  - The raw JWT string to verify.
 * @param config - Which verification methods to attempt and their secrets.
 * @returns A discriminated union: `{ ok: true, type, payload }` or `{ ok: false, error }`.
 */
export async function verifyToken(
  token: string,
  config: VerifyTokenConfig
): Promise<VerifyTokenOutcome> {
  const isE2ETesting = process.env.E2E_TESTING === 'true';
  const supabaseIssuer = config.supabaseUrl
    ? `${config.supabaseUrl}/auth/v1`
    : undefined;

  // Step 1: E2E secret (only in E2E mode)
  if (isE2ETesting && config.e2eSecret) {
    try {
      const secret = new TextEncoder().encode(config.e2eSecret);
      const { payload } = await jwtVerify(token, secret, {
        issuer: 'e2e-test',
        audience: 'authenticated',
      });
      return { ok: true, type: 'e2e', payload };
    } catch {
      // E2E verification failed, fall through
    }
  }

  // Step 2: SUPABASE_JWT_SECRET (HS256)
  if (config.supabaseJwtSecret && supabaseIssuer) {
    try {
      const secret = new TextEncoder().encode(config.supabaseJwtSecret);
      const { payload } = await jwtVerify(token, secret, {
        issuer: supabaseIssuer,
        audience: 'authenticated',
      });
      return { ok: true, type: 'hs256-supabase', payload };
    } catch {
      // HS256-Supabase verification failed, fall through
    }
  }

  // Step 3: SESSION_TOKEN_SECRET (HS256, backward compatibility)
  if (config.sessionTokenSecret) {
    try {
      const secret = new TextEncoder().encode(config.sessionTokenSecret);
      const { payload } = await jwtVerify(token, secret, {
        issuer: 'joolie-boolie-platform',
        audience: 'authenticated',
      });
      return { ok: true, type: 'hs256-session', payload };
    } catch {
      // SESSION_TOKEN_SECRET verification failed, fall through
    }
  }

  // Step 4: JWKS (ES256 fallback)
  if (config.getJWKS && supabaseIssuer) {
    try {
      const { payload } = await jwtVerify(token, config.getJWKS, {
        issuer: supabaseIssuer,
        audience: 'authenticated',
      });
      return { ok: true, type: 'jwks', payload };
    } catch (error) {
      // JWKS verification also failed — this is the last step, so we log it
      console.error('JWT verification failed:', error);
      return { ok: false, error: 'All verification methods exhausted' };
    }
  }

  // No verification method was applicable or all failed without reaching JWKS
  return { ok: false, error: 'All verification methods exhausted' };
}
