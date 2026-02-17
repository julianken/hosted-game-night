/**
 * OAuth Audit Logging Library
 *
 * Provides type-safe functions for logging OAuth authorization events to the audit log.
 * Uses service role client to bypass RLS policies and ensure logs are tamper-proof.
 *
 * Security Considerations:
 * - Service role key must be kept server-side only (never expose to client)
 * - All writes go through application code (users cannot modify logs)
 * - Read access controlled by RLS policies (admin only)
 *
 * @module audit-log
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'lib-audit-log' });

/**
 * Action types for OAuth audit log events
 */
export type AuditAction =
  | 'authorize_success'  // User approved authorization request
  | 'authorize_deny'     // User denied authorization request
  | 'authorize_error'    // Error occurred during authorization flow
  | 'token_exchange'     // Authorization code exchanged for access token
  | 'token_refresh'      // Refresh token used to obtain new access token
  | 'token_revoke';      // Access or refresh token revoked

/**
 * Structure of an audit log entry
 */
export interface AuditLogEntry {
  user_id?: string;           // UUID of authenticated user (optional for errors)
  client_id: string;          // OAuth client identifier
  action: AuditAction;        // Type of event being logged
  ip_address?: string;        // Client IP address
  user_agent?: string;        // Client user agent string
  metadata?: Record<string, unknown>;  // Additional context (scopes, errors, etc.)
}

/**
 * Validates that all required environment variables for audit logging are set.
 * @throws Error if required environment variables are missing
 */
function validateAuditLogEnv(): { url: string; serviceRoleKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL\n' +
      'Expected format: https://your-project-ref.supabase.co\n' +
      'Please add this variable to your .env.local file.'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY\n' +
      'This is required for audit logging to bypass RLS policies.\n' +
      'CRITICAL: This key must be kept server-side only. Never expose to client code.\n' +
      'Please add this variable to your .env.local file.'
    );
  }

  return { url, serviceRoleKey };
}

/**
 * Create a Supabase client with service role privileges.
 * This client bypasses RLS policies and should only be used server-side.
 *
 * @returns Supabase client with service role privileges
 */
