# Area 5: Test Strategy & Verification

## 1. Current Test Inventory

### 1.1 E2E Tests (Playwright)

**`e2e/trivia/presenter.spec.ts`** -- 25 tests total

The rename test at lines 138-162 **confirms it tests the setup wizard path, not the sidebar**:
- Line 140: `await page.locator('[data-testid="wizard-step-2"]').click()` navigates to the Teams step in the setup wizard.
- The test adds a team, clicks "Rename", fills an input, presses Enter, and asserts the new name appears.
- This test does NOT interact with the right sidebar's TeamManager during gameplay. It exercises the identical `TeamManager` component but rendered inside the setup wizard overlay, not the sidebar.

**Sidebar-relevant E2E tests in `presenter.spec.ts`:**

| Lines | Test | Sidebar Relevance | Post-Removal Impact |
|-------|------|-------------------|---------------------|
| 238-260 | "shows team score input during game" / "+/- buttons" | Tests QuickScoreGrid / TeamScoreInput in right sidebar | These tests locate elements by role/heading text ("Team Scores", "Add 1 point"), NOT by sidebar containment. They will still pass if the same components render in the center column. |
| 263-287 | "can decrease team score with - button" | Same -- locates within `section/div` containing "Team Scores" heading | Same as above |
| 289-309 | "can edit score directly by clicking" | Same | Same |
| 311-327 | "shows per-round score breakdown" | Tests `TeamScoreInput` round breakdown | **Becomes obsolete** if per-round breakdown in `TeamScoreInput` is removed |

**`e2e/trivia/display.spec.ts`** -- 22 tests total

| Lines | Test | Sidebar Relevance |
|-------|------|-------------------|
| 496-508 | "shows game end state when game is complete" | **Stub only** -- has a comment "tested in integration tests" and performs no assertions. Zero coverage for the ended state. |

**Critical gap: ZERO E2E tests exercise "View Final Results" or the ended-state sidebar panel.**

### 1.2 Unit Tests -- Sidebar Components

**`components/presenter/__tests__/TeamManager.test.tsx`** -- 17 tests

Covers: rendering, add/remove teams, rename (Enter, blur, Escape, empty string, whitespace trim), game status gating (setup vs. playing vs. ended vs. between_rounds). This component is used in BOTH the setup wizard and the sidebar. All 17 tests exercise the component in isolation via props -- they are NOT sidebar-specific. **All 17 tests remain valid after sidebar removal** because the component will still be rendered (in the setup wizard). No test will break.

**`components/presenter/__tests__/TeamScoreInput.test.tsx`** -- 18 tests

Covers: rendering, team names/scores display, +/- buttons, direct score input (click, Enter, blur, Escape, invalid, zero), per-round breakdown (4 tests), multiple teams. All prop-driven. **All 18 tests remain valid** because the component is isolated and its rendering location is irrelevant.

The 4 per-round breakdown tests (lines 283-320):
- "should display per-round scores when available" -- asserts `Per round:`, `R1: 5`, `R2: 10`
- "should highlight current round score" -- checks `.bg-primary/20` class
- "should not show breakdown when no round scores"
- "should show 'This round' score indicator for rounds after first"

These tests exercise `TeamScoreInput` rendering, which will survive as-is. Whether this UI is *desirable* post-removal depends on design decisions, but the tests themselves will not break.

**`hooks/__tests__/use-quick-score.test.ts`** -- 8 tests

Covers: initial state, toggle on/off, multiple teams, undo, undo with empty history, clear, question-change reset. All use `renderHook` against `useQuickScore(questionIndex)` -- no component rendering. **All 8 tests remain valid.**

**No test file exists for:**
- `QuickScoreGrid` component (zero unit tests)
- `RoundSummary` component (only 2 accessibility-only tests in `accessibility.test.tsx`)
- The sidebar layout itself (page-level wiring in `play/page.tsx`)
- `handleNextRound` in `play/page.tsx` (page-level function, never tested)

### 1.3 Unit Tests -- RoundSummary (Accessibility Only)

**`test/accessibility.test.tsx`** lines 225-255 -- 2 tests

- "RoundSummary mid-game has no accessibility violations" -- renders with `isLastRound=false` and runs axe.
- "RoundSummary final round has no accessibility violations" -- renders with `isLastRound=true` and runs axe.

These verify WCAG compliance, NOT functional behavior. They will remain valid as the component itself is retained (only its render location changes).

### 1.4 Unit Tests -- Game Engine (nextRound)

**`lib/game/__tests__/engine.test.ts`** lines 715-759 -- 4 tests

