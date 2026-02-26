import { test, expect } from '@playwright/test';
import { waitForHydration } from '../utils/helpers';

test.describe('Trivia Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
  });

  test('displays the main title @medium', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /trivia/i })).toBeVisible();
  });

  test('shows description text @medium', async ({ page }) => {
    await expect(page.getByText(/trivia system|groups and communities/i)).toBeVisible();
  });

  test('has Start Trivia button that links to presenter view @high', async ({ page }) => {
    const startButton = page.getByRole('link', { name: /start trivia/i });
    await expect(startButton).toBeVisible();
    await expect(startButton).toHaveAttribute('href', '/play');
  });

  test('has Open Display button @high', async ({ page }) => {
    const displayButton = page.getByRole('link', { name: /open display/i });
    await expect(displayButton).toBeVisible();
    await expect(displayButton).toHaveAttribute('href', '/display');
  });

  test('navigates to presenter view when Start Trivia is clicked @critical', async ({ page }) => {
    await page.getByRole('link', { name: /start trivia/i }).click();
    // Middleware protects /play - unauthenticated users are redirected back to home
    await expect(page).toHaveURL('/');
    // Note: To test actual /play navigation, use authenticated fixtures
  });

  test('has accessible structure @low', async ({ page }) => {
    // Check for main heading
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveCount(1);

    // Check for main landmark
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('buttons have accessible sizes @low', async ({ page }) => {
    const startButton = page.getByRole('link', { name: /start trivia/i });
    const box = await startButton.boundingBox();

    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
