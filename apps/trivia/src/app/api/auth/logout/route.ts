/**
 * OAuth 2.1 Logout API Route
 * Clears authentication cookies (cross-app SSO cookies)
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();

  const cookieOptions = {
    path: '/',
    domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
    maxAge: 0,
  };

  cookieStore.set('beak_access_token', '', cookieOptions);
  cookieStore.set('beak_refresh_token', '', cookieOptions);
  cookieStore.set('beak_user_id', '', cookieOptions);

  return NextResponse.json({ success: true });
}
