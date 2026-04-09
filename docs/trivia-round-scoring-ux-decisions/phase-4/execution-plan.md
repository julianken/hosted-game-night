# Execution Plan: Trivia Round Scoring UX Restructure

Based on the completed analysis at `docs/trivia-round-scoring-ux/phase-4/analysis-report.md`.

---

## A) ELI5 Explanation

When the trivia host finishes a round, they need to enter scores for each team. Right now, they can accidentally skip past the scoring screen without entering any scores. We're fixing this by requiring them to press "Done" before they can move forward. We're also moving the score-entry form from a narrow sidebar to the main area where it's easier to use, and hiding the sidebar during scoring since it's not needed.

## B) 5-Sentence Summary

1. A `roundScoringSubmitted` boolean flag is added to `TriviaGameState` that gates forward navigation during `round_scoring` — the forward button is disabled (38% opacity) until the presenter clicks Done, following the existing reveal-lock guard pattern in `orchestrateSceneTransition()`.
2. The flag's lifecycle is asymmetric: forward entry from `round_summary` resets it to `false`; backward re-entry from `recap_qa` preserves it as `true` (scores were already committed).
3. The existing uncommitted scene flow reorder (round_summary → round_scoring → recap_qa → recap_scores) is committed as part of PR 1 alongside the submission gate since they're logically coupled.
4. PR 2 moves `RoundScoringPanel` from the 320px right sidebar to a ~400px left column in a side-by-side center layout, giving 35% more space for score entry.
5. The right sidebar is conditionally suppressed during `round_scoring` only (not globally), with mandatory skip link co-deletion to prevent a WCAG dead anchor.

## C) Table of Contents

| Section | Summary |
|---------|---------|
| D.1 Architecture Summary | Two-PR shipping strategy with gate pattern and layout restructure |
| D.2 Implementation Sequence | Ordered steps with dependency arrows |
| D.3 Work Unit Specs | 2 work units with file lists, acceptance criteria, and tests |
| D.4 Agent Orchestration Plan | Sequential PRs, agent type assignments |
| D.5 Checkpoints | Verification gates between milestones |
| D.6 Branch and Merge Strategy | Branch naming, commit strategy |

---

## D) Full Detailed Plan

### D.1) Architecture Summary

**Two PRs, shipped sequentially:**

- **PR 1** (Change a + flow reorder): Commits the existing working tree scene flow changes AND adds the submission gate. These are logically coupled — the flow was reordered to put scoring before Q&A review, and the gate ensures scoring actually happens.
- **PR 2** (Changes b + c): Moves the scoring form to the center panel and conditionally suppresses the sidebar during `round_scoring`.

**Key design decisions (all resolved by analysis):**
- Forward button: **disable** (not hide) — hiding would remove the back button too
- Sidebar removal scope: **round_scoring only** — global removal requires QuickScoreGrid relocation (out of scope)
- Gate feedback: **silent rejection + disabled button** — matches reveal-lock precedent, no toast/modal
- `roundScoringSubmitted` flag set inside `setRoundScores()` — not a separate store action

### D.2) Step-by-Step Implementation Sequence

```
PR 1: Submission Gate
  Step 1: Add roundScoringSubmitted to TriviaGameState type
  Step 2: Add to createInitialState() + all manual state constructions
  Step 3: Add orchestrator guard in scene-transitions.ts
  Step 4: Set flag lifecycle in applyTransitionSideEffects
  Step 5: Set flag to true in setRoundScores() store action
  Step 6: Add to storeToGameState() sync mapping
  Step 7: Add disable logic in use-nav-button-labels.ts
  Step 8: Update next-action-hints.ts text
  Step 9: Update breaking tests + add new gate tests
  Step 10: Update CLAUDE.md keyboard shortcuts if needed

PR 2: Form Relocation + Sidebar Suppression (depends on PR 1 merged)
  Step 1: Create side-by-side layout in center panel for round_scoring
  Step 2: Add hideHeader prop to RoundScoringPanel with aria-live preservation
  Step 3: Conditionally suppress sidebar during round_scoring
  Step 4: Co-delete skip link
  Step 5: Adjust max-h constant in RoundScoringView
  Step 6: Visual verification via Playwright MCP
```

### D.3) Work Unit Specs

---

### Work Unit 1: PR 1 — Submission Gate + Scene Flow Commit

**Objective:** Commit the existing scene flow reorder and add a submission gate that blocks forward navigation during `round_scoring` until scores are submitted via the Done button.

