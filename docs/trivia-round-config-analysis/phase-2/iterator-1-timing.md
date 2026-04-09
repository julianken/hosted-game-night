# Iteration: Timing Problem Resolution

## Assignment
Resolve the timing problem: roundIndex assigned at import time (Step 1) but user changes rounds in Step 2.

## Findings

### Option B (New Engine Function) is Best Fit
- **Evidence:** Engine functions are pure, testable, match existing patterns. `updateSettings()` in lifecycle.ts only updates settings, does NOT touch questions. No existing "redistribute" logic exists.
- **Confidence:** high
- **Relation to Phase 1:** Confirms area-2 finding that assignment happens only at import time
- **Significance:** Requires new function + trigger mechanism, but minimal architectural change

### updateSettings() Does Not Redistribute
- **Evidence:** `lifecycle.ts:133-155` — merges settings, updates totalRounds and timer, returns. No question roundIndex modification.
- **Confidence:** high
- **Significance:** This is the gap — changing roundsCount leaves questions with stale roundIndex values

### Option A (Re-call importQuestions) Works But Overloads Semantics
- **Evidence:** importQuestions() is designed for external data import, not internal redistribution. It would work mechanically but muddies intent.
- **Confidence:** high

### Option C (Defer to Game Start) is Too Invasive
- **Evidence:** `startGame()` at lifecycle.ts:66 uses `findIndex(q => q.roundIndex === 0)`. `nextRound()` in rounds.ts filters by roundIndex. Scene engine depends on roundIndex during play.
- **Confidence:** high
- **Significance:** Would require rewriting round navigation — not worth it

## Resolved Questions
- "Should redistribution happen at settings change time?" → YES, via a new engine function or store action
- "Which option requires fewest changes?" → Option B (new function) — ~1 new file + 1 trigger point

## Remaining Unknowns
- Exact trigger mechanism (React effect in SetupGate vs explicit action in store)

## Revised Understanding
The timing problem is real but solvable with a lightweight new function. The key insight is that `importQuestions()` already reads roundIndex from questions — so we just need a function that rewrites roundIndex on existing questions and re-imports them.
