/**
 * OAuth 2.1 Logout API Route
 *
 * Revokes all Supabase sessions for the user via the admin API,
 * then clears authentication cookies (cross-app SSO cookies).
 *
 * Uses the service-role key to create an admin Supabase client,
 * which is required to revoke sessions server-side (the anon key
 * creates an unauthenticated client where signOut() is a no-op).
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'auth-logout' });

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Get userId from jb_user_id cookie for admin session revocation
    const userId = cookieStore.get('jb_user_id')?.value;

    // Revoke all sessions for this user via admin API
    if (userId && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        );
        await supabase.auth.admin.signOut(userId);
      } catch (supabaseError) {
        // Log but don't fail the request - cookies will be cleared anyway
        logger.error('Supabase admin signOut error (non-critical)', { error: supabaseError instanceof Error ? supabaseError.message : String(supabaseError) });
      }
    }

    // Clear all cross-app SSO authentication cookies
    const cookieOptions = {
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
      maxAge: 0,
    };

    cookieStore.set('jb_access_token', '', cookieOptions);
    cookieStore.set('jb_refresh_token', '', cookieOptions);
    cookieStore.set('jb_user_id', '', cookieOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Logout error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