- "should advance round number" -- verifies `currentRound` increments and `status` becomes `playing`
- "should end game if on last round" -- verifies `status` becomes `ended`
- "should return unchanged if not between_rounds" -- guard clause test
- "should set selectedQuestionIndex to first question of next round"

**`stores/__tests__/game-store.test.ts`** lines 154-164 -- 1 test

- "nextRound should advance to next round" -- integration test through Zustand store

These tests verify the pure `nextRound()` engine function and the store wrapper. They do NOT test `handleNextRound` in `play/page.tsx`, which is the buggy wrapper:

```typescript
// play/page.tsx lines 89-93
const handleNextRound = () => {
  game.nextRound();                    // Calls engine nextRound
  setShowRoundSummary(false);
  useGameStore.getState().setAudienceScene('round_intro');  // BUG: fires even in ended state
};
```

The engine's `nextRound()` correctly returns unchanged state when `status !== 'between_rounds'`. But `handleNextRound` unconditionally calls `setAudienceScene('round_intro')` even when the game has ended, which would corrupt the audience display.

### 1.5 Unit Tests -- Related Store Tests

**`stores/__tests__/game-store.test.ts`** -- 50+ tests

Covers `advanceScene()` for all recap paths, scoreDeltas computation, round_intro transitions, final_buildup/final_podium paths, setDisplayQuestion scene transitions. Comprehensive coverage of the scene state machine.

**`stores/__tests__/round-scoring-store.test.ts`** -- 7 tests

Covers `setRoundScores` action: applying scores, setting roundScores, computing deltas, clearing entries, submission gate, zero scores, rank computation.

### 1.6 showRoundSummary Coverage

The `showRoundSummary` state variable and its `setShowRoundSummary` setter are used in 9 places in `play/page.tsx` (lines 55, 65, 71, 80, 91, 475, 485, 488, 543). NONE of these are tested directly. The auto-show/auto-hide `useEffect` hooks (lines 63-82) have zero test coverage. They are verified only indirectly by E2E tests that trigger round completion.

---

## 2. Test Impact Analysis Per Work Item

### WI-1: Fix handleNextRound Bug

**Bug:** `handleNextRound` unconditionally sets audience scene to `round_intro` even when `nextRound()` detects game end (last round) and transitions to `ended` status. The `setAudienceScene('round_intro')` call after `nextRound()` overwrites whatever scene the engine set.

**Existing test coverage:** Zero. No unit or E2E test calls `handleNextRound` when `isLastRound === true` and `status === 'ended'`.

**Tests needed:**

| Test Type | Description | Priority |
|-----------|-------------|----------|
| Unit | `handleNextRound` on last round should NOT set scene to `round_intro` -- verify `audienceScene` remains `final_buildup` or the engine's choice | P0 |
| Unit | `handleNextRound` on non-last round should set scene to `round_intro` and advance currentRound | P1 |
| Unit | `handleNextRound` when `status !== 'between_rounds'` should be a no-op | P1 |

**Note:** Since `handleNextRound` is a page-level function closure referencing React state and store calls, testing it directly requires either extracting it to a testable utility or testing through store-level integration. The recommended approach is to add a guard:

```typescript
const handleNextRound = () => {
  const state = useGameStore.getState();
  if (state.status === 'ended') return; // Guard: game already ended
  game.nextRound();
  setShowRoundSummary(false);
  useGameStore.getState().setAudienceScene('round_intro');
};
```

Then add a unit test for the engine-level behavior to confirm `nextRound` on the last round transitions to `ended` and does NOT proceed to `playing`. This is already covered by engine test line 727-734 (`"should end game if on last round"`), so the fix is primarily a code change with existing engine tests providing the safety net.

### WI-2: Ended-State Replacement (Move "View Final Results" to Center Column)

**Existing test coverage:** Zero E2E tests. Zero unit tests. The `display.spec.ts` "Game End" test (line 496-508) is an empty stub.

**Tests needed:**

| Test Type | Description | Priority |
|-----------|-------------|----------|
| E2E | When game ends, "Game Over" panel with "View Final Results" and "Start New Game" buttons appears in center column | P0 |
| E2E | Clicking "View Final Results" opens RoundSummary overlay with final standings | P0 |
| E2E | Dismissing RoundSummary, then clicking "View Final Results" again re-opens it | P0 |
| E2E | Clicking "Start New Game" triggers confirmation dialog, then resets to setup | P1 |
| E2E | RoundSummary in ended state shows "Final Results" heading (not "Round X Complete") | P1 |
| Unit | Ended-state center column renders "View Final Results" button | P1 |
| Unit | Ended-state center column renders "Start New Game" button | P1 |
| Unit | showRoundSummary auto-show useEffect does NOT trigger in ended state (only between_rounds) | P1 |
| Unit | showRoundSummary does NOT auto-hide when status is `ended` (existing behavior, line 64 guards against it) | P2 |

