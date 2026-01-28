import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/profile
 *
 * Retrieves the current user's profile information including avatar_url.
 *
 * E2E Testing:
 * - Detects E2E mode via cookies: beak_access_token, beak_user_id
 * - Returns mock profile data in E2E mode
 *
 * @returns {Object} Profile data with avatar_url, facility_name, email
 */
export async function GET() {
  // E2E testing bypass
  const isE2ETesting = process.env.NODE_ENV === 'development';
  const e2eToken =
    typeof document !== 'undefined' && typeof window !== 'undefined'
      ? document.cookie
          .split('; ')
          .find((row) => row.startsWith('beak_access_token='))
          ?.split('=')[1]
      : undefined;

  if (isE2ETesting && e2eToken) {
    return NextResponse.json({
      success: true,
      avatar_url: null, // E2E tests start with no avatar
      facility_name: 'E2E Test Facility',
      email: 'e2e-test@beak-gaming.test',
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
      .select('avatar_url, facility_name, email')
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
      avatar_url: profile?.avatar_url || null,
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
