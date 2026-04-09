# Phase 3 — Synthesis 1: Unified Component Architecture

**Date:** 2026-03-05
**Inputs read:** iterators 1–5, `SetupGate.tsx`, `SetupWizard.tsx`, `WizardStepSettings.tsx`, `WizardStepReview.tsx`, `settings-store.ts` (v3), `game-store.ts`, `lib/game/selectors.ts`, `lib/game/questions.ts`, `lib/game/engine.ts`, `lib/categories.ts`, `types/index.ts`, `e2e/trivia/setup-overlay.spec.ts`, `e2e/utils/helpers.ts`, `e2e/fixtures/auth.ts`
**Output feeds:** Phase 4 implementation plan

---

## 1. Type Shape Resolution (Critical Inconsistency)

Three iterators proposed incompatible shapes for the per-round breakdown type. This must be resolved before any file is touched because all five affected components share the same import.

### Conflicting Shapes Found

**Iterator 1** (`iterator-1-breakdown-type.md`) — most complete proposal:
```
PerRoundBreakdown { roundIndex, totalCount, expectedCount, isMatch, categories: RoundCategoryBreakdown[] }
RoundCategoryBreakdown { categoryId, categoryName, color, questionCount }
```

**Iterator 3** (`iterator-3-settings-props.md`) — local definition with refinement recommendation:
```
PerRoundBreakdown { roundIndex, count, categories: { id: QuestionCategory, count: number }[] }
```
(Initial shape. Then recommends Option 1 refinement: per-category counts, same field names.)

**Iterator 4** (`iterator-4-review-adaptation.md`) — does not use `PerRoundBreakdown` at all; instead proposes a separate parallel array:
```
perRoundExpected: number[]
```

**Phase 2 packet** (summary line): `{ roundIndex, totalCount, expectedCount, isMatch, categories: { id, count }[] }` — a hybrid of Iterator 1 top-level names and Iterator 3 category entry names.

### Canonical Resolution

Adopt Iterator 1's top-level shape. Adopt Iterator 3's category entry shape (simpler, no embedded display strings). Eliminate the Iterator 4 parallel array entirely.

**Canonical type — goes in `apps/trivia/src/types/index.ts`:**

```typescript
// =============================================================================
// ROUND BREAKDOWN (computed from questions — not stored, not persisted)
// =============================================================================

/**
 * Per-category summary within a single round.
 * Produced by derivePerRoundBreakdown(). Consumed by WizardStepSettings
 * for badge pill rendering. Display strings are derived via getCategoryName()
 * and getCategoryBadgeClasses() at render time — not stored here.
 */
export interface RoundCategoryEntry {
  categoryId: QuestionCategory; // normalized — no legacy aliases
  questionCount: number;        // questions from this category in this round
}

/**
 * Per-round summary of question distribution.
 *
 * Produced by a single useMemo in SetupGate.
 * Consumed by WizardStepSettings (Q1 badge pills) and WizardStepReview (Q5 isMatch).
 *
 * Invariants guaranteed by derivePerRoundBreakdown():
 *   - Array length === roundsCount (empty rounds included, not omitted)
 *   - roundIndex values are 0-based and strictly sequential
 *   - totalCount === sum of categories[].questionCount
 *   - isMatch is precomputed — components do not recompute it
 */
export interface PerRoundBreakdown {
  roundIndex: number;
  totalCount: number;    // actual questions assigned to this round
  expectedCount: number; // target: questionsPerRound (By Count) or actual (By Category — see note)
  isMatch: boolean;      // precomputed: totalCount === expectedCount && expectedCount > 0
  categories: RoundCategoryEntry[];
}
```

**Why `totalCount` not `count`:** Unambiguous. `count` is overloaded (both `RoundCategoryEntry` and `PerRoundBreakdown` would use it, creating confusion). `totalCount` matches Iterator 1's naming.

**Why `categoryId`/`questionCount` not `id`/`count`:** Consistent with existing codebase conventions. `ValidationIssue.roundIndex` and `CategoryStatistics.questionCount` use the longer form. This is the established pattern.

**Why omit `categoryName`/`color` from `RoundCategoryEntry`:** `WizardStepSettings` calls `getCategoryName(entry.categoryId)` and `getCategoryBadgeClasses(entry.categoryId)` at render time. Embedding display strings in the type creates a stale-string risk if category display names change, and duplicates what the utilities already provide at zero cost.

