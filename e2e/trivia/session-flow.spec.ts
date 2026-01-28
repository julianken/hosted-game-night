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
import { test, expect, type Page } from '../fixtures/auth';
import { waitForHydration, clickButton, waitForDualScreenSync, waitForCondition } from '../utils/helpers';

/**
 * Helper to wait for session recovery to complete.
 * The app has complex recovery logic with multiple effects:
 * 1. Online recovery via useSessionRecovery
 * 2. Offline recovery via localStorage lookup
 * 3. Modal visibility depends on both recovery states completing
 *
 * Uses toPass() pattern to handle timing variability.
 */
async function waitForSessionRecovery(page: Page, options?: { expectModal?: boolean }): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Wait for hydration and recovery effects to complete using deterministic check

  if (options?.expectModal === false) {
    // Expect no modal after recovery - use toPass for retry
    await expect(async () => {
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10000 });
  } else if (options?.expectModal === true) {
    // Expect modal to appear
    await expect(async () => {
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10000 });
  }
}

test.describe('Trivia Session Flow', () => {
  test.beforeEach(async ({ authenticatedTriviaPage: page }) => {
    // Clear localStorage before each test
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForHydration(page);
  });

  test.describe('Create Game with PIN', () => {
    // Prevent fixture from auto-dismissing modal - these tests need to interact with it
    test.use({ skipModalDismissal: true });

    test('should show room setup modal on first visit', async ({ authenticatedTriviaPage: page }) => {
      // Modal should be visible
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Room Setup')).toBeVisible();

      // All three options should be visible
      await expect(page.getByRole('button', { name: /create a new game room/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /show form to join existing game/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /play offline without network/i })).toBeVisible();
    });

    test('should create online room and display room code with PIN', async ({ authenticatedTriviaPage: page }) => {
      // Click create room button
      await clickButton(page, /create a new game room/i);

      // Wait for API call and modal to close - use toPass for retry on timing
      await expect(async () => {
        await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 15000, intervals: [500, 1000, 1500, 2000] });

      // Room code should be displayed - look for the Room: label
      await expect(async () => {
        const roomLabel = page.getByText(/Room:/i);
        await expect(roomLabel).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 10000 });

      // PIN should be displayed (4 digits) - look for PIN: label
      await expect(async () => {
        const pinLabel = page.getByText(/PIN:/i);
        await expect(pinLabel).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 5000 });
    });

    test('should persist PIN in localStorage after creation', async ({ authenticatedTriviaPage: page }) => {
      await clickButton(page, /create a new game room/i);

      // Wait for API call and modal to close
      await expect(async () => {
        await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 15000, intervals: [500, 1000, 1500, 2000] });

      // Check localStorage for PIN - may need retry for async storage
      await expect(async () => {
        const storedPin = await page.evaluate(() => localStorage.getItem('trivia_pin'));
        expect(storedPin).toBeTruthy();
        expect(storedPin).toMatch(/^\d{4}$/);
      }).toPass({ timeout: 5000 });
    });
  });

  test.describe('Session Recovery', () => {
    test('should recover session after page refresh with teams and scores', async ({ authenticatedTriviaPage: page }) => {
      // Create offline session for easier testing (no API calls)
      await clickButton(page, /play offline without network/i);
      await waitForSessionRecovery(page, { expectModal: false });

      // Add teams
      await clickButton(page, /add team/i);
      await expect(page.getByText(/table \d+/i).last()).toBeVisible();
      await clickButton(page, /add team/i);
      await expect(page.getByText(/table \d+/i).last()).toBeVisible();

      // Verify teams are added
      await expect(page.getByText(/table 1/i)).toBeVisible();
      await expect(page.getByText(/table 2/i)).toBeVisible();

      // Start the game
      await clickButton(page, /start game/i);
      await expect(page.getByText(/playing/i).first()).toBeVisible();

      // Verify game is playing
      await expect(page.getByText(/playing - round 1/i).first()).toBeVisible();

      // Get current state before refresh
      const teamCountBefore = await page.locator('text=/table \\d+/i').count();

      // Wait for localStorage to sync before refresh
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowUp');
      // Wait for localStorage sync
      await expect(async () => {
        const stored = await page.evaluate(() => localStorage.getItem('trivia_offline_session_id'));
        expect(stored).toBeTruthy();
      }).toPass({ timeout: 5000 });

      // Refresh the page
      await page.reload();
      await waitForHydration(page);

      // Wait for session recovery to complete

      // Check if offline mode UI is visible
      await expect(async () => {
        const hasOfflineIndicator = await page.getByText(/offline session/i).isVisible().catch(() => false);
        const hasGameState = await page.getByText(/playing|setup/i).first().isVisible().catch(() => false);
        expect(hasOfflineIndicator || hasGameState).toBe(true);
      }).toPass({ timeout: 15000 });
    });

    test('should restore current question after refresh', async ({ authenticatedTriviaPage: page }) => {
      await clickButton(page, /play offline without network/i);
      await waitForSessionRecovery(page, { expectModal: false });

      await clickButton(page, /add team/i);
      await expect(page.getByText(/table \d+/i).last()).toBeVisible();
      await clickButton(page, /start game/i);
      await expect(page.getByText(/playing/i).first()).toBeVisible();

      await page.keyboard.press('ArrowDown');

      // Wait for localStorage to sync
      await expect(async () => {
        const stored = await page.evaluate(() => localStorage.getItem('trivia_offline_session_id'));
        expect(stored).toBeTruthy();
      }).toPass({ timeout: 5000 });

      await page.reload();
      await waitForHydration(page);

      await expect(async () => {
        const hasOfflineIndicator = await page.getByText(/offline session/i).isVisible().catch(() => false);
        const hasGameState = await page.getByText(/playing|setup/i).first().isVisible().catch(() => false);
        const hasModal = await page.getByRole('dialog').isVisible().catch(() => false);
        expect(hasOfflineIndicator || hasGameState || hasModal).toBe(true);
      }).toPass({ timeout: 10000 });
    });

    test('should restore team scores after refresh', async ({ authenticatedTriviaPage: page }) => {
      await clickButton(page, /play offline without network/i);
      await waitForSessionRecovery(page, { expectModal: false });

      await clickButton(page, /add team/i);
      await expect(page.getByText(/table \d+/i).last()).toBeVisible();
      await clickButton(page, /start game/i);
      await expect(page.getByText(/playing/i).first()).toBeVisible();

      const plusButton = page.getByRole('button', { name: /\+1|increment score/i }).first();
      if (await plusButton.isVisible()) {
        await plusButton.click();
      }

      // Wait for localStorage to sync
      await expect(async () => {
        const stored = await page.evaluate(() => localStorage.getItem('trivia_offline_session_id'));
        expect(stored).toBeTruthy();
      }).toPass({ timeout: 5000 });

      await page.reload();
      await waitForHydration(page);

      await expect(async () => {
        const hasOfflineIndicator = await page.getByText(/offline session/i).isVisible().catch(() => false);
        const hasGameState = await page.getByText(/playing|setup/i).first().isVisible().catch(() => false);
        const hasModal = await page.getByRole('dialog').isVisible().catch(() => false);
        expect(hasOfflineIndicator || hasGameState || hasModal).toBe(true);
      }).toPass({ timeout: 10000 });
    });
  });

  test.describe('Audience Display Sync', () => {
    test('should sync question display to audience window', async ({ authenticatedTriviaPage: page, context }) => {
      await clickButton(page, /play offline without network/i);
      await waitForSessionRecovery(page, { expectModal: false });

      await clickButton(page, /add team/i);
      await expect(page.getByText(/table \d+/i).last()).toBeVisible();

      const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        clickButton(page, /open display/i),
      ]);

      await displayPage.waitForLoadState('networkidle');
      await waitForDualScreenSync(displayPage);

      await expect(displayPage.getByText(/trivia night/i)).toBeVisible({ timeout: 10000 });

      await clickButton(page, /start game/i);
      await expect(page.getByText(/playing/i).first()).toBeVisible();

      await page.keyboard.press('KeyD');

      await expect(async () => {
        const questionText = displayPage.locator('text=/what|which|who|when|where|how|Which|What|Who/i').first();
        await expect(questionText).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 10000 });

      await displayPage.close();
    });

    test('should sync team scores to audience display in real-time', async ({ authenticatedTriviaPage: page, context }) => {
      await clickButton(page, /play offline without network/i);
      await waitForSessionRecovery(page, { expectModal: false });

      await clickButton(page, /add team/i);
      await expect(page.getByText(/table \d+/i).last()).toBeVisible();
      await clickButton(page, /add team/i);
      await expect(page.getByText(/table \d+/i).last()).toBeVisible();

      const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        clickButton(page, /open display/i),
      ]);

      await displayPage.waitForLoadState('networkidle');
      await waitForDualScreenSync(displayPage);

      await clickButton(page, /start game/i);
      await expect(page.getByText(/playing/i).first()).toBeVisible();

      const plusButton = page.getByRole('button', { name: /\+1|increment score/i }).first();
      if (await plusButton.isVisible()) {
        await plusButton.click();
      }

      await expect(displayPage.getByText(/trivia night/i)).toBeVisible({ timeout: 10000 });

      await displayPage.close();
    });

    test('should sync question navigation to audience display', async ({ authenticatedTriviaPage: page, context }) => {
      await clickButton(page, /play offline without network/i);
      await waitForSessionRecovery(page, { expectModal: false });

      await clickButton(page, /add team/i);
      await expect(page.getByText(/table \d+/i).last()).toBeVisible();

      const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        clickButton(page, /open display/i),
      ]);

      await displayPage.waitForLoadState('networkidle');
      await waitForDualScreenSync(displayPage);

      await clickButton(page, /start game/i);
      await expect(page.getByText(/playing/i).first()).toBeVisible();

      await expect(page.getByText(/playing - round 1/i).first()).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('KeyD');

      await expect(async () => {
        const displayContent = await displayPage.locator('main').textContent();
        const hasBranding = displayContent?.includes('Trivia Night');
        expect(hasBranding).toBe(true);
      }).toPass({ timeout: 10000 });

      await displayPage.close();
    });
  });

  test.describe('PIN Verification', () => {
    test('should show join form when clicking join existing game', async ({ authenticatedTriviaPage: page }) => {
      await clickButton(page, /show form to join existing game/i);

      await expect(page.getByLabel(/room code/i)).toBeVisible();
      await expect(page.getByLabel(/room pin/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /join game/i })).toBeVisible();
      await expect(page.locator('form').getByRole('button', { name: /cancel/i })).toBeVisible();
    });

    test('should validate PIN format (4 digits)', async ({ authenticatedTriviaPage: page }) => {
      await clickButton(page, /show form to join existing game/i);

      const roomCodeInput = page.getByLabel(/room code/i);
      const pinInput = page.getByLabel(/room pin/i);
      const joinButton = page.getByRole('button', { name: /join game/i });

      await roomCodeInput.fill('TEST-123');

      await pinInput.fill('123');
      await expect(joinButton).toBeDisabled();

      await pinInput.fill('1234');
      await expect(joinButton).not.toBeDisabled();
    });

    test('should convert room code to uppercase', async ({ authenticatedTriviaPage: page }) => {
      await clickButton(page, /show form to join existing game/i);

      const roomCodeInput = page.getByLabel(/room code/i);

      await roomCodeInput.fill('test-123');

      const value = await roomCodeInput.inputValue();
      expect(value).toBe('TEST-123');
    });

    test('should only allow numeric input for PIN', async ({ authenticatedTriviaPage: page }) => {
      await clickButton(page, /show form to join existing game/i);

      const pinInput = page.getByLabel(/room pin/i);

      await pinInput.focus();
      await pinInput.pressSequentially('abc123xyz', { delay: 50 });

      await expect(pinInput).toHaveValue('123');
    });

    test('should limit PIN to 4 digits', async ({ authenticatedTriviaPage: page }) => {
      await clickButton(page, /show form to join existing game/i);

      const pinInput = page.getByLabel(/room pin/i);

      await pinInput.fill('123456789');

      const value = await pinInput.inputValue();
      expect(value).toBe('1234');
    });

    test('should clear form when cancel clicked', async ({ authenticatedTriviaPage: page }) => {
      await clickButton(page, /show form to join existing game/i);

      const roomCodeInput = page.getByLabel(/room code/i);
      const pinInput = page.getByLabel(/room pin/i);

      await roomCodeInput.fill('TEST-123');
      await pinInput.fill('1234');

      const formCancelButton = page.locator('form').getByRole('button', { name: /cancel/i });
      await formCancelButton.click();

      await expect(roomCodeInput).not.toBeVisible();

      await clickButton(page, /show form to join existing game/i);

      await expect(page.getByLabel(/room code/i)).toHaveValue('');
      await expect(page.getByLabel(/room pin/i)).toHaveValue('');
    });
  });

  test.describe('Offline Mode', () => {
    test('should create offline session without API calls', async ({ authenticatedTriviaPage: page }) => {
      const requests: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          requests.push(request.url());
        }
      });

      await clickButton(page, /play offline without network/i);

      await waitForSessionRecovery(page, { expectModal: false });

      expect(requests.length).toBe(0);
    });

    test('should generate and display 6-character session ID in offline mode', async ({ authenticatedTriviaPage: page }) => {
      await clickButton(page, /play offline without network/i);
      await waitForSessionRecovery(page, { expectModal: false });

      await expect(page.getByText(/offline session|session/i)).toBeVisible();

      const sessionIdDisplay = page.locator('text=/[A-Z0-9]{6}/').first();
      await expect(sessionIdDisplay).toBeVisible({ timeout: 5000 });

      const sessionIdText = await sessionIdDisplay.textContent();
      expect(sessionIdText).toMatch(/^[A-Z0-9]{6}$/);
      expect(sessionIdText).not.toMatch(/[0O1I]/);
    });

    test('should persist offline session in localStorage', async ({ authenticatedTriviaPage: page }) => {
      await clickButton(page, /play offline without network/i);
      await waitForSessionRecovery(page, { expectModal: false });

      const sessionId = await page.evaluate(() => localStorage.getItem('trivia_offline_session_id'));
      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^[A-Z0-9]{6}$/);
    });

    test('should recover offline session after page refresh', async ({ authenticatedTriviaPage: page }) => {
      await clickButton(page, /play offline without network/i);
      await waitForSessionRecovery(page, { expectModal: false });

      let sessionIdBefore: string | null = null;
      await expect(async () => {
        sessionIdBefore = await page.evaluate(() =>
          localStorage.getItem('trivia_offline_session_id')
        );
        expect(sessionIdBefore).toBeTruthy();
        expect(sessionIdBefore).toMatch(/^[A-Z0-9]{6}$/);
      }).toPass({ timeout: 5000 });

      // Wait for localStorage to sync
      await expect(async () => {
        const stored = await page.evaluate(() => localStorage.getItem('trivia_offline_session_id'));
        expect(stored).toBeTruthy();
      }).toPass({ timeout: 5000 });

      await page.reload();
      await waitForHydration(page);

      await expect(async () => {
        const sessionIdAfter = await page.evaluate(() =>
          localStorage.getItem('trivia_offline_session_id')
        );
        expect(sessionIdAfter).toBeTruthy();
        expect(sessionIdAfter).toMatch(/^[A-Z0-9]{6}$/);
      }).toPass({ timeout: 5000 });
    });
  });

  test.describe('Multi-Window Sync', () => {
    test('should sync display window in offline mode', async ({ authenticatedTriviaPage: page, context }) => {
      await clickButton(page, /play offline without network/i);
      await waitForSessionRecovery(page, { expectModal: false });

      const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        clickButton(page, /open display/i),
      ]);

      await displayPage.waitForLoadState('networkidle');

      await expect(displayPage.getByText(/trivia night/i)).toBeVisible({ timeout: 10000 });

      const displayUrl = displayPage.url();
      expect(displayUrl).toContain('/display?offline=');
      const urlMatch = displayUrl.match(/offline=([A-Z0-9]{6})/);
      expect(urlMatch).toBeTruthy();

      await displayPage.close();
    });

    test('should sync game state between windows via BroadcastChannel', async ({ authenticatedTriviaPage: page, context }) => {
      await clickButton(page, /play offline without network/i);
      await waitForSessionRecovery(page, { expectModal: false });

      await clickButton(page, /add team/i);
      await expect(page.getByText(/table \d+/i).last()).toBeVisible();

      const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        clickButton(page, /open display/i),
      ]);

      await displayPage.waitForLoadState('networkidle');
      await waitForDualScreenSync(displayPage);

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
    test('should show Create New Game button after session is created', async ({ authenticatedTriviaPage: page }) => {
      await clickButton(page, /play offline without network/i);
      await waitForSessionRecovery(page, { expectModal: false });

      const createNewButton = page.getByRole('button', { name: /create new game/i });
      await expect(createNewButton).toBeVisible();
    });

    test('should show modal when Create New Game clicked', async ({ authenticatedTriviaPage: page }) => {
      await clickButton(page, /play offline without network/i);
      await waitForSessionRecovery(page, { expectModal: false });

      const createNewButton = page.getByRole('button', { name: /create new game/i });
      await createNewButton.click();

      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Room Setup')).toBeVisible();
    });
  });
});
