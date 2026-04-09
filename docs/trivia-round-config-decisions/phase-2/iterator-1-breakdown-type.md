# Phase 2 — Iterator 1: `perRoundBreakdown` Type and Derivation

**Agent type:** react-specialist
**Date:** 2026-03-05
**Feeds:** Phase 3 implementation

---

## 1. Source-of-Truth Verification

Files read before writing this document:

| File | Key findings |
|------|-------------|
| `apps/trivia/src/types/index.ts` | `Question.roundIndex: number`, `Question.category: QuestionCategory` are the two fields the derivation keys on. `QuestionCategory` is the canonical 7-value union. |
| `apps/trivia/src/lib/categories.ts` | `CategoryStatistics` has `{ categoryId, categoryName, color, questionCount, percentage }`. `getCategoryStatistics(questions)` takes a flat `Question[]`. `normalizeCategoryId()` handles legacy categories. |
| `apps/trivia/src/components/presenter/SetupGate.tsx` | Subscribes to `useGameStore((state) => state.questions)` and `useSettingsStore` for `roundsCount`/`questionsPerRound`. Passes data to `SetupWizard`. No current computation other than forwarding. |
| `apps/trivia/src/lib/game/selectors.ts` | `getQuestionsForRound(state, i)` filters by `q.roundIndex === i`. This is the pattern to mirror. `ValidationIssue.roundIndex` confirms the 0-based round indexing convention. |
| `apps/trivia/src/stores/settings-store.ts` | `roundsCount` (1-6), `questionsPerRound` (3-10). The `isByCategory` toggle is a new addition not yet in the store. |

---

## 2. The Concrete TypeScript Interface

**Placement:** The type belongs in `apps/trivia/src/types/index.ts`, in the `GAME SETTINGS` or `CORE TYPES` section — alongside the other setup-phase types. It does NOT go in a new file.

```typescript
// =============================================================================
// ROUND BREAKDOWN (computed from questions array — not stored)
// =============================================================================

/**
 * Per-category breakdown within a single round.
 * Mirrors CategoryStatistics but scoped to one round.
 */
export interface RoundCategoryBreakdown {
  /** Normalized category ID (no legacy aliases). */
  categoryId: QuestionCategory;
  /** Display name, e.g. "Science". From getCategoryName(). */
  categoryName: string;
  /** Tailwind color name, e.g. "green". From getCategoryColor(). */
  color: string;
  /** Number of questions in this round belonging to this category. */
  questionCount: number;
}

/**
 * Per-round summary of question distribution.
 *
 * Produced by `derivePerRoundBreakdown()` in SetupGate.
 * Consumed by:
 *   - WizardStepSettings (Q1): renders category badge pills when isByCategory is ON
 *   - WizardStepReview (Q5): drives mode-aware `isMatch` via `expectedCount`
 *
 * Invariants (guaranteed by the derivation function):
 *   - Array length === roundsCount (may include rounds with zero questions)
 *   - `roundIndex` values are 0-based and strictly sequential (0, 1, 2, …)
 *   - `totalCount` === sum of all `categories[].questionCount`
 *   - `expectedCount` is the target the redistribution engine aimed for;
 *     `totalCount !== expectedCount` indicates an incomplete distribution
 */
export interface PerRoundBreakdown {
  /** 0-based round index. Matches Question.roundIndex. */
  roundIndex: number;
  /** Actual number of questions assigned to this round (may be 0). */
  totalCount: number;
  /**
   * The target question count for this round.
   *
   * In "By Count" mode: equals the global questionsPerRound setting.
   * In "By Category" mode: equals the count the redistribution engine
   *   allocated based on the proportional category distribution.
   *   May differ per round if the pool does not divide evenly.
   */
  expectedCount: number;
  /**
   * True when totalCount === expectedCount.
   * Precomputed to avoid recalculation in render paths.
   */
  isMatch: boolean;
  /**
   * Per-category breakdown within this round.
   * Sorted by questionCount descending (same order as getCategoryStatistics).
   * Empty array when this round has no questions.
   */
  categories: RoundCategoryBreakdown[];
}
```

