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
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  generateRefreshToken,
  storeRefreshToken,
  rotateRefreshToken,
} from '@/lib/refresh-token-store';
import { tokenRotationLogger } from '@/lib/token-rotation';
import {
  getE2EAuthorizationByCode,
  updateE2EAuthorization,
  isE2EMode,
} from '@/lib/oauth/e2e-store';
import {
  signTokenPair,
  signE2EAccessToken,
  resolveJwtConfig,
} from '@/lib/oauth/jwt';
import { OAuthError, withOAuthErrorHandling } from '@/lib/oauth/errors';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'oauth-token' });

// Production guard: E2E mode must never run on actual production (Vercel)
// Allows local production builds/servers for E2E testing (VERCEL=1 is auto-set by Vercel)
if (process.env.E2E_TESTING === 'true' && process.env.VERCEL === '1') {
  throw new Error('E2E mode cannot run in production');
}

/**
 * POST /api/oauth/token
 *
 * Token endpoint supporting two grant types:
 * 1. authorization_code - Exchange authorization code for tokens
 * 2. refresh_token - Refresh access token with automatic rotation
 */
export const POST = withOAuthErrorHandling(
  '[Token Endpoint]',
  async (request: NextRequest): Promise<NextResponse> => {
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
      throw new OAuthError('invalid_request', 'Missing grant_type parameter');
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
    throw new OAuthError(
      'unsupported_grant_type',
      `Grant type '${grant_type}' is not supported`
    );
  }
);

/**
 * Handle authorization_code grant
 * Exchanges authorization code for access and refresh tokens
 */
async function handleAuthorizationCodeGrant(params: {
  code?: string;
  client_id?: string;
  redirect_uri?: string;
  code_verifier?: string;
}): Promise<NextResponse> {
  const { code, client_id, redirect_uri, code_verifier } = params;

  // Validate required parameters
  if (!code) {
    throw new OAuthError('invalid_request', 'Missing code parameter');
  }
  if (!client_id) {
    throw new OAuthError('invalid_request', 'Missing client_id parameter');
  }
  if (!redirect_uri) {
    throw new OAuthError('invalid_request', 'Missing redirect_uri parameter');
  }
  if (!code_verifier) {
    throw new OAuthError('invalid_request', 'Missing code_verifier parameter (PKCE required)');
  }

  try {
    // Check if this is an E2E authorization code (stored in memory)
    const e2eAuth = getE2EAuthorizationByCode(code);

    if (e2eAuth && isE2EMode()) {
      logger.info('E2E mode: exchanging in-memory authorization code');

      // Validate PKCE code_verifier against code_challenge
      const codeChallenge = crypto
        .createHash('sha256')
        .update(code_verifier)
        .digest('base64url');

      if (codeChallenge !== e2eAuth.code_challenge) {
        throw new OAuthError('invalid_grant', 'Invalid code_verifier');
      }

      if (client_id !== e2eAuth.client_id) {
        throw new OAuthError('invalid_grant', 'Client ID mismatch');
      }

      if (redirect_uri !== e2eAuth.redirect_uri) {
        throw new OAuthError('invalid_grant', 'Redirect URI mismatch');
      }

      if (e2eAuth.code_expires_at && new Date(e2eAuth.code_expires_at) < new Date()) {
        throw new OAuthError('invalid_grant', 'Authorization code has expired');
      }

      // Mark authorization as used (invalidate code)
      updateE2EAuthorization(e2eAuth.id, {
        code: undefined,
        status: 'approved',
      });

      // Generate E2E test tokens (proper JWTs so middleware can parse exp claim)
      const accessToken = await signE2EAccessToken();
      const refreshToken = `e2e-refresh-${crypto.randomBytes(32).toString('hex')}`;

      logger.info('E2E mode: returning test tokens');

      return NextResponse.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
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
      logger.error('Authorization not found', { error: authError?.message });
      throw new OAuthError('invalid_grant', 'Invalid authorization code');
    }

    // Validate PKCE code_verifier against code_challenge
    const computedChallenge = crypto
      .createHash('sha256')
      .update(code_verifier)
      .digest('base64url');

    if (computedChallenge !== authData.code_challenge) {
      logger.error('PKCE validation failed');
      throw new OAuthError('invalid_grant', 'Invalid code_verifier');
    }

    if (client_id !== authData.client_id) {
      logger.error('Client ID mismatch');
      throw new OAuthError('invalid_grant', 'Client ID mismatch');
    }

    if (redirect_uri !== authData.redirect_uri) {
      logger.error('Redirect URI mismatch');
      throw new OAuthError('invalid_grant', 'Redirect URI mismatch');
    }

    if (authData.code_expires_at && new Date(authData.code_expires_at) < new Date()) {
      logger.error('Authorization code expired');
      throw new OAuthError('invalid_grant', 'Authorization code has expired');
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
      const { data: userData, error: userError } =
        await dbClient.auth.admin.getUserById(userId);
      if (!userError && userData?.user) {
        userEmail = userData.user.email;
      }
    } catch {
      // If admin API fails, continue without email (user_id is still valid)
      logger.info('Could not fetch user email, continuing without it');
    }

    // Validate JWT config before generating tokens (fail fast with clear error)
    resolveJwtConfig();

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
      logger.error('Failed to store refresh token', { error: storeResult.error });
      throw new OAuthError('server_error', 'Failed to persist refresh token', 500);
    }

    // Sign access token and assemble token pair
    const { accessToken, expiresIn } = await signTokenPair({
      userId,
      userEmail,
      refreshToken,
    });

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
    if (error instanceof OAuthError) throw error;

    logger.error('Code exchange error', { error: error instanceof Error ? error.message : String(error) });
    throw new OAuthError('server_error', 'Failed to exchange authorization code', 500);
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
}): Promise<NextResponse> {
  const { refresh_token, client_id } = params;

  // Validate required parameters
  if (!refresh_token) {
    throw new OAuthError('invalid_request', 'Missing refresh_token parameter');
  }
  if (!client_id) {
    throw new OAuthError('invalid_request', 'Missing client_id parameter');
  }

  // E2E Testing Mode: Generate new test tokens without database
  if (isE2EMode() && refresh_token.startsWith('e2e-refresh-')) {
    logger.info('E2E mode: refreshing test tokens');

    const accessToken = await signE2EAccessToken();
    const newRefreshToken = `e2e-refresh-${crypto.randomBytes(32).toString('hex')}`;

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
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

      throw new OAuthError(
        'invalid_grant',
        rotationResult.error || 'Invalid refresh token'
      );
    }

    // Get user info from the validated token data
    const dbClient = createServiceRoleClient();
    const { data: tokenData, error: tokenError } = await dbClient
      .from('refresh_tokens')
      .select('user_id, scopes')
      .eq('id', rotationResult.newTokenId)
      .single();

    if (tokenError || !tokenData) {
      logger.error('Could not find new token data', { error: tokenError?.message });
      throw new OAuthError('server_error', 'Failed to refresh token', 500);
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
      logger.info('Could not fetch user email, continuing without it');
    }

    // Sign new access token and assemble token pair
    const { accessToken, expiresIn } = await signTokenPair({
      userId,
      userEmail,
      refreshToken: rotationResult.newToken,
    });

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
    if (error instanceof OAuthError) throw error;

    logger.error('Refresh error', { error: error instanceof Error ? error.message : String(error) });
    throw new OAuthError('server_error', 'Failed to refresh token', 500);
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
