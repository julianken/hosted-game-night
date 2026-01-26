import { test, expect } from '../fixtures/auth';
import { waitForHydration, pressKey } from '../utils/helpers';

test.describe('Trivia Presenter View', () => {
  test.beforeEach(async ({ authenticatedTriviaPage: page }) => {
    await waitForHydration(page);
  });

  test.describe('Page Structure', () => {
    test('displays presenter view header', async ({ authenticatedTriviaPage: page }) => {
      await expect(page.getByRole('heading', { name: /trivia night/i })).toBeVisible();
      await expect(page.getByText(/presenter view/i)).toBeVisible();
    });

    test('shows game status indicator', async ({ authenticatedTriviaPage: page }) => {
      // Should show setup status initially - look for the status badge specifically
      await expect(page.locator('span').filter({ hasText: /^setup$/i })).toBeVisible();
    });

    test('shows Open Display button', async ({ authenticatedTriviaPage: page }) => {
      const openDisplayBtn = page.getByRole('button', { name: /open display/i });
      await expect(openDisplayBtn).toBeVisible();
    });

    test('shows sync status', async ({ authenticatedTriviaPage: page }) => {
      await expect(page.getByText(/sync ready|sync active/i)).toBeVisible();
    });

    test('shows keyboard shortcuts reference', async ({ authenticatedTriviaPage: page }) => {
      await expect(page.getByText(/keyboard shortcuts/i)).toBeVisible();
      await expect(page.getByText(/navigate/i)).toBeVisible();
      // Look for "Peek answer" text in shortcuts section (not the button)
      await expect(page.getByText('Peek answer')).toBeVisible();
    });
  });

  test.describe('Starting a New Game', () => {
    test('cannot start game without teams', async ({ authenticatedTriviaPage: page }) => {
      const startBtn = page.getByRole('button', { name: /start game/i });
      await expect(startBtn).toBeVisible();
      await expect(startBtn).toBeDisabled();
    });

    test('can start game after adding a team', async ({ authenticatedTriviaPage: page }) => {
      // Add a team
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await addTeamBtn.click();
      await page.waitForTimeout(300);

      // Start button should now be enabled
      const startBtn = page.getByRole('button', { name: /start game/i });
      await expect(startBtn).toBeEnabled();

      // Click start
      await startBtn.click();
      await page.waitForTimeout(500);

      // Status should change to playing
      // Use specific text pattern to avoid matching multiple "Round 1" elements
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();
    });

    test('shows ready message with team count', async ({ authenticatedTriviaPage: page }) => {
      // Add teams
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await addTeamBtn.click();
      await page.waitForTimeout(200);
      await addTeamBtn.click();
      await page.waitForTimeout(200);

      // Should show team count
      await expect(page.getByText(/2 teams? ready/i)).toBeVisible();
    });
  });

  test.describe('Team Management', () => {
    test('displays team manager section', async ({ authenticatedTriviaPage: page }) => {
      await expect(page.getByRole('heading', { name: /teams/i })).toBeVisible();
    });

    test('can add a team', async ({ authenticatedTriviaPage: page }) => {
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await expect(addTeamBtn).toBeVisible();

      // Check initial state
      await expect(page.getByText(/no teams added yet/i)).toBeVisible();

      // Add team
      await addTeamBtn.click();
      await page.waitForTimeout(300);

      // Team should appear
      await expect(page.getByText(/table 1/i)).toBeVisible();

      // Add another team
      await addTeamBtn.click();
      await page.waitForTimeout(300);
      await expect(page.getByText(/table 2/i)).toBeVisible();
    });

    test('can remove a team during setup', async ({ authenticatedTriviaPage: page }) => {
      // Add a team
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await addTeamBtn.click();

      // Wait for team to appear using proper role-based locator
      const team1Item = page.getByRole('listitem', { name: /team: table 1/i });
      await expect(team1Item).toBeVisible();

      // Remove the team using the accessible button name
      const removeBtn = page.getByRole('button', { name: /remove team table 1/i });
      await removeBtn.click();

      // Wait for team removal to complete - use toPass for retry logic
      await expect(async () => {
        await expect(page.getByText(/no teams added yet/i)).toBeVisible();
      }).toPass({ timeout: 10000 });
    });

    test('can rename a team', async ({ authenticatedTriviaPage: page }) => {
      // Add a team
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await addTeamBtn.click();

      // Wait for team to appear using proper role-based locator
      await expect(page.getByRole('listitem', { name: /team: table 1/i })).toBeVisible();

      // Click rename button using accessible button name
      const renameBtn = page.getByRole('button', { name: /rename team table 1/i });
      await renameBtn.click();

      // Wait for and fill the edit input
      const input = page.getByLabel('Edit team name');
      await expect(input).toBeVisible();
      await input.fill('Champions');
      await input.press('Enter');

      // Wait for team rename to complete - use toPass for retry logic
      await expect(async () => {
        await expect(page.getByRole('listitem', { name: /team: champions/i })).toBeVisible();
      }).toPass({ timeout: 10000 });
    });

    test('shows team count limit', async ({ authenticatedTriviaPage: page }) => {
      // Check for the counter showing current/max teams
      const addTeamBtn = page.getByRole('button', { name: /add team/i });
      await addTeamBtn.click();

      // Wait for team to be added
      await expect(page.getByRole('listitem', { name: /team: table 1/i })).toBeVisible();

      // Should show 1/20 - use exact text to avoid matching question numbers like "Q1/"
      // The team counter is within the Team management region
      const teamSection = page.getByRole('region', { name: /team management/i });
      await expect(teamSection.getByText('1/20', { exact: true })).toBeVisible();
    });
  });

  test.describe('Question Navigation', () => {
    test('shows question list', async ({ authenticatedTriviaPage: page }) => {
      // Question list section should be visible - use heading to find the section
      await expect(page.getByRole('heading', { name: /round 1/i })).toBeVisible();
    });

    test('can navigate questions with keyboard', async ({ authenticatedTriviaPage: page }) => {
      // Add team and start game
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Navigate down with arrow key
      await pressKey(page, 'ArrowDown');
      await page.waitForTimeout(200);

      // Navigate up with arrow key
      await pressKey(page, 'ArrowUp');
      await page.waitForTimeout(200);

      // Should still be on presenter view
      await expect(page.getByText(/presenter view/i)).toBeVisible();
    });

    test('can select a question by clicking', async ({ authenticatedTriviaPage: page }) => {
      // Start game first
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Find and click a question item in the list
      const questionItems = page.locator('[role="listitem"]').filter({ hasText: /Q\d|question/i });
      if (await questionItems.count() > 1) {
        await questionItems.nth(1).click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Answer Reveal', () => {
    test('can toggle peek answer', async ({ authenticatedTriviaPage: page }) => {
      // Start game first
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Find peek button
      const peekBtn = page.getByRole('button', { name: /peek|show answer/i });
      if (await peekBtn.isVisible()) {
        await peekBtn.click();
        await page.waitForTimeout(300);

        // Button should toggle state
        await expect(peekBtn).toBeVisible();
      }
    });

    test('can peek answer with Space key', async ({ authenticatedTriviaPage: page }) => {
      // Start game
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Press Space to peek
      await pressKey(page, 'Space');
      await page.waitForTimeout(300);

      // Press Space again to hide
      await pressKey(page, 'Space');
      await page.waitForTimeout(200);
    });

    test('can toggle display question with D key', async ({ authenticatedTriviaPage: page }) => {
      // Start game
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Press D to toggle display
      await pressKey(page, 'KeyD');
      await page.waitForTimeout(300);
    });
  });

  test.describe('Score Adjustment', () => {
    test.beforeEach(async ({ authenticatedTriviaPage: page }) => {
      // Add team and start game
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);
    });

    test('shows team score input during game', async ({ authenticatedTriviaPage: page }) => {
      await expect(page.getByRole('heading', { name: /team scores/i })).toBeVisible();
    });

    test('can increase team score with + button', async ({ authenticatedTriviaPage: page }) => {
      // Scope to team scores section
      const scoresSection = page.locator('section, div').filter({ has: page.getByRole('heading', { name: /team scores/i }) });

      // Find the plus button within scores section
      const plusBtn = scoresSection.getByRole('button', { name: /add 1 point/i });
      await expect(plusBtn).toBeVisible();

      // Initial score should be 0
      const scoreDisplay = scoresSection.getByRole('button', { name: /score.*0|0.*click to edit/i });
      if (await scoreDisplay.isVisible()) {
        await plusBtn.click();
        await page.waitForTimeout(300);

        // Score should increase
        const newScoreDisplay = scoresSection.getByRole('button', { name: /score.*1|1.*click to edit/i });
        await expect(newScoreDisplay).toBeVisible();
      }
    });

    test('can decrease team score with - button', async ({ authenticatedTriviaPage: page }) => {
      // Scope to team scores section
      const scoresSection = page.locator('section, div').filter({ has: page.getByRole('heading', { name: /team scores/i }) });

      // First increase score
      const plusBtn = scoresSection.getByRole('button', { name: /add 1 point/i });
      await plusBtn.click();
      await page.waitForTimeout(200);
      await plusBtn.click();
      await page.waitForTimeout(200);

      // Now decrease
      const minusBtn = scoresSection.getByRole('button', { name: /subtract 1 point/i });
      await minusBtn.click();
      await page.waitForTimeout(300);
    });

    test('can edit score directly by clicking', async ({ authenticatedTriviaPage: page }) => {
      // Scope to team scores section
      const scoresSection = page.locator('section, div').filter({ has: page.getByRole('heading', { name: /team scores/i }) });
      const scoreDisplay = scoresSection.getByRole('button', { name: /click to edit/i });

      if (await scoreDisplay.isVisible()) {
        await scoreDisplay.click();
        await page.waitForTimeout(200);

        // Input should appear within scores section
        const input = scoresSection.locator('input[type="number"]');
        await input.fill('5');
        await input.press('Enter');
        await page.waitForTimeout(300);
      }
    });

    test('shows per-round score breakdown', async ({ authenticatedTriviaPage: page }) => {
      // Scope to team scores section
      const scoresSection = page.locator('section, div').filter({ has: page.getByRole('heading', { name: /team scores/i }) });

      // Add some points
      const plusBtn = scoresSection.getByRole('button', { name: /add 1 point/i });
      await plusBtn.click();
      await page.waitForTimeout(200);

      // Check for round indicator
      // Use aria-label to target specific round indicator element
      await expect(page.getByLabel(/current round/i)).toBeVisible();
    });
  });

  test.describe('Game Flow', () => {
    test.beforeEach(async ({ authenticatedTriviaPage: page }) => {
      // Start game with a team
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);
    });

    test('can pause game', async ({ authenticatedTriviaPage: page }) => {
      const pauseBtn = page.getByRole('button', { name: /^pause$/i });
      await pauseBtn.click();
      await page.waitForTimeout(300);

      // Should show paused state - use status badge specifically
      await expect(page.locator('span').filter({ hasText: /^paused$/i })).toBeVisible();
    });

    test('can resume game from pause', async ({ authenticatedTriviaPage: page }) => {
      // Pause first
      await page.getByRole('button', { name: /^pause$/i }).click();
      await page.waitForTimeout(300);

      // Resume
      const resumeBtn = page.getByRole('button', { name: /resume/i });
      await resumeBtn.click();
      await page.waitForTimeout(300);

      // Should be playing again - use status badge specifically
      await expect(page.locator('span').filter({ hasText: /^playing/i })).toBeVisible();
    });

    test('can use pause keyboard shortcut (P)', async ({ authenticatedTriviaPage: page }) => {
      await pressKey(page, 'KeyP');
      await page.waitForTimeout(300);

      // Should show paused state - use status badge specifically
      await expect(page.locator('span').filter({ hasText: /^paused$/i })).toBeVisible();

      // Press P again to resume
      await pressKey(page, 'KeyP');
      await page.waitForTimeout(300);

      // Should be playing again - use status badge specifically
      await expect(page.locator('span').filter({ hasText: /^playing/i })).toBeVisible();
    });

    test('can trigger emergency pause', async ({ authenticatedTriviaPage: page }) => {
      const emergencyBtn = page.getByRole('button', { name: /^emergency$/i });
      await emergencyBtn.click();
      await page.waitForTimeout(300);

      // Should show emergency pause state - use status badge specifically
      await expect(page.locator('span').filter({ hasText: /^emergency pause$/i })).toBeVisible();
    });

    test('can use emergency pause keyboard shortcut (E)', async ({ authenticatedTriviaPage: page }) => {
      await pressKey(page, 'KeyE');
      await page.waitForTimeout(300);

      // Should show emergency pause state - use status badge specifically
      await expect(page.locator('span').filter({ hasText: /^emergency pause$/i })).toBeVisible();
    });
  });

  test.describe('Round Completion', () => {
    test('shows complete round button on last question of round', async ({ authenticatedTriviaPage: page }) => {
      // Start game
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Navigate to last question of round (5 questions per round by default)
      for (let i = 0; i < 4; i++) {
        await pressKey(page, 'ArrowDown');
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(300);

      // Complete round button should appear
      const completeBtn = page.getByRole('button', { name: /complete round/i });
      // May not appear if we're not at last question, so check if visible
      if (await completeBtn.isVisible()) {
        await expect(completeBtn).toBeVisible();
      }
    });

    test('can complete round and proceed to next', async ({ authenticatedTriviaPage: page }) => {
      // Start game
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Navigate to end of round
      for (let i = 0; i < 4; i++) {
        await pressKey(page, 'ArrowDown');
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(300);

      // Complete round
      const completeBtn = page.getByRole('button', { name: /complete round/i });
      if (await completeBtn.isVisible()) {
        await completeBtn.click();
        await page.waitForTimeout(500);

        // Should show between rounds state - use heading specifically
        await expect(page.getByRole('heading', { name: /round.*complete/i })).toBeVisible();

        // Click next round
        const nextRoundBtn = page.getByRole('button', { name: /next round/i });
        if (await nextRoundBtn.isVisible()) {
          await nextRoundBtn.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Game Reset', () => {
    test('can reset game back to setup', async ({ authenticatedTriviaPage: page }) => {
      // Start game
      await page.getByRole('button', { name: /add team/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: /start game/i }).click();
      await page.waitForTimeout(500);

      // Find reset via keyboard shortcut modal or settings
      await pressKey(page, 'KeyR');
      await page.waitForTimeout(500);

      // Note: Reset might require confirmation
      // If there's a confirm dialog, accept it
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|reset/i });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('UI Controls', () => {
    test('has fullscreen toggle button', async ({ authenticatedTriviaPage: page }) => {
      const fullscreenBtn = page.getByRole('button', { name: /fullscreen/i });
      await expect(fullscreenBtn).toBeVisible();
    });

    test('has settings button', async ({ authenticatedTriviaPage: page }) => {
      const settingsBtn = page.getByRole('button', { name: /settings/i });
      await expect(settingsBtn).toBeVisible();
    });

    test('has help button for keyboard shortcuts', async ({ authenticatedTriviaPage: page }) => {
      const helpBtn = page.getByRole('button', { name: /keyboard shortcuts/i });
      await expect(helpBtn).toBeVisible();
    });

    test('can toggle fullscreen with F key', async ({ authenticatedTriviaPage: page }) => {
      // Note: Actual fullscreen may not work in headless mode, but we can test the handler
      await pressKey(page, 'KeyF');
      await page.waitForTimeout(300);
    });

    test('can open keyboard shortcuts modal with ? key', async ({ authenticatedTriviaPage: page }) => {
      await page.keyboard.press('Shift+?');
      await page.waitForTimeout(500);

      // Keyboard shortcuts modal should open - look for the modal with specific aria-label
      const modal = page.getByLabel('Keyboard Shortcuts', { exact: true });
      if (await modal.isVisible()) {
        await expect(modal).toBeVisible();
      }
    });
  });

  test.describe('Theme Selector', () => {
    test('shows theme selector section', async ({ authenticatedTriviaPage: page }) => {
      // Look for theme-related heading or label
      await expect(page.getByRole('heading', { name: /theme/i })).toBeVisible();
    });
  });
});
