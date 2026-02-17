/**
 * OAuth Error Utilities
 *
 * Provides a structured error class and a route-handler wrapper that converts
 * thrown OAuthError instances into RFC 6749-compliant JSON responses.
 *
 * RFC 6749 §5.2: https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
 */

import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// RFC 6749 error codes
// ---------------------------------------------------------------------------

/**
 * Standard OAuth 2.0 / 2.1 error codes (RFC 6749 §5.2).
 */
export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'invalid_scope'
  | 'server_error'
  | 'unsupported_response_type';

// ---------------------------------------------------------------------------
// OAuthError class
// ---------------------------------------------------------------------------

/**
 * Structured OAuth error that carries an HTTP status code, RFC 6749 error
 * code, and a human-readable description.
 *
 * Throw this inside any OAuth route handler to produce a consistent error
 * response without repeating `NextResponse.json(...)` boilerplate.
 *
 * @example
 * ```ts
 * throw new OAuthError('invalid_grant', 'Authorization code has expired', 400);
 * ```
 */
export class OAuthError extends Error {
  readonly status: number;
  readonly error: OAuthErrorCode;
  readonly error_description: string;

  constructor(
    error: OAuthErrorCode,
    error_description: string,
    status: number = 400
  ) {
    super(error_description);
    this.name = 'OAuthError';
    this.error = error;
    this.error_description = error_description;
    this.status = status;
  }

  /** Serialize to an RFC 6749-compliant JSON response. */
  toResponse(): NextResponse {
    return NextResponse.json(
      {
        error: this.error,
        error_description: this.error_description,
      },
      { status: this.status }
    );
  }
}

// ---------------------------------------------------------------------------
// Route-handler wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap an OAuth route handler so that:
 * - `OAuthError` instances are serialized to RFC 6749 JSON responses
 * - All other errors produce a generic `server_error` response
 *
 * @param label - Log prefix used in console.error for unexpected errors
 * @param fn    - The actual handler logic (may be async, may throw OAuthError)
 *
 * @example
 * ```ts
 * export const POST = withOAuthErrorHandling('[Token Endpoint]', async (request) => {
 *   // ... handler body that may throw OAuthError
 * });
 * ```
 */
export function withOAuthErrorHandling<TArgs extends unknown[]>(
  label: string,
  fn: (...args: TArgs) => Promise<NextResponse>
): (...args: TArgs) => Promise<NextResponse> {
  return async (...args: TArgs): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof OAuthError) {
        return err.toResponse();
      }

      console.error(`${label} Unexpected error:`, err);
      return NextResponse.json(
        {
          error: 'server_error' as OAuthErrorCode,
          error_description: 'An unexpected error occurred',
        },
        { status: 500 }
      );
    }
  };
}