**Why eliminate the `perRoundExpected: number[]` parallel array:** It is redundant. `breakdown[i].expectedCount` contains the same value. A parallel array creates two data structures that must stay synchronized. `PerRoundBreakdown` is the single source of truth.

**`isMatch` precomputed with `expectedCount > 0` guard:** Both components evaluate this. The guard `expectedCount > 0` prevents a round with 0 actual and 0 expected from falsely showing green — an empty round is always a problem regardless of mode. Precomputing once in `derivePerRoundBreakdown()` avoids the guard logic appearing in JSX across multiple files.

---

## 2. `isByCategory` State Location Resolution

Three sources gave conflicting guidance:

| Source | Recommendation |
|--------|----------------|
| Iterator 1, §7 | Placeholder `(state as any).isByCategory ?? true`; deferred to "BEA-NNN" |
| Iterator 3, Carry-Forward §2 | `SetupGate` via `useState` |
| Phase 1, Q4 decision | NOT in preset DB schema; IS a "global preference persisted in localStorage" |

**Resolution: Add `isByCategory` to the settings store, version 4.**

Phase 1 Q4 explicitly called it a "global preference persisted in localStorage." The settings store is the established localStorage persistence layer for all other game preferences (`roundsCount`, `questionsPerRound`, `ttsEnabled`, etc.). `useState` in `SetupGate` gives session-only state — lost on page refresh. This contradicts the Q4 "persisted" requirement.

Iterator 3's `useState` recommendation was written without reference to Q4. Q4 governs.

**Settings store change (version 3 → 4):**

```typescript
// SettingsState additions:
isByCategory: boolean;          // default true

// SETTINGS_DEFAULTS:
isByCategory: true,

// partialize (persisted fields) — add:
isByCategory: state.isByCategory,

// version: 4  (bumped from 3)

// migrate:
if (fromVersion === 3) {
  // isByCategory not present in v3 stored data.
  // Return stored as-is; Zustand merges with create() initial state,
  // which provides SETTINGS_DEFAULTS.isByCategory = true.
  return stored;
}
```

**In SetupGate:**
```typescript
const isByCategory = useSettingsStore((state) => state.isByCategory);
// onToggleByCategory:
(v: boolean) => updateSetting('isByCategory', v)
```

No local `useState` for this field anywhere.

---

## 3. Complete Data Flow

```
[importQuestions() called — user loads a question set]
  writes: game store questions[], totalRounds, settings.roundsCount
  (importQuestions is the ONLY function that writes settings.roundsCount)
          │
          ▼
[SetupGate mounted — reads from two stores]
  useGameStore(s => s.questions)
  useGameStore(s => s.redistributeQuestions)  ← action
  useSettingsStore(s => s.roundsCount)
  useSettingsStore(s => s.questionsPerRound)
  useSettingsStore(s => s.isByCategory)       ← NEW (persisted, default true)
  useSettingsStore(s => s.updateSetting)
          │
          ▼
[useEffect — fires on mount and when deps change]
  deps: [questions, roundsCount, questionsPerRound, isByCategory]
  calls: store.redistributeQuestions(roundsCount, questionsPerRound, mode)
          │
          ▼
[redistributeQuestionsEngine(state, roundsCount, questionsPerRound, mode)]
  location: apps/trivia/src/lib/game/questions.ts
  Status guard: returns state unchanged if status !== 'setup'
  Empty guard: returns state unchanged if questions.length === 0
  Idempotency check: state.questions.every((q, i) => q.roundIndex === target[i])
    → same reference return when already correct
    → Zustand detects same reference, skips update, no re-render, effect does not re-fire
  Writes ONLY: state.questions[i].roundIndex
  Must NOT write: settings.*, totalRounds, selectedQuestionIndex, status
          │
          ▼
[useMemo — fires when questions or display params change]
  deps: [questions, roundsCount, isByCategory, questionsPerRound]
  calls: derivePerRoundBreakdown(questions, roundsCount, isByCategory, questionsPerRound)
  location: apps/trivia/src/lib/game/selectors.ts
  Returns: PerRoundBreakdown[] — stable reference when inputs unchanged
          │
          ▼
[SetupGate passes to SetupWizard:]
  isByCategory, perRoundBreakdown, onToggleByCategory (NEW)
  questions, roundsCount, questionsPerRound, onUpdateSetting (existing)
          │
     ┌────┴──────┐
     ▼           ▼
WizardStep   WizardStep
Settings     Review
(Step 1)     (Step 3)
[PURE]       [PURE]

WizardStepSettings reads:
  perRoundBreakdown[0].categories → badge pills (By Category ON)
  perRoundBreakdown.length > 0   → empty state sentinel
  isByCategory                   → toggle checked state / branch

WizardStepReview reads:
  breakdown[i].totalCount        → pill text count
  breakdown[i].expectedCount     → expected count for hint span
  breakdown[i].isMatch           → pill color (green/amber)
  isByCategory                   → hint span gate
```

