/**
 * Platform Hub Session Sync API Route
 *
 * Called after a successful client-side Supabase auth to set httpOnly cookies
 * for cross-app SSO. This is needed when the /api/auth/login endpoint fails
 * (e.g., rate limiting, server issues) but client-side Supabase auth succeeds.
 *
 * The client sends the access_token and refresh_token from the Supabase session,
 * and this endpoint verifies the JWT signature before setting the jb_* cookies
 * for middleware verification.
 *
 * Verification chain:
 * 1. E2E test secret (when E2E_TESTING=true)
 * 2. SUPABASE_JWT_SECRET (production)
 * 3. Supabase JWKS endpoint (fallback)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'auth-sync-session' });

// Production guard: E2E mode must never run on actual production (Vercel)
if (process.env.E2E_TESTING === 'true' && process.env.VERCEL === '1') {
  throw new Error('E2E mode cannot run in production');
}

// E2E Testing: Same secret used by Platform Hub login API
const E2E_JWT_SECRET = new TextEncoder().encode(
  process.env.E2E_JWT_SECRET || 'e2e-test-secret-key-that-is-at-least-32-characters-long'
);

// Lazy-initialized JWKS for Supabase token verification
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  }
  return jwksCache;
}

/**
 * Verify JWT and return its payload, or null if verification fails.
 * Tries verification chain: E2E secret -> SUPABASE_JWT_SECRET -> JWKS
 */
async function verifyJwt(token: string): Promise<JWTPayload | null> {
  const isE2ETesting = process.env.E2E_TESTING === 'true';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  // 1. E2E test secret
  if (isE2ETesting) {
    try {
      const { payload } = await jwtVerify(token, E2E_JWT_SECRET, {
        issuer: 'e2e-test',
        audience: 'authenticated',
      });
      return payload;
    } catch {
      // Fall through to next method
    }
  }

  // 2. SUPABASE_JWT_SECRET (production)
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (supabaseJwtSecret) {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(supabaseJwtSecret),
        {
          issuer: `${supabaseUrl}/auth/v1`,
          audience: 'authenticated',
        }
      );
      return payload;
    } catch {
      // Fall through to next method
    }
  }

  // 3. Supabase JWKS endpoint (fallback)
  const jwks = getJWKS();
  if (jwks) {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: `${supabaseUrl}/auth/v1`,
        audience: 'authenticated',
      });
      return payload;
    } catch {
      // All methods failed
    }
  }

  return null;
}

interface SyncRequest {
  accessToken: string;
  refreshToken: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: SyncRequest = await request.json();
    const { accessToken, refreshToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      );
    }

    // Verify JWT signature and extract payload
    const payload = await verifyJwt(accessToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unverifiable access token' },
        { status: 401 }
      );
    }

    const userId = (payload.sub as string) || 'unknown';
    const userEmail = payload.email as string | undefined;

    // Calculate expires_in from exp claim
    let expiresIn = 3600; // Default 1 hour
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      expiresIn = Math.max(payload.exp - now, 0);
    }

    // Get cookie options
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || undefined;

    // Set cross-app SSO cookies
    cookieStore.set('jb_access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: expiresIn,
      path: '/',
      domain: cookieDomain,
    });

    if (refreshToken) {
      cookieStore.set('jb_refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        domain: cookieDomain,
      });
    }

    // User ID cookie (for client-side access)
    cookieStore.set('jb_user_id', userId, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: expiresIn,
      path: '/',
      domain: cookieDomain,
    });

    logger.info('Session synced successfully', { user_id: userId });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userEmail,
      },
    });
  } catch (error) {
    logger.error('Sync session error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
