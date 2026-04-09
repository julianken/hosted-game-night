# Phase 3 — Synthesis: Work Unit Specifications
# Trivia Round Configuration Redesign
# Date: 2026-03-05
# Sources: phase-2/iterator-{1-5}-*.md + live codebase inspection
```



1. **WU-1: Types and Derivation Function** — `PerRoundBreakdown` type + `derivePerRoundBreakdown()` pure function. No dependencies. Pure additions, zero risk.

2. **WU-2: Engine Function** — `redistributeQuestions()` in `questions.ts`, export via `engine.ts` barrel, store action in `game-store.ts`. No dependencies (uses existing types). Pure addition to questions module.

3. **WU-3: Settings Store Migration** — Add `isByCategory: boolean` to `SettingsState`, bump version to 4, add migration handler. Depends on WU-1 (type confirms `isByCategory` default). Must complete before WU-4.

4. **WU-4: SetupGate Orchestration** — Add `isByCategory` state, `useEffect` trigger, `useMemo` derivation, wire `perRoundBreakdown` down to SetupWizard. Depends on WU-1, WU-2, WU-3.

5. **WU-5: WizardStepSettings Redesign** — New props interface + three-mode JSX. Depends on WU-1, WU-4 (receives `perRoundBreakdown`).

6. **WU-6: WizardStepReview Adaptation** — Optional `isByCategory` + `perRoundExpected` props, `isMatch` rewrite. Depends on WU-4.

7. **WU-7: SetupWizard Prop Threading** — Adds new props to `SetupWizardProps`, threads to steps 1 and 3. Depends on WU-5, WU-6.

8. **WU-8: E2E Tests** — New `round-config.spec.ts`. Depends on ALL other WUs.




---


---

# Phase 3 — Synthesis: Work Unit Specifications

**Trivia Round Configuration Redesign**
**Date:** 2026-03-05
**Sources:** phase-2/iterator-{1-5}.md + live codebase inspection
**Artifact root:** `docs/trivia-round-config-decisions/`

---

## Codebase State Confirmed

Before writing specifications, the following live files were read and their current state verified:

| File | Current State |
|------|--------------|
| `apps/trivia/src/types/index.ts` | No `PerRoundBreakdown` type. Has `QuestionCategory`, `Question.roundIndex: number`, `Question.category: QuestionCategory`. |
| `apps/trivia/src/lib/game/selectors.ts` | Has `getQuestionsForRound()`, `validateGameSetup()`, `ValidationIssue.roundIndex`. No `derivePerRoundBreakdown`. V6 validation rule hardcodes `questionsPerRound` — must be updated for By Category mode. |
| `apps/trivia/src/lib/game/questions.ts` | Has `importQuestions()` (writes `settings.roundsCount`), `clearQuestions()`, `addQuestion()`. No `redistributeQuestions`. |
| `apps/trivia/src/lib/game/engine.ts` | Barrel: exports from `questions.ts`, `selectors.ts`, etc. No `redistributeQuestions` entry. |
| `apps/trivia/src/stores/settings-store.ts` | Version 3. No `isByCategory` field. `partialize` includes `roundsCount`, `questionsPerRound`, etc. |
| `apps/trivia/src/stores/game-store.ts` | Has `redistributeQuestions` missing from interface and `create()` body. Imports `importQuestionsEngine` from engine barrel. |
| `apps/trivia/src/components/presenter/SetupGate.tsx` | No `useEffect`, no `useMemo`, no `isByCategory`. Reads `questions`, `teams`, `roundsCount`, `questionsPerRound`, `lastTeamSetup`, `updateSetting`. |
| `apps/trivia/src/components/presenter/SetupWizard.tsx` | `SetupWizardProps` has no `isByCategory`, `perRoundBreakdown`, or `perRoundExpected`. Call site to `WizardStepReview` passes existing props only. |
| `apps/trivia/src/components/presenter/WizardStepSettings.tsx` | Two-slider layout only. No toggle, no category badges. Props: `roundsCount`, `questionsPerRound`, `onUpdateSetting`. |
| `apps/trivia/src/components/presenter/WizardStepReview.tsx` | Line 97: `const isMatch = count === questionsPerRound;` — single global target, no mode awareness. |
| `e2e/trivia/` | No `round-config.spec.ts`. Existing: `setup-overlay.spec.ts`, `presenter.spec.ts`, `display.spec.ts`, etc. |

---

## Type Reconciliation Note

Iterator 1 and Iterator 3 propose slightly different shapes for `PerRoundBreakdown.categories`. This is resolved here:

- **Iterator 1** proposes: `categories: RoundCategoryBreakdown[]` where each entry has `{ categoryId, categoryName, color, questionCount }`.
- **Iterator 3** proposes: `categories: { id: QuestionCategory; count: number }[]` with display resolved via `getCategoryBadgeClasses(cat.id)` and `getCategoryName(cat.id)` at render time.
- **Iterator 4** uses `perRoundExpected: number[]` (parallel array) rather than embedding `expectedCount` on each breakdown entry.

**Resolution:** Use Iterator 1's richer embedded shape for `categories` (keeps `WizardStepSettings` a pure leaf with no utility calls), but strip `categoryName` and `color` from the persisted struct — these are derivable at render time. The canonical type defined in WU-1 is:

```typescript
export interface RoundCategoryBreakdown {
  categoryId: QuestionCategory;
  questionCount: number;
}

export interface PerRoundBreakdown {
  roundIndex: number;
  totalCount: number;
  expectedCount: number;
  isMatch: boolean;
  categories: RoundCategoryBreakdown[];
}
```

`WizardStepSettings` calls `getCategoryName(cat.categoryId)` and `getCategoryBadgeClasses(cat.categoryId)` at render. `WizardStepReview` derives `perRoundExpected` from `perRoundBreakdown.map(b => b.expectedCount)` in `SetupWizard` — no parallel-array prop needed.

---

## Work Unit Specifications

---

### Work Unit 1: Types — `PerRoundBreakdown` and `RoundCategoryBreakdown`

**Objective:** Define the canonical shared types that all downstream work units depend on. This is pure addition — zero risk to existing functionality.

**Files/areas touched:**
- `apps/trivia/src/types/index.ts` — add two new interfaces in a new `ROUND BREAKDOWN` section

**Implementation notes:**
- Add after the `GAME SETTINGS` section, before `AUDIENCE SCENE LAYER`.
- Both interfaces go in `types/index.ts` — not a new file. Iterator 1 confirmed this placement alongside existing setup-phase types.
- `RoundCategoryBreakdown` does NOT embed `categoryName` or `color` (derivable at render time via `getCategoryName()` and `getCategoryBadgeClasses()`).
- `PerRoundBreakdown.expectedCount`: in By Count mode this equals `questionsPerRound`; in By Category mode this equals `totalCount` (because the redistribution engine's output IS the target). The `isMatch` precomputation uses `totalCount === expectedCount`.
- `PerRoundBreakdown.isMatch`: precomputed in `derivePerRoundBreakdown()` — never recomputed in render paths.
- Comment block must document the invariants: array length === `roundsCount`, 0-based `roundIndex`, empty rounds included (not omitted).

**Acceptance criteria:**
- [ ] `RoundCategoryBreakdown` interface exported from `types/index.ts` with fields: `categoryId: QuestionCategory`, `questionCount: number`
- [ ] `PerRoundBreakdown` interface exported from `types/index.ts` with fields: `roundIndex: number`, `totalCount: number`, `expectedCount: number`, `isMatch: boolean`, `categories: RoundCategoryBreakdown[]`
- [ ] JSDoc comment on `PerRoundBreakdown` documents the four invariants
- [ ] `pnpm typecheck` passes with no new errors

**Tests/verification:**
- [ ] No unit tests needed — pure type addition with no runtime behavior
- [ ] TypeScript compilation is the only verification required

**Risks/rollback:**
- Risk: None. Pure type addition. Rollback: delete the two added interface blocks.

**Dependencies:** None. This is the root of the dependency tree.

**Recommended agent type:** `code`

---

### Work Unit 2: Engine Function — `redistributeQuestions()`

**Objective:** Implement the `redistributeQuestions()` pure engine function in `questions.ts`, export it via the `engine.ts` barrel, and add the store action wrapper in `game-store.ts`. This is the redistribution engine that assigns `roundIndex` values to questions.

**Files/areas touched:**
- `apps/trivia/src/lib/game/questions.ts` — add `redistributeQuestions()` after `clearQuestions()`
- `apps/trivia/src/lib/game/engine.ts` — add `redistributeQuestions` to the `// Questions` export block
- `apps/trivia/src/stores/game-store.ts` — add `redistributeQuestions` to `GameStore` interface and `create()` body

**Implementation notes:**

Signature:
```typescript
export function redistributeQuestions(
  state: TriviaGameState,
  roundsCount: number,
  questionsPerRound: number,
  mode: 'by_count' | 'by_category'
): TriviaGameState
```

Hard constraints (from Iterator 2, verified against `importQuestions` implementation):
- MUST NOT write `state.settings.roundsCount` — this is what creates the feedback loop (see `importQuestions` lines 72-75 in `questions.ts` which writes `settings.roundsCount`)
- MUST NOT write `state.totalRounds`
- MUST NOT write `state.selectedQuestionIndex`
- MUST return same object reference (`state`) when computed assignments match existing `roundIndex` values (idempotency invariant)
- Status guard: return `state` unchanged if `state.status !== 'setup'`
- Empty guard: return `state` unchanged if `state.questions.length === 0`

By Count algorithm:
```
targetIndex[i] = Math.floor(i / questionsPerRound)
```
No upper clamping by `roundsCount` — overflow rounds surface as amber in the review grid.

By Category algorithm:
1. Discover categories in first-occurrence order (stable, deterministic)
2. Build `category -> roundIndex` map (first occurrence = round 0, second unique = round 1, etc.)
3. Assign each question's `roundIndex` from the map

Idempotency check: `state.questions.every((q, i) => q.roundIndex === targetAssignments[i])` — return `state` if true.

New `TriviaGameState` on change: `{ ...state, questions: newQuestions }` with `deepFreeze()`. Use `deepFreeze` imported from `./helpers` (same pattern as all other engine functions).

