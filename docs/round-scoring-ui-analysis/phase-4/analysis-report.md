# Round Scoring UI Analysis: Unified Report

## A) Executive Summary

The trivia presenter's `round_scoring` scene is functionally correct but architecturally misaligned with its role in the game flow. It is the only scene that couples a data-persistence action (submitting per-team round scores) with scene advancement, yet it was grafted into a 3-column layout designed for question-centric scenes where "advance" is the sole interaction. The result: the primary task — entering scores — is confined to a 320px sidebar while 60% of the viewport displays stale content, the two scoring mechanisms (quick-score digit keys and the RoundScoringPanel form) interact in ways invisible to the presenter, and five distinct exit paths exist where only one persists panel data. Correcting these issues requires no fundamental architectural changes: the state machine is sound, the scoring engine is well-tested, and the highest-value fixes (pre-filling the panel, relocating the scoring form, adding back navigation) are architecturally inexpensive. The critical prerequisite is establishing E2E test coverage for both exit paths before altering navigation semantics.

## B) Analysis Question & Scope

**Question:** What are the UX problems in the trivia presenter's `round_scoring` scene, and what improvements would make the scoring workflow efficient, error-proof, and consistent with the rest of the presenter flow?

**Scope:** `apps/trivia` presenter view at `/play`, scene `round_scoring`. In bounds: layout, data flow, navigation, accessibility. Out of bounds: audience display redesign, new game features, other scenes beyond their interaction with `round_scoring`.

## C) Table of Contents

| # | Section | Summary |
|---|---------|---------|
| D | Methodology | Multi-phase analysis with thematic, risk/opportunity, and gap/implication synthesis lenses, grounded in code evidence. |
| E | Key Findings | Eight findings organized by theme: layout inversion, dual-mechanism confusion, navigation inconsistency, wasted center panel, dead technical state, missing back navigation, keyboard handler conflicts, and local state fragility. |
| F | Analysis & Implications | Cross-cutting patterns including the bar-trivia design intent, the single-scene exception dilemma, and the test-coverage prerequisite. |
| G | Confidence Assessment | Overall High confidence, with strongest claims on layout and state machine, moderate on scoring interaction risks, and weakest on mobile and real-world usage. |
| H | Recommendations | Six prioritized recommendations from pre-fill panel values (highest value/effort) through systematic cleanup. |
| I | Open Questions | Seven questions surfaced but not answered by this analysis. |
| J | Appendix: Evidence Index | Finding-to-source mapping table. |

## D) Methodology

This report synthesizes a multi-phase codebase analysis:

- **Phase 1 (Exploration):** Five focused investigations covering layout (`area-1`), data flow (`area-2`), navigation (`area-3`), answer reference content (`area-4`), and accessibility (`area-5`). Each traced code paths from the presenter's `/play` page through stores, engine functions, and components.
- **Phase 2 (Iteration):** Five follow-up investigations: design intent via git history (`iterator-1`), quantified layout measurements (`iterator-2`), double-advance race condition (`iterator-3`), answer data availability (`iterator-4`), and Ctrl+Z conflict plus dead state (`iterator-5`).
- **Phase 3 (Synthesis):** Three independent synthesis lenses — Thematic, Risk/Opportunity, and Gaps & Implications.
- **Phase 4 (This report):** Unified the three lenses. Convergent conclusions receive High confidence. Divergent conclusions are flagged.

**Quality criteria weighting:** Evidence strength (25%), Completeness (20%), Accuracy (20%), Actionability (15%), Nuance (10%), Clarity (10%).

## E) Key Findings

### Finding 1: Layout Inversion — Primary Task Gets Least Space

**Confidence:** High | **Impact:** Critical

The `round_scoring` scene is the only scene where the primary presenter action (entering scores) happens in the 320px right sidebar rather than the flex-1 center panel. The center panel (~864px at 1440px viewport) continues displaying a stale `QuestionDisplay` card, keyboard shortcuts reference, and theme selector — none useful during scoring.

The sidebar provides ~464px of vertical space for `RoundScoringPanel` after `TeamManager` (~380px). Each team row is ~60px plus 132px overhead. At 5-6 teams, the panel overflows. Relocating to the center panel provides ~844px — a 2.7x increase — accommodating 12+ teams without scrolling.

### Finding 2: Invisible Dual-Mechanism Design Creates Silent Data Conflict

**Confidence:** Very High | **Impact:** High

Two independent scoring mechanisms operate during `round_scoring`:

1. **Quick-score digit keys (1-9/0):** Call `adjustTeamScore()` — additive `+1`/`-1` on `team.roundScores[currentRound]`.
2. **RoundScoringPanel form:** "Done" calls `setRoundScores()` — absolute writes via `setTeamRoundScoreEngine()`. Unentered teams default to `0`.

