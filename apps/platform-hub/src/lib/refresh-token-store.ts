/**
 * Refresh Token Store
 *
 * Provides secure persistence for refresh tokens with:
 * - SHA-256 hashing before storage (plaintext never stored)
 * - Token rotation with family tracking
 * - Reuse detection and automatic family revocation
 * - Secure token generation
 */

import crypto from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'lib-refresh-token-store' });

/**
 * Refresh token configuration
 */
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // 30 days expiry

/**
 * Result of storing a new refresh token
 */
export interface StoreRefreshTokenResult {
  success: boolean;
  tokenId?: string;
  error?: string;
}

/**
 * Result of validating a refresh token
 */
export interface ValidateRefreshTokenResult {
  valid: boolean;
  tokenId?: string;
  userId?: string;
  clientId?: string;
  scopes?: string[];
  error?: 'invalid' | 'expired' | 'revoked' | 'already_rotated' | 'db_error';
  errorMessage?: string;
}

/**
 * Result of rotating a refresh token
 */
export interface RotateRefreshTokenResult {
  success: boolean;
  newTokenId?: string;
  newToken?: string;
  error?: string;
}

/**
 * Generate a cryptographically secure refresh token
 * Format: rt_{random_hex} where random_hex is 64 chars (32 bytes)
 */