Store action wrapper in `game-store.ts`:
```typescript
// Interface addition:
redistributeQuestions: (roundsCount: number, questionsPerRound: number, mode: 'by_count' | 'by_category') => void;

// create() body:
redistributeQuestions: (roundsCount, questionsPerRound, mode) => {
  set((state) => redistributeQuestionsEngine(state, roundsCount, questionsPerRound, mode));
},
```

Import alias in `game-store.ts` must use `redistributeQuestions as redistributeQuestionsEngine` to avoid name collision with the store action.

The `validateGameSetup` V6 rule in `selectors.ts` currently hardcodes `state.settings.questionsPerRound` as the expected count. This rule will fire incorrectly in By Category mode (every round triggers V6 warn because counts won't match the QPR slider). V6 should be suppressed in By Category mode. However, since `validateGameSetup` does not know about `isByCategory` (it's a game-state function, not settings-aware), the correct fix is: V6 validation is a warning-only rule — leave it as-is for now; By Category mode will show spurious V6 warnings in the review step but they will not block game start. A follow-up work unit can pass `isByCategory` to `validateGameSetup` and skip V6 when By Category is ON. Document this known issue in code comments.

**Acceptance criteria:**
- [ ] `redistributeQuestions` function exported from `apps/trivia/src/lib/game/questions.ts`
- [ ] Function exported via `engine.ts` barrel in the `// Questions` export block
- [ ] `redistributeQuestions` action in `GameStore` interface with correct signature
- [ ] Store action wrapper calls engine function via `set((state) => ...)`
- [ ] Idempotency: calling store action twice with same inputs produces zero Zustand re-renders (verified by unit test)
- [ ] By Count: `Math.floor(i / questionsPerRound)` assignment verified
- [ ] By Category: stable first-occurrence order assignment verified
- [ ] Status guard: no-op when `state.status !== 'setup'`
- [ ] Empty guard: no-op when `state.questions.length === 0`
- [ ] Does NOT write `settings.roundsCount`, `totalRounds`, or `selectedQuestionIndex`
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes

**Tests/verification:**
- [ ] Unit test: By Count — 10 questions, QPR=5 → rounds 0,0,0,0,0,1,1,1,1,1
- [ ] Unit test: By Count — 3 questions, QPR=5 → all round 0 (overflow handled, no crash)
- [ ] Unit test: By Category — questions [Science, History, Science, Geography] → [0,1,0,2]
- [ ] Unit test: Idempotency By Count — questions already at correct `roundIndex` returns same object reference
- [ ] Unit test: Idempotency By Category — same questions same order returns same reference
- [ ] Unit test: Status guard — called with `status='playing'` returns same reference
- [ ] Unit test: Empty guard — `questions=[]` returns same reference
- [ ] Unit test: Confirms no write to `settings.roundsCount` (check returned state)
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:**
- Risk: If the idempotency check has an off-by-one or category ordering bug, the SetupGate effect will loop (infinite re-renders). Mitigated by the unit tests above.
- Risk: `redistributeQuestionsEngine` import alias collision with store action name. Mitigated by explicit aliasing in the import.
- Rollback: Remove from `questions.ts`, remove export from `engine.ts`, remove interface entry and create() body entry from `game-store.ts`.

**Dependencies:** WU-1 (uses `PerRoundBreakdown` type in downstream derivation, but the engine function itself only needs `TriviaGameState` and `Question` — already imported). WU-1 can run in parallel with WU-2; WU-2 has no type dependencies on WU-1.

**Recommended agent type:** `code`

---

### Work Unit 3: Settings Store Migration — Add `isByCategory`

**Objective:** Add `isByCategory: boolean` to `SettingsState`, bump the store version to 4, add a migration handler, and persist the field. This enables the toggle state to survive page refresh.

**Files/areas touched:**
- `apps/trivia/src/stores/settings-store.ts` — interface, defaults, partialize, version, migrate

**Implementation notes:**

Current store version: 3 (comment says "removed revealMode (BEA-582)"). New version: 4.

Changes required:

1. Add to `SettingsState` interface:
```typescript
isByCategory: boolean; // default true — distribute questions by category proportion
```

2. Add to `SETTINGS_DEFAULTS`:
```typescript
isByCategory: true,
```

3. Add to `partialize` return:
```typescript
isByCategory: state.isByCategory,
```

4. Bump `version: 3` to `version: 4`.

5. Add migration branch:
```typescript
if (fromVersion <= 3) {
  // v4 added isByCategory. Existing persisted state lacks it.
  // SETTINGS_DEFAULTS will supply the default (true) via Zustand merge.
  return stored;
}
```

