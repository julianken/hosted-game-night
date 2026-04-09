# Round Scoring UI — Execution Plan

## A) Executive Summary

This plan implements 6 improvements to the trivia app's `round_scoring` presenter scene across 4 PRs in 3 waves. The highest-value change is pre-filling the `RoundScoringPanel` with accumulated quick-score values (a one-line initializer change), which also serves as the safety net for back navigation. The plan adds backward navigation from `round_scoring` to `recap_qa`, blocks the Enter key during scoring to prevent accidental advance, removes the dead `roundScoringInProgress` state field from 13 files, and adds a new `RoundScoringView` presentational component for the center panel. All changes preserve the bar-trivia dual-mechanism design where quick-score is primary and the panel is optional.

---

## B) Implementation Plan — 4 PRs

### PR 1: Pre-fill panel with quick-score values

**Title:** `fix(trivia): pre-fill RoundScoringPanel with accumulated quick-score values`
**Wave:** 1 (parallel with PR 2)
**Dependencies:** None

**Files to modify:**

1. `apps/trivia/src/components/presenter/RoundScoringPanel.tsx`
   - Lines 37-42: Change the `useState` initializer to read `team.roundScores[currentRound]`
   - Guard: `(committed !== undefined && committed > 0) ? committed : null`
   - `handleClear` stays as reset-to-null (no change needed)

**Tests to write:**

File: `apps/trivia/src/components/presenter/__tests__/RoundScoringPanel.test.tsx`
- "should pre-fill inputs with quick-score values from team.roundScores[currentRound]"
- "should show correct entered count reflecting pre-filled values"
- "should call onProgressChange with pre-filled values on mount"
- "should submit pre-filled values on Done without modification"
- "handleClear resets to null, not pre-fill values"
- P0: "full quick-score + pre-fill + modify + Done sequence"

**Acceptance criteria:**
- Inputs pre-fill with `roundScores[currentRound]` when value > 0
- Teams with 0 quick-score show empty input
- Progress counter reflects pre-filled count
- onProgressChange fires with pre-filled values on mount
- Clear resets to null (all empty)
- All existing tests pass

---

### PR 2: Block Enter key and global Ctrl+Z during round_scoring

**Title:** `fix(trivia): block Enter key and global Ctrl+Z during round_scoring scene`
**Wave:** 1 (parallel with PR 1)
**Dependencies:** None

**Files to modify:**

1. `apps/trivia/src/hooks/use-game-keyboard.ts`
   - Lines 272-273 (Enter): Add `if (currentScene === 'round_scoring') break;`
   - Lines 282-288 (KeyZ): Add `&& currentScene !== 'round_scoring'` to guard

2. `apps/trivia/CLAUDE.md`
   - Update Enter row: "Blocked during `round_scoring` (use Right Arrow to advance)"
   - Update Ctrl+Z row: note exclusion during `round_scoring`

**Tests to write:**

File: `apps/trivia/src/hooks/__tests__/use-game-keyboard.test.ts`
- "Enter key should not dispatch SKIP during round_scoring"
- "Enter key should still dispatch SKIP during other scenes"
- "Ctrl+Z should not dispatch quickScore.undo during round_scoring"

**Acceptance criteria:**
- Enter is no-op during `round_scoring`
- Enter still works as SKIP in all other scenes
- Global Ctrl+Z does not fire during `round_scoring`
- CLAUDE.md updated

---

### PR 3: Back navigation from round_scoring to recap_qa

**Title:** `feat(trivia): add backward navigation from round_scoring to recap_qa`
**Wave:** 2 (after PR 1)
**Dependencies:** PR 1 (pre-fill safety net)

**Files to modify:**

1. `apps/trivia/src/lib/game/scene.ts`
   - Lines 270-277: Add `if (trigger === 'back') return 'recap_qa';`

2. `apps/trivia/src/lib/presenter/nav-button-labels.ts`
   - `getBackLabel`: Add `case 'round_scoring': return 'Q&A Review';`

3. `apps/trivia/src/hooks/use-game-keyboard.ts`
   - Lines 173-181: Add `|| currentScene === 'round_scoring'` to ArrowLeft guard

4. `apps/trivia/src/lib/game/scene-transitions.ts`
   - Lines 278-296: Add backward-entry branch for `round_scoring` origin:
     ```ts
     if (state.audienceScene === 'round_scoring') {
       const lastQ = roundQuestions[roundQuestions.length - 1];
       const globalIndex = lastQ ? state.questions.indexOf(lastQ) : 0;
       return {
         ...buildSceneUpdate(nextScene),
         displayQuestionIndex: globalIndex,
         selectedQuestionIndex: globalIndex,
         recapShowingAnswer: true,
       };
     }
     ```

5. `apps/trivia/CLAUDE.md`
   - Update Arrow Left row to include `round_scoring`

**Tests to write:**

- `scene-transitions.test.ts`: "round_scoring back to recap_qa with recapShowingAnswer=true"
- `nav-button-labels.test.ts`: Add `['round_scoring', 'Q&A Review']` to back labels table
- `use-game-keyboard.test.ts`: "ArrowLeft dispatches BACK during round_scoring"

