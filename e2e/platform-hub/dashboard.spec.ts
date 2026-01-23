/**
 * Dashboard E2E Tests
 *
 * Note: These tests use Playwright auth fixtures to create authenticated sessions.
 *
 * IMPORTANT: All tests in this file are currently SKIPPED because they require real
 * server-side session handling which cannot be fully mocked at the browser level.
 * MSW (Mock Service Worker) can intercept API calls but cannot create the server-side
 * session state needed for protected routes like /dashboard. These tests should be
 * run against a real Supabase instance with proper authentication.
 */

import { test, expect } from '../fixtures/auth';

test.describe.skip('Platform Hub Dashboard @high', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to dashboard - user is already authenticated via fixture
    await authenticatedPage.goto('http://localhost:3002/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('dashboard page renders for authenticated user @critical', async ({
    authenticatedPage,
  }) => {
    // Verify main dashboard heading
    await expect(
      authenticatedPage.getByRole('heading', {
        name: /quick play/i,
        level: 2,
      })
    ).toBeVisible();

    // Verify help section
    await expect(
      authenticatedPage.getByRole('heading', {
        name: /need help getting started/i,
      })
    ).toBeVisible();
  });

  test('dashboard shows user email (via welcome header) @critical', async ({
    authenticatedPage,
  }) => {
    // The email isn't directly shown, but verify welcome header shows with user data
    const welcomeHeading = authenticatedPage.getByRole('heading', {
      name: /good (morning|afternoon|evening)/i,
      level: 1,
    });
    await expect(welcomeHeading).toBeVisible();

    // Welcome message should contain personalization
    const headingText = await welcomeHeading.textContent();
    expect(headingText).toBeTruthy();
  });

  test('dashboard shows display name @critical', async ({
    authenticatedPage,
  }) => {
    // Welcome header should show user's display name (from email prefix or full_name)
    const welcomeHeading = authenticatedPage.getByRole('heading', {
      name: /good (morning|afternoon|evening)/i,
      level: 1,
    });

    await expect(welcomeHeading).toBeVisible();

    // Extract display name from heading
    const headingText = await welcomeHeading.textContent();
    // Should contain user name (e2e-test based on email e2e-test@beak-gaming.test)
    expect(headingText).toMatch(/e2e-test|guest/i);
  });

  test('dashboard shows available games (Bingo and Trivia) @critical', async ({
    authenticatedPage,
  }) => {
    // Check for Bingo card
    await expect(
      authenticatedPage.getByRole('heading', { name: /beak bingo/i, level: 3 })
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(/classic 75-ball bingo/i)
    ).toBeVisible();

    // Check for Trivia card
    await expect(
      authenticatedPage.getByRole('heading', {
        name: /trivia night/i,
        level: 3,
      })
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(/team-based trivia/i)
    ).toBeVisible();
  });

  test('can navigate to bingo from dashboard @critical', async ({
    authenticatedPage,
  }) => {
    // Find Bingo link by exact aria-label (case sensitive)
    const bingoLink = authenticatedPage.getByRole('link', {
      name: 'Play Beak Bingo',
    });
    await expect(bingoLink).toBeVisible();

    // Verify link has correct href
    await expect(bingoLink).toHaveAttribute('href', /localhost:3000\/play/);
  });

  test('can navigate to trivia from dashboard @critical', async ({
    authenticatedPage,
  }) => {
    // Find Trivia link by exact aria-label (case sensitive)
    const triviaLink = authenticatedPage.getByRole('link', {
      name: 'Play Trivia Night',
    });
    await expect(triviaLink).toBeVisible();

    // Verify link has correct href
    await expect(triviaLink).toHaveAttribute('href', /localhost:3001\/play/);
  });

  test('dashboard shows recent activity section @high', async ({
    authenticatedPage,
  }) => {
    // Look for recent sessions section heading
    const recentHeading = authenticatedPage.locator(
      'h2:has-text("Recent"), h2:has-text("Activity")'
    );

    // Section should be visible (even if empty)
    const count = await recentHeading.count();
    expect(count).toBeGreaterThan(0);
  });

  test('dashboard shows correct game counts @high', async ({
    authenticatedPage,
  }) => {
    // Game cards should show play statistics
    // Look for "sessions" or "played" indicators
    const bingoCard = authenticatedPage.locator('article').filter({
      hasText: 'Beak Bingo',
    });
    await expect(bingoCard).toBeVisible();

    // Check for stat indicators (never played, played today, sessions count, etc.)
    const statsText = await bingoCard.textContent();
    expect(statsText).toMatch(/played|never|session/i);

    // Verify Trivia card has stats too
    const triviaCard = authenticatedPage.locator('article').filter({
      hasText: 'Trivia Night',
    });
    await expect(triviaCard).toBeVisible();
    const triviaStats = await triviaCard.textContent();
    expect(triviaStats).toMatch(/played|never|session/i);
  });

  test('dashboard welcome message uses user display name @high', async ({
    authenticatedPage,
  }) => {
    // Welcome header should personalize with user's name
    const welcomeHeading = authenticatedPage.getByRole('heading', {
      name: /good (morning|afternoon|evening)/i,
      level: 1,
    });
    await expect(welcomeHeading).toBeVisible();

    // Should contain greeting and name
    const headingText = await welcomeHeading.textContent();
    expect(headingText).toMatch(/good (morning|afternoon|evening)/i);
    // Name should be extracted from email (e2e-test)
    expect(headingText).not.toBe('Good Morning, !'); // Should not be empty
    expect(headingText).toMatch(/,/); // Should have comma separating greeting and name
  });

  test('loading states render correctly @medium', async ({ page }) => {
    // Use unauthenticated page to test loading state
    // Navigate to login first, then to dashboard to see loading
    await page.goto('http://localhost:3002/login');

    // Fill credentials
    await page.fill('input[name="email"]', 'e2e-test@beak-gaming.test');
    await page.fill('input[name="password"]', 'TestPassword123!');

    // Submit
    await page.click('button[type="submit"]');

    // Dashboard should eventually load
    await page.waitForURL('http://localhost:3002/dashboard', {
      timeout: 10000,
    });

    // Verify content loaded (not in loading state)
    await expect(
      page.getByRole('heading', { name: /quick play/i })
    ).toBeVisible();

    // Welcome heading should not be in loading state (no skeleton/pulse)
    const welcomeHeading = page.getByRole('heading', {
      name: /good (morning|afternoon|evening)/i,
    });
    await expect(welcomeHeading).toBeVisible();

    // Quick stats should show real values, not dashes
    const quickStats = page.locator('text="Games Played"');
    await expect(quickStats).toBeVisible();
  });
});

test.describe.skip('Dashboard Protection @critical', () => {
  // Skipped: Requires real server-side session to test redirect behavior
  test('dashboard redirects to login when not authenticated', async ({
    page,
  }) => {
    // Try to access dashboard without authentication
    await page.goto('http://localhost:3002/dashboard');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Login page should be visible
    await expect(
      page.getByRole('heading', { name: /sign in/i, level: 1 })
    ).toBeVisible();
  });
});
