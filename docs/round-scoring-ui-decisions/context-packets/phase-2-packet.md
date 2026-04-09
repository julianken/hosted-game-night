# Context Packet: Phase 2

## Themes

### Theme 1: Pre-fill is validated and safe
- Guard `(committed !== undefined && committed > 0)` handles all edge cases correctly
- Negative roundScores impossible (engine enforces `Math.max(0, ...)`)
- Re-entry after submit shows submitted values (idempotent, correct)
- Round 2+ handled by `undefined` check (array may be short)
- `onProgressChange` fires on mount with pre-filled values — audience sees pre-filled counts immediately (acceptable)
- Minor enhancement: `handleClear` should reset to pre-fill values, not null

### Theme 2: Enter key should be blocked (not redirected)
- Option B (redirect to submit) has a flaw: submitting partial entries zeroes unentered teams
- Option A (block) is simpler: one conditional in use-game-keyboard.ts
- Right Arrow remains the explicit "advance" action; Done button remains the explicit "submit"
- CLAUDE.md keyboard shortcuts need updating

### Theme 3: RoundScoringView is straightforward
- No props — uses `useGame()` directly
- All data already available: `currentRoundQuestions`, `teamsSortedByScore`, `currentRound`
- Reuses patterns from `RoundSummary.tsx` (standings) and `QuestionDisplay.tsx` (question cards)
- Integration: single ternary in page.tsx at the QuestionDisplay render point
- ~150-200 lines, purely presentational

### Theme 4: Hidden dependency in back navigation
- `round_scoring` → `recap_qa` requires `recapShowingAnswer: true` side effect in scene-transitions.ts
- Without this, backing from scoring shows question face instead of answer face
- WU-3 scope must include this side effect + test

### Theme 5: Dead state cleanup is simple but wide
- `roundScoringInProgress` written in 4 locations, never read as guard — remove entirely
- ~22 line changes across ~17 files (mostly test assertion deletions)
- Ctrl+Z fix: exclude `round_scoring` from global handler (1 line)
- Done button: add `type="button"` (defensive, not urgent)

## Confidence Levels

**High confidence:**
- Pre-fill guard logic is correct (all edge cases verified against engine code)
- RoundScoringView data sources are all available (verified in useGame hook)
- `roundScoringInProgress` is dead state (exhaustive grep confirms 0 guard reads)
- Ctrl+Z dual handler conflict exists and fix is straightforward

**Medium-high confidence:**
- Enter key block is the right choice (changes existing behavior — needs CLAUDE.md update)
- scene-transitions side effect needed for back nav (verified against existing patterns)

**Medium confidence:**
- `handleClear` reset-to-prefill behavior (UX preference, not a technical constraint)

## Contradictions Resolved

1. **Enter key: Block vs Redirect** — Iterator 1 initially leaned toward Option B (redirect to submit) but revised to Option A (block) after recognizing that submitting partial entries converts null→0, which is the exact destructive-overwrite problem pre-fill aims to prevent.

2. **WU-6 independence** — Area 5 placed center panel in Wave 3 (after nav). Iterator 4 confirmed WU-6 has no hard dependency on Wave 2, but recommends finalizing after pre-fill for UX text consistency.

3. **State lifting necessity** — Confirmed NOT needed. Pre-fill (R1) is the safety mechanism for back-navigate data recovery. State lifting deferred to future work.

## Open Questions

1. Should `handleClear` reset to pre-fill values or to null? (UX decision — not blocking)
2. Should the audience see pre-filled entry counts immediately on `round_scoring` entry? (Currently yes due to `onProgressChange` effect — confirm this is desired)
3. What specific UX guidance text should appear? (Deferred to implementation)

## Artifacts (read only if needed)
- `phase-2/iterator-1-enter-key.md`: Enter key options analysis, recommends block (Option A)
- `phase-2/iterator-2-prefill-edges.md`: Edge case validation, guard is correct
- `phase-2/iterator-3-scoring-view.md`: Component API, layout, integration point
- `phase-2/iterator-4-sequencing-verify.md`: 5 verification questions, 1 hidden dep found
- `phase-2/iterator-5-cleanup-spec.md`: Exact changes for dead state + Ctrl+Z + Done button
