/**
 * Token refresh utilities for proactive session management
 *
 * Enables automatic token refresh before expiry to prevent session
 * interruptions during gameplay. Runs in Edge Runtime (middleware).
 */

// Refresh tokens 5 minutes before expiry to prevent interruption
const REFRESH_BUFFER_SECONDS = 300;

/**
 * Check if a JWT token should be refreshed (within buffer of expiry)
 */
export function shouldRefreshToken(token: string): boolean {
  try {
    // JWT structure: header.payload.signature
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - now;
    return timeUntilExpiry > 0 && timeUntilExpiry <= REFRESH_BUFFER_SECONDS;
  } catch {
    // If we can't parse the token, don't try to refresh
    return false;
  }
}

/**
 * Check if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
  } catch {
    return true;
  }
}

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

/**
 * Refresh tokens using Platform Hub's OAuth token endpoint
 */
export async function refreshTokens(
  refreshToken: string,
  platformHubUrl: string
): Promise<TokenRefreshResult> {
  try {
    const response = await fetch(`${platformHubUrl}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { success: false, error: error.error || 'Token refresh failed' };
    }

    const data = await response.json();
    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error during refresh',
    };
  }
}
