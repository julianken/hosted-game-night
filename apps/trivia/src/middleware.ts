import { createGameMiddleware } from '@joolie-boolie/auth/middleware-factory';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

/**
 * Trivia Middleware — thin wrapper around the shared game middleware factory.
 *
 * Guest mode is enabled: unauthenticated users can access /play without signing in.
 * Signed-in users get full functionality (saved templates, presets, question sets).
 */
const { middleware } = createGameMiddleware({
  gameType: 'trivia',
  guestModeEnabled: true,
  protectedPaths: ['/play'],
  logger: createLogger({ service: 'trivia-middleware' }),
});

export { middleware };

/**
 * Configure which paths the middleware runs on.
 *
 * Match:
 * - /play (presenter view — guest mode enabled, auth optional)
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
