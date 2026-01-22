/**
 * Token Rotation Module
 *
 * Implements refresh token rotation with security measures:
 * - Issues new refresh token on every refresh request
 * - Detects refresh token reuse (security violation)
 * - Revokes all tokens if reuse detected
 * - Logs rotation events for audit trail
 *
 * Note: Supabase OAuth 2.1 server handles actual token rotation.
 * This module provides client-side logic and security monitoring.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Token refresh response from Supabase
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Token refresh error types
 */
export enum TokenRefreshError {
  INVALID_GRANT = 'invalid_grant',
  TOKEN_REUSE_DETECTED = 'token_reuse_detected',
  EXPIRED_TOKEN = 'expired_token',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
  success: boolean;
  tokens?: TokenResponse;
  error?: TokenRefreshError;
  message?: string;
  shouldRevokeAll?: boolean;
}

/**
 * Token rotation event log entry
 */
export interface TokenRotationEvent {
  timestamp: string;
  event_type: 'refresh_success' | 'refresh_failure' | 'reuse_detected' | 'revoke_all';
  client_id?: string;
  user_id?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logger for token rotation events
 * In production, this should integrate with your logging service
 */
class TokenRotationLogger {
  private events: TokenRotationEvent[] = [];

  /**
   * Log a token rotation event
   */
  log(event: Omit<TokenRotationEvent, 'timestamp'>): void {
    const logEntry: TokenRotationEvent = {
      timestamp: new Date().toISOString(),
      ...event,
    };

    this.events.push(logEntry);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Token Rotation]', logEntry);
    }

    // In production, send to logging service (e.g., Supabase, Sentry)
    // TODO: Implement production logging integration
  }

  /**
   * Get recent events for debugging
   */
  getRecentEvents(count: number = 10): TokenRotationEvent[] {
    return this.events.slice(-count);
  }
}

export const tokenRotationLogger = new TokenRotationLogger();

/**
 * Refresh access token using refresh token
 *
 * This function:
 * 1. Calls Supabase token endpoint with refresh_token grant
 * 2. Supabase automatically rotates the refresh token (issues new one)
 * 3. Returns new access_token and refresh_token
 * 4. Detects token reuse and logs security events
 *
 * @param refreshToken - Current refresh token
 * @param clientId - OAuth client ID (optional, for logging)
 * @returns Token refresh result with new tokens or error
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId?: string
): Promise<TokenRefreshResult> {
  if (!refreshToken) {
    tokenRotationLogger.log({
      event_type: 'refresh_failure',
      client_id: clientId,
      error: 'Missing refresh token',
    });

    return {
      success: false,
      error: TokenRefreshError.INVALID_GRANT,
      message: 'Refresh token is required',
    };
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create Supabase client for token refresh
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Call Supabase token refresh
    // Supabase automatically rotates the refresh token
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      // Check for token reuse (security violation)
      const isTokenReuse =
        error.message?.includes('reuse') ||
        error.message?.includes('already used') ||
        error.message?.includes('invalid_grant');

      if (isTokenReuse) {
        tokenRotationLogger.log({
          event_type: 'reuse_detected',
          client_id: clientId,
          error: error.message,
          metadata: { shouldRevokeAll: true },
        });

        return {
          success: false,
          error: TokenRefreshError.TOKEN_REUSE_DETECTED,
          message: 'Refresh token reuse detected. All tokens will be revoked.',
          shouldRevokeAll: true,
        };
      }

      // Handle expired token
      if (error.message?.includes('expired')) {
        tokenRotationLogger.log({
          event_type: 'refresh_failure',
          client_id: clientId,
          error: 'Token expired',
        });

        return {
          success: false,
          error: TokenRefreshError.EXPIRED_TOKEN,
          message: 'Refresh token has expired',
        };
      }

      // Handle other errors
      tokenRotationLogger.log({
        event_type: 'refresh_failure',
        client_id: clientId,
        error: error.message,
      });

      return {
        success: false,
        error: TokenRefreshError.INVALID_GRANT,
        message: error.message || 'Failed to refresh token',
      };
    }

    if (!data.session) {
      tokenRotationLogger.log({
        event_type: 'refresh_failure',
        client_id: clientId,
        error: 'No session returned',
      });

      return {
        success: false,
        error: TokenRefreshError.UNKNOWN_ERROR,
        message: 'No session returned from token refresh',
      };
    }

    // Extract tokens from session
    const tokens: TokenResponse = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in || 3600,
      token_type: 'Bearer',
    };

    // Log successful rotation
    tokenRotationLogger.log({
      event_type: 'refresh_success',
      client_id: clientId,
      user_id: data.session.user?.id,
      metadata: {
        expires_in: tokens.expires_in,
      },
    });

    return {
      success: true,
      tokens,
    };
  } catch (error) {
    tokenRotationLogger.log({
      event_type: 'refresh_failure',
      client_id: clientId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: TokenRefreshError.NETWORK_ERROR,
      message: 'Network error during token refresh',
    };
  }
}

/**
 * Revoke all tokens for a user
 *
 * Called when token reuse is detected (security violation)
 * Logs out user from all sessions
 *
 * @param userId - User ID to revoke tokens for
 * @param reason - Reason for revocation (for logging)
 */
export async function revokeAllTokens(
  userId: string,
  reason: string = 'Token reuse detected'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration for token revocation');
    }

    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Sign out user from all sessions
    // This invalidates all access and refresh tokens
    const { error } = await supabase.auth.admin.signOut(userId);

    if (error) {
      tokenRotationLogger.log({
        event_type: 'revoke_all',
        user_id: userId,
        error: error.message,
        metadata: { reason },
      });

      return {
        success: false,
        error: error.message,
      };
    }

    tokenRotationLogger.log({
      event_type: 'revoke_all',
      user_id: userId,
      metadata: { reason, success: true },
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    tokenRotationLogger.log({
      event_type: 'revoke_all',
      user_id: userId,
      error: errorMessage,
      metadata: { reason },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if a token is expired or about to expire
 *
 * @param expiresAt - Token expiration timestamp (seconds since epoch)
 * @param bufferSeconds - Refresh buffer in seconds (default: 300 = 5 minutes)
 * @returns True if token should be refreshed
 */
export function shouldRefreshToken(
  expiresAt: number,
  bufferSeconds: number = 300
): boolean {
  const now = Math.floor(Date.now() / 1000);
  return expiresAt - now <= bufferSeconds;
}

/**
 * Get token expiration timestamp from JWT
 *
 * @param token - JWT access token
 * @returns Expiration timestamp (seconds since epoch) or null if invalid
 */
export function getTokenExpiration(token: string): number | null {
  try {
    // Decode JWT payload (base64url)
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}