The `updateSetting` generic handler already supports any `keyof SettingsState` — no change needed. The `useSettings()` and `useGameSettings()` selector hooks do not need `isByCategory` added (it's read directly from the store in SetupGate via `useSettingsStore((state) => state.isByCategory)`).

`isByCategory` does NOT get added to `SETTINGS_RANGES` — it is a boolean, not a numeric range.

The `validateSetting` function already short-circuits for non-range keys (`if (key in SETTINGS_RANGES)`) — no change needed.

**Acceptance criteria:**
- [ ] `SettingsState.isByCategory: boolean` present in interface
- [ ] `SETTINGS_DEFAULTS.isByCategory = true`
- [ ] `partialize` includes `isByCategory`
- [ ] Store `version` is 4
- [ ] `migrate()` handles `fromVersion <= 3` (returns `stored` as-is; Zustand merge supplies default)
- [ ] `updateSetting('isByCategory', false)` works without TypeScript error
- [ ] Store version bump does not crash existing persisted state (migration returns valid object)
- [ ] `pnpm typecheck` passes

**Tests/verification:**
- [ ] Unit test: `updateSetting('isByCategory', false)` sets `isByCategory` to `false`
- [ ] Unit test: `resetToDefaults()` resets `isByCategory` to `true`
- [ ] Unit test: migration from version 3 — old stored state without `isByCategory` field results in `isByCategory: true` after migration
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:**
- Risk: Version bump without migration handler would reset all user settings (roundsCount, questionsPerRound, etc.) to defaults for existing users. The migration handler MUST return `stored` (not an empty object) for `fromVersion <= 3`.
- Risk: Forgetting to add to `partialize` means the field is not persisted — toggle resets on page load.
- Rollback: Revert `SettingsState`, `SETTINGS_DEFAULTS`, `partialize`, version, and migrate function.

**Dependencies:** WU-1 and WU-2 can run in parallel with WU-3. WU-3 has no dependencies on WU-1 or WU-2 — it is a standalone store change.

**Recommended agent type:** `code`

---

### Work Unit 4: SetupGate Orchestration — Effect, useMemo, Prop Threading

**Objective:** Wire the redistribution engine into `SetupGate`. Add the `useEffect` that triggers `redistributeQuestions` on dependency changes, the `useMemo` that derives `perRoundBreakdown`, and the prop threading down to `SetupWizard`.

**Files/areas touched:**
- `apps/trivia/src/components/presenter/SetupGate.tsx` — add `useEffect`, `useMemo`, `isByCategory` from store, `redistributeQuestions` store action, new props to `SetupWizard`

**Implementation notes:**

This is the most complex work unit — it is the orchestration hub.

New imports needed:
```typescript
import { useState, useCallback, useMemo, useEffect } from 'react';
import { derivePerRoundBreakdown } from '@/lib/game/selectors';
import type { PerRoundBreakdown } from '@/types';
```

New store subscriptions in the component body:
```typescript
const isByCategory = useSettingsStore((state) => state.isByCategory);
const redistributeQuestions = useGameStore((state) => state.redistributeQuestions);
```

Redistribution effect (add after existing `const handleStartGame` callback):
```typescript
useEffect(() => {
  redistributeQuestions(
    roundsCount,
    questionsPerRound,
    isByCategory ? 'by_category' : 'by_count'
  );
}, [questions, roundsCount, questionsPerRound, isByCategory, redistributeQuestions]);
```

The dependency array includes `isByCategory` because switching modes must trigger redistribution immediately. The idempotency contract in `redistributeQuestions` ensures no feedback loop regardless of what is in the dependency array.

Derivation via `useMemo` (add after the effect):
```typescript
const perRoundBreakdown: PerRoundBreakdown[] = useMemo(
  () => derivePerRoundBreakdown(questions, roundsCount, isByCategory, questionsPerRound),
  [questions, roundsCount, isByCategory, questionsPerRound],
);
```

Toggle callback for `WizardStepSettings`:
```typescript
const handleToggleByCategory = useCallback((value: boolean) => {
  updateSetting('isByCategory', value);
}, [updateSetting]);
```

Updated `SetupWizard` call (add new props):
```tsx
<SetupWizard
  questions={questions}
  roundsCount={roundsCount}
  questionsPerRound={questionsPerRound}
  isByCategory={isByCategory}
  perRoundBreakdown={perRoundBreakdown}
  onToggleByCategory={handleToggleByCategory}
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
```

`derivePerRoundBreakdown` must be added to `selectors.ts` (this is the implementation of the pure function from Iterator 1). Full implementation per Iterator 1 spec: O(n) single pass using `Map<number, Question[]>`, then per-round category aggregation with `normalizeCategoryId()`. Place after the existing selector functions.

**Acceptance criteria:**
- [ ] `useEffect` fires when `questions`, `roundsCount`, `questionsPerRound`, or `isByCategory` changes
- [ ] `redistributeQuestions` is called with correct `mode` argument based on `isByCategory`
- [ ] `perRoundBreakdown` is derived via `useMemo` with matching dependency array
- [ ] `perRoundBreakdown` array length equals `roundsCount`
- [ ] `perRoundBreakdown` includes entries for empty rounds (not filtered out)
- [ ] `SetupWizard` receives `isByCategory`, `perRoundBreakdown`, `onToggleByCategory` as new props
- [ ] `derivePerRoundBreakdown` pure function implemented in `selectors.ts`
- [ ] `derivePerRoundBreakdown` handles `questions = []` gracefully (returns `roundsCount` entries with `totalCount=0`)
- [ ] `derivePerRoundBreakdown` calls `normalizeCategoryId()` for legacy category handling
- [ ] No feedback loop: toggling `isByCategory` does not cause infinite re-renders
- [ ] `pnpm typecheck` passes

**Tests/verification:**
- [ ] Unit test: `derivePerRoundBreakdown([], 3, true, 5)` returns 3 entries with `totalCount=0, expectedCount=0, isMatch=true`
- [ ] Unit test: `derivePerRoundBreakdown([], 3, false, 5)` returns 3 entries with `totalCount=0, expectedCount=5, isMatch=false`
- [ ] Unit test: `derivePerRoundBreakdown(questions, 2, false, 5)` — questions with mixed `roundIndex` → correct `totalCount` per round, `expectedCount=5`
- [ ] Unit test: `derivePerRoundBreakdown(questions, 2, true, 5)` — `expectedCount` equals `totalCount` for all rounds
- [ ] Unit test: empty round (round 1 has 0 questions) is present in array with `totalCount=0`
- [ ] Component test or manual verification: toggle `isByCategory` does not cause effect loop (check React DevTools render count)
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:**
- Risk: Feedback loop if `redistributeQuestions` is not truly idempotent. Mitigated by WU-2 idempotency unit tests.
- Risk: `perRoundBreakdown` array reference instability (new array every render) causing cascading re-renders in `WizardStepSettings` and `WizardStepReview`. Mitigated by `useMemo` with exact dependency array.
- Risk: `derivePerRoundBreakdown` in `selectors.ts` — adding it to the same file as `validateGameSetup` means it will be re-exported via `engine.ts` if added to the barrel. It should NOT be added to the engine barrel (it is a UI derivation, not a game engine function). Keep the import as `import { derivePerRoundBreakdown } from '@/lib/game/selectors'` (direct, not via barrel).
- Rollback: Revert `SetupGate.tsx` to its state before this work unit. Remove `derivePerRoundBreakdown` from `selectors.ts`.

**Dependencies:** WU-1 (types), WU-2 (store action), WU-3 (`isByCategory` in settings store). All three must be complete before this unit starts.

**Recommended agent type:** `code`

---

### Work Unit 5: WizardStepSettings Redesign

**Objective:** Replace the two-slider layout with the mode-aware three-state layout: toggle + conditional QPR slider OR category badge pills. Fully presentational — zero store access.

**Files/areas touched:**
- `apps/trivia/src/components/presenter/WizardStepSettings.tsx` — new props interface + full JSX replacement

**Implementation notes:**

New `WizardStepSettingsProps` interface (replaces existing 3-field interface):
```typescript
export interface WizardStepSettingsProps {
  roundsCount: number;
  questionsPerRound: number;
  isByCategory: boolean;
  perRoundBreakdown: PerRoundBreakdown[];
  onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  onToggleByCategory: (isByCategory: boolean) => void;
}
```

`perRoundBreakdown` is always `PerRoundBreakdown[]` — never optional. Empty array is the "no questions" signal.

Three render states:

**State A — By Category OFF:**
Toggle (unchecked) + helper text + Rounds slider + QPR slider. Identical to current behavior except the toggle row is prepended.

**State B — By Category ON, questions loaded:**
Toggle (checked) + helper text + Rounds slider + category badge pills from `perRoundBreakdown[0].categories`. Badge text: `{getCategoryName(cat.categoryId)}: {cat.questionCount}`. Use `getCategoryBadgeClasses(cat.categoryId)` for color classes.

**State C — By Category ON, no questions (empty state):**
Toggle (checked) + helper text + Rounds slider + plain helper text: "No questions imported yet. Import questions in Step 1 to see the breakdown."

Emptiness check: `const hasBreakdown = perRoundBreakdown.length > 0 && perRoundBreakdown[0].categories.length > 0`.

The `Toggle` component from `@joolie-boolie/ui` emits `role="switch"` and `aria-checked` automatically. No additional ARIA attributes needed at the call site.

Pattern B helper text uses `-mt-4` to collapse the `space-y-6` gap (matches `SettingsPanel.tsx` lines 158-160 pattern).

Rounds slider renders in BOTH modes — changing round count while By Category is ON is valid (redistribution engine reacts via the `useEffect` in SetupGate).

`questionsPerRound` prop is kept on the interface even when `isByCategory` is true (the parent always passes the same shape; the component ignores it in By Category mode).

**Acceptance criteria:**
- [ ] `WizardStepSettingsProps` has all 6 fields as specified
- [ ] Toggle renders with `role="switch"` and correct `checked`/`onChange` wiring
- [ ] Rounds slider renders in both modes
- [ ] QPR slider renders only when `isByCategory` is false
- [ ] Category badge pills render when `isByCategory` is true AND `hasBreakdown` is true
- [ ] Empty state helper text renders when `isByCategory` is true AND `hasBreakdown` is false
- [ ] Badge pill uses `getCategoryBadgeClasses(cat.categoryId)` for Tailwind color classes
- [ ] Badge text is `{getCategoryName(cat.categoryId)}: {cat.questionCount}`
- [ ] Component has zero `useStore()` calls, zero `useEffect`, zero `useState`
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes

**Tests/verification:**
- [ ] Unit test: renders two sliders when `isByCategory=false` (Rounds + QPR)
- [ ] Unit test: renders one slider + badge pills when `isByCategory=true` and `perRoundBreakdown` has categories
- [ ] Unit test: renders one slider + empty-state text when `isByCategory=true` and `perRoundBreakdown=[]`
- [ ] Unit test: toggling calls `onToggleByCategory` with opposite value
- [ ] Unit test: `getByRole('switch', { name: /by category/i })` succeeds (confirms ARIA label)
- [ ] Unit test: `getByRole('slider', { name: /questions per round/i })` not found when `isByCategory=true`
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:**
- Risk: `Toggle` import path — must use `import { Toggle } from '@joolie-boolie/ui'` (not a local component).
- Risk: `getCategoryBadgeClasses` import — must be from `@/lib/categories`. Verify this import exists (it does: used in `TriviaApiImporter` and `CategoryFilter`).
- Risk: `perRoundBreakdown[0].categories` access — `perRoundBreakdown[0]` can be undefined if redistribution hasn't run. The `hasBreakdown` check must guard this. Recommended: `const firstRound = perRoundBreakdown[0]; const hasBreakdown = !!firstRound && firstRound.categories.length > 0`.
- Rollback: Revert `WizardStepSettings.tsx` to two-slider layout. The props interface change is backward-incompatible — `SetupWizard` must also revert.

**Dependencies:** WU-1 (types), WU-4 (provides `perRoundBreakdown` and `onToggleByCategory` from SetupGate). WU-4 must be complete before this unit because this component's new props come from SetupGate's additions.

**Recommended agent type:** `code`

---

### Work Unit 6: WizardStepReview Adaptation — Mode-Aware `isMatch`

**Objective:** Update the per-round question grid in `WizardStepReview` to use per-round expected counts in By Category mode instead of the global `questionsPerRound`. Backward-compatible: new props are optional.

**Files/areas touched:**
- `apps/trivia/src/components/presenter/WizardStepReview.tsx` — new optional props, `isMatch` rewrite, hint span

**Implementation notes:**

Add to `WizardStepReviewProps` (both props are optional for backward compatibility):
```typescript
isByCategory?: boolean;
perRoundExpected?: number[];
```

`perRoundExpected` is derived in `SetupWizard` from `perRoundBreakdown.map(b => b.expectedCount)` — it does not come from a separate computation. This eliminates the need for `SetupWizard` to thread `perRoundBreakdown` directly into `WizardStepReview`.

Replace lines 96-97 in `WizardStepReview.tsx` (the `isMatch` derivation inside the grid loop):
```typescript
// Old:
const isMatch = count === questionsPerRound;

// New:
const expected: number = isByCategory
  ? (perRoundExpected?.[i] ?? 0)
  : questionsPerRound;
const isMatch = expected > 0 && count === expected;
```

Add hint span inside the pill `<div>` after the text node:
```tsx
{isByCategory && !isMatch && expected > 0 && (
  <span className="text-xs opacity-70 ml-1">(expected {expected})</span>
)}
```

The `expected > 0` guard prevents the "(expected 0)" hint from showing — that case is already covered by the amber color.

The existing settings summary block (lines 128-134) retains `questionsPerRound` display — this is acceptable because it reflects the configured QPR value. A mode-aware label ("Questions per round: varies") is deferred to a follow-up.

**Acceptance criteria:**
- [ ] `isByCategory?: boolean` and `perRoundExpected?: number[]` added to `WizardStepReviewProps`
- [ ] `expected` derivation uses `perRoundExpected?.[i] ?? 0` when `isByCategory` is true
- [ ] `expected` derivation uses `questionsPerRound` when `isByCategory` is false
- [ ] `isMatch = expected > 0 && count === expected` (replaces `count === questionsPerRound`)
- [ ] Hint span `(expected N)` renders only when `isByCategory && !isMatch && expected > 0`
- [ ] Existing call site in `SetupWizard` compiles without modification (new props are optional)
- [ ] Pill colors and layout unchanged
- [ ] `pnpm typecheck` passes

**Tests/verification:**
- [ ] Unit test: By Count mode (no new props passed) — `isMatch = count === questionsPerRound` (existing behavior)
- [ ] Unit test: By Category mode, round matches `perRoundExpected[i]` → green pill, no hint
- [ ] Unit test: By Category mode, round underfilled → amber pill + "(expected N)" hint
- [ ] Unit test: By Category mode, `expected = 0` round → amber pill, NO "(expected 0)" hint
- [ ] Unit test: `perRoundExpected = []` passed with `isByCategory=true` → all rounds amber, no hint
- [ ] Unit test: `perRoundExpected` shorter than `roundsCount` → missing index falls back to 0 → amber
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:**
- Risk: The `expected > 0 && count === expected` change is subtly different from `count === questionsPerRound` for the existing By Count path. When `questionsPerRound > 0` (always — minimum is 3), the behavior is identical. Confirmed by SETTINGS_RANGES: `questionsPerRound.min = 3`.
- Risk: If `perRoundExpected` is not derived from `perRoundBreakdown.map(b => b.expectedCount)` in `SetupWizard`, the values may be stale. The `SetupWizard` prop threading (WU-7) must derive it correctly.
- Rollback: Revert lines 96-111 of `WizardStepReview.tsx` to the original two-line block. The props change is additive — removing optional props has no impact on callers.

**Dependencies:** WU-1 (types for understanding), WU-4 (SetupGate must produce `perRoundBreakdown` before `SetupWizard` can derive `perRoundExpected` to pass down). However, because the new props are optional and backward-compatible, this work unit can be implemented before WU-7 (SetupWizard threading) — the component will simply not use the new logic until WU-7 connects the wire. Therefore WU-6 can run in parallel with WU-5 after WU-1 is complete.

**Recommended agent type:** `code`

---

### Work Unit 7: SetupWizard Prop Threading

**Objective:** Update `SetupWizardProps` to accept `isByCategory`, `perRoundBreakdown`, and `onToggleByCategory`, then thread these props to `WizardStepSettings` (step 1) and derive + pass `perRoundExpected` to `WizardStepReview` (step 3).

**Files/areas touched:**
- `apps/trivia/src/components/presenter/SetupWizard.tsx` — interface update, function signature, step 1 and step 3 call sites

**Implementation notes:**

Add to `SetupWizardProps`:
```typescript
isByCategory: boolean;
perRoundBreakdown: PerRoundBreakdown[];
onToggleByCategory: (isByCategory: boolean) => void;
```

Add to destructure in `SetupWizard` function signature:
```typescript
isByCategory,
perRoundBreakdown,
onToggleByCategory,
```

Derive `perRoundExpected` inside the component body (no `useMemo` needed — this is O(n) on the breakdown array, which is at most 6 elements):
```typescript
const perRoundExpected = perRoundBreakdown.map(b => b.expectedCount);
```

Step 1 call site (WizardStepSettings):
```tsx
{currentStep === 1 && (
  <WizardStepSettings
    roundsCount={roundsCount}
    questionsPerRound={questionsPerRound}
    isByCategory={isByCategory}
    perRoundBreakdown={perRoundBreakdown}
    onUpdateSetting={onUpdateSetting}
    onToggleByCategory={onToggleByCategory}
  />
)}
```

Step 3 call site (WizardStepReview):
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

Also add `PerRoundBreakdown` to the imports at the top of `SetupWizard.tsx`:
```typescript
import type { PerRoundBreakdown } from '@/types';
```

**Acceptance criteria:**
- [ ] `SetupWizardProps` has `isByCategory: boolean`, `perRoundBreakdown: PerRoundBreakdown[]`, `onToggleByCategory: (isByCategory: boolean) => void`
- [ ] `perRoundExpected` derived as `perRoundBreakdown.map(b => b.expectedCount)` in component body
- [ ] `WizardStepSettings` receives all 6 new props
- [ ] `WizardStepReview` receives `isByCategory` and `perRoundExpected`
- [ ] `SetupGate` call site compiles without error (it passes all new props per WU-4)
- [ ] `pnpm typecheck` passes

**Tests/verification:**
- [ ] TypeScript compilation is the primary verification — all call sites must resolve
- [ ] Manual test or E2E: step 1 (Settings) shows toggle in expected state
- [ ] Manual test or E2E: step 3 (Review) shows correct pill coloring in By Category mode
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:**
- Risk: `SetupGate` passes `perRoundBreakdown` (the rich array) but `SetupWizard` uses it to derive the simpler `perRoundExpected`. If `perRoundBreakdown` reference changes on every render (not memoized in SetupGate), `perRoundExpected` will be a new array on every render, causing `WizardStepReview` to re-render. Mitigated by WU-4's `useMemo` in SetupGate.
- Rollback: Remove the three new props from `SetupWizardProps`. The WU-5 and WU-6 components will still compile (their new props become unused until a future threading pass).

**Dependencies:** WU-4 (SetupGate must pass the new props), WU-5 (WizardStepSettings must accept them), WU-6 (WizardStepReview must accept them). This is the integration unit — all leaf components must be complete first.

**Recommended agent type:** `code`

---

### Work Unit 8: E2E Tests — `round-config.spec.ts`

**Objective:** Create the new E2E spec file with 5 concrete test scenarios. Tests verify the By Category toggle UI, QPR slider visibility, review grid distribution, game start flow, and regression guard for the `startGameViaWizard` helper.

**Files/areas touched:**
- `e2e/trivia/round-config.spec.ts` — new file (content fully specified in Iterator 5)

**Implementation notes:**

File location: `/Users/j/repos/beak-gaming-platform/e2e/trivia/round-config.spec.ts`

Test file is complete and ready-to-paste per Iterator 5. The 5 tests:

1. `@critical` — Toggle is ON by default, Rounds slider visible, QPR slider not visible
2. `@critical` — Toggle OFF reveals QPR slider, Rounds slider stays visible
3. `@high` — Review step shows correct question distribution (sum check with `.toPass()`)
4. `@critical` — Game starts with correct rounds when By Category is ON
5. `@critical` — `startGameViaWizard` helper regression guard (no blocking validation from By Category default)

Selector dependencies the tests rely on (must be verified against implemented components):
- `[data-testid="setup-gate"]` — already present in `SetupGate.tsx` line 49
- `[data-testid="wizard-step-1"]` — already present in `SetupWizard.tsx` step indicators
- `[data-testid="wizard-step-review"]` — already present in `WizardStepReview.tsx` line 41
- `getByRole('switch', { name: /by category/i })` — provided by `Toggle` component (WU-5)
- `getByRole('slider', { name: /number of rounds/i })` — provided by `<Slider label="Number of Rounds">` (exists in current code, unchanged)
- `getByRole('slider', { name: /questions per round/i })` — provided by `<Slider label="Questions Per Round">` (conditionally rendered in WU-5)
- `/\d+ questions? loaded/i` — `WizardStepQuestions` count banner (must verify this text exists)
- `/^Round \d+: \d+ questions?$/` — `WizardStepReview` per-round grid text (format confirmed at line 107 of current file)

The tests use `test.use({ skipSetupDismissal: true })` from the existing auth fixture pattern (confirmed in `setup-overlay.spec.ts`).

The `startGameViaWizard` regression guard (Test 9) does NOT set `skipSetupDismissal: true` — it lets the fixture run the helper automatically.

**Acceptance criteria:**
- [ ] `e2e/trivia/round-config.spec.ts` created with all 5 tests
- [ ] All tests use `getByRole()` or `getByText()` — zero hardcoded CSS selectors except `data-testid`
- [ ] Zero `waitForTimeout` calls
- [ ] Tests tagged `@critical` or `@high` as specified
- [ ] Tests pass against the fully implemented feature (all WUs 1-7 complete)
- [ ] `pnpm test:e2e:trivia` passes
- [ ] `pnpm test:e2e:summary` shows no new failures

**Tests/verification:**
- [ ] Test 1 passes: toggle ON by default, QPR slider hidden
- [ ] Test 2 passes: toggle OFF reveals QPR slider
- [ ] Test 3 passes: review grid sum matches total question count
- [ ] Test 4 passes: game starts successfully with By Category mode
- [ ] Test 9 passes: `startGameViaWizard` helper works with new By Category default

**Risks/rollback:**
- Risk: Test 3 `getByText(/^Round \d+: \d+ questions?$/)` regex — the `^` and `$` anchors require the element to contain exactly that text. If `WizardStepReview` renders the hint span `(expected N)` inline in the same text node, the regex will fail. However, Iterator 4's implementation puts the hint in a `<span>` inside the pill `<div>`, so `textContent()` will include the hint. The regex should match the pill `<div>` text, not `textContent()`. Use `locator.filter({ hasText: /Round \d+: \d+ questions?/ })` without anchors if needed. Implementer should verify selector against rendered DOM.
- Risk: Test 5 (question count banner) — verify `WizardStepQuestions` renders text matching `/\d+ questions? loaded/i`. If the banner text differs, update the regex.
- Rollback: Delete `e2e/trivia/round-config.spec.ts`. No other files affected.

**Dependencies:** All of WU-1 through WU-7 must be complete before these tests can pass. The tests can be written and committed before WU-7 is complete — they will simply fail until the feature is fully wired.

**Recommended agent type:** `code`

---

## Sequencing Analysis

### What Can Be Parallelized

**Wave 1 (no dependencies, fully parallel):**
- WU-1: Types
- WU-2: Engine function
- WU-3: Settings store migration

These three units have zero interdependencies. WU-2 imports `TriviaGameState` and `Question` from `@/types` (already exists) — it does not need WU-1's new types. WU-3 is purely within `settings-store.ts`.

**Wave 2 (depends on Wave 1, one blocking prerequisite):**
- WU-4: SetupGate orchestration (requires WU-1 + WU-2 + WU-3)

WU-4 is the single blocking unit in Wave 2 — all three Wave 1 units must complete before it starts.

**Wave 3 (depends on WU-4, parallel with each other):**
- WU-5: WizardStepSettings redesign (requires WU-1 + WU-4)
- WU-6: WizardStepReview adaptation (requires WU-1 only at type level, but WU-4 for SetupGate to produce the props)

WU-5 and WU-6 can run in parallel with each other once WU-4 is complete. WU-6's new props are optional — it could technically be written before WU-4 completes (the component will compile, just won't receive the new data until WU-7 wires it). However, to avoid merge conflicts on `SetupWizard.tsx`, WU-5 and WU-6 should not run until after WU-4 is merged.

