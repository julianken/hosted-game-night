# Phase 2 Iterator 5: Concrete E2E Test Code

## Summary

Concrete Playwright test code for the top 5 must-have round configuration E2E scenarios. Written against the patterns established in `e2e/trivia/setup-overlay.spec.ts`, the `startGameViaWizard()` helper, and the auth fixture.

These tests target the **new** `WizardStepSettings` UI that will include a "By Category" toggle. They are written as ready-to-paste code that an implementer can drop into a new spec file once the feature code lands.

---

## New Test File: `e2e/trivia/round-config.spec.ts`

```typescript
/**
 * Trivia Round Configuration E2E Tests
 *
 * Tests the "By Category" toggle in the Settings step (wizard step 1)
 * and its effects on the Review step question grid and game start flow.
 *
 * The Settings step exposes two modes:
 *   - By Category ON (default): questions grouped by category into rounds.
 *     Only the "Number of Rounds" slider is visible. QPR is auto-derived.
 *   - By Category OFF: manual "Questions Per Round" slider appears alongside
 *     the "Number of Rounds" slider. Classic fixed-QPR behavior.
 *
 * Tests 1, 2, 5: Settings/Review step UI assertions (setup overlay visible)
 * Test 7: Full game start flow with By Category ON
 * Test 9: Regression guard for startGameViaWizard helper
 */
import { test, expect } from '../fixtures/auth';
import { waitForHydration, startGameViaWizard } from '../utils/helpers';

// ---------------------------------------------------------------------------
// Tests 1, 2, 5, 7: Need the setup overlay visible
// ---------------------------------------------------------------------------
test.describe('Trivia Round Configuration', () => {
  test.use({ skipSetupDismissal: true });

  test.beforeEach(async ({ authenticatedTriviaPage: page }) => {
    await waitForHydration(page);
  });

  // =========================================================================
  // Test 1: By Category toggle is ON by default
  // =========================================================================
  test('Settings step shows "By Category" toggle ON by default @critical', async ({
    authenticatedTriviaPage: page,
  }) => {
    const gate = page.locator('[data-testid="setup-gate"]');

    // Navigate to Settings step (wizard step index 1)
    await page.locator('[data-testid="wizard-step-1"]').click();

    // Locate the "By Category" toggle via its accessible role.
    // The toggle renders as role="switch" with an associated label.
    const byCategoryToggle = gate.getByRole('switch', { name: /by category/i });
    await expect(byCategoryToggle).toBeVisible();

    // Toggle should be ON (checked) by default
    await expect(byCategoryToggle).toBeChecked();

    // When By Category is ON:
    // - "Number of Rounds" slider IS visible
    // - "Questions Per Round" slider is NOT visible
    const roundsSlider = gate.getByRole('slider', { name: /number of rounds/i });
    await expect(roundsSlider).toBeVisible();

    const qprSlider = gate.getByRole('slider', { name: /questions per round/i });
    await expect(qprSlider).not.toBeVisible();
  });

  // =========================================================================
  // Test 2: Toggling By Category OFF reveals QPR slider
  // =========================================================================
  test('Toggling "By Category" OFF shows Questions Per Round slider @critical', async ({
    authenticatedTriviaPage: page,
  }) => {
    const gate = page.locator('[data-testid="setup-gate"]');

    // Navigate to Settings step
    await page.locator('[data-testid="wizard-step-1"]').click();

    // Verify toggle is ON initially
    const byCategoryToggle = gate.getByRole('switch', { name: /by category/i });
    await expect(byCategoryToggle).toBeChecked();

    // QPR slider should not be visible while By Category is ON
    const qprSlider = gate.getByRole('slider', { name: /questions per round/i });
    await expect(qprSlider).not.toBeVisible();

    // Click the toggle to turn it OFF
    await byCategoryToggle.click();

    // Toggle should now be OFF (unchecked)
    await expect(byCategoryToggle).not.toBeChecked();

    // After toggle OFF: QPR slider becomes visible
    await expect(qprSlider).toBeVisible();

    // After toggle OFF: Rounds slider remains visible
    const roundsSlider = gate.getByRole('slider', { name: /number of rounds/i });
    await expect(roundsSlider).toBeVisible();
  });

  // =========================================================================
  // Test 5: Review step shows correct question distribution
  // =========================================================================
  test('Review step shows correct question distribution across rounds @high', async ({
    authenticatedTriviaPage: page,
  }) => {
    const gate = page.locator('[data-testid="setup-gate"]');

    // Step 0 (Questions) should have sample questions loaded.
    // Verify questions exist by checking the question count banner.
    const questionsBanner = gate.getByText(/\d+ questions? loaded/i);
    await expect(questionsBanner).toBeVisible();

    // Extract the total question count from the banner text
    const bannerText = await questionsBanner.textContent();
    const totalMatch = bannerText?.match(/(\d+)\s+questions?\s+loaded/i);
    const totalQuestions = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    expect(totalQuestions).toBeGreaterThan(0);

    // Navigate to Settings step, note the round count
    await page.locator('[data-testid="wizard-step-1"]').click();

    // By Category should be ON by default
    const byCategoryToggle = gate.getByRole('switch', { name: /by category/i });
    await expect(byCategoryToggle).toBeChecked();

    // Read the current round count from the slider's output value
    const roundsSlider = gate.getByRole('slider', { name: /number of rounds/i });
    await expect(roundsSlider).toBeVisible();
    const roundsValue = await roundsSlider.getAttribute('aria-valuenow');
    const roundsCount = parseInt(roundsValue ?? '3', 10);

    // Navigate to Review step
    await page.locator('[data-testid="wizard-step-3"]').click();
    const reviewContent = page.locator('[data-testid="wizard-step-review"]');
    await expect(reviewContent).toBeVisible();

    // The per-round question grid should show exactly roundsCount entries.
    // Each entry matches "Round N: X question(s)".
    const roundEntries = reviewContent.getByText(/^Round \d+: \d+ questions?$/);
    await expect(roundEntries).toHaveCount(roundsCount);

    // Verify that the sum of all round question counts equals total questions.
    // Use .toPass() for retry since the grid may re-render after redistribution.
    await expect(async () => {
      const allEntryTexts = await roundEntries.allTextContents();
      let sum = 0;
      for (const text of allEntryTexts) {
        const countMatch = text.match(/(\d+) questions?$/);
        if (countMatch) {
          sum += parseInt(countMatch[1], 10);
        }
      }
      expect(sum).toBe(totalQuestions);
    }).toPass({ timeout: 5000 });
  });

  // =========================================================================
  // Test 7: Start game with By Category ON
  // =========================================================================
  test('Game starts with correct rounds when By Category is ON @critical', async ({
    authenticatedTriviaPage: page,
  }) => {
    const gate = page.locator('[data-testid="setup-gate"]');

    // Verify questions are loaded on Step 0
    await expect(gate.getByText(/\d+ questions? loaded/i)).toBeVisible();

    // Navigate to Settings step and verify By Category is ON
    await page.locator('[data-testid="wizard-step-1"]').click();
    const byCategoryToggle = gate.getByRole('switch', { name: /by category/i });
    await expect(byCategoryToggle).toBeChecked();

    // Navigate to Teams step and add a team
    await page.locator('[data-testid="wizard-step-2"]').click();
    const addTeamBtn = gate.getByRole('button', { name: /add team/i });
    await addTeamBtn.click();
    await expect(gate.getByText(/table 1/i)).toBeVisible();

    // Navigate to Review step
    await page.locator('[data-testid="wizard-step-3"]').click();
    const reviewContent = page.locator('[data-testid="wizard-step-review"]');
    await expect(reviewContent).toBeVisible();

    // Start Game button should be enabled (questions + 1 team = valid)
    const startBtn = reviewContent.getByRole('button', { name: /start game/i });
    await expect(startBtn).toBeEnabled();

    // Click Start Game
    await startBtn.click();

    // Wait for gate to fade out and detach
    await gate.waitFor({ state: 'detached', timeout: 7000 });

    // Verify game is in playing state
    await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();

    // Verify presenter view shows "Round 1" heading
    await expect(page.getByRole('heading', { name: /round 1/i }).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Test 9: startGameViaWizard helper regression guard
// ---------------------------------------------------------------------------
test.describe('startGameViaWizard Regression', () => {
  // NOTE: skipSetupDismissal is NOT set here (defaults to false).
  // The auth fixture will call startGameViaWizard() automatically.

  test.beforeEach(async ({ authenticatedTriviaPage: page }) => {
    await waitForHydration(page);
  });

  test('startGameViaWizard helper successfully starts game with new By Category default @critical', async ({
    authenticatedTriviaPage: page,
  }) => {
    // The authenticatedTriviaPage fixture already called startGameViaWizard().
    // If we reach this point, the helper succeeded.

    // Verify: no setup gate visible (it was detached after game start)
    const gate = page.locator('[data-testid="setup-gate"]');
    await expect(gate).toHaveCount(0);

    // Verify: game status shows "Playing"
    await expect(page.locator('span').filter({ hasText: /^Playing/i })).toBeVisible();

    // Verify: presenter view is functional (round heading visible)
    await expect(page.getByRole('heading', { name: /round 1/i }).first()).toBeVisible();

    // This test guards against the helper breaking when the By Category
    // toggle is added. The helper skips the Settings step entirely
    // (goes Questions -> Teams -> Review -> Start), so the default
    // By Category ON mode must not introduce blocking validation that
    // requires visiting the Settings step.
  });
});
```

