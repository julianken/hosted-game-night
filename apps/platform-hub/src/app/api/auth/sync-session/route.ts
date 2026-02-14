/**
 * Platform Hub Session Sync API Route
 *
 * Called after a successful client-side Supabase auth to set httpOnly cookies
 * for cross-app SSO. This is needed when the /api/auth/login endpoint fails
 * (e.g., rate limiting, server issues) but client-side Supabase auth succeeds.
 *
 * The client sends the access_token and refresh_token from the Supabase session,
 * and this endpoint sets the beak_* cookies for middleware verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';

interface SyncRequest {
  accessToken: string;
  refreshToken: string;
}

interface JWTPayload {
  sub: string;
  email?: string;
  exp: number;
  [key: string]: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: SyncRequest = await request.json();
    const { accessToken, refreshToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      );
    }

    // Decode the JWT to get user info and expiration
    let userId = 'unknown';
    let userEmail: string | undefined;
    let expiresIn = 3600; // Default 1 hour

    try {
      const payload = jwtDecode<JWTPayload>(accessToken);
      userId = payload.sub || 'unknown';
      userEmail = payload.email;

      // Calculate expires_in from exp claim
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        expiresIn = Math.max(payload.exp - now, 0);
      }
    } catch (decodeError) {
      console.error('[Sync Session] Failed to decode JWT:', decodeError);
      // Continue anyway - the token might still be valid
    }

    // Get cookie options
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || undefined;

    // Set cross-app SSO cookies
    cookieStore.set('beak_access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: expiresIn,
      path: '/',
      domain: cookieDomain,
    });

    if (refreshToken) {
      cookieStore.set('beak_refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        domain: cookieDomain,
      });
    }

    // User ID cookie (for client-side access)
    cookieStore.set('beak_user_id', userId, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: expiresIn,
      path: '/',
      domain: cookieDomain,
    });

    console.log('[Sync Session] Session synced successfully for user:', userId);

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userEmail,
      },
    });
  } catch (error) {
    console.error('[Sync Session] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
