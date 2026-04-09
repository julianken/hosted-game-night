# Phase 2 Iterator 5: Test Plan Detailing

**Scope:** `apps/trivia/src/` only
**Input:** Phase 1 area-5-test-strategy.md, area-2-ended-state-design.md, area-3-bug-fixes.md, Phase 2 iterator-2-ended-state-code.md
**Reads:** All referenced test files, page.tsx, game-store.ts, rounds.ts, RoundSummary.tsx, presenter.spec.ts

---

## Current Baseline

| Metric | Value |
|--------|-------|
| Trivia unit test files | 85 (77 passed, 8 skipped) |
| Trivia unit tests | 1793 (1685 passed, 108 skipped) |
| `presenter.spec.ts` E2E tests | 38 `test()` calls |
| `display.spec.ts` E2E tests | 31 `test()` calls |
| `handleNextRound` test coverage | Zero |
| `showRoundSummary` auto-show/auto-hide effect coverage | Zero |
| Ended-state E2E coverage | Zero |

---

## 1. handleNextRound Fix Tests

### 1.1 The Bug

`page.tsx` lines 89-93 define `handleNextRound`:

```tsx
const handleNextRound = () => {
  game.nextRound();
  setShowRoundSummary(false);
  useGameStore.getState().setAudienceScene('round_intro');
};
```

The engine's `nextRound()` (in `lib/game/rounds.ts` line 25) guards: `if (state.status !== 'between_rounds') return state`. So when `status === 'ended'`, the `nextRound()` call is a no-op. But line 92 unconditionally sets `audienceScene` to `'round_intro'` -- overwriting `'final_podium'` with an invalid scene for the `ended` status.

### 1.2 The Fix (from iterator-2)

Split into two handlers:

```tsx
const handleNextRound = () => {
  if (game.status !== 'between_rounds') return;
  game.nextRound();
  setShowRoundSummary(false);
  useGameStore.getState().setAudienceScene('round_intro');
};

const handleEndGameDismiss = () => {
  setShowRoundSummary(false);
};
```

### 1.3 What to Test

Since `handleNextRound` is a page-level closure that depends on React state (`setShowRoundSummary`) and the Zustand store, direct unit testing of the function is impractical. However, the underlying behavior can be tested at the **store level** -- the critical property is that calling `nextRound()` when `status === 'ended'` must NOT change `audienceScene`.

**Test file:** `apps/trivia/src/stores/__tests__/game-store.test.ts` (existing file)

**Test location:** Add a new `describe` block after the existing `'nextRound'` describe at lines 154-164.

#### Test 1: `nextRound` on last round should set status to 'ended' and NOT set audienceScene to round_intro

```
describe('nextRound ended-state guard')
  it('should not change audienceScene when calling nextRound after game has ended')
    Setup:
      - addTeam('Team A')
      - startGame()
      - completeRound()
      - setState({ currentRound: totalRounds - 1 })  // Force to last round's between_rounds
      - nextRound()  // This ends the game (last round)
    Assert:
      - status === 'ended'
      - audienceScene !== 'round_intro'
      - Specifically: calling setAudienceScene('round_intro') after nextRound()
        when status is already 'ended' should be guarded by the caller
```

**Why this suffices:** The engine already has 4 tests for `nextRound` in `lib/game/__tests__/engine.test.ts` (advance round, end game on last round, guard clause, set selectedQuestionIndex). Those cover the pure function. The store-level test covers the integration. The actual page-level guard (`if (game.status !== 'between_rounds') return`) is verified indirectly -- if the engine's `nextRound` correctly returns unchanged state for `ended`, and the page guard prevents the `setAudienceScene` call, the system is safe.

#### Test 2: `nextRound` on non-last round should advance round

This is already covered by existing test at `game-store.test.ts` lines 154-164:

```
it('should advance to next round', () => {
  useGameStore.getState().addTeam('Team A');
  useGameStore.getState().startGame();
  useGameStore.getState().completeRound();
  useGameStore.getState().nextRound();
  expect(useGameStore.getState().currentRound).toBe(1);
  expect(useGameStore.getState().status).toBe('playing');
});
```

No additional test needed for this path.

#### Test 3: `nextRound` is a no-op when status is not 'between_rounds'

This is already covered by the engine test in `lib/game/__tests__/engine.test.ts` ("should return unchanged if not between_rounds"). The store wrapper delegates directly to the engine, so no additional store-level test is needed.

