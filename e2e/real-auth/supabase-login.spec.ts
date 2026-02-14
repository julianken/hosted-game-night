/**
 * Real Supabase Login Tests
 *
 * Tests direct Supabase authentication (signInWithPassword) against local Supabase.
 * Verifies that the login API correctly:
 * - Authenticates with real Supabase (not E2E bypass)
 * - Returns RS256 JWTs that can be verified via JWKS
 * - Sets proper SSO cookies for cross-app authentication
 */

import { test, expect } from '../fixtures/real-auth';
import { createClient } from '@supabase/supabase-js';

const HUB_URL = 'http://localhost:3002';

test.describe('Real Supabase Login', () => {
  test('signInWithPassword returns valid session with RS256 JWT', async ({
    page,
    realTestUser,
  }) => {
    // Directly call Supabase signInWithPassword via the client library
    // to verify the local Supabase instance handles real auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: realTestUser.email,
      password: realTestUser.password,
    });

    // Verify successful authentication
    expect(error).toBeNull();
    expect(data.session).toBeTruthy();
    expect(data.session!.access_token).toBeTruthy();
    expect(data.session!.refresh_token).toBeTruthy();
    expect(data.user).toBeTruthy();
    expect(data.user!.email).toBe(realTestUser.email);

    // Verify the access token is a real JWT (3 dot-separated base64 parts)
    const tokenParts = data.session!.access_token.split('.');
    expect(tokenParts).toHaveLength(3);

    // Decode header to verify RS256 algorithm (Supabase's signing algorithm)
    const header = JSON.parse(Buffer.from(tokenParts[0], 'base64url').toString());
    expect(header.alg).toBe('RS256');

    // Decode payload to verify standard claims
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());
    expect(payload.sub).toBe(data.user!.id);
    expect(payload.email).toBe(realTestUser.email);
    expect(payload.role).toBe('authenticated');
    expect(payload.aud).toBe('authenticated');
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

    // Now verify the login works through the Platform Hub UI
    await page.goto(`${HUB_URL}/login`);

    // Wait for hydrated form
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10_000 });

    await page.fill('input[name="email"]', realTestUser.email);
    await page.fill('input[name="password"]', realTestUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard (real Supabase auth succeeded)
    await page.waitForURL(`${HUB_URL}/dashboard`, { timeout: 30_000 });

    // Verify SSO cookies were set
    const cookies = await page.context().cookies();
    const accessTokenCookie = cookies.find((c) => c.name === 'beak_access_token');
    const refreshTokenCookie = cookies.find((c) => c.name === 'beak_refresh_token');
    const userIdCookie = cookies.find((c) => c.name === 'beak_user_id');

    expect(accessTokenCookie).toBeTruthy();
    expect(refreshTokenCookie).toBeTruthy();
    expect(userIdCookie).toBeTruthy();

    // Access token cookie should contain a real JWT
    const cookieTokenParts = accessTokenCookie!.value.split('.');
    expect(cookieTokenParts).toHaveLength(3);
  });

  test('session refresh produces new access and refresh tokens', async ({
    realTestUser,
  }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Login to get initial tokens
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: realTestUser.email,
      password: realTestUser.password,
    });

    expect(loginError).toBeNull();
    expect(loginData.session).toBeTruthy();

    const originalAccessToken = loginData.session!.access_token;
    const originalRefreshToken = loginData.session!.refresh_token;

    // Use the refresh token to get new tokens
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: originalRefreshToken,
    });

    expect(refreshError).toBeNull();
    expect(refreshData.session).toBeTruthy();

    // New tokens should be different from originals (token rotation)
    expect(refreshData.session!.access_token).not.toBe(originalAccessToken);
    expect(refreshData.session!.refresh_token).not.toBe(originalRefreshToken);

    // New access token should be valid RS256 JWT
    const newTokenParts = refreshData.session!.access_token.split('.');
    expect(newTokenParts).toHaveLength(3);

    const header = JSON.parse(Buffer.from(newTokenParts[0], 'base64url').toString());
    expect(header.alg).toBe('RS256');

    // New token should have valid expiry in the future
    const payload = JSON.parse(Buffer.from(newTokenParts[1], 'base64url').toString());
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(payload.email).toBe(realTestUser.email);
  });
});
