# Phase 4 Execution Plan: Trivia Round Config Redesign

Below is the complete content for `/Users/j/repos/beak-gaming-platform/docs/trivia-round-config-decisions/phase-4/execution-plan.md`.

---

## A) ELI5 Explanation

Right now the trivia game makes you set a fixed number of questions per round using a slider, and all rounds must have the same count. We're adding a "By Category" toggle: when it's on, the game automatically groups questions by their subject (Science, History, etc.) so each round gets one subject. The settings screen will show colored badges instead of a number slider, and the review screen will correctly show green when each round has the right questions. This toggle preference is remembered across page refreshes, and the behavior is tested end-to-end before the feature ships.

## B) 5-Sentence Technical Summary

The redesign adds an `isByCategory: boolean` field to the settings store (version 4) with persisted default `true`, eliminating the session-only `useState` approach that was proposed in Phase 2. A new `redistributeQuestions()` engine function in `lib/game/questions.ts` accepts a `mode` parameter and idempotently rewrites `roundIndex` values on all questions, guarded by status and same-reference returns to prevent feedback loops. A `useMemo`-derived `PerRoundBreakdown[]` array (produced by `derivePerRoundBreakdown` in `lib/game/selectors.ts`) serves as the single data source for both `WizardStepSettings` (category badge pills for Q1) and `WizardStepReview` (mode-aware `isMatch` coloring for Q5). The redistribution `useEffect` in `SetupGate` fires on `[questions, roundsCount, questionsPerRound, isByCategory]` — all four dependencies confirmed required — and a `skipNextRedistribution` ref guards against preset-load overwrites of manually arranged questions. Eight work units (WU-1 through WU-8) are sequenced in five waves with maximum parallelism, resulting in one new E2E spec file and modifications to ten existing files with no new packages and no database schema changes.

## C) Table of Contents

