/**
 * OAuth 2.1 Flow Tests (Real Credentials)
 *
 * Tests the complete OAuth authorization code flow against local Supabase:
 * - Authorization code grant with PKCE
 * - Token exchange producing HS256 JWTs signed with SESSION_TOKEN_SECRET
 * - Refresh token rotation with old-token invalidation
 *
 * These tests use the Platform Hub API directly (not browser UI) to isolate
 * the OAuth server logic from the client-side callback handler.
 */

import { test, expect } from '../fixtures/real-auth';
import * as crypto from 'crypto';

const HUB_URL = 'http://localhost:3002';

// Bingo client ID from migration 20260123000001_create_oauth_tables.sql
const BINGO_CLIENT_ID = '0d87a03a-d90a-4ccc-a46b-85fdd8d53c21';
const BINGO_REDIRECT_URI = 'http://localhost:3000/auth/callback';

/**
 * Generate PKCE code_verifier and code_challenge pair.
 */
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

test.describe('OAuth 2.1 Authorization Code Flow', () => {
  test('full OAuth flow: login → authorize → code → token exchange → HS256 JWT', async ({
    page,
    realTestUser,
  }) => {
    // =========================================================================
    // Step 1: Login via Platform Hub to establish Supabase session
    // =========================================================================
    await page.goto(`${HUB_URL}/login`);
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 15_000 });

    await page.fill('input[name="email"]', realTestUser.email);
    await page.fill('input[name="password"]', realTestUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${HUB_URL}/dashboard`, { timeout: 30_000 });

    // =========================================================================
    // Step 2: Initiate OAuth authorization request
    // =========================================================================
    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = crypto.randomBytes(16).toString('hex');

    const authorizeUrl = new URL(`${HUB_URL}/api/oauth/authorize`);
    authorizeUrl.searchParams.set('client_id', BINGO_CLIENT_ID);
    authorizeUrl.searchParams.set('redirect_uri', BINGO_REDIRECT_URI);
    authorizeUrl.searchParams.set('scope', 'openid');
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl.searchParams.set('response_type', 'code');

    // Navigate to authorize endpoint — since Bingo is a first-party client,
    // it should auto-approve and redirect to the callback with ?code=...&state=...
    await page.goto(authorizeUrl.toString(), {
      waitUntil: 'load',
      timeout: 30_000,
    });

    // The page should have redirected to bingo's auth/callback with code and state
    const finalUrl = new URL(page.url());
    expect(finalUrl.pathname).toBe('/auth/callback');
    expect(finalUrl.searchParams.get('state')).toBe(state);

    const authCode = finalUrl.searchParams.get('code');
    expect(authCode).toBeTruthy();
    expect(authCode!.length).toBeGreaterThan(10); // Real crypto code, not stub

    // =========================================================================
    // Step 3: Exchange authorization code for tokens
    // =========================================================================
    const tokenResponse = await fetch(`${HUB_URL}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: BINGO_CLIENT_ID,
        redirect_uri: BINGO_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    expect(tokenResponse.status).toBe(200);
    const tokenData = await tokenResponse.json();

    // Verify OAuth 2.1 token response format
    expect(tokenData.access_token).toBeTruthy();
    expect(tokenData.token_type).toBe('Bearer');
    expect(tokenData.expires_in).toBe(3600);
    expect(tokenData.refresh_token).toBeTruthy();

    // =========================================================================
    // Step 4: Verify the access token is an HS256 JWT from Platform Hub
    // =========================================================================
    const tokenParts = tokenData.access_token.split('.');
    expect(tokenParts).toHaveLength(3);

    // Decode header — should be HS256 (signed with SESSION_TOKEN_SECRET)
    const header = JSON.parse(Buffer.from(tokenParts[0], 'base64url').toString());
    expect(header.alg).toBe('HS256');

    // Decode payload — should have beak-gaming-platform issuer
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());
    expect(payload.iss).toBe('beak-gaming-platform');
    expect(payload.role).toBe('authenticated');
    expect(payload.aud).toBe('authenticated');
    expect(payload.email).toBe(realTestUser.email);
    expect(payload.sub).toBeTruthy(); // Real user ID from Supabase
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

    // =========================================================================
    // Step 5: Verify the code cannot be reused (one-time use)
    // =========================================================================
    const reuseResponse = await fetch(`${HUB_URL}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: BINGO_CLIENT_ID,
        redirect_uri: BINGO_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    expect(reuseResponse.status).toBe(400);
    const reuseData = await reuseResponse.json();
    expect(reuseData.error).toBe('invalid_grant');
  });

  test('OAuth token refresh: rotation produces new tokens, old token invalidated', async ({
    page,
    realTestUser,
  }) => {
    // Login and get tokens via OAuth flow
    await page.goto(`${HUB_URL}/login`);
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 15_000 });

    await page.fill('input[name="email"]', realTestUser.email);
    await page.fill('input[name="password"]', realTestUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${HUB_URL}/dashboard`, { timeout: 30_000 });

    // Get authorization code
    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = crypto.randomBytes(16).toString('hex');

    const authorizeUrl = new URL(`${HUB_URL}/api/oauth/authorize`);
    authorizeUrl.searchParams.set('client_id', BINGO_CLIENT_ID);
    authorizeUrl.searchParams.set('redirect_uri', BINGO_REDIRECT_URI);
    authorizeUrl.searchParams.set('scope', 'openid');
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl.searchParams.set('response_type', 'code');

    await page.goto(authorizeUrl.toString(), { waitUntil: 'load', timeout: 30_000 });

    const callbackUrl = new URL(page.url());
    const authCode = callbackUrl.searchParams.get('code');
    expect(authCode).toBeTruthy();

    // Exchange code for initial tokens
    const tokenResponse = await fetch(`${HUB_URL}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: BINGO_CLIENT_ID,
        redirect_uri: BINGO_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    expect(tokenResponse.status).toBe(200);
    const initialTokens = await tokenResponse.json();
    const originalRefreshToken = initialTokens.refresh_token;

    // =========================================================================
    // Refresh the token — should produce new access + refresh tokens
    // =========================================================================
    const refreshResponse = await fetch(`${HUB_URL}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: originalRefreshToken,
        client_id: BINGO_CLIENT_ID,
      }),
    });

    expect(refreshResponse.status).toBe(200);
    const refreshedTokens = await refreshResponse.json();

    // New tokens should be different (rotation)
    expect(refreshedTokens.access_token).not.toBe(initialTokens.access_token);
    expect(refreshedTokens.refresh_token).not.toBe(originalRefreshToken);

    // New access token should be valid HS256 JWT
    const newParts = refreshedTokens.access_token.split('.');
    expect(newParts).toHaveLength(3);
    const newHeader = JSON.parse(Buffer.from(newParts[0], 'base64url').toString());
    expect(newHeader.alg).toBe('HS256');

    const newPayload = JSON.parse(Buffer.from(newParts[1], 'base64url').toString());
    expect(newPayload.iss).toBe('beak-gaming-platform');
    expect(newPayload.email).toBe(realTestUser.email);

    // =========================================================================
    // Attempt to reuse the OLD refresh token — should be rejected
    // (refresh token rotation with reuse detection)
    // =========================================================================
    const reuseResponse = await fetch(`${HUB_URL}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: originalRefreshToken,
        client_id: BINGO_CLIENT_ID,
      }),
    });

    expect(reuseResponse.status).toBe(400);
    const reuseData = await reuseResponse.json();
    expect(reuseData.error).toBe('invalid_grant');
  });
});
