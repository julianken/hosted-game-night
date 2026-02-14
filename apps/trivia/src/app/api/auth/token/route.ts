/**
 * OAuth 2.1 Token Exchange API Route
 * Exchanges authorization code + PKCE verifier for access tokens
 * Sets httpOnly cookies for secure token storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const PLATFORM_HUB_URL =
  process.env.NEXT_PUBLIC_PLATFORM_HUB_URL || 'http://localhost:3002';
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

    // Exchange authorization code for tokens via Platform Hub OAuth server
    const tokenUrl = `${PLATFORM_HUB_URL}/api/oauth/token`;
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

    // Extract user info from the access token.
    // E2E tokens are opaque (prefixed "e2e-"), real tokens are JWTs.
    let userId = 'unknown';
    let userEmail: string | undefined;

    if (tokens.access_token.startsWith('e2e-')) {
      // E2E mode: extract user ID from the token pattern or use placeholder
      userId = 'e2e-user';
    } else {
      // Real JWT: decode payload (second segment, base64url)
      try {
        const payload = JSON.parse(
          Buffer.from(tokens.access_token.split('.')[1], 'base64url').toString()
        );
        userId = payload.sub || 'unknown';
        userEmail = payload.email;
      } catch {
        console.error('Failed to decode access token JWT');
      }
    }

    // Set httpOnly cookies for secure token storage
    const cookieStore = await cookies();

    // Access token cookie (expires with token)
    // Use sameSite: 'lax' for same-origin OAuth flows (not cross-origin)
    cookieStore.set('beak_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    // Refresh token cookie (long-lived, typically 30 days)
    if (tokens.refresh_token) {
      cookieStore.set('beak_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        domain: process.env.COOKIE_DOMAIN || undefined,
      });
    }

    // User ID cookie (for client-side access)
    cookieStore.set('beak_user_id', userId, {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userEmail,
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