- [D.1 Architecture / Approach Summary](#d1-architecture--approach-summary)
- [D.2 Step-by-Step Implementation Sequence](#d2-step-by-step-implementation-sequence)
- [D.3 Work Unit Specs](#d3-work-unit-specs)
  - [WU-1: Types and Derivation Function](#work-unit-wu-1-types-and-derivation-function)
  - [WU-2: Engine Function — redistributeQuestions](#work-unit-wu-2-engine-function--redistributequestions)
  - [WU-3: Settings Store v3 to v4 Migration](#work-unit-wu-3-settings-store-v3-to-v4-migration)
  - [WU-4: SetupGate Orchestration](#work-unit-wu-4-setupgate-orchestration)
  - [WU-5: WizardStepSettings Redesign](#work-unit-wu-5-wizardstepsettings-redesign)
  - [WU-6: WizardStepReview Adaptation](#work-unit-wu-6-wizardstepreview-adaptation)
  - [WU-7: SetupWizard Prop Threading](#work-unit-wu-7-setupwizard-prop-threading)
  - [WU-8: E2E Tests](#work-unit-wu-8-e2e-tests)
  - [Recommended Ticket Breakdown](#recommended-ticket-breakdown)
- [D.4 Agent/Task Orchestration Plan](#d4-agenttask-orchestration-plan)
- [D.5 Checkpoints Between Milestones](#d5-checkpoints-between-milestones)
- [D.6 Branch and Merge Strategy](#d6-branch-and-merge-strategy)
- [Decision Traceability (6 Questions)](#decision-traceability-6-questions)
- [Criteria Justification](#criteria-justification)

---

## D.1 Architecture / Approach Summary

### The Chosen Pattern

The architecture is a **unidirectional data flow hub** centered on `SetupGate`. All state reads and writes happen in one container; all components below it are fully presentational. This is an extension of the existing pattern — not a departure from it.

```
Settings Store (isByCategory: boolean, roundsCount, questionsPerRound)
Game Store     (questions[], redistributeQuestions action)
        |
        v
SetupGate
  useEffect([questions, roundsCount, questionsPerRound, isByCategory])
    --> redistributeQuestions(mode)          // writes: questions[].roundIndex only
  useMemo([questions, roundsCount, isByCategory, questionsPerRound])
    --> derivePerRoundBreakdown()            // reads: questions[].roundIndex
  skipNextRedistribution: useRef<boolean>   // preset-load guard
        |
    [props down]
        v
SetupWizard
  perRoundBreakdown: PerRoundBreakdown[]
  isByCategory: boolean
  onToggleByCategory: (v: boolean) => void
        |
    +-----------+
    |           |
    v           v
WizardStep   WizardStep
Settings     Review
(Step 1)     (Step 3)
```

### Key Architectural Decisions

**D1 — Single canonical type serves both consumers.** `PerRoundBreakdown` (fields: `roundIndex`, `totalCount`, `expectedCount`, `isMatch`, `categories: RoundCategoryEntry[]`) is produced once in `SetupGate` via `useMemo` and consumed by both `WizardStepSettings` (badge pills) and `WizardStepReview` (grid coloring). The iterator-4 proposal for a parallel `perRoundExpected: number[]` array is eliminated. `WizardStepReview` receives `perRoundBreakdown?: PerRoundBreakdown[]` directly.

**D2 — `isByCategory` in settings store, not `useState`.** Phase 1 Q4 explicitly required localStorage persistence. The settings store already owns all other game preferences. Iterator-3's `useState` proposal is overridden by this requirement.

**D3 — `isByCategory` mandatory in the effect dependency array.** Iterator-2's ambiguous comment about omitting it from deps is resolved: it must be in the array. Excluding it would cause mode-toggle not to trigger redistribution. ESLint `react-hooks/exhaustive-deps` would also catch the omission and fail pre-commit hooks.

**D4 — `redistributeQuestions` has an absolute prohibition on writing `settings.*`.** Three functions in `questions.ts` write `settings.roundsCount`: `importQuestions`, `addQuestion`, and `updateQuestion`. The `addQuestion` and `updateQuestion` writes must be removed (lines 116–117 and 173–174 of `apps/trivia/src/lib/game/questions.ts`) to prevent the stutter cycle where question edits produce inconsistent `roundsCount` values between `state.settings` and the settings store.

**D5 — `derivePerRoundBreakdown` lives in `selectors.ts`, imported directly, not via `engine.ts` barrel.** It is a pure read-only display utility, not a game engine function. It must never be added to the `engine.ts` barrel to prevent inappropriate use in non-setup contexts.

**D6 — `isMatch` special cases.** In By Category mode: `isMatch = totalCount > 0` (any non-empty round matches because redistribution produces the target). In By Count mode: `isMatch = totalCount === questionsPerRound`. Empty rounds (`totalCount === 0`) are always `isMatch: false` regardless of mode. When `questions.length === 0`, all rounds return `isMatch: false` to avoid green pills alongside the "No questions" error banner.

**D7 — Preset-load guard via `skipNextRedistribution` ref.** A `useRef<boolean>` in `SetupGate` prevents redistribution from overwriting manually arranged question distribution when a preset is loaded. The flag is set by the preset-load callback and cleared inside the effect body after one skip.

**D8 — Q4 preset schema deferred.** `isByCategory` is NOT added to the preset database schema. It remains a local user preference only.

### Files Changed

**New file:**
- `apps/trivia/e2e/trivia/round-config.spec.ts` (per repo structure: `e2e/trivia/round-config.spec.ts`)

**Modified files (10):**
1. `apps/trivia/src/types/index.ts`
2. `apps/trivia/src/lib/game/questions.ts`
3. `apps/trivia/src/lib/game/selectors.ts`
4. `apps/trivia/src/lib/game/engine.ts`
5. `apps/trivia/src/stores/settings-store.ts`
6. `apps/trivia/src/stores/game-store.ts`
7. `apps/trivia/src/components/presenter/SetupGate.tsx`
8. `apps/trivia/src/components/presenter/SetupWizard.tsx`
9. `apps/trivia/src/components/presenter/WizardStepSettings.tsx`
10. `apps/trivia/src/components/presenter/WizardStepReview.tsx`

No new packages. No database migrations. No API route changes.

---

## D.2 Step-by-Step Implementation Sequence

The dependency graph produces five waves. Steps within a wave are independent and can run in parallel.

```
Wave 1 (parallel):
  Step 1 --> WU-1: types/index.ts + selectors.ts (PerRoundBreakdown type + derivePerRoundBreakdown)
  Step 2 --> WU-2: questions.ts + engine.ts + game-store.ts (redistributeQuestions engine + store action)
  Step 3 --> WU-3: settings-store.ts (isByCategory field, v4 migration)

Wave 2 (requires Wave 1 complete):
  Step 4 --> WU-4: SetupGate.tsx (useEffect, useMemo, skipNextRedistribution, new SetupWizard props)

Wave 3 (requires Step 4 complete, parallel):
  Step 5 --> WU-5: WizardStepSettings.tsx (toggle + three render states + badge pills)
  Step 6 --> WU-6: WizardStepReview.tsx (optional perRoundBreakdown prop, isMatch rewrite, hint span)

Wave 4 (requires Steps 5 + 6 complete):
  Step 7 --> WU-7: SetupWizard.tsx (prop threading, perRoundBreakdown to both steps)

Wave 5 (requires Step 7 complete):
  Step 8 --> WU-8: e2e/trivia/round-config.spec.ts (new E2E spec, 9 scenarios)
```

TypeScript compile checkpoints: after Wave 1 (`pnpm typecheck`), after Wave 2 (`pnpm typecheck`), after Wave 3 (`pnpm typecheck`), after Wave 4 (`pnpm typecheck + pnpm test:run`), after Wave 5 (`pnpm test:e2e:trivia`).

---

## D.3 Work Unit Specs

---

### Work Unit: WU-1 — Types and Derivation Function

**Objective:** Define the two canonical shared types (`RoundCategoryEntry`, `PerRoundBreakdown`) in `types/index.ts` and implement the pure `derivePerRoundBreakdown()` function in `selectors.ts`. This is the root of the entire dependency tree.

**Files/areas touched:**
- `apps/trivia/src/types/index.ts` — add `RoundCategoryEntry` and `PerRoundBreakdown` interfaces in a new `// ROUND BREAKDOWN` section after `// GAME SETTINGS`
- `apps/trivia/src/lib/game/selectors.ts` — add `derivePerRoundBreakdown()` after existing selector functions; do NOT add to `engine.ts` barrel

**Implementation notes:**

Canonical types (use exactly these field names — no deviations):
```typescript
export interface RoundCategoryEntry {
  categoryId: QuestionCategory;
  questionCount: number;
}

export interface PerRoundBreakdown {
  roundIndex: number;
  totalCount: number;
  expectedCount: number;
  isMatch: boolean;
  categories: RoundCategoryEntry[];
}
```

`derivePerRoundBreakdown(questions, roundsCount, isByCategory, questionsPerRound)`:
- Zero-questions fast path: return `roundsCount` entries all with `{ totalCount: 0, expectedCount: 0, isMatch: false, categories: [] }` — `isMatch: false` is critical here (prevents false-green pills alongside the "No questions" error banner)
- Group questions by `roundIndex` using a `Map<number, Question[]>`
- For each round 0..roundsCount-1: compute `totalCount` (sum of questions in that round), `categories` (per-`normalizeCategoryId()` aggregation of `questionCount` per `categoryId`)
- `expectedCount`: By Count mode = `questionsPerRound`; By Category mode = `totalCount` (target is what redistribution produced)
- `isMatch`: By Count mode = `totalCount === questionsPerRound`; By Category mode = `totalCount > 0` (any non-empty round after redistribution is correct)
- Apply `normalizeCategoryId()` from `@/lib/categories` to all `categoryId` values
- The function is imported by `SetupGate` as `import { derivePerRoundBreakdown } from '@/lib/game/selectors'` — NOT via barrel

**Acceptance criteria:**
- [ ] `RoundCategoryEntry` exported from `apps/trivia/src/types/index.ts` with fields `categoryId: QuestionCategory`, `questionCount: number`
- [ ] `PerRoundBreakdown` exported from `apps/trivia/src/types/index.ts` with fields `roundIndex`, `totalCount`, `expectedCount`, `isMatch`, `categories: RoundCategoryEntry[]`
- [ ] JSDoc comment on `PerRoundBreakdown` documents: array length equals `roundsCount`, 0-based `roundIndex`, empty rounds included not omitted, `isMatch` is precomputed
- [ ] `derivePerRoundBreakdown` exported from `apps/trivia/src/lib/game/selectors.ts`
- [ ] Zero-questions path returns all `isMatch: false` entries (not `true`)
- [ ] By Category mode: non-empty rounds have `isMatch: true`; empty rounds (0 questions assigned) have `isMatch: false`
- [ ] By Count mode: `isMatch = totalCount === questionsPerRound`
- [ ] `normalizeCategoryId()` applied to all category IDs in derivation
- [ ] `derivePerRoundBreakdown` NOT added to `engine.ts` barrel
- [ ] `pnpm typecheck` passes with no new errors

**Tests/verification:**
- [ ] Unit test: `derivePerRoundBreakdown([], 3, true, 5)` returns 3 entries, all `isMatch: false`
- [ ] Unit test: `derivePerRoundBreakdown([], 3, false, 5)` returns 3 entries, `expectedCount: 5`, all `isMatch: false`
- [ ] Unit test: By Count mode, `questionsPerRound: 5`, round with 5 questions → `isMatch: true`; round with 4 → `isMatch: false`
- [ ] Unit test: By Category mode, round with 1+ questions → `isMatch: true`; round with 0 questions → `isMatch: false`
- [ ] Unit test: categories are aggregated by `categoryId` (same category adds up, not duplicated)
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:** Pure additions with no runtime side effects. Rollback: delete the two interface blocks from `types/index.ts` and delete `derivePerRoundBreakdown` from `selectors.ts`.

**Dependencies:** None. This is the root of the dependency tree.

**Recommended agent type:** `frontend-excellence:react-specialist`

---

### Work Unit: WU-2 — Engine Function — redistributeQuestions

**Objective:** Implement `redistributeQuestions()` in `questions.ts`, export via `engine.ts` barrel, add the store action wrapper in `game-store.ts`, and remove the spurious `settings.roundsCount` writes from `addQuestion` and `updateQuestion`.

**Files/areas touched:**
- `apps/trivia/src/lib/game/questions.ts` — add `redistributeQuestions()` after `clearQuestions()`; remove `settings.roundsCount` writes from `addQuestion` (line 126) and `updateQuestion` (line 183)
- `apps/trivia/src/lib/game/engine.ts` — add `redistributeQuestions` to the `// Questions` re-export block
- `apps/trivia/src/stores/game-store.ts` — add `redistributeQuestions` to `GameStore` interface and `create()` body

**Implementation notes:**

Function signature:
```typescript
export function redistributeQuestions(
  state: TriviaGameState,
  roundsCount: number,
  questionsPerRound: number,
  mode: 'by_count' | 'by_category'
): TriviaGameState
```

Hard constraints — the function MUST NOT write: `state.settings.roundsCount`, `state.totalRounds`, `state.selectedQuestionIndex`. Writing any settings field re-creates the feedback loop that `importQuestions` creates.

Guards (all must come before any computation):
1. Status guard: `if (state.status !== 'setup') return state`
2. Empty guard: `if (state.questions.length === 0) return state`

By Count algorithm: `targetIndex[i] = Math.floor(i / questionsPerRound)`. No upper clamping by `roundsCount` — overflow questions surface as amber in the review grid (handled by `derivePerRoundBreakdown`'s `isMatch` logic).

By Category algorithm:
1. Walk questions in array order; build `Map<QuestionCategory, number>` where the value is the assigned round (first occurrence of a category = round 0, second unique category = round 1, etc.)
2. Assign each question's `roundIndex` from the map

Idempotency check: `if (state.questions.every((q, i) => q.roundIndex === targetAssignments[i])) return state`. If all assignments already match, return the same state reference — Zustand detects same reference and skips re-render, preventing the effect from firing again.

New state on change: `return deepFreeze({ ...state, questions: newQuestions })` where `newQuestions` is a new array with updated `roundIndex` values. Use `deepFreeze` imported from `./helpers` (same pattern as all other engine functions).

Store action wrapper uses import alias to avoid name collision:
```typescript
import { redistributeQuestions as redistributeQuestionsEngine } from '@/lib/game/engine';
// Interface:
redistributeQuestions: (roundsCount: number, questionsPerRound: number, mode: 'by_count' | 'by_category') => void;
// create() body:
redistributeQuestions: (roundsCount, questionsPerRound, mode) =>
  set((state) => redistributeQuestionsEngine(state, roundsCount, questionsPerRound, mode)),
```

Removing `settings.roundsCount` writes from `addQuestion` and `updateQuestion`: these lines (126 and 183 in `questions.ts`) write `settings: { ...state.settings, roundsCount: totalRounds }`. Remove the `roundsCount` key from these spreads. The settings store is the source of truth; `play/page.tsx` already syncs it into `state.settings` via its own effect.

**Acceptance criteria:**
- [ ] `redistributeQuestions` exported from `apps/trivia/src/lib/game/questions.ts`
- [ ] Function re-exported from `apps/trivia/src/lib/game/engine.ts`
- [ ] `redistributeQuestions` action in `GameStore` interface and `create()` body
- [ ] Store action uses `redistributeQuestionsEngine` alias
- [ ] Status guard: `status !== 'setup'` returns same reference
- [ ] Empty guard: `questions.length === 0` returns same reference
- [ ] Idempotency: same inputs twice produces zero additional Zustand state updates (unit test verifies same object reference returned)
- [ ] Does NOT write `settings.roundsCount`, `totalRounds`, or `selectedQuestionIndex` (verify on returned state)
- [ ] By Count: `Math.floor(i / questionsPerRound)` assignment verified
- [ ] By Category: stable first-occurrence category order
- [ ] `addQuestion` no longer writes `settings.roundsCount`
- [ ] `updateQuestion` no longer writes `settings.roundsCount`
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes

**Tests/verification:**
- [ ] Unit test: By Count — 10 questions, QPR=5 → rounds [0,0,0,0,0,1,1,1,1,1]
- [ ] Unit test: By Count — 3 questions, QPR=5 → all round 0 (no crash on under-full)
- [ ] Unit test: By Category — [Science, History, Science, Geography] → [0,1,0,2]
- [ ] Unit test: Idempotency By Count — questions already at target roundIndex returns same object reference (not `===` struct-equal, exactly the same reference)
- [ ] Unit test: Idempotency By Category — same questions same order returns same reference
- [ ] Unit test: Status guard — `status='playing'` returns same reference
- [ ] Unit test: Empty guard — `questions=[]` returns same reference
- [ ] Unit test: Returned state has no `settings.roundsCount` different from input
- [ ] Unit test: `addQuestion` result no longer contains a mutated `settings.roundsCount`
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:** The removal of `settings.roundsCount` from `addQuestion`/`updateQuestion` is a behavior change for the question editor. Verify that nothing in the question editor relies on `state.settings.roundsCount` being updated by these functions. The settings-sync effect in `play/page.tsx` already handles this. Rollback: revert all three files. The store action removal is additive-only.

**Dependencies:** WU-1 can run in parallel with WU-2 (WU-2 uses `TriviaGameState` and `Question` which already exist — it does not depend on WU-1's new types).

**Recommended agent type:** `frontend-excellence:state-manager`

---

### Work Unit: WU-3 — Settings Store v3 to v4 Migration

**Objective:** Add `isByCategory: boolean` to `SettingsState`, bump the store version to 4, add a migration handler, and include the field in `partialize`. This enables toggle state persistence across page refreshes.

**Files/areas touched:**
- `apps/trivia/src/stores/settings-store.ts` — interface, defaults, partialize, version, migrate

**Implementation notes:**

Four targeted changes to `settings-store.ts`:

1. Add to `SettingsState` interface: `isByCategory: boolean;`
2. Add to `SETTINGS_DEFAULTS`: `isByCategory: true,`
3. Add to `partialize` return object: `isByCategory: state.isByCategory,`
4. Bump `version: 3` to `version: 4`
5. Add migration branch:
```typescript
if (fromVersion <= 3) {
  // v4 adds isByCategory. Not present in stored v3 data.
  // Return stored as-is; Zustand merge with SETTINGS_DEFAULTS supplies isByCategory: true.
  return stored;
}
```

The existing `updateSetting` generic handler already accepts any `keyof SettingsState` — no change required. `isByCategory` is NOT added to `SETTINGS_RANGES` (it is boolean, not numeric). `validateSetting` already short-circuits for non-range keys. The `useSettings()` and `useGameSettings()` hooks do not need updating — `isByCategory` is read directly from the store in `SetupGate`.

Zustand's merge behavior: `migrate()` returns the stored object; Zustand then merges it with the initial state from `create()`, which provides `SETTINGS_DEFAULTS.isByCategory = true` for the missing field. No explicit `isByCategory: true` is needed in the migration body.

**Acceptance criteria:**
- [ ] `SettingsState.isByCategory: boolean` present in interface
- [ ] `SETTINGS_DEFAULTS.isByCategory = true`
- [ ] `partialize` includes `isByCategory: state.isByCategory`
- [ ] Store version is 4
- [ ] `migrate()` handles `fromVersion <= 3` (returns `stored` as-is)
- [ ] `updateSetting('isByCategory', false)` compiles and works
- [ ] Store version bump does not corrupt existing persisted state
- [ ] `pnpm typecheck` passes

**Tests/verification:**
- [ ] Unit test: `updateSetting('isByCategory', false)` → store has `isByCategory: false`
- [ ] Unit test: `resetToDefaults()` → `isByCategory: true`
- [ ] Unit test: migration from version 3 with stored state lacking `isByCategory` → after migration, `isByCategory: true`
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:** Version bump without migration returning `stored` would reset all user settings (roundsCount, questionsPerRound, etc.) to defaults. The migration MUST return `stored`, not an empty object. Rollback: revert all five changes to `settings-store.ts`.

**Dependencies:** None. WU-3 runs in parallel with WU-1 and WU-2.

**Recommended agent type:** `frontend-excellence:state-manager`

---

### Work Unit: WU-4 — SetupGate Orchestration

**Objective:** Wire the redistribution engine and breakdown derivation into `SetupGate`. Add the `useEffect` (redistribution trigger), `useMemo` (breakdown derivation), `skipNextRedistribution` ref (preset-load guard), and the three new props passed down to `SetupWizard`.

**Files/areas touched:**
- `apps/trivia/src/components/presenter/SetupGate.tsx` — add imports, store subscriptions, effect, memo, ref, toggle callback, updated `SetupWizard` JSX

**Implementation notes:**

New imports to add:
```typescript
import { useMemo, useEffect, useRef, useCallback } from 'react'; // add to existing React import
import { derivePerRoundBreakdown } from '@/lib/game/selectors';
import type { PerRoundBreakdown } from '@/types';
```

New store subscriptions in component body:
```typescript
const isByCategory = useSettingsStore((s) => s.isByCategory);
const redistributeQuestions = useGameStore((s) => s.redistributeQuestions);
```

The `skipNextRedistribution` ref:
```typescript
const skipNextRedistribution = useRef(false);
```

The redistribution effect (place after existing callbacks):
```typescript
useEffect(() => {
  if (skipNextRedistribution.current) {
    skipNextRedistribution.current = false;
    return;
  }
  redistributeQuestions(
    roundsCount,
    questionsPerRound,
    isByCategory ? 'by_category' : 'by_count'
  );
}, [questions, roundsCount, questionsPerRound, isByCategory, redistributeQuestions]);
```

All five dependencies are required. `redistributeQuestions` is a Zustand action (stable reference), included per `react-hooks/exhaustive-deps` rules. The idempotency contract prevents this from looping.

The `useMemo`:
```typescript
const perRoundBreakdown: PerRoundBreakdown[] = useMemo(
  () => derivePerRoundBreakdown(questions, roundsCount, isByCategory, questionsPerRound),
  [questions, roundsCount, isByCategory, questionsPerRound]
);
```

The toggle callback:
```typescript
const handleToggleByCategory = useCallback(
  (value: boolean) => updateSetting('isByCategory', value),
  [updateSetting]
);
```

Where `handlePresetLoad` is defined (or wherever preset loading calls `updateSetting`), add `skipNextRedistribution.current = true` before the settings update. If no explicit preset-load handler currently exists in `SetupGate`, document this as a hook point for when preset loading is added.

Updated `SetupWizard` call adds three new props:
```
isByCategory={isByCategory}
perRoundBreakdown={perRoundBreakdown}
onToggleByCategory={handleToggleByCategory}
```

`derivePerRoundBreakdown` must be implemented in `selectors.ts` as part of WU-1. WU-4 only consumes it.

**Acceptance criteria:**
- [ ] `useEffect` fires on changes to `questions`, `roundsCount`, `questionsPerRound`, `isByCategory`
- [ ] `redistributeQuestions` called with correct `mode` string based on `isByCategory`
- [ ] `skipNextRedistribution` ref resets to `false` inside the effect after one skip
- [ ] `perRoundBreakdown` derived via `useMemo` with matching dependency array
- [ ] `perRoundBreakdown` array length equals `roundsCount`
- [ ] Empty rounds (round with 0 questions assigned) are included in the array
- [ ] `SetupWizard` receives `isByCategory`, `perRoundBreakdown`, `onToggleByCategory`
- [ ] No feedback loop: toggling `isByCategory` twice returns to original state with no extra renders
- [ ] `pnpm typecheck` passes

**Tests/verification:**
- [ ] Component test or manual: toggle `isByCategory` on/off does not cause render count to climb (verify via React DevTools)
- [ ] Unit test for `derivePerRoundBreakdown` handles `questions = []` gracefully (covered in WU-1 tests)
- [ ] TypeScript confirms `SetupWizard` call site compiles without error
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:** Feedback loop if `redistributeQuestions` idempotency fails. Mitigated by WU-2's unit tests. If `derivePerRoundBreakdown` is not memoized, `perRoundBreakdown` will be a new array reference every render, causing downstream re-renders — mitigated by `useMemo`. Rollback: revert `SetupGate.tsx` additions; `derivePerRoundBreakdown` stays in `selectors.ts` (it has no callers until WU-4 is wired).

**Dependencies:** WU-1 (types + `derivePerRoundBreakdown`), WU-2 (store action), WU-3 (`isByCategory` in settings store). All three Wave 1 units must be complete.

**Recommended agent type:** `frontend-excellence:react-specialist`

---

### Work Unit: WU-5 — WizardStepSettings Redesign

**Objective:** Replace the two-slider layout with the mode-aware three-state layout: toggle + conditional QPR slider (By Count) or category badge pills (By Category). Fully presentational — zero store access.

**Files/areas touched:**
- `apps/trivia/src/components/presenter/WizardStepSettings.tsx` — new props interface, full JSX rewrite

**Implementation notes:**

New `WizardStepSettingsProps` (replaces the existing 3-field interface):
```typescript
export interface WizardStepSettingsProps {
  roundsCount: number;
  questionsPerRound: number;
  isByCategory: boolean;
  perRoundBreakdown: PerRoundBreakdown[]; // required, never undefined; [] = no questions loaded
  onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  onToggleByCategory: (isByCategory: boolean) => void;
}
```

Three render states:

**State A — `isByCategory: false`:** Toggle (unchecked) + Rounds slider + QPR slider. Identical to existing behavior except Toggle row is prepended.

**State B — `isByCategory: true`, questions loaded:** Toggle (checked) + Rounds slider + category badge pills from `perRoundBreakdown[0].categories`. Badge text: `{getCategoryName(entry.categoryId)}: {entry.questionCount}`. Color classes: `getCategoryBadgeClasses(entry.categoryId)`. Both functions imported from `@/lib/categories`.

**State C — `isByCategory: true`, no questions:** Toggle (checked) + Rounds slider + plain text "No questions imported yet. Import questions in Step 1 to see the breakdown."

Emptiness sentinel:
```typescript
const firstRound = perRoundBreakdown[0];
const hasBreakdown = !!firstRound && firstRound.categories.length > 0;
```

The `Toggle` component from `@joolie-boolie/ui` emits `role="switch"` and `aria-checked` automatically. Use label text "By Category" for the switch role selector in tests.

Rounds slider renders in ALL modes (A, B, C). The QPR slider renders ONLY in State A. The `questionsPerRound` prop remains on the interface so the parent always passes the same shape regardless of mode.

**Acceptance criteria:**
- [ ] `WizardStepSettingsProps` has exactly the 6 fields specified
- [ ] Toggle renders with `role="switch"` and correct `checked`/`onChange` wiring
- [ ] Rounds slider visible in all three states
- [ ] QPR slider hidden when `isByCategory: true`
- [ ] Badge pills render when `isByCategory: true` AND `hasBreakdown: true`
- [ ] Empty state text renders when `isByCategory: true` AND `hasBreakdown: false`
- [ ] Badge pill uses `getCategoryBadgeClasses(entry.categoryId)` for color classes
- [ ] Badge text is `{getCategoryName(entry.categoryId)}: {entry.questionCount}`
- [ ] Zero `useStore()` calls, zero `useEffect`, zero `useState` in this component
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes

**Tests/verification:**
- [ ] Unit test: `isByCategory=false` → two sliders visible (Rounds + QPR)
- [ ] Unit test: `isByCategory=true`, `perRoundBreakdown` with categories → one slider + badge pills
- [ ] Unit test: `isByCategory=true`, `perRoundBreakdown=[]` → one slider + empty-state text
- [ ] Unit test: toggling calls `onToggleByCategory` with the negated value
- [ ] Unit test: `getByRole('switch', { name: /by category/i })` succeeds
- [ ] Unit test: `getByRole('slider', { name: /questions per round/i })` NOT found when `isByCategory=true`
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:** `Toggle` import path must be `@joolie-boolie/ui`. `getCategoryBadgeClasses` import is `@/lib/categories`. `perRoundBreakdown[0]` access guarded by `hasBreakdown` check. Rollback: revert to two-slider layout; also revert `SetupWizard.tsx` props (WU-7) since props interface is incompatible.

**Dependencies:** WU-1 (types), WU-4 (SetupGate must produce `perRoundBreakdown` and `onToggleByCategory` props). WU-5 can be written in isolation once WU-4's prop contract is known, but tests require the full wire-up.

**Recommended agent type:** `frontend-excellence:react-specialist`

---

### Work Unit: WU-6 — WizardStepReview Adaptation

**Objective:** Update the per-round question grid to use mode-aware `isMatch` logic. New props are optional for backward compatibility. Replace the `perRoundExpected: number[]` approach with direct `perRoundBreakdown?: PerRoundBreakdown[]`.

**Files/areas touched:**
- `apps/trivia/src/components/presenter/WizardStepReview.tsx` — new optional props, `isMatch` rewrite at line ~97, hint span

**Implementation notes:**

Add to `WizardStepReviewProps` (both optional — backward compatible):
```typescript
isByCategory?: boolean;
perRoundBreakdown?: PerRoundBreakdown[];
```

Note: This uses `perRoundBreakdown` directly, NOT the `perRoundExpected: number[]` intermediate. Iterator-3's `perRoundExpected` prop is dropped — `breakdown[i].expectedCount` provides the same data with richer context (RISK-13 resolution).

Replace line ~97 (`const isMatch = count === questionsPerRound;`) with:
```typescript
const bd = perRoundBreakdown?.[i];
const count = bd?.totalCount ?? questions.filter((q) => q.roundIndex === i).length;
const expected = bd ? bd.expectedCount : questionsPerRound;
const isMatch = bd ? bd.isMatch : count === questionsPerRound;
```

The fallback path (`bd` is undefined) preserves existing behavior for callers that have not yet passed `perRoundBreakdown` — this is the backward-compatibility contract.

Add hint span inside the round pill `<div>` after the text node:
```tsx
{isByCategory && !isMatch && expected > 0 && (
  <span className="text-xs opacity-70 ml-1">(expected {expected})</span>
)}
```

The existing settings summary block (showing `questionsPerRound`) is retained unchanged — updating its label to "varies" is a follow-on concern.

**Acceptance criteria:**
- [ ] `isByCategory?: boolean` and `perRoundBreakdown?: PerRoundBreakdown[]` added to `WizardStepReviewProps`
- [ ] `count` sourced from `bd.totalCount` when `perRoundBreakdown` provided (O(1) vs O(n) filter)
- [ ] `isMatch` sourced from `bd.isMatch` when `perRoundBreakdown` provided
- [ ] Fallback to `count === questionsPerRound` when `perRoundBreakdown` is not passed
- [ ] Hint span `(expected N)` renders only when `isByCategory && !isMatch && expected > 0`
- [ ] Existing call site in `SetupWizard` compiles without modification (new props are optional)
- [ ] Pill colors and layout unchanged
- [ ] `pnpm typecheck` passes

**Tests/verification:**
- [ ] Unit test: no new props passed → existing By Count behavior unchanged
- [ ] Unit test: By Category, round matches expected → green pill, no hint span
- [ ] Unit test: By Category, round underfilled → amber pill + "(expected N)" hint
- [ ] Unit test: By Category, `expected = 0` → amber pill, NO "(expected 0)" hint
- [ ] Unit test: `perRoundBreakdown` shorter than `roundsCount` → missing index falls back gracefully
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:** The `expected > 0 && count === expected` logic is subtly different from `count === questionsPerRound` in the fallback path — but `questionsPerRound` is clamped to minimum 3 by `SETTINGS_RANGES`, so the guard is always satisfied in By Count mode. Rollback: revert to `const isMatch = count === questionsPerRound` (one-line revert). New optional props have zero impact on existing callers.

**Dependencies:** WU-1 (types for `PerRoundBreakdown`). WU-6 can run in parallel with WU-5 after WU-4 establishes the prop contract.

**Recommended agent type:** `frontend-excellence:react-specialist`

---

### Work Unit: WU-7 — SetupWizard Prop Threading

**Objective:** Update `SetupWizardProps` to accept the three new props from `SetupGate`, thread them to `WizardStepSettings` (step 1), and derive + pass `perRoundBreakdown` to `WizardStepReview` (step 3).

**Files/areas touched:**
- `apps/trivia/src/components/presenter/SetupWizard.tsx` — interface update, destructure, step 1 call site, step 3 call site, `PerRoundBreakdown` import

**Implementation notes:**

Add to `SetupWizardProps`:
```typescript
isByCategory: boolean;
perRoundBreakdown: PerRoundBreakdown[];
onToggleByCategory: (isByCategory: boolean) => void;
```

Add `import type { PerRoundBreakdown } from '@/types';` at the top.

Destructure the three new props in the function signature.

`WizardStepSettings` call site (step 1) receives: `roundsCount`, `questionsPerRound`, `isByCategory`, `perRoundBreakdown`, `onUpdateSetting`, `onToggleByCategory`.

`WizardStepReview` call site (step 3) receives: existing props plus `isByCategory` and `perRoundBreakdown`. Pass `perRoundBreakdown` directly — do not derive `perRoundExpected` here.

No `useMemo` needed for the prop derivations — `SetupWizard` is a navigation controller, not an orchestrator. It passes `perRoundBreakdown` through directly; the array reference is already stable from `SetupGate`'s `useMemo`.

**Acceptance criteria:**
- [ ] `SetupWizardProps` has `isByCategory: boolean`, `perRoundBreakdown: PerRoundBreakdown[]`, `onToggleByCategory: (isByCategory: boolean) => void`
- [ ] `WizardStepSettings` receives all 6 required props including the 3 new ones
- [ ] `WizardStepReview` receives `isByCategory` and `perRoundBreakdown` as optional props
- [ ] `SetupGate` call site compiles without error (it passes all new props per WU-4)
- [ ] `pnpm typecheck` passes

**Tests/verification:**
- [ ] TypeScript compilation verifies all call sites resolve
- [ ] Manual or E2E: step 1 shows toggle in correct state
- [ ] Manual or E2E: step 3 shows correct pill coloring in By Category mode
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:** If `SetupGate`'s `perRoundBreakdown` `useMemo` is not correctly memoized, reference instability cascades through `SetupWizard` into both leaf components. This is already mitigated in WU-4. Rollback: remove three props from `SetupWizardProps`; leaf components retain their new props but receive nothing from `SetupWizard` until re-wired.

**Dependencies:** WU-4 (SetupGate must produce the new props), WU-5 (WizardStepSettings must have the new interface), WU-6 (WizardStepReview must accept `perRoundBreakdown`). This is the integration unit — all leaf work must be merged first.

**Recommended agent type:** `frontend-excellence:react-specialist`

---

### Work Unit: WU-8 — E2E Tests

**Objective:** Create `e2e/trivia/round-config.spec.ts` with 9 must-have E2E scenarios (plus 1 nice-to-have) covering the By Category toggle, QPR slider visibility, review grid distribution, game start, and `startGameViaWizard` helper regression guard.

**Files/areas touched:**
- `e2e/trivia/round-config.spec.ts` — new file
- `e2e/utils/helpers.ts` — update `startGameViaWizard` to wait for Start button enabled state before clicking

**Implementation notes:**

The 9 must-have scenarios (Q6 requirement):

| # | Tag | Scenario |
|---|-----|----------|
| S1 | @critical | Toggle is ON by default; Rounds slider visible; QPR slider NOT visible |
| S2 | @critical | Toggle OFF reveals QPR slider; Rounds slider stays visible |
| S3 | @high | Review step: sum of per-round question counts equals total questions loaded |
| S4 | @critical | Game starts successfully with By Category ON (default state) |
| S5 | @critical | `startGameViaWizard` helper regression: helper still works with By Category default |
| S6 | @high | Toggling By Category OFF then ON re-distributes questions (review grid reflects change) |
| S7 | @high | By Category ON with 3 rounds and 3+ categories: all round pills green in review |
| S8 | @high | Badge pills in step 1 show per-category question counts (not round total) |
| S9 | @high | Empty state: no questions → badge pill area shows "No questions imported yet" text |

The 1 nice-to-have scenario:
| S10 | @low | Rounds slider max constrained to unique category count when By Category ON |

Selector dependencies confirmed present:
- `[data-testid="setup-gate"]` — `SetupGate.tsx` line 49
- `getByRole('switch', { name: /by category/i })` — provided by `Toggle` component (WU-5)
- `getByRole('slider', { name: /number of rounds/i })` — existing slider, unchanged
- `getByRole('slider', { name: /questions per round/i })` — conditionally rendered (WU-5)
- Review grid pills: use `locator.filter({ hasText: /Round \d+: \d+ questions?/ })` WITHOUT trailing `$` anchor (anchor breaks when hint span is present)

The E2E test file uses `test.use({ skipSetupDismissal: true })` from the existing auth fixture (confirmed in `setup-overlay.spec.ts`). The `startGameViaWizard` regression test (S5) does NOT set `skipSetupDismissal: true`.

Required update to `e2e/utils/helpers.ts`: in `startGameViaWizard`, before clicking the Start Game button, add:
```typescript
await expect(startButton).toBeEnabled({ timeout: 5000 });
```
This handles the async redistribution window before `canStart` is computed.

Fixture invariant: the sample questions loaded by the E2E fixture must have at least 3 unique categories. Document this as a comment at the top of `round-config.spec.ts`. If the fixture's sample data cannot guarantee this, set `roundsCount = 1` in the fixture for S5 only.

**Acceptance criteria:**
- [ ] `e2e/trivia/round-config.spec.ts` created with all 9 must-have tests
- [ ] Tests use `getByRole()` or `getByText()` — no hardcoded CSS class selectors except `data-testid`
- [ ] Zero `waitForTimeout` calls
- [ ] Review grid regex uses `/Round \d+: \d+ questions?/` without trailing `$` anchor
- [ ] `startGameViaWizard` updated with `toBeEnabled` wait
- [ ] All 9 tests pass against full implementation (WU-1 through WU-7 complete)
- [ ] `pnpm test:e2e:trivia` passes
- [ ] `pnpm test:e2e:summary` shows no new failures

**Tests/verification:**
- [ ] S1 passes: toggle ON by default, QPR slider hidden
- [ ] S2 passes: toggle OFF, QPR slider appears
- [ ] S3 passes: review grid sum matches total
- [ ] S4 passes: game starts in By Category mode
- [ ] S5 passes: `startGameViaWizard` not broken by By Category default
- [ ] S6–S9 pass
- [ ] `pnpm test:e2e` reports no regressions in existing specs

**Risks/rollback:** Review grid regex anchor must not have trailing `$`. `startGameViaWizard` helper change is backward-compatible — adding an enabled wait does not break existing callers. Rollback: delete `round-config.spec.ts`; revert `helpers.ts` `toBeEnabled` wait (though the wait is safe and beneficial for all callers).

**Dependencies:** All of WU-1 through WU-7 must be complete for tests to pass. Tests can be written and committed before WU-7 is merged — they will fail until the feature is fully wired, which is acceptable in a feature branch.

**Recommended agent type:** `frontend-excellence:react-specialist`

---

### Recommended Ticket Breakdown

**Ticket strategy:** One Linear ticket per wave, grouping parallel units into a single ticket where they form a coherent unit of review. Sequential units each get their own ticket because they require separate review gates.

| Ticket | Work Units | Wave | Description | Sizing |
|--------|-----------|------|-------------|--------|
| BEA-A | WU-1 | 1 | Types + `derivePerRoundBreakdown` | Small |
| BEA-B | WU-2 | 1 | `redistributeQuestions` engine + store action + remove feedback writes | Medium |
| BEA-C | WU-3 | 1 | Settings store v4 migration | Small |
| BEA-D | WU-4 | 2 | SetupGate orchestration | Medium |
| BEA-E | WU-5 | 3 | WizardStepSettings redesign | Medium |
| BEA-F | WU-6 | 3 | WizardStepReview adaptation | Small |
| BEA-G | WU-7 | 4 | SetupWizard prop threading | Small |
| BEA-H | WU-8 | 5 | E2E test spec + helpers.ts update | Medium |

**Parallelization waves:**

```
Wave 1: BEA-A || BEA-B || BEA-C   (all parallel, no dependencies)
Wave 2: BEA-D                      (depends on A + B + C)
Wave 3: BEA-E || BEA-F             (parallel, both depend on D)
Wave 4: BEA-G                      (depends on E + F)
Wave 5: BEA-H                      (depends on G)
```

Minimum sequential depth with full parallelism: 5 hops. Maximum concurrency: 3 agents in Wave 1, 2 agents in Wave 3.

---

## D.4 Agent/Task Orchestration Plan

| Agent Slot | Work Unit | Agent Type | Context Needed | Expected Output |
|------------|-----------|------------|----------------|----------------|
| Wave1-A | WU-1 | `frontend-excellence:react-specialist` | phase-4 execution plan, `types/index.ts` current state, `selectors.ts` current state, `lib/categories.ts` exports | Two new interfaces in `types/index.ts`, `derivePerRoundBreakdown` in `selectors.ts`, unit tests |
| Wave1-B | WU-2 | `frontend-excellence:state-manager` | phase-4 execution plan, `questions.ts` full file, `engine.ts`, `game-store.ts`, `helpers.ts` | `redistributeQuestions` function, barrel export, store action, removed `settings.roundsCount` writes, unit tests |
| Wave1-C | WU-3 | `frontend-excellence:state-manager` | phase-4 execution plan, `settings-store.ts` full file | Updated store with `isByCategory`, version 4, migration, unit tests |
| Wave2-D | WU-4 | `frontend-excellence:react-specialist` | phase-4 execution plan, `SetupGate.tsx` full file, WU-1/2/3 completed artifacts | Updated `SetupGate.tsx` with effect, memo, ref, callbacks, new props |
| Wave3-E | WU-5 | `frontend-excellence:react-specialist` | phase-4 execution plan, `WizardStepSettings.tsx` current state, `@joolie-boolie/ui` Toggle API, `lib/categories.ts` exports, WU-4 completed contract | Full `WizardStepSettings.tsx` rewrite, unit tests |
| Wave3-F | WU-6 | `frontend-excellence:react-specialist` | phase-4 execution plan, `WizardStepReview.tsx` full file (especially lines 90–115), `PerRoundBreakdown` type, WU-4 completed contract | Updated `WizardStepReview.tsx` with optional props, unit tests |
| Wave4-G | WU-7 | `frontend-excellence:react-specialist` | phase-4 execution plan, `SetupWizard.tsx` full file, WU-5/6 completed interfaces | Updated `SetupWizard.tsx` with prop threading |
| Wave5-H | WU-8 | `frontend-excellence:react-specialist` | phase-4 execution plan, `e2e/trivia/setup-overlay.spec.ts` (for fixture patterns), `e2e/utils/helpers.ts`, all 9 scenarios from this plan | `round-config.spec.ts`, updated `helpers.ts` |

**Context allocation per agent:** Each agent receives this execution plan section D.3 for its specific work unit plus only the source files it modifies. Agents do not need the full Phase 1–3 artifact history.

**Parallelization strategy:** Wave 1 launches three agents simultaneously with no shared files (zero merge conflict risk). Wave 3 launches two agents simultaneously — they touch different files (`WizardStepSettings.tsx` and `WizardStepReview.tsx`) with zero overlap. All other waves are single-agent sequential.

---

## D.5 Checkpoints Between Milestones

### After Wave 1 (BEA-A + BEA-B + BEA-C merged)
- [ ] `pnpm typecheck` passes with zero new errors
- [ ] `pnpm test:run` passes in `apps/trivia` (new unit tests for `redistributeQuestions`, `derivePerRoundBreakdown`, store migration all green)
- [ ] `pnpm lint` passes (no `react-hooks/exhaustive-deps` warnings from new code)
- [ ] `RoundCategoryEntry` and `PerRoundBreakdown` importable from `@/types`
- [ ] `redistributeQuestions` callable from game store
- [ ] Settings store version reads as 4 in localStorage after page load

### After Wave 2 (BEA-D merged)
- [ ] `pnpm typecheck` passes
- [ ] `SetupGate` renders without errors in development
- [ ] Redistribution effect fires on mount (visible via `console.log` in dev or React DevTools)
- [ ] `perRoundBreakdown` array length equals `roundsCount` (verify via React DevTools)
- [ ] Toggling `isByCategory` via store does not cause infinite re-renders

### After Wave 3 (BEA-E + BEA-F merged)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test:run` passes (WizardStepSettings and WizardStepReview unit tests all green)
- [ ] `WizardStepSettings` renders Toggle with `role="switch"` (verify via browser accessibility inspector)
- [ ] Badge pills visible when By Category ON and questions loaded
- [ ] Amber/green pill coloring in Review step correct for By Count mode (no regression)

### After Wave 4 (BEA-G merged — full feature wire-up)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test:run` passes in `apps/trivia`
- [ ] `pnpm lint` passes
- [ ] End-to-end manual test: navigate through wizard with By Category ON; see badge pills in step 1; see green pills in review step 3; start game
- [ ] End-to-end manual test: toggle By Category OFF; see QPR slider appear; complete game start

### After Wave 5 (BEA-H merged — E2E tests)
- [ ] `pnpm test:e2e:trivia` passes (all 9 new scenarios green)
- [ ] `pnpm test:e2e:summary` shows no regressions in existing specs
- [ ] `pnpm test:e2e` full suite passes

---

## D.6 Branch and Merge Strategy

Each work unit gets its own feature branch following the pattern `feat/BEA-NNN-slug`:

| Ticket | Branch name example |
|--------|-------------------|
| BEA-A | `feat/BEA-A-round-breakdown-types` |
| BEA-B | `feat/BEA-B-redistribute-questions-engine` |
| BEA-C | `feat/BEA-C-settings-store-v4` |
| BEA-D | `feat/BEA-D-setupgate-orchestration` |
| BEA-E | `feat/BEA-E-wizard-step-settings-redesign` |
| BEA-F | `feat/BEA-F-wizard-step-review-adaptation` |
| BEA-G | `feat/BEA-G-setupwizard-threading` |
| BEA-H | `feat/BEA-H-round-config-e2e` |

**Merge order enforced by dependency gates:**
- BEA-A, BEA-B, BEA-C merge to `main` in any order (all are Wave 1, no file conflicts)
- BEA-D only opens PR after BEA-A + BEA-B + BEA-C are merged to `main`
- BEA-E and BEA-F PRs can open in parallel after BEA-D merges; merge in either order (no file conflicts)
- BEA-G PR opens after BEA-E + BEA-F merge; this is the integration PR — it should get the most thorough review
- BEA-H PR opens after BEA-G merges; it is the final verification gate

**PR template:** All PRs must use `.github/PULL_REQUEST_TEMPLATE.md` (Five-Level Explanation). No `--no-verify` on commits — pre-commit hooks (`pnpm lint`, `pnpm typecheck`, `pnpm test:run`) must pass for every commit on every branch.

**Worktrees:** If using worktrees, store each in `.worktrees/wt-BEA-NNN-slug` and run `./scripts/setup-worktree-e2e.sh` in each. PR creation uses `--repo julianken/joolie-boolie`.

---

## Decision Traceability (6 Questions)

This section verifies that every Phase 0 question is fully resolved in this plan.

| Q# | Question | Decision | Location in Plan |
|----|----------|----------|-----------------|
| Q1 | QPR Display — how to show variable QPR when By Category ON | Category badge pills from `perRoundBreakdown[0].categories`, using `getCategoryName()` + `getCategoryBadgeClasses()`. Three render states: By Count (QPR slider), By Category + questions (badge pills), By Category + no questions (empty-state text). | WU-5 |
| Q2 | Trigger — redistribution on every onChange vs value settle | Fire on every `onChange`, no debounce. The `useEffect` dep array triggers immediately on any change to `[questions, roundsCount, questionsPerRound, isByCategory]`. The engine's idempotency makes debouncing unnecessary — same inputs return same reference with no re-render. | WU-4 |
| Q3 | Dependencies — exact useEffect dep array | `[questions, roundsCount, questionsPerRound, isByCategory, redistributeQuestions]`. All five are required. `isByCategory` must be included (switching mode must retrigger redistribution). `redistributeQuestions` is the Zustand action (stable reference, required by `react-hooks/exhaustive-deps`). | WU-4 |
| Q4 | Preset Schema — add `isByCategory` to DB schema or not | NO. Deferred. `isByCategory` remains a local user preference in the settings store only. No database changes, no preset API changes, no schema migration. | D.1 Architecture Decision D8 |
| Q5 | Review Grid — WizardStepReview behavior with variable round sizes | Mode-aware `isMatch` using `perRoundBreakdown[i].isMatch` directly (precomputed in `derivePerRoundBreakdown`). Fallback path for backward compatibility when `perRoundBreakdown` is not passed. Hint span `(expected N)` when `isByCategory && !isMatch && expected > 0`. | WU-6 |
| Q6 | E2E — test scenarios for new behavior | 9 must-have scenarios (S1–S9) + 1 nice-to-have (S10). Covers: default state, toggle interaction, review grid sum, game start, helper regression, re-distribution after toggle, all-green review, per-category badge counts, empty state. | WU-8 |

---

## Criteria Justification

How this plan scores against the Phase 0 evaluation criteria:

| Criterion | Weight | How This Plan Scores |
|-----------|--------|---------------------|
| User clarity (25%) | Highest | Three explicit render states in WizardStepSettings eliminate ambiguity. Badge pills show `CategoryName: N` counts. Empty state gives actionable text. Review grid shows green/amber with `(expected N)` hint. Toggling is instant with no debounce lag. |
| Correctness (20%) | High | Engine idempotency prevents feedback loops. `isMatch` uses `totalCount > 0` guard in By Category mode (no false-green on empty rounds). Zero-questions path returns all `isMatch: false`. `addQuestion`/`updateQuestion` spurious `settings.roundsCount` writes removed. `isByCategory` in dep array ensures mode changes trigger redistribution. |
| Consistency (15%) | High | Follows existing engine patterns (`deepFreeze`, status guard, same-ref return from `questions.ts`). Settings store v4 follows v3 migration pattern exactly. Barrel export pattern for engine module. Prop threading matches established `SetupGate → SetupWizard → Step` hierarchy. `perRoundBreakdown` replaces `perRoundExpected` (eliminates parallel array anti-pattern). |
| Simplicity (15%) | High | One type serves both consumers. No new packages. No DB changes. 10 files modified, 1 new file. The `perRoundExpected: number[]` parallel array from Phase 2 is eliminated. Settings store bump is the only persistent schema change. `derivePerRoundBreakdown` is a pure function with no side effects. |
| Testability (15%) | High | All new computations (`redistributeQuestions`, `derivePerRoundBreakdown`, `WizardStepSettings`) are unit-testable with static inputs. Engine function is fully deterministic. E2E spec covers 9 scenarios. Component tests use accessible role selectors (no brittle CSS classes). Idempotency is directly verifiable via object reference equality. |
| Risk (10%) | Managed | 15 risks identified and mitigated. Four High-severity risks fully resolved in design (RISK-01 through RISK-04). Medium risks either resolved (RISK-05, RISK-08, RISK-09, RISK-14) or accepted with documentation (RISK-06, RISK-07). V6 validation spurious warning in By Category mode acknowledged as follow-on. No blocking risks remain. |

---

*Phase 4 Execution Plan — synthesized 2026-03-05 from Phase 3 artifacts (synthesis-1.md, synthesis-2.md, synthesis-3.md) and Phase 0 problem statement.*

---

The document above is the complete content for `/Users/j/repos/beak-gaming-platform/docs/trivia-round-config-decisions/phase-4/execution-plan.md`. The `phase-4/` directory needs to be created before writing.

**Key file paths referenced in this plan:**

- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/types/index.ts` — add `RoundCategoryEntry` + `PerRoundBreakdown` interfaces
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/questions.ts` — add `redistributeQuestions()`; remove `settings.roundsCount` from `addQuestion` (line 126) and `updateQuestion` (line 183)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/selectors.ts` — add `derivePerRoundBreakdown()` (imported directly, not via barrel)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/engine.ts` — add `redistributeQuestions` to barrel re-export
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/settings-store.ts` — `isByCategory` field, version 4, migration
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/game-store.ts` — `redistributeQuestions` store action
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/SetupGate.tsx` — orchestration hub (effect, memo, ref, callbacks)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/SetupWizard.tsx` — prop threading
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/WizardStepSettings.tsx` — full redesign
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/WizardStepReview.tsx` — mode-aware `isMatch`
- `/Users/j/repos/beak-gaming-platform/e2e/trivia/round-config.spec.ts` — new E2E spec (9 scenarios)
- `/Users/j/repos/beak-gaming-platform/e2e/utils/helpers.ts` — add `toBeEnabled` wait to `startGameViaWizard`