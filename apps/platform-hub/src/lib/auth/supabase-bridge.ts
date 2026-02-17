/**
 * OAuth to Supabase Auth Bridge
 *
 * Converts OAuth 2.1 access tokens (issued by Supabase OAuth server)
 * into full Supabase auth sessions with synchronized user profiles.
 *
 * Flow:
 * 1. Extract user info from OAuth JWT access token
 * 2. Create/update Supabase auth session using setSession()
 * 3. Synchronize user profile data to public.profiles table
 * 4. Return session with 1-hour expiration matching OAuth token TTL
 *
 * @module supabase-bridge
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@joolie-boolie/error-tracking/server-logger';

const logger = createLogger({ service: 'lib-supabase-bridge' });

/**
 * User information extracted from OAuth JWT token
 */
export interface OAuthUserInfo {
  sub: string; // User ID (UUID)
  email: string;
  email_verified?: boolean;
  aud: string; // Audience
  role: string; // User role
  iat?: number; // Issued at
  exp?: number; // Expiration time
}

/**
 * Result of creating a Supabase session from OAuth token
 */
export interface CreateSessionResult {
  success: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    expires_in: number;
    user: {
      id: string;
      email: string;
      role: string;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

/**
 * Options for profile synchronization
 */
export interface ProfileSyncOptions {
  facility_name?: string;
  default_game_title?: string;
  logo_url?: string;
}

/**
 * Error codes for bridge operations
 */
export enum BridgeErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  SESSION_CREATE_FAILED = 'SESSION_CREATE_FAILED',
  PROFILE_SYNC_FAILED = 'PROFILE_SYNC_FAILED',
  MISSING_ENV_VARS = 'MISSING_ENV_VARS',
}

/**
 * Decodes a JWT token without verification (Supabase verifies on setSession)
 * This is safe because setSession() will validate the token signature
 */
function decodeJWT(token: string): OAuthUserInfo | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode base64url payload
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    logger.error('Failed to decode JWT', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Validates that required environment variables are present
 */
function validateEnvironment(): { url: string; serviceRoleKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      `Missing required environment variables:\n` +
        `${!url ? '- NEXT_PUBLIC_SUPABASE_URL\n' : ''}` +
        `${!serviceRoleKey ? '- SUPABASE_SERVICE_ROLE_KEY\n' : ''}` +
        `These are required for OAuth bridge operations.`
    );
  }

  return { url, serviceRoleKey };
}

/**
 * Synchronizes user profile data to public.profiles table
 * Creates profile if it doesn't exist, updates if it does
 */
async function syncUserProfile(
  userId: string,
  email: string,
  options?: ProfileSyncOptions
): Promise<void> {
  const { url, serviceRoleKey } = validateEnvironment();
  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Check if profile exists
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = not found, which is OK
    throw new Error(`Failed to check profile: ${fetchError.message}`);
  }

  const profileData = {
    id: userId,
    facility_name: options?.facility_name || null,
    default_game_title: options?.default_game_title || null,
    logo_url: options?.logo_url || null,
    updated_at: new Date().toISOString(),
  };

  if (existingProfile) {
    // Update existing profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }
  } else {
    // Create new profile
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        ...profileData,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      throw new Error(`Failed to create profile: ${insertError.message}`);
    }
  }
}

