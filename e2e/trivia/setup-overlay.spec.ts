/**
 * Trivia Setup Overlay (SetupGate) E2E Tests
 *
 * Tests the full-viewport setup overlay that covers the trivia dashboard
 * during setup mode. The overlay contains a 4-step wizard:
 *   Step 0 — Questions
 *   Step 1 — Settings
 *   Step 2 — Teams
 *   Step 3 — Review
 *
 * The game engine starts with SAMPLE_QUESTIONS loaded, so the only missing
 * piece to start a game is adding at least one team.
 */
import { test, expect } from '../fixtures/auth';
import { waitForHydration } from '../utils/helpers';

// All tests in this file need the setup overlay visible with questions already
// seeded so step 0 (Questions) is pre-satisfied. `triviaPageWithQuestions`
// gives us exactly that (no game start, no settings override).

test.describe('Trivia Setup Overlay', () => {
  test.beforeEach(async ({ triviaPageWithQuestions: page }) => {
    await waitForHydration(page);
  });

  test.describe('Gate Visibility & Layout', () => {
    test('gate is visible on initial /play load @critical', async ({ triviaPageWithQuestions: page }) => {
      const gate = page.locator('[data-testid="setup-gate"]');
      await expect(gate).toBeVisible();
    });

    test('3-column layout has inert attribute during setup @high', async ({ triviaPageWithQuestions: page }) => {
      // The 3-column layout div is the flex container below the header
      // It has aria-hidden="true" and inert={true} when in setup mode
      const layoutDiv = page.locator('div.flex.flex-1.overflow-hidden');
      await expect(layoutDiv).toHaveAttribute('aria-hidden', 'true');
      await expect(layoutDiv).toHaveAttribute('inert', '');
    });

    test('inert removed after game starts @high', async ({ triviaPageWithQuestions: page }) => {
      const gate = page.locator('[data-testid="setup-gate"]');

      // Navigate to Teams step and add a team
      await page.locator('[data-testid="wizard-step-2"]').click();
      const addTeamBtn = gate.getByRole('button', { name: /add team/i });
      await addTeamBtn.click();
      await expect(gate.getByText(/table 1/i)).toBeVisible();

      // Navigate to Review step and start the game
      await page.locator('[data-testid="wizard-step-3"]').click();
      const startBtn = gate.getByRole('button', { name: /start game/i });
      await expect(startBtn).toBeEnabled();
      await startBtn.click();

      // Wait for gate to be removed
      await gate.waitFor({ state: 'detached', timeout: 7000 });

      // Verify inert is removed from the 3-column layout
      const layoutDiv = page.locator('div.flex.flex-1.overflow-hidden');
      await expect(layoutDiv).not.toHaveAttribute('aria-hidden', 'true');
      // inert attribute should not be present
      await expect(layoutDiv).not.toHaveAttribute('inert', '');
    });
  });

  test.describe('Header', () => {
    test('header shows "Trivia" and "Setup" badge @high', async ({ triviaPageWithQuestions: page }) => {
      const header = page.locator('[data-testid="setup-gate-header"]');
      await expect(header).toBeVisible();

      // Check for "Trivia" heading
      await expect(header.getByRole('heading', { name: /trivia/i })).toBeVisible();

      // Check for "Setup" badge text
      await expect(header.getByText('Setup')).toBeVisible();
    });

    test('header shows connection indicator @high', async ({ triviaPageWithQuestions: page }) => {
      const connectionIndicator = page.locator('[data-testid="setup-gate-connection"]');
      await expect(connectionIndicator).toBeVisible();
    });

    test('Open Display button is visible @high', async ({ triviaPageWithQuestions: page }) => {
      const openDisplayBtn = page.locator('[data-testid="setup-gate-open-display"]');
      await expect(openDisplayBtn).toBeVisible();
      await expect(openDisplayBtn).toHaveText('Open Display');
    });
  });

  test.describe('Wizard Steps', () => {
    test('step 0 content renders Questions heading inside gate @high', async ({ triviaPageWithQuestions: page }) => {
      const gateContent = page.locator('[data-testid="setup-gate-content"]');
      await expect(gateContent).toBeVisible();

      // Step 0 is active by default — "Questions" heading should be visible
      await expect(gateContent.getByRole('heading', { name: /questions/i })).toBeVisible();
    });

    test('wizard shows 4 step indicators @high', async ({ triviaPageWithQuestions: page }) => {
      // Verify all 4 step indicator buttons exist
      for (let i = 0; i < 4; i++) {
        const step = page.locator(`[data-testid="wizard-step-${i}"]`);
        await expect(step).toBeVisible();
      }
    });

    test('review step shows validation banner @high', async ({ triviaPageWithQuestions: page }) => {
      // Navigate to the Review step (step 3)
      await page.locator('[data-testid="wizard-step-3"]').click();

      // The review step should show a validation banner
      // With 0 teams, there should be a blocking issue banner
      const reviewContent = page.locator('[data-testid="wizard-step-review"]');
      await expect(reviewContent).toBeVisible();

      // Should show the "Cannot start" banner (destructive/red) since no teams are added
      await expect(reviewContent.getByText(/cannot start/i)).toBeVisible();
    });
  });

  test.describe('Start Game Flow', () => {
    test('Start Game disabled with no teams @critical', async ({ triviaPageWithQuestions: page }) => {
      // Navigate to Review step
      await page.locator('[data-testid="wizard-step-3"]').click();

      const reviewContent = page.locator('[data-testid="wizard-step-review"]');
      await expect(reviewContent).toBeVisible();

      // Start Game button should be disabled (no teams)
      const startBtn = reviewContent.getByRole('button', { name: /start game/i });
      await expect(startBtn).toBeVisible();
      await expect(startBtn).toBeDisabled();
    });

    test('Start Game enabled with valid state; fade + detach on click @critical', async ({ triviaPageWithQuestions: page }) => {
      const gate = page.locator('[data-testid="setup-gate"]');

      // Add a team via the Teams step
      await page.locator('[data-testid="wizard-step-2"]').click();
      const addTeamBtn = gate.getByRole('button', { name: /add team/i });
      await addTeamBtn.click();
      await expect(gate.getByText(/table 1/i)).toBeVisible();

      // Navigate to Review step
      await page.locator('[data-testid="wizard-step-3"]').click();

      const reviewContent = page.locator('[data-testid="wizard-step-review"]');
      await expect(reviewContent).toBeVisible();

      // Start Game button should now be enabled
      const startBtn = reviewContent.getByRole('button', { name: /start game/i });
      await expect(startBtn).toBeEnabled();

      // Click Start Game
      await startBtn.click();

      // Gate should start its fade-out animation (opacity-0 class added)
      // Then detach from DOM after the animation completes
      await gate.waitFor({ state: 'detached', timeout: 7000 });

      // Verify game is in playing state
      await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();
    });
  });

});
