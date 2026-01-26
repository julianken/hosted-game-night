import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering to avoid build-time Supabase initialization
export const dynamic = 'force-dynamic';

/**
 * Dashboard Layout - Provides authentication protection for all dashboard routes
 *
 * This layout wraps all routes under /dashboard/* and ensures the user is authenticated
 * before rendering any child pages. If the user is not authenticated, they are redirected
 * to the login page with a redirect parameter to return them to the original destination.
 *
 * Supports E2E testing mode by checking for beak_access_token cookie which is set by
 * the /api/auth/login endpoint when E2E_TESTING is enabled.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check for E2E auth via custom SSO cookie (set by /api/auth/login in E2E mode)
  // This allows E2E tests to bypass real Supabase auth and avoid rate limits
  const cookieStore = await cookies();
  const e2eToken = cookieStore.get('beak_access_token');
  const e2eUserId = cookieStore.get('beak_user_id');

  // E2E Testing Mode: beak_access_token is set by E2E login API
  // Check for E2E cookie BEFORE Supabase auth to avoid unnecessary API calls
  if (e2eToken && e2eUserId) {
    // E2E user is authenticated - skip Supabase check and render children
    return <>{children}</>;
  }

  // Normal flow: Check Supabase authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (userError || !user) {
    redirect('/login?redirect=%2Fdashboard');
  }

  // User is authenticated, render the child pages
  return <>{children}</>;
}
