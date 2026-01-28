import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getE2EProfile, updateE2EProfile } from '@/lib/e2e-profile-store';

/**
 * GET /api/profile
 *
 * Retrieves the current user's profile information including avatar_url.
 *
 * E2E Testing:
 * - Detects E2E mode via cookies: beak_access_token, beak_user_id
 * - Returns profile data from in-memory store in E2E mode
 *
 * @returns {Object} Profile data with avatar_url, facility_name, email, notification preferences
 */
export async function GET() {
  // Check for E2E auth via custom SSO cookie (set by /api/auth/login in E2E mode)
  const cookieStore = await cookies();
  const e2eToken = cookieStore.get('beak_access_token');
  const e2eUserId = cookieStore.get('beak_user_id');

  // E2E Testing Mode: Use in-memory profile store
  const isE2ETesting =
    process.env.E2E_TESTING === 'true' ||
    (process.env.NODE_ENV !== 'production' && e2eToken && e2eUserId);

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

    // Fetch profile from database (includes avatar_url + notification preferences)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url, facility_name, email, email_notifications_enabled, game_reminders_enabled, weekly_summary_enabled, marketing_emails_enabled')
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
      email_notifications_enabled: profile?.email_notifications_enabled ?? true,
      game_reminders_enabled: profile?.game_reminders_enabled ?? false,
      weekly_summary_enabled: profile?.weekly_summary_enabled ?? false,
      marketing_emails_enabled: profile?.marketing_emails_enabled ?? false,
    });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile
 *
 * Partially updates the current user's profile.
 * Used for immediate-save notification preferences (BEA-323).
 *
 * E2E Testing:
 * - Detects E2E mode via cookies: beak_access_token, beak_user_id
 * - Updates profile data in in-memory store in E2E mode
 *
 * @param {Request} request - Request with partial profile updates
 * @returns {Object} Success status and message
 */
export async function PATCH(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      emailNotificationsEnabled,
      gameRemindersEnabled,
      weeklySummaryEnabled,
      marketingEmailsEnabled,
    } = body;

    // Check for E2E auth via custom SSO cookie (set by /api/auth/login in E2E mode)
    const cookieStore = await cookies();
    const e2eToken = cookieStore.get('beak_access_token');
    const e2eUserId = cookieStore.get('beak_user_id');

    // E2E Testing Mode: Use in-memory profile store
    const isE2ETesting =
      process.env.E2E_TESTING === 'true' ||
      (process.env.NODE_ENV !== 'production' && e2eToken && e2eUserId);

    if (isE2ETesting && e2eToken && e2eUserId) {
      console.log('[Profile PATCH API] E2E testing mode: using in-memory store');

      // Build update object (only notification preferences)
      const updates: Record<string, unknown> = {};

      if (emailNotificationsEnabled !== undefined) {
        updates.email_notifications_enabled = emailNotificationsEnabled;
      }
      if (gameRemindersEnabled !== undefined) {
        updates.game_reminders_enabled = gameRemindersEnabled;
      }
      if (weeklySummaryEnabled !== undefined) {
        updates.weekly_summary_enabled = weeklySummaryEnabled;
      }
      if (marketingEmailsEnabled !== undefined) {
        updates.marketing_emails_enabled = marketingEmailsEnabled;
      }

      // Update in-memory store
      updateE2EProfile(e2eUserId.value, updates);

      return NextResponse.json({
        success: true,
        message: 'Notification preferences updated',
      });
    }

    // Normal flow: Check Supabase authentication
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build update object for profiles table (only notification preferences)
    const profileUpdates: Record<string, unknown> = {};

    if (emailNotificationsEnabled !== undefined) {
      if (typeof emailNotificationsEnabled !== 'boolean') {
        return NextResponse.json(
          { error: 'emailNotificationsEnabled must be a boolean' },
          { status: 400 }
        );
      }
      profileUpdates.email_notifications_enabled = emailNotificationsEnabled;
    }

    if (gameRemindersEnabled !== undefined) {
      if (typeof gameRemindersEnabled !== 'boolean') {
        return NextResponse.json(
          { error: 'gameRemindersEnabled must be a boolean' },
          { status: 400 }
        );
      }
      profileUpdates.game_reminders_enabled = gameRemindersEnabled;
    }

    if (weeklySummaryEnabled !== undefined) {
      if (typeof weeklySummaryEnabled !== 'boolean') {
        return NextResponse.json(
          { error: 'weeklySummaryEnabled must be a boolean' },
          { status: 400 }
        );
      }
      profileUpdates.weekly_summary_enabled = weeklySummaryEnabled;
    }

    if (marketingEmailsEnabled !== undefined) {
      if (typeof marketingEmailsEnabled !== 'boolean') {
        return NextResponse.json(
          { error: 'marketingEmailsEnabled must be a boolean' },
          { status: 400 }
        );
      }
      profileUpdates.marketing_emails_enabled = marketingEmailsEnabled;
    }

    // Update profile in profiles table
    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated',
    });
  } catch (error) {
    console.error('Profile PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
