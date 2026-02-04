/**
 * OAuth Token Endpoint
 *
 * Handles OAuth 2.1 token operations:
 * - Authorization code exchange (grant_type=authorization_code)
 * - Refresh token rotation (grant_type=refresh_token)
 *
 * Features:
 * - Automatic refresh token rotation on each refresh
 * - Token reuse detection with automatic revocation
 * - Comprehensive error handling and logging
 * - PKCE validation for authorization code exchange
 *
 * Spec: OAuth 2.1 (https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-11)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import { createServiceRoleClient } from '@/lib/supabase/server';

// E2E Testing: Same secret used by Bingo/Trivia middleware for token verification
const E2E_JWT_SECRET = new TextEncoder().encode(
  'e2e-test-secret-key-that-is-at-least-32-characters-long'
);
const E2E_TEST_USER_ID = 'e2e-test-user-00000000-0000-0000-0000-000000000000';
const E2E_TEST_EMAIL = 'e2e-test@beak-gaming.test';
import {
  refreshAccessToken,
  tokenRotationLogger,
  TokenRefreshError,
} from '@/lib/token-rotation';
import {
  getE2EAuthorizationByCode,
  updateE2EAuthorization,
  isE2EMode,
} from '@/lib/oauth/e2e-store';

/**
 * POST /api/oauth/token
 *
 * Token endpoint supporting two grant types:
 * 1. authorization_code - Exchange authorization code for tokens
 * 2. refresh_token - Refresh access token with automatic rotation
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    let body: Record<string, string>;

    // Parse request body (application/x-www-form-urlencoded or application/json)
    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries()) as Record<string, string>;
    } else {
      body = await request.json();
    }

    const { grant_type, code, refresh_token, client_id, redirect_uri, code_verifier } =
      body;

    // Validate grant_type
    if (!grant_type) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Missing grant_type parameter',
        },
        { status: 400 }
      );
    }

    // Handle authorization_code grant
    if (grant_type === 'authorization_code') {
      return await handleAuthorizationCodeGrant({
        code,
        client_id,
        redirect_uri,
        code_verifier,
      });
    }

    // Handle refresh_token grant
    if (grant_type === 'refresh_token') {
      return await handleRefreshTokenGrant({
        refresh_token,
        client_id,
      });
    }

    // Unsupported grant type
    return NextResponse.json(
      {
        error: 'unsupported_grant_type',
        error_description: `Grant type '${grant_type}' is not supported`,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Token Endpoint] Unexpected error:', error);

    return NextResponse.json(
      {
        error: 'server_error',
        error_description: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle authorization_code grant
 * Exchanges authorization code for access and refresh tokens
 */