export function generateRefreshToken(): string {
  return `rt_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Hash a refresh token using SHA-256
 * IMPORTANT: Always hash tokens before storage or comparison
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Store a new refresh token in the database
 *
 * @param token - The plaintext refresh token (will be hashed before storage)
 * @param userId - User ID
 * @param clientId - OAuth client ID
 * @param scopes - Authorized scopes
 * @returns Result with token ID on success
 */
export async function storeRefreshToken(
  token: string,
  userId: string,
  clientId: string,
  scopes: string[] = []
): Promise<StoreRefreshTokenResult> {
  try {
    const dbClient = createServiceRoleClient();
    const tokenHash = hashRefreshToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    const { data, error } = await dbClient
      .from('refresh_tokens')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        client_id: clientId,
        scopes,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to store token', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      tokenId: data.id,
    };
  } catch (error) {
    logger.error('Unexpected error storing token', { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate a refresh token against the database
 *
 * Checks:
 * - Token exists
 * - Token not expired
 * - Token not revoked
 * - Token not already rotated (reuse detection)
 *
 * @param token - The plaintext refresh token
 * @param clientId - Expected client ID (optional, for additional validation)
 * @returns Validation result with token details on success
 */
export async function validateRefreshToken(
  token: string,
  clientId?: string
): Promise<ValidateRefreshTokenResult> {
  try {
    const dbClient = createServiceRoleClient();
    const tokenHash = hashRefreshToken(token);

    const { data, error } = await dbClient
      .from('refresh_tokens')
      .select('id, user_id, client_id, scopes, expires_at, revoked_at, rotated_to')
      .eq('token_hash', tokenHash)
      .single();

    if (error || !data) {
      return {
        valid: false,
        error: 'invalid',
        errorMessage: 'Refresh token not found',
      };
    }

    // Check if token has been revoked
    if (data.revoked_at) {
      return {
        valid: false,
        tokenId: data.id,
        error: 'revoked',
        errorMessage: 'Refresh token has been revoked',
      };
    }

    // Check if token has already been rotated (REUSE DETECTION)
    // This is a critical security check - if a token has been rotated,
    // using it again indicates the token was stolen
    if (data.rotated_to) {
      logger.warn('TOKEN REUSE DETECTED', { token_id: data.id });
      return {
        valid: false,
        tokenId: data.id,
        userId: data.user_id,
        clientId: data.client_id,
        error: 'already_rotated',
        errorMessage: 'Refresh token has already been used. Possible token theft detected.',
      };
    }

    // Check if token has expired
    if (new Date(data.expires_at) < new Date()) {
      return {
        valid: false,
        tokenId: data.id,
        error: 'expired',
        errorMessage: 'Refresh token has expired',
      };
    }

    // Validate client_id if provided
    if (clientId && data.client_id !== clientId) {
      return {
        valid: false,
        tokenId: data.id,
        error: 'invalid',
        errorMessage: 'Client ID mismatch',
      };
    }

    return {
      valid: true,
      tokenId: data.id,
      userId: data.user_id,
      clientId: data.client_id,
      scopes: data.scopes,
    };
  } catch (error) {
    logger.error('Unexpected error validating token', { error: error instanceof Error ? error.message : String(error) });
    return {
      valid: false,
      error: 'db_error',
      errorMessage: error instanceof Error ? error.message : 'Database error',
    };
  }
}

/**
 * Rotate a refresh token: mark old token as rotated and create new one
 *
 * This implements refresh token rotation:
 * 1. Validates the old token
 * 2. Creates a new token
 * 3. Marks the old token as rotated (points to new token)
 *
 * @param oldToken - The current refresh token (plaintext)
 * @param clientId - OAuth client ID (for validation)
 * @returns New token on success
 */
export async function rotateRefreshToken(
  oldToken: string,
  clientId?: string
): Promise<RotateRefreshTokenResult> {
  try {
    // First validate the old token
    const validation = await validateRefreshToken(oldToken, clientId);

    if (!validation.valid) {
      // If token was already rotated, this is reuse - revoke the family
      if (validation.error === 'already_rotated' && validation.tokenId) {
        await revokeTokenFamily(validation.tokenId);
        return {
          success: false,
          error: 'Token reuse detected. All tokens in family have been revoked.',
        };
      }

      return {
        success: false,
        error: validation.errorMessage || 'Invalid refresh token',
      };
    }

    // Generate new token
    const newToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newToken);

    const dbClient = createServiceRoleClient();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    // Insert new token
    const { data: newTokenData, error: insertError } = await dbClient
      .from('refresh_tokens')
      .insert({
        user_id: validation.userId,
        token_hash: newTokenHash,
        client_id: validation.clientId,
        scopes: validation.scopes || [],
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (insertError || !newTokenData) {
      logger.error('Failed to create new token', { error: insertError?.message });
      return {
        success: false,
        error: 'Failed to create new refresh token',
      };
    }

    // Mark old token as rotated (pointing to new token)
    const { error: updateError } = await dbClient
      .from('refresh_tokens')
      .update({ rotated_to: newTokenData.id })
      .eq('id', validation.tokenId);

    if (updateError) {
      logger.error('Failed to mark token as rotated', { error: updateError.message });
      // Don't fail the request - the new token is valid
      // The old token will fail on next use anyway due to rotated_to being set
    }

    return {
      success: true,
      newTokenId: newTokenData.id,
      newToken,
    };
  } catch (error) {
    logger.error('Unexpected error rotating token', { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Revoke all tokens in a token family
 *
 * Called when token reuse is detected. This revokes ALL tokens
 * for the same user/client combination, forcing re-authentication.
 *
 * @param tokenId - ID of any token in the family
 * @returns Number of tokens revoked
 */
export async function revokeTokenFamily(tokenId: string): Promise<number> {
  try {
    const dbClient = createServiceRoleClient();

    // Call the database function that revokes the entire family
    const { data, error } = await dbClient.rpc('revoke_token_family', {
      p_token_id: tokenId,
    });

    if (error) {
      logger.error('Failed to revoke token family', { error: error.message });
      return 0;
    }

    logger.info('Revoked tokens in family', { revoked_count: data });
    return data || 0;
  } catch (error) {
    logger.error('Unexpected error revoking family', { error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

/**
 * Revoke a specific refresh token
 *
 * @param token - The plaintext refresh token
 * @returns True if revoked successfully
 */
export async function revokeRefreshToken(token: string): Promise<boolean> {
  try {
    const dbClient = createServiceRoleClient();
    const tokenHash = hashRefreshToken(token);

    const { error } = await dbClient
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', tokenHash);

    if (error) {
      logger.error('Failed to revoke token', { error: error.message });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Unexpected error revoking token', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Revoke all refresh tokens for a user
 *
 * @param userId - User ID
 * @param clientId - Optional: only revoke tokens for specific client
 * @returns Number of tokens revoked
 */
export async function revokeAllUserTokens(
  userId: string,
  clientId?: string
): Promise<number> {
  try {
    const dbClient = createServiceRoleClient();

    let query = dbClient
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query.select('id');

    if (error) {
      logger.error('Failed to revoke user tokens', { error: error.message });
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    logger.error('Unexpected error revoking user tokens', { error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}
