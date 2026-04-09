# Synthesis 1: Complete Work Unit Specifications

## Work Unit: PR-A — "Fix handleNextRound + Add ended-state center panel" (Items 1+2)

**Objective:** Fix the latent handleNextRound bug and provide ended-state UI replacement in the center panel so sidebar removal doesn't create a UI vacuum.

**Files touched:** `apps/trivia/src/app/play/page.tsx`

**Implementation:**
1. Split `handleNextRound` into two handlers:
   - `handleNextRound`: guards on `game.status !== 'between_rounds'`, calls `game.nextRound()`, `setShowRoundSummary(false)`, `setAudienceScene('round_intro')`
   - `handleEndGameDismiss`: just calls `setShowRoundSummary(false)`
2. Add auto-show effect: `useEffect(() => { if (game.status === 'ended') setShowRoundSummary(true) }, [game.status])`
3. Add re-open button in center panel: visible when `!showRoundSummary && game.status === 'ended'`
4. Update `onNextRound` prop: `game.status === 'ended' ? handleEndGameDismiss : handleNextRound`

**Acceptance criteria:**
- [ ] handleNextRound no longer sets audienceScene during ended state
- [ ] RoundSummary auto-shows when game ends
- [ ] Dismissing RoundSummary during ended reveals re-open button
- [ ] Re-open button shows final results
- [ ] Between-rounds flow unchanged
- [ ] R-key reset still works during ended state

**Tests:**
- [ ] Unit test: handleNextRound guard in game-store.test.ts
- [ ] E2E: auto-show on game end
- [ ] E2E: dismiss + re-open cycle
- [ ] E2E: winners displayed correctly
- [ ] E2E: R-key reset from ended
- [ ] E2E: no scene corruption (audienceScene !== 'round_intro' during ended)

**Risks:** Low — additive changes only, no deletions.
**Dependencies:** None — first in critical path.

---

## Work Unit: PR-B — "Remove right sidebar" (Items 3+4+5)

**Objective:** Delete the right sidebar and all code exclusively supporting it. Structurally eliminates dual useQuickScore bug and divergent reset bug.

**Files touched:** `apps/trivia/src/app/play/page.tsx`, `apps/trivia/src/components/presenter/QuickScoreGrid.tsx` (delete)

**Implementation:**
1. Delete 4 imports: TeamScoreInput, TeamManager, QuickScoreGrid, useQuickScore (lines 13-15, 19)
2. Delete Instance 2 hook + comment + blank line (lines 171-173)
3. Delete isScoringScene + comment (lines 174-179)
4. Delete entire sidebar JSX block (lines 496-563)
5. Delete `QuickScoreGrid.tsx` file
6. Update layout comment from 3-column to 2-column (lines 238-244)

**Acceptance criteria:**
- [ ] No `<aside id="game-controls">` in DOM
- [ ] QuickScoreGrid.tsx deleted
- [ ] isScoringScene variable removed
- [ ] isRoundScoringScene variable KEPT (used at lines 380, 385)
- [ ] TypeScript compiles with zero errors
- [ ] All surviving tests pass
- [ ] Quick-score keyboard shortcuts (1-9) still work (Instance 1 in use-game-keyboard.ts)

**Tests:**
- [ ] Delete 5 E2E tests for Score Adjustment sidebar block (presenter.spec.ts:237-328)
- [ ] Verify 17 TeamManager + 18 TeamScoreInput + 8 useQuickScore unit tests still pass
- [ ] E2E: keyboard scoring still works after removal

**Risks:** Medium — largest deletion. TypeScript will catch dangling refs.
**Dependencies:** PR-A merged first.

---

## Work Unit: PR-C — "Center panel layout constraints" (Item 6)

**Objective:** Add max-width constraint to prevent center panel from stretching too wide after sidebar removal (+320px).

**Files touched:** `apps/trivia/src/app/play/page.tsx`

**Implementation:**
1. Add `max-w-3xl mx-auto w-full` wrapper inside center panel (non-round-scoring content only)
2. Update layout comment

**Acceptance criteria:**
- [ ] Content doesn't stretch beyond readable width at 1920px
- [ ] Looks correct at 1280×800 and 1366×768
- [ ] Round scoring panel (full-width) unaffected
- [ ] No horizontal scroll introduced

**Tests:**
- [ ] Visual verification at 1280×800 via Playwright MCP
- [ ] Visual verification at 1366×768 via Playwright MCP

**Risks:** Low — CSS only.
**Dependencies:** PR-B merged (must see actual layout post-removal).

---

## Work Unit: PR-D — "Fix skip link a11y target" (Item 7)

**Objective:** Fix pre-existing accessibility bug where skip link targets wrong element.

**Files touched:** `apps/trivia/src/app/play/page.tsx`

**Implementation:** Change skip link target from `#main` to `#main-content` (2 lines)

**Acceptance criteria:**
- [ ] Skip link navigates to correct element
- [ ] Tab → Enter on skip link moves focus to main content

**Tests:**
- [ ] Manual keyboard verification via Playwright MCP

**Risks:** Minimal.
**Dependencies:** None — independent, merge any time.

---

## Work Unit: PR-E — "File relocation Linear issues" (Item 8)

**Objective:** Create Linear issues for SHOULD RELOCATE features (mid-game team rename, direct score override).

**No code changes.** Linear issue creation only.

**Acceptance criteria:**
- [ ] Linear issue filed for mid-game team rename relocation
- [ ] Linear issue filed for score override (setTeamScore) relocation
- [ ] Both issues reference this sidebar removal work

**Dependencies:** None — independent, file any time.
