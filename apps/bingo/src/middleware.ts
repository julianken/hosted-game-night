import { createGameMiddleware } from '@joolie-boolie/auth/middleware-factory';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

/**
 * Bingo Middleware — thin wrapper around the shared game middleware factory.
 *
 * Guest mode is enabled: unauthenticated users can access /play for offline play.
 * Tokens are validated and refreshed only when present.
 */
const { middleware } = createGameMiddleware({
  gameType: 'bingo',
  guestModeEnabled: true,
  protectedPaths: ['/play'],
  logger: createLogger({ service: 'bingo-middleware' }),
});

export { middleware };

/**
 * Configure which paths the middleware runs on.
 *
 * Match:
 * - /play (presenter view — protected, guest-mode)
 *
 * Skip:
 * - / (home page — public)
 * - /display (audience view — public)
 * - /auth/* (OAuth callbacks — public)
 * - /api/* (API routes handle their own auth)
 * - Static files, images, metadata
 */
export const config = {
  matcher: [
    '/((?!api|auth|display|monitoring|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