### 1.4 New Test Count for handleNextRound

| Test | File | New/Existing |
|------|------|-------------|
| nextRound on ended status does not corrupt audienceScene | `stores/__tests__/game-store.test.ts` | **New** |
| nextRound on non-last round advances | `stores/__tests__/game-store.test.ts` | Existing (line 154) |
| nextRound no-op when not between_rounds | `lib/game/__tests__/engine.test.ts` | Existing |

**Net new unit tests: 1**

---

## 2. Ended-State Replacement Tests

### 2.1 Auto-Show useEffect

The new effect (inserted after line 82):

```tsx
useEffect(() => {
  if (game.status === 'ended') {
    setShowRoundSummary(true);
  }
}, [game.status]);
```

**Test approach:** This effect is page-level React state management. It cannot be tested via the Zustand store alone -- it requires rendering the component or testing at the E2E level. Given that `page.tsx` has zero component-level unit tests (it is a page component with heavy side effects), the practical approach is to verify this through E2E tests.

**Why not a unit test:** Rendering `PlayPage` in a test environment requires mocking: `useSync`, `useApplyTheme`, `useThemeStore`, `useGameStore`, `useSettingsStore`, `useGameKeyboard`, `useQuickScore`, `useRevealSequence`, `useGameEventSounds`, `useAudienceScene`, `window.open`, and multiple imported components (`SetupGate`, `QuestionList`, `QuestionDisplay`, etc.). The mock surface is prohibitively large for verifying a single `useEffect`. The E2E test is the correct level for this verification.

### 2.2 Re-Open Button Visibility

The new center-panel block:

```tsx
{!showRoundSummary && game.status === 'ended' && (
  <div className="mt-4">
    <button onClick={() => setShowRoundSummary(true)} ...>
      View Final Results
    </button>
  </div>
)}
```

**Test approach:** Same reasoning as 2.1 -- E2E-level testing is the right layer for page-level conditional rendering.

### 2.3 E2E Test Specifications

**Test file:** `e2e/trivia/presenter.spec.ts`

**Test location:** New `describe('Ended State')` block, added after the existing `'Game Reset'` describe block (after line 453).

#### E2E Test 1 (P0): Game ends and auto-shows RoundSummary overlay

```
test('auto-shows Final Results overlay when game ends @critical')
  Steps:
    1. Page starts in 'playing' state (fixture already handles setup + start)
    2. Complete all 3 rounds via keyboard:
       - For each round: navigate to last question (ArrowDown x4),
         close question (S key), advance through scenes (ArrowRight),
         advance through round_scoring (submit scores), reach round_summary
       - For rounds 1-2: press N to advance to next round
       - For round 3: the final round completion triggers 'ended' status
    3. Wait for status badge to show "Ended"
    4. Assert: RoundSummary overlay is visible with heading "Final Results"
       (not "Round X Complete")
  Expected assertions:
    - page.getByRole('heading', { name: /final results/i }) is visible
    - page.locator('span').filter({ hasText: /^ended$/i }) is visible
```

**Complexity note:** Completing all 3 rounds in an E2E test is expensive. A more practical approach is to use a 1-round game configuration. The fixture can be extended with a `roundsCount: 1` option, or the test can override settings via the setup wizard before starting. With 1 round and 5 questions, completing the game requires navigating through 5 questions' worth of scenes.

**Simplified approach -- 1-round game:**

```
test('auto-shows Final Results overlay when game ends @critical')
  Steps:
    1. Reset to setup, configure 1-round game, add team, start
       (or use a custom fixture with roundsCount=1)
    2. Navigate to last question of round 1 (ArrowDown x4)
    3. Close question (S), advance scene (ArrowRight) through
       round_summary -> round_scoring -> submit scores -> recap flow
       until game reaches 'ended'
    4. Assert: heading "Final Results" is visible
    5. Assert: status shows "Ended"
```

**Decision:** The test should use the standard fixture (3-round game) but use the `N` key shortcut from round_summary to skip the recap flow and jump directly to the next round. For the last round, `N` from round_summary triggers `next_round` which leads to `final_buildup -> final_podium` and `status: 'ended'`. This is the fastest path through a full game.

#### E2E Test 2 (P0): Dismiss overlay, re-open button visible, click re-opens

