import { NextRequest, NextResponse } from 'next/server';
import { shouldRefreshToken, refreshTokens } from '@joolie-boolie/auth';
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
 * session interruption during use.
 *
 * E2E Testing Mode:
 * When E2E_TESTING=true, accepts tokens signed with the E2E test secret
 * to avoid hitting Supabase rate limits during test execution.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PLATFORM_HUB_URL = process.env.NEXT_PUBLIC_PLATFORM_HUB_URL || 'http://localhost:3002';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN?.trim() || undefined;
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

/**
 * Create response with updated auth cookies after token refresh
 */
function createResponseWithRefreshedTokens(
  _request: NextRequest,
  accessToken: string,
  refreshToken: string
): NextResponse {
  const response = NextResponse.next();

  // Access token: 1 hour
  response.cookies.set('jb_access_token', accessToken, getCookieOptions(3600, COOKIE_DOMAIN));

  // Refresh token: 30 days
  response.cookies.set('jb_refresh_token', refreshToken, getCookieOptions(30 * 24 * 3600, COOKIE_DOMAIN));

  return response;
}

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
    // No token - redirect to login with return path stored
    const loginUrl = new URL('/', request.url);
    const response = NextResponse.redirect(loginUrl);

    // Store the requested path for post-auth redirect
    response.cookies.set('jb_return_to', pathname, {
      path: '/',
      maxAge: 300, // 5 minutes - expires quickly for security
      httpOnly: false, // Client-side JS needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return response;
  }

  // Check if token needs proactive refresh (5 minutes before expiry)
  if (shouldRefreshToken(accessToken) && refreshToken) {
    const result = await refreshTokens(refreshToken, PLATFORM_HUB_URL, OAUTH_CLIENT_ID);

    if (result.success && result.accessToken && result.refreshToken) {
      // Token refreshed successfully - continue with new tokens in response cookies
      // Verify the new token before using it
      const isNewTokenValid = await verifyAccessToken(result.accessToken, getJWKS, SUPABASE_URL);
      if (isNewTokenValid) {
        return createResponseWithRefreshedTokens(request, result.accessToken, result.refreshToken);
      }
      // New token invalid - fall through to normal verification
      console.error('Refreshed token failed verification');
    } else {
      // Refresh failed - log and fall through to normal verification
      // The existing token may still be valid if we're within the 5-min buffer
      console.warn('Token refresh failed:', result.error);
    }
  }

  // Verify token is valid
  const isValid = await verifyAccessToken(accessToken, getJWKS, SUPABASE_URL);

  if (!isValid) {
    // Invalid token - try one more time to refresh before giving up
    if (refreshToken) {
      const result = await refreshTokens(refreshToken, PLATFORM_HUB_URL, OAUTH_CLIENT_ID);
      if (result.success && result.accessToken && result.refreshToken) {
        const isNewTokenValid = await verifyAccessToken(result.accessToken, getJWKS, SUPABASE_URL);
        if (isNewTokenValid) {
          return createResponseWithRefreshedTokens(
            request,
            result.accessToken,
            result.refreshToken
          );
        }
      }
    }

    // All refresh attempts failed - clear cookies and redirect to login
    const response = NextResponse.redirect(new URL('/', request.url));
    clearAuthCookies(response, COOKIE_DOMAIN);
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
