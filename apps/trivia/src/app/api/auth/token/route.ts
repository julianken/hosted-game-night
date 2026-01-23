/**
 * OAuth 2.1 Token Exchange API Route
 * Exchanges authorization code + PKCE verifier for access tokens
 * Sets httpOnly cookies for secure token storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI!;

interface TokenRequest {
  code: string;
  codeVerifier: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: {
    id: string;
    email?: string;
    [key: string]: unknown;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: TokenRequest = await request.json();
    const { code, codeVerifier } = body;

    // Validate required parameters
    if (!code || !codeVerifier) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Exchange authorization code for tokens
    const tokenUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=authorization_code`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return NextResponse.json(
        { error: errorData.error_description || 'Token exchange failed' },
        { status: tokenResponse.status }
      );
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Set httpOnly cookies for secure token storage
    const cookieStore = await cookies();

    // Access token cookie (expires with token)
    cookieStore.set('beak_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: tokens.expires_in,
      path: '/',
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
    });

    // Refresh token cookie (long-lived, typically 30 days)
    if (tokens.refresh_token) {
      cookieStore.set('beak_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
      });
    }

    // User ID cookie (for client-side access)
    cookieStore.set('beak_user_id', tokens.user.id, {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: tokens.expires_in,
      path: '/',
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: tokens.user.id,
        email: tokens.user.email,
      },
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
