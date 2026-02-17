import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { resetE2EProfile } from '@/lib/e2e-profile-store';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'api-profile-reset-e2e' });

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
    const e2eToken = cookieStore.get('jb_access_token');
    const e2eUserId = cookieStore.get('jb_user_id');

    // Only allow in E2E Testing Mode
    const isE2ETesting =
      process.env.E2E_TESTING === 'true' && e2eToken && e2eUserId;

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
    logger.error('E2E profile reset error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
