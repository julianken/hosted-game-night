# Synthesis: Gaps & Implications

## Synthesis Approach
Systematically identified what Phase 1/2 analyses did NOT examine, then traced implications for the project developer. For each gap: does it change conclusions? Does it constrain or expand design decisions?

## Core Narrative
The evidence is heavily concentrated on the presenter-side experience and static code structure. Notably absent: real-world usage patterns, mobile/tablet workflows, audience visual experience during scoring, and full scoreDeltas divergence implications. These gaps don't undermine core findings — layout inversion is objectively measurable, dual-mechanism semantics are confirmed by commit messages — but they constrain which improvements can be confidently designed. The most consequential gap: zero E2E test coverage for the advance-without-save path. The developer can redesign layout and improve clarity, but cannot safely change navigation semantics without first establishing test coverage for both exit paths.

## Key Conclusions

### Gap 1: Audience Display Fidelity During Advance-Without-Save
- **Type:** Evidence Gap
- **Supporting evidence:** `scoreDeltas` computed at `question_closed → round_summary` transition; `setRoundScores()` overwrites with fresh deltas. On advance-without-save, audience sees gameplay-phase deltas (correct for quick-score-only, misleading if panel was partially filled).
- **Confidence:** High
- **Caveats:** Only relevant if presenter uses panel partially then abandons it.

### Gap 2: No Mobile/Tablet Presenter Testing
- **Type:** Evidence Gap
- **Supporting evidence:** All measurements assume 1440px desktop. On 1024px iPad landscape, center panel would be only 384px. No responsive breakpoints in the layout.
- **Confidence:** Medium
- **Caveats:** If presenters exclusively use desktops, immaterial. Common for bar trivia hosts to use tablets.

### Gap 3: Zero E2E Test Coverage for round_scoring
- **Type:** Decision Constraint
- **Supporting evidence:** No E2E files reference `round_scoring`. Store tests cover only `setRoundScores()` happy path. No test verifies: advance-without-save preserves quick-score, scoreDeltas correctness per exit path, roundScoringInProgress lifecycle across rounds.
- **Confidence:** High
- **Caveats:** Unit tests for happy path are thorough; gap is in alternative paths and integration.

### Gap 4: Center Panel Redesign Breaks Layout Invariant
- **Type:** Design Implication
- **Supporting evidence:** Phase 1 Area 1 scene comparison: center panel renders identically across ALL five `between_rounds` scenes. Changing it for `round_scoring` alone creates a one-off exception. Broader `between_rounds` overhaul is more consistent but much larger.
- **Confidence:** High
- **Caveats:** A single-scene exception may be acceptable if clearly scoped.

### Gap 5: RoundScoringPanel State is Completely Local
- **Type:** Design Implication
- **Supporting evidence:** `entries` and `undoStack` are `useState` (lines 37-45). Lost on unmount. Moving panel from sidebar to center causes remount and data loss. No way to restore state on re-entry. Store has no knowledge of what's been entered (only `roundScoringEntries` for audience display).
- **Confidence:** High
- **Caveats:** By design for optional panel, but becomes constraint if panel is elevated to prominent role.

### Gap 6: Quick-Score During round_scoring is Invisible
- **Type:** Design Implication
- **Supporting evidence:** `SCORING_PHASE_SCENES` includes `round_scoring` (digit keys active), but `QuickScoreGrid` hidden (page.tsx:513 guard). Presenter can toggle scores via keyboard with no visual feedback.
- **Confidence:** High
- **Caveats:** In practice, panel users probably don't simultaneously use digit keys.

### Gap 7: round_scoring is a One-Shot Scene with No Re-Entry
- **Type:** Evidence Gap
- **Supporting evidence:** No transition from any downstream scene leads back to `round_scoring`. `recap_scores + back` → `recap_qa`, not `round_scoring`. If presenter advances past and realizes mistake, only option is manual score adjustment via TeamScoreInput in non-scoring scenes or N key to skip to next round.
- **Confidence:** High
- **Caveats:** Adding back transition from `recap_scores` to `round_scoring` requires re-initializing panel state (local React state, per Gap 5).

## Blind Spots
1. No user research or usage analytics — all findings from code analysis only
2. No performance analysis of `setRoundScores()` with 20 teams (20 sequential deepFreeze calls)
3. No analysis of presenter mental model transition from per-question to per-round scoring
4. No analysis of multi-round consistency (does confusion compound over 3-6 rounds?)
5. Phase 1 Area 2 `scoreDeltas` double-counting concern never conclusively tested

## Recommendations (high-level only)
1. Establish E2E and integration test coverage for both exit paths BEFORE any UX changes
2. Consider lifting RoundScoringPanel entries to the store if elevating panel to center role
3. Decide scope first: single-scene exception or systemic `between_rounds` center panel overhaul
4. Add inline UX guidance clarifying panel is optional and quick-score values are already saved
5. Address `roundScoringInProgress`: remove as dead code or wire into soft warning
