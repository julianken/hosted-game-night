'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@beak-gaming/auth';

/**
 * SessionTimeoutMonitor - Monitors session state and redirects to login when session expires.
 *
 * Features:
 * - Detects when session becomes null (indicating expiration or logout)
 * - Redirects to login page with "session_expired" query parameter
 * - Preserves current path as redirect URL for seamless re-login
 * - Prevents redirect loops (doesn't redirect from login/signup/public pages)
 * - Senior-friendly: Uses clear messaging and simple UX
 *
 * Implementation:
 * This component implements Option A (MVP) from BEA-320:
 * - Simple session expiration detection
 * - Redirect to login with message
 * - Relies on existing middleware auto-refresh
 *
 * Usage:
 * Add to root layout (already included in app/layout.tsx):
 * ```tsx
 * <AuthProvider>
 *   <SessionTimeoutMonitor />
 *   {children}
 * </AuthProvider>
 * ```
 */
export function SessionTimeoutMonitor() {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSession();

  // Track previous session state to detect transitions
  // Initialize with undefined to differentiate from null (logged out) and actual session
  const previousSessionRef = useRef<typeof session | undefined>(undefined);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    const previousSession = previousSessionRef.current;
    const currentSession = session;

    // Skip on first mount (previousSession is undefined)
    if (previousSession === undefined) {
      previousSessionRef.current = currentSession;
      return;
    }

    // Update ref for next render
    previousSessionRef.current = currentSession;

    // Reset redirect flag when user re-authenticates
    // This allows the monitor to redirect on subsequent session expirations
    if (previousSession === null && currentSession !== null) {
      hasRedirectedRef.current = false;
      return;
    }

    // Don't redirect if we've already redirected in this session
    if (hasRedirectedRef.current) {
      return;
    }

    // Detect session expiration:
    // - We had a session before (user was authenticated)
    // - Now session is null (session expired or logged out)
    const sessionExpired = previousSession !== null && currentSession === null;

    if (!sessionExpired) {
      return;
    }

    // Don't redirect from public pages (avoid redirect loops)
    const publicPaths = [
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/', // Home page is public
    ];

    const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

    if (isPublicPath) {
      return;
    }

    // Build redirect URL with session_expired flag and return URL
    const redirectUrl = `/login?session_expired=true&redirect=${encodeURIComponent(pathname)}`;

    // Mark that we've redirected to prevent loops
    hasRedirectedRef.current = true;

    // Redirect to login
    router.push(redirectUrl);
  }, [session, pathname, router]);

  // This component doesn't render anything
  return null;
}

SessionTimeoutMonitor.displayName = 'SessionTimeoutMonitor';