**Wave 4 (integration unit, depends on Wave 3):**
- WU-7: SetupWizard prop threading (requires WU-5 + WU-6)

WU-7 is a pure integration task — it wires the props from SetupGate (WU-4) through to the two leaf components (WU-5, WU-6).

**Wave 5 (verification, depends on all):**
- WU-8: E2E tests (requires WU-1 through WU-7)

### What Must Be Sequential

The critical path is: **WU-1 → WU-4 → WU-7 → WU-8**

All other units branch off this spine. WU-2 and WU-3 feed into WU-4 but their slots in the critical path are parallel. WU-5 and WU-6 feed into WU-7 but are parallel with each other.

### Critical Path

```
WU-1 (types) ──────────────────────────────────────────────────────────────────────────
              \                                                                         \
WU-2 (engine) ─── WU-4 (SetupGate) ─── WU-5 (WizardStepSettings) ─── WU-7 (SetupWizard) ─── WU-8 (E2E)
              /                     \                                /
WU-3 (store) ──                      ── WU-6 (WizardStepReview) ──
```

The critical path has 5 sequential hops: WU-1 → WU-4 → (WU-5 or WU-6) → WU-7 → WU-8.

The longest parallel-execution schedule:

| Wave | Units | Blocking Wait |
|------|-------|--------------|
| 1 | WU-1, WU-2, WU-3 (parallel) | Wait for all 3 to complete |
| 2 | WU-4 (sequential) | Wait for WU-4 to complete |
| 3 | WU-5, WU-6 (parallel) | Wait for both to complete |
| 4 | WU-7 (sequential) | Wait for WU-7 to complete |
| 5 | WU-8 (sequential) | Done |