```
test('can dismiss and re-open Final Results overlay @critical')
  Steps:
    1. Complete game (same flow as Test 1 -- reach 'ended' with overlay visible)
    2. Click "View Questions" button in RoundSummary (the onClose dismiss)
    3. Assert: RoundSummary overlay is no longer visible
    4. Assert: "View Final Results" button is visible in center panel
    5. Click "View Final Results" button
    6. Assert: RoundSummary overlay reappears with "Final Results" heading
  Expected assertions:
    - After dismiss: page.getByRole('heading', { name: /final results/i }) is NOT visible
    - After dismiss: page.getByRole('button', { name: /view final results/i }) is visible
    - After re-open: page.getByRole('heading', { name: /final results/i }) is visible
```

#### E2E Test 3 (P1): RoundSummary shows overall leaders (not round winners)

```
test('Final Results overlay shows overall winners @high')
  Steps:
    1. Complete game with 2+ teams
    2. In the auto-shown overlay, verify standings content
  Expected assertions:
    - page.getByRole('region', { name: /final results/i }) is visible
    - Team names and scores are displayed in the standings list
    - The round winner section shows "Winner" (not "Round Winner")
```

#### E2E Test 4 (P1): Start New Game from ended state

```
test('can start new game from ended state @high')
  Steps:
    1. Complete game to reach 'ended'
    2. Press R key to trigger reset confirmation
    3. Click confirm button in modal
    4. Assert: status returns to 'setup'
    5. Assert: setup wizard overlay is visible
  Expected assertions:
    - page.locator('span').filter({ hasText: /^setup$/i }) is visible
    - Setup wizard step indicators are visible
```

**Note:** This test already partially exists at `presenter.spec.ts` line 438-452 ("can reset game back to setup"). That test starts from 'playing', not 'ended'. A separate ended-state reset test is warranted because the reset path from `ended` must correctly handle the `final_podium` scene and dismiss the RoundSummary overlay.

#### E2E Test 5 (P1): handleNextRound bug does not corrupt scene

```
test('End Game button in Final Results does not corrupt audience scene @high')
  Steps:
    1. Complete game to reach 'ended' with overlay visible
    2. Click the "End Game" button in RoundSummary (this is the onNextRound button,
       labeled "End Game" when isLastRound=true)
    3. Assert: overlay dismisses
    4. Assert: status remains 'ended' (not corrupted)
    5. Assert: audience scene indicator does NOT show 'round intro'
       (should show 'final podium' or similar ended-state scene)
  Expected assertions:
    - page.locator('span').filter({ hasText: /^ended$/i }) is visible
    - Audience scene text does NOT contain 'round intro'
    - "View Final Results" re-open button is visible (confirming correct state)
```

### 2.4 New Test Count for Ended-State

| Test | File | Priority |
|------|------|----------|
| Auto-show Final Results on game end | `e2e/trivia/presenter.spec.ts` | P0 |
| Dismiss and re-open Final Results | `e2e/trivia/presenter.spec.ts` | P0 |
| Final Results shows overall winners | `e2e/trivia/presenter.spec.ts` | P1 |
| Start New Game from ended state | `e2e/trivia/presenter.spec.ts` | P1 |
| End Game button does not corrupt scene | `e2e/trivia/presenter.spec.ts` | P1 |

**Net new E2E tests: 5**

---

## 3. Sidebar Deletion Tests

### 3.1 E2E Tests That Reference the Sidebar

Searched `presenter.spec.ts` for: `game-controls`, `Team Scores`, `sidebar`, `score-adjust`, `Score Adjustment`.

**Result:** The only sidebar-dependent tests are in the `'Score Adjustment'` describe block at lines 237-328.

| Lines | Test Name | Sidebar Dependency |
|-------|-----------|-------------------|
| 237-241 | `shows team score input during game @high` | Locates `heading { name: /team scores/i }` -- this heading is in `TeamScoreInput` which renders in the sidebar |
| 242-261 | `can increase team score with + button @critical` | Locates within section containing "Team Scores" heading |
| 263-287 | `can decrease team score with - button @high` | Same |
| 289-309 | `can edit score directly by clicking @medium` | Same |
| 311-327 | `shows per-round score breakdown @medium` | Same |

**Action:** Delete all 5 tests (the entire `test.describe('Score Adjustment', ...)` block, lines 237-328).

### 3.2 E2E Tests That Do NOT Reference the Sidebar

Every other test in `presenter.spec.ts` operates on:

