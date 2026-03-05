/**
 * Cross-App SSO Tests (Real Credentials)
 *
 * Tests that authentication propagates correctly across all 3 apps:
 * - Platform Hub (login origin)
 * - Bingo (middleware verifies token, serves /play)
 * - Trivia (middleware verifies token, serves /play)
 *
 * The Bingo/Trivia middleware verifies tokens using a fallback chain:
 * 1. SESSION_TOKEN_SECRET (HS256) — tokens from OAuth flow
 * 2. Supabase JWKS (RS256) — tokens from direct Supabase login
 *
 * Since E2E_TESTING is NOT set, the middleware skips the E2E secret entirely,
 * exercising the real verification paths.
 */

import { test, expect } from '../fixtures/real-auth';

const HUB_URL = 'http://localhost:3002';
const BINGO_URL = 'http://localhost:3000';
const TRIVIA_URL = 'http://localhost:3001';

test.describe('Cross-App SSO', () => {
  test('Hub → Bingo SSO: login via Hub, access Bingo /play without redirect', async ({
    authenticatedBingoPage,
  }) => {
    // The authenticatedBingoPage fixture already:
    // 1. Logged in via Platform Hub (real Supabase)
    // 2. Copied SSO cookies to Bingo domain
    // 3. Navigated to Bingo /play

    // If we're on /play (not redirected to / or /login), middleware accepted the token
    const currentUrl = new URL(authenticatedBingoPage.url());
    expect(currentUrl.pathname).toBe('/play');
    expect(currentUrl.hostname).toBe('localhost');
    expect(currentUrl.port).toBe('3000');

    // Verify the page rendered game content (not an error or login page)
    // The play page should have a <main> element with game content
    await expect(
      authenticatedBingoPage.locator('main')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Hub → Trivia SSO: login via Hub, access Trivia /play without redirect', async ({
    authenticatedTriviaPage,
  }) => {
    // Same pattern: authenticatedTriviaPage fixture handles login + navigation
    const currentUrl = new URL(authenticatedTriviaPage.url());
    expect(currentUrl.pathname).toBe('/play');
    expect(currentUrl.hostname).toBe('localhost');
    expect(currentUrl.port).toBe('3001');

    // Verify the page rendered game content
    await expect(
      authenticatedTriviaPage.locator('main')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('session persistence: page refresh maintains auth across all 3 apps', async ({
    page,
    realTestUser,
  }) => {
    // Step 1: Login via Platform Hub
    await page.goto(`${HUB_URL}/login`);
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 15_000 });

    await page.fill('input[name="email"]', realTestUser.email);
    await page.fill('input[name="password"]', realTestUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${HUB_URL}/dashboard`, { timeout: 30_000 });

    // Verify SSO cookies exist
    const hubCookies = await page.context().cookies();
    const accessToken = hubCookies.find((c) => c.name === 'jb_access_token');
    expect(accessToken).toBeTruthy();

    // Step 2: Refresh the Hub page — should stay on dashboard (not redirect to login)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on dashboard after refresh
    expect(page.url()).toContain('/dashboard');

    // Step 3: Copy cookies and verify Bingo accepts them after "refresh" (new navigation)
    const ssoCookies = hubCookies.filter((c) =>
      ['jb_access_token', 'jb_refresh_token', 'jb_user_id'].includes(c.name)
    );

    // Add cookies for Bingo domain
    await page.context().addCookies(
      ssoCookies.map((c) => ({
        name: c.name,
        value: c.value,
        url: BINGO_URL,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
        expires: c.expires,
      }))
    );

    // Navigate to Bingo /play
    await page.goto(`${BINGO_URL}/play`, { timeout: 30_000 });

    // Should be on /play (not redirected to home/login)
    const bingoUrl = new URL(page.url());
    expect(bingoUrl.pathname).toBe('/play');
    expect(bingoUrl.port).toBe('3000');

    // Step 4: Add cookies for Trivia domain and verify
    await page.context().addCookies(
      ssoCookies.map((c) => ({
        name: c.name,
        value: c.value,
        url: TRIVIA_URL,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
        expires: c.expires,
      }))
    );

    await page.goto(`${TRIVIA_URL}/play`, { timeout: 30_000 });

    // Should be on /play (not redirected)
    const triviaUrl = new URL(page.url());
    expect(triviaUrl.pathname).toBe('/play');
    expect(triviaUrl.port).toBe('3001');
  });
});
