import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { shouldRefreshToken, refreshTokens } from './lib/auth/token-refresh';

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
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

// E2E Testing: Same secret used by Platform Hub login API
const E2E_JWT_SECRET = new TextEncoder().encode(
  'e2e-test-secret-key-that-is-at-least-32-characters-long'
);

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
 * Supports both Supabase tokens (production) and E2E test tokens
 */
async function verifyAccessToken(token: string): Promise<boolean> {
  const isE2ETesting = process.env.E2E_TESTING === 'true';

  // E2E Testing Mode: Try E2E secret first
  if (isE2ETesting) {
    try {
      await jwtVerify(token, E2E_JWT_SECRET, {
        issuer: 'e2e-test',
        audience: 'authenticated',
      });
      return true;
    } catch {
      // E2E token verification failed, fall through to Supabase verification
      // This allows real Supabase tokens to still work during E2E tests
    }
  }

  // Production Mode (or E2E fallback): Verify with Supabase JWKS
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
 * Cookie options for setting auth tokens
 */
function getCookieOptions(maxAge: number) {
  return {
    path: '/',
    domain: COOKIE_DOMAIN,
    maxAge,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
}

/**
 * Create response with updated auth cookies after token refresh
 */
function createResponseWithRefreshedTokens(
  request: NextRequest,
  accessToken: string,
  refreshToken: string
): NextResponse {
  const response = NextResponse.next();

  // Access token: 1 hour
  response.cookies.set('beak_access_token', accessToken, getCookieOptions(3600));

  // Refresh token: 30 days
  response.cookies.set('beak_refresh_token', refreshToken, getCookieOptions(30 * 24 * 3600));

  return response;
}

/**
 * Clear auth cookies and redirect to login
 */
function createLogoutResponse(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL('/', request.url));
  const clearOptions = {
    path: '/',
    domain: COOKIE_DOMAIN,
    maxAge: 0,
  };
  response.cookies.set('beak_access_token', '', clearOptions);
  response.cookies.set('beak_refresh_token', '', clearOptions);
  response.cookies.set('beak_user_id', '', clearOptions);
  return response;
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
    // No token - redirect to login
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check if token needs proactive refresh (5 minutes before expiry)
  if (shouldRefreshToken(accessToken) && refreshToken) {
    const result = await refreshTokens(refreshToken, PLATFORM_HUB_URL);

    if (result.success && result.accessToken && result.refreshToken) {
      // Token refreshed successfully - continue with new tokens in response cookies
      // Verify the new token before using it
      const isNewTokenValid = await verifyAccessToken(result.accessToken);
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
  const isValid = await verifyAccessToken(accessToken);

  if (!isValid) {
    // Invalid token - try one more time to refresh before giving up
    if (refreshToken) {
      const result = await refreshTokens(refreshToken, PLATFORM_HUB_URL);
      if (result.success && result.accessToken && result.refreshToken) {
        const isNewTokenValid = await verifyAccessToken(result.accessToken);
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
    return createLogoutResponse(request);
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
