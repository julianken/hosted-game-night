import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { applyRateLimit } from '@/middleware/rate-limit';
import { validateOrigin, addCorsHeaders, handlePreflight } from '@/middleware/cors';
import { checkBodySize } from '@/middleware/body-size';

/**
 * Next.js Middleware
 *
 * Runs on every request to apply:
 * 1. Request body size limits (prevents DoS via large payloads)
 * 2. CORS validation for OAuth endpoints
 * 3. Rate limiting for OAuth endpoints
 * 4. Supabase session management (auth cookies)
 *
 * CORS protected paths:
 * - /api/oauth/* (token, approve, deny, csrf)
 *
 * Rate limited paths:
 * - /oauth/consent, /oauth/authorize, /oauth/token (10 req/min per IP)
 * - /api/auth/login, /api/auth/reset-password, /api/auth/sync-session (10 req/min per IP)
 *
 * Note: Middleware runs on Edge Runtime, so only edge-compatible code allowed.
 */

/**
 * OAuth API endpoints that require CORS validation
 */
const OAUTH_API_PATHS = [
  '/api/oauth/token',
  '/api/oauth/approve',
  '/api/oauth/deny',
  '/api/oauth/csrf',
];

/**
 * Paths that require rate limiting (OAuth + auth endpoints)
 * Protects against brute force login, credential stuffing, and DDoS attacks
 */
const RATE_LIMITED_PATHS = [
  '/oauth/consent',
  '/oauth/authorize',
  '/oauth/token',
  '/api/auth/login',
  '/api/auth/reset-password',
  '/api/auth/sync-session',
];

/**
 * Check if path requires CORS validation
 */
function requiresCors(pathname: string): boolean {
  return OAUTH_API_PATHS.some((path) => pathname.startsWith(path));
}

/**
 * Check if path should be rate limited
 */
function shouldRateLimit(pathname: string): boolean {
  return RATE_LIMITED_PATHS.some((path) => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if running in E2E test environment
  // Only use E2E_TESTING env var (consistent with bingo/trivia middleware)
  const isE2ETesting = process.env.E2E_TESTING === 'true';

  // 1. Check body size for POST, PUT, PATCH requests
  // This prevents DoS attacks via large payloads
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const bodySizeCheck = checkBodySize(request);
    if (bodySizeCheck) {
      return bodySizeCheck; // Return 413 Payload Too Large or 400 Bad Request
    }
  }

  // 2. Apply CORS to OAuth API endpoints
  if (requiresCors(pathname)) {
    // Validate origin
    const validOrigin = validateOrigin(request);
    const requestOrigin = request.headers.get('origin');

    // Block requests from unauthorized origins
    if (requestOrigin && !validOrigin) {
      const response = NextResponse.json(
        {
          error: 'forbidden',
          error_description: 'Origin not allowed',
        },
        { status: 403 }
      );
      return response;
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return handlePreflight(request, validOrigin);
    }

    // Continue processing with CORS headers
    let response = NextResponse.next();

    // Apply rate limiting if needed (skip for E2E tests)
    if (shouldRateLimit(pathname) && !isE2ETesting) {
      const rateLimitResponse = await applyRateLimit(request, response);
      if (rateLimitResponse.status === 429) {
        return addCorsHeaders(rateLimitResponse, validOrigin);
      }
      response = rateLimitResponse;
    }

    // Update session (skip in E2E mode)
    if (!isE2ETesting) {
      response = await updateSession(request);
    }

    // Add CORS headers to final response
    return addCorsHeaders(response, validOrigin);
  }

  // 3. Apply rate limiting to OAuth and auth endpoints
  // Skip rate limiting for E2E tests to allow parallel test execution
  if (shouldRateLimit(pathname) && !isE2ETesting) {
    // Check rate limit before processing request
    const rateLimitResponse = await applyRateLimit(
      request,
      NextResponse.next()
    );

    // If rate limited, return 429 immediately
    if (rateLimitResponse.status === 429) {
      return rateLimitResponse;
    }

    // Update Supabase session (skip in E2E mode - no real Supabase connection)
    if (isE2ETesting) {
      // In E2E mode, just apply rate limit headers without Supabase session
      return rateLimitResponse;
    }

    const sessionResponse = await updateSession(request);

    // Copy rate limit headers to session response
    for (const [key, value] of rateLimitResponse.headers.entries()) {
      if (key.startsWith('x-ratelimit') || key === 'retry-after') {
        sessionResponse.headers.set(key, value);
      }
    }

    return sessionResponse;
  }

  // For non-OAuth paths, just update session (skip in E2E mode)
  if (isE2ETesting) {
    return NextResponse.next();
  }
  return updateSession(request);
}

/**
 * Configure which paths the middleware runs on
 *
 * Match:
 * - All OAuth paths (/oauth/*)
 * - All paths that need session management
 *
 * Skip:
 * - Static files (_next/static)
 * - Images (_next/image)
 * - Favicon and other public assets
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
