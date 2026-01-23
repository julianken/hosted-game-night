import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { applyRateLimit } from '@/middleware/rate-limit';
import { checkBodySize } from '@/middleware/body-size';

/**
 * Next.js Middleware
 *
 * Runs on every request to apply:
 * 1. Request body size limits (prevents DoS via large payloads)
 * 2. Supabase session management (auth cookies)
 * 3. Rate limiting for OAuth endpoints
 *
 * Rate limited paths:
 * - /oauth/consent (10 req/min per IP)
 *
 * Note: Middleware runs on Edge Runtime, so only edge-compatible code allowed.
 */

/**
 * OAuth endpoints that require rate limiting
 */
const OAUTH_PATHS = [
  '/oauth/consent',
  '/oauth/authorize',
  '/oauth/token',
];

/**
 * Check if path should be rate limited
 */
function shouldRateLimit(pathname: string): boolean {
  return OAUTH_PATHS.some((path) => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  // Check body size for POST, PUT, PATCH requests
  // This prevents DoS attacks via large payloads
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const bodySizeCheck = checkBodySize(request);
    if (bodySizeCheck) {
      return bodySizeCheck; // Return 413 Payload Too Large
    }
  }

  // Apply rate limiting to OAuth endpoints
  if (shouldRateLimit(request.nextUrl.pathname)) {
    // Check rate limit before processing request
    const rateLimitResponse = applyRateLimit(
      request,
      NextResponse.next()
    );

    // If rate limited, return 429 immediately
    if (rateLimitResponse.status === 429) {
      return rateLimitResponse;
    }

    // Update Supabase session and apply rate limit headers
    const sessionResponse = await updateSession(request);

    // Copy rate limit headers to session response
    for (const [key, value] of rateLimitResponse.headers.entries()) {
      if (key.startsWith('x-ratelimit') || key === 'retry-after') {
        sessionResponse.headers.set(key, value);
      }
    }

    return sessionResponse;
  }

  // For non-OAuth paths, just update session
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
