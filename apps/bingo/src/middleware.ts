import { NextRequest, NextResponse } from 'next/server';
import {
  shouldRefreshToken,
  isTokenExpired,
  refreshTokens,
} from '@joolie-boolie/auth';
import {
  createJwksGetter,
  verifyAccessToken,
  getCookieOptions,
  clearAuthCookies,
  isProtectedRoute,
} from '@joolie-boolie/auth/game-middleware';

/**
 * Next.js Middleware for Route Protection
 *
 * Routes with optional authentication:
 * - /play (presenter view - allows guest access without a token;
 *   validates and refreshes tokens if present)
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
const OAUTH_CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID;

// Production guard: E2E mode must never run in production
if (process.env.E2E_TESTING === 'true' && process.env.NODE_ENV === 'production') {
  throw new Error('E2E mode cannot run in production');
}

/**
 * Routes that require authentication
 */
const PROTECTED_ROUTES = ['/play'];

/**
 * JWKS endpoint for Supabase JWT verification
 * Lazy-initialized to avoid module-load-time network requests
 */
const getJWKS = createJwksGetter(SUPABASE_URL);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect specified routes
  if (!isProtectedRoute(pathname, PROTECTED_ROUTES)) {
    return NextResponse.next();
  }

  // Check for access token in httpOnly cookie (using cross-app SSO cookie name)
  const accessToken = request.cookies.get('jb_access_token')?.value;
  const refreshToken = request.cookies.get('jb_refresh_token')?.value;

  if (!accessToken) {
    // No token - allow through for guest mode (offline play)
    return NextResponse.next();
  }

  // Check if token needs proactive refresh (within 5 minutes of expiry)
  if (refreshToken && shouldRefreshToken(accessToken)) {
    console.log('[Middleware] Token approaching expiry, attempting proactive refresh');

    const result = await refreshTokens(refreshToken, PLATFORM_HUB_URL, OAUTH_CLIENT_ID);

    if (result.success && result.accessToken && result.refreshToken) {
      console.log('[Middleware] Token refresh successful');

      // Create response and set new cookies
      const response = NextResponse.next();
      const maxAge = 3600; // 1 hour

      response.cookies.set('jb_access_token', result.accessToken, getCookieOptions(maxAge));
      response.cookies.set('jb_refresh_token', result.refreshToken, getCookieOptions(maxAge));

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

      const result = await refreshTokens(refreshToken, PLATFORM_HUB_URL, OAUTH_CLIENT_ID);

      if (result.success && result.accessToken && result.refreshToken) {
        console.log('[Middleware] Token refresh successful after expiry');

        // Create response and set new cookies
        const response = NextResponse.next();
        const maxAge = 3600; // 1 hour

        response.cookies.set('jb_access_token', result.accessToken, getCookieOptions(maxAge));
        response.cookies.set('jb_refresh_token', result.refreshToken, getCookieOptions(maxAge));

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
  const isValid = await verifyAccessToken(accessToken, getJWKS, SUPABASE_URL);

  if (!isValid) {
    // Invalid token - try refresh before giving up
    if (refreshToken) {
      console.log('[Middleware] Token invalid, attempting refresh');

      const result = await refreshTokens(refreshToken, PLATFORM_HUB_URL, OAUTH_CLIENT_ID);

      if (result.success && result.accessToken && result.refreshToken) {
        console.log('[Middleware] Token refresh successful after invalid token');

        // Create response and set new cookies
        const response = NextResponse.next();
        const maxAge = 3600; // 1 hour

        response.cookies.set('jb_access_token', result.accessToken, getCookieOptions(maxAge));
        response.cookies.set('jb_refresh_token', result.refreshToken, getCookieOptions(maxAge));

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
