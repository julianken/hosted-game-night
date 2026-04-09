# Iterator 4: WizardStepReview Mode-Aware isMatch

**Phase:** 2 — Implement
**Question addressed:** Q5 (Review grid adaptation for "By Category" mode)
**Agent type:** frontend-excellence:react-specialist
**Date:** 2026-03-05
**Decision source:** phase-1/area-1-ui-display.md § Q5 Recommendation (Option A)

---

## Summary

The current `WizardStepReview` computes `isMatch = count === questionsPerRound` at line 97 — a single global target. In "By Category" mode this is semantically wrong: each round can legitimately have a different expected count derived from the redistribution function. The fix is minimal and backward-compatible: add two optional props (`isByCategory`, `perRoundExpected`) and branch the `expected` derivation inside the existing per-round loop.

---

## Source Files Read

| File | Lines of interest |
|------|-------------------|
| `apps/trivia/src/components/presenter/WizardStepReview.tsx` | 19–28 (props), 94–111 (per-round grid), 128–134 (settings summary) |
| `apps/trivia/src/components/presenter/SetupWizard.tsx` | 33–52 (SetupWizardProps), 202–213 (WizardStepReview usage) |
| `docs/trivia-round-config-decisions/phase-1/area-1-ui-display.md` | Q5 Option A code example and rating |
| `docs/trivia-round-config-decisions/context-packets/phase-1-packet.md` | Confirmed Q5 decision |

---

## New Props Interface

Replace the existing `WizardStepReviewProps` interface (lines 19–28 of `WizardStepReview.tsx`):

```typescript
export interface WizardStepReviewProps {
  validation: GameSetupValidation;
  canStart: boolean;
  questions: Question[];
  teams: Team[];
  roundsCount: number;
  questionsPerRound: number;
  onGoToStep: (step: number) => void;
  onStartGame: () => void;
  // --- new optional props for "By Category" mode ---
  /** When true, per-round expected counts come from perRoundExpected rather than questionsPerRound. */
  isByCategory?: boolean;
  /**
   * Array of expected question counts per round, indexed by round (0-based).
   * Only meaningful when isByCategory is true.
   * Derived from the same upstream redistribution computation as perRoundBreakdown.
   * If shorter than roundsCount, missing entries fall back to 0.
   */
  perRoundExpected?: number[];
}
```

**Rationale for optional props:**
- Existing callers (`SetupWizard`) pass neither prop today. Making them optional means zero breaking changes.
- The fallback path (`isByCategory` falsy or `perRoundExpected` absent) is identical to the current behavior.
- TypeScript will enforce that call sites explicitly decide whether to opt in.

---

## Replacement Code: Per-Round Grid Section

This replaces lines 94–111 of `WizardStepReview.tsx` exactly. The surrounding card structure (lines 82–112) is unchanged.

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
  {Array.from({ length: roundsCount }, (_, i) => {
    const count = questions.filter((q) => q.roundIndex === i).length;

    // Derive the expected count for this round based on mode.
    // "By Count" mode: all rounds share the same fixed target (questionsPerRound).
    // "By Category" mode: each round has its own expected count from the redistribution
    //   output (perRoundExpected[i]). Falls back to 0 if the array is shorter than
    //   expected (e.g., redistribution hasn't run yet or array is empty).
    const expected: number = isByCategory
      ? (perRoundExpected?.[i] ?? 0)
      : questionsPerRound;

    // A round with 0 expected questions is always treated as a mismatch.
    // This surfaces the "no questions for this round" problem even when
    // isByCategory is true and the redistribution produced 0 for a round.
    const isMatch = expected > 0 && count === expected;

    return (
      <div
        key={i}
        className={`px-3 py-2 rounded-lg text-sm font-medium ${
          isMatch
            ? 'bg-success/10 text-success'
            : 'bg-warning/10 text-warning'
        }`}
      >
        Round {i + 1}: {count} question{count !== 1 ? 's' : ''}
        {isByCategory && !isMatch && expected > 0 && (
          <span className="text-xs opacity-70 ml-1">(expected {expected})</span>
        )}
      </div>
    );
  })}
