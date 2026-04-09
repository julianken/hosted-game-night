# Area 4: E2E Test Strategy for Round Configuration Redesign

## Current E2E Testing Landscape

### Infrastructure Summary

All trivia E2E tests live in `e2e/trivia/` and follow these patterns:

- **Auth fixture** (`e2e/fixtures/auth.ts`): Provides `authenticatedTriviaPage` which logs in via Platform Hub OAuth, copies SSO cookies, navigates to `/play`, and auto-starts the game via the setup wizard. Tests that need the setup overlay visible use `test.use({ skipSetupDismissal: true })`.
- **Wizard dismissal helper** (`e2e/utils/helpers.ts` > `startGameViaWizard()`): Navigates to Teams step (index 2), adds N teams, navigates to Review step (index 3), clicks Start Game, and waits for the gate to detach from the DOM.
- **Test IDs in use**: `setup-gate`, `setup-gate-header`, `setup-gate-content`, `setup-gate-connection`, `setup-gate-open-display`, `wizard-step-0` through `wizard-step-3`, `wizard-step-review`, `review-edit-questions`, `review-edit-settings`, `review-edit-teams`.
- **Slider interaction**: The Settings step uses `@joolie-boolie/ui` `<Slider>` components with `label` props ("Number of Rounds", "Questions Per Round"). Playwright can target these via `getByLabel()` or `getByRole('slider')`.
- **No fixed timeouts**: Per BEA-383 convention, all waits use deterministic patterns (element visibility, state change indicators, `.toPass()` for retry logic).

### Files That Will Need Updates

| File | Impact |
|------|--------|
| `e2e/trivia/setup-overlay.spec.ts` | Settings step tests must reflect new UI (toggle + slider replace QPR slider) |
| `e2e/utils/helpers.ts` > `startGameViaWizard()` | May need updates if the wizard flow changes (e.g., new default behavior) |
| `e2e/trivia/presenter.spec.ts` | Gameplay tests rely on round/question counts produced by the wizard -- verify round structure matches expectations |
| `e2e/trivia/display.spec.ts` | Scoreboard and round completion tests depend on round count / questions per round |

### Current Settings Step (baseline for comparison)

The current `WizardStepSettings` renders two `<Slider>` components:
1. "Number of Rounds" (range 1-6, default 3)
2. "Questions Per Round" (range 3-10, default 5)

The Review step renders a per-round question grid checking `questions.filter(q => q.roundIndex === i).length` against `questionsPerRound`.

---

## Proposed E2E Test Scenarios

### Test 1: By Category toggle is ON by default

**Test name**: `Settings step shows "By Category" toggle ON by default`

**Steps**:
1. Authenticate and navigate to `/play` with `skipSetupDismissal: true`
2. Wait for hydration
3. Navigate to Settings step by clicking `[data-testid="wizard-step-1"]`
4. Locate the "By Category" toggle (via `getByRole('switch')` or `getByLabel(/by category/i)`)

**Assertions**:
- Toggle is visible
- Toggle is checked/pressed (`aria-checked="true"` or equivalent)
- "Number of Rounds" slider is visible (replaces QPR slider when toggle is ON)
- "Questions Per Round" slider is NOT visible (hidden when By Category is ON)

**Priority**: Must-have

---

### Test 2: Toggling "By Category" OFF reveals QPR slider

**Test name**: `Toggling "By Category" OFF shows Questions Per Round slider`

**Steps**:
1. Authenticate and navigate to `/play` with `skipSetupDismissal: true`
2. Navigate to Settings step
3. Verify "By Category" toggle is ON
4. Click the toggle to turn it OFF
5. Observe the slider configuration

**Assertions**:
- After toggle OFF: "Questions Per Round" slider is visible
- After toggle OFF: "Number of Rounds" slider remains visible
- After toggle OFF: The slider values reflect the current store defaults (roundsCount=3, questionsPerRound=5)

**Priority**: Must-have

---

### Test 3: Toggling "By Category" back ON hides QPR slider

