# Area 5: Cross-Question Interaction Analysis

**Phase:** 1 — Investigate
**Questions addressed:** All 6 (interaction effects)
**Agent type:** feature-dev:code-architect
**Date:** 2026-03-05

---

## Purpose

Map how the answers to Q1-Q6 affect each other. Identify "if X then Y must also change" constraints and shared data dependencies.

---

## Decision Dependency Matrix

| Decision | Depends On | Affects |
|----------|-----------|---------|
| Q1 (QPR Display) | Q3 (redistribution output provides `perRoundBreakdown`) | Q5 (same data source) |
| Q2 (Trigger Timing) | None — independent | Q3 (informs when the effect fires, not what it depends on) |
| Q3 (Dependency Array) | Q2 (fire timing determines if debounce is in play) | Q1, Q5 (the effect produces the data both components consume) |
| Q4 (Preset Schema) | Q1, Q5 (if presets need to restore a specific display, they need the mode) | None in phase 1 (deferred) |
| Q5 (Review Grid) | Q3 (redistribution output provides `perRoundExpected`) | Q6 (test assertions need to know what "correct" looks like) |
| Q6 (E2E Strategy) | Q1, Q2, Q5 (test scenarios depend on the chosen behaviors) | None — downstream consumer |

### Key Dependency Chain

```
Q2 (fire on every onChange)
  → Q3 (dependency array: [questions, roundsCount, questionsPerRound])
    → redistributeQuestions() runs
      → produces { perRoundCounts, categoryBreakdown }
        → Q1 consumes perRoundBreakdown (category badges in Step 2)
        → Q5 consumes perRoundExpected (isMatch in Review grid)
          → Q6 tests assert against the visible output of Q1 and Q5
```

Q4 (preset schema) is independent of this chain — it was decided NO, meaning the chain above is self-contained within the settings store + game store + UI components.

---

## Critical Shared Data: `perRoundExpected` and `perRoundBreakdown`

The most important cross-cutting finding is that **Q1 and Q5 consume outputs of the same computation.**

### Q1 needs: `perRoundBreakdown`
```typescript
{ roundIndex: number; count: number; categories: string[] }[]
```
Used to render category badge pills showing what each round contains.

### Q5 needs: `perRoundExpected`
```typescript
number[]  // expected question count per round
```
Used to determine `isMatch` for the green/amber review grid pills.

### These are the same data

`perRoundExpected[i]` is just `perRoundBreakdown[i].count`. The redistribution function produces both pieces of information as a natural byproduct of assigning `roundIndex` to questions:

```typescript
// Pseudocode for the redistribution output shape:
interface RedistributionResult {
  questions: Question[];           // with updated roundIndex values
  perRoundCounts: number[];        // [5, 4, 3, ...] — derived from counting
  perRoundCategories: string[][];  // [['Science'], ['History', 'Geography'], ...] — derived from grouping
}
```

### Architectural implication

Both `WizardStepSettings` (Q1) and `WizardStepReview` (Q5) should receive this data from a **single upstream computation** — not derive it independently. The correct location is:

1. **`redistributeQuestions()` engine function** produces the redistribution and updates game store questions.
2. **`SetupGate`** derives `perRoundBreakdown` from the current game store questions (a selector or `useMemo`).
3. **`SetupGate`** passes `perRoundBreakdown` down through `SetupWizard` to both `WizardStepSettings` and `WizardStepReview`.

This avoids:
- Duplicate computation in two components
- Inconsistent results if the two components derive differently
- Extra store reads in presentational components

---

## Interaction: Q2 (Trigger) + Q1 (Display)

If Q2 chose "fire only on settle" (debounced), Q1's category badge display would show stale data during slider drag. The user would see the slider thumb at position 4 but the category breakdown would still reflect position 3 until the debounce fires.

**Q2 chose "fire on every onChange"** — this means Q1's display updates live as the slider moves, which is the superior UX. No conflict.

## Interaction: Q2 (Trigger) + Q5 (Review Grid)

Same reasoning. With "fire on every onChange," the review grid's green/amber pills update in real-time as the user adjusts settings. If Q2 had chosen debounce, the review grid would show incorrect match status during drag.

**No conflict with Q2's decision.**

## Interaction: Q4 (Preset Schema) + Q1/Q5

Q4 decided NO — `isByCategory` is not stored in presets. This means loading a preset does not change the user's category mode. The redistribution guard (`skipNextRedistribution`) prevents re-computation on preset load regardless.

If Q4 had decided YES, loading a preset would potentially toggle `isByCategory`, which would change:
- Q1: whether the category badge display or the QPR slider is shown
- Q5: whether `isMatch` uses `perRoundExpected` or `questionsPerRound`

**Since Q4 is NO, these interactions are moot for phase 1.**

## Interaction: Q3 (Dependencies) + feedback loop risk

The dependency array `[questions, roundsCount, questionsPerRound]` creates a theoretical feedback loop because `redistributeQuestions` writes back to `questions`. This is contained by the engine function's **idempotent short-circuit**: if redistribution produces the same `roundIndex` assignments, it returns the existing state object unchanged, preventing Zustand from updating the store, preventing the selector from producing a new reference, preventing the effect from re-firing.

This is the most critical constraint in the entire system. Both Q1 and Q5 are downstream consumers of the redistribution output — they do not participate in the feedback loop. The loop exists only between the effect (Q3) and the engine function.

---

## Constraints Summary

1. **perRoundBreakdown must be computed once, upstream, and passed to both Q1 and Q5 components.** Do not duplicate the derivation.
2. **redistributeQuestions must be idempotent.** If it produces the same distribution, it must return the same state reference. This is non-negotiable — the entire Q3 dependency array safety depends on it.
3. **Q6 tests must assert against the visible outputs of Q1 and Q5.** Test scenarios should verify both the category badge display (Q1) and the review grid colors (Q5) reflect the same underlying redistribution.
4. **Preset loads must suppress redistribution.** The `skipNextRedistribution` guard in SetupGate is required regardless of Q4's answer.

---

*Investigated: 2026-03-05. Based on cross-analysis of Areas 1-4, the Phase 0 problem statement, and the analysis report at `docs/trivia-round-config-analysis/phase-4/analysis-report.md`.*
