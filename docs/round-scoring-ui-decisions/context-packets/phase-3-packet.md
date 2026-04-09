# Context Packet: Phase 3

## 3 Synthesis Outputs Compared

### Where All 3 Agree
- Pre-fill is the highest-value, lowest-risk change (one-line initializer)
- Enter should be blocked (not redirected) during round_scoring
- Back nav requires 4 changes (not 3): scene.ts + nav-labels + keyboard + scene-transitions side effect
- `roundScoringInProgress` is dead state — remove entirely
- State lifting is correctly deferred; pre-fill is sufficient safety net
- 4-wave sequencing is validated
- RoundScoringView is purely presentational, ~150-200 lines, no props

### Where They Diverge
- **handleClear behavior**: Synthesis 1 says reset-to-prefill; Synthesis 3 says keep reset-to-null (simpler mental model). **Resolution: reset-to-null is better.** "Clear" should mean empty, not "revert to quick-scores."
- **N key**: Synthesis 3 identifies this as an unaddressed gap. Syntheses 1 and 2 don't mention it. **Resolution: leave N key as-is.** It's a power-user shortcut, consistent with its behavior in all other scenes. Document it in UX guidance.

### Strongest Conclusions (all 3 agree, high evidence)
1. Pre-fill guard `(committed !== undefined && committed > 0)` is correct for all edge cases
2. scene-transitions.ts side effect (recapShowingAnswer: true) is required for back nav
3. Ctrl+Z fix: exclude round_scoring from global handler (panel owns Ctrl+Z during that scene)
4. Wave 1 (tests + pre-fill) can truly run in parallel — zero file overlap

### Largest Blind Spots
1. No real-world presenter feedback on any proposed change
2. N key behavior gap — conscious decision needed but not blocking
3. No E2E test coverage exists or is planned before merge (Vitest only)
4. RoundScoringView content ordering needs design input (recommend standings first)

### New Findings from Synthesis
- **G6 (Synthesis 3)**: No test covers the full quick-score → panel pre-fill → modify → Done sequence. Add as P0 test.
- **I3 (Synthesis 3)**: CLAUDE.md keyboard shortcuts update must be in WU-4 scope (not mentioned in Area 5).
- **I5 (Synthesis 3)**: `setRoundScores` manual-copy pattern is pre-existing debt — note for future but not blocking.

## Artifacts
- `phase-3/synthesis-1.md`: Thematic — 4 themes (dual-mechanism trust, keyboard blind spot, navigation integrity, dead state hygiene)
- `phase-3/synthesis-2.md`: Risk/Opportunity — 7 risks (R3 highest), 6 opportunities (O1 highest), 5 constraints
- `phase-3/synthesis-3.md`: Gap/Implication — 7 gaps, 5 implications, future work analysis
