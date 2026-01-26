import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';

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
 * E2E Testing Mode:
 * When E2E_TESTING=true, accepts tokens signed with the E2E test secret
 * to avoid hitting Supabase rate limits during test execution.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect specified routes
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for access token in httpOnly cookie (using cross-app SSO cookie name)
  const accessToken = request.cookies.get('beak_access_token')?.value;

  if (!accessToken) {
    // No token - redirect to login
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token is valid
  const isValid = await verifyAccessToken(accessToken);

  if (!isValid) {
    // Invalid token - clear cookies and redirect to login
    const response = NextResponse.redirect(new URL('/', request.url));
    const cookieOptions = {
      path: '/',
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
      maxAge: 0,
    };
    response.cookies.set('beak_access_token', '', cookieOptions);
    response.cookies.set('beak_refresh_token', '', cookieOptions);
    response.cookies.set('beak_user_id', '', cookieOptions);
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
