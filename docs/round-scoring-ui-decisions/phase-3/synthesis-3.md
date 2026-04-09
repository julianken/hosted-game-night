# Synthesis 3: Gap & Implication

## Synthesis Approach
Examined what the evidence does NOT tell us, what the implications are for implementers, and what future work is created or foreclosed by these choices.

## Core Narrative
The plan is well-specified for what it covers but has several gaps-by-omission: the N key bypass is unaddressed, the Right Arrow advance-without-save path has no warning mechanism, and the handleClear behavior is under-specified. The most significant implication is that the pre-fill guard is load-bearing for three features simultaneously (pre-fill, back-nav safety, Clear behavior). The plan's choice to defer state lifting is sound but forecloses panel relocation without follow-up work.

## Key Gaps

### G1: N Key Bypass Is Unaddressed (Medium)
The plan blocks Enter but says nothing about N key (`next_round`), which also advances without saving — more aggressively, skipping to the next round entirely. No re-entry possible. Implementer must consciously decide: block N, add confirmation, or accept the risk (consistent with N being a power-user shortcut with no confirmation in any scene).

### G2: Right Arrow Advances Without Warning (Low)
Plan explicitly preserves Right Arrow as "advance without save." UX guidance text (R5) must state "Panel entries are not saved until you click Done" — not just "digit-key scores are saved."

### G3: handleClear Reset Behavior Under-Specified (Low)
Iterator 2 recommends reset-to-prefill. But "Clear" showing pre-filled values is confusing ("I clicked Clear and values appeared"). **Recommendation: keep reset-to-null.** Clear means empty. A "Reset to quick scores" would be a separate action.

### G4: RoundSummary Overlay (None)
Structurally impossible overlap — `showRoundSummary` auto-hides when scene leaves `round_summary`. No action needed.

### G5: RoundScoringView Content Priority (Low)
No resolution on ordering. **Recommendation: standings first (compact, 1-2 lines), questions second (scrollable reference).** Presenter sees "who's winning" without scrolling.

### G6: No Test for Full Quick-Score + Panel Interaction (Medium)
P0 tests exercise advance-without-save and setRoundScores independently. No test covers: quick-score → enter round_scoring → panel pre-fills → modify entries → Done → verify overwrite. **Add as P0 test.**

### G7: Audience Display During Back-Nav (Low)
Audience sees momentary transition from RoundScoringScene to recap_qa. Effectively instant via BroadcastChannel. Verify visually, no code needed.

## Key Implications

### I1: Pre-Fill Guard Is Load-Bearing (High)
The guard `(committed !== undefined && committed > 0)` is the safety net for pre-fill, back-nav recovery, AND Clear behavior. If it has a bug, three features degrade. Must be tested exhaustively with edge cases.

### I2: Dead-State Removal Is Wide But Shallow (Low)
~22 lines across ~17 files. Ship as single atomic PR to minimize merge conflict window. TypeScript catches all missed references.

### I3: Enter Block Requires CLAUDE.md Update (Medium)
First exception to universal "Enter = skip." CLAUDE.md keyboard shortcuts table must be updated in same PR. Not reflected in Area 5 work-unit scope — add to WU-4 checklist.

### I4: RoundScoringView Needs Design Input (Medium)
Purely presentational but multiple open design questions (content order, explanation visibility, category badges). Should validate with visual mockup via Playwright MCP before finalizing.

### I5: setRoundScores Manual-Copy Pattern Is Brittle (Low)
Pre-existing debt: `setRoundScores` manually copies state fields. If future state-lift adds fields without updating this action, state silently drops. Note for future work, not blocking.

## Decisions Enabled
1. Deferring state lifting is safe (pre-fill + sidebar-stays = no remount during round_scoring)
2. 4-wave sequencing is validated (one addition: scene-transitions side effect for back-nav)
3. Tests can be written before changes (pure functions, independently implementable)

## Decisions Constrained
1. Panel relocation to center foreclosed without state lifting follow-up
2. No confirmation dialog for advance-without-save (UX guidance is sole protection)
3. CLAUDE.md update scope is broader than documented

## Future Work Created
1. State lifting (Option B) — deferred, medium scope follow-up if panel needs to relocate
2. E2E test for full scoring flow — deferred to post-merge
3. `setRoundScores` manual-copy refactor — pre-existing debt
4. N key behavior decision — unresolved, needs conscious choice

## Future Work Foreclosed
1. Auto-save on advance — implicitly rejected (bar-trivia: panel is optional)
2. Panel in modal/drawer — requires state lifting first

## Blind Spots
- No user research on how presenters actually use the scoring flow
- N key behavior gap was not raised in any investigation area
- Audience experience during back-nav transitions not tested