### WI-3: Sidebar Deletion (Remove Right Column)

**Tests that break:** None of the existing unit tests will break because all sidebar component tests (`TeamManager.test.tsx`, `TeamScoreInput.test.tsx`, `use-quick-score.test.ts`) test components in isolation via props, not via their rendering container.

**Tests that become obsolete (should be deleted):**

| Test File | Tests Affected | Reason |
|-----------|---------------|--------|
| `e2e/trivia/presenter.spec.ts` lines 238-260 | "shows team score input during game", "+1 button" | These test `TeamScoreInput` and `QuickScoreGrid` in the sidebar. After sidebar removal, these components no longer exist. If scoring moves to center column, new E2E tests should replace them. |
| `e2e/trivia/presenter.spec.ts` lines 263-287 | "-1 button" | Same |
| `e2e/trivia/presenter.spec.ts` lines 289-309 | "edit score directly" | Same |
| `e2e/trivia/presenter.spec.ts` lines 311-327 | "per-round score breakdown" | Same |

**E2E tests that need updating (not deleting):**

| Test | Current Behavior | Required Update |
|------|-----------------|-----------------|
| `presenter.spec.ts` lines 90-116 (Team Management) | Navigate to `wizard-step-2`, add/remove teams | These test the setup wizard, NOT the sidebar. **No change needed.** |
| `presenter.spec.ts` lines 138-162 (Rename) | Navigate to `wizard-step-2`, rename | Setup wizard path. **No change needed.** |
| `display.spec.ts` lines 231-391 (Scoreboard Display) | Complete round, check audience display | These test dual-screen sync, NOT the sidebar. **No change needed.** |

**Unit tests that become obsolete if components are deleted:**

| Test File | Condition |
|-----------|-----------|
| `TeamScoreInput.test.tsx` (18 tests) | Only if `TeamScoreInput` component is deleted entirely. If repurposed elsewhere, keep. |
| `TeamManager.test.tsx` (17 tests) | **Keep** -- `TeamManager` is still used in the setup wizard. |
| `use-quick-score.test.ts` (8 tests) | Only if `useQuickScore` hook is deleted. If keyboard quick-score remains (1-9 keys), keep. |
| `accessibility.test.tsx` RoundSummary tests (2 tests) | **Keep** -- `RoundSummary` component is retained. |

### WI-4: Dual useQuickScore Fix

**Bug:** `play/page.tsx` line 172 creates one `useQuickScore` instance, but if `QuickScoreGrid` in the sidebar also calls `useQuickScore` internally, there could be two competing instances managing the same store state.

**Investigation:** Reading `QuickScoreGrid.tsx` usage in `page.tsx` (lines 518-522), the `quickScore` object is passed as a prop:

```typescript
<QuickScoreGrid teams={game.teams} quickScore={quickScore} />
```

The hook is called once in `page.tsx` and the result is passed down. There is no second `useQuickScore` call inside `QuickScoreGrid`. **This is not a dual-instance bug.** The concern may be about the keyboard handler in `use-game-keyboard.ts` also calling score-related store actions independently. This needs verification but is not a `useQuickScore` duplication issue.

**Tests needed:** If a fix is required, it would be:

| Test Type | Description | Priority |
|-----------|-------------|----------|
| Unit | Verify only one `useQuickScore` instance manages scored state per question | P2 |
| Unit | Verify keyboard quick-score (1-9) and QuickScoreGrid toggle produce consistent results | P2 |

### WI-5: Divergent Reset Fix

**Bug:** `confirmNewGame` (lines 125-135) manually removes all teams after `resetGame()`, whereas other reset paths (keyboard `R` handler) may not. This creates divergent reset behavior.

**Existing test coverage:** The E2E test "can reset game back to setup" (lines 438-452) tests the keyboard `R` path, not `confirmNewGame`.

**Tests needed:**

| Test Type | Description | Priority |
|-----------|-------------|----------|
| Unit | `confirmNewGame` should reset to clean setup state (no teams, no scores) | P1 |
| Unit | Keyboard `R` reset should produce identical state to `confirmNewGame` | P1 |
| E2E | Both reset paths (R key and "Start New Game" button) produce identical fresh setup state | P2 |

---

## 3. Test Matrix

