/**
 * Body Size Middleware
 *
 * Enforces maximum request body size limits to prevent DoS attacks
 * via large payload submissions.
 *
 * Features:
 * - Configurable max body size (default: 1MB)
 * - Returns 413 Payload Too Large for oversized requests
 * - Checks Content-Length header before reading body
 * - Prevents resource exhaustion attacks
 *
 * Security: This is a critical defense against DoS attacks where
 * attackers send extremely large request bodies to exhaust server
 * memory or disk space.
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Maximum request body size in bytes (default: 1MB)
 * Can be configured via MAX_BODY_SIZE_MB environment variable
 */
export const DEFAULT_MAX_BODY_SIZE_MB = 1;
export const MAX_BODY_SIZE_BYTES =
  (parseInt(process.env.MAX_BODY_SIZE_MB || String(DEFAULT_MAX_BODY_SIZE_MB), 10) *
    1024 *
    1024);

/**
 * Check if request body size exceeds the limit
 *
 * This checks the Content-Length header to reject oversized
 * requests before attempting to read the body, preventing
 * resource exhaustion.
 *
 * @param request - Next.js request object
 * @returns true if body size is within limits, false otherwise
 */
export function isBodySizeWithinLimit(request: NextRequest): boolean {
  const contentLength = request.headers.get('content-length');

  // If no Content-Length header, allow request
  // (Body size will be checked during actual parsing)
  if (!contentLength) {
    return true;
  }

  const bodySize = parseInt(contentLength, 10);

  // Reject invalid Content-Length (NaN) or negative values
  // These indicate malformed requests, not oversized payloads
  if (isNaN(bodySize) || bodySize < 0) {
    return false;
  }

  // Check if body size exceeds limit
  return bodySize <= MAX_BODY_SIZE_BYTES;
}

/**
 * Create a 400 Bad Request response for invalid Content-Length
 *
 * Returns a properly formatted error response for malformed Content-Length headers.
 *
 * @returns NextResponse with 400 status
 */
export function createInvalidContentLengthResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'invalid_request',
      error_description: 'Content-Length header is invalid or negative',
    },
    {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create a 413 Payload Too Large response
 *
 * Returns a properly formatted error response for oversized requests
 * with helpful information about the limit.
 *
 * @returns NextResponse with 413 status
 */
export function createPayloadTooLargeResponse(): NextResponse {
  const maxSizeMB = MAX_BODY_SIZE_BYTES / (1024 * 1024);

  return NextResponse.json(
    {
      error: 'payload_too_large',
      error_description: `Request body exceeds maximum size of ${maxSizeMB}MB`,
      max_size_bytes: MAX_BODY_SIZE_BYTES,
      max_size_mb: maxSizeMB,
    },
    {
      status: 413,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Middleware to check request body size
 *
 * Use this in Next.js middleware or API route handlers to enforce
 * body size limits before processing the request.
 *
 * Example usage in API route:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const bodySizeCheck = checkBodySize(request);
 *   if (bodySizeCheck) {
 *     return bodySizeCheck; // Return 413 response
 *   }
 *   // Continue with normal processing
 * }
 * ```
 *
 * @param request - Next.js request object
 * @returns NextResponse with 400/413 if invalid/oversized, null if ok
 */
export function checkBodySize(
  request: NextRequest
): NextResponse | null {
  const contentLength = request.headers.get('content-length');

  // No Content-Length header - allow request
  if (!contentLength) {
    return null;
  }

  const bodySize = parseInt(contentLength, 10);

  // Invalid or negative Content-Length - return 400 Bad Request
  if (isNaN(bodySize) || bodySize < 0) {
    return createInvalidContentLengthResponse();
  }

  // Oversized payload - return 413 Payload Too Large
  if (bodySize > MAX_BODY_SIZE_BYTES) {
    return createPayloadTooLargeResponse();
  }

  return null;
}

/**
 * Apply body size check to a response
 *
 * This is a convenience function for use in Next.js middleware
 * where you want to check body size and either return an error
 * or pass through to the next handler.
 *
 * Example usage in middleware.ts:
 * ```ts
 * export function middleware(request: NextRequest) {
 *   const response = NextResponse.next();
 *   return applyBodySizeCheck(request, response);
 * }
 * ```
 *
 * @param request - Next.js request object
 * @param response - Response to return if body size is ok
 * @returns 413 response if oversized, original response if ok
 */
export function applyBodySizeCheck(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const sizeCheck = checkBodySize(request);
  return sizeCheck || response;
}
