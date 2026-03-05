/**
 * Real-Auth E2E Test Fixtures
 *
 * Provides authenticated page contexts for tests running against local Supabase
 * WITHOUT the E2E_TESTING bypass. These fixtures exercise real auth paths:
 *
 * - Supabase signInWithPassword (real RS256 JWTs)
 * - Platform Hub login API (sets jb_* SSO cookies)
 * - Cross-app cookie propagation (Bingo/Trivia middleware verification)
 *
 * Mirrors the structure of e2e/fixtures/auth.ts but without E2E assumptions.
 */

import { test as base, expect as playwrightExpect, type Page } from '@playwright/test';

// Real-auth uses fixed ports (not worktree-aware — always runs from main repo)
const HUB_URL = 'http://localhost:3002';
const BINGO_URL = 'http://localhost:3000';
const TRIVIA_URL = 'http://localhost:3001';

// Longer timeouts for real Supabase calls (no bypass)
const AUTH_TIMEOUT_MS = 30_000;

export interface RealAuthTestUser {
  email: string;
  password: string;
}

export interface RealAuthFixtures {
  /** Credentials for the real-auth test user (seeded in local Supabase) */
  realTestUser: RealAuthTestUser;

  /** Page authenticated via Platform Hub login (has jb_* cookies for Hub) */
  authenticatedHubPage: Page;

  /** Page authenticated and navigated to Bingo /play */
  authenticatedBingoPage: Page;

  /** Page authenticated and navigated to Trivia /play */
  authenticatedTriviaPage: Page;
}

/**
 * Copy SSO cookies from Platform Hub to a target domain.
 * Different ports = different origins, so cookies don't propagate automatically.
 */
async function copySSOCookiesToDomain(page: Page, targetUrl: string): Promise<void> {
  const cookies = await page.context().cookies();
  const ssoCookies = cookies.filter((c) =>
    ['jb_access_token', 'jb_refresh_token', 'jb_user_id'].includes(c.name)
  );

  if (ssoCookies.length > 0) {
    await page.context().addCookies(
      ssoCookies.map((c) => ({
        name: c.name,
        value: c.value,
        url: targetUrl,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
        expires: c.expires,
      }))
    );
  }
}

/**
 * Login via Platform Hub UI with real Supabase credentials.
 * Waits for dashboard redirect and SSO cookie creation.
 */
async function loginViaPlatformHub(
  page: Page,
  user: RealAuthTestUser,
  options: { targetUrl?: string } = {}
): Promise<void> {
  // Navigate to login page
  await page.goto(`${HUB_URL}/login`);

  // Wait for form to be hydrated and interactive
  await playwrightExpect(async () => {
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await playwrightExpect(emailInput).toBeVisible({ timeout: 1000 });
    await playwrightExpect(emailInput).toBeEnabled({ timeout: 1000 });
    await playwrightExpect(passwordInput).toBeVisible({ timeout: 1000 });
    await playwrightExpect(passwordInput).toBeEnabled({ timeout: 1000 });
    await playwrightExpect(submitButton).toBeVisible({ timeout: 1000 });
    await playwrightExpect(submitButton).toBeEnabled({ timeout: 1000 });
  }).toPass({
    timeout: 15_000,
    intervals: [100, 250, 500, 1000],
  });

  // Fill credentials
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);

  // Verify values were set (guards against hydration reset)
  await playwrightExpect(page.locator('input[name="email"]')).toHaveValue(user.email);
  await playwrightExpect(page.locator('input[name="password"]')).toHaveValue(user.password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard (real Supabase auth)
  await page.waitForURL(`${HUB_URL}/dashboard`, { timeout: AUTH_TIMEOUT_MS });

  // Wait for SSO cookies to be set
  await playwrightExpect(async () => {
    const cookies = await page.context().cookies();
    const hasToken = cookies.some((c) => c.name === 'jb_access_token');
    playwrightExpect(hasToken).toBe(true);
  }).toPass({
    timeout: 10_000,
    intervals: [100, 250, 500, 1000],
  });

  // Copy cookies to target domain if specified
  if (options.targetUrl) {
    await copySSOCookiesToDomain(page, options.targetUrl);
  }
}

/**
 * Dismiss the Room Setup modal that appears on Bingo/Trivia /play pages.
 */
async function dismissRoomSetupModal(page: Page): Promise<void> {
  const modal = page.getByRole('dialog', { name: /room setup/i });

  try {
    await modal.waitFor({ state: 'visible', timeout: 3000 });
  } catch {
    return; // Modal didn't appear — user may already have a session
  }

  const playOfflineButton = modal.getByRole('button', { name: /Play offline/i });
  await playOfflineButton.waitFor({ state: 'visible', timeout: 2000 });
  await playOfflineButton.click();
  await modal.waitFor({ state: 'hidden', timeout: 5000 });
}

/**
 * Extended test with real-auth fixtures.
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '../../fixtures/real-auth';
 *
 * test('real Supabase login works', async ({ authenticatedHubPage }) => {
 *   // Page is already authenticated with real Supabase credentials
 * });
 * ```
 */
export const test = base.extend<RealAuthFixtures>({
  realTestUser: async ({}, use) => {
    await use({
      email: 'real-auth-test@joolie-boolie.test',
      password: 'RealAuthTest123!',
    });
  },

  authenticatedHubPage: async ({ page, realTestUser }, use) => {
    await loginViaPlatformHub(page, realTestUser);
    await use(page);
  },

  authenticatedBingoPage: async ({ page, realTestUser }, use) => {
    // Login via Hub, copy cookies to Bingo
    await loginViaPlatformHub(page, realTestUser, { targetUrl: BINGO_URL });

    // Navigate to Bingo /play
    await page.goto(`${BINGO_URL}/play`, {
      waitUntil: 'load',
      timeout: AUTH_TIMEOUT_MS,
    });

    await use(page);
  },

  authenticatedTriviaPage: async ({ page, realTestUser }, use) => {
    // Login via Hub, copy cookies to Trivia
    await loginViaPlatformHub(page, realTestUser, { targetUrl: TRIVIA_URL });

    // Navigate to Trivia /play
    await page.goto(`${TRIVIA_URL}/play`, {
      waitUntil: 'load',
      timeout: AUTH_TIMEOUT_MS,
    });

    // Dismiss Room Setup modal
    await dismissRoomSetupModal(page);

    await use(page);
  },
});

export { expect } from '@playwright/test';
