import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import {
  shouldRefreshToken,
  isTokenExpired,
  refreshTokens,
} from '@beak-gaming/auth';

/**
 * Next.js Middleware for Route Protection
 *
 * Protects routes that require authentication:
 * - /play (presenter view - requires valid OAuth token)
 *
 * Public routes (no auth required):
 * - / (home page)
 * - /display (audience view)
 * - /auth/* (OAuth callback, login)
 *
 * Token Refresh:
 * Proactively refreshes tokens 5 minutes before expiry to prevent
 * session interruptions during gameplay.
 *
 * E2E Testing Mode:
 * When E2E_TESTING=true, accepts tokens signed with the E2E test secret
 * to avoid hitting Supabase rate limits during test execution.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PLATFORM_HUB_URL = process.env.NEXT_PUBLIC_PLATFORM_HUB_URL || 'http://localhost:3002';

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

// Production: Supabase JWT secret for PostgRES-compatible tokens (preferred)
function getSupabaseJwtSecret(): Uint8Array | null {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

// Backward compatibility: SESSION_TOKEN_SECRET used by Platform Hub (migration)
function getSessionSecret(): Uint8Array | null {
  const secret = process.env.SESSION_TOKEN_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

/**
 * Routes that require authentication
 */
const PROTECTED_ROUTES = ['/play'];

/**
 * JWKS endpoint for Supabase JWT verification
 * Lazy-initialized to avoid module-load-time network requests
 */
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  }
  return jwksCache;
}

/**
 * Check if path requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Verify JWT access token from httpOnly cookie
 * Supports multiple token types:
 * 1. Platform Hub tokens (HS256, signed with SESSION_TOKEN_SECRET)
 * 2. E2E test tokens (HS256, signed with E2E_JWT_SECRET)
 * 3. Supabase tokens (RS256, verified via JWKS)
 */
async function verifyAccessToken(token: string): Promise<boolean> {
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
        issuer: `${SUPABASE_URL}/auth/v1`,
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
        issuer: 'beak-gaming-platform',
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
      issuer: `${SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    });
    return true;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return false;
  }
}

/**
 * Cookie options for token storage
 */
function getCookieOptions(maxAge: number) {
  return {
    path: '/',
    domain: process.env.COOKIE_DOMAIN?.trim() || undefined,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
  };
}

/**
 * Clear all auth cookies
 */
function clearAuthCookies(response: NextResponse) {
  const cookieOptions = getCookieOptions(0);
  response.cookies.set('beak_access_token', '', cookieOptions);
  response.cookies.set('beak_refresh_token', '', cookieOptions);
  response.cookies.set('beak_user_id', '', { ...cookieOptions, httpOnly: false });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect specified routes
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for access token in httpOnly cookie (using cross-app SSO cookie name)
  const accessToken = request.cookies.get('beak_access_token')?.value;
  const refreshToken = request.cookies.get('beak_refresh_token')?.value;

  if (!accessToken) {
    // No token - redirect to login with return path stored
    const loginUrl = new URL('/', request.url);
    const response = NextResponse.redirect(loginUrl);

    // Store the requested path for post-auth redirect
    response.cookies.set('beak_return_to', pathname, {
      path: '/',
      maxAge: 300, // 5 minutes - expires quickly for security
      httpOnly: false, // Client-side JS needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return response;
  }

  // Check if token needs proactive refresh (within 5 minutes of expiry)
  if (refreshToken && shouldRefreshToken(accessToken)) {
    console.log('[Middleware] Token approaching expiry, attempting proactive refresh');

    const result = await refreshTokens(refreshToken, PLATFORM_HUB_URL);

    if (result.success && result.accessToken && result.refreshToken) {
      console.log('[Middleware] Token refresh successful');

      // Create response and set new cookies
      const response = NextResponse.next();
      const maxAge = 3600; // 1 hour

      response.cookies.set('beak_access_token', result.accessToken, getCookieOptions(maxAge));
      response.cookies.set('beak_refresh_token', result.refreshToken, getCookieOptions(maxAge));

      return response;
    } else {
      console.warn('[Middleware] Proactive refresh failed, falling back to existing token:', result.error);
      // Continue with existing token - it's still valid, just close to expiry
    }
  }

  // Check if token is already expired - try refresh before rejecting
  if (isTokenExpired(accessToken)) {
    if (refreshToken) {
      console.log('[Middleware] Token expired, attempting refresh');

      const result = await refreshTokens(refreshToken, PLATFORM_HUB_URL);

      if (result.success && result.accessToken && result.refreshToken) {
        console.log('[Middleware] Token refresh successful after expiry');

        // Create response and set new cookies
        const response = NextResponse.next();
        const maxAge = 3600; // 1 hour

        response.cookies.set('beak_access_token', result.accessToken, getCookieOptions(maxAge));
        response.cookies.set('beak_refresh_token', result.refreshToken, getCookieOptions(maxAge));

        return response;
      }
    }

    // Refresh failed or no refresh token - clear cookies and redirect to login
    console.log('[Middleware] Token expired and refresh failed, redirecting to login');
    const response = NextResponse.redirect(new URL('/', request.url));
    clearAuthCookies(response);
    return response;
  }

  // Verify token is valid
  const isValid = await verifyAccessToken(accessToken);

  if (!isValid) {
    // Invalid token - try refresh before giving up
    if (refreshToken) {
      console.log('[Middleware] Token invalid, attempting refresh');

      const result = await refreshTokens(refreshToken, PLATFORM_HUB_URL);

      if (result.success && result.accessToken && result.refreshToken) {
        console.log('[Middleware] Token refresh successful after invalid token');

        // Create response and set new cookies
        const response = NextResponse.next();
        const maxAge = 3600; // 1 hour

        response.cookies.set('beak_access_token', result.accessToken, getCookieOptions(maxAge));
        response.cookies.set('beak_refresh_token', result.refreshToken, getCookieOptions(maxAge));

        return response;
      }
    }

    // Refresh failed - clear cookies and redirect to login
    const response = NextResponse.redirect(new URL('/', request.url));
    clearAuthCookies(response);
    return response;
  }

  // Token is valid - allow request to proceed
  return NextResponse.next();
}

/**
 * Configure which paths the middleware runs on
 *
 * Match:
 * - /play (presenter view - protected)
 *
 * Skip:
 * - / (home page - public)
 * - /display (audience view - public)
 * - /auth/* (OAuth callbacks - public)
 * - Static files (_next/static)
 * - Images (_next/image)
 * - Favicon and other public assets
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - / (home page)
     * - /display (audience view)
     * - /auth/* (OAuth flows)
     * - /api/* (API routes handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public folder files
     */
    '/((?!api|auth|display|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
