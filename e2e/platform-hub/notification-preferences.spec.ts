import { test, expect } from '../fixtures/auth';

test.describe('Notification Preferences (BEA-323)', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Reset E2E profile to default state before each test (ensures test isolation)
    await authenticatedPage.request.post('http://localhost:3992/api/profile/reset-e2e');

    await authenticatedPage.goto('/settings');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('should display notification preferences section', async ({ authenticatedPage: page }) => {
    // Check for section heading
    const heading = page.getByRole('heading', { name: 'Notification Preferences' });
    await expect(heading).toBeVisible();

    // Check for description
    await expect(page.getByText('Control which email notifications you receive')).toBeVisible();

    // Check all toggle labels are present
    await expect(page.getByText('Important Account Updates')).toBeVisible();
    await expect(page.getByText('Game Reminders')).toBeVisible();
    await expect(page.getByText('Weekly Activity Summary')).toBeVisible();
    await expect(page.getByText('Newsletter & Promotions')).toBeVisible();
  });

  test('should have correct default values', async ({ authenticatedPage: page }) => {
    // Email notifications should be enabled by default
    const emailToggle = page.locator('label:has-text("Important Account Updates") input[type="checkbox"]');
    await expect(emailToggle).toBeChecked();

    // Others should be disabled by default
    const gameRemindersToggle = page.locator('label:has-text("Game Reminders") input[type="checkbox"]');
    await expect(gameRemindersToggle).not.toBeChecked();

    const weeklySummaryToggle = page.locator('label:has-text("Weekly Activity Summary") input[type="checkbox"]');
    await expect(weeklySummaryToggle).not.toBeChecked();

    const marketingToggle = page.locator('label:has-text("Newsletter & Promotions") input[type="checkbox"]');
    await expect(marketingToggle).not.toBeChecked();
  });

  test('should toggle notification preferences', async ({ authenticatedPage: page }) => {
    // Find toggles by their labels
    const gameRemindersToggle = page.locator('label:has-text("Game Reminders") input[type="checkbox"]');
    const weeklySummaryToggle = page.locator('label:has-text("Weekly Activity Summary") input[type="checkbox"]');

    // Initially off
    await expect(gameRemindersToggle).not.toBeChecked();
    await expect(weeklySummaryToggle).not.toBeChecked();

    // Click to enable (auto-saves immediately)
    await gameRemindersToggle.click();
    await expect(gameRemindersToggle).toBeChecked();
    await expect(page.getByText('Notification preferences updated').first()).toBeVisible({ timeout: 5000 });

    await weeklySummaryToggle.click();
    await expect(weeklySummaryToggle).toBeChecked();
    await expect(page.getByText('Notification preferences updated').first()).toBeVisible({ timeout: 5000 });

    // Click to disable (auto-saves immediately)
    await gameRemindersToggle.click();
    await expect(gameRemindersToggle).not.toBeChecked();
    await expect(page.getByText('Notification preferences updated').first()).toBeVisible({ timeout: 5000 });
  });

  test('should auto-save notification preferences immediately', async ({ authenticatedPage: page }) => {
    // Enable game reminders (auto-saves immediately)
    const gameRemindersToggle = page.locator('label:has-text("Game Reminders") input[type="checkbox"]');
    await gameRemindersToggle.click();
    await expect(gameRemindersToggle).toBeChecked();

    // Wait for auto-save toast
    await expect(page.getByText('Notification preferences updated').first()).toBeVisible({ timeout: 5000 });

    // Enable weekly summary (auto-saves immediately)
    const weeklySummaryToggle = page.locator('label:has-text("Weekly Activity Summary") input[type="checkbox"]');
    await weeklySummaryToggle.click();
    await expect(weeklySummaryToggle).toBeChecked();

    // Wait for auto-save toast
    await expect(page.getByText('Notification preferences updated').first()).toBeVisible({ timeout: 5000 });
  });

  test('should persist notification preferences after auto-save and reload', async ({ authenticatedPage: page }) => {
    // Enable marketing emails (auto-saves immediately)
    const marketingToggle = page.locator('label:has-text("Newsletter & Promotions") input[type="checkbox"]');
    await marketingToggle.click();
    await expect(marketingToggle).toBeChecked();

    // Wait for auto-save toast
    await expect(page.getByText('Notification preferences updated').first()).toBeVisible({ timeout: 5000 });

    // Wait for network to be idle (ensure save completed)
    await page.waitForLoadState('networkidle');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Marketing toggle should still be enabled
    const marketingToggleAfter = page.locator('label:has-text("Newsletter & Promotions") input[type="checkbox"]');
    await expect(marketingToggleAfter).toBeChecked();
  });

  test('should display all notification preference descriptions', async ({ authenticatedPage: page }) => {
    // Check all descriptions are visible
    await expect(page.getByText('Security alerts, password changes, and critical account notifications')).toBeVisible();
    await expect(page.getByText('Reminders about upcoming scheduled games and events')).toBeVisible();
    await expect(page.getByText('Weekly recap of your games, scores, and achievements')).toBeVisible();
    await expect(page.getByText('New features, tips, and special offers from Beak Gaming')).toBeVisible();
  });

  test('should have accessible touch targets (44x44px minimum)', async ({ authenticatedPage: page }) => {
    // Get all toggle inputs
    const toggles = page.locator('label:has-text("Important Account Updates"), label:has-text("Game Reminders"), label:has-text("Weekly Activity Summary"), label:has-text("Newsletter & Promotions")');

    // Check first toggle has minimum size
    const firstToggle = toggles.first();
    const box = await firstToggle.boundingBox();

    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('should maintain other settings when saving notification preferences', async ({ authenticatedPage: page }) => {
    // Change facility name
    const facilityInput = page.getByLabel('Facility Name');
    await facilityInput.fill('Updated Test Facility');

    // Change notification preference (auto-saves immediately)
    const gameRemindersToggle = page.locator('label:has-text("Game Reminders") input[type="checkbox"]');
    await gameRemindersToggle.click();

    // Wait for notification auto-save toast
    await expect(page.getByText('Notification preferences updated').first()).toBeVisible({ timeout: 5000 });

    // Wait for the toast to disappear before clicking Save Changes
    await page.waitForTimeout(1000);

    // Save facility name with "Save Changes" button
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Profile updated successfully').first()).toBeVisible({ timeout: 5000 });

    // Wait for network to be idle
    await page.waitForLoadState('networkidle');

    // Reload and verify both saved
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(facilityInput).toHaveValue('Updated Test Facility');
    const gameRemindersToggleAfter = page.locator('label:has-text("Game Reminders") input[type="checkbox"]');
    await expect(gameRemindersToggleAfter).toBeChecked();
  });

  test('should support keyboard navigation', async ({ authenticatedPage: page }) => {
    // Get references to toggles
    const emailToggle = page.locator('label:has-text("Important Account Updates") input[type="checkbox"]');
    const gameRemindersToggle = page.locator('label:has-text("Game Reminders") input[type="checkbox"]');
    const weeklySummaryToggle = page.locator('label:has-text("Weekly Activity Summary") input[type="checkbox"]');

    // Initial state
    await expect(emailToggle).toBeChecked();
    await expect(gameRemindersToggle).not.toBeChecked();
    await expect(weeklySummaryToggle).not.toBeChecked();

    // Focus and toggle email notifications checkbox directly (auto-saves)
    await emailToggle.focus();
    await page.keyboard.press('Space');
    await expect(emailToggle).not.toBeChecked();
    await expect(page.getByText('Notification preferences updated').first()).toBeVisible({ timeout: 5000 });

    // Focus and toggle game reminders checkbox (auto-saves)
    await gameRemindersToggle.focus();
    await page.keyboard.press('Space');
    await expect(gameRemindersToggle).toBeChecked();
    await expect(page.getByText('Notification preferences updated').first()).toBeVisible({ timeout: 5000 });

    // Focus and toggle weekly summary checkbox (auto-saves)
    await weeklySummaryToggle.focus();
    await page.keyboard.press('Space');
    await expect(weeklySummaryToggle).toBeChecked();
    await expect(page.getByText('Notification preferences updated').first()).toBeVisible({ timeout: 5000 });

    // Verify we can toggle back (auto-saves)
    await emailToggle.focus();
    await page.keyboard.press('Space');
    await expect(emailToggle).toBeChecked();
    await expect(page.getByText('Notification preferences updated').first()).toBeVisible({ timeout: 5000 });
  });
});
