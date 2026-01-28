import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { updateE2EProfile } from '@/lib/e2e-profile-store';

export async function POST(request: Request) {
  try {
    // Parse request body early (needed for both E2E and normal modes)
    const body = await request.json();
    const {
      facilityName,
      email,
      currentPassword,
      newPassword,
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
      console.log('[Profile Update API] E2E testing mode: using in-memory store');

      // Build update object
      const updates: Record<string, unknown> = {};

      if (facilityName !== undefined) {
        updates.facility_name = facilityName;
      }
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
        message: 'Profile updated successfully',
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


    // Validate inputs
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Validate new password complexity (matches client-side validation)
    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        );
      }
      if (!/[A-Z]/.test(newPassword)) {
        return NextResponse.json(
          { error: 'Password must include at least one uppercase letter' },
          { status: 400 }
        );
      }
      if (!/[a-z]/.test(newPassword)) {
        return NextResponse.json(
          { error: 'Password must include at least one lowercase letter' },
          { status: 400 }
        );
      }
      if (!/[0-9]/.test(newPassword)) {
        return NextResponse.json(
          { error: 'Password must include at least one number' },
          { status: 400 }
        );
      }
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change password' },
          { status: 400 }
        );
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }
    }

    // Build update object for profiles table
    const profileUpdates: Record<string, unknown> = {};

    if (facilityName !== undefined) {
      profileUpdates.facility_name = facilityName;
    }

    // Add notification preferences if provided
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

    // Update email if changed
    if (email && email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email,
      });

      if (emailError) {
        console.error('Email update error:', emailError);
        return NextResponse.json(
          { error: 'Failed to update email. Email may already be in use.' },
          { status: 400 }
        );
      }
    }

    // Update password if provided
    if (newPassword) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordError) {
        console.error('Password update error:', passwordError);
        return NextResponse.json(
          { error: 'Failed to update password' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