function createServiceRoleClient() {
  const { url, serviceRoleKey } = validateAuditLogEnv();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Write an audit log entry to the database.
 * This is the core logging function that all other helpers use.
 *
 * @param entry - Audit log entry to write
 * @returns Promise resolving to the inserted record or null on error
 *
 * @example
 * ```typescript
 * await logAuditEvent({
 *   user_id: 'user-uuid',
 *   client_id: 'client-id',
 *   action: 'authorize_success',
 *   ip_address: '192.168.1.1',
 *   user_agent: 'Mozilla/5.0...',
 *   metadata: { scopes: ['openid', 'email'] }
 * });
 * ```
 */
export async function logAuditEvent(
  entry: AuditLogEntry
): Promise<{ id: string } | null> {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('oauth_audit_log')
      .insert({
        user_id: entry.user_id ?? null,
        client_id: entry.client_id,
        action: entry.action,
        ip_address: entry.ip_address ?? null,
        user_agent: entry.user_agent ?? null,
        metadata: entry.metadata ?? {},
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to write audit log entry', { error: error.message });
      return null;
    }

    return data;
  } catch (err) {
    logger.error('Exception writing audit log entry', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/**
 * Log a successful authorization event.
 *
 * @param userId - UUID of the user who approved the authorization
 * @param clientId - OAuth client identifier
 * @param authorizationId - Authorization request ID
 * @param scopes - Array of approved scopes
 * @param ipAddress - Client IP address (optional)
 * @param userAgent - Client user agent (optional)
 * @returns Promise resolving to the inserted record or null on error
 *
 * @example
 * ```typescript
 * await logAuthorizationSuccess(
 *   'user-uuid',
 *   'client-id',
 *   'authorization-id',
 *   ['openid', 'email'],
 *   '192.168.1.1',
 *   'Mozilla/5.0...'
 * );
 * ```
 */
export async function logAuthorizationSuccess(
  userId: string,
  clientId: string,
  authorizationId: string,
  scopes: string[],
  ipAddress?: string,
  userAgent?: string
): Promise<{ id: string } | null> {
  return logAuditEvent({
    user_id: userId,
    client_id: clientId,
    action: 'authorize_success',
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: {
      authorization_id: authorizationId,
      scopes,
    },
  });
}

/**
 * Log an authorization denial event.
 *
 * @param userId - UUID of the user who denied the authorization
 * @param clientId - OAuth client identifier
 * @param authorizationId - Authorization request ID
 * @param reason - Optional reason for denial
 * @param ipAddress - Client IP address (optional)
 * @param userAgent - Client user agent (optional)
 * @returns Promise resolving to the inserted record or null on error
 *
 * @example
 * ```typescript
 * await logAuthorizationDenial(
 *   'user-uuid',
 *   'client-id',
 *   'authorization-id',
 *   'user_cancelled',
 *   '192.168.1.1',
 *   'Mozilla/5.0...'
 * );
 * ```
 */
export async function logAuthorizationDenial(
  userId: string,
  clientId: string,
  authorizationId: string,
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ id: string } | null> {
  return logAuditEvent({
    user_id: userId,
    client_id: clientId,
    action: 'authorize_deny',
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: {
      authorization_id: authorizationId,
      reason: reason ?? 'user_denied',
    },
  });
}

/**
 * Log an authorization error event.
 *
 * @param clientId - OAuth client identifier
 * @param authorizationId - Authorization request ID (if available)
 * @param errorCode - Error code or type
 * @param errorMessage - Human-readable error message
 * @param userId - UUID of the user (optional, may not be available for errors)
 * @param ipAddress - Client IP address (optional)
 * @param userAgent - Client user agent (optional)
 * @returns Promise resolving to the inserted record or null on error
 *
 * @example
 * ```typescript
 * await logAuthorizationError(
 *   'client-id',
 *   'authorization-id',
 *   'invalid_request',
 *   'Missing required parameter: redirect_uri',
 *   undefined, // No user_id for this error
 *   '192.168.1.1',
 *   'Mozilla/5.0...'
 * );
 * ```
 */
export async function logAuthorizationError(
  clientId: string,
  authorizationId: string | undefined,
  errorCode: string,
  errorMessage: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ id: string } | null> {
  return logAuditEvent({
    user_id: userId,
    client_id: clientId,
    action: 'authorize_error',
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: {
      authorization_id: authorizationId,
      error_code: errorCode,
      error_message: errorMessage,
    },
  });
}

/**
 * Log a token exchange event (authorization code for access token).
 *
 * @param userId - UUID of the user who owns the token
 * @param clientId - OAuth client identifier
 * @param authorizationId - Authorization request ID
 * @param tokenType - Type of token issued (e.g., 'bearer')
 * @param ipAddress - Client IP address (optional)
 * @param userAgent - Client user agent (optional)
 * @returns Promise resolving to the inserted record or null on error
 *
 * @example
 * ```typescript
 * await logTokenExchange(
 *   'user-uuid',
 *   'client-id',
 *   'authorization-id',
 *   'bearer',
 *   '192.168.1.1',
 *   'Mozilla/5.0...'
 * );
 * ```
 */
export async function logTokenExchange(
  userId: string,
  clientId: string,
  authorizationId: string,
  tokenType: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ id: string } | null> {
  return logAuditEvent({
    user_id: userId,
    client_id: clientId,
    action: 'token_exchange',
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: {
      authorization_id: authorizationId,
      token_type: tokenType,
    },
  });
}

/**
 * Log a token refresh event.
 *
 * @param userId - UUID of the user who owns the token
 * @param clientId - OAuth client identifier
 * @param ipAddress - Client IP address (optional)
 * @param userAgent - Client user agent (optional)
 * @returns Promise resolving to the inserted record or null on error
 *
 * @example
 * ```typescript
 * await logTokenRefresh(
 *   'user-uuid',
 *   'client-id',
 *   '192.168.1.1',
 *   'Mozilla/5.0...'
 * );
 * ```
 */
export async function logTokenRefresh(
  userId: string,
  clientId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ id: string } | null> {
  return logAuditEvent({
    user_id: userId,
    client_id: clientId,
    action: 'token_refresh',
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: {},
  });
}

/**
 * Log a token revocation event.
 *
 * @param userId - UUID of the user who owns the token
 * @param clientId - OAuth client identifier
 * @param tokenType - Type of token revoked ('access' or 'refresh')
 * @param reason - Optional reason for revocation
 * @param ipAddress - Client IP address (optional)
 * @param userAgent - Client user agent (optional)
 * @returns Promise resolving to the inserted record or null on error
 *
 * @example
 * ```typescript
 * await logTokenRevoke(
 *   'user-uuid',
 *   'client-id',
 *   'access',
 *   'user_logout',
 *   '192.168.1.1',
 *   'Mozilla/5.0...'
 * );
 * ```
 */
export async function logTokenRevoke(
  userId: string,
  clientId: string,
  tokenType: 'access' | 'refresh',
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ id: string } | null> {
  return logAuditEvent({
    user_id: userId,
    client_id: clientId,
    action: 'token_revoke',
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: {
      token_type: tokenType,
      reason: reason ?? 'not_specified',
    },
  });
}
