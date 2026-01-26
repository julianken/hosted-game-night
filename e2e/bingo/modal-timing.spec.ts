import { test, expect } from '../fixtures/auth';
import { waitForRoomSetupModal } from '../utils/helpers';

/**
 * Tests for Issue #112 - Fix Modal Timing and Recovery Error Handling
 *
 * This test suite verifies that the RoomSetupModal displays correctly:
 * 1. On first visit (no session)
 * 2. When recovery errors occur
 * 3. Does NOT show on successful recovery
 */

// Prevent fixture from auto-dismissing modal - these tests need to test the modal itself
test.use({ skipModalDismissal: true });

test.describe('Room Setup Modal Timing', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored session data before each test
    await page.goto('/');
    await page.evaluate(() => {
      // Clear ALL bingo-related storage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('bingo_') || key.includes('session'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();
    });
  });

  test('should show modal on first visit (no session)', async ({ authenticatedBingoPage: page }) => {
    // Navigate to /play page (fixture already does this)

    // Wait for the page to load and recovery to complete
    await page.waitForLoadState('networkidle');

    // Wait for recovery to complete and modal to appear
    await waitForRoomSetupModal(page);

    // Modal should now be visible
    const modal = page.getByRole('dialog', { name: /room setup/i });
    await expect(modal).toBeVisible();

    // Verify all three options are present (scope to modal)
    await expect(modal.getByRole('button', { name: /create new game/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /join with room code/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /play offline/i })).toBeVisible();
  });

  test('should show modal on recovery error', async ({ authenticatedBingoPage: page }) => {
    // First clear current session and set an invalid token
    await page.evaluate(() => {
      localStorage.clear();
      // Store an invalid session token that will fail recovery
      localStorage.setItem('bingo_session_token', 'invalid-token-12345');
    });

    // Reload to trigger recovery
    await page.reload();

    // Wait for recovery to attempt and fail
    await page.waitForLoadState('networkidle');

    // Wait for recovery to complete and modal to appear
    await waitForRoomSetupModal(page);

    // Modal should be visible due to recovery error
    const modal = page.getByRole('dialog', { name: /room setup/i });
    await expect(modal).toBeVisible();

    // Verify error message is displayed - scope to the modal to avoid Next.js route announcer
    const errorAlert = modal.getByRole('alert');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/error|failed/i);
  });

  test('should NOT show modal on successful recovery', async ({ authenticatedBingoPage: page }) => {
    // First, create a valid session by playing offline
    await page.waitForLoadState('networkidle');

    // Wait for modal to appear on first visit
    await waitForRoomSetupModal(page);

    // Click "Play Offline" button in the modal (scope to modal to avoid header button)
    const modal = page.getByRole('dialog', { name: /room setup/i });
    await expect(modal).toBeVisible();

    const playOfflineButton = modal.getByRole('button', { name: /play offline/i });
    await playOfflineButton.click();

    // Modal should close after selecting offline mode
    await expect(modal).not.toBeVisible();

    // Verify offline session is created (session ID should be displayed)
    await expect(page.getByText(/offline session/i)).toBeVisible();

    // Now refresh the page to trigger recovery
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for recovery to complete
    await page.waitForTimeout(2000);

    // Modal should NOT be visible after successful recovery
    await expect(modal).not.toBeVisible();

    // Verify offline session is still active
    await expect(page.getByText(/offline session/i)).toBeVisible();
  });

  test('should allow dismissing modal with recovery error', async ({ authenticatedBingoPage: page }) => {
    // Mock a failed session recovery
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('bingo_session_token', 'invalid-token-12345');
    });

    // Reload to trigger recovery
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for recovery to complete and modal to appear
    await waitForRoomSetupModal(page);

    // Modal should be visible with error
    const modal = page.getByRole('dialog', { name: /room setup/i });
    await expect(modal).toBeVisible();

    // Close the modal (scope to modal to avoid other close buttons)
    const closeButton = modal.getByRole('button', { name: /close/i });
    await closeButton.click({ force: true });

    // Modal should be dismissed
    await expect(modal).not.toBeVisible();
  });

  test('should clear error when creating new session after recovery error', async ({ authenticatedBingoPage: page }) => {
    // Mock a failed session recovery
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('bingo_session_token', 'invalid-token-12345');
    });

    // Reload to trigger recovery
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for recovery to complete and modal to appear
    await waitForRoomSetupModal(page);

    // Verify modal is visible with error
    const modal = page.getByRole('dialog', { name: /room setup/i });
    await expect(modal).toBeVisible();
    // Scope alert to modal to avoid Next.js route announcer
    const errorAlert = modal.getByRole('alert');
    await expect(errorAlert).toBeVisible();

    // Click "Play Offline" to create a new session (scope to modal)
    const playOfflineButton = modal.getByRole('button', { name: /play offline/i });
    await playOfflineButton.click();

    // Modal should close and error should be cleared
    await expect(modal).not.toBeVisible();

    // Verify new offline session is active
    await expect(page.getByText(/offline session/i)).toBeVisible();
  });
});
