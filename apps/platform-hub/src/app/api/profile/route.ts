import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getE2EProfile } from '@/lib/e2e-profile-store';

/**
 * GET /api/profile
 *
 * Retrieves the current user's profile information.
 *
 * E2E Testing:
 * - Detects E2E mode via cookies: beak_access_token, beak_user_id
 * - Returns profile data from in-memory store in E2E mode
 *
 * @returns {Object} Profile data with facility_name, email
 */
export async function GET() {
  // Check for E2E auth via custom SSO cookie (set by /api/auth/login in E2E mode)
  const cookieStore = await cookies();
  const e2eToken = cookieStore.get('beak_access_token');
  const e2eUserId = cookieStore.get('beak_user_id');

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
      .select('facility_name, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      facility_name: profile?.facility_name || user.user_metadata?.facility_name || '',
      email: profile?.email || user.email || '',
    });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