---

## Selector Reference

All selectors used above, mapped to the component that renders them:

| Selector | Method | Source Component |
|----------|--------|-----------------|
| `[data-testid="setup-gate"]` | `page.locator()` | `SetupGate.tsx` |
| `[data-testid="wizard-step-0"]` ... `[data-testid="wizard-step-3"]` | `page.locator()` | `SetupWizard.tsx` step indicators |
| `[data-testid="wizard-step-review"]` | `page.locator()` | `WizardStepReview.tsx` root div |
| `role="switch", name=/by category/i` | `getByRole()` | **New:** `WizardStepSettings.tsx` toggle (to be implemented) |
| `role="slider", name=/number of rounds/i` | `getByRole()` | `WizardStepSettings.tsx` via `<Slider label="Number of Rounds">` |
| `role="slider", name=/questions per round/i` | `getByRole()` | `WizardStepSettings.tsx` via `<Slider label="Questions Per Round">` |
| `role="button", name=/add team/i` | `getByRole()` | `WizardStepTeams.tsx` |
| `role="button", name=/start game/i` | `getByRole()` | `WizardStepReview.tsx` |
| `/\d+ questions? loaded/i` | `getByText()` | `WizardStepQuestions.tsx` count banner |
| `/^Round \d+: \d+ questions?$/` | `getByText()` | `WizardStepReview.tsx` per-round grid entries |
| `span` filter `/^Playing/i` | `locator().filter()` | Game status badge in header |
| `role="heading", name=/round 1/i` | `getByRole()` | Presenter view round heading |