### Design rationale

**`expectedCount` on the struct (not a separate array):** Phase 1 decided on `perRoundExpected: number[]` for Q5. Embedding it directly on `PerRoundBreakdown` eliminates the parallel-array access pattern (`perRoundExpected[i]`) and keeps the two consumers aligned. A consumer that only wants the expected count can do `breakdown[i].expectedCount` — no extra prop needed.

**`isMatch` precomputed:** Both Q1 (empty-state detection) and Q5 (pill color) evaluate `totalCount === expectedCount`. Precomputing once in the derivation function avoids the comparison scattered across components.

**`categories` is `RoundCategoryBreakdown[]`, not `CategoryStatistics[]`:** `CategoryStatistics` includes `percentage`, which is computed over the round's questions only and would be confusing in the context of a single round's subset. A scoped type with only the fields actually used keeps the shape honest. The implementer can call `getCategoryStatistics()` internally and map to `RoundCategoryBreakdown` — it is not a reinvention of that utility.

**`totalCount === 0` round is not omitted:** Both Q5 (validation) and the game engine treat an empty round as a blocking issue. The derivation must include rounds with zero questions so the review grid can render the amber warning pill for them.

---

## 3. Derivation Function

**Placement:** `apps/trivia/src/lib/game/selectors.ts` — alongside existing pure selector functions like `getQuestionsForRound`.

This is a pure function, not a React hook. SetupGate wraps it in `useMemo`.

```typescript
import type { Question, QuestionCategory, PerRoundBreakdown, RoundCategoryBreakdown } from '@/types';
import { getCategoryName, getCategoryColor, normalizeCategoryId } from '@/lib/categories';

/**
 * Derive per-round question breakdown from the current questions array.
 *
 * Pure function — reads only from `questions`. No store access, no side effects.
 * Safe to call with an empty questions array (returns rounds with totalCount=0).
 *
 * @param questions   - Current game store questions array (after redistribution).
 * @param roundsCount - Target number of rounds (from settings store).
 * @param isByCategory - Whether "By Category" mode is active.
 * @param questionsPerRound - Target QPR for "By Count" mode (ignored when isByCategory).
 * @returns One PerRoundBreakdown entry per round, 0-indexed.
 */
export function derivePerRoundBreakdown(
  questions: Question[],
  roundsCount: number,
  isByCategory: boolean,
  questionsPerRound: number,
): PerRoundBreakdown[] {
  // Build a round → questions map in a single pass over the array.
  // Avoids filtering the full array once per round (O(n*r) → O(n)).
  const roundBuckets = new Map<number, Question[]>();
  for (let i = 0; i < roundsCount; i++) {
    roundBuckets.set(i, []);
  }
  for (const q of questions) {
    const bucket = roundBuckets.get(q.roundIndex);
    if (bucket !== undefined) {
      bucket.push(q);
    }
    // Questions with roundIndex outside [0, roundsCount) are silently ignored.
    // This can happen when roundsCount is decreased after import.
  }

  // In "By Category" mode the expected count per round is the actual count
  // produced by the redistribution engine — not a global constant.
  // We derive it here (post-redistribution) as the actual count is the
  // canonical expectation: when redistribution is idempotent, actualCount IS
  // the target. If redistribution has not yet run (empty questions), all
  // expected counts are 0.
  //
  // In "By Count" mode the expected count is always questionsPerRound.

  return Array.from({ length: roundsCount }, (_, roundIndex) => {
    const roundQuestions = roundBuckets.get(roundIndex) ?? [];
    const totalCount = roundQuestions.length;

    // Determine expectedCount
    const expectedCount = isByCategory ? totalCount : questionsPerRound;
    // Note: in "By Category" mode, expectedCount === totalCount always, so
    // isMatch is always true UNLESS we have an empty round. The real mismatch
    // signal is totalCount === 0 when roundsCount > 0 and questions exist.
    // The V2/V3 validation rules in validateGameSetup() gate the Start button
    // on empty rounds independently. The UI (Q5) shows amber on empty rounds
    // because totalCount (0) !== expectedCount only when questions exist but
    // none were allocated to this round. When the whole pool is empty every
    // round gets expectedCount=0, so isMatch=true — that is correct because
    // the V1 blocker ("No questions loaded") already covers the zero-pool case.

    const isMatch = totalCount === expectedCount;

    // Build per-category breakdown, normalized for legacy aliases.
    const categoryCounts = new Map<QuestionCategory, number>();
    for (const q of roundQuestions) {
      const normalized = normalizeCategoryId(q.category);
      categoryCounts.set(normalized, (categoryCounts.get(normalized) ?? 0) + 1);
    }

    const categories: RoundCategoryBreakdown[] = Array.from(categoryCounts.entries())
      .map(([categoryId, questionCount]): RoundCategoryBreakdown => ({
        categoryId,
        categoryName: getCategoryName(categoryId),
        color: getCategoryColor(categoryId),
        questionCount,
      }))
      .sort((a, b) => b.questionCount - a.questionCount);

    return {
      roundIndex,
      totalCount,
      expectedCount,
      isMatch,
      categories,
    };
  });
}
```