**CRITICAL — Existing Working Tree Changes:** The working tree already contains uncommitted changes that reorder the between-rounds flow from `round_summary → recap_title → recap_qa → round_scoring → recap_scores` to `round_summary → round_scoring → recap_qa → recap_scores`. These changes span: `scene.ts`, `scene-transitions.ts`, `use-game-keyboard.ts`, `nav-button-labels.ts`, `next-action-hints.ts`, and their tests. ALL existing working tree changes must be included in this PR — they are the foundation for the submission gate. Run `git diff` to see the full set. Do NOT revert or discard these changes.

**Files to modify (all paths relative to `apps/trivia/src/`):**

| File | Change |
|------|--------|
| `types/index.ts` | Add `roundScoringSubmitted: boolean` to `TriviaGameState` interface (after `roundScoringEntries` at line 294) |
| `lib/game/lifecycle.ts` | Add `roundScoringSubmitted: false` to `createInitialState()` (after `roundScoringEntries: {}` at line 52) |
| `lib/game/scene-transitions.ts` | Add 3-line submission guard after reveal-lock guard (line 367). In `applyTransitionSideEffects`: add `roundScoringSubmitted: false` to forward entry (round_summary → round_scoring, line 278). Backward entry (recap_qa → round_scoring, line 284) already doesn't touch the flag — confirm it stays untouched so `true` is preserved. |
| `stores/game-store.ts` | In `setRoundScores()` (line 244-248): add `roundScoringSubmitted: true` to return object. In `loadTeamsFromSetup()` (line 371): add `roundScoringSubmitted: false`. In `useGameSelectors()` dummy state (line 476): add `roundScoringSubmitted: false`. |
| `hooks/use-sync.ts` | Add `roundScoringSubmitted: state.roundScoringSubmitted` to `storeToGameState()` field map (after line 82, before closing brace) |
| `hooks/use-nav-button-labels.ts` | Subscribe to `roundScoringSubmitted` in the useShallow selector. Add submission gate disable: when `audienceScene === 'round_scoring' && !roundScoringSubmitted`, set `forward.disabled = true`. This is in addition to the existing `isRevealLocked` disable. |
| `lib/presenter/next-action-hints.ts` | Update `round_scoring` hint from `'Enter scores in sidebar. Right Arrow to advance, Left Arrow to go back. Enter is blocked.'` to `'Enter scores and press Done. Right Arrow to review answers, Left Arrow to go back.'` |
| `lib/game/__tests__/scene-transitions.test.ts` | Update test at line ~428 ("round_scoring -> recap_qa: should seed recap_qa"): add `roundScoringSubmitted: true` to state. Add NEW test: "should block advance when roundScoringSubmitted is false". Add NEW test: "should allow advance when roundScoringSubmitted is true". |
| `stores/__tests__/game-store.test.ts` | Update test at line ~336 ("should seed recap_qa from round_scoring"): add `roundScoringSubmitted: true` to setState. Add NEW test: "setRoundScores should set roundScoringSubmitted to true". |
| `CLAUDE.md` (apps/trivia/) | Update Keyboard Shortcuts table if the Enter key behavior or N key behavior during round_scoring changed. Currently Enter is blocked during round_scoring — confirm this is still true. |

**The submission guard (insert after line 367 in scene-transitions.ts):**
```typescript
// Submission gate: block advancement during round_scoring until scores are submitted.
if (state.audienceScene === 'round_scoring' && !state.roundScoringSubmitted && ADVANCEMENT_TRIGGERS.has(trigger)) {
  return null; // Silent rejection — forward button is disabled in UI
}
```

**The nav-button disable logic (in use-nav-button-labels.ts):**
```typescript
// Submission gate: forward is disabled during round_scoring until scores submitted
const isSubmissionGated = audienceScene === 'round_scoring' && !roundScoringSubmitted;

const forward: NavButtonLabelsResult['forward'] =
  labels.forward === null
    ? null
    : {
        text: labels.forward,
        disabled: isRevealLocked || isSubmissionGated,
      };
```

**Also check and update these files that manually construct TriviaGameState objects:**
- `components/presenter/RoundScoringView.tsx:46` — has `roundScoringEntries: {}`, may need `roundScoringSubmitted: false`
- `components/presenter/__tests__/TemplateSelector.test.tsx` — multiple inline state objects
- `components/presenter/__tests__/SaveTemplateModal.test.tsx` — multiple inline state objects
- `lib/game/__tests__/questions.test.ts:60` — inline state
- `types/__tests__/guards.test.ts:63` — inline state
- `test/helpers/store.ts` — test helper that may construct state
- `lib/game/__tests__/engine.test.ts` — uses createInitialState, should auto-inherit

