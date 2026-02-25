/**
 * Game Middleware Factory
 *
 * Creates a Next.js middleware function for game apps (Bingo, Trivia) with
 * configurable auth behavior. Consolidates the shared middleware logic
 * (JWT verification, token refresh, cookie management) into a single factory,
 * with per-game differences driven by configuration.
 *
 * Import via `@joolie-boolie/auth/middleware-factory`.
 *
 * @example
 * ```ts
 * // apps/bingo/src/middleware.ts
 * import { createGameMiddleware } from '@joolie-boolie/auth/middleware-factory';
 * import { createLogger } from '@joolie-boolie/error-tracking/server-logger';
 *
 * const { middleware } = createGameMiddleware({
 *   gameType: 'bingo',
 *   guestModeEnabled: true,
 *   protectedPaths: ['/play'],
 *   logger: createLogger({ service: 'bingo-middleware' }),
 * });
 *
 * export { middleware };
 * export const config = { matcher: [...] };
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { shouldRefreshToken, refreshTokens } from './token-refresh';
import {
  createJwksGetter,
  verifyAccessToken,
  getCookieOptions,
  clearAuthCookies,
  isProtectedRoute,
} from './game-middleware';

// ────────────────────────────────────────────────────────────────────────────
// Configuration types
// ────────────────────────────────────────────────────────────────────────────

/**
 * Minimal logger interface matching `@joolie-boolie/error-tracking/server-logger`.
 * Consumers pass in their own logger to avoid coupling this package to error-tracking.
 */
export interface MiddlewareLogger {
  warn(message: string, extra?: Record<string, unknown>): void;
  error(message: string, extra?: Record<string, unknown>): void;
}

export interface GameMiddlewareConfig {
  /**
   * The game type — used for fallback logger service name.
   */
  gameType: 'bingo' | 'trivia';

  /**
   * When true, unauthenticated users are allowed through on protected routes
   * (guest/offline play). When false, unauthenticated users are redirected
   * to the home page with a `jb_return_to` cookie.
   *
   * - Bingo: true (allows guest access on /play)
   * - Trivia: false (requires auth on /play)
   */
  guestModeEnabled: boolean;

  /**
   * Route prefixes that require authentication (or guest-mode handling).
   * Typically `['/play']`.
   */
  protectedPaths: string[];

  /**
   * Optional structured logger. When omitted, falls back to `console`.
   * Pass `createLogger({ service: '<game>-middleware' })` from error-tracking.
   */
  logger?: MiddlewareLogger;
}

/** Minimal console-based fallback logger. */
const consoleFallback: MiddlewareLogger = {
  warn: (msg, extra) => console.warn(msg, extra ?? ''),
  error: (msg, extra) => console.error(msg, extra ?? ''),
};

// ────────────────────────────────────────────────────────────────────────────
// Factory
// ────────────────────────────────────────────────────────────────────────────

/**
 * Creates a Next.js middleware function configured for a specific game app.
 *
 * Handles:
 * - Route protection based on `protectedPaths`
 * - E2E testing bypass (when `E2E_TESTING=true`)
 * - JWT verification via the shared verification chain
 * - Proactive token refresh (5 min before expiry)
 * - Guest-mode passthrough (when `guestModeEnabled`)
 * - Auth-required redirect with `jb_return_to` cookie (when `!guestModeEnabled`)
 *
 * @param config - Per-game configuration
 * @returns An object with the `middleware` function to export
 */
