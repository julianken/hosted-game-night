import { test, expect } from '@playwright/test';
import { waitForHydration } from '../utils/helpers';

test.describe('Bingo Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
  });

  test('displays the main title and tagline @medium', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /joolie boolie bingo/i })).toBeVisible();
    await expect(page.getByText(/modern bingo for groups and communities/i)).toBeVisible();
  });

  test('has Play Now button that links to presenter view', async ({ page }) => {
    const playButton = page.getByRole('link', { name: /play now/i });
    await expect(playButton).toBeVisible();
    await expect(playButton).toHaveAttribute('href', '/play');
  });

  test('navigates to presenter view when Play Now is clicked', async ({ page }) => {
    await page.getByRole('link', { name: /play now/i }).click();
    // Middleware protects /play - unauthenticated users are redirected back to home
    await expect(page).toHaveURL('/');
    // Note: To test actual /play navigation, use authenticated fixtures
  });

  test('displays feature cards', async ({ page }) => {
    // Check that key features are listed
    await expect(page.getByText(/75-ball bingo/i)).toBeVisible();
    await expect(page.getByText(/large text/i)).toBeVisible();
    await expect(page.getByText(/dual screen/i)).toBeVisible();
    await expect(page.getByText(/auto-call/i)).toBeVisible();
    await expect(page.getByText(/keyboard shortcuts/i)).toBeVisible();
  });

  test('displays How It Works section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /how it works/i })).toBeVisible();
    await expect(page.getByText(/open the presenter view/i)).toBeVisible();
    await expect(page.getByText(/open the audience display/i)).toBeVisible();
  });

  test('has accessible structure with proper headings', async ({ page }) => {
    // Check for main heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveCount(1);

    const h2s = page.getByRole('heading', { level: 2 });
    await expect(h2s).toHaveCount(2); // Designed for Everyone, How It Works

    const h3s = page.getByRole('heading', { level: 3 });
    expect(await h3s.count()).toBeGreaterThan(3); // Feature cards and steps
  });

  test('footer mentions Joolie Boolie', async ({ page }) => {
    await expect(page.getByText(/joolie boolie platform/i)).toBeVisible();
  });

  test('has accessible button sizes (min 44x44px)', async ({ page }) => {
    const playButton = page.getByRole('link', { name: /play now/i });
    const box = await playButton.boundingBox();

    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
