/**
 * Factory for OAuth 2.1 Token Exchange API Route Handler
 * Exchanges authorization code + PKCE verifier for access tokens
 * Sets httpOnly cookies for secure token storage
 *
 * IMPORTANT: Cookies are set directly on the NextResponse object rather than
 * using `cookies()` from `next/headers`. In Next.js App Router, cookies set
 * via `cookies().set()` are not reliably included in the response when the
 * Route Handler returns an explicit `NextResponse.json()`. Setting cookies
 * on the response object ensures the Set-Cookie headers are always sent.
 */
import { NextRequest, NextResponse } from 'next/server';

export interface TokenHandlerConfig {
  platformHubUrl: string;
  clientId: string;
  redirectUri: string;
  cookieDomain?: string;
}

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

/**
 * Cookie options for auth token storage
 */
function getCookieOptions(maxAge: number, httpOnly = true, cookieDomain?: string) {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
    domain: cookieDomain,
  };
}

export function createTokenHandler(config: TokenHandlerConfig) {
  return async function POST(request: NextRequest) {
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
      const tokenUrl = `${config.platformHubUrl}/api/oauth/token`;
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          code_verifier: codeVerifier,
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
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

      if (!tokens.access_token || typeof tokens.expires_in !== 'number') {
        console.error('Malformed token response from Platform Hub: missing access_token or non-numeric expires_in');
        return NextResponse.json(
          { error: 'Malformed token response from authorization server' },
          { status: 502 }
        );
      }

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

      // Build response and set cookies directly on the NextResponse object.
      // This ensures Set-Cookie headers are included in the response.
      const response = NextResponse.json({
        success: true,
        user: {
          id: userId,
          email: userEmail,
        },
      });

      // Access token cookie (expires with token)
      response.cookies.set('jb_access_token', tokens.access_token, getCookieOptions(tokens.expires_in, true, config.cookieDomain));

      // Refresh token cookie (long-lived, typically 30 days)
      if (tokens.refresh_token) {
        response.cookies.set('jb_refresh_token', tokens.refresh_token, getCookieOptions(30 * 24 * 60 * 60, true, config.cookieDomain));
      }

      // User ID cookie (for client-side access, not httpOnly)
      response.cookies.set('jb_user_id', userId, getCookieOptions(tokens.expires_in, false, config.cookieDomain));

      return response;
    } catch (error) {
      console.error('Token exchange error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
