// @canonical - Bingo uses this local OAuth implementation (NOT @beak/auth package)
/**
 * OAuth 2.1 Client for Bingo App
 * Handles authorization code flow with PKCE
 */

import { generatePKCE } from './pkce';

const PLATFORM_HUB_URL = process.env.NEXT_PUBLIC_PLATFORM_HUB_URL || 'http://localhost:3002';
const CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI!;

/**
 * Start OAuth 2.1 authorization code flow with PKCE
 * Generates PKCE parameters, stores code_verifier, and redirects to Platform Hub
 */
export async function startOAuthFlow(): Promise<void> {
  // Validate environment variables
  if (!PLATFORM_HUB_URL) {
    throw new Error('NEXT_PUBLIC_PLATFORM_HUB_URL is not configured');
  }
  if (!CLIENT_ID) {
    throw new Error('NEXT_PUBLIC_OAUTH_CLIENT_ID is not configured');
  }
  if (!REDIRECT_URI) {
    throw new Error('NEXT_PUBLIC_OAUTH_REDIRECT_URI is not configured');
  }

  // Generate PKCE parameters
  const { codeVerifier, codeChallenge } = await generatePKCE();

  // Generate CSRF state token (32 bytes = 43 chars base64url)
  const stateArray = new Uint8Array(32);
  crypto.getRandomValues(stateArray);
  const state = btoa(String.fromCharCode(...stateArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Store code_verifier and state in sessionStorage for callback
  // Use state-specific keys to prevent collisions in multi-tab scenarios
  // Using cross-app SSO prefix for consistency
  sessionStorage.setItem(`beak_pkce_verifier_${state}`, codeVerifier);
  sessionStorage.setItem(`beak_oauth_state_${state}`, state);

  // Build authorization URL with CSRF state parameter
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    response_type: 'code',
  });

  const authorizeUrl = `${PLATFORM_HUB_URL}/api/oauth/authorize?${params.toString()}`;

  // Redirect to Platform Hub OAuth authorization endpoint
  window.location.href = authorizeUrl;
}