---

## Recommended Ticket Breakdown

### Parallelization Waves

**Linear ticket BEA-XXX-A (Wave 1a):** Types + Derivation Function
- WU-1: Add `PerRoundBreakdown` and `RoundCategoryBreakdown` to `types/index.ts`
- WU-4 partial: Add `derivePerRoundBreakdown()` to `selectors.ts`
- Rationale: The pure derivation function logically pairs with the types it uses. No store or component touches.

**Linear ticket BEA-XXX-B (Wave 1b, parallel with A):** Engine Function + Store Action
- WU-2: `redistributeQuestions()` in `questions.ts`, barrel export, game-store wrapper
- Rationale: Self-contained engine change with comprehensive unit tests.

**Linear ticket BEA-XXX-C (Wave 1c, parallel with A and B):** Settings Store Migration
- WU-3: `isByCategory` field, version 4, migration handler
- Rationale: Isolated store change, no component dependencies.

**Linear ticket BEA-XXX-D (Wave 2, after A + B + C):** SetupGate Orchestration
- WU-4 (remainder): `useEffect`, `useMemo`, toggle callback, updated `SetupWizard` call
- Rationale: Integrates the three Wave 1 deliverables. The gating unit.

**Linear ticket BEA-XXX-E (Wave 3a, after D):** WizardStepSettings Redesign
- WU-5: New props interface, three-mode JSX, category badge pills
- Rationale: Leaf component, fully testable in isolation once WU-4 defines the contract.

**Linear ticket BEA-XXX-F (Wave 3b, parallel with E):** WizardStepReview Adaptation
- WU-6: Optional mode-aware props, `isMatch` rewrite, hint span
- Rationale: Backward-compatible, no risk to existing behavior.

**Linear ticket BEA-XXX-G (Wave 4, after E + F):** SetupWizard Integration
- WU-7: Prop threading, `perRoundExpected` derivation, call site updates
- Rationale: Pure integration — connects the leaf components to the orchestration layer.

**Linear ticket BEA-XXX-H (Wave 5, after G):** E2E Tests
- WU-8: `round-config.spec.ts`, 5 scenarios, selector verification
- Rationale: Verification gate. Must run after the full feature is wired.

### Single-Ticket Alternative (for simpler tracking)

If the team prefers fewer tickets, Wave 1 (A + B + C) can be one ticket because all three are pure additions with no conflicts. The wave structure becomes:

| Ticket | Contents | Parallelizable |
|--------|----------|----------------|
| 1 | WU-1 + WU-2 + WU-3 | Internal parallelism (separate files) |
| 2 | WU-4 | Sequential after ticket 1 |
| 3 | WU-5 + WU-6 | Internal parallelism (separate files) |
| 4 | WU-7 + WU-8 | Sequential after ticket 3 |

4 tickets total, 4 sequential merges.

---

## Known Issues and Follow-Up Items

**V6 validation rule in By Category mode:** `validateGameSetup` V6 fires a warning whenever `actual !== questionsPerRound && actual > 0`. In By Category mode, every round will have a different question count from `questionsPerRound`, so V6 will generate spurious warnings. These are `warn` severity (not `block`) — they will not prevent game start, but they will show in the validation issues list. A follow-up is to pass `isByCategory` to `validateGameSetup` and skip V6 when By Category is active.

**Settings summary in WizardStepReview:** Currently shows `questionsPerRound` value even in By Category mode. A follow-up should render "Questions per round: varies" when `isByCategory` is true.

**`startGameViaWizard` helper:** The E2E helper skips the Settings step (goes directly to Teams and Review). The By Category default (ON) must auto-distribute questions without manual intervention. This is guaranteed by the `useEffect` in SetupGate, which runs redistribution on mount. The WU-8 Test 9 guards this contract.

**SettingsPanel (non-wizard):** The `SettingsPanel.tsx` component (used outside the wizard flow) does not expose the By Category toggle. This is explicitly deferred — see Phase 0 packet and Phase 1 area-3. A separate follow-up ticket is needed.

**Preset schema (Q4):** `isByCategory` is NOT added to the preset schema. This decision is final per Phase 1 area-3. Presets will load with the current `isByCategory` setting in the store, not the setting at the time the preset was saved.

---

*Phase 3 Synthesis — 2026-03-05*
*All specifications derived from phase-2/iterator-{1-5}-*.md and live codebase state.*

---

I notice I cannot write files directly. Let me present the complete output as the response — the user will need to save it. But wait, let me re-read the task — it says "Write output to" which implies I should write it. Let me check if I have missed a write tool.


---

I do not have a write-file tool in this session. The complete document content is below — save it to `/Users/j/repos/beak-gaming-platform/docs/trivia-round-config-decisions/phase-3/synthesis-3.md` (create the `phase-3/` directory first with `mkdir -p`).

---

## Key Findings from Codebase Inspection

Before the full document, here are the critical facts confirmed from reading the live source files:

**`settings-store.ts`:** Currently at version 3 (bumped from v2 when `revealMode` was removed). The migration function handles `fromVersion <= 2`. WU-3 must add a `fromVersion <= 3` branch and bump to version 4.

**`selectors.ts` line 97:** Current `isMatch` formula is `count === questionsPerRound` — single global target. WU-6 replaces this with the two-line mode-aware derivation.

**`questions.ts`:** `importQuestions()` at lines 72-75 writes `settings.roundsCount`. This is the feedback loop source that Iterator 2 documents. `redistributeQuestions()` must never touch `settings.*`.

**`engine.ts` barrel:** Currently exports from `questions.ts` via named export block. WU-2 adds `redistributeQuestions` to this export block.

**`SetupGate.tsx`:** Currently has no `useEffect` or `useMemo`. Imports `useState` and `useCallback` only. WU-4 adds `useMemo` and `useEffect` to the import.

**`SetupWizard.tsx` step 1 call site (lines 178-193 approximately):** `WizardStepSettings` currently receives `roundsCount`, `questionsPerRound`, `onUpdateSetting`. WU-7 adds `isByCategory`, `perRoundBreakdown`, `onToggleByCategory`.

**`WizardStepSettings.tsx`:** Currently 56 lines. WU-5 replaces it with the ~90-line three-mode layout.

**`e2e/trivia/`:** No `round-config.spec.ts` exists. Eight other spec files exist. WU-8 adds the ninth.

---

# Phase 3 — Synthesis: Work Unit Specifications

**Trivia Round Configuration Redesign**
**Date:** 2026-03-05
**Sources:** `phase-2/iterator-{1-5}-*.md` + live codebase inspection at revision `bccb8a98`
**Artifact root:** `docs/trivia-round-config-decisions/`

---

## Type Reconciliation (Pre-Synthesis Decision)

Iterator 1 proposes `categories: RoundCategoryBreakdown[]` with `{ categoryId, categoryName, color, questionCount }`. Iterator 3 proposes `categories: { id, count }[]` with display resolved at render time. Iterator 4 uses a parallel `perRoundExpected: number[]` array.

**Resolution adopted in this synthesis:**

```typescript
// Canonical shape — types/index.ts
export interface RoundCategoryBreakdown {
  categoryId: QuestionCategory;
  questionCount: number;
  // categoryName and color are NOT stored — derived at render via getCategoryName() / getCategoryBadgeClasses()
}

export interface PerRoundBreakdown {
  roundIndex: number;
  totalCount: number;
  expectedCount: number;
  isMatch: boolean;
  categories: RoundCategoryBreakdown[];
}
```

`perRoundExpected: number[]` is derived inside `SetupWizard` as `perRoundBreakdown.map(b => b.expectedCount)` — no parallel array stored separately. This is simpler than Iterator 4's approach while achieving the same result.

---

## Work Unit 1 — Types: `PerRoundBreakdown` and `RoundCategoryBreakdown`

**Objective:** Define the canonical shared types that anchor the entire feature. Pure type addition — zero runtime behavior, zero risk.

**Files/areas touched:**
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/types/index.ts` — add two new interfaces in a new `// ROUND BREAKDOWN` section

