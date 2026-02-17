import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getE2EProfile } from '@/lib/e2e-profile-store';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'api-profile' });

/**
 * GET /api/profile
 *
 * Retrieves the current user's profile information.
 * - `facility_name` comes from the `profiles` table
 * - `email` comes from `auth.users` via `supabase.auth.getUser()`
 *
 * E2E Testing:
 * - Detects E2E mode via cookies: jb_access_token, jb_user_id
 * - Returns profile data from in-memory store in E2E mode
 *
 * @returns {Object} Profile data with facility_name, email
 */
export async function GET() {
  // Check for E2E auth via custom SSO cookie (set by /api/auth/login in E2E mode)
  const cookieStore = await cookies();
  const e2eToken = cookieStore.get('jb_access_token');
  const e2eUserId = cookieStore.get('jb_user_id');

  // E2E Testing Mode: Use in-memory profile store
  const isE2ETesting =
    process.env.E2E_TESTING === 'true' && e2eToken && e2eUserId;

  if (isE2ETesting && e2eToken && e2eUserId) {
    const profile = getE2EProfile(e2eUserId.value);
    return NextResponse.json({
      success: true,
      ...profile,
    });
  }

  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('facility_name')
      .eq('id', user.id)
      .single();

    // PGRST116 = "no rows found" - expected for new users without a profile row
    if (profileError && profileError.code !== 'PGRST116') {
      logger.error('Profile fetch error', { error: profileError.message });
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      facility_name: profile?.facility_name || user.user_metadata?.facility_name || '',
      email: user.email || '',
    });
  } catch (error) {
    logger.error('Profile API error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