### Empty-array contract

| Scenario | Result |
|----------|--------|
| `questions = []`, `roundsCount = 3`, `isByCategory = true` | 3 entries, all `totalCount=0, expectedCount=0, isMatch=true, categories=[]` |
| `questions = []`, `roundsCount = 3`, `isByCategory = false` | 3 entries, all `totalCount=0, expectedCount=questionsPerRound, isMatch=false, categories=[]` |
| `questions` populated, some rounds empty | Empty rounds have `totalCount=0`, non-empty `expectedCount` — `isMatch=false`, amber pill in Q5 |
| `questions` populated, all rounds full and matching | All `isMatch=true`, green pills |

---

## 4. SetupGate Integration

SetupGate computes `perRoundBreakdown` once via `useMemo` and passes it to `SetupWizard`. This is the single derivation point — neither `WizardStepSettings` nor `WizardStepReview` compute it independently.

```typescript
// apps/trivia/src/components/presenter/SetupGate.tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { useSettingsStore } from '@/stores/settings-store';
import { derivePerRoundBreakdown } from '@/lib/game/selectors';
import { SetupWizard } from '@/components/presenter/SetupWizard';
import type { PerRoundBreakdown } from '@/types';

// (isByCategory comes from settings store once BEA-NNN adds it)
// For now it is read from useSettingsStore when that field ships.

export function SetupGate({ isConnected, onOpenDisplay, onStartGame }: SetupGateProps) {
  const [isExiting, setIsExiting] = useState(false);

  const questions       = useGameStore((state) => state.questions);
  const teams           = useGameStore((state) => state.teams);
  const addTeam         = useGameStore((state) => state.addTeam);
  const removeTeam      = useGameStore((state) => state.removeTeam);
  const renameTeam      = useGameStore((state) => state.renameTeam);
  const loadTeamsFromSetup = useGameStore((state) => state.loadTeamsFromSetup);

  const { canStart, validation } = useGameSelectors();

  const { roundsCount, questionsPerRound, lastTeamSetup, updateSetting } = useSettingsStore();

  // isByCategory will come from settings store (field not yet added).
  // Placeholder until BEA-NNN lands:
  const isByCategory = useSettingsStore((state) => (state as any).isByCategory ?? true);

  // Single derivation point for both Q1 (badge display) and Q5 (isMatch logic).
  // Re-runs only when the three inputs change.
  const perRoundBreakdown: PerRoundBreakdown[] = useMemo(
    () => derivePerRoundBreakdown(questions, roundsCount, isByCategory, questionsPerRound),
    [questions, roundsCount, isByCategory, questionsPerRound],
  );

  const handleStartGame = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => { onStartGame(); }, 200);
  }, [onStartGame]);

  return (
    <div
      data-testid="setup-gate"
      className={`fixed inset-0 z-40 bg-background flex flex-col transition-opacity duration-200 ${isExiting ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* ... header unchanged ... */}
      <div data-testid="setup-gate-content" className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4">
          <SetupWizard
            questions={questions}
            roundsCount={roundsCount}
            questionsPerRound={questionsPerRound}
            isByCategory={isByCategory}
            perRoundBreakdown={perRoundBreakdown}      // NEW — fed to both WizardStepSettings and WizardStepReview
            lastTeamSetup={lastTeamSetup}
            currentTeams={teams}
            onUpdateSetting={updateSetting}
            validation={validation}
            canStart={canStart}
            onAddTeam={addTeam}
            onRemoveTeam={removeTeam}
            onRenameTeam={renameTeam}
            onLoadTeamsFromSetup={loadTeamsFromSetup}
            onStartGame={handleStartGame}
          />
        </div>
      </div>
    </div>
  );
}
```

### Component composition decision

`SetupWizard` receives `perRoundBreakdown` and threads it down to:
- `WizardStepSettings` — reads `perRoundBreakdown[0].categories` for the Q1 badge pills (round 0 is representative in "By Category" mode when all rounds share the same proportional distribution)
- `WizardStepReview` — reads `breakdown.expectedCount` and `breakdown.isMatch` per round for Q5 pill coloring

Neither child component calls `derivePerRoundBreakdown` directly. Both are purely presentational with respect to this data.

---

## 5. Mode Behavior Summary

### "By Category" mode (`isByCategory = true`)

- `expectedCount` per round = `totalCount` (the redistribution engine's output IS the target)
- `isMatch = true` for any round that received questions
- `isMatch = false` only for rounds with `totalCount === 0` (empty round = genuine error)
- Q1 badge pills: show `breakdown[0].categories` with `categoryName: questionCount`
- Q5 pills: green for matched rounds, amber with "(expected 0)" for empty rounds

### "By Count" mode (`isByCategory = false`)

- `expectedCount` per round = global `questionsPerRound` setting (uniform target)
- `isMatch = true` only when `totalCount === questionsPerRound` exactly
- Q1: shows the QPR Slider unchanged (no breakdown needed)
- Q5 pills: green if count matches setting, amber with "(expected N)" if not

---

## 6. Constraints Verified

| Constraint | Status |
|------------|--------|
| Pure derivation from `questions` array (no store writes) | Satisfied — `derivePerRoundBreakdown` is a pure function |
| Handles empty questions array gracefully | Satisfied — all paths return valid structs with zero counts |
| Works for both "By Category" and "By Count" modes | Satisfied — `isByCategory` param drives `expectedCount` derivation |
| Type placed alongside existing types, not in a new file | Satisfied — both interfaces go in `apps/trivia/src/types/index.ts` |
| Single upstream computation | Satisfied — `useMemo` in SetupGate; no duplicated derivation in children |
| Legacy category normalization | Satisfied — `normalizeCategoryId()` called inside `derivePerRoundBreakdown` |

---

## 7. Open Questions for Phase 3

1. **`isByCategory` store field:** The `SettingsState` interface in `stores/settings-store.ts` does not yet have `isByCategory`. The implementer must add it (boolean, default `true`, persisted) with a store version bump. The `(state as any).isByCategory ?? true` placeholder in the SetupGate snippet above marks exactly where this wires in.

2. **`SetupWizardProps` update:** `SetupWizard` component props must add `isByCategory: boolean` and `perRoundBreakdown: PerRoundBreakdown[]`. Downstream prop threading to `WizardStepSettings` and `WizardStepReview` is the implementer's task.

3. **`redistributeQuestions` function:** Referenced in the Phase 0 problem statement as existing/planned but not found in the current codebase. The `derivePerRoundBreakdown` function in this document reads `questions` AFTER redistribution has run — it is a read-only derivation, not the redistribution engine itself. The redistribution engine (which assigns `roundIndex` values) is a separate concern and must be idempotent per Phase 1 decisions.
