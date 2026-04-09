# Context Packet: Phase 1

## Key Findings

1. **Layout inverts task importance** — Center panel (60-70% width) shows stale QuestionDisplay during `round_scoring`; scoring form crammed in 320px sidebar. RoundSummary overlay auto-hidden. Visual hierarchy: stale question > team list > scoring (should be reversed). (Area 1, high confidence)

2. **4 of 5 exit paths skip score persistence** — Only the Done button calls `setRoundScores()`. Forward nav, ArrowRight, Enter, and N key all advance without saving. `roundScoringInProgress` flag is never used as a guard. No confirmation dialog exists. (Area 3, high confidence)

3. **`setRoundScores()` destructively overwrites quick-score accumulation** — calls `setTeamRoundScore()` which unconditionally replaces `roundScores[currentRound]`. Quick-score uses `adjustTeamScore()` (additive). The two mechanisms write to the same slot with no coordination. (Area 2, high confidence)

4. **All answer data is available but not surfaced** — `questions`, `teamAnswers`, `teams`, `displayQuestionIndex` all persist through the `recap_qa → round_scoring` transition. `RoundSummary` is a pure presentational component (props-only, no store reads). Center panel could show answer reference with zero data fetching. (Area 4, high confidence)

5. **Keyboard conflicts are mitigated by input focus, but emerge outside inputs** — Global handler returns early for `HTMLInputElement` (lines 125-130). Enter on Done button may cause double-advance (button click + SKIP trigger). Ctrl+Z has dual handlers (component + global). (Area 5, medium-high confidence)

6. **`scoreDeltas` diverge between Done and nav-advance paths** — Done computes fresh deltas; nav-advance leaves stale deltas from `round_summary` transition. `recap_scores` audience display shows different animated overlays depending on which path was taken. (Area 2, high confidence)

7. **`round_scoring` is architecturally unique** — Only scene where nav button and primary action button do different things. Other scenes: nav button IS the primary action. Scene engine wasn't designed for "data persistence coupled to advancement." (Area 3, high confidence)

## Confidence Levels

**High confidence:**
- Layout wastes center panel space (Area 1 — direct code evidence)
- 5 exit paths, only 1 saves (Area 3 — traced all handlers)
- `setRoundScores()` overwrites quick-score (Area 2 — engine code)
- Answer data available in store (Area 4 — type definitions + transition code)
- Touch targets meet 44x44px (Area 5 — explicit `minHeight`/`minWidth`)

**Medium confidence:**
- Enter on Done button causes double-advance (Area 5 — depends on event ordering, not tested)
- `aria-live` progress counter may not announce correctly (Area 5 — not verified with screen reader)

**Low confidence:**
- Whether `questionStartScores` baseline causes delta double-counting (Area 2 — complex interaction, needs testing)

## Contradictions & Open Questions

1. **Is the "advance without saving" behavior intentional?** Area 2 notes quick-score accumulation persists even without `setRoundScores()`, suggesting the scoring panel is optional (bar-trivia style). Area 3 treats it as a data-loss bug. The design intent is unclear.

2. **Ctrl+Z double-handler** — Area 5 found both RoundScoringPanel and global hook handle Ctrl+Z during `round_scoring`. When focus is on an input, only the panel's handler fires (correct). When focus is elsewhere, both fire (panel undo + quick-score undo on different stacks). Is this a real problem or theoretical?

3. **`roundScoringInProgress` purpose** — Area 2 notes it's never read as a guard, only set. Area 3 notes it was never wired up as a navigation guard. Was this an incomplete feature or intentionally display-only?

## Artifacts (read only if needed)
- `phase-1/area-1-layout.md`: Layout analysis, column widths, visual hierarchy during round_scoring
- `phase-1/area-2-data-flow.md`: setRoundScores vs adjustTeamScore, scoreDeltas, roundScoringInProgress
- `phase-1/area-3-navigation.md`: 5 exit paths, Enter/N/ArrowRight behavior, guard absence
- `phase-1/area-4-answer-reference.md`: Available store data, RoundSummary reusability, audience display
- `phase-1/area-5-accessibility.md`: Keyboard conflicts, touch targets, screen reader support, Ctrl+Z
