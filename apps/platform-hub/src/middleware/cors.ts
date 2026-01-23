import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * CORS Middleware for OAuth Endpoints
 *
 * Implements strict Cross-Origin Resource Sharing (CORS) policy for OAuth endpoints.
 * Validates origin against allowlist to prevent unauthorized cross-origin access.
 *
 * Security Features:
 * - Origin validation against configurable allowlist
 * - No wildcard origins in production
 * - Proper preflight (OPTIONS) handling
 * - Strict CORS headers (no credentials exposure)
 *
 * Configuration:
 * - Set CORS_ALLOWED_ORIGINS environment variable (comma-separated URLs)
 * - Example: CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
 *
 * Note: This middleware runs on Edge Runtime for optimal performance.
 */

/**
 * Parse allowed origins from environment variable
 * Returns array of allowed origin URLs
 */
function getAllowedOrigins(): string[] {
  const originsEnv = process.env.CORS_ALLOWED_ORIGINS;

  if (!originsEnv) {
    console.warn(
      '[CORS] No CORS_ALLOWED_ORIGINS configured. Falling back to localhost defaults.'
    );
    // Default to local development origins
    return [
      'http://localhost:3000', // Bingo app
      'http://localhost:3001', // Trivia app
      'http://localhost:3002', // Platform Hub
    ];
  }

  // Parse comma-separated origins
  const origins = originsEnv
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  // Validate origins format
  origins.forEach((origin) => {
    try {
      const url = new URL(origin);
      // Ensure no wildcard origins in production
      if (
        process.env.NODE_ENV === 'production' &&
        (origin === '*' || origin.includes('*'))
      ) {
        throw new Error('Wildcard origins not allowed in production');
      }
      // Ensure proper protocol
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error(`Invalid protocol: ${url.protocol}`);
      }
    } catch (error) {
      console.error(`[CORS] Invalid origin in CORS_ALLOWED_ORIGINS: ${origin}`);
      throw new Error(
        `Invalid origin in CORS_ALLOWED_ORIGINS: ${origin}. ` +
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

  return origins;
}

/**
 * Validate if request origin is allowed
 * Returns the origin if valid, null otherwise
 */
export function validateOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');

  // No origin header means same-origin request (allowed)
  if (!origin) {
    return null;
  }

  const allowedOrigins = getAllowedOrigins();

  // Check if origin is in allowlist
  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  // Log unauthorized origin attempt
  console.warn(
    `[CORS] Blocked request from unauthorized origin: ${origin} ` +
      `(allowed: ${allowedOrigins.join(', ')})`
  );

  return null;
}

/**
 * Add CORS headers to response
 * @param response - NextResponse to add headers to
 * @param origin - Allowed origin (null for same-origin requests)
 */
export function addCorsHeaders(
  response: NextResponse,
  origin: string | null
): NextResponse {
  if (origin) {
    // Add CORS headers for cross-origin requests
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
    // Don't allow credentials to prevent CSRF
    response.headers.set('Access-Control-Allow-Credentials', 'false');
    // Cache preflight for 1 hour
    response.headers.set('Access-Control-Max-Age', '3600');
  }

  return response;
}

/**
 * Handle CORS preflight (OPTIONS) requests
 * Returns 204 No Content with CORS headers
 */
export function handlePreflight(
  request: NextRequest,
  origin: string | null
): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, origin);
}

/**
 * Apply CORS to an OAuth endpoint request
 * Validates origin and adds appropriate headers
 *
 * @param request - Incoming request
 * @param handler - Function that generates the response (skipped for OPTIONS)
 * @returns Response with CORS headers or 403 if origin not allowed
 */
export async function applyCors(
  request: NextRequest,
  handler: () => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
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

    // Don't add CORS headers for blocked origins
    return response;
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return handlePreflight(request, validOrigin);
  }

  // Execute handler and add CORS headers
  const response = await handler();
  return addCorsHeaders(response, validOrigin);
}

/**
 * Get configured allowed origins (for testing/debugging)
 */
export function getConfiguredOrigins(): string[] {
  return getAllowedOrigins();
}