**Acceptance criteria:**
- [ ] ArrowRight during `round_scoring` with unsubmitted scores: no-op (scene stays)
- [ ] N key during `round_scoring` with unsubmitted scores: no-op
- [ ] Forward button shows "Review Answers" but is disabled (38% opacity) when unsubmitted
- [ ] Clicking Done submits scores, sets flag to true, advances to recap_qa
- [ ] After Done, ArrowRight works normally
- [ ] Backward re-entry from recap_qa preserves submitted state (forward button enabled)
- [ ] Forward entry from round_summary resets flag to false
- [ ] `roundScoringSubmitted` is included in BroadcastChannel sync payload
- [ ] All existing 1781 tests pass + new gate tests pass
- [ ] TypeScript compiles cleanly (`pnpm typecheck`)

**Tests/verification:**
- [ ] `pnpm --filter trivia test:run` — all pass
- [ ] `pnpm typecheck` — no errors
- [ ] `pnpm lint` — no errors
- [ ] New tests: gate blocks advance when `roundScoringSubmitted: false`
- [ ] New tests: gate allows advance when `roundScoringSubmitted: true`
- [ ] New test: `setRoundScores()` sets `roundScoringSubmitted: true`
- [ ] Existing tests updated to include `roundScoringSubmitted` in state where needed

**Risks/rollback:** Low risk — follows established reveal-lock pattern. Rollback: revert the PR.

**Dependencies:** None — standalone.

**Recommended agent type:** `frontend-excellence:state-manager` (primary domain is state management + scene flow gating)

---

### Work Unit 2: PR 2 — Form Relocation + Sidebar Suppression

**Objective:** Move `RoundScoringPanel` from the right sidebar to the center panel in a side-by-side layout during `round_scoring`, and conditionally suppress the right sidebar during that scene.

**IMPORTANT: This PR depends on PR 1 being merged first.** The submission gate must be in place before the layout changes, because the layout changes alter where the Done button appears.

**Files to modify (all paths relative to `apps/trivia/src/`):**

| File | Change |
|------|--------|
| `app/play/page.tsx` | Center panel: when `isRoundScoringScene`, render a side-by-side layout with `RoundScoringPanel` (~w-[400px]) on the left and `RoundScoringView` (flex-1) on the right. Sidebar: wrap the `<aside>` in `{!isRoundScoringScene && (...)}` conditional. Skip link: delete the `<a href="#game-controls">` skip link at lines 239-244 (mandatory co-deletion with sidebar suppression). |
| `components/presenter/RoundScoringPanel.tsx` | Add `hideHeader?: boolean` prop. When true, hide the header div (line 131) BUT preserve the `aria-live="polite"` counter span (line 141-148) by rendering it outside the header. This is critical for screen reader accessibility. |
| `components/presenter/RoundScoringView.tsx` | Update `max-h-[calc(100vh-400px)]` at line 103 to account for the new layout. Estimated: `calc(100vh-280px)` but verify empirically. The component header may need consolidation with the panel header (avoid duplicate "Round N Scoring" text). |

**Layout structure for center panel during round_scoring:**
```tsx
{isRoundScoringScene ? (
  <div className="flex gap-4 h-full">
    {/* Scoring form — fixed width left column */}
    <div className="w-[400px] shrink-0 overflow-y-auto">
      <RoundScoringPanel
        hideHeader
        teams={...}
        onSubmit={handleRoundScoresSubmitted}
        onProgress={handleRoundScoringProgress}
      />
    </div>
    {/* Q&A reference — flexible right column */}
    <div className="flex-1 overflow-y-auto">
      <RoundScoringView ... />
    </div>
  </div>
) : (
  /* existing center panel content */
)}
```

**Skip link co-deletion (MANDATORY):**
The skip link at `page.tsx:239-244` has `href="#game-controls"` targeting `<aside id="game-controls">` at line 484. When the sidebar is conditionally hidden, this anchor becomes dead (WCAG 2.1 failure). Delete the entire skip link. If the sidebar needs a skip link in non-round_scoring scenes, that's a separate follow-up.

**`aria-live` preservation in RoundScoringPanel:**
The `aria-live="polite"` counter at line 141-148 is inside the header div. When `hideHeader` is true, the visual header (h3 "Round N Scoring") should be hidden, but the counter span must remain in the DOM for screen readers. Implementation approach:
```tsx
{!hideHeader && (
  <div className="flex items-center justify-between">
    <h3 ...>Round {roundNumber} Scoring</h3>
    <span aria-live="polite" ...>{enteredCount}/{teams.length} entered</span>
  </div>
)}
{hideHeader && (
  <span aria-live="polite" className="sr-only"
    aria-label={`${enteredCount} of ${teams.length} teams entered`}>
    {enteredCount}/{teams.length} entered
  </span>
)}
```