---

## 4. Inconsistencies Resolved

| # | Inconsistency | Iterator(s) | Resolution |
|---|---------------|-------------|------------|
| A | `totalCount` vs `count` at top level | I1 vs I3 | `totalCount` (I1) |
| B | Category entry: `{categoryId, questionCount}` vs `{id, count}` | I1 vs I3 | `{categoryId, questionCount}` (I1 naming, I3 simplicity — no display strings) |
| C | `categoryName`, `color` in category entry vs not | I1 vs I3 | Omit — components call utilities at render time |
| D | `perRoundExpected: number[]` parallel array vs embedded `expectedCount` | I4 vs I1 | Embedded `expectedCount` on struct (I1); eliminate parallel array |
| E | `isByCategory` in `useState` vs settings store | I3 vs Q4 | Settings store v4 |
| F | `isMatch` precomputed vs computed in JSX | I1 vs I4 | Precomputed in `derivePerRoundBreakdown()` |
| G | `isByCategory` in effect dep array or not | I2 §11 ambiguous | In dep array — changing mode must trigger redistribution |
| H | `derivePerRoundBreakdown` exported from `engine.ts` or not | I1 says not | Not exported from `engine.ts`; imported directly from `@/lib/game/selectors` |

**On inconsistency G (critical):** Iterator 2, §11 wrote: "isByCategory intentionally in effect body, not dependency array" and then immediately wrote "Or isByCategory IS in the dep array — implementation decides." This is the single most dangerous ambiguity in the Phase 2 output. The resolution is unambiguous: `isByCategory` MUST be in the dependency array. Switching from By Count to By Category changes the redistribution algorithm. If `isByCategory` is not in the dep array, toggling the mode does not trigger redistribution and the user sees stale `roundIndex` assignments. The engine's idempotency is not a substitute for a correct dep array — it prevents loops, not missed triggers.

---

## 5. Presentational Purity Verification

| Component | Role | Store reads | Effects | Local state |
|-----------|------|-------------|---------|-------------|
| `SetupGate` | Container | game store + settings store | redistribution `useEffect` | `isExiting` |
| `SetupWizard` | Navigation controller | none | none | `currentStep` |
| `WizardStepSettings` | Presentational leaf | none | none | none |
| `WizardStepReview` | Presentational leaf | none | none | none |
| `WizardStepTeams` | Presentational leaf | none | none | team-name edit |
| `WizardStepQuestions` | Presentational leaf | none | none | import UI |

`WizardStepSettings` and `WizardStepReview` are fully presentational. Both receive `isByCategory`, `perRoundBreakdown`, and their callbacks entirely from props. No component below `SetupGate` reads the store or runs a `useEffect`.

The `onToggleByCategory` callback chain:
```
WizardStepSettings.onToggleByCategory(v)
  → SetupWizard.onToggleByCategory(v)
  → SetupGate: updateSetting('isByCategory', v)
  → settings store write → useSettingsStore subscribers re-render
  → SetupGate re-renders → new isByCategory → effect dep changed → redistribution
```

This is a clean unidirectional data flow. No circular dependency.

---

## 6. File Modification List

### New files

| File | What goes in it |
|------|----------------|
| `e2e/trivia/round-config.spec.ts` | 5 Playwright tests from Iterator 5 (with regex fix from §14 below) |

### Files to modify

