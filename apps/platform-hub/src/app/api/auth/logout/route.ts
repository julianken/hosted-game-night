/**
 * OAuth 2.1 Logout API Route
 * Clears authentication cookies (cross-app SSO cookies)
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'auth-logout' });

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Get tokens BEFORE clearing cookies (for revocation)
    const accessToken = cookieStore.get('jb_access_token')?.value;
    const refreshToken = cookieStore.get('jb_refresh_token')?.value;

    // Revoke tokens with Supabase if they exist
    if ((accessToken || refreshToken) && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        await supabase.auth.signOut();
      } catch (supabaseError) {
        // Log but don't fail the request - cookies will be cleared anyway
        logger.error('Supabase signOut error (non-critical)', { error: supabaseError instanceof Error ? supabaseError.message : String(supabaseError) });
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