| Work Item | Test Type | Test Description | Priority | New/Update/Delete |
|-----------|-----------|-----------------|----------|-------------------|
| WI-1: handleNextRound fix | Unit | Guard against `setAudienceScene('round_intro')` when game has ended | P0 | New |
| WI-1: handleNextRound fix | Unit | Non-last round: advances round and sets scene to `round_intro` | P1 | New |
| WI-1: handleNextRound fix | Unit | No-op when status is not `between_rounds` | P1 | New |
| WI-2: Ended-state replacement | E2E | "Game Over" panel visible in center column when game ends | P0 | New |
| WI-2: Ended-state replacement | E2E | "View Final Results" opens RoundSummary with final standings | P0 | New |
| WI-2: Ended-state replacement | E2E | Dismiss + re-open "View Final Results" works | P0 | New |
| WI-2: Ended-state replacement | E2E | "Start New Game" triggers confirm, then resets | P1 | New |
| WI-2: Ended-state replacement | Unit | Ended-state renders "View Final Results" and "Start New Game" | P1 | New |
| WI-2: Ended-state replacement | Unit | Auto-show effect only fires for `between_rounds`, not `ended` | P1 | New |
| WI-3: Sidebar deletion | E2E | Score adjustment E2E tests | - | Delete (lines 238-327) |
| WI-3: Sidebar deletion | Unit | `TeamScoreInput.test.tsx` | - | Delete if component removed; keep if repurposed |
| WI-3: Sidebar deletion | Unit | `TeamManager.test.tsx` | - | Keep (setup wizard still uses it) |
| WI-3: Sidebar deletion | Unit | `use-quick-score.test.ts` | - | Keep if keyboard scoring remains |
| WI-3: Sidebar deletion | Unit | `RoundSummary` accessibility tests | - | Keep |
| WI-5: Divergent reset fix | Unit | `confirmNewGame` produces clean setup state | P1 | New |
| WI-5: Divergent reset fix | Unit | Keyboard R and button reset produce identical state | P1 | New |

---

## 4. E2E Verification Plan

### 4.1 Must-Pass E2E Scenarios Before Merge

These scenarios must pass in the `pnpm test:e2e:trivia` suite:

1. **Full game flow:** Start game with 3 teams -> play through round 1 -> round completion triggers RoundSummary auto-show -> "Next Round" advances to round 2 -> status shows "Playing"
2. **Game end flow:** Complete all rounds -> game transitions to `ended` -> "Game Over" panel appears in center column -> "View Final Results" shows standings -> dismiss + re-open works
3. **Reset from ended:** In ended state, click "Start New Game" -> confirm -> returns to setup wizard with no teams
4. **Setup wizard team management:** Add/remove/rename teams in setup wizard -> start game (existing tests, must not regress)
5. **Keyboard navigation:** All keyboard shortcuts (arrows, Space, D, P, E, R, S, N, 1-9) continue working without sidebar
6. **Dual-screen sync:** Presenter actions propagate to display window (existing tests, must not regress)
7. **Score adjustment in round_scoring:** RoundScoringPanel in center column works correctly (existing path, must not regress)

### 4.2 Existing E2E Tests That Must Still Pass (No Modification)

| Test File | Test Count | Reason |
|-----------|-----------|--------|
| `presenter.spec.ts` -- Page Structure | 5 | Header, status, buttons -- unaffected |
| `presenter.spec.ts` -- Starting a New Game | 3 | Setup wizard path -- unaffected |
| `presenter.spec.ts` -- Team Management | 5 | Setup wizard path -- unaffected |
| `presenter.spec.ts` -- Question Navigation | 3 | Left rail -- unaffected |
| `presenter.spec.ts` -- Answer Reveal | 3 | Center column -- unaffected |
| `presenter.spec.ts` -- Game Flow | 5 | Keyboard shortcuts -- unaffected |
| `presenter.spec.ts` -- Round Completion | 2 | Center column scene nav -- unaffected |
| `presenter.spec.ts` -- Game Reset | 1 | Keyboard R -- unaffected |
| `presenter.spec.ts` -- UI Controls | 5 | Header buttons -- unaffected |
| `presenter.spec.ts` -- Theme Selector | 1 | Center column -- unaffected |
| `display.spec.ts` -- All tests | 22 | Audience display -- unaffected |

### 4.3 Existing E2E Tests That Must Be Deleted

| Test File | Lines | Test Name | Reason |
|-----------|-------|-----------|--------|
| `presenter.spec.ts` | 238-260 | "shows team score input during game" + "+1 button" | Sidebar component no longer rendered |
| `presenter.spec.ts` | 263-287 | "-1 button" | Same |
| `presenter.spec.ts` | 289-309 | "edit score directly" | Same |
| `presenter.spec.ts` | 311-327 | "per-round score breakdown" | Same |

