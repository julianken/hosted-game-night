import { createGameMiddleware } from '@joolie-boolie/auth/middleware-factory';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

/**
 * Trivia Middleware — thin wrapper around the shared game middleware factory.
 *
 * Guest mode is disabled: unauthenticated users on /play are redirected to the
 * home page with a `jb_return_to` cookie for post-auth redirect.
 */
const { middleware } = createGameMiddleware({
  gameType: 'trivia',
  guestModeEnabled: false,
  protectedPaths: ['/play'],
  logger: createLogger({ service: 'trivia-middleware' }),
});

export { middleware };

/**
 * Configure which paths the middleware runs on.
 *
 * Match:
 * - /play (presenter view — requires auth)
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
