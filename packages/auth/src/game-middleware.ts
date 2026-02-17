/**
 * Shared JWT middleware utilities for game apps (Bingo, Trivia).
 *
 * These functions are Edge Runtime-compatible (no Node.js-only APIs) and are
 * used by both apps' Next.js middleware for JWT verification, cookie management,
 * and route protection.
 *
 * Import via the `@joolie-boolie/auth/game-middleware` subpath export.
 */

import { jwtVerify, createRemoteJWKSet } from 'jose';
import { NextResponse } from 'next/server';

// ────────────────────────────────────────────────────────────────────────────
// Secret helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns the E2E test JWT secret as a Uint8Array.
 * Throws if E2E_JWT_SECRET is not set (required when E2E_TESTING=true).
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
 * Returns the Supabase JWT secret as a Uint8Array, or null if not configured.
 * Preferred for verifying Platform Hub OAuth tokens.
 */
export function getSupabaseJwtSecret(): Uint8Array | null {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

/**
 * Returns the session token secret as a Uint8Array, or null if not configured.
 * Used for backward compatibility with Platform Hub SESSION_TOKEN_SECRET tokens.
 */
export function getSessionSecret(): Uint8Array | null {
  const secret = process.env.SESSION_TOKEN_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

// ────────────────────────────────────────────────────────────────────────────
// JWKS (lazy-initialized)
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
// Token verification
// ────────────────────────────────────────────────────────────────────────────

/**
 * Verifies a JWT access token using the configured verification chain:
 *
 * 1. E2E secret (only when E2E_TESTING=true)
 * 2. SUPABASE_JWT_SECRET (preferred for Platform Hub OAuth tokens)
 * 3. SESSION_TOKEN_SECRET (backward compatibility)
 * 4. Supabase JWKS (fallback)
 *
 * @param token - The raw JWT string to verify.
 * @param getJWKS - Function that returns the (lazily cached) RemoteJWKSet.
 * @param supabaseUrl - The NEXT_PUBLIC_SUPABASE_URL value.
 * @returns true if any verification method succeeds, false otherwise.
 */
export async function verifyAccessToken(
  token: string,
  getJWKS: () => ReturnType<typeof createRemoteJWKSet>,
  supabaseUrl: string
): Promise<boolean> {
  const isE2ETesting = process.env.E2E_TESTING === 'true';

  // E2E Testing Mode: Try E2E secret first
  if (isE2ETesting) {
    try {
      await jwtVerify(token, getE2EJwtSecret(), {
        issuer: 'e2e-test',
        audience: 'authenticated',
      });
      return true;
    } catch {
      // E2E token verification failed, fall through to other methods
    }
  }

  // Platform Hub OAuth tokens: Verify with SUPABASE_JWT_SECRET (preferred)
  const supabaseJwtSecret = getSupabaseJwtSecret();
  if (supabaseJwtSecret) {
    try {
      await jwtVerify(token, supabaseJwtSecret, {
        issuer: `${supabaseUrl}/auth/v1`,
        audience: 'authenticated',
      });
      return true;
    } catch {
      // SUPABASE_JWT_SECRET verification failed, fall through
    }
  }

  // Backward compatibility: Verify with SESSION_TOKEN_SECRET
  const sessionSecret = getSessionSecret();
  if (sessionSecret) {
    try {
      await jwtVerify(token, sessionSecret, {
        issuer: 'joolie-boolie-platform',
        audience: 'authenticated',
      });
      return true;
    } catch {
      // SESSION_TOKEN_SECRET verification failed, fall through to Supabase JWKS
    }
  }

  // Supabase tokens (fallback): Verify with JWKS
  try {
    await jwtVerify(token, getJWKS(), {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: 'authenticated',
    });
    return true;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Cookie helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns standard cookie options for auth token cookies.
 *
 * @param maxAge - Cookie max-age in seconds (0 to delete).
 * @param cookieDomain - Optional domain for cross-app SSO (e.g. `.joolie-boolie.com`).
 */
export function getCookieOptions(maxAge: number, cookieDomain?: string) {
  return {
    path: '/',
    domain: cookieDomain,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
  };
}

/**
 * Clears all auth cookies on the given response (sets them to empty with maxAge=0).
 *
 * @param response - The NextResponse to mutate.
 * @param cookieDomain - Optional domain used when the cookies were originally set.
 */
export function clearAuthCookies(response: NextResponse, cookieDomain?: string) {
  const opts = getCookieOptions(0, cookieDomain);
  response.cookies.set('jb_access_token', '', opts);
  response.cookies.set('jb_refresh_token', '', opts);
  response.cookies.set('jb_user_id', '', { ...opts, httpOnly: false });
}

// ────────────────────────────────────────────────────────────────────────────
// Route helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when `pathname` starts with any of the provided `protectedRoutes`.
 *
 * @param pathname - The request pathname (e.g. `/play`).
 * @param protectedRoutes - Array of route prefixes to protect (e.g. `['/play']`).
 */
export function isProtectedRoute(
  pathname: string,
  protectedRoutes: string[]
): boolean {
  return protectedRoutes.some((route) => pathname.startsWith(route));
}
