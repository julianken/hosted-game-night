/**
 * OAuth Token Endpoint
 *
 * Handles OAuth 2.1 token operations:
 * - Authorization code exchange (grant_type=authorization_code)
 * - Refresh token rotation (grant_type=refresh_token)
 *
 * Features:
 * - Refresh token persistence with secure hashing (SHA-256)
 * - Automatic refresh token rotation on each refresh
 * - Token reuse detection with automatic family revocation
 * - Comprehensive error handling and logging
 * - PKCE validation for authorization code exchange
 *
 * Spec: OAuth 2.1 (https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-11)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  generateRefreshToken,
  storeRefreshToken,
  rotateRefreshToken,
} from '@/lib/refresh-token-store';

// Production guard: E2E mode must never run in production
if (process.env.E2E_TESTING === 'true' && process.env.NODE_ENV === 'production') {
  throw new Error('E2E mode cannot run in production');
}

// E2E Testing: Secret loaded from environment variable (never hardcoded)
function getE2EJwtSecret(): Uint8Array {
  const secret = process.env.E2E_JWT_SECRET;
  if (!secret) {
    throw new Error(
      'E2E_JWT_SECRET environment variable is required when E2E_TESTING=true. ' +
      'Set it in your .env.local file.'
    );
  }
  return new TextEncoder().encode(secret);
}

const E2E_TEST_USER_ID = 'e2e-test-user-00000000-0000-0000-0000-000000000000';
const E2E_TEST_EMAIL = 'e2e-test@beak-gaming.test';
import { tokenRotationLogger } from '@/lib/token-rotation';
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
        .sign(getE2EJwtSecret());

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

    // Find authorization by code (also get scope)
    const { data: authData, error: authError } = await dbClient
      .from('oauth_authorizations')
      .select(`
        id,
        client_id,
        user_id,
        redirect_uri,
        scope,
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
      const { data: userData, error: userError } =
        await dbClient.auth.admin.getUserById(userId);
      if (!userError && userData?.user) {
        userEmail = userData.user.email;
      }
    } catch {
      // If admin API fails, continue without email (user_id is still valid)
      console.log('[Token Endpoint] Could not fetch user email, continuing without it');
    }

    // Generate JWT tokens using SUPABASE_JWT_SECRET (preferred) or SESSION_TOKEN_SECRET (fallback)
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
    const sessionSecret = process.env.SESSION_TOKEN_SECRET;
    const signingSecret = supabaseJwtSecret || sessionSecret;

    if (!signingSecret) {
      console.error('[Token Endpoint] Neither SUPABASE_JWT_SECRET nor SESSION_TOKEN_SECRET configured');
      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'Server misconfiguration',
        },
        { status: 500 }
      );
    }

    // When using SUPABASE_JWT_SECRET, use Supabase-compatible issuer
    // so PostgRES accepts the JWT for RLS enforcement
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const jwtIssuer = supabaseJwtSecret
      ? `${supabaseUrl}/auth/v1`
      : 'beak-gaming-platform';

    const jwtSecret = new TextEncoder().encode(signingSecret);
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600; // 1 hour

    const accessToken = await new SignJWT({
      sub: userId,
      email: userEmail,
      role: 'authenticated',
      aud: 'authenticated',
      iss: jwtIssuer,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { email: userEmail },
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + expiresIn)
      .sign(jwtSecret);

    // Generate and persist refresh token (hashed in database)
    const refreshToken = generateRefreshToken();
    const scopes = authData.scope ? authData.scope.split(' ') : [];

    const storeResult = await storeRefreshToken(
      refreshToken,
      userId,
      client_id,
      scopes
    );

    if (!storeResult.success) {
      console.error(
        '[Token Endpoint] Failed to store refresh token:',
        storeResult.error
      );
      // Continue anyway - the token is valid, just won't support rotation
      // In a stricter implementation, you might return an error here
    }

    tokenRotationLogger.log({
      event_type: 'refresh_success',
      client_id,
      user_id: userId,
      metadata: {
        grant_type: 'authorization_code',
        expires_in: expiresIn,
        token_persisted: storeResult.success,
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
 * - Validates token against persisted hash
 * - Automatic refresh token rotation
 * - Reuse detection with full family revocation
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

  // E2E Testing Mode: Generate new test tokens without database
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
      .sign(getE2EJwtSecret());

    const newRefreshToken = `e2e-refresh-${crypto.randomBytes(32).toString('hex')}`;

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: newRefreshToken,
    });
  }

  try {
    // Rotate token: validates, creates new token, marks old as rotated
    const rotationResult = await rotateRefreshToken(refresh_token, client_id);

    if (!rotationResult.success || !rotationResult.newToken) {
      // Check for reuse detection (family revoked)
      const isReuseDetected = rotationResult.error?.includes('reuse');

      if (isReuseDetected) {
        tokenRotationLogger.log({
          event_type: 'reuse_detected',
          client_id,
          metadata: { error: rotationResult.error },
        });

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

      tokenRotationLogger.log({
        event_type: 'refresh_failure',
        client_id,
        error: rotationResult.error,
      });

      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description: rotationResult.error || 'Invalid refresh token',
        },
        { status: 400 }
      );
    }

    // Get user info from the validated token data
    // We need to look up the token to get user_id
    const dbClient = createServiceRoleClient();
    const { data: tokenData, error: tokenError } = await dbClient
      .from('refresh_tokens')
      .select('user_id, scopes')
      .eq('id', rotationResult.newTokenId)
      .single();

    if (tokenError || !tokenData) {
      console.error('[Token Endpoint] Could not find new token data:', tokenError);
      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'Failed to refresh token',
        },
        { status: 500 }
      );
    }

    const userId = tokenData.user_id;
    let userEmail: string | undefined;

    try {
      const { data: userData, error: userError } =
        await dbClient.auth.admin.getUserById(userId);
      if (!userError && userData?.user) {
        userEmail = userData.user.email;
      }
    } catch {
      console.log('[Token Endpoint] Could not fetch user email, continuing without it');
    }

    // Generate new access token using SUPABASE_JWT_SECRET (preferred) or SESSION_TOKEN_SECRET (fallback)
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
    const sessionSecret = process.env.SESSION_TOKEN_SECRET;
    const signingSecret = supabaseJwtSecret || sessionSecret;

    if (!signingSecret) {
      console.error('[Token Endpoint] Neither SUPABASE_JWT_SECRET nor SESSION_TOKEN_SECRET configured');
      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'Server misconfiguration',
        },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const jwtIssuer = supabaseJwtSecret
      ? `${supabaseUrl}/auth/v1`
      : 'beak-gaming-platform';

    const jwtSecret = new TextEncoder().encode(signingSecret);
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600; // 1 hour

    const accessToken = await new SignJWT({
      sub: userId,
      email: userEmail,
      role: 'authenticated',
      aud: 'authenticated',
      iss: jwtIssuer,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { email: userEmail },
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + expiresIn)
      .sign(jwtSecret);

    tokenRotationLogger.log({
      event_type: 'refresh_success',
      client_id,
      user_id: userId,
      metadata: {
        grant_type: 'refresh_token',
        expires_in: expiresIn,
        new_token_id: rotationResult.newTokenId,
      },
    });

    // Return new tokens in OAuth 2.1 format
    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: rotationResult.newToken,
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