**Acceptance criteria:**
- Left Arrow from `round_scoring` → `recap_qa` with answer face showing
- Back button shows "Q&A Review" label
- `recapShowingAnswer: true` on backward entry
- `displayQuestionIndex` points to last question of round
- Re-entering round_scoring shows pre-filled quick-score values
- All existing scene-transition tests pass

---

### PR 4: Dead state removal + center panel + UX guidance

**Title:** `refactor(trivia): remove dead roundScoringInProgress, add RoundScoringView center panel`
**Wave:** 3 (after PRs 1-3)
**Dependencies:** PRs 1, 2, 3

**Files to modify (dead state removal — 13 files):**

1. `types/index.ts` — remove `roundScoringInProgress: boolean` field
2. `lib/game/lifecycle.ts` — remove from `createInitialState()`
3. `lib/game/scene-transitions.ts` — remove `roundScoringInProgress: true` from round_scoring entry
4. `stores/game-store.ts` — remove from `setRoundScores` (copy + clear) and `loadTeamsFromSetup`
5. `hooks/use-status-state.ts` — remove subscription/memo
6. `hooks/use-sync.ts` — remove from sync extraction
7. `stores/__tests__/game-store.test.ts` — remove assertions
8. `stores/__tests__/round-scoring-store.test.ts` — remove test case
9. `lib/game/__tests__/scene-transitions.test.ts` — remove assertion
10. `types/__tests__/guards.test.ts` — remove from fixture
11. `lib/game/__tests__/questions.test.ts` — remove from fixture
12. `components/presenter/__tests__/TemplateSelector.test.tsx` — remove from fixtures
13. `components/presenter/__tests__/SaveTemplateModal.test.tsx` — remove from fixtures

**Files to create (center panel):**

1. `apps/trivia/src/components/presenter/RoundScoringView.tsx` (~150-200 lines)
   - No props — reads from `useGameStore` directly
   - Layout: standings first (compact), questions second (scrollable with correct answers)
   - Follows RoundSummary.tsx and QuestionDisplay.tsx patterns

**Files to modify (center panel integration):**

2. `apps/trivia/src/app/play/page.tsx`
   - Center panel (~line 389): Conditional render `RoundScoringView` when `isRoundScoringScene`

**Files to modify (UX guidance):**

3. `apps/trivia/src/lib/presenter/next-action-hints.ts`
   - Update `round_scoring` hint text

**Tests to write:**

- `components/presenter/__tests__/RoundScoringView.test.tsx`: standings rendering, questions with answers
- Modify 8 test files to remove `roundScoringInProgress` from fixtures

**Acceptance criteria:**
- TypeScript compiles with no errors after `roundScoringInProgress` removal
- All existing tests pass after fixture updates
- RoundScoringView renders in center panel during round_scoring
- Center column returns to QuestionDisplay when leaving round_scoring
- Updated hint text reflects new keyboard behavior

---

## C) Wave Structure

```
Wave 1 (parallel):
  PR 1: Pre-fill panel          ← zero risk, highest value
  PR 2: Keyboard fixes          ← zero risk, contained changes

Wave 2 (after Wave 1):
  PR 3: Back navigation         ← depends on PR 1 (pre-fill safety net)

Wave 3 (after Wave 2):
  PR 4: Cleanup + center panel  ← depends on PRs 1-3 (merge conflict avoidance)
```

---

## D) Risk Mitigation Checklist

| Risk | Severity | Mitigation | PR |
|------|----------|-----------|-----|
| `recapShowingAnswer` side effect missed for back-nav | High | Explicit test case required | PR 3 |
| Enter block changes muscle memory | Medium | Right Arrow still works; CLAUDE.md updated | PR 2 |
| Back-nav loses panel edits | Medium | Pre-fill recovers quick-score values; accepted trade-off | PR 1+3 |
| No E2E coverage for visual changes | Medium | Manual Playwright MCP verification | PR 4 |
| Dead state removal touches 13 files | Low | TypeScript catches all missed refs; atomic commit | PR 4 |
| Dual Ctrl+Z during round_scoring | Low | Fixed by excluding from global handler | PR 2 |

---

## E) Documentation Updates

1. `apps/trivia/CLAUDE.md` — Keyboard Shortcuts table (PRs 2, 3)
2. `apps/trivia/src/lib/presenter/next-action-hints.ts` — hint text (PR 4)

---

## F) Open Decisions for Implementer

1. **RoundScoringView layout**: Standings first, questions second. Exact spacing/borders follow existing patterns.
2. **Question answer visibility in center panel**: Show correct answers (presenter already reviewed in recap_qa).
3. **N key behavior**: Leave as-is (power-user shortcut, no confirmation in any scene).
4. **RoundScoringView scroll**: Use fixed-height scrollable container for questions. Implementer decides max-height.
5. **Test structure**: Follow existing test patterns in each file.