**Test name**: `Toggling "By Category" back ON hides QPR slider and shows round count`

**Steps**:
1. Navigate to Settings step
2. Turn toggle OFF (verify QPR slider appears)
3. Turn toggle back ON

**Assertions**:
- "Questions Per Round" slider is NOT visible
- "Number of Rounds" slider is visible
- The round count value may have been recalculated based on category count

**Priority**: Must-have

---

### Test 4: Number of Rounds slider interaction in By Category mode

**Test name**: `Number of Rounds slider adjusts round count in By Category mode`

**Steps**:
1. Navigate to Settings step with By Category ON (default)
2. Locate the "Number of Rounds" slider via `getByLabel(/number of rounds/i)` or `getByRole('slider', { name: /number of rounds/i })`
3. Read its current value
4. Interact with the slider to change the value (use `fill()` on the underlying input, or `page.keyboard.press('ArrowRight')` after focusing it)

**Assertions**:
- Slider value updates to the new amount
- Value stays within the allowed range
- The displayed value label (if any) reflects the change

**Priority**: Must-have

---

### Test 5: Review step shows per-round question grid with correct redistribution

**Test name**: `Review step shows correct question distribution across rounds`

**Steps**:
1. Navigate to `/play` with `skipSetupDismissal: true`
2. Ensure questions are loaded (step 0 has questions -- the wizard starts with sample questions or the user adds them)
3. Navigate to Settings step, verify By Category is ON, note the round count
4. Navigate to Review step (click `[data-testid="wizard-step-3"]` -- may need teams first, or navigate directly)
5. Locate the per-round question grid inside `[data-testid="wizard-step-review"]`

**Assertions**:
- The grid shows exactly N round entries (matching the round count from Settings)
- Each round entry displays a question count (e.g., "Round 1: 3 questions")
- The total across all rounds equals the total question count
- Color coding: rounds with adequate questions show success color, rounds with issues show warning

**Priority**: Must-have

---

### Test 6: Review step updates after changing round count

**Test name**: `Review step grid updates when round count is changed`

**Steps**:
1. Navigate to Settings step, note default round count (e.g., 3)
2. Navigate to Review step, count the round entries in the grid
3. Go back to Settings step, change the round count (e.g., from 3 to 4)
4. Return to Review step

**Assertions**:
- Grid now shows 4 round entries (matching the new count)
- Questions are redistributed across the new number of rounds
- Total question count across all rounds remains the same

**Priority**: Must-have

---

### Test 7: Start game with By Category ON produces correct round structure

**Test name**: `Game starts with correct rounds when By Category is ON`

**Steps**:
1. Load with `skipSetupDismissal: true`
2. Verify questions are loaded on step 0
3. Navigate to Settings, verify By Category ON, note round count
4. Navigate to Teams, add a team
5. Navigate to Review, click Start Game
6. Wait for gate to detach
7. Verify game state is "Playing"
8. Check the round heading in the presenter view

**Assertions**:
- Game status shows "Playing"
- Presenter view shows "Round 1" heading
- The question list reflects the distributed question count per round (questions are organized by category into rounds)

**Priority**: Must-have

---

### Test 8: Start game with By Category OFF produces correct round structure

**Test name**: `Game starts with correct rounds when By Category is OFF (manual QPR)`

**Steps**:
1. Load with `skipSetupDismissal: true`
2. Navigate to Settings, toggle By Category OFF
3. Note the QPR value (default 5) and round count (default 3)
4. Navigate to Teams, add a team
5. Navigate to Review, verify the grid shows 3 rounds with 5 questions each
6. Click Start Game
7. Wait for gate to detach

**Assertions**:
- Game status shows "Playing"
- Presenter view shows "Round 1" heading
- Each round has the expected number of questions matching QPR setting

**Priority**: Must-have

---

### Test 9: startGameViaWizard helper still works with new defaults

**Test name**: `startGameViaWizard utility successfully starts game with new By Category default`