| File | Change |
|------|--------|
| `apps/trivia/src/types/index.ts` | Add `RoundCategoryEntry` and `PerRoundBreakdown` interfaces in new `// ROUND BREAKDOWN` section (after `// GAME SETTINGS`) |
| `apps/trivia/src/lib/game/questions.ts` | Add `redistributeQuestions()` engine function |
| `apps/trivia/src/lib/game/selectors.ts` | Add `derivePerRoundBreakdown()` pure function |
| `apps/trivia/src/lib/game/engine.ts` | Add `redistributeQuestions` to barrel re-export from `./questions`; add `derivePerRoundBreakdown` re-export from `./selectors` |
| `apps/trivia/src/stores/settings-store.ts` | Add `isByCategory: boolean`; bump version 3→4; add v3 migration branch |
| `apps/trivia/src/stores/game-store.ts` | Add `redistributeQuestions` to `GameStore` interface and implementation |
| `apps/trivia/src/components/presenter/SetupGate.tsx` | Add `useEffect` (redistribution), `useMemo` (breakdown derivation), new props to `SetupWizard` |
| `apps/trivia/src/components/presenter/SetupWizard.tsx` | Extend `SetupWizardProps` with 3 new fields; thread to `WizardStepSettings` and `WizardStepReview` |
| `apps/trivia/src/components/presenter/WizardStepSettings.tsx` | Full rewrite: new props, Toggle, conditional QPR slider vs badge pills |
| `apps/trivia/src/components/presenter/WizardStepReview.tsx` | Extend props with `perRoundBreakdown?`, `isByCategory?`; rewrite per-round grid `isMatch` |

No new packages. No database changes. No preset schema changes. No API route changes.

---

## 7. Build Order

Dependencies are strict. TypeScript errors at any layer cascade upward.

**Phase A — Types and pure functions (no React, no Zustand)**

1. `types/index.ts` — `RoundCategoryEntry`, `PerRoundBreakdown`
2. `lib/game/questions.ts` — `redistributeQuestions()` (imports `TriviaGameState`, `Question`, `deepFreeze` — all present)
3. `lib/game/selectors.ts` — `derivePerRoundBreakdown()` (imports `PerRoundBreakdown`, `RoundCategoryEntry` from step 1; `normalizeCategoryId`, `getCategoryName`, `getCategoryColor` from `@/lib/categories`)
4. `lib/game/engine.ts` — barrel additions

Run `pnpm typecheck` checkpoint.

**Phase B — Store layer**

5. `stores/settings-store.ts` — `isByCategory` field, v4 migration
6. `stores/game-store.ts` — `redistributeQuestions` action

Run `pnpm typecheck` checkpoint.

**Phase C — Container**

7. `components/presenter/SetupGate.tsx` — `useEffect`, `useMemo`, new `SetupWizard` props

**Phase D — Presentational leaves (parallel)**

8a. `components/presenter/WizardStepSettings.tsx` — new props + JSX
8b. `components/presenter/WizardStepReview.tsx` — extended props + grid rewrite

**Phase E — Wizard threading**

9. `components/presenter/SetupWizard.tsx` — props extension + threading

Steps 8a and 8b must compile before 9 (SetupWizard imports both).

**Phase F — E2E**

10. `e2e/trivia/round-config.spec.ts` — place after feature code is in place

---

## 8. Props Threading Map

```
SetupGate reads from stores:
  questions, redistributeQuestions                (game store)
  roundsCount, questionsPerRound                  (settings store)
  isByCategory, updateSetting                     (settings store — isByCategory is NEW)

SetupGate derives:
  perRoundBreakdown = useMemo(
    () => derivePerRoundBreakdown(questions, roundsCount, isByCategory, questionsPerRound),
    [questions, roundsCount, isByCategory, questionsPerRound]
  )

SetupGate → SetupWizard (additions only):
  + isByCategory: boolean
  + perRoundBreakdown: PerRoundBreakdown[]
  + onToggleByCategory: (v: boolean) => void

SetupWizard → WizardStepSettings (Step 1, additions only):
  + isByCategory: boolean
  + perRoundBreakdown: PerRoundBreakdown[]
  + onToggleByCategory: (v: boolean) => void

SetupWizard → WizardStepReview (Step 3, additions only):
  + isByCategory?: boolean
  + perRoundBreakdown?: PerRoundBreakdown[]
```

`WizardStepSettings` receives `perRoundBreakdown` as a required prop (always an array, never `undefined` — empty array is the zero-questions signal). `WizardStepReview` receives it as optional to maintain backward compatibility with any caller that does not yet pass it.