The conflict: if the presenter accumulates quick-score points then clicks "Done" with only some teams filled, unentered teams are zeroed. The `QuickScoreGrid` is hidden during `round_scoring`, yet the keyboard handlers remain active — invisible dual input. The bar-trivia intent (confirmed via commit `0b531b90`) treats quick-score as primary and the panel as optional, but this intent is completely invisible in the UI.

### Finding 3: Five Exit Paths, Only One Saves Panel Data

**Confidence:** High | **Impact:** High

| # | Mechanism | Saves Panel Data? |
|---|-----------|-------------------|
| 1 | "Done" button | Yes |
| 2 | Right Arrow / Forward nav | No |
| 3 | Enter key | No |
| 4 | N key (next round) | No |
| 5 | E key (emergency blank) | No (pauses) |

Paths 2-4 advance without saving panel entries. This is intentional per the bar-trivia model (quick-score is already persisted), but the UI makes no distinction. The forward nav label is "View Scores" regardless of panel state. No confirmation dialog exists. This is architecturally unique: `round_scoring` is the only scene where the nav button and the primary action button do different things.

### Finding 4: Available Data Not Shown in Center Panel

**Confidence:** High | **Impact:** High

The store contains data useful for scoring that the center panel doesn't display:
- **Round questions with correct answers:** `state.questions.filter(q => q.roundIndex === state.currentRound)`
- **Current accumulated scores:** `team.roundScores[currentRound]`
- **Team standings:** available via sorted `teams` array

Note: `teamAnswers` is empty in bar-trivia mode (no per-question recording). The `RoundSummary` component is pure presentational and reusable for standings.

### Finding 5: `roundScoringInProgress` is Dead State

**Confidence:** High | **Impact:** Low

Set `true` on entry (scene-transitions.ts:302), cleared by `setRoundScores()` (game-store.ts:248). Never read as a guard anywhere in the codebase. Likely intended as a navigation safeguard that was never wired up.

### Finding 6: No Back Navigation from `round_scoring`

**Confidence:** Very High | **Impact:** Medium

`getNextScene('round_scoring', 'back')` returns `null`. ArrowLeft excludes `round_scoring`. Once entered, the presenter can only go forward or skip ahead. Adding back navigation to `recap_qa` requires 3 one-line changes. Caveat: panel uses local `useState`, so navigating away loses entries.

### Finding 7: Ctrl+Z Dual Handler Conflict

**Confidence:** High | **Impact:** Low

Both `RoundScoringPanel` (line 111-125) and `use-game-keyboard.ts` (line 282-288) handle Ctrl+Z. When focus is outside inputs, both fire — panel undo stack and quick-score undo stack operate independently. Rarely visible in practice but architecturally unsound.

### Finding 8: RoundScoringPanel State is Completely Local

**Confidence:** High | **Impact:** Medium

`entries` and `undoStack` are React `useState`. Lost on unmount. Not persisted in Zustand store. This is acceptable for the current optional-sidebar design but becomes a constraint if back navigation is added or the panel is relocated to the center panel.

## F) Analysis & Implications

### F.1: The Bar-Trivia Design Intent is Sound but Invisible

The dual-mechanism architecture is intentional. Quick-score is the primary, low-friction path; the panel is an optional override. Confirmed by commit `0b531b90` and `SCORING_PHASE_SCENES`. The problem is not the architecture but the communication — no UI indicates the panel is optional or that advancing preserves quick-score data.

### F.2: The Single-Scene Exception Dilemma

The center panel renders identically across all `between_rounds` scenes. Changing it for `round_scoring` creates a one-off exception. A broader overhaul (scene-aware center for all `between_rounds` scenes) is more consistent but much larger scope. **Recommendation: start with Option A (single-scene exception)** — `round_scoring` is architecturally unique and justifies it.

### F.3: Test Coverage Must Precede Navigation Changes

Zero E2E files reference `round_scoring`. Unit tests cover only the happy path. Before altering navigation semantics, establish integration tests for: advance-without-save preserving quick-score, `scoreDeltas` correctness per exit path, and multi-round scoring.

### F.4: Strengths to Preserve

1. **Sound state machine:** Purely functional, exhaustively tested, TypeScript exhaustiveness checking.
2. **Pure scoring engine:** Immutable state, `deepFreeze`.
3. **Clean separation:** Scene layer orthogonal to `GameStatus`.
4. **Audience progress feedback:** Real-time progress bar via `roundScoringEntries`.

## G) Confidence Assessment

**Overall Confidence: High.**

### Strongest Claims (Very High)
- Layout inversion: scoring in 320px, stale content in 864px (measured from code)
- Back navigation missing (direct code: `getNextScene` returns null)
- `roundScoringInProgress` is dead state (grep: 0 guard reads)
- Panel overwrite zeroes quick-score (traced through engine)

### Moderate Claims (High)
- Sidebar overflows at 5-6 teams (calculated, not empirically tested at all breakpoints)
- Dual Ctrl+Z fires both stacks (code confirmed; quick-score stack typically empty)
- `scoreDeltas` may diverge on advance-without-save (logic analysis, not tested)

