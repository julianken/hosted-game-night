import { test, expect } from '@playwright/test';

/**
 * Tests for Issue #112 - Fix Modal Timing and Recovery Error Handling
 *
 * This test suite verifies that the RoomSetupModal displays correctly:
 * 1. On first visit (no session)
 * 2. When recovery errors occur
 * 3. Does NOT show on successful recovery
 */

test.describe('Room Setup Modal Timing', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored session data before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should show modal on first visit (no session)', async ({ page }) => {
    // Navigate to /play page
    await page.goto('/play');

    // Wait for the page to load and recovery to complete
    await page.waitForLoadState('networkidle');

    // Modal should be visible on first visit
    const modal = page.getByRole('dialog', { name: /room setup/i });
    await expect(modal).toBeVisible();

    // Verify all three options are present
    await expect(page.getByRole('button', { name: /create new game/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /join with room code/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /play offline/i })).toBeVisible();
  });

  test('should show modal on recovery error', async ({ page }) => {
    // Mock a failed session recovery by setting invalid token in localStorage
    await page.goto('/');
    await page.evaluate(() => {
      // Store an invalid session token that will fail recovery
      localStorage.setItem('bingo_session_token', 'invalid-token-12345');
    });

    // Navigate to /play page
    await page.goto('/play');

    // Wait for recovery to attempt and fail
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Give recovery time to complete

    // Modal should be visible due to recovery error
    const modal = page.getByRole('dialog', { name: /room setup/i });
    await expect(modal).toBeVisible();

    // Verify error message is displayed
    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/error/i);
  });

  test('should NOT show modal on successful recovery', async ({ page }) => {
    // First, create a valid session by playing offline
    await page.goto('/play');
    await page.waitForLoadState('networkidle');

    // Click "Play Offline" button in the modal
    const modal = page.getByRole('dialog', { name: /room setup/i });
    await expect(modal).toBeVisible();

    const playOfflineButton = page.getByRole('button', { name: /play offline/i });
    await playOfflineButton.click();

    // Modal should close after selecting offline mode
    await expect(modal).not.toBeVisible();

    // Verify offline session is created (session ID should be displayed)
    await expect(page.getByText(/offline session/i)).toBeVisible();

    // Now refresh the page to trigger recovery
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Modal should NOT be visible after successful recovery
    await expect(modal).not.toBeVisible();

    // Verify offline session is still active
    await expect(page.getByText(/offline session/i)).toBeVisible();
  });

  test('should allow dismissing modal with recovery error', async ({ page }) => {
    // Mock a failed session recovery
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('bingo_session_token', 'invalid-token-12345');
    });

    // Navigate to /play page
    await page.goto('/play');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Modal should be visible with error
    const modal = page.getByRole('dialog', { name: /room setup/i });
    await expect(modal).toBeVisible();

    // Close the modal
    const closeButton = page.getByRole('button', { name: /close/i }).first();
    await closeButton.click();

    // Modal should be dismissed
    await expect(modal).not.toBeVisible();
  });

  test('should clear error when creating new session after recovery error', async ({ page }) => {
    // Mock a failed session recovery
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('bingo_session_token', 'invalid-token-12345');
    });

    // Navigate to /play page
    await page.goto('/play');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify modal is visible with error
    const modal = page.getByRole('dialog', { name: /room setup/i });
    await expect(modal).toBeVisible();
    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible();

    // Click "Play Offline" to create a new session
    const playOfflineButton = page.getByRole('button', { name: /play offline/i });
    await playOfflineButton.click();

    // Modal should close and error should be cleared
    await expect(modal).not.toBeVisible();

    // Verify new offline session is active
    await expect(page.getByText(/offline session/i)).toBeVisible();
  });
});
