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
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * JWKS endpoint for Supabase JWT verification
 */
const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

/**
 * Routes that require authentication
 */
const PROTECTED_ROUTES = ['/play'];

/**
 * Check if path requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Verify JWT access token from httpOnly cookie
 */
async function verifyAccessToken(token: string): Promise<boolean> {
  try {
    // Verify JWT signature using JWKS
    await jwtVerify(token, JWKS, {
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
