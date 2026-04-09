# Iteration: Design Intent — Advance Without Saving

## Assignment
Resolve whether advance-without-saving during `round_scoring` is intentional design or a data-loss bug.

## Findings

### Finding: Advance-Without-Saving is Intentional — Bar Trivia Model
- **Evidence:** Commit 0b531b90 explicitly states: "Add a new `round_scoring` AudienceScene... for **bar/pub trivia model** via a dedicated RoundScoringPanel, replacing per-question auto-scoring during recap." Quick-score (1-9 keys) is available during `round_scoring` scene per CLAUDE.md keyboard shortcuts. Game store comment (line 89): `// Per-round scoring (bar trivia)`. Scene tests explicitly test all exit paths without gating on panel submission.
- **Confidence:** Very High
- **Relation to Phase 1:** Confirms Area 3 finding but reframes it — not a bug, intentional dual-mechanism design.
- **Significance:** The 4 exit paths that skip `setRoundScores()` are by design. Quick-score (1-9 keys) is the primary mechanism; RoundScoringPanel is an optional secondary UI.

### Finding: Quick-Score as Primary, Panel as Secondary
- **Evidence:** `adjustTeamScore()` (scoring.ts:8-31) directly modifies `roundScores[currentRound]` — scores persist immediately without any panel interaction. `useQuickScore` hook documents: "Per-question team scoring via keyboard (1-9 keys)." Available during all `SCORING_PHASE_SCENES` including `round_scoring`.
- **Confidence:** Very High
- **Relation to Phase 1:** Extends Area 2 finding. Phase 1 identified the overwrite semantics but didn't identify that quick-score IS the expected primary path.
- **Significance:** Both mechanisms are designed to work in parallel. A presenter can use only quick-score, only the panel, or both (panel overwrites quick-score).

### Finding: Panel Can Submit Zero Scores — No Validation Guard
- **Evidence:** RoundScoringPanel test (line 107-130) shows the panel can submit with unentered teams defaulting to 0. No validation error occurs.
- **Confidence:** High
- **Relation to Phase 1:** Extends Area 2 finding about null-to-0 defaulting.
- **Significance:** This confirms the panel is a convenience UI, not a required step. However, the zero-default creates a UX risk: a presenter who partially fills the panel and clicks Done will zero out unentered teams, overwriting any quick-score accumulation.

## Resolved Questions
1. **Is advance-without-saving a bug?** No. Intentional bar-trivia design.
2. **Is the RoundScoringPanel optional?** Yes. Quick-score alone populates `roundScores[currentRound]`.
3. **Can a presenter skip the panel entirely and get correct scores?** Yes.

## Remaining Unknowns
1. No E2E tests verify the "quick-score-only" path through `round_scoring`.
2. UX clarity: is it obvious to presenters that the panel is optional? No inline help text warns of this.

## Revised Understanding
The `round_scoring` scene is a dual-mechanism scoring step. The absence of `setRoundScores()` in 4 of 5 exit paths is intentional because quick-score has already populated `roundScores[currentRound]`. The real UX problem is not data loss but **lack of clarity** — presenters may not understand the panel is optional, and partial panel submission silently zeros unentered teams.
