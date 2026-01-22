import { updateSession } from '@/lib/supabase/middleware'
import { NextRequest } from 'next/server'

/**
 * Next.js Middleware - Runs on every request before the route handler
 *
 * This middleware:
 * 1. Refreshes the Supabase auth session if needed
 * 2. Sets secure cookie options (httpOnly, secure, sameSite) for session tokens
 * 3. Ensures cookies are properly configured for production security
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

/**
 * Matcher configuration - defines which routes this middleware runs on
 *
 * Excludes:
 * - _next/static (static files)
 * - _next/image (image optimization)
 * - favicon.ico
 * - Common image formats (svg, png, jpg, jpeg, gif, webp)
 *
 * This ensures middleware only runs on actual page routes and API routes.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