export function createGameMiddleware(config: GameMiddlewareConfig) {
  const { guestModeEnabled, protectedPaths, logger = consoleFallback } = config;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const PLATFORM_HUB_URL =
    process.env.NEXT_PUBLIC_PLATFORM_HUB_URL || 'http://localhost:3002';
  const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN?.trim() || undefined;
  const OAUTH_CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID;

  // Production guard: E2E mode must never run on actual production (Vercel)
  if (process.env.E2E_TESTING === 'true' && process.env.VERCEL === '1') {
    throw new Error('E2E mode cannot run in production');
  }

  const getJWKS = createJwksGetter(SUPABASE_URL);

  /**
   * Create response with updated auth cookies after a successful token refresh.
   */
  function createResponseWithRefreshedTokens(
    _request: NextRequest,
    accessToken: string,
    refreshToken: string
  ): NextResponse {
    const response = NextResponse.next();

    // Access token: 1 hour
    response.cookies.set(
      'jb_access_token',
      accessToken,
      getCookieOptions(3600, COOKIE_DOMAIN)
    );

    // Refresh token: 30 days
    response.cookies.set(
      'jb_refresh_token',
      refreshToken,
      getCookieOptions(30 * 24 * 3600, COOKIE_DOMAIN)
    );

    return response;
  }

  /**
   * Handle the case where no access token is present on a protected route.
   *
   * - Guest mode: allow through (NextResponse.next())
   * - Auth required: E2E bypass or redirect to home with return-to cookie
   */
  function handleNoToken(request: NextRequest, pathname: string): NextResponse {
    if (guestModeEnabled) {
      // Guest mode — allow through for offline play
      return NextResponse.next();
    }

    // Auth required — check E2E bypass first
    if (process.env.E2E_TESTING === 'true') {
      return NextResponse.next();
    }

    // Redirect to login with return path stored
    const loginUrl = new URL('/', request.url);
    const response = NextResponse.redirect(loginUrl);

    response.cookies.set('jb_return_to', pathname, {
      path: '/',
      maxAge: 300, // 5 minutes — expires quickly for security
      httpOnly: false, // Client-side JS needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return response;
  }

  /**
   * The middleware function to export from the app's `middleware.ts`.
   */
  async function middleware(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    // Only protect specified routes
    if (!isProtectedRoute(pathname, protectedPaths)) {
      return NextResponse.next();
    }

    // Check for access token in httpOnly cookie
    const accessToken = request.cookies.get('jb_access_token')?.value;
    const refreshToken = request.cookies.get('jb_refresh_token')?.value;

    if (!accessToken) {
      return handleNoToken(request, pathname);
    }

    // Check if token needs proactive refresh (5 minutes before expiry)
    if (shouldRefreshToken(accessToken) && refreshToken) {
      const result = await refreshTokens(
        refreshToken,
        PLATFORM_HUB_URL,
        OAUTH_CLIENT_ID
      );

      if (result.success && result.accessToken && result.refreshToken) {
        // Token refreshed successfully — verify before using
        const isNewTokenValid = await verifyAccessToken(
          result.accessToken,
          getJWKS,
          SUPABASE_URL
        );
        if (isNewTokenValid) {
          return createResponseWithRefreshedTokens(
            request,
            result.accessToken,
            result.refreshToken
          );
        }
        // New token invalid — fall through to normal verification
        logger.error('Refreshed token failed verification');
      } else {
        // Refresh failed — log and fall through to normal verification
        // The existing token may still be valid if we're within the 5-min buffer
        logger.warn('Token refresh failed', { error: result.error });
      }
    }

    // Verify token is valid
    const isValid = await verifyAccessToken(accessToken, getJWKS, SUPABASE_URL);

    if (!isValid) {
      // Invalid token — try one more time to refresh before giving up
      if (refreshToken) {
        const result = await refreshTokens(
          refreshToken,
          PLATFORM_HUB_URL,
          OAUTH_CLIENT_ID
        );
        if (result.success && result.accessToken && result.refreshToken) {
          const isNewTokenValid = await verifyAccessToken(
            result.accessToken,
            getJWKS,
            SUPABASE_URL
          );
          if (isNewTokenValid) {
            return createResponseWithRefreshedTokens(
              request,
              result.accessToken,
              result.refreshToken
            );
          }
        }
      }

      // All refresh attempts failed — clear cookies and redirect to login
      const response = NextResponse.redirect(new URL('/', request.url));
      clearAuthCookies(response, COOKIE_DOMAIN);
      return response;
    }

    // Token is valid — allow request to proceed
    return NextResponse.next();
  }

  return { middleware };
}