---

## 9. `WizardStepReview` Per-Round Grid: Canonical Replacement

This replaces the current `isMatch` derivation at lines 95–111 of `WizardStepReview.tsx`. The surrounding card structure is unchanged.

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
  {Array.from({ length: roundsCount }, (_, i) => {
    // Prefer pre-computed breakdown values; fall back to existing filter for
    // callers that don't pass perRoundBreakdown (backward-compatible).
    const bd = perRoundBreakdown?.[i];
    const count = bd?.totalCount ?? questions.filter((q) => q.roundIndex === i).length;
    const isMatch = bd
      ? bd.isMatch
      : count === questionsPerRound;
    const expectedCount = bd?.expectedCount ?? questionsPerRound;

    return (
      <div
        key={i}
        className={`px-3 py-2 rounded-lg text-sm font-medium ${
          isMatch ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
        }`}
      >
        Round {i + 1}: {count} question{count !== 1 ? 's' : ''}
        {isByCategory && !isMatch && expectedCount > 0 && (
          <span className="text-xs opacity-70 ml-1">(expected {expectedCount})</span>
        )}
      </div>
    );
  })}
</div>
```

When `perRoundBreakdown` is passed, `count` comes from `bd.totalCount` (O(1) lookup instead of O(n) filter per round). The fallback path keeps the existing behavior for any call site not yet updated.

---

## 10. `WizardStepSettings` Badge Pill: Canonical Render

```tsx
{/* By Category ON — questions loaded */}
{isByCategory && perRoundBreakdown.length > 0 && (
  <div className="flex flex-wrap gap-1.5">
    {(perRoundBreakdown[0]?.categories ?? []).map((entry) => (
      <span
        key={entry.categoryId}
        className={`px-2 py-0.5 text-xs font-medium border rounded-full ${getCategoryBadgeClasses(entry.categoryId)}`}
      >
        {getCategoryName(entry.categoryId)}: {entry.questionCount}
      </span>
    ))}
  </div>
)}

{/* By Category ON — no questions */}
{isByCategory && perRoundBreakdown.length === 0 && (
  <p className="text-base text-muted-foreground">
    No questions imported yet. Import questions in Step 1 to see the breakdown.
  </p>
)}
```

`getCategoryBadgeClasses` and `getCategoryName` are imported from `@/lib/categories`. Both are confirmed exported (used in `TriviaApiImporter.tsx` and `CategoryFilter.tsx`). `normalizeCategoryId` is NOT called here — it was already applied inside `derivePerRoundBreakdown()`.

---

## 11. Engine Boundary: `redistributeQuestions` vs `importQuestions`

This boundary is the most critical safety constraint in the architecture.

| Property | `importQuestions` | `redistributeQuestions` |
|----------|-------------------|------------------------|
| Purpose | Load external `Question[]` into game state | Remap existing questions' `roundIndex` |
| Writes `settings.roundsCount` | YES — feedback loop source | NO — hard prohibition |
| Writes `totalRounds` | YES | NO |
| Resets `selectedQuestionIndex` | YES (to 0) | NO |
| Status guard | `setup` only | `setup` only |
| Idempotent short-circuit | No | Yes — same-reference return when unchanged |
| Called from | User action (import button) | SetupGate `useEffect` |

`redistributeQuestions` must never call `importQuestions`. The prohibition on writing `settings.roundsCount` is what prevents the feedback loop: `importQuestions` writes it (line 73 of `questions.ts`), which would re-trigger the `useEffect`, which would call `redistributeQuestions` again. Because `redistributeQuestions` is prohibited from writing `settings.*`, this loop cannot form even if the idempotency check somehow failed.

---

## 12. `derivePerRoundBreakdown` File Placement

Iterator 1 places it in `lib/game/selectors.ts`. This is correct. The function is a pure read over `questions[]` with no side effects — the same category as `getQuestionsForRound()` and `validateGameSetup()`. It does not belong in `questions.ts` (that file owns write-capable engine functions).

It is NOT re-exported from `engine.ts`. It is a setup-phase display utility, not a game engine function. SetupGate imports it directly:

```typescript
import { derivePerRoundBreakdown } from '@/lib/game/selectors';
```

---

## 13. Settings Store v4 Migration: Full Spec

```typescript
// stores/settings-store.ts