**Steps**:
1. Use the standard `authenticatedTriviaPage` fixture (which calls `startGameViaWizard` internally)
2. Verify the game starts without errors

**Assertions**:
- Game status shows "Playing"
- No setup gate is visible (detached from DOM)
- This is a regression guard -- the helper skips Settings step entirely (goes from Questions -> Teams -> Review -> Start), so the By Category default must not introduce blocking validation

**Priority**: Must-have (regression safety net)

---

### Test 10: Accessibility -- toggle and slider have proper ARIA attributes

**Test name**: `By Category toggle and round slider have accessible labels and roles`

**Steps**:
1. Navigate to Settings step
2. Locate the By Category toggle
3. Locate the Number of Rounds slider

**Assertions**:
- Toggle has `role="switch"` and `aria-checked` attribute
- Toggle has an accessible label (either `aria-label` or associated `<label>`)
- Slider has `role="slider"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
- Slider has an accessible label
- Both elements meet 44x44px minimum touch target

**Priority**: Nice-to-have

---

## Implementation Notes

### Helper Updates Required

The `startGameViaWizard()` helper in `e2e/utils/helpers.ts` currently follows this path:

```
Step 2 (Teams) -> Add teams -> Step 3 (Review) -> Start Game
```

It skips Steps 0 and 1 entirely. This should continue to work with the new By Category default as long as:
- The default By Category ON mode auto-distributes questions without requiring manual intervention
- No new blocking validation is introduced that requires visiting the Settings step

If the new feature introduces a blocking validation that requires the Settings step to be visited, the helper must be updated to navigate through Step 1 as well.

### Test ID Conventions

New test IDs to add to the implementation (suggested):

| Component | data-testid | Purpose |
|-----------|-------------|---------|
| By Category toggle | `settings-by-category-toggle` | Toggle switch for category-based rounds |
| Round count slider | `settings-round-count-slider` | Number of Rounds slider (visible in both modes) |
| QPR slider | `settings-qpr-slider` | Questions Per Round slider (visible only when By Category OFF) |
| Review round grid | `review-round-grid` | Container for per-round question counts |
| Individual round entry | `review-round-{index}` | Each round's question count display |

### Selector Strategy

Prefer semantic selectors over test IDs per project conventions:

```typescript
// Good: semantic, resilient
page.getByRole('switch', { name: /by category/i })
page.getByRole('slider', { name: /number of rounds/i })
page.getByRole('slider', { name: /questions per round/i })

// Fallback: test ID when semantic is ambiguous
page.locator('[data-testid="settings-by-category-toggle"]')
```

### Deterministic Wait Patterns

All new tests must follow the BEA-383 convention -- no `waitForTimeout()`:

```typescript
// Pattern 1: Wait for element visibility after toggle
await toggle.click();
await expect(qprSlider).toBeVisible();

// Pattern 2: Wait for state change after slider interaction
await slider.fill('4');
await expect(page.getByText(/4 rounds/i)).toBeVisible();

// Pattern 3: Retry for complex conditions
await expect(async () => {
  const roundEntries = await page.locator('[data-testid^="review-round-"]').count();
  expect(roundEntries).toBe(4);
}).toPass({ timeout: 5000 });
```

---

## Priority Summary

| # | Test | Priority |
|---|------|----------|
| 1 | By Category toggle default ON | Must-have |
| 2 | Toggle OFF reveals QPR slider | Must-have |
| 3 | Toggle back ON hides QPR slider | Must-have |
| 4 | Number of Rounds slider interaction | Must-have |
| 5 | Review grid shows correct distribution | Must-have |
| 6 | Review grid updates after changing rounds | Must-have |
| 7 | Start game with By Category ON | Must-have |
| 8 | Start game with By Category OFF | Must-have |
| 9 | startGameViaWizard regression guard | Must-have |
| 10 | Accessibility (ARIA attributes, touch targets) | Nice-to-have |

**Total: 9 must-have, 1 nice-to-have**