**Implementation notes:**
- Place the new section after the `// CONSTANTS` section (line ~69), before `// CORE TYPES`.
- Both interfaces in `types/index.ts` — not a new file. Confirmed placement by Iterator 1 section 2.
- `RoundCategoryBreakdown` omits `categoryName` and `color` — those are rendering concerns resolved via `getCategoryName()` and `getCategoryBadgeClasses()` at call sites.
- `PerRoundBreakdown.expectedCount`: equals `questionsPerRound` in By Count mode; equals `totalCount` in By Category mode (the engine's output is the target).
- `PerRoundBreakdown.isMatch` is precomputed in `derivePerRoundBreakdown()` — not recomputed in render paths.
- JSDoc on `PerRoundBreakdown` must document four invariants: array length === `roundsCount`, 0-based sequential `roundIndex`, empty rounds are included (never omitted), `isMatch` is precomputed.

**Acceptance criteria:**
- [ ] `RoundCategoryBreakdown` interface exported from `types/index.ts`: `categoryId: QuestionCategory`, `questionCount: number`
- [ ] `PerRoundBreakdown` interface exported from `types/index.ts`: `roundIndex: number`, `totalCount: number`, `expectedCount: number`, `isMatch: boolean`, `categories: RoundCategoryBreakdown[]`
- [ ] JSDoc comment documents the four invariants
- [ ] `pnpm typecheck` passes with zero new errors

**Tests/verification:**
- [ ] TypeScript compilation is the only required verification (pure type addition)

**Risks/rollback:** None. Delete the two interface blocks to rollback.

**Dependencies:** None. This is the dependency tree root.

**Recommended agent type:** `code`

---

## Work Unit 2 — Engine: `redistributeQuestions()`

**Objective:** Implement the redistribution engine function, wire it into the engine barrel, and add the store action wrapper. The idempotency contract is the feature's feedback-loop safety net.

**Files/areas touched:**
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/questions.ts` — add function after `clearQuestions()`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/engine.ts` — add to `// Questions` export block
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/game-store.ts` — add to `GameStore` interface and `create()` body

**Implementation notes:**

Signature:
```typescript
export function redistributeQuestions(
  state: TriviaGameState,
  roundsCount: number,
  questionsPerRound: number,
  mode: 'by_count' | 'by_category'
): TriviaGameState
```

Hard constraints verified against `importQuestions()` (lines 43-77 of `questions.ts`):
- MUST NOT write `state.settings.roundsCount` (the feedback loop source — `importQuestions` writes it at line 72)
- MUST NOT write `state.totalRounds`
- MUST NOT write `state.selectedQuestionIndex`
- MUST return same object reference when computed assignments equal existing `roundIndex` values

Guards:
- `if (state.status !== 'setup') return state`
- `if (state.questions.length === 0) return state`

By Count: `targetIndex[i] = Math.floor(i / questionsPerRound)`. No upper clamp — overflow surfaces in review grid.

By Category: first-occurrence discovery → `category -> roundIndex` map → assign per question. Stable order is critical for idempotency.

Idempotency check: `state.questions.every((q, i) => q.roundIndex === targetAssignments[i])` — return `state` (same reference) if true.

On change: `deepFreeze({ ...state, questions: newQuestions })` — only `questions` field changes.

Store action import alias: `import { redistributeQuestions as redistributeQuestionsEngine } from '@/lib/game/engine'` to avoid name collision with the store action method.

Note on V6 validation: `validateGameSetup` V6 rule (lines 77-91 of `selectors.ts`) will fire spurious warnings in By Category mode because each round's question count will differ from `questionsPerRound`. V6 is `warn` severity only — it does not block game start. Document this as a known follow-up item; do not change `validateGameSetup` in this work unit.

**Acceptance criteria:**
- [ ] `redistributeQuestions` exported from `questions.ts`
- [ ] Added to `engine.ts` barrel `// Questions` export block
- [ ] `GameStore` interface has `redistributeQuestions: (roundsCount: number, questionsPerRound: number, mode: 'by_count' | 'by_category') => void`
- [ ] Store `create()` body has the action wrapper
- [ ] Idempotent: second call with same inputs returns same object reference
- [ ] Does not write `settings.roundsCount`, `totalRounds`, or `selectedQuestionIndex`
- [ ] Status guard works
- [ ] Empty questions guard works
- [ ] `pnpm typecheck` and `pnpm lint` pass

**Tests/verification:**
- [ ] By Count: 10 questions, QPR=5 → indices [0,0,0,0,0,1,1,1,1,1]
- [ ] By Count: 3 questions, QPR=5 → all index 0 (no crash)
- [ ] By Category: [Science, History, Science, Geography] → [0,1,0,2]
- [ ] Idempotency By Count: pre-assigned questions → same object reference returned
- [ ] Idempotency By Category: same array same order → same object reference returned
- [ ] Status guard: `status='playing'` → same reference
- [ ] Empty guard: `questions=[]` → same reference
- [ ] Returned state has no mutation of `settings.roundsCount`
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:**
- Risk: Feedback loop if idempotency check has a bug. Mitigated by unit tests. Monitor with React DevTools if needed.
- Risk: `as redistributeQuestionsEngine` alias omission causes name collision. Catch at typecheck.
- Rollback: Remove from `questions.ts`, remove from `engine.ts` barrel, remove from `game-store.ts` interface and body.

**Dependencies:** WU-1 can run in parallel (WU-2 uses existing `TriviaGameState` and `Question` types only).

**Recommended agent type:** `code`

---

## Work Unit 3 — Settings Store: Add `isByCategory`

**Objective:** Add `isByCategory: boolean` to `SettingsState`, bump version to 4, add a safe migration handler, and persist the field. Enables toggle state to survive page refresh.

**Files/areas touched:**
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/settings-store.ts` — interface, defaults, partialize, version, migrate

**Implementation notes:**

Current version: 3 (bumped from v2, comment: "removed revealMode (BEA-582)"). New version: 4.

Changes:
1. Add `isByCategory: boolean; // default true — distribute questions by category proportion` to `SettingsState` interface
2. Add `isByCategory: true` to `SETTINGS_DEFAULTS`
3. Add `isByCategory: state.isByCategory` to the `partialize` return object
4. Bump `version: 3` to `version: 4`
5. Add migration branch:
```typescript
if (fromVersion <= 3) {
  // v4 added isByCategory. Return stored state as-is.
  // Zustand merges SETTINGS_DEFAULTS for any missing fields.
  return stored;
}
```

`isByCategory` does NOT go into `SETTINGS_RANGES` (boolean, not numeric).

`validateSetting` already short-circuits for non-range keys — no change needed.

`updateSetting('isByCategory', false)` will work via the existing generic handler.

The `useSettings()`, `useGameSettings()`, `useTimerSettings()` hooks do not need updating — `isByCategory` is read directly from `useSettingsStore((state) => state.isByCategory)` in SetupGate.

**Acceptance criteria:**
- [ ] `SettingsState.isByCategory: boolean` in interface
- [ ] `SETTINGS_DEFAULTS.isByCategory = true`
- [ ] `partialize` includes `isByCategory`
- [ ] `version` is 4
- [ ] `migrate()` handles `fromVersion <= 3` without discarding other fields
- [ ] `updateSetting('isByCategory', false)` works at TypeScript level
- [ ] `resetToDefaults()` resets `isByCategory` to `true`
- [ ] `pnpm typecheck` passes

**Tests/verification:**
- [ ] Unit test: `updateSetting('isByCategory', false)` → store has `isByCategory: false`
- [ ] Unit test: `resetToDefaults()` → `isByCategory: true`
- [ ] Unit test: migration from v3 persisted state (no `isByCategory` key) → `isByCategory` defaults to `true` after merge
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:**
- Risk: Version bump without proper migration discards all user settings. The `return stored` in `fromVersion <= 3` branch preserves all existing fields; Zustand fills in `isByCategory: true` as the default.
- Risk: Forgetting `partialize` means the field is not persisted — toggle resets on reload.
- Rollback: Revert interface, defaults, partialize, version, and migrate function to their v3 state.

**Dependencies:** None. Fully parallel with WU-1 and WU-2.

**Recommended agent type:** `code`

---

## Work Unit 4 — SetupGate: Effect, useMemo, and Prop Threading

**Objective:** Add the redistribution `useEffect`, the `useMemo` derivation of `perRoundBreakdown`, and the `onToggleByCategory` callback to `SetupGate`. This is the orchestration hub for the entire feature. Also implements `derivePerRoundBreakdown()` in `selectors.ts`.

**Files/areas touched:**
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/SetupGate.tsx` — new imports, new store subscriptions, effect, memo, callback, updated SetupWizard call
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/selectors.ts` — add `derivePerRoundBreakdown()` pure function

**Implementation notes:**

New imports in `SetupGate.tsx`:
```typescript
import { useState, useCallback, useMemo, useEffect } from 'react';
import { derivePerRoundBreakdown } from '@/lib/game/selectors';
import type { PerRoundBreakdown } from '@/types';
```

New store subscriptions (add to existing subscription block):
```typescript
const isByCategory = useSettingsStore((state) => state.isByCategory);
const redistributeQuestions = useGameStore((state) => state.redistributeQuestions);
```

`updateSetting` is already subscribed — use it for the toggle callback:
```typescript
const handleToggleByCategory = useCallback((value: boolean) => {
  updateSetting('isByCategory', value);
}, [updateSetting]);
```

Redistribution effect:
```typescript
useEffect(() => {
  redistributeQuestions(
    roundsCount,
    questionsPerRound,
    isByCategory ? 'by_category' : 'by_count'
  );
}, [questions, roundsCount, questionsPerRound, isByCategory, redistributeQuestions]);
```

Include `isByCategory` in the dependency array — mode switches must trigger redistribution immediately.

Derivation:
```typescript
const perRoundBreakdown: PerRoundBreakdown[] = useMemo(
  () => derivePerRoundBreakdown(questions, roundsCount, isByCategory, questionsPerRound),
  [questions, roundsCount, isByCategory, questionsPerRound],
);
```

`derivePerRoundBreakdown` in `selectors.ts` — full O(n) implementation per Iterator 1 section 3:
- Single pass using `Map<number, Question[]>` bucketing (avoids O(n*r) repeated filtering)
- `normalizeCategoryId()` from `@/lib/categories` for legacy category handling
- `getCategoryName()` is NOT called here (rendering concern)
- Returns `roundsCount` entries including empty rounds
- In By Category mode: `expectedCount = totalCount` (engine output IS the target)
- In By Count mode: `expectedCount = questionsPerRound`
- `isMatch = totalCount === expectedCount`

`derivePerRoundBreakdown` must NOT be added to the `engine.ts` barrel — it is a UI derivation utility, not a game engine function. Import directly from `@/lib/game/selectors`.

Updated `SetupWizard` call site adds: `isByCategory`, `perRoundBreakdown`, `onToggleByCategory`.

**Acceptance criteria:**
- [ ] `useEffect` fires on `questions`, `roundsCount`, `questionsPerRound`, `isByCategory` changes
- [ ] `redistributeQuestions` called with correct `mode` string
- [ ] `perRoundBreakdown` derived via `useMemo` with matching deps
- [ ] `perRoundBreakdown.length === roundsCount` always
- [ ] `perRoundBreakdown` includes empty rounds (not filtered)
- [ ] `handleToggleByCategory` writes `isByCategory` via `updateSetting`
- [ ] `SetupWizard` receives three new props
- [ ] `derivePerRoundBreakdown` handles `questions=[]` gracefully
- [ ] `derivePerRoundBreakdown` calls `normalizeCategoryId()` for category normalization
- [ ] No infinite re-render loop (idempotency contract from WU-2 is the safety net)
- [ ] `pnpm typecheck` passes

**Tests/verification:**
- [ ] Unit test: `derivePerRoundBreakdown([], 3, true, 5)` → 3 entries, all `totalCount=0, expectedCount=0, isMatch=true`
- [ ] Unit test: `derivePerRoundBreakdown([], 3, false, 5)` → 3 entries, all `totalCount=0, expectedCount=5, isMatch=false`
- [ ] Unit test: populated questions — correct `totalCount` per round, correct `expectedCount` per mode
- [ ] Unit test: empty round in populated set is present with `totalCount=0`
- [ ] Unit test: legacy category normalization — `normalizeCategoryId` called for each question
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:**
- Risk: `perRoundBreakdown` reference instability. Mitigated by `useMemo`.
- Risk: `derivePerRoundBreakdown` added to engine barrel accidentally. Catch in code review — it must only be importable from `@/lib/game/selectors`.
- Risk: `redistributeQuestions` not found in `useGameStore` if WU-2 not yet merged. Resolve with strict merge ordering.
- Rollback: Revert `SetupGate.tsx` to pre-WU-4 state. Remove `derivePerRoundBreakdown` from `selectors.ts`.

**Dependencies:** WU-1 (types), WU-2 (store action), WU-3 (`isByCategory` in store). All three must be merged before this unit starts.

**Recommended agent type:** `code`

---

## Work Unit 5 — WizardStepSettings: Three-Mode Redesign

**Objective:** Replace the two-slider layout with the mode-aware three-state layout. Fully presentational — zero store access, zero effects, zero local state.

**Files/areas touched:**
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/WizardStepSettings.tsx` — complete replacement of interface and JSX

**Implementation notes:**

New props interface (replaces 3-field interface):
```typescript
export interface WizardStepSettingsProps {
  roundsCount: number;
  questionsPerRound: number;        // always present, used in By Count mode only
  isByCategory: boolean;
  perRoundBreakdown: PerRoundBreakdown[]; // always [] not undefined
  onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  onToggleByCategory: (isByCategory: boolean) => void;
}
```

Emptiness check in component body:
```typescript
const firstRound = perRoundBreakdown[0];
const hasBreakdown = !!firstRound && firstRound.categories.length > 0;
```

Three render states inside the mode-dependent section:
- **By Category OFF**: QPR slider
- **By Category ON + hasBreakdown**: badge pills using `getCategoryBadgeClasses(cat.categoryId)` and `getCategoryName(cat.categoryId)` from `@/lib/categories`
- **By Category ON + !hasBreakdown**: empty-state helper text

Badge pill text format: `{getCategoryName(cat.categoryId)}: {cat.questionCount}`
Badge pill class: `px-2 py-0.5 text-xs font-medium border rounded-full ${getCategoryBadgeClasses(cat.categoryId)}`

Rounds slider renders in BOTH modes (changing round count while By Category is ON is valid).

`questionsPerRound` prop remains on the interface even in By Category mode — stable interface shape regardless of internal mode.

Pattern B helper text uses `-mt-4` to collapse `space-y-6` gap (matches `SettingsPanel.tsx` TTS toggle pattern).

`Toggle` from `@joolie-boolie/ui` emits `role="switch"` and `aria-checked` automatically — no additional ARIA at call site.

**Acceptance criteria:**
- [ ] Interface has all 6 props as specified
- [ ] `Toggle` renders with `role="switch"`, label matching `/by category/i`
- [ ] Rounds slider renders in both modes
- [ ] QPR slider renders only when `isByCategory=false`
- [ ] Badge pills render when `isByCategory=true` and `hasBreakdown=true`
- [ ] Empty-state text renders when `isByCategory=true` and `hasBreakdown=false`
- [ ] Badge pill uses `getCategoryBadgeClasses()` and `getCategoryName()` from `@/lib/categories`
- [ ] Zero `use*Store()` calls in component
- [ ] Zero `useEffect`, zero `useState` in component
- [ ] `pnpm typecheck` and `pnpm lint` pass

**Tests/verification:**
- [ ] Unit test: `isByCategory=false` → two sliders rendered
- [ ] Unit test: `isByCategory=true, perRoundBreakdown=[]` → one slider + empty-state text, no QPR slider
- [ ] Unit test: `isByCategory=true, perRoundBreakdown=[{ categories: [...] }]` → one slider + badge pills, no QPR slider
- [ ] Unit test: `getByRole('switch', { name: /by category/i })` resolves
- [ ] Unit test: `getByRole('slider', { name: /questions per round/i })` not found when `isByCategory=true`
- [ ] Unit test: toggling calls `onToggleByCategory` with negated current value
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:**
- Risk: `Toggle` import — must be `import { Toggle } from '@joolie-boolie/ui'`. Verify package exports toggle.
- Risk: `getCategoryBadgeClasses` import — `import { getCategoryBadgeClasses, getCategoryName } from '@/lib/categories'`. Confirmed this import is used in `TriviaApiImporter.tsx` and `CategoryFilter.tsx`.
- Risk: `perRoundBreakdown[0]` access without null guard. Mitigated by the `!!firstRound` check in `hasBreakdown`.
- Rollback: Revert `WizardStepSettings.tsx` to the 56-line two-slider version.

**Dependencies:** WU-1 (types), WU-4 (SetupGate must be wired to produce and pass `perRoundBreakdown`). WU-5 compiles before WU-4 is complete (the props are defined in types), but the feature does not function end-to-end until WU-7 wires SetupWizard.

**Recommended agent type:** `code`

---

## Work Unit 6 — WizardStepReview: Mode-Aware `isMatch`

**Objective:** Update the per-round question grid to use per-round expected counts in By Category mode. Backward-compatible — new props are optional.

**Files/areas touched:**
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/WizardStepReview.tsx` — new optional props, `isMatch` replacement (lines 96-110), hint span

**Implementation notes:**

Add to `WizardStepReviewProps` (both optional for zero breaking changes):
```typescript
isByCategory?: boolean;
perRoundExpected?: number[];
```

Replace lines 96-97 (inside the `Array.from({ length: roundsCount }, ...)` callback):
```typescript
// Replace:
const isMatch = count === questionsPerRound;

// With:
const expected: number = isByCategory
  ? (perRoundExpected?.[i] ?? 0)
  : questionsPerRound;
const isMatch = expected > 0 && count === expected;
```

Add hint span after the existing text node (line 107), inside the pill `<div>`:
```tsx
{isByCategory && !isMatch && expected > 0 && (
  <span className="text-xs opacity-70 ml-1">(expected {expected})</span>
)}
```

The `expected > 0` guard: prevents "(expected 0)" from showing — the amber color alone signals the problem when expected is 0.

The existing call site in `SetupWizard.tsx` (lines 202-213) compiles unchanged because both new props are optional.

The settings summary block (lines 127-134 of the current file) retains `questionsPerRound` display in both modes — mode-aware label is a deferred follow-up.

**Acceptance criteria:**
- [ ] `isByCategory?: boolean` and `perRoundExpected?: number[]` on `WizardStepReviewProps`
- [ ] `expected` derivation: `isByCategory ? (perRoundExpected?.[i] ?? 0) : questionsPerRound`
- [ ] `isMatch = expected > 0 && count === expected`
- [ ] Hint span renders only when `isByCategory && !isMatch && expected > 0`
- [ ] Existing `SetupWizard.tsx` call site compiles without modification
- [ ] Pill color classes unchanged (`bg-success/10 text-success` / `bg-warning/10 text-warning`)
- [ ] `pnpm typecheck` passes

**Tests/verification:**
- [ ] Unit test: By Count (no new props) — `isMatch = count === questionsPerRound` (existing behavior unchanged)
- [ ] Unit test: By Category, count matches `perRoundExpected[i]` → green, no hint
- [ ] Unit test: By Category, count differs → amber, "(expected N)" hint shown
- [ ] Unit test: `expected = 0` → amber, NO "(expected 0)" hint
- [ ] Unit test: `perRoundExpected = []`, `isByCategory=true` → all amber, no hint
- [ ] Unit test: `perRoundExpected` shorter than `roundsCount` → missing index falls back to 0
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:**
- Risk: `expected > 0 && count === expected` vs old `count === questionsPerRound` in By Count mode: behavior is identical since `questionsPerRound >= 3` (SETTINGS_RANGES minimum). No regression.
- Risk: hint span inserted in same node as text content — ensure `textContent()` does not break E2E text matching. Iterator 5 Test 3 uses `.allTextContents()` and a regex without `$` anchor — verify against rendered DOM.
- Rollback: Revert lines 96-111 to the original two-line block. Remove optional props from interface.

**Dependencies:** WU-1 for type awareness. WU-4 must produce `perRoundBreakdown` before WU-7 can derive `perRoundExpected` to pass here. WU-6 can be implemented before WU-7 is complete — the new code path simply won't activate until WU-7 passes the props.

**Recommended agent type:** `code`

---

## Work Unit 7 — SetupWizard: Prop Threading

**Objective:** Update `SetupWizardProps`, thread `isByCategory`, `perRoundBreakdown`, and `onToggleByCategory` to `WizardStepSettings`; derive and pass `perRoundExpected` to `WizardStepReview`. This is the pure integration unit.

**Files/areas touched:**
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/SetupWizard.tsx` — interface, function signature, step 1 call site, step 3 call site, `PerRoundBreakdown` import

**Implementation notes:**

Add to `SetupWizardProps` interface (after the existing `questionsPerRound` line):
```typescript
isByCategory: boolean;
perRoundBreakdown: PerRoundBreakdown[];
onToggleByCategory: (isByCategory: boolean) => void;
```

Add to import:
```typescript
import type { PerRoundBreakdown } from '@/types';
```

Add to function destructure:
```typescript
isByCategory,
perRoundBreakdown,
onToggleByCategory,
```

Derive `perRoundExpected` in component body (no `useMemo` needed — at most 6 elements):
```typescript
const perRoundExpected = perRoundBreakdown.map(b => b.expectedCount);
```

Step 1 call site update (adds three new props to `WizardStepSettings`):
```tsx
isByCategory={isByCategory}
perRoundBreakdown={perRoundBreakdown}
onToggleByCategory={onToggleByCategory}
```

Step 3 call site update (adds two new props to `WizardStepReview`):
```tsx
isByCategory={isByCategory}
perRoundExpected={perRoundExpected}
```

**Acceptance criteria:**
- [ ] `SetupWizardProps` has all three new fields
- [ ] `PerRoundBreakdown` imported from `@/types`
- [ ] `perRoundExpected` derived from `perRoundBreakdown.map(b => b.expectedCount)` in body
- [ ] Step 1 `WizardStepSettings` call receives all 6 props (3 existing + 3 new)
- [ ] Step 3 `WizardStepReview` call receives `isByCategory` and `perRoundExpected`
- [ ] `SetupGate.tsx` call site compiles without modification (it already passes the new props per WU-4)
- [ ] `pnpm typecheck` passes

**Tests/verification:**
- [ ] TypeScript compilation is the primary verification
- [ ] Manual or E2E: step 1 shows toggle in correct state
- [ ] Manual or E2E: step 3 shows correct pill colors in By Category mode
- [ ] `pnpm test:run` passes in `apps/trivia`

**Risks/rollback:**
- Risk: `perRoundBreakdown` reference from SetupGate — if not memoized, `perRoundExpected` will be a new array every render. SetupGate's `useMemo` (WU-4) prevents this.
- Rollback: Remove three props from `SetupWizardProps`, remove from destructure, remove from step 1 and step 3 call sites, remove `perRoundExpected` derivation.

**Dependencies:** WU-4 (SetupGate must pass the new props), WU-5 (WizardStepSettings must accept them), WU-6 (WizardStepReview must accept them). All three must be merged before this unit.

**Recommended agent type:** `code`

---

## Work Unit 8 — E2E Tests: `round-config.spec.ts`

**Objective:** Create the E2E spec file with 5 concrete test scenarios. Verifies the By Category toggle UI, QPR slider visibility, review grid distribution, game start flow, and regression guard for the `startGameViaWizard` helper.

**Files/areas touched:**
- `/Users/j/repos/beak-gaming-platform/e2e/trivia/round-config.spec.ts` — new file (content fully specified in Iterator 5)

**Implementation notes:**

File content is complete and ready-to-paste per `phase-2/iterator-5-e2e-code.md`. Use that document's code verbatim.

Before committing, verify these selector assumptions against the implemented components:

| Selector | Assumption | Verify |
|----------|-----------|--------|
| `getByRole('switch', { name: /by category/i })` | `Toggle` label contains "by category" | Check WU-5 label text |
| `/\d+ questions? loaded/i` | `WizardStepQuestions` count banner uses this text | Check existing component |
| `/^Round \d+: \d+ questions?$/` | Pill `<div>` text without hint span matches this | Check WU-6 rendered DOM |

Test 3 uses `.allTextContents()` and integer parsing — the hint span text `(expected N)` will be included in `textContent()`. The regex `/(\d+) questions?$/` extracts from the end of the string, which still works because the hint is `(expected N)` at the start of any appended text. Verify this does not break the sum calculation.

The two test `describe` blocks use different fixtures:
- `test.describe('Trivia Round Configuration')`: `test.use({ skipSetupDismissal: true })`
- `test.describe('startGameViaWizard Regression')`: default fixture (auto-calls `startGameViaWizard`)

**Acceptance criteria:**
- [ ] `e2e/trivia/round-config.spec.ts` created
- [ ] 5 tests present as specified in Iterator 5
- [ ] All selectors use `getByRole()`, `getByText()`, or `data-testid` (no fragile CSS selectors)
- [ ] Zero `waitForTimeout` calls (all waits are deterministic or `.toPass()`)
- [ ] `@critical` and `@high` tags applied as specified
- [ ] All 5 tests pass against the fully implemented feature
- [ ] `pnpm test:e2e:trivia` passes
- [ ] `pnpm test:e2e:summary` shows no regressions

**Tests/verification:**
- [ ] Test 1: toggle ON by default, QPR slider hidden — passes
- [ ] Test 2: toggle OFF reveals QPR slider — passes
- [ ] Test 3: review grid question count sum equals total — passes
- [ ] Test 4: game starts with By Category ON — passes
- [ ] Test 9: `startGameViaWizard` helper regression guard — passes

**Risks/rollback:**
- Risk: Test 3 hint span in `textContent()` breaks the sum regex. Fix: use `/(\d+) question/` (without `$` anchor) to extract the count before the hint.
- Risk: `WizardStepQuestions` count banner text format differs from the regex. Inspect existing component before writing the test (do not assume).
- Rollback: Delete `e2e/trivia/round-config.spec.ts`. No other files affected.

**Dependencies:** All of WU-1 through WU-7 must be merged and passing before these tests can succeed. The spec file can be created and committed before WU-7 is complete — tests will fail until the feature is fully wired.

**Recommended agent type:** `code`

---

## Sequencing and Parallelization

### Dependency Graph

```
WU-1 (Types) ─────────────────────────────────────────────────────────┐
                                                                        │
WU-2 (Engine) ─────────────────── WU-4 (SetupGate) ─── WU-5 (Step Settings) ─── WU-7 (Wizard) ─── WU-8 (E2E)
                                            │                                           │
WU-3 (Store) ──────────────────────────────┘           WU-6 (Step Review) ─────────────┘
```

### Parallelization Waves

**Wave 1 — Fully parallel (no dependencies):**

| Unit | Files | Can start immediately |
|------|-------|----------------------|
| WU-1 | `types/index.ts` | Yes |
| WU-2 | `questions.ts`, `engine.ts`, `game-store.ts` | Yes |
| WU-3 | `settings-store.ts` | Yes |

All three touch separate files. No merge conflicts possible.

**Wave 2 — Sequential gate (requires all of Wave 1):**

| Unit | Files | Waits for |
|------|-------|-----------|
| WU-4 | `SetupGate.tsx`, `selectors.ts` | WU-1 + WU-2 + WU-3 |

This is the single blocking unit. All three Wave 1 units must be merged before WU-4 starts.

**Wave 3 — Parallel after WU-4:**

| Unit | Files | Waits for |
|------|-------|-----------|
| WU-5 | `WizardStepSettings.tsx` | WU-1 + WU-4 |
| WU-6 | `WizardStepReview.tsx` | WU-1 + WU-4 |

WU-5 and WU-6 touch separate files. No merge conflicts. Both can run simultaneously once WU-4 is merged.

**Wave 4 — Integration (requires Wave 3):**

| Unit | Files | Waits for |
|------|-------|-----------|
| WU-7 | `SetupWizard.tsx` | WU-5 + WU-6 |

**Wave 5 — Verification (requires all prior):**

| Unit | Files | Waits for |
|------|-------|-----------|
| WU-8 | `e2e/trivia/round-config.spec.ts` | WU-7 |

### Critical Path

**5 sequential hops:** WU-1 → WU-4 → WU-5 → WU-7 → WU-8

(WU-2 and WU-3 run in parallel with WU-1; WU-6 runs in parallel with WU-5; the critical path runs through WU-5 because it is the most complex Wave 3 unit.)

### Ticket Breakdown

**8-ticket model (maximum parallelism):**

| Ticket | Label | Contents | Wave |
|--------|-------|----------|------|
| BEA-XXX-A | Types | WU-1 | 1 |
| BEA-XXX-B | Engine | WU-2 | 1 |
| BEA-XXX-C | Store | WU-3 | 1 |
| BEA-XXX-D | SetupGate | WU-4 | 2 |
| BEA-XXX-E | StepSettings | WU-5 | 3 |
| BEA-XXX-F | StepReview | WU-6 | 3 |
| BEA-XXX-G | Wizard | WU-7 | 4 |
| BEA-XXX-H | E2E | WU-8 | 5 |

**4-ticket model (simpler tracking):**

| Ticket | Contents | Note |
|--------|----------|------|
| BEA-XXX-1 | WU-1 + WU-2 + WU-3 | No-conflict parallel; one PR |
| BEA-XXX-2 | WU-4 | Gate unit |
| BEA-XXX-3 | WU-5 + WU-6 | No-conflict parallel; one PR |
| BEA-XXX-4 | WU-7 + WU-8 | Integration + E2E; one PR |

The 4-ticket model is recommended unless separate agents are assigned per unit.

---

## Known Issues and Deferred Items

| Item | Severity | Deferred to |
|------|----------|-------------|
| V6 validation spurious warnings in By Category mode | Low (warn-only, does not block start) | Follow-up ticket |
| Settings summary "questions/round" label not mode-aware | Cosmetic | Follow-up ticket |
| `SettingsPanel.tsx` does not expose By Category toggle | Feature gap | Separate follow-up |
| Preset schema does not persist `isByCategory` | By design (Phase 1 Q4 = NO) | Accepted as permanent |

---

*Phase 3 Synthesis — 2026-03-05*
*Derived from: `phase-2/iterator-{1-5}-*.md`, live codebase inspection at commit `bccb8a98`*
*Next step: Phase 4 Final Plan*

---


**Source files read:**
- `/Users/j/repos/beak-gaming-platform/docs/trivia-round-config-decisions/phase-2/iterator-1-breakdown-type.md`
- `/Users/j/repos/beak-gaming-platform/docs/trivia-round-config-decisions/phase-2/iterator-2-engine-idempotency.md`
- `/Users/j/repos/beak-gaming-platform/docs/trivia-round-config-decisions/phase-2/iterator-3-settings-props.md`
- `/Users/j/repos/beak-gaming-platform/docs/trivia-round-config-decisions/phase-2/iterator-4-review-adaptation.md`
- `/Users/j/repos/beak-gaming-platform/docs/trivia-round-config-decisions/phase-2/iterator-5-e2e-code.md`

**Live source files inspected:**
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/types/index.ts` (lines 1-80)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/settings-store.ts` (full — version 3, no `isByCategory`)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/selectors.ts` (full — V6 validation rule at line 80, `getQuestionsForRound` at line 121)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/questions.ts` (lines 1-130 — `importQuestions` feedback at lines 72-75)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/engine.ts` (full barrel)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/game-store.ts` (lines 1-80 — no `redistributeQuestions`)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/SetupGate.tsx` (lines 1-80 — no `useEffect`/`useMemo`)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/SetupWizard.tsx` (full — step call sites at lines 195-213)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/WizardStepSettings.tsx` (full — 56-line two-slider layout)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/WizardStepReview.tsx` (lines 1-140 — `isMatch` at line 97)

**Output target:**
- `/Users/j/repos/beak-gaming-platform/docs/trivia-round-config-decisions/phase-3/synthesis-3.md`

Note: I do not have a write-file tool in this session. The complete document content is the response body above — create the `phase-3/` directory with `mkdir -p /Users/j/repos/beak-gaming-platform/docs/trivia-round-config-decisions/phase-3` and save the document content starting from the "# Phase 3 — Synthesis: Work Unit Specifications" heading.