**Acceptance criteria:**
- [ ] During `round_scoring`: scoring form appears in center panel left column (~400px)
- [ ] During `round_scoring`: Q&A reference appears in center panel right column (flex-1)
- [ ] During `round_scoring`: right sidebar is not rendered
- [ ] During all other scenes: layout unchanged (sidebar visible, center panel as before)
- [ ] Skip link is removed from DOM
- [ ] `aria-live` counter remains accessible to screen readers when `hideHeader` is true
- [ ] Both columns scroll independently with `overflow-y-auto`
- [ ] No duplicate "Round N Scoring" headers visible
- [ ] Done button in scoring form still works (submits + advances)
- [ ] All tests pass, typecheck clean, lint clean

**Tests/verification:**
- [ ] `pnpm --filter trivia test:run` — all pass
- [ ] `pnpm typecheck` — no errors
- [ ] `pnpm lint` — no errors
- [ ] Visual verification via Playwright MCP in dark mode
- [ ] Tab order through scoring form inputs is natural (left-to-right, top-to-bottom)
- [ ] 10+ team count: verify both columns scroll independently

**Risks/rollback:**
- R6: `max-h` constant may need empirical tuning post-implementation
- R2: Skip link dead anchor — mitigated by mandatory co-deletion
- Rollback: revert the PR

**Dependencies:** PR 1 must be merged first.

**Recommended agent type:** `frontend-excellence:react-specialist` (primary domain is React component layout restructuring)

---

### D.4) Agent/Task Orchestration Plan

**Sequential execution** — PR 2 depends on PR 1.

**Wave 1: PR 1 — Submission Gate**
- Agent: `frontend-excellence:state-manager`
- Context: This execution plan's Work Unit 1 + the existing analysis report path for reference
- Expected output: Feature branch with all changes committed, PR created
- Estimated scope: ~10 files modified, ~50 lines added

**Wave 2: PR 2 — Form Relocation + Sidebar Suppression** (after PR 1 merged)
- Agent: `frontend-excellence:react-specialist`
- Context: This execution plan's Work Unit 2
- Expected output: Feature branch with layout changes committed, PR created
- Estimated scope: ~3 files modified, ~40 lines changed

### D.5) Checkpoints Between Milestones

**After PR 1 implementation, before creating PR:**
- [ ] `pnpm --filter trivia test:run` — all 1781+ tests pass
- [ ] `pnpm typecheck` — clean
- [ ] `pnpm lint` — clean
- [ ] New gate tests exist and pass
- **Stop condition:** Any test failure or typecheck error → fix before PR

**After PR 1 merged, before starting PR 2:**
- [ ] Pull latest main
- [ ] Verify `round_scoring` gate works as expected
- **Stop condition:** Gate not working → fix in PR 1 follow-up

**After PR 2 implementation, before creating PR:**
- [ ] `pnpm --filter trivia test:run` — all tests pass
- [ ] `pnpm typecheck` — clean
- [ ] `pnpm lint` — clean
- [ ] Visual verification via Playwright MCP (dark mode)
- [ ] Skip link is gone from DOM
- [ ] `aria-live` counter present in accessibility tree
- **Stop condition:** Visual regression or a11y issue → fix before PR

### D.6) Branch and Merge Strategy

- **Sync from main** before starting each PR
- **Branch naming:** `feat/trivia-round-scoring-gate` (PR 1), `feat/trivia-round-scoring-layout` (PR 2)
- **Commit strategy:** One atomic commit per PR (squash if multiple intermediate commits)
- **PR template:** Use `.github/PULL_REQUEST_TEMPLATE.md` (includes Five-Level Explanation)
- **Repository:** `--repo julianken/joolie-boolie` for `gh pr create`

---

## Recommended Ticket Breakdown

### Ticket strategy: one-ticket-per-PR

| Suggested Ticket | Work Units Covered | Rationale |
|------------------|--------------------|-----------|
| "feat(trivia): gate forward nav during round_scoring on score submission" | Unit 1 | Game integrity fix + flow commit, self-contained |
| "feat(trivia): relocate scoring form to center panel, suppress sidebar during round_scoring" | Unit 2 | Layout restructure, depends on Unit 1 |

### Parallelization recommendation
- **Wave 1:** Ticket 1 only — must complete and merge first
- **Wave 2 (after wave 1 merged):** Ticket 2

### Sizing guidance
- Ticket 1: ~10 files, ~50 lines added — single agent session
- Ticket 2: ~3 files, ~40 lines changed — single agent session