</div>
```

---

## Behavior by Mode

### "By Count" mode (existing behavior, unchanged)

`isByCategory` is `false` or `undefined`. `perRoundExpected` is not passed.

| State | `expected` | `isMatch` | Pill color | Pill text |
|-------|------------|-----------|-----------|-----------|
| Round has correct count | `questionsPerRound` | `true` | green | `Round 1: 5 questions` |
| Round is underfilled | `questionsPerRound` | `false` | amber | `Round 1: 3 questions` |
| Round is overfilled | `questionsPerRound` | `false` | amber | `Round 1: 7 questions` |
| Round is empty | `questionsPerRound` | `false` | amber | `Round 1: 0 questions` |

The `(expected N)` hint does NOT render in this mode — `isByCategory` is falsy, so the span is not mounted.

### "By Category" mode (new behavior)

`isByCategory` is `true`. `perRoundExpected` is the redistribution output array.

| State | `expected` | `isMatch` | Pill color | Pill text |
|-------|------------|-----------|-----------|-----------|
| Round matches redistribution | `perRoundExpected[i]` (e.g. 4) | `true` | green | `Round 1: 4 questions` |
| Round count differs from expected | `perRoundExpected[i]` (e.g. 4) | `false` | amber | `Round 1: 3 questions (expected 4)` |
| Round is empty, expected > 0 | `perRoundExpected[i]` (e.g. 4) | `false` | amber | `Round 1: 0 questions (expected 4)` |
| Round is empty, expected is 0 | `0` | `false` | amber | `Round 1: 0 questions` |
| `perRoundExpected` shorter than `roundsCount` | `0` (fallback) | `false` | amber | `Round 3: 2 questions` |
| `perRoundExpected` not passed at all | `0` (fallback) | `false` | amber | `Round 1: 5 questions` |

**Note on the "expected 0" hint suppression:** When `expected === 0` the `(expected 0)` hint is not shown — the hint renders only when `expected > 0`. Showing "expected 0" would be confusing because it implies the system wants no questions in that round. In this state the amber color alone signals a problem.

**Note on `perRoundExpected` not passed while `isByCategory` is true:** All pills go amber. This is the correct degraded state: the user sees a problem and can navigate back to fix it. It does not silently pass as green.

---

## Edge Cases

### 1. `perRoundExpected` is an empty array `[]`

All rounds fall to `expected = 0`. `isMatch` is `false` for all rounds (because `expected > 0` is false). All pills are amber. Hint is suppressed. This is the correct behavior when redistribution has not yet run — the user sees amber, which accurately reflects that the game is not ready.

### 2. `perRoundExpected` has fewer entries than `roundsCount`

Example: `roundsCount = 3`, `perRoundExpected = [4, 4]` (missing index 2). Round 3 uses `perRoundExpected?.[2] ?? 0` = `0`. Round 3 pill is amber regardless of its actual question count. This surfaces the incomplete redistribution state rather than hiding it.

### 3. Round has 0 questions in "By Category" mode with `expected = 0`

`isMatch = expected > 0 && count === expected` = `false`. Amber pill, no hint. This is the correct outcome: a round with no expected questions AND no actual questions is still a problem state that needs the presenter's attention.

### 4. `questionsPerRound` is still passed (and used in settings summary)

The `questionsPerRound` prop is retained on the interface and continues to be used in the settings summary block (lines 128–134 of the current file). In "By Category" mode, the settings summary will still show the `questionsPerRound` value from the store. This is acceptable because:
- The settings summary reflects what the user configured, not what was computed.
- A future iteration can add a mode-aware label ("Questions per round: varies") to the settings summary — that is independent of the per-round grid change.

### 5. `count !== 1` pluralization

Unchanged. `count` is the actual question count, not `expected`. The pill reads "Round 1: 0 questions" (plural), "Round 1: 1 question" (singular) — this remains correct.

---

## SetupWizard Call Site Changes

The current call site at `SetupWizard.tsx` lines 202–213:

```tsx
{currentStep === 3 && (
  <WizardStepReview
    validation={validation}
    canStart={canStart}
    questions={questions}
    teams={currentTeams}
    roundsCount={roundsCount}
    questionsPerRound={questionsPerRound}
    onGoToStep={goToStep}
    onStartGame={onStartGame}
  />
)}
```

When the "By Category" feature is wired up, this becomes:

```tsx
{currentStep === 3 && (
  <WizardStepReview
    validation={validation}
    canStart={canStart}
    questions={questions}
    teams={currentTeams}
    roundsCount={roundsCount}
    questionsPerRound={questionsPerRound}
    isByCategory={isByCategory}
    perRoundExpected={perRoundExpected}
    onGoToStep={goToStep}
    onStartGame={onStartGame}
  />
)}
```

`isByCategory` and `perRoundExpected` come from the same `SetupWizardProps` additions that serve Q1 and Q3. They are derived once upstream in `SetupGate` (the redistribution effect owner) and threaded down through `SetupWizard` as props.

**No changes to `SetupWizard` are needed today** to implement this iterator's scope. The `WizardStepReview` interface change is backward-compatible: the existing call site compiles without modification because both new props are optional.

---

## Props Shape for SetupWizard (future addition)

When SetupWizard is updated to thread through these props, add to `SetupWizardProps`:

```typescript
export interface SetupWizardProps {
  // ... existing props ...