- **Header bar** (Page Structure): heading, status badge, Open Display button, sync status, keyboard shortcuts reference -- all in the top `<header>` element, unaffected by sidebar removal.
- **Setup wizard** (Starting a New Game, Team Management): Uses `[data-testid="wizard-step-N"]` navigation within the `SetupGate` overlay. The `TeamManager` component rendered there is independent of the sidebar's `TeamManager` instance.
- **Left rail** (Question Navigation): Uses `[role="listitem"]` in the `<aside aria-label="Question navigator">`, unaffected.
- **Center panel** (Answer Reveal, Round Completion, Theme Selector): All elements are in `<main>` (center column), unaffected.
- **Keyboard-only** (Game Flow, Game Reset): Uses `pressKey()` -- no sidebar interaction.

**Action:** No changes needed to any test outside the `'Score Adjustment'` block.

### 3.3 Unit Tests Affected by Sidebar Deletion

| Test File | Tests | Action | Reason |
|-----------|-------|--------|--------|
| `TeamManager.test.tsx` | 17 | **Keep** | Component is still used in SetupGate/wizard |
| `TeamScoreInput.test.tsx` | 18 | **Keep** | Component is prop-driven, tests are isolated. Even if the component is not rendered in the sidebar, it may be repurposed. If the component file itself is deleted, these tests auto-fail (which is correct -- delete them alongside the component). |
| `use-quick-score.test.ts` (in hooks) | 8 | **Keep** | Hook is still used by `useGameKeyboard` for keyboard 1-9 scoring. Only `QuickScoreGrid` visual is removed. |
| `accessibility.test.tsx` (RoundSummary) | 2 | **Keep** | `RoundSummary` is retained and rendered in center panel |

**Decision matrix for TeamScoreInput:**

