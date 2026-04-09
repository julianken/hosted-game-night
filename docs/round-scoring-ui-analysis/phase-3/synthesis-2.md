# Synthesis: Risk/Opportunity

## Synthesis Approach
Cataloged every risk, vulnerability, or problem alongside every opportunity, strength, or untapped potential. Each rated for severity/impact to enable prioritized decision-making.

## Core Narrative
The `round_scoring` scene is functionally complete but architecturally wasteful. The scoring data model is sound — `setTeamRoundScore` correctly writes per-round scores, `computeScoreDeltas` produces accurate rank changes, and the audience display provides real-time feedback. The greatest risks are not in correctness but in usability: the scoring form overflows at 5-6 teams, the center panel wastes 60% of the viewport, and the dual scoring mechanisms create a silent data conflict. The opportunities are substantial and architecturally inexpensive — the center panel could display useful context using existing store data, the panel could pre-fill with quick-score values, and back navigation is a one-line state machine addition.

## Key Conclusions

### Risk 1: Destructive Panel Overwrite of Quick-Score Accumulation
- **Type:** Risk
- **Severity/Impact:** High
- **Supporting evidence:** `setRoundScores` does absolute write via `setTeamRoundScoreEngine`. Unentered teams default to 0, zeroing quick-score accumulation.
- **Confidence:** Very High
- **Caveats:** Only when both mechanisms used in same round. No UI warns of this.

### Risk 2: Sidebar Overflow at 5-6 Teams
- **Type:** Risk
- **Severity/Impact:** High
- **Supporting evidence:** TeamManager (~380px) + RoundScoringPanel (132px overhead + 60px/team) exceeds 844px viewport at 5-6 teams.
- **Confidence:** High
- **Caveats:** Sidebar scrolls, so nothing inaccessible, but poor UX.

### Risk 3: No Back Navigation from round_scoring
- **Type:** Risk
- **Severity/Impact:** Medium
- **Supporting evidence:** `getNextScene('round_scoring', 'back')` returns null. Left Arrow excluded from `round_scoring`. One-way scene.
- **Confidence:** Very High
- **Caveats:** N key provides escape to next round.

### Risk 4: Ctrl+Z Dual Handler Confusion
- **Type:** Risk
- **Severity/Impact:** Low
- **Supporting evidence:** Both panel and global handlers fire on Ctrl+Z when focus outside inputs. Independent undo stacks.
- **Confidence:** High
- **Caveats:** Quick-score history typically empty during `round_scoring`, so dual fire rarely visible.

### Risk 5: Dead State `roundScoringInProgress`
- **Type:** Risk
- **Severity/Impact:** Low
- **Supporting evidence:** Set true on entry, never read as guard, persists through `nextRound()`. Dead state.
- **Confidence:** High
- **Caveats:** Code quality issue only.

### Opportunity 1: Center Panel Utilization
- **Type:** Opportunity
- **Severity/Impact:** Critical
- **Supporting evidence:** 864px center panel shows stale content. Round questions with correct answers available via store. RoundSummary is pure presentational. No async fetching needed.
- **Confidence:** Very High

### Opportunity 2: Move Scoring Form to Center Panel
- **Type:** Opportunity
- **Severity/Impact:** High
- **Supporting evidence:** Relocation provides 2.7x more vertical space (464px → 844px). Eliminates overflow for up to 12 teams.
- **Confidence:** High

### Opportunity 3: Pre-fill Panel with Quick-Score Values
- **Type:** Opportunity
- **Severity/Impact:** High
- **Supporting evidence:** `team.roundScores[currentRound]` contains accumulated quick-score values. Panel currently initializes to null. Pre-filling eliminates destructive overwrite risk.
- **Confidence:** Very High

### Opportunity 4: Add Back Navigation
- **Type:** Opportunity
- **Severity/Impact:** Medium
- **Supporting evidence:** One-line state machine addition: `if (trigger === 'back') return 'recap_qa'`. Plus back label and keyboard handler updates.
- **Confidence:** Very High

### Opportunity 5: Enhanced Audience Display
- **Type:** Opportunity
- **Severity/Impact:** Medium
- **Supporting evidence:** Current audience shows minimal "Scoring in Progress" with progress bar. Could show live standings.
- **Confidence:** High

### Strength 1: Sound State Machine Architecture
- **Type:** Strength
- **Severity/Impact:** High
- **Supporting evidence:** Purely functional, exhaustively tested (21 cases), TypeScript exhaustiveness checking. Changes are safe and predictable.
- **Confidence:** Very High

### Strength 2: Score Delta Computation
- **Type:** Strength
- **Severity/Impact:** Medium
- **Supporting evidence:** `setRoundScores` correctly computes `ScoreDelta[]` from `questionStartScores`. 5 test cases cover scoring paths.
- **Confidence:** Very High

## Blind Spots
1. Multi-device BroadcastChannel sync performance under rapid updates
2. Mobile/tablet presenter viewport constraints
3. Screen reader form semantics (no `role="form"`, no `onSubmit`)
4. Race condition window between `setRoundScores` and `advanceScene` synchronous calls

## Recommendations (high-level only)
1. Pre-fill scoring panel with quick-score values (highest value/effort ratio)
2. Move scoring form to center panel during `round_scoring`
3. Add back navigation from `round_scoring` to `recap_qa`
4. Remove or repurpose `roundScoringInProgress`
5. Guard Ctrl+Z conflict via `stopPropagation()` or scoping