  /** Whether "By Category" mode is active. */
  isByCategory?: boolean;
  /**
   * Per-round expected question counts from the redistribution function.
   * Index matches round index (0-based). Passed through to WizardStepReview.
   */
  perRoundExpected?: number[];
}
```

---

## Component Composition Analysis

**Should this be a server or client component?**

`WizardStepReview` is already `'use client'` and must stay so — it receives event handler props (`onGoToStep`, `onStartGame`) and renders interactive buttons. The new props are purely data: `isByCategory: boolean` and `perRoundExpected: number[]`. No change to the server/client boundary.

**What is the component composition strategy?**

`WizardStepReview` remains fully presentational. It does not access the store, does not run the redistribution, and does not derive `perRoundExpected` itself. The computation lives exactly one level up (SetupGate → SetupWizard → WizardStepReview). This is the correct composition: the redistribution effect in SetupGate produces `perRoundExpected` as a derivation of `(questions, roundsCount)`, stores it in local state, and passes it down the props chain.

**How do we optimize re-renders?**

`perRoundExpected` is a `number[]`. If SetupGate creates a new array reference on every render even when the values are unchanged, `WizardStepReview` will re-render unnecessarily. The redistribution effect should use a stable reference (e.g., only call `setState` when the array values actually change, or use `useMemo` for the array). This is a concern for the SetupGate implementation (iterator for Q2/Q3), not for `WizardStepReview` itself, which is a pure function of its props.

---

## Test Scenarios Covered by This Implementation

From phase-1/area-4-e2e-strategy.md Q6 decision:

| Scenario | Coverage |
|----------|----------|
| Review grid shows green for correct "By Count" round | `isMatch = count === questionsPerRound` unchanged |
| Review grid shows amber for underfilled "By Count" round | existing path, no change |
| Review grid shows green when count matches perRoundExpected[i] in "By Category" mode | new `isByCategory` branch |
| Review grid shows amber + expected hint when count differs in "By Category" mode | new `isByCategory && !isMatch && expected > 0` guard |
| Review grid shows amber (no hint) for empty round with expected 0 | `expected > 0` guard suppresses hint |
| Review grid degrades gracefully when perRoundExpected is not passed | `??` fallback to `0` |

---

## Full Replacement Block (drop-in)

The complete replacement for lines 94–111 of `WizardStepReview.tsx`, ready to paste:

```tsx
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: roundsCount }, (_, i) => {
            const count = questions.filter((q) => q.roundIndex === i).length;
            const expected: number = isByCategory
              ? (perRoundExpected?.[i] ?? 0)
              : questionsPerRound;
            const isMatch = expected > 0 && count === expected;
            return (
              <div
                key={i}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  isMatch
                    ? 'bg-success/10 text-success'
                    : 'bg-warning/10 text-warning'
                }`}
              >
                Round {i + 1}: {count} question{count !== 1 ? 's' : ''}
                {isByCategory && !isMatch && expected > 0 && (
                  <span className="text-xs opacity-70 ml-1">(expected {expected})</span>
                )}
              </div>
            );
          })}
        </div>
```

This is a 5-line diff against the current 17-line block:
- Line 97: `const isMatch = count === questionsPerRound;` → replaced by `expected` derivation + new `isMatch`
- Lines 107: text node unchanged
- Lines 108–110: new conditional hint span inserted between text and closing `</div>`
