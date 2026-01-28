import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { resetE2EProfile } from '@/lib/e2e-profile-store';

/**
 * POST /api/profile/reset-e2e
 *
 * Resets E2E profile to default state. Only works in E2E testing mode.
 * Used by E2E tests to ensure clean state between test runs.
 */
export async function POST() {
  try {
    // Check for E2E auth via custom SSO cookie
    const cookieStore = await cookies();
    const e2eToken = cookieStore.get('beak_access_token');
    const e2eUserId = cookieStore.get('beak_user_id');

    // Only allow in E2E Testing Mode
    const isE2ETesting =
      process.env.E2E_TESTING === 'true' ||
      (process.env.NODE_ENV !== 'production' && e2eToken && e2eUserId);

    if (!isE2ETesting || !e2eToken || !e2eUserId) {
      return NextResponse.json(
        { error: 'Forbidden: E2E testing mode only' },
        { status: 403 }
      );
    }

    // Reset the profile to defaults
    resetE2EProfile(e2eUserId.value);

    return NextResponse.json({
      success: true,
      message: 'E2E profile reset to defaults',
    });
  } catch (error) {
    console.error('E2E profile reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