---

## Wait Pattern Inventory

Every wait used in these tests, confirming zero `waitForTimeout` calls:

| Pattern | Usage | Type |
|---------|-------|------|
| `await expect(element).toBeVisible()` | Element appearance after navigation or toggle | Deterministic (Pattern 1) |
| `await expect(element).toBeChecked()` | Toggle switch state verification | Deterministic (Pattern 2) |
| `await expect(element).not.toBeVisible()` | QPR slider hidden when By Category ON | Deterministic (Pattern 1) |
| `await expect(element).toBeEnabled()` | Start Game button enabled state | Deterministic (Pattern 2) |
| `gate.waitFor({ state: 'detached' })` | Overlay fade-out + DOM removal | Deterministic (lifecycle) |
| `await expect(element).toHaveCount(n)` | Round grid entry count | Deterministic (Pattern 1) |
| `await expect(async () => { ... }).toPass()` | Sum verification with retry | Retry (Pattern 3) |

---

## Implementation Prerequisites

Before these tests can pass, the implementer must:

1. **Add a `role="switch"` toggle** to `WizardStepSettings.tsx` with an accessible label containing "By Category" (e.g., via React Aria's `<Switch>` or the `@joolie-boolie/ui` `<Toggle>` component). The toggle must render with `aria-checked="true"` by default.

2. **Conditionally show/hide the QPR slider** based on the toggle state. When By Category is ON, only the "Number of Rounds" slider renders. When OFF, both "Number of Rounds" and "Questions Per Round" sliders render.

3. **Ensure `WizardStepQuestions` shows a question count banner** matching the pattern `N questions loaded` (or `N question loaded` for singular). This banner already exists in the current implementation as the success/count Pattern A.

4. **Ensure per-round grid entries in `WizardStepReview`** render text matching `Round N: X questions` (or `Round N: X question` for singular). The current implementation already renders this format (line 107 of `WizardStepReview.tsx`): `Round {i + 1}: {count} question{count !== 1 ? 's' : ''}`.

5. **No blocking validation** should require visiting the Settings step. The `startGameViaWizard` helper skips Steps 0 and 1 entirely. The By Category default must auto-distribute questions without manual intervention.

---

## Test File Placement

```
e2e/
  trivia/
    setup-overlay.spec.ts       # Existing: gate visibility, header, wizard steps, start game
    round-config.spec.ts        # NEW: By Category toggle, QPR slider, review grid, game start
    presenter.spec.ts           # Existing: gameplay after game starts
    display.spec.ts             # Existing: audience display
    ...
```

The new file is separate from `setup-overlay.spec.ts` because it tests the **round configuration feature** specifically, not the generic setup overlay mechanics. Both files use `skipSetupDismissal: true` for tests that need the overlay visible, but the concerns are distinct.
