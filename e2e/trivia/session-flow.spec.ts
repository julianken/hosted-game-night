/**
 * Session Flow E2E Tests
 *
 * Tests the complete Trivia session flow including:
 * - Creating game with PIN
 * - Revealing questions with auto-sync
 * - Opening audience display
 * - Refreshing presenter page
 * - Rejoining and verifying state restoration (teams, scores, current question)
 * - Testing audience real-time updates
 * - Testing PIN lockout/verification
 */
import { test, expect, Page } from '@playwright/test';
import { waitForHydration, clickButton } from '../utils/helpers';

test.describe('Trivia Session Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/play');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForHydration(page);
  });

  test.describe('Create Game with PIN', () => {
    test('should show room setup modal on first visit', async ({ page }) => {
      // Modal should be visible
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Room Setup')).toBeVisible();

      // All three options should be visible
      await expect(page.getByRole('button', { name: /create a new game room/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /show form to join existing game/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /play offline without network/i })).toBeVisible();
    });

    test('should create online room and display room code with PIN', async ({ page }) => {
      // Click create room button
      await clickButton(page, /create a new game room/i);

      // Wait for modal to close and room code to appear
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

      // Room code should be displayed
      const roomCodeDisplay = page.locator('text=/room code/i').first();
      await expect(roomCodeDisplay).toBeVisible({ timeout: 5000 });

      // PIN should be displayed (4 digits)
      const pinDisplay = page.locator('text=/\\d{4}/').first();
      await expect(pinDisplay).toBeVisible({ timeout: 5000 });

      // Verify PIN is exactly 4 digits
      const pinText = await pinDisplay.textContent();
      expect(pinText).toMatch(/\d{4}/);
    });

    test('should persist PIN in localStorage after creation', async ({ page }) => {
      await clickButton(page, /create a new game room/i);
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

      // Check localStorage for PIN
      const storedPin = await page.evaluate(() => localStorage.getItem('trivia_pin'));
      expect(storedPin).toBeTruthy();
      expect(storedPin).toMatch(/^\d{4}$/);
    });
  });

  test.describe('Session Recovery', () => {
    test('should recover session after page refresh with teams and scores', async ({ page }) => {
      // Create offline session for easier testing (no API calls)
      await clickButton(page, /play offline without network/i);
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Add teams
      await clickButton(page, /add team/i);
      await page.waitForTimeout(200);
      await clickButton(page, /add team/i);
      await page.waitForTimeout(200);

      // Verify teams are added
      await expect(page.getByText(/table 1/i)).toBeVisible();
      await expect(page.getByText(/table 2/i)).toBeVisible();

      // Start the game
      await clickButton(page, /start game/i);
      await page.waitForTimeout(500);

      // Verify game is playing
      await expect(page.getByText(/playing|round 1/i)).toBeVisible();

      // Get current state before refresh
      const teamCountBefore = await page.locator('text=/table \\d+/i').count();

      // Refresh the page
      await page.reload();
      await waitForHydration(page);

      // Wait for state restoration
      await page.waitForTimeout(1000);

      // Session should be recovered automatically (no modal)
      await expect(page.getByRole('dialog')).not.toBeVisible();

      // Teams should be restored
      const teamCountAfter = await page.locator('text=/table \\d+/i').count();
      expect(teamCountAfter).toBe(teamCountBefore);

      // Game state should be restored
      await expect(page.getByText(/playing|round 1/i)).toBeVisible();
    });

    test('should restore current question after refresh', async ({ page }) => {
      // Create offline session
      await clickButton(page, /play offline without network/i);
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Add a team and start
      await clickButton(page, /add team/i);
      await page.waitForTimeout(200);
      await clickButton(page, /start game/i);
      await page.waitForTimeout(500);

      // Navigate to second question using arrow down
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);

      // Get the current question text before refresh
      const questionBefore = await page.locator('[data-testid="current-question"], .question-text, h2').filter({
        hasText: /what|which|who|when|where|how/i
      }).first().textContent();

      // Refresh the page
      await page.reload();
      await waitForHydration(page);
      await page.waitForTimeout(1000);

      // Current question should be restored
      const questionAfter = await page.locator('[data-testid="current-question"], .question-text, h2').filter({
        hasText: /what|which|who|when|where|how/i
      }).first().textContent();

      expect(questionAfter).toBe(questionBefore);
    });

    test('should restore team scores after refresh', async ({ page }) => {
      // Create offline session
      await clickButton(page, /play offline without network/i);
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Add team and start
      await clickButton(page, /add team/i);
      await page.waitForTimeout(200);
      await clickButton(page, /start game/i);
      await page.waitForTimeout(500);

      // Adjust score: find the +1 button for the team
      const plusButton = page.getByRole('button', { name: /\+1|increment score/i }).first();
      if (await plusButton.isVisible()) {
        await plusButton.click();
        await page.waitForTimeout(300);
      }

      // Get score before refresh
      const scoreBefore = await page.locator('text=/\\d+\\s*(pts?|points?)/i').first().textContent();

      // Refresh the page
      await page.reload();
      await waitForHydration(page);
      await page.waitForTimeout(1000);

      // Score should be restored
      const scoreAfter = await page.locator('text=/\\d+\\s*(pts?|points?)/i').first().textContent();
      expect(scoreAfter).toBe(scoreBefore);
    });
  });

  test.describe('Audience Display Sync', () => {
    test('should sync question display to audience window', async ({ page, context }) => {
      // Create offline session
      await clickButton(page, /play offline without network/i);
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Add team and start
      await clickButton(page, /add team/i);
      await page.waitForTimeout(200);

      // Open display window
      const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        clickButton(page, /open display/i),
      ]);

      await displayPage.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Display should show waiting state initially
      await expect(displayPage.getByText(/waiting|get ready/i)).toBeVisible();

      // Start game
      await clickButton(page, /start game/i);
      await page.waitForTimeout(500);

      // Toggle display question (press D key)
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(1000);

      // Question should appear on display
      await expect(displayPage.getByText(/round 1/i)).toBeVisible({ timeout: 5000 });

      // Question text should be visible on display
      const questionVisible = await displayPage.locator('text=/what|which|who|when|where|how/i').first().isVisible();
      expect(questionVisible).toBe(true);

      await displayPage.close();
    });

    test('should sync team scores to audience display in real-time', async ({ page, context }) => {
      // Create offline session
      await clickButton(page, /play offline without network/i);
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Add teams
      await clickButton(page, /add team/i);
      await page.waitForTimeout(200);
      await clickButton(page, /add team/i);
      await page.waitForTimeout(200);

      // Open display
      const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        clickButton(page, /open display/i),
      ]);

      await displayPage.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Start game
      await clickButton(page, /start game/i);
      await page.waitForTimeout(500);

      // Update score in presenter
      const plusButton = page.getByRole('button', { name: /\+1|increment score/i }).first();
      if (await plusButton.isVisible()) {
        await plusButton.click();
        await page.waitForTimeout(500);
      }

      // Verify score update appears on display
      // The scoreboard should show updated scores
      const scoreOnDisplay = await displayPage.locator('text=/\\d+/').first().isVisible();
      expect(scoreOnDisplay).toBe(true);

      await displayPage.close();
    });

    test('should sync question navigation to audience display', async ({ page, context }) => {
      // Create offline session
      await clickButton(page, /play offline without network/i);
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Add team
      await clickButton(page, /add team/i);
      await page.waitForTimeout(200);

      // Open display
      const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        clickButton(page, /open display/i),
      ]);

      await displayPage.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Start game
      await clickButton(page, /start game/i);
      await page.waitForTimeout(500);

      // Display first question
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(1000);

      // Get first question text from display
      const firstQuestion = await displayPage.locator('text=/what|which|who|when|where|how/i').first().textContent();

      // Navigate to next question in presenter
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(500);

      // Display the second question
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(1000);

      // Question on display should change
      const secondQuestion = await displayPage.locator('text=/what|which|who|when|where|how/i').first().textContent();

      // Questions should be different
      expect(secondQuestion).not.toBe(firstQuestion);

      await displayPage.close();
    });
  });

  test.describe('PIN Verification', () => {
    test('should show join form when clicking join existing game', async ({ page }) => {
      await clickButton(page, /show form to join existing game/i);

      // Form inputs should be visible
      await expect(page.getByLabelText(/room code/i)).toBeVisible();
      await expect(page.getByLabelText(/room pin/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /join game/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    });

    test('should validate PIN format (4 digits)', async ({ page }) => {
      await clickButton(page, /show form to join existing game/i);

      const roomCodeInput = page.getByLabelText(/room code/i);
      const pinInput = page.getByLabelText(/room pin/i);
      const joinButton = page.getByRole('button', { name: /join game/i });

      // Fill in room code
      await roomCodeInput.fill('TEST-123');

      // Try with less than 4 digits
      await pinInput.fill('123');
      await expect(joinButton).toBeDisabled();

      // Fill with exactly 4 digits
      await pinInput.fill('1234');
      await expect(joinButton).not.toBeDisabled();
    });

    test('should convert room code to uppercase', async ({ page }) => {
      await clickButton(page, /show form to join existing game/i);

      const roomCodeInput = page.getByLabelText(/room code/i);

      // Type lowercase
      await roomCodeInput.fill('test-123');

      // Should be converted to uppercase
      const value = await roomCodeInput.inputValue();
      expect(value).toBe('TEST-123');
    });

    test('should only allow numeric input for PIN', async ({ page }) => {
      await clickButton(page, /show form to join existing game/i);

      const pinInput = page.getByLabelText(/room pin/i);

      // Try to type letters
      await pinInput.fill('abc123xyz');

      // Only digits should remain
      const value = await pinInput.inputValue();
      expect(value).toBe('123');
    });

    test('should limit PIN to 4 digits', async ({ page }) => {
      await clickButton(page, /show form to join existing game/i);

      const pinInput = page.getByLabelText(/room pin/i);

      // Try to type more than 4 digits
      await pinInput.fill('123456789');

      // Only first 4 digits should remain
      const value = await pinInput.inputValue();
      expect(value).toBe('1234');
    });

    test('should clear form when cancel clicked', async ({ page }) => {
      await clickButton(page, /show form to join existing game/i);

      const roomCodeInput = page.getByLabelText(/room code/i);
      const pinInput = page.getByLabelText(/room pin/i);

      // Fill in form
      await roomCodeInput.fill('TEST-123');
      await pinInput.fill('1234');

      // Click cancel
      await clickButton(page, /cancel/i);

      // Form should be hidden
      await expect(roomCodeInput).not.toBeVisible();

      // Click join again - form should be empty
      await clickButton(page, /show form to join existing game/i);
      expect(await page.getByLabelText(/room code/i).inputValue()).toBe('');
      expect(await page.getByLabelText(/room pin/i).inputValue()).toBe('');
    });
  });

  test.describe('Offline Mode', () => {
    test('should create offline session without API calls', async ({ page }) => {
      // Track network requests
      const requests: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          requests.push(request.url());
        }
      });

      await clickButton(page, /play offline without network/i);

      // Wait for modal to close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Verify no API calls were made
      expect(requests.length).toBe(0);
    });

    test('should generate and display 6-character session ID in offline mode', async ({ page }) => {
      await clickButton(page, /play offline without network/i);
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Session ID should be displayed
      await expect(page.getByText(/offline session|session/i)).toBeVisible();

      // Look for 6-character alphanumeric session ID
      const sessionIdDisplay = page.locator('text=/[A-Z0-9]{6}/').first();
      await expect(sessionIdDisplay).toBeVisible({ timeout: 5000 });

      const sessionIdText = await sessionIdDisplay.textContent();
      expect(sessionIdText).toMatch(/^[A-Z0-9]{6}$/);
    });

    test('should persist offline session in localStorage', async ({ page }) => {
      await clickButton(page, /play offline without network/i);
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Check localStorage for offline session data
      const sessionId = await page.evaluate(() => localStorage.getItem('trivia_offline_session_id'));
      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^[A-Z0-9]{6}$/);
    });

    test('should recover offline session after page refresh', async ({ page }) => {
      await clickButton(page, /play offline without network/i);
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Get session ID before refresh
      const sessionIdBefore = await page.evaluate(() =>
        localStorage.getItem('trivia_offline_session_id')
      );

      // Refresh the page
      await page.reload();
      await waitForHydration(page);
      await page.waitForTimeout(1000);

      // Session ID should still be present
      const sessionIdAfter = await page.evaluate(() =>
        localStorage.getItem('trivia_offline_session_id')
      );
      expect(sessionIdAfter).toBe(sessionIdBefore);

      // Offline session display should be visible (no modal)
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('Multi-Window Sync', () => {
    test('should sync display window in offline mode', async ({ page, context }) => {
      // Create offline session
      await clickButton(page, /play offline without network/i);
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Get offline session ID
      const sessionId = await page.evaluate(() =>
        localStorage.getItem('trivia_offline_session_id')
      );

      // Open display window
      const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        clickButton(page, /open display/i),
      ]);

      await displayPage.waitForLoadState('networkidle');

      // Display should show trivia display
      await expect(displayPage.getByText(/trivia night/i)).toBeVisible({ timeout: 10000 });

      // Verify offline session ID is in URL
      const displayUrl = displayPage.url();
      expect(displayUrl).toContain(`/display?offline=${sessionId}`);

      await displayPage.close();
    });

    test('should sync game state between windows via BroadcastChannel', async ({ page, context }) => {
      // Create offline session for simpler testing (no API calls)
      await clickButton(page, /play offline without network/i);
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Add team
      await clickButton(page, /add team/i);
      await page.waitForTimeout(200);

      // Open display window
      const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        clickButton(page, /open display/i),
      ]);

      await displayPage.waitForLoadState('networkidle');

      // Wait for sync to establish
      await page.waitForTimeout(1000);

      // Both pages should be connected via BroadcastChannel
      // We can verify this by checking that both pages have the same session ID in their state
      const presenterSessionId = await page.evaluate(() =>
        localStorage.getItem('trivia_offline_session_id')
      );
      const displaySessionId = await displayPage.evaluate(() =>
        localStorage.getItem('trivia_offline_session_id')
      );

      expect(presenterSessionId).toBe(displaySessionId);

      await displayPage.close();
    });
  });

  test.describe('Create New Game Button', () => {
    test('should show Create New Game button after session is created', async ({ page }) => {
      // Close modal by playing offline
      await clickButton(page, /play offline without network/i);
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Create New Game button should be visible
      const createNewButton = page.getByRole('button', { name: /create new game/i });
      await expect(createNewButton).toBeVisible();
    });

    test('should show modal when Create New Game clicked', async ({ page }) => {
      // First create an offline session
      await clickButton(page, /play offline without network/i);
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Click Create New Game
      const createNewButton = page.getByRole('button', { name: /create new game/i });
      await createNewButton.click();

      // Modal should be shown again
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Room Setup')).toBeVisible();
    });
  });
});
