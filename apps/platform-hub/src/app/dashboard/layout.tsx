import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering to avoid build-time Supabase initialization
export const dynamic = 'force-dynamic';

/**
 * Dashboard Layout - Provides authentication protection for all dashboard routes
 *
 * This layout wraps all routes under /dashboard/* and ensures the user is authenticated
 * before rendering any child pages. If the user is not authenticated, they are redirected
 * to the login page with a redirect parameter to return them to the original destination.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication
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
