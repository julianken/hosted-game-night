/**
 * Factory for OAuth 2.1 Token Exchange with Redirect
 *
 * Service workers strip Set-Cookie headers from responses to fetch() calls
 * (per the Fetch spec, Chrome enforces this even when respondWith() is not
 * called). To work around this, the OAuth callback page submits a form POST
 * instead of using fetch(). This handler reads the form data, exchanges the
 * authorization code for tokens, sets httpOnly cookies, and returns a redirect
 * response. Because the browser processes the redirect as a navigation (not a
 * fetch), Set-Cookie headers are preserved.
 */
import { NextRequest, NextResponse } from 'next/server';

export interface TokenRedirectHandlerConfig {
  platformHubUrl: string;
  clientId: string;
  redirectUri: string;
  cookieDomain?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

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

export function createTokenRedirectHandler(config: TokenRedirectHandlerConfig) {
  return async function POST(request: NextRequest) {
    try {
      const formData = await request.formData();
      const code = formData.get('code') as string;
      const codeVerifier = formData.get('codeVerifier') as string;
      const returnTo = (formData.get('returnTo') as string) || '/';

      if (!code || !codeVerifier) {
        // Redirect to home with error
        const errorUrl = new URL('/', request.url);
        errorUrl.searchParams.set('auth_error', 'missing_parameters');
        return NextResponse.redirect(errorUrl, 303);
      }

      // Exchange authorization code for tokens via Platform Hub
      const tokenUrl = `${config.platformHubUrl}/api/oauth/token`;
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        const errorUrl = new URL('/', request.url);
        errorUrl.searchParams.set('auth_error', 'token_exchange_failed');
        return NextResponse.redirect(errorUrl, 303);
      }

      const tokens: TokenResponse = await tokenResponse.json();

      // Extract user info from the access token
      let userId = 'unknown';

      if (tokens.access_token.startsWith('e2e-')) {
        userId = 'e2e-user';
      } else {
        try {
          const payload = JSON.parse(
            Buffer.from(tokens.access_token.split('.')[1], 'base64url').toString()
          );
          userId = payload.sub || 'unknown';
        } catch {
          console.error('Failed to decode access token JWT');
        }
      }

      // Build redirect response with cookies
      // Use 303 See Other to convert POST to GET for the redirect
      const redirectUrl = new URL(returnTo, request.url);
      const response = NextResponse.redirect(redirectUrl, 303);

      // Set auth cookies on the redirect response
      response.cookies.set(
        'jb_access_token',
        tokens.access_token,
        getCookieOptions(tokens.expires_in, true, config.cookieDomain)
      );

      if (tokens.refresh_token) {
        response.cookies.set(
          'jb_refresh_token',
          tokens.refresh_token,
          getCookieOptions(30 * 24 * 60 * 60, true, config.cookieDomain)
        );
      }

      response.cookies.set(
        'jb_user_id',
        userId,
        getCookieOptions(tokens.expires_in, false, config.cookieDomain)
      );

      return response;
    } catch (error) {
      console.error('Token redirect error:', error);
      const errorUrl = new URL('/', request.url);
      errorUrl.searchParams.set('auth_error', 'internal_error');
      return NextResponse.redirect(errorUrl, 303);
    }
  };
}