### Weakest Claims (Medium)
- First-time presenters face data-zeroing risk (inferred, no user research)
- Mobile/tablet usability issues (extrapolated from fixed widths)

### Blind Spots
1. No real-world usage data (analytics, user reports)
2. No mobile/tablet testing
3. No performance profiling of `setRoundScores` with 20 teams
4. Audience engagement during scoring pause unknown
5. `scoreDeltas` double-counting never empirically tested

## H) Recommendations

### Recommendation 1: Pre-fill RoundScoringPanel with Quick-Score Values
**Priority:** P0 (highest value/effort ratio)

Initialize entries with `team.roundScores[currentRound]` instead of `null`. Eliminates destructive overwrite risk, makes dual-mechanism visible, requires no state machine changes.

**Trade-offs:** Instruction text needs updating. Pre-filled vs manually entered values need visual distinction.

### Recommendation 2: Move Scoring UI into Center Panel During `round_scoring`
**Priority:** P1

Conditionally render scoring content in center panel: round question recap with correct answers + relocated scoring form (2.7x more space).

**Trade-offs:** Creates single-scene layout exception. May require lifting panel state to store if component remounts.

### Recommendation 3: Add Back Navigation from `round_scoring` to `recap_qa`
**Priority:** P2

Three one-line changes: state machine, back label, keyboard handler.

**Trade-offs:** Local panel state lost on navigate-away. Must solve via state lifting or accept data loss.

### Recommendation 4: Establish E2E Test Coverage Before Navigation Changes
**Priority:** P0 (prerequisite for Recommendations 2, 3)

Integration tests for: advance-without-save, panel submit + advance, N key skip, multi-round scoring.

**Trade-offs:** Test investment before UX improvement, but tests document intended behavior.

### Recommendation 5: Add Inline UX Guidance
**Priority:** P2

During `round_scoring`, show: "Scores from digit keys are already saved", "Use form to adjust or override", "Press Right Arrow to continue without changes."

**Trade-offs:** Space-constrained in sidebar; best paired with center panel relocation.

### Recommendation 6: Clean Up Dead State and Dual Handlers
**Priority:** P3

Remove or wire up `roundScoringInProgress`. Fix Ctrl+Z via `stopPropagation()` or scoping. Add `onKeyDown` with `preventDefault()` on Done button.

**Trade-offs:** If flag becomes a warning, adds friction to the intentional advance-without-save path.

## I) Open Questions

1. **Real-world scoring patterns:** What fraction of presenters use quick-score vs panel vs both?
2. **Mobile/tablet prevalence:** Do bar-trivia hosts commonly use tablets?
3. **Multi-round confusion:** Does confusion compound over 3-6 rounds or do presenters learn after round 1?
4. **Audience engagement:** Is the "Scoring in Progress" screen sufficient or does it create dead time?
5. **`scoreDeltas` fidelity:** Are gameplay-phase deltas accurate for the audience display after advance-without-save?
6. **Per-question scoring (future):** How would a non-bar-trivia mode interact with `round_scoring`?
7. **Panel state lifting scope:** Should `roundScoringEntries` be reused or should a separate draft field be added?

## J) Appendix: Evidence Index

| Finding | Source | File(s) | Key Lines |
|---------|--------|---------|-----------|
| F1: Layout inversion | Phase 1 Area 1, Phase 2 Iterator 2 | `page.tsx` | 362-378 (columns), 494-571 (sidebar), 388-492 (center) |
| F2: Dual-mechanism | Phase 1 Area 2, Phase 2 Iterator 1 | `use-game-keyboard.ts`, `RoundScoringPanel.tsx`, `game-store.ts` | SCORING_PHASE_SCENES:64-72, handleSubmit:102-108, setRoundScores:214-252 |
| F3: Five exits | Phase 1 Area 3 | `scene.ts`, `SceneNavButtons.tsx`, `use-game-keyboard.ts` | getNextScene:270-277, forward:61-66, N:217-231, Enter:272-273 |
| F4: Wasted center | Phase 1 Area 4, Phase 2 Iterator 4 | `page.tsx`, `RoundSummary.tsx` | Center:388-492, RoundSummary pure props |
| F5: Dead state | Phase 2 Iterator 5 | `scene-transitions.ts`, `game-store.ts` | Set:302, cleared:248, 0 guard reads |
| F6: No back nav | Phase 1 Area 3 | `scene.ts`, `nav-button-labels.ts` | getNextScene returns null, getBackLabel default |
| F7: Ctrl+Z dual | Phase 2 Iterator 5 | `RoundScoringPanel.tsx`, `use-game-keyboard.ts` | Panel:111-125, global:282-288 |
| F8: Local state | Phase 3 Synthesis 3 | `RoundScoringPanel.tsx` | useState:37,45 |
| Strength: State machine | Phase 3 Synthesis 2 | `scene.ts`, test files | 21+7 test cases, never guard |
| Test gap | Phase 3 Synthesis 3 | E2E directory | 0 matches for round_scoring |