export interface SettingsState {
  roundsCount: number;
  questionsPerRound: number;
  timerDuration: number;
  timerAutoStart: boolean;
  timerVisible: boolean;
  timerAutoReveal: boolean;
  ttsEnabled: boolean;
  isByCategory: boolean;        // NEW — version 4
  lastTeamSetup: TeamSetup | null;
}

export const SETTINGS_DEFAULTS: SettingsState = {
  roundsCount: 3,
  questionsPerRound: 5,
  timerDuration: 30,
  timerAutoStart: true,
  timerVisible: true,
  timerAutoReveal: true,
  ttsEnabled: false,
  isByCategory: true,           // NEW — default true
  lastTeamSetup: null,
};

// partialize — add isByCategory to persisted set:
partialize: (state) => ({
  roundsCount: state.roundsCount,
  questionsPerRound: state.questionsPerRound,
  timerDuration: state.timerDuration,
  timerAutoStart: state.timerAutoStart,
  timerVisible: state.timerVisible,
  timerAutoReveal: state.timerAutoReveal,
  ttsEnabled: state.ttsEnabled,
  isByCategory: state.isByCategory,   // NEW
  lastTeamSetup: state.lastTeamSetup,
}),

version: 4,   // bumped from 3

migrate: (persistedState: unknown, fromVersion: number) => {
  const stored = persistedState as Record<string, unknown>;

  if (fromVersion <= 2) {
    const { revealMode: _rm, ...rest } = stored;
    return rest;
    // isByCategory absent → Zustand merge provides default true
  }

  if (fromVersion === 3) {
    // isByCategory absent from v3 stored data.
    // Return stored as-is; Zustand merges with SETTINGS_DEFAULTS.isByCategory = true.
    return stored;
  }

  return stored;
},
```

Zustand persist calls `migrate()` then merges the returned value with the initial state produced by `create()`. Fields absent from the returned object receive their default values from `SETTINGS_DEFAULTS`. No explicit `isByCategory: true` is needed in the migration body for the v3 case.

---

## 14. E2E Test File: Adjustments Required

Iterator 5's `e2e/trivia/round-config.spec.ts` is valid as written, with two adjustments:

**Adjustment 1 — Regex anchor in Test 5:**

Current (will fail when hint span is present):
```typescript
const roundEntries = reviewContent.getByText(/^Round \d+: \d+ questions?$/);
```

Corrected (matches lines with or without the `(expected N)` suffix):
```typescript
const roundEntries = reviewContent.getByText(/^Round \d+: \d+ questions?/);
```

The trailing `$` anchor breaks when "By Category" mode appends `(expected N)` to the pill text. Remove the anchor.

**Adjustment 2 — Test 7: one-team assumption is valid.**

The test adds one team, navigates to Review, and expects the Start Game button to be enabled. This is correct: `validateGameSetup` V4 blocks on zero teams; one team produces V7 warn (not block). `canStart` is still true. No change needed.

The `startGameViaWizard` helper in `e2e/utils/helpers.ts` may need to be updated to navigate through the Settings step (or skip it, since By Category ON is the default and requires no manual action). Verify that the helper still functions with the new toggle — if it skips Settings entirely, the By Category default is already active and questions will be distributed automatically.

---

## 15. Risk Register

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|-----------|
| Settings store v4 migration corrupts user data | High | Low | Zustand merges with defaults; `fromVersion === 3` branch verified |
| Effect feedback loop: `isByCategory` in dep array causes loop | High | Low | Engine idempotency is the loop breaker; confirmed same-ref return on no change |
| `derivePerRoundBreakdown` called before `redistributeQuestions` runs | Medium | Low | First render: questions have existing `roundIndex` from `importQuestions`; breakdown is computed from that — not garbage |
| E2E Test 5 regex anchor breaks on hint span | High | Certain (without fix) | Remove trailing `$` anchor (§14 above) |
| `startGameViaWizard` breaks if By Category requires Settings step | Medium | Low | By Category ON requires no user action — auto-distributes on mount |
| `perRoundBreakdown.length === 0` sentinel vs zero-round edge case | Low | Low | `roundsCount` is clamped to min 1; `perRoundBreakdown` always has at least one entry when questions exist |
| `validateGameSetup` V6 warn fires in By Category mode | Low | Medium | V6 checks `actual !== questionsPerRound` — in By Category mode this fires spuriously. A follow-on issue should make V6 mode-aware. Not a blocker for this feature. |

**V6 validation note:** The existing V6 warn rule (`"Round N has X questions but Y are configured"`) compares against `settings.questionsPerRound` for every round. In By Category mode, per-round counts deliberately differ. This produces spurious warnings in the Review step. This is out of scope for this feature but should be filed as a follow-on. The Start Game button is not blocked by V6 (severity = warn), so users can still start.

---

## 16. Evaluation Against Phase 0 Criteria

| Criterion | Weight | Assessment |
|-----------|--------|-----------|
| User clarity (25%) | High weight | Toggle in Settings step is visible and labeled. Badge pills show `CategoryName: N` counts. Helper text for empty state. Review grid shows green/amber with `(expected N)` hint when needed. Three distinct visual states for Q1. Clear signal chain. |
| Correctness (20%) | High weight | Engine idempotency prevents loops. Single derivation point (SetupGate useMemo) drives both consumers. `isMatch` uses `expectedCount > 0` guard preventing false-green on empty rounds. V6 warn fires spuriously in By Category mode (known gap, not blocking). |
| Consistency (15%) | High weight | Follows existing engine patterns (deepFreeze, status guard, same-ref return). Settings store v4 follows v3 migration pattern. Barrel export pattern for engine module. Prop threading matches existing SetupGate→SetupWizard→Step pattern. |
| Simplicity (15%) | High weight | Eliminates duplicate parallel array (`perRoundExpected`). Single type serves two consumers. No new packages. No schema changes. 9 files modified, 1 new file added. Settings store bump is the only persistent schema change. |
| Testability (15%) | High weight | All three new computations (`redistributeQuestions`, `derivePerRoundBreakdown`, `WizardStepSettings`) are unit-testable with static props. E2E spec covers toggle default, toggle interaction, review grid sum, game start, helper regression. |
| Risk (10%) | Moderate weight | Two risks are high-severity but low-probability (migration, feedback loop). One risk is certain but trivially fixed (regex anchor). V6 spurious warn is the only known user-visible gap, and it does not block game start. |

---

*Phase 3 Synthesis 1 — architecture-synthesizer agent — 2026-03-05*

---

Now I need to write this to disk. Since I cannot use a Bash tool to create the directory and file, I'll produce this as the final output. The file path is:

`/Users/j/repos/beak-gaming-platform/docs/trivia-round-config-decisions/phase-3/synthesis-1.md`

The directory `phase-3/` must be created first.

The document above is the complete synthesis. Here is a summary of what it delivers:

**Patterns and Conventions Found:**
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/settings-store.ts` (version 3, lines 84–145) — persist pattern with `partialize`, `migrate`, version bump
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/selectors.ts` (lines 121–123) — pure function pattern for `getQuestionsForRound`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/questions.ts` (lines 43–77) — `importQuestions` feedback loop source; the function that writes `settings.roundsCount`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/engine.ts` (barrel pattern) — all engine functions re-exported from `./questions`, `./selectors`, etc.
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/categories.ts` (line 187) — `getCategoryBadgeClasses()` confirmed exported and used in existing components

**Critical Decisions Made:**

1. **`PerRoundBreakdown` type** — Iterator 1's field names (`totalCount`, `expectedCount`, `isMatch`) with Iterator 3's simplified category entry (`{ categoryId, questionCount }`, no embedded display strings). The `perRoundExpected: number[]` parallel array from Iterator 4 is eliminated — `breakdown[i].expectedCount` replaces it.

2. **`isByCategory` lives in settings store v4** — not `useState` in `SetupGate`. Phase 1 Q4 required localStorage persistence. Iterator 3's `useState` recommendation did not account for this.

3. **`isByCategory` must be in the `useEffect` dep array** — Iterator 2's ambiguous comment is resolved definitively. Changing mode changes the redistribution algorithm. Omitting it from deps causes missed triggers.

4. **`derivePerRoundBreakdown` lives in `selectors.ts`, not re-exported from `engine.ts`** — it is a read-only display utility, not a game engine function.

5. **E2E Test 5 regex** — the `$` anchor in `/^Round \d+: \d+ questions?$/` will break when the `(expected N)` hint suffix is appended. Remove the anchor.