/**
 * Creates a Supabase auth session from an OAuth access token
 *
 * This function bridges the gap between Supabase's OAuth 2.1 server and
 * Supabase's auth session system. When a client app exchanges an OAuth
 * authorization code for tokens, those tokens can be used to establish
 * a full Supabase session.
 *
 * @param accessToken - OAuth access token (JWT) from Supabase OAuth server
 * @param refreshToken - OAuth refresh token (optional, recommended)
 * @param profileOptions - Optional profile data to sync
 * @returns CreateSessionResult with session data or error
 *
 * @example
 * ```typescript
 * // After OAuth callback in client app
 * const result = await createSupabaseSession(
 *   oauthTokens.access_token,
 *   oauthTokens.refresh_token
 * );
 *
 * if (result.success) {
 *   // Store session in cookies
 *   cookies().set('session', JSON.stringify(result.session));
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function createSupabaseSession(
  accessToken: string,
  refreshToken?: string,
  profileOptions?: ProfileSyncOptions
): Promise<CreateSessionResult> {
  try {
    // Validate environment
    const { url, serviceRoleKey } = validateEnvironment();

    // Decode JWT to extract user info (no verification - Supabase will verify)
    const userInfo = decodeJWT(accessToken);

    if (!userInfo || !userInfo.sub || !userInfo.email) {
      return {
        success: false,
        error: {
          code: BridgeErrorCode.INVALID_TOKEN,
          message: 'Invalid access token format',
          details: 'Token must be a valid JWT with sub and email claims',
        },
      };
    }

    // Check if token is expired
    if (userInfo.exp && userInfo.exp < Date.now() / 1000) {
      return {
        success: false,
        error: {
          code: BridgeErrorCode.TOKEN_EXPIRED,
          message: 'Access token has expired',
          details: `Token expired at ${new Date(userInfo.exp * 1000).toISOString()}`,
        },
      };
    }

    // Create Supabase client
    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Set session using OAuth tokens
    // Supabase will verify the token signature and create a session
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });

    if (sessionError) {
      return {
        success: false,
        error: {
          code: BridgeErrorCode.SESSION_CREATE_FAILED,
          message: 'Failed to create Supabase session',
          details: sessionError.message,
        },
      };
    }

    if (!sessionData?.session || !sessionData?.user) {
      return {
        success: false,
        error: {
          code: BridgeErrorCode.SESSION_CREATE_FAILED,
          message: 'Session created but no session data returned',
          details: 'Unexpected response from Supabase auth API',
        },
      };
    }

    // Synchronize user profile
    try {
      await syncUserProfile(sessionData.user.id, sessionData.user.email!, profileOptions);
    } catch (profileError) {
      // Log error but don't fail the session creation
      logger.error('Profile sync failed', { error: profileError instanceof Error ? profileError.message : String(profileError) });
      // Could add telemetry here
    }

    // Return session data
    return {
      success: true,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at || 0,
        expires_in: sessionData.session.expires_in || 3600,
        user: {
          id: sessionData.user.id,
          email: sessionData.user.email || '',
          role: sessionData.user.role || 'authenticated',
        },
      },
    };
  } catch (error) {
    // Catch any unexpected errors
    return {
      success: false,
      error: {
        code: BridgeErrorCode.SESSION_CREATE_FAILED,
        message: 'Unexpected error creating session',
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Refreshes an existing Supabase session using a refresh token
 *
 * When an OAuth session expires (after 1 hour), this function can be used
 * to obtain new access and refresh tokens without requiring re-authentication.
 *
 * @param refreshToken - Current refresh token
 * @returns CreateSessionResult with new session data or error
 *
 * @example
 * ```typescript
 * const result = await refreshSupabaseSession(currentRefreshToken);
 * if (result.success) {
 *   // Update stored session
 *   cookies().set('session', JSON.stringify(result.session));
 * }
 * ```
 */
export async function refreshSupabaseSession(
  refreshToken: string
): Promise<CreateSessionResult> {
  try {
    const { url, serviceRoleKey } = validateEnvironment();

    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Refresh session
    const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (refreshError) {
      return {
        success: false,
        error: {
          code: BridgeErrorCode.SESSION_CREATE_FAILED,
          message: 'Failed to refresh session',
          details: refreshError.message,
        },
      };
    }

    if (!sessionData?.session || !sessionData?.user) {
      return {
        success: false,
        error: {
          code: BridgeErrorCode.SESSION_CREATE_FAILED,
          message: 'Session refreshed but no session data returned',
          details: 'Unexpected response from Supabase auth API',
        },
      };
    }

    return {
      success: true,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at || 0,
        expires_in: sessionData.session.expires_in || 3600,
        user: {
          id: sessionData.user.id,
          email: sessionData.user.email || '',
          role: sessionData.user.role || 'authenticated',
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: BridgeErrorCode.SESSION_CREATE_FAILED,
        message: 'Unexpected error refreshing session',
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Revokes a Supabase session, invalidating both the access and refresh tokens
 *
 * This should be called when:
 * - User logs out
 * - OAuth authorization is revoked
 * - Security event requires session invalidation
 *
 * @param accessToken - Current access token to revoke
 * @returns Boolean indicating success
 *
 * @example
 * ```typescript
 * const revoked = await revokeSupabaseSession(currentAccessToken);
 * if (revoked) {
 *   // Clear stored session
 *   cookies().delete('session');
 * }
 * ```
 */
export async function revokeSupabaseSession(accessToken: string): Promise<boolean> {
  try {
    const { url, serviceRoleKey } = validateEnvironment();

    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Set the session first so we can sign out
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '',
    });

    // Sign out to revoke tokens
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Failed to revoke session', { error: error.message });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Unexpected error revoking session', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
