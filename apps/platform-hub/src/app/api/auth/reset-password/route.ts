import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Password Reset API Route
 *
 * SECURITY: This endpoint ONLY allows password changes from recovery sessions.
 * Normal authenticated users must use /api/profile/update which requires current password.
 *
 * This prevents privilege escalation where a logged-in user could bypass the
 * current password requirement by manipulating the /reset-password page URL.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CRITICAL SECURITY CHECK: Verify this is a recovery session
    // Check AMR (Authentication Methods Reference) claims
    const amr = session.user.app_metadata?.amr || [];
    const isRecoverySession = amr.some(
      (factor: { method: string; timestamp: number }) => factor.method === 'recovery'
    );

    if (!isRecoverySession) {
      return NextResponse.json(
        {
          error: 'This endpoint only accepts recovery sessions. Use the password reset link from your email, or change your password in settings with your current password.'
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Validate password complexity (matches client-side and settings validation)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must include at least one uppercase letter' },
        { status: 400 }
      );
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must include at least one lowercase letter' },
        { status: 400 }
      );
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must include at least one number' },
        { status: 400 }
      );
    }

    // Update password (only allowed because we verified recovery session above)
    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError) {
      console.error('Password update error:', passwordError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