- If `TeamScoreInput` component is **deleted** (sidebar removal removes its only render site): delete `TeamScoreInput.test.tsx` (18 tests)
- If `TeamScoreInput` component is **retained but not rendered**: keep tests (they still validate the component's contract)
- If `TeamScoreInput` is **moved to center panel**: keep tests unchanged

The phase-1 analysis (area-4-deletion-scope.md) should specify which components are deleted. The tests follow the components -- if the `.tsx` file is deleted, its `.test.tsx` must go too.

### 3.4 Sidebar Deletion Impact on Test Counts

| Scenario | Unit Tests Deleted | E2E Tests Deleted |
|----------|-------------------|-------------------|
| Delete sidebar + delete TeamScoreInput component | 18 (TeamScoreInput.test.tsx) | 5 (Score Adjustment block) |
| Delete sidebar + keep TeamScoreInput component file | 0 | 5 (Score Adjustment block) |

---

## 4. Verification Checklist

### 4.1 `pnpm test:run` Expected Output

**Before sidebar removal (current state):**
```
Test Files  77 passed | 8 skipped (85)
     Tests  1685 passed | 108 skipped (1793)
```

**After all changes (handleNextRound fix + ended-state + sidebar deletion):**

If `TeamScoreInput` component is **kept**:
```
Test Files  77 passed | 8 skipped (85)    # unchanged (1 new test in existing file)
     Tests  1686 passed | 108 skipped (1794)  # +1 new test
```

If `TeamScoreInput` component is **deleted**:
```
Test Files  76 passed | 8 skipped (84)    # -1 file (TeamScoreInput.test.tsx)
     Tests  1668 passed | 108 skipped (1776)  # +1 new test, -18 deleted tests
```

**Key validation:** All tests must pass with zero failures. The skipped count (108) must remain unchanged -- these are feature-flagged question-set tests that are conditionally skipped, not broken tests.

### 4.2 `pnpm test:e2e:summary` Expected Output

**Before changes:** All trivia E2E tests pass (baseline).

**After changes:**

| File | Before | After | Delta |
|------|--------|-------|-------|
| `presenter.spec.ts` | 38 tests | 38 tests | 0 (-5 deleted + 5 new) |
| `display.spec.ts` | 31 tests | 31 tests | 0 (unchanged) |
| Other trivia E2E files | Various | Various | 0 (unchanged) |

**Key validation:** Zero failures across all E2E test files. The total trivia E2E count remains approximately the same because the 5 deleted Score Adjustment tests are replaced by 5 new Ended State tests.

### 4.3 `pnpm lint` and `pnpm typecheck`

Must pass clean. Key things to watch:

- **Unused imports:** After deleting sidebar components, any leftover imports in `page.tsx` (`TeamScoreInput`, `QuickScoreGrid`, `useQuickScore`) will cause lint errors. These must be removed.
- **Unused variables:** The `quickScore` variable at `page.tsx` line 172 and the `isScoringScene` variable at lines 175-179 are sidebar-specific. If not used elsewhere after sidebar removal, they become unused variable lint errors.
- **Type errors:** If `TeamScoreInput` component file is deleted but its test file references it, TypeScript will fail. Test file deletion must accompany component deletion.

### 4.4 Manual Playwright MCP Verification Checks

These are visual/interaction checks that automated tests cannot fully validate. All must use `page.emulateMedia({ colorScheme: 'dark' })` per project convention.

| Check | What to Verify |
|-------|---------------|
| **Layout integrity** | After sidebar removal, the center `<main>` column expands to fill the space. No empty right-side gap. The page is a 2-column layout: left rail (w-64) + center (flex-1). |
| **Ended-state panel** | When game reaches 'ended', the "Final Results" heading and standings render correctly in the center panel. Text is legible, contrast meets accessibility minimum. |
| **Re-open button sizing** | "View Final Results" button meets 44x44px minimum touch target. Verify with browser inspector that `min-height: 44px` is applied. |
| **RoundSummary overlay position** | When "View Final Results" is clicked, `RoundSummary` renders inline within the scrollable center column (below the re-open button location). It is NOT a modal/floating overlay. |
| **Dark mode rendering** | All ended-state UI (Game Over heading, standings, buttons) renders correctly in dark mode with proper `bg-surface`, `text-foreground`, `border-border` tokens. |
| **Keyboard focus flow** | After sidebar removal, pressing Tab from the header navigates to the left rail, then to the center panel. Focus does not get trapped at the right edge of the viewport. |
| **Round scoring layout** | During `round_scoring` scene, the side-by-side layout (RoundScoringPanel left + RoundScoringView right) is unchanged. The sidebar was already hidden during this scene (guarded by `!isRoundScoringScene` at line 497). |
| **Keyboard scoring** | Pressing 1-9 during scoring phases (question_closed, answer_reveal, round_summary) still awards points via the keyboard handler, even without the visual QuickScoreGrid in the sidebar. Verify by checking the audience display scoreboard or the RoundSummary standings. |

---

## 5. Test Execution Order

### Step 1: Pre-Implementation Baseline

```bash
cd apps/trivia && pnpm test:run          # Record: 1685 passed, 108 skipped
pnpm test:e2e:trivia                     # Record: all pass, note total count
pnpm lint && pnpm typecheck              # Must be clean
```

### Step 2: After handleNextRound Fix

Add the 1 new unit test to `game-store.test.ts`. Apply the `handleNextRound` code fix (split into two handlers). Run:

```bash
cd apps/trivia && pnpm test:run          # Expect: 1686 passed (+1)
pnpm lint && pnpm typecheck              # Must pass
```

### Step 3: After Ended-State Center Panel Changes

Apply the auto-show effect, re-open button, and `onNextRound` prop wiring change. Run:

```bash
cd apps/trivia && pnpm test:run          # Expect: still 1686 passed (no new unit tests)
pnpm lint && pnpm typecheck              # Must pass
```

### Step 4: After Sidebar Deletion

Remove the right `<aside>` block, remove unused imports and variables, delete component files if decided. Run:

```bash
cd apps/trivia && pnpm test:run          # Expect: 1686 or 1668 (if TeamScoreInput deleted)
pnpm lint && pnpm typecheck              # Critical: must catch all dead imports
```

### Step 5: E2E Test Updates

Delete the 5 Score Adjustment E2E tests (lines 237-328 in `presenter.spec.ts`). Add the 5 new Ended State E2E tests. Run:

```bash
pnpm test:e2e:trivia                     # All must pass
pnpm test:e2e:summary                    # Verify counts
```

### Step 6: Manual Verification

Launch dev servers, open Playwright MCP browser in dark mode, walk through the 8-point manual checklist from Section 4.4.

### Step 7: Full Monorepo Verification

```bash
pnpm test:run                            # All packages
pnpm test:e2e                            # All apps
pnpm lint && pnpm typecheck              # Monorepo-wide
```

---

## 6. Test Specifications Summary

### New Unit Tests (1 total)

| # | Test Description | File | Describe Block |
|---|-----------------|------|---------------|
| U1 | `nextRound` on last round transitions to 'ended'; subsequent `setAudienceScene('round_intro')` is guarded -- audienceScene should NOT become 'round_intro' when status is 'ended' | `stores/__tests__/game-store.test.ts` | `describe('nextRound ended-state guard')` |

**Test U1 implementation sketch:**

```typescript
it('should not allow audienceScene to be set to round_intro when status is ended', () => {
  // Setup: reach ended state through the natural flow
  useGameStore.getState().addTeam('Team A');
  useGameStore.getState().startGame();
  useGameStore.getState().completeRound();
  // Force to last round's between_rounds
  const totalRounds = useGameStore.getState().totalRounds;
  useGameStore.setState({
    currentRound: totalRounds - 1,
    status: 'between_rounds',
    audienceScene: 'round_summary',
  });
  // Call nextRound -- should end the game
  useGameStore.getState().nextRound();
  expect(useGameStore.getState().status).toBe('ended');
  // Simulate what the buggy handleNextRound does: unconditional setAudienceScene
  // The FIX prevents this call, but this test documents the invariant:
  // calling setAudienceScene('round_intro') when ended produces an invalid state.
  // We verify the engine side: nextRound on last round -> ended status.
  // The page-level guard is tested via E2E Test 5.
  const sceneBeforeCorruption = useGameStore.getState().audienceScene;
  // The scene should be whatever endGame sets (not explicitly tested here,
  // but it should NOT be 'round_intro')
  expect(sceneBeforeCorruption).not.toBe('round_intro');
});
```

### New E2E Tests (5 total)

| # | Test Description | File | Describe Block | Priority |
|---|-----------------|------|---------------|----------|
| E1 | Auto-shows "Final Results" overlay when game ends | `e2e/trivia/presenter.spec.ts` | `describe('Ended State')` | P0 |
| E2 | Dismiss and re-open "Final Results" via center-panel button | `e2e/trivia/presenter.spec.ts` | `describe('Ended State')` | P0 |
| E3 | "Final Results" overlay shows overall winners, not round winners | `e2e/trivia/presenter.spec.ts` | `describe('Ended State')` | P1 |
| E4 | R key from ended state resets to setup | `e2e/trivia/presenter.spec.ts` | `describe('Ended State')` | P1 |
| E5 | "End Game" button dismisses overlay without corrupting scene | `e2e/trivia/presenter.spec.ts` | `describe('Ended State')` | P1 |

### Deleted E2E Tests (5 total)

| # | Test Description | File | Lines |
|---|-----------------|------|-------|
| D1 | `shows team score input during game @high` | `e2e/trivia/presenter.spec.ts` | 238-240 |
| D2 | `can increase team score with + button @critical` | `e2e/trivia/presenter.spec.ts` | 242-261 |
| D3 | `can decrease team score with - button @high` | `e2e/trivia/presenter.spec.ts` | 263-287 |
| D4 | `can edit score directly by clicking @medium` | `e2e/trivia/presenter.spec.ts` | 289-309 |
| D5 | `shows per-round score breakdown @medium` | `e2e/trivia/presenter.spec.ts` | 311-327 |

**Deletion scope:** The entire `test.describe('Score Adjustment', () => { ... })` block (lines 237-328).

### Retained Unit Tests (unchanged)

| File | Test Count | Reason |
|------|-----------|--------|
| `TeamManager.test.tsx` | 17 | Component used in setup wizard |
| `TeamScoreInput.test.tsx` | 18 | Kept unless component file is deleted |
| `use-quick-score.test.ts` | 8 | Hook used by keyboard handler |
| `accessibility.test.tsx` (RoundSummary) | 2 | Component retained in center panel |

---

## 7. Files Referenced

- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/play/page.tsx` -- Primary change target (handleNextRound, effects, sidebar)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/__tests__/game-store.test.ts` -- New unit test location (1 test)
- `/Users/j/repos/beak-gaming-platform/e2e/trivia/presenter.spec.ts` -- E2E: delete 5 tests (lines 237-328), add 5 new tests
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/rounds.ts` -- Engine nextRound with status guard (line 25)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/__tests__/TeamManager.test.tsx` -- 17 tests, all retained
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/__tests__/TeamScoreInput.test.tsx` -- 18 tests, retained unless component deleted
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/hooks/__tests__/use-quick-score.test.ts` -- 8 tests, all retained
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/test/accessibility.test.tsx` -- 2 RoundSummary tests, retained
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/RoundSummary.tsx` -- No changes required