Total: 5 E2E tests to delete (the entire "Score Adjustment" describe block, lines 237-328).

### 4.4 New E2E Tests Required

```
1. [P0] ended-state: "Game Over" panel appears in center column
2. [P0] ended-state: "View Final Results" shows RoundSummary overlay
3. [P0] ended-state: dismiss + re-open RoundSummary overlay
4. [P1] ended-state: "Start New Game" resets to setup
5. [P1] ended-state: RoundSummary shows "Final Results" (not "Round X Complete")
```

### 4.5 Manual Playwright MCP Verification Checklist

These are visual/interaction checks that E2E tests cannot fully validate:

1. **Layout integrity:** After sidebar removal, center column expands to fill available width. No empty gap on the right side.
2. **Ended-state visual:** "Game Over" panel has correct styling (border, shadow, centered text, accessible button sizes >= 44x44px).
3. **RoundSummary overlay positioning:** When "View Final Results" is clicked in center column, the RoundSummary renders inline within the center column (not floating/modal).
4. **Dark mode:** All ended-state UI renders correctly in dark mode. Use `page.emulateMedia({ colorScheme: 'dark' })`.
5. **Responsive:** At 1024px viewport width, the 2-column layout (left rail + center) looks correct without the right sidebar.
6. **Keyboard focus:** After sidebar removal, Tab key navigation flows from header -> left rail -> center column without getting trapped in a non-existent sidebar.
7. **Round scoring layout:** During `round_scoring` scene, the side-by-side layout (scoring form + Q&A reference) in the center column is unaffected by sidebar removal (sidebar is already hidden in this scene via `!isRoundScoringScene` guard at line 497).
8. **Score quick-keys:** Pressing 1-9 during scoring phases still works via keyboard handler, even without `QuickScoreGrid` visible.

---

## 5. Test Execution Strategy

### Phase 1: Pre-Implementation Verification
Run `pnpm test:e2e:trivia` to establish baseline. All existing tests should pass. Record pass count.

### Phase 2: During Implementation
After each work item:
1. Run `pnpm test:run` in `apps/trivia` to verify unit tests pass
2. Run `pnpm lint && pnpm typecheck` to catch import/type errors from deleted components
3. Run `pnpm test:e2e:trivia` to verify E2E suite

### Phase 3: Post-Implementation
1. Delete the 5 obsolete E2E tests (Score Adjustment block)
2. Add the 5 new E2E tests for ended-state
3. Run full `pnpm test:e2e` (all apps) to verify no cross-app regression
4. Run `pnpm test:e2e:summary` to confirm pass/fail counts
5. Perform manual Playwright MCP checks (Section 4.5)

### Test Count Impact Summary

| Category | Before | After | Delta |
|----------|--------|-------|-------|
| Trivia unit tests | ~180 | ~162-180 | -0 to -18 (depends on component deletion decisions) |
| Trivia E2E tests (presenter.spec.ts) | 25 | 25 | 0 (5 deleted + 5 added) |
| Trivia E2E tests (display.spec.ts) | 22 | 22 | 0 |
| New unit tests (handleNextRound, reset, ended-state) | 0 | 5-8 | +5 to +8 |

---

## 6. Key Files Referenced

- `/Users/j/repos/beak-gaming-platform/e2e/trivia/presenter.spec.ts` -- E2E tests for presenter view
- `/Users/j/repos/beak-gaming-platform/e2e/trivia/display.spec.ts` -- E2E tests for audience display
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/__tests__/TeamManager.test.tsx` -- TeamManager unit tests (17)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/__tests__/TeamScoreInput.test.tsx` -- TeamScoreInput unit tests (18)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/hooks/__tests__/use-quick-score.test.ts` -- useQuickScore unit tests (8)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/__tests__/RoundScoringView.test.tsx` -- RoundScoringView unit tests (5)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/test/accessibility.test.tsx` -- Accessibility tests including RoundSummary (2)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/__tests__/game-store.test.ts` -- Game store tests (50+)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/__tests__/round-scoring-store.test.ts` -- Round scoring store tests (7)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/__tests__/engine.test.ts` -- Game engine tests including nextRound (4)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/rounds.ts` -- nextRound engine function (bug source)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/play/page.tsx` -- Presenter page with handleNextRound, sidebar layout, showRoundSummary
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/RoundSummary.tsx` -- RoundSummary component
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/QuickScoreGrid.tsx` -- QuickScoreGrid component (zero tests)