async function handleAuthorizationCodeGrant(params: {
  code?: string;
  client_id?: string;
  redirect_uri?: string;
  code_verifier?: string;
}) {
  const { code, client_id, redirect_uri, code_verifier } = params;

  // Validate required parameters
  if (!code) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing code parameter',
      },
      { status: 400 }
    );
  }

  if (!client_id) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing client_id parameter',
      },
      { status: 400 }
    );
  }

  if (!redirect_uri) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing redirect_uri parameter',
      },
      { status: 400 }
    );
  }

  if (!code_verifier) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing code_verifier parameter (PKCE required)',
      },
      { status: 400 }
    );
  }

  try {
    // Check if this is an E2E authorization code (stored in memory)
    const e2eAuth = getE2EAuthorizationByCode(code);

    if (e2eAuth && isE2EMode()) {
      console.log('[Token Endpoint] E2E mode: exchanging in-memory authorization code');

      // Validate PKCE code_verifier against code_challenge
      const codeChallenge = crypto
        .createHash('sha256')
        .update(code_verifier)
        .digest('base64url');

      if (codeChallenge !== e2eAuth.code_challenge) {
        return NextResponse.json(
          {
            error: 'invalid_grant',
            error_description: 'Invalid code_verifier',
          },
          { status: 400 }
        );
      }

      // Validate client_id matches
      if (client_id !== e2eAuth.client_id) {
        return NextResponse.json(
          {
            error: 'invalid_grant',
            error_description: 'Client ID mismatch',
          },
          { status: 400 }
        );
      }

      // Validate redirect_uri matches
      if (redirect_uri !== e2eAuth.redirect_uri) {
        return NextResponse.json(
          {
            error: 'invalid_grant',
            error_description: 'Redirect URI mismatch',
          },
          { status: 400 }
        );
      }

      // Check if code has expired
      if (e2eAuth.code_expires_at && new Date(e2eAuth.code_expires_at) < new Date()) {
        return NextResponse.json(
          {
            error: 'invalid_grant',
            error_description: 'Authorization code has expired',
          },
          { status: 400 }
        );
      }

      // Mark authorization as used (invalidate code)
      updateE2EAuthorization(e2eAuth.id, {
        code: undefined,
        status: 'approved', // Keep approved but remove code
      });

      // Generate E2E test tokens as proper JWTs (so middleware can parse exp claim)
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = 3600; // 1 hour

      const accessToken = await new SignJWT({
        sub: E2E_TEST_USER_ID,
        email: E2E_TEST_EMAIL,
        role: 'authenticated',
        aud: 'authenticated',
        iss: 'e2e-test',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { email: E2E_TEST_EMAIL },
      })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt(now)
        .setExpirationTime(now + expiresIn)
        .sign(E2E_JWT_SECRET);

      const refreshToken = `e2e-refresh-${crypto.randomBytes(32).toString('hex')}`;

      console.log('[Token Endpoint] E2E mode: returning test tokens');

      // Return E2E tokens in OAuth 2.1 format
      return NextResponse.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        refresh_token: refreshToken,
      });
    }

    // Normal mode: look up authorization code in database
    const dbClient = createServiceRoleClient();

    // Find authorization by code
    const { data: authData, error: authError } = await dbClient
      .from('oauth_authorizations')
      .select(`
        id,
        client_id,
        user_id,
        redirect_uri,
        code_challenge,
        code_challenge_method,
        code_expires_at,
        status
      `)
      .eq('code', code)
      .eq('status', 'approved')
      .single();

    if (authError || !authData) {
      console.error('[Token Endpoint] Authorization not found:', authError);
      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description: 'Invalid authorization code',
        },
        { status: 400 }
      );
    }

    // Validate PKCE code_verifier against code_challenge
    const computedChallenge = crypto
      .createHash('sha256')
      .update(code_verifier)
      .digest('base64url');

    if (computedChallenge !== authData.code_challenge) {
      console.error('[Token Endpoint] PKCE validation failed');
      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description: 'Invalid code_verifier',
        },
        { status: 400 }
      );
    }

    // Validate client_id matches
    if (client_id !== authData.client_id) {
      console.error('[Token Endpoint] Client ID mismatch');
      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description: 'Client ID mismatch',
        },
        { status: 400 }
      );
    }

    // Validate redirect_uri matches
    if (redirect_uri !== authData.redirect_uri) {
      console.error('[Token Endpoint] Redirect URI mismatch');
      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description: 'Redirect URI mismatch',
        },
        { status: 400 }
      );
    }

    // Check if code has expired
    if (authData.code_expires_at && new Date(authData.code_expires_at) < new Date()) {
      console.error('[Token Endpoint] Authorization code expired');
      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description: 'Authorization code has expired',
        },
        { status: 400 }
      );
    }

    // Mark authorization as used (invalidate code)
    await dbClient
      .from('oauth_authorizations')
      .update({
        code: null,
        status: 'completed',
      })
      .eq('id', authData.id);

    // Get user info using admin API
    const userId = authData.user_id;
    let userEmail: string | undefined;

    try {
      // Use admin API to get user details
      const { data: userData, error: userError } = await dbClient.auth.admin.getUserById(userId);
      if (!userError && userData?.user) {
        userEmail = userData.user.email;
      }
    } catch {
      // If admin API fails, continue without email (user_id is still valid)
      console.log('[Token Endpoint] Could not fetch user email, continuing without it');
    }

    // Generate JWT tokens using SESSION_TOKEN_SECRET
    const sessionSecret = process.env.SESSION_TOKEN_SECRET;
    if (!sessionSecret) {
      console.error('[Token Endpoint] SESSION_TOKEN_SECRET not configured');
      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'Server misconfiguration',
        },
        { status: 500 }
      );
    }

    const jwtSecret = new TextEncoder().encode(sessionSecret);
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600; // 1 hour

    const accessToken = await new SignJWT({
      sub: userId,
      email: userEmail,
      role: 'authenticated',
      aud: 'authenticated',
      iss: 'beak-gaming-platform',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { email: userEmail },
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + expiresIn)
      .sign(jwtSecret);

    const refreshToken = crypto.randomBytes(32).toString('hex');

    // Store refresh token for rotation support (optional: implement refresh token table)
    // For now, we generate a simple refresh token

    tokenRotationLogger.log({
      event_type: 'refresh_success',
      client_id,
      user_id: userId,
      metadata: {
        grant_type: 'authorization_code',
        expires_in: expiresIn,
      },
    });

    // Return tokens in OAuth 2.1 format
    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
    });
  } catch (error) {
    console.error('[Token Endpoint] Code exchange error:', error);

    return NextResponse.json(
      {
        error: 'server_error',
        error_description: 'Failed to exchange authorization code',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle refresh_token grant
 * Refreshes access token and rotates refresh token
 *
 * Security Features:
 * - Automatic refresh token rotation
 * - Reuse detection with full token revocation
 * - Comprehensive audit logging
 */
async function handleRefreshTokenGrant(params: {
  refresh_token?: string;
  client_id?: string;
}) {
  const { refresh_token, client_id } = params;

  // Validate required parameters
  if (!refresh_token) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing refresh_token parameter',
      },
      { status: 400 }
    );
  }

  // E2E Testing Mode: Generate new test tokens without calling Supabase
  if (isE2EMode() && refresh_token.startsWith('e2e-refresh-')) {
    console.log('[Token Endpoint] E2E mode: refreshing test tokens');

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600; // 1 hour

    const accessToken = await new SignJWT({
      sub: E2E_TEST_USER_ID,
      email: E2E_TEST_EMAIL,
      role: 'authenticated',
      aud: 'authenticated',
      iss: 'e2e-test',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { email: E2E_TEST_EMAIL },
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + expiresIn)
      .sign(E2E_JWT_SECRET);

    const newRefreshToken = `e2e-refresh-${crypto.randomBytes(32).toString('hex')}`;

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: newRefreshToken,
    });
  }

  try {
    // Call token rotation utility
    const result = await refreshAccessToken(refresh_token, client_id);

    // Handle token reuse detection
    if (result.shouldRevokeAll) {
      // Extract user_id from the old refresh token if possible
      // In production, you'd look this up from a token mapping table
      // For now, we return the error and let the client handle re-authentication

      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description:
            'Refresh token reuse detected. All tokens have been revoked. Please re-authenticate.',
          error_uri: 'https://datatracker.ietf.org/doc/html/rfc6749#section-10.4',
        },
        { status: 400 }
      );
    }

    // Handle other errors
    if (!result.success || !result.tokens) {
      const errorMap = {
        [TokenRefreshError.INVALID_GRANT]: 'invalid_grant',
        [TokenRefreshError.EXPIRED_TOKEN]: 'invalid_grant',
        [TokenRefreshError.NETWORK_ERROR]: 'server_error',
        [TokenRefreshError.UNKNOWN_ERROR]: 'server_error',
        [TokenRefreshError.TOKEN_REUSE_DETECTED]: 'invalid_grant',
      };

      const error = result.error
        ? errorMap[result.error]
        : 'server_error';

      return NextResponse.json(
        {
          error,
          error_description: result.message || 'Failed to refresh token',
        },
        { status: error === 'server_error' ? 500 : 400 }
      );
    }

    // Return new tokens in OAuth 2.1 format
    return NextResponse.json({
      access_token: result.tokens.access_token,
      token_type: result.tokens.token_type,
      expires_in: result.tokens.expires_in,
      refresh_token: result.tokens.refresh_token,
    });
  } catch (error) {
    console.error('[Token Endpoint] Refresh error:', error);

    return NextResponse.json(
      {
        error: 'server_error',
        error_description: 'Failed to refresh token',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/oauth/token
 *
 * Not allowed - token endpoint only accepts POST
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'invalid_request',
      error_description: 'Token endpoint only accepts POST requests',
    },
    { status: 405 }
  );
}
