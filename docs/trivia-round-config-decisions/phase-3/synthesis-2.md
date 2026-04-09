# Phase 3 — Synthesis 2: Risk and Edge Case Analysis

**Date:** 2026-03-05  
**Phase:** 3 — Synthesize  
**Artifact:** `docs/trivia-round-config-decisions/phase-3/synthesis-2.md`  
**Input sources:** phase-2 iterators 1-5, phase-1 areas 1-5, live codebase inspection

---

## Preamble: Method

Each risk below was derived by cross-referencing the Phase 2 specs against the live codebase state. The codebase currently has **no** `redistributeQuestions`, **no** `isByCategory` anywhere, store version 3, and `WizardStepReview.tsx:97` hardcodes `isMatch = count === questionsPerRound`. Every risk is grounded in at least one specific file and line reference.

Severity scale: **High** = can silently corrupt game state or cause infinite re-renders with no user-visible escape; **Medium** = degraded UX or blocked game start that requires user action to recover; **Low** = confusing but self-correcting or cosmetic.

---

## Risk Register

### RISK-01: Hidden Feedback Sources Beyond `importQuestions`

**Severity:** High  
**Likelihood:** High (will occur on first real use)  
**Category:** Feedback loop

**Description:**  
The engine contract (iterator-2) correctly prohibits `redistributeQuestions` from calling `importQuestions`. However, the analysis only identifies `importQuestions` as the feedback source. Inspection of `/apps/trivia/src/lib/game/questions.ts` reveals two additional functions that also write `settings.roundsCount`:

- `addQuestion` (line 126): writes `settings: { ...state.settings, roundsCount: totalRounds }`
- `updateQuestion` (line 183): writes `settings: { ...state.settings, roundsCount: totalRounds }`

Both are called from the question editor during setup. If a user adds or edits a single question via the question editor while the redistribution effect is active, `addQuestion`/`updateQuestion` will write a new `roundsCount` to `state.settings`. The `questions` array reference also changes. Both changes are in the effect's dependency array (`[questions, roundsCount, questionsPerRound]`). The redistribution effect fires. It calls `redistributeQuestions`, which reads `roundsCount` from the settings **store** (not from `state.settings`) — but the `play/page.tsx` settings-sync effect (lines 108-119) also fires on any `game.status` or settings store change, syncing the settings store into `state.settings`. The two effects can interleave in the same React render cycle.

The actual loop risk here is not infinite re-render (the idempotency guard stops the `questions` reference from changing on a stable distribution), but rather a one-cycle stutter: edit a question → `addQuestion` writes `state.settings.roundsCount` to a value derived from `Math.max(roundIndex)` → settings-sync effect writes settings store's `roundsCount` into `state.settings` again → if these produce different values, two consecutive state updates occur in the same user action.

**Concrete scenario:** User has 15 questions spread across 3 rounds (5 each). They add a new question in the editor with `roundIndex = 5` (which the question editor may assign). `addQuestion` computes `totalRounds = 6` and writes `state.settings.roundsCount = 6`. This triggers the settings-sync effect in `play/page.tsx` which writes the settings store's `roundsCount = 3` back into `state.settings.roundsCount = 3`. Now `state.settings.roundsCount` and the settings store's `roundsCount` are momentarily out of sync, and the redistribution effect fires on the `questions` change with `roundsCount = 3` from the settings store but the newly added question has `roundIndex = 5`.

**Mitigation:** Ensure `addQuestion` and `updateQuestion` do **not** write `settings.roundsCount`. Remove those writes (lines 116-117 and 173-174 of `questions.ts`) — the settings store is the source of truth for `roundsCount`, not `state.settings`. The `play/page.tsx` settings-sync effect already continuously projects the settings store into `state.settings`. Alternatively, if those writes cannot be removed (other consumers depend on them), the redistribution effect must ignore `state.settings.roundsCount` entirely and only read from the settings store directly.

---

### RISK-02: Type Shape Conflict Between Iterator-1 and Iterator-3

**Severity:** High  
**Likelihood:** Certain (will cause TypeScript errors at compile time)  
**Category:** Type system

**Description:**  
Iterator-1 (`iterator-1-breakdown-type.md`) defines `PerRoundBreakdown` as:

```typescript
interface PerRoundBreakdown {
  roundIndex: number;
  totalCount: number;
  expectedCount: number;
  isMatch: boolean;
  categories: RoundCategoryBreakdown[]; // { categoryId, categoryName, color, questionCount }
}
```

Iterator-3 (`iterator-3-settings-props.md`) defines a different `PerRoundBreakdown` at the component level:

```typescript
interface PerRoundBreakdown {
  roundIndex: number;
  count: number;           // vs iterator-1's "totalCount"
  categories: QuestionCategory[]; // vs iterator-1's RoundCategoryBreakdown[]
}
```

These are incompatible types with the same name. `WizardStepSettings` (iterator-3) consumes `perRoundBreakdown[0].categories` as `QuestionCategory[]` and renders `getCategoryName(cat)` where `cat` is a `QuestionCategory` string. But `derivePerRoundBreakdown` (iterator-1) returns `categories: RoundCategoryBreakdown[]` where each entry has `{ categoryId, categoryName, color, questionCount }`.

Furthermore, iterator-3's badge rendering uses `firstRound.count` as the per-badge count (the total for the whole round), while iterator-1 embeds per-category counts inside each `RoundCategoryBreakdown.questionCount`. The badge rendering in iterator-3 would show the same round total for every category badge (e.g., "Science: 12, History: 12, Geography: 12") instead of per-category counts.

**Mitigation:** Adopt iterator-1's `PerRoundBreakdown` shape as the canonical type (it is richer and correctly embeds per-category counts). Update iterator-3's component to consume `perRoundBreakdown[i].categories` as `RoundCategoryBreakdown[]` and render `cat.categoryName: cat.questionCount` for each badge. The `WizardStepSettings` badge rendering section must be rewritten to use the iterator-1 shape. Place the canonical type in `apps/trivia/src/types/index.ts` as iterator-1 specifies — not locally inside `WizardStepSettings.tsx`. Both iterators agree the type belongs in `types/index.ts`; the conflict is only the field names.

---

### RISK-03: `derivePerRoundBreakdown` Is Always-Green in By Category Mode

**Severity:** High  
**Likelihood:** Certain (algorithmic invariant)  
**Category:** Review grid correctness

**Description:**  
In `derivePerRoundBreakdown` (iterator-1, section 3), when `isByCategory = true`:

```typescript
const expectedCount = isByCategory ? totalCount : questionsPerRound;
const isMatch = totalCount === expectedCount;
```

Because `expectedCount = totalCount` always in By Category mode, `isMatch` is always `true` for any non-empty round. This means the review grid will show green pills for every round that has at least one question, regardless of whether the distribution is semantically correct.

This only fails to cover the case where redistribution produced an empty round (some rounds receive 0 questions when there are fewer unique categories than rounds). Those rounds correctly get `totalCount=0`, `expectedCount=0`, `isMatch=true` — which is a false-green. A round with zero questions and zero expected shows green, meaning the review grid cannot warn the user about empty rounds in By Category mode.

The iterator-1 doc acknowledges this: "the real mismatch signal is `totalCount === 0` when `roundsCount > 0` and questions exist." It defers to V3 validation to block the Start button. But the V3 rule in `validateGameSetup` (selectors.ts line 59) checks `state.settings.roundsCount`, not the number of unique categories. If `roundsCount = 5` in the settings store but only 3 unique categories exist, V3 fires 2 blocking issues — but the review grid shows green pills for those empty rounds. This creates a confusing state: green pills with a red "Cannot start" banner.

The iterator-4 review adaptation also has this gap: its `expected > 0` guard (`isMatch = expected > 0 && count === expected`) prevents false-green on 0===0, but only when `perRoundExpected` is the source. In By Category mode, if `perRoundExpected[i]` is 0 (from an empty round), the pill is correctly amber. But iterator-1's `derivePerRoundBreakdown` computes `expectedCount = totalCount` — it would never produce `expectedCount = 0` for a non-empty round. The gap is rounds that are empty: `totalCount = 0`, `expectedCount = 0`, `isMatch = true` (false-green).

**Mitigation:** In `derivePerRoundBreakdown`, when `isByCategory = true` and `totalCount === 0` but `questions.length > 0` (some questions exist but none were assigned to this round), force `isMatch = false`. The corrected logic:

```typescript
const isMatch = isByCategory
  ? (totalCount > 0)                           // empty rounds always false in By Category
  : (totalCount === questionsPerRound);        // By Count uses exact match
```

This way, any round with zero questions is always amber regardless of mode. The "expected 0" false-green is eliminated. The `expectedCount` field can remain as `totalCount` for By Category mode (it is semantically correct: after redistribution, each round's target is its actual count), but `isMatch` must gate on `totalCount > 0` for empty-round detection.

---

### RISK-04: `isByCategory` State Ownership Unresolved — Three Contradictory Approaches

**Severity:** High  
**Likelihood:** Certain (implementer will choose one and break another)  
**Category:** State management

**Description:**  
Three different documents specify different ownership for `isByCategory`:

1. **Iterator-3** (`iterator-3-settings-props.md`, section "Interface decisions"): "isByCategory and onToggleByCategory are separate props, not part of SettingsState. The phase-1 Q4 decision explicitly deferred adding isByCategory to the settings store. For now it is a local UI preference owned by SetupGate."

2. **Iterator-1** (`iterator-1-breakdown-type.md`, section 4): Uses `const isByCategory = useSettingsStore((state) => (state as any).isByCategory ?? true)` — reading from the settings store with a cast, implying it will be added to the store.

3. **Phase-1 packet** ("Q4 (Preset Schema): NO — do not add isByCategory to preset DB table. It's a global preference persisted in localStorage. Preset loads preserve the user's current mode."): describes `isByCategory` as persisted in localStorage, which implies it belongs in the settings store (which uses Zustand `persist`).

The Q4 decision explicitly says "persisted in localStorage" as a positive feature — but localStorage persistence requires Zustand `persist`, which means the settings store. `SetupGate` local state via `useState` is NOT persisted. A user who toggles off By Category, starts a game, then returns to setup will see By Category reset to ON if it is owned by `useState`. This contradicts the "global preference persisted in localStorage" requirement.

**Mitigation:** Add `isByCategory: boolean` to `SettingsState` in `apps/trivia/src/stores/settings-store.ts`, defaulting to `true`, persisted via the existing `partialize` function, and included in the v3→v4 migration. This is the only path that satisfies the "persisted global preference" requirement from the Q4 decision. `SetupGate` then reads `isByCategory` from `useSettingsStore` and passes `onToggleByCategory` as a callback that calls `updateSetting('isByCategory', value)`. The v3→v4 migration is addressed separately in RISK-05.

---

### RISK-05: Settings Store v3→v4 Migration — Four Concrete Breakpoints

**Severity:** Medium  
**Likelihood:** Certain (migration is required to add `isByCategory`)  
**Category:** Migration

**Description:**  
The settings store is currently at version 3 (`version: 3` in `settings-store.ts:117`). Adding `isByCategory` requires bumping to v4 and handling existing users' localStorage. Four specific breakpoints:

**Breakpoint A — `migrate` function gap:** The current `migrate` function only handles `fromVersion <= 2` (strips `revealMode`). A user with v3 localStorage will get `fromVersion = 3` which falls through to `return stored` (line 140). If `isByCategory` is not in their stored object (it isn't — it's a new field), the returned object has no `isByCategory`. Zustand's `persist` merges the migration output with the store's initial state using `Object.assign`, so the default `true` from `SETTINGS_DEFAULTS` would be applied. This is actually safe — but only if `SETTINGS_DEFAULTS` is updated to include `isByCategory: true` and the `partialize` function includes it.

**Breakpoint B — `partialize` must be updated:** The existing `partialize` function (lines 119-128) lists all fields to persist. If `isByCategory` is added to `SettingsState` but not to `partialize`, it will never be written to localStorage and will reset to the default on every page load.

**Breakpoint C — existing unit tests assert exact key lists:** The test at `settings-store.test.ts:253-271` (`'should include all expected settings keys in partialize output'`) explicitly lists 8 keys. Adding `isByCategory` without updating this test causes it to fail — which breaks the pre-commit hook and blocks the commit.

**Breakpoint D — `useSettings` and `useGameSettings` selector hooks:** The `useSettings` hook (lines 151-160) and `useGameSettings` hook (lines 162-167) use `useShallow` with explicit field lists. Neither includes `isByCategory`. Components consuming these hooks will not re-render when `isByCategory` changes. However, `SetupGate` reads directly from `useSettingsStore` (not via these hooks), so this is only a risk for future consumers that use the convenience hooks.

**Mitigation:**
1. Bump `version` to 4.
2. Add `isByCategory: true` to `SETTINGS_DEFAULTS`.
3. Add `isByCategory` to `partialize`.
4. Add `fromVersion === 3` case to `migrate` that sets `isByCategory: true` on the stored object (or rely on the Zustand merge with defaults — document the choice explicitly).
5. Update `settings-store.test.ts:259` to include `'isByCategory'` in the expected keys array.

---

### RISK-06: `validateGameSetup` V3 Rule Uses Wrong Round Count in By Category Mode

**Severity:** Medium  
**Likelihood:** High (triggers whenever categories < roundsCount)  
**Category:** Validation correctness

**Description:**  
The V3 validation rule in `selectors.ts:59-63`:

```typescript
for (let i = 1; i < state.settings.roundsCount; i++) {
  if (getQuestionsForRound(state, i).length === 0) {
    issues.push({ id: 'V3', severity: 'block', ... });
  }
}
```

In By Category mode, `state.settings.roundsCount` is the user's slider value (e.g., 5), not the number of unique categories. If there are only 3 unique categories, redistribution assigns rounds 0-2 with questions and rounds 3-4 are empty. V3 fires 2 blocking issues for rounds 3 and 4.

This is technically correct behavior (empty rounds do block game start) but the user experience is confusing: the user set 5 rounds but only has 3 categories. The blocking message says "Round 4 has no questions" and "Round 5 has no questions" — but the user cannot fix this by adding questions; they must reduce the round count or add questions in new categories.

More critically: the `startGameViaWizard` E2E helper (test 9, iterator-5) skips the Settings step and uses the default `roundsCount = 3` (from `SETTINGS_DEFAULTS`). If the sample questions loaded by the E2E fixture happen to have fewer than 3 unique categories, V3 fires and `canStart = false`. The E2E helper would click Start Game on a disabled button and the test would hang waiting for `gate.waitFor({ state: 'detached' })`.

**Mitigation:**  
In By Category mode, clamp the effective round count for validation to `min(roundsCount, uniqueCategoryCount)`. Specifically, modify `validateGameSetup` (or add a By Category-aware wrapper) to read the effective round count as the number of distinct categories in `state.questions` when `isByCategory` is true. However, `validateGameSetup` currently receives only `TriviaGameState` — it does not receive `isByCategory` (which lives in the settings store, not in game state). Two options:

1. Add `isByCategory` to `GameSettings` (the embedded `state.settings` struct in `TriviaGameState`). This makes it available inside `validateGameSetup` without changing its signature.
2. Add an optional parameter to `validateGameSetup(state, options?: { isByCategory: boolean })` and thread it from `useGameSelectors` in `game-store.ts`.

Option 1 is preferred because it keeps validation self-contained. It requires adding `isByCategory` to `GameSettings` in `types/index.ts` and updating the settings-sync effect in `play/page.tsx` to include `isByCategory` in the `updateSettings` call.

---

### RISK-07: Rounds Slider Active in By Category Mode — Silent Mismatch

**Severity:** Medium  
**Likelihood:** High (intentional UX, but semantically misleading)  
**Category:** User experience / behavioral correctness

**Description:**  
Iterator-3 deliberately keeps the Rounds slider visible in By Category mode: "Changing round count while in category mode is a valid operation (the redistribution engine reacts to roundsCount changes)." However, in By Category mode, `redistributeQuestions` ignores `roundsCount` entirely — the number of rounds is implicitly `uniqueCategoryCount`. The slider has no effect on the actual round assignment.

This creates a silent mismatch: the user drags the Rounds slider to 5 expecting 5 rounds, but the redistribution engine produces 3 rounds (because there are 3 categories). The settings store has `roundsCount = 5`, the game has 3 populated rounds and 2 empty rounds, and V3 validation blocks start.

The review grid would show 5 round pills (because it iterates `Array.from({ length: roundsCount }, ...)`) with rounds 4-5 amber — but the user cannot understand why without reading the amber state as "too few categories for the round count you chose."

**Mitigation:**  
Two options:

1. **Constrain option (recommended):** When `isByCategory` is ON, the Rounds slider max becomes `uniqueCategoryCount`. Dynamically update `SETTINGS_RANGES.roundsCount.max` for the slider to `Math.max(1, uniqueCategoryCount)`. If `uniqueCategoryCount` changes (user imports more questions), the max updates. This prevents the empty-round scenario entirely. The slider still appears (useful for restricting to fewer rounds than categories), but it cannot produce values that lead to empty rounds.

2. **Educational option:** Keep the slider unconstrained but add helper text below the Rounds slider in By Category mode: "N categories found — rounds will follow category groupings." This tells the user what the engine will actually do. Empty rounds remain possible and validation handles them.

---

### RISK-08: Preset Load + Redistribution Guard (`skipNextRedistribution`)

**Severity:** Medium  
**Likelihood:** High (every preset load triggers this)  
**Category:** Race condition

**Description:**  
Area-5 (interactions analysis, section "Constraints Summary", item 4) states: "Preset loads must suppress redistribution. The `skipNextRedistribution` guard in SetupGate is required." However, no implementation specification for this guard exists in any Phase 2 iterator. The guard is referenced but not designed.

The race is: user loads a preset → `updateSetting('roundsCount', preset.rounds_count)` fires → settings store's `roundsCount` changes → redistribution effect dependency `[roundsCount]` changes → effect fires → `redistributeQuestions` runs with the new `roundsCount` on the existing questions → the redistribution overwrites the `roundIndex` values that the preset's questions came with.

This race matters most when the preset's questions are already correctly distributed for the preset's `roundsCount` value. The redistribution idempotency guard should handle this: if the current `roundIndex` assignments are already consistent with `Math.floor(i / questionsPerRound)`, the engine returns the same reference and no update occurs. But if the preset changed `questionsPerRound` too (presets store `questionsPerRound`), the redistribution will run with a different `questionsPerRound` and may rewrite `roundIndex` values.

More critically: preset load changes `roundsCount` and `questionsPerRound` in the settings store nearly simultaneously (two `updateSetting` calls in `PresetSelector.tsx:77-83`). The redistribution effect can fire between these two writes if React does not batch them. In React 19 with automatic batching, both writes are batched in the same event handler — they appear as a single state update. But the first `updateSetting` call alone could produce an intermediate effect run if the calls are in separate event loops.

**Mitigation:**  
Implement `skipNextRedistribution` as a `useRef<boolean>` in SetupGate:

```typescript
const skipNextRedistribution = useRef(false);

// In the redistribution useEffect:
useEffect(() => {
  if (skipNextRedistribution.current) {
    skipNextRedistribution.current = false;
    return;
  }
  // ... redistribution call
}, [questions, roundsCount, questionsPerRound]);

// Expose via callback to preset loader:
const onPresetLoad = useCallback(() => {
  skipNextRedistribution.current = true;
  // ... preset load logic
}, []);
```

The `useRef` is synchronous and does not cause re-renders, making it safe as an escape hatch. The flag is reset to `false` inside the effect's body, ensuring exactly one redistribution is skipped per preset load. React 19 automatic batching means the two `updateSetting` calls in the preset loader fire as one batch → one effect run → one skip. This is the correct interaction.

---

### RISK-09: Empty State Transition — False-Green at First Render

**Severity:** Medium  
**Likelihood:** Certain on initial load  
**Category:** Empty state

**Description:**  
The game store initializes with `questions: []`. Before any import occurs, `derivePerRoundBreakdown` is called in `SetupGate`'s `useMemo`. With `questions = []`, `isByCategory = true`, `roundsCount = 3`:

Iterator-1's derivation creates 3 round buckets, iterates over zero questions (no assignments), and for each of the 3 rounds: `totalCount = 0`, `expectedCount = isByCategory ? 0 : questionsPerRound = 0`, `isMatch = 0 === 0 = true`.

All three round pills in the Review step would show green with the current derivation — even though there are no questions loaded. This is the false-green identified in RISK-03.

Iterator-1 acknowledges this: "When the whole pool is empty every round gets expectedCount=0, so isMatch=true — that is correct because the V1 blocker ('No questions loaded') already covers the zero-pool case." The banner is red/blocking, but the individual round pills are green. This is visually contradictory: red banner + green round pills is confusing.

Additionally, the E2E test 5 (iterator-5) begins by asserting `await expect(questionsBanner).toBeVisible()` to verify questions are loaded. If the test runs before redistribution has populated `roundIndex` values, the `sum` check at line 156 would compute 0 (no questions in any round yet), and the assertion `expect(sum).toBe(totalQuestions)` would fail if `totalQuestions` is extracted from the banner before the redistribution effect runs.

**Mitigation:**  
In `derivePerRoundBreakdown`, when `questions.length === 0`, return a sentinel-empty array `[]` (length 0) rather than `roundsCount` entries with all zeros. The review grid then renders no round pills at all (or a placeholder message), which avoids the false-green / red-banner contradiction. `WizardStepReview` must handle `perRoundBreakdown.length === 0` gracefully by showing the zero-questions empty state instead of the round grid.

Alternatively, preserve the current behavior but change `isMatch` to `false` when `questions.length === 0`, regardless of mode. Add this guard at the top of the derivation:

```typescript
if (questions.length === 0) {
  return Array.from({ length: roundsCount }, (_, roundIndex) => ({
    roundIndex, totalCount: 0, expectedCount: 0, isMatch: false, categories: [],
  }));
}
```

This preserves the grid structure (useful for showing how many rounds are planned) but marks all rounds amber — consistent with the "not ready" state.

---

### RISK-10: `Math.max(...[])` Returning `-Infinity` in `importQuestions`

**Severity:** Medium  
**Likelihood:** Low (defensive — already guarded)  
**Category:** Engine correctness

**Description:**  
`importQuestions` in `questions.ts:63` calls:
```typescript
const maxRoundIndex = Math.max(...newQuestions.map(q => q.roundIndex));
```

For an empty array, `Math.max()` returns `-Infinity`, so `totalRounds = -Infinity + 1 = -Infinity`. This corrupts `state.totalRounds` and `state.settings.roundsCount`.

The function has an early guard: `if (questions.length === 0) return state` (line 51). So when called with an empty array, it returns early. However, in `append` mode, if `state.questions` is also empty and the appended `questions` array is empty, `newQuestions = []` and the guard does not fire (the guard checks the input `questions` parameter, not `newQuestions`).

The redistribution effect has its own guard `if (questions.length === 0) return` (from area-2's recommendation). This prevents `redistributeQuestions` from being called on an empty pool. But `importQuestions` can still be called with a non-empty array that produces `maxRoundIndex = 0` — that is fine. The `-Infinity` bug only triggers in the append mode edge case.

**Mitigation:** Add a guard on `newQuestions.length` in `importQuestions` before the `Math.max` call:

```typescript
if (newQuestions.length === 0) return state;
const maxRoundIndex = Math.max(...newQuestions.map(q => q.roundIndex));
```

This makes the empty-array case safe regardless of mode (`replace` or `append`) and regardless of call site.

---

### RISK-11: Category Discovery Order — Instability on Import Append

**Severity:** Medium  
**Likelihood:** Medium (occurs when user appends a second question set)  
**Category:** Algorithm correctness

**Description:**  
The By Category algorithm (iterator-2, section 6) uses "stable discovery order — first occurrence wins" to assign category → round mappings. With a single import, the order is stable. But the design allows `importQuestions(state, questions, 'append')` mode. If a user imports a second question set that introduces categories before categories already in `state.questions`, the combined array has a different first-occurrence order than either import alone.

Example:
- First import: [History×5, Science×5] → History = round 0, Science = round 1
- Second import (append): [Geography×5, History×3] → Combined array: [History, Science, Geography, History] → Discovery order: History = round 0, Science = round 1, Geography = round 2

But on redistribution, the algorithm scans the combined array in order. Since History was first in the original array, it stays round 0. Geography gets round 2. This is stable. The issue is that the **second import's questions** came in with `roundIndex` values pre-assigned by the import pipeline (which assigned them based on the second import's own array ordering). After append, these questions have stale `roundIndex` values that do not reflect the combined array's category ordering.

Redistribution will fix them — this is the whole purpose of the redistribution engine. But it does so on the next effect cycle (after `questions` reference changes from the append), not synchronously on import. During the brief window between import and redistribution, the `roundIndex` values are inconsistent with the By Category algorithm.

**Mitigation:** This is the intended behavior — redistribution is specifically designed to fix stale `roundIndex` values after any import. The gap exists only during one render cycle, not across a user interaction. Document this in the engine contract: "Stale `roundIndex` values from imported data are corrected by the redistribution effect in `SetupGate` on the next render after `questions` changes." No code change needed — but the implementation comment in `SetupGate`'s redistribution effect should call this out explicitly.

---

### RISK-12: E2E Test 9 Regression — `startGameViaWizard` Helper With By Category Default ON

**Severity:** Medium  
**Likelihood:** Medium (depends on sample question set category diversity)  
**Category:** E2E testing

**Description:**  
Test 9 (iterator-5) verifies that `startGameViaWizard` — the shared E2E helper — still works after By Category is added as the default. The helper skips Steps 0 and 1 (Questions and Settings) and goes directly to Teams → Review → Start. Iterator-5 states: "The By Category default must not introduce blocking validation that requires visiting the Settings step."

The risk: if the sample questions loaded by the fixture have `roundsCount = 3` (the default settings store value) but fewer than 3 unique categories, V3 validation fires and blocks Start Game. The helper would click a disabled button, `gate.waitFor({ state: 'detached' })` would time out, and the test fails.

A secondary risk: the helper's assertion flow assumes the review grid is ready after clicking "Start Game." If redistribution has not completed by the time the helper reaches the Review step (i.e., the redistribution effect fires asynchronously after the Review step renders), the `canStart` value computed by `validateGameSetup` may be stale. In practice, React effects are synchronous relative to renders in test environments with `@testing-library`, but Playwright runs against a real browser where async batching applies.

**Mitigation:**
1. Ensure the E2E fixture's sample question set has at least 3 unique categories. Document this as a fixture invariant in the E2E test file.
2. In the `startGameViaWizard` helper, add an explicit wait for the Start Game button to become enabled before clicking: `await expect(startBtn).toBeEnabled({ timeout: 5000 })`. This handles the async redistribution window.
3. Add a `roundsCount` override to the fixture that sets `roundsCount = 1` before launching the helper if the sample question diversity cannot be guaranteed. Single-round games are always valid regardless of category count.

---

### RISK-13: `perRoundExpected` vs `perRoundBreakdown` Prop Threading Gap

**Severity:** Low  
**Likelihood:** Certain (implementer must choose one prop chain)  
**Category:** Component integration

**Description:**  
Iterator-4 (WizardStepReview adaptation) specifies a `perRoundExpected?: number[]` prop added to `WizardStepReviewProps`. Iterator-1 (breakdown type) specifies that `SetupWizard` receives `perRoundBreakdown: PerRoundBreakdown[]` and that `WizardStepReview` reads `breakdown.expectedCount` per round. These are two different data shapes for the same conceptual data.

If the implementer follows iterator-4 and passes `perRoundExpected: number[]`, they must derive it from `perRoundBreakdown` in `SetupWizard` (an extra `map` operation). If they follow iterator-1 and pass `perRoundBreakdown` directly to `WizardStepReview`, iterator-4's `perRoundExpected` prop becomes unused.

The simplest resolution is to pass `perRoundBreakdown` directly to `WizardStepReview` and drop the `perRoundExpected` prop entirely. The `WizardStepReview` grid already iterates by round index — accessing `perRoundBreakdown[i].expectedCount` is equivalent to `perRoundExpected[i]` but richer (it also has `isMatch`, `totalCount`, and `categories` for potential future use).

**Mitigation:** Drop `perRoundExpected?: number[]` from `WizardStepReviewProps`. Replace it with `perRoundBreakdown?: PerRoundBreakdown[]`. The `isMatch` logic in the review grid reads `perRoundBreakdown?.[i]?.expectedCount ?? 0`. This eliminates one parallel data structure and keeps all round data in one typed object.

---

### RISK-14: `isByCategory` in Effect Dependency Array — Behavior on Toggle

**Severity:** Low  
**Likelihood:** Certain  
**Category:** Effect dependencies

**Description:**  
Iterator-2's effect summary (section 11) notes: "Note: `isByCategory` intentionally in effect body, not dependency array. `isByCategory` changes trigger re-render of SetupGate which re-mounts, not re-runs this effect." This is wrong on two counts.

First, toggling `isByCategory` (a settings store value) does not re-mount `SetupGate` — it causes a re-render. `SetupGate` is not conditionally mounted on `isByCategory`. Second, if `isByCategory` is not in the effect's dependency array but is read inside the effect body, the lint rule `react-hooks/exhaustive-deps` will flag it as a missing dependency — which will cause the pre-commit hook to fail (`pnpm lint` runs ESLint with exhaustive-deps enabled).

If `isByCategory` is added to the dependency array, toggling it triggers redistribution immediately — which is the correct behavior. There is no reason to exclude it. The idempotency guard handles the case where the distribution is already correct for the new mode.

**Mitigation:** Include `isByCategory` in the redistribution effect's dependency array. The correct dependency array is `[questions, roundsCount, questionsPerRound, isByCategory]`. The effect body maps `isByCategory` to the `mode` parameter: `isByCategory ? 'by_category' : 'by_count'`. No special re-mount behavior is needed.

---

### RISK-15: Badge Display Shows Wrong Count Per Category in `WizardStepSettings`

**Severity:** Low  
**Likelihood:** Certain (design bug in iterator-3's badge JSX)  
**Category:** UI correctness

**Description:**  
Iterator-3's badge rendering (section "Badge Pill Detail Note") shows the problem explicitly. The JSX uses `firstRound.count` as the count for every badge, where `firstRound.count` is the total number of questions in round 0 — not the per-category count within round 0. All category badges show the same number.

For example, if round 0 has 12 questions (4 Science, 5 History, 3 Geography), all three badge pills would show "Science: 12, History: 12, Geography: 12" instead of "Science: 4, History: 5, Geography: 3."

Iterator-3 identifies this and recommends Option 1 (per-category counts in the breakdown). But the JSX example provided uses `firstRound.count` — the total — in the badge text.

**Mitigation:** Use `RoundCategoryBreakdown.questionCount` (from the iterator-1 canonical type) for each badge: `{cat.categoryName}: {cat.questionCount}`. This requires the canonical `PerRoundBreakdown` type from iterator-1 where `categories` is `RoundCategoryBreakdown[]` with embedded `questionCount` per category. This is already the mitigation from RISK-02 — both are resolved by adopting iterator-1's type.

---

## Risk Summary Table

| ID | Title | Severity | Likelihood | Category |
|----|-------|----------|-----------|---------|
| RISK-01 | Hidden feedback sources: `addQuestion`/`updateQuestion` | High | High | Feedback loop |
| RISK-02 | `PerRoundBreakdown` type conflict iterator-1 vs iterator-3 | High | Certain | Type system |
| RISK-03 | `derivePerRoundBreakdown` always-green in By Category mode | High | Certain | Review grid |
| RISK-04 | `isByCategory` ownership unresolved across three approaches | High | Certain | State management |
| RISK-05 | Settings store v3→v4 migration — four concrete breakpoints | Medium | Certain | Migration |
| RISK-06 | V3 validation uses wrong round count in By Category mode | Medium | High | Validation |
| RISK-07 | Rounds slider active but semantically ignored in By Category mode | Medium | High | UX / correctness |
| RISK-08 | Preset load + redistribution guard not specified | Medium | High | Race condition |
| RISK-09 | Empty state → false-green review pills at first render | Medium | Certain | Empty state |
| RISK-10 | `Math.max(...[])` returns `-Infinity` in append mode | Medium | Low | Engine |
| RISK-11 | Category discovery instability on append import | Medium | Medium | Algorithm |
| RISK-12 | `startGameViaWizard` E2E helper regression | Medium | Medium | E2E testing |
| RISK-13 | `perRoundExpected` vs `perRoundBreakdown` prop threading gap | Low | Certain | Integration |
| RISK-14 | `isByCategory` missing from effect dependency array | Low | Certain | Effect deps |
| RISK-15 | Badge display shows round total instead of per-category count | Low | Certain | UI |

---

## Mitigation Priority Order

### Must-Fix Before Implementation Begins

These risks have mitigations that change the design decisions, not just the implementation:

1. **RISK-04** (state ownership): Resolve to settings store v4. This anchors all other state-related decisions.
2. **RISK-02** (type conflict): Canonicalize `PerRoundBreakdown` to iterator-1's shape. This anchors all component interfaces.
3. **RISK-03** (always-green): Fix `isMatch` derivation before `derivePerRoundBreakdown` is written. Fixing this after writing will require touching the function and its tests.

### Must-Fix During Implementation

4. **RISK-05** (migration): Add to settings store as part of the same PR that adds `isByCategory`.
5. **RISK-06** (validation): Update `validateGameSetup` or add `isByCategory` to `GameSettings` type as part of the same PR.
6. **RISK-08** (preset guard): Implement `skipNextRedistribution` ref in `SetupGate` alongside the redistribution effect.
7. **RISK-01** (hidden feedback): Audit `addQuestion`/`updateQuestion` in `questions.ts` and remove their `settings.roundsCount` writes.

### Must-Fix Before E2E Pass

8. **RISK-12** (E2E helper): Update `startGameViaWizard` to wait for Start button enabled state.
9. **RISK-14** (dep array): Add `isByCategory` to the dependency array.

### Fix During Review / Polish

10. **RISK-07** (rounds slider UX): Choose and implement one of the two mitigation options.
11. **RISK-09** (empty state pills): Choose between sentinel-empty return and all-false-`isMatch` return from `derivePerRoundBreakdown` for zero-question case.
12. **RISK-13** (prop threading): Drop `perRoundExpected`, pass `perRoundBreakdown` directly.
13. **RISK-15** (badge counts): Fixed automatically when RISK-02 is fixed.

### Defensive / Opportunistic

14. **RISK-10** (`Math.max` guard): Add guard to `importQuestions` append path.
15. **RISK-11** (append instability): Add code comment; no logic change needed.

---

## Cross-Cutting Invariants

Four invariants that must hold across all implementation files:

**I-1: `redistributeQuestions` is the ONLY writer of `questions[].roundIndex`.**  
No other function may assign `roundIndex` after questions enter the store via `importQuestions`. `importQuestions` assigns `roundIndex` based on the import pipeline's pre-assignment. `redistributeQuestions` then owns all subsequent `roundIndex` values.

**I-2: The settings store owns `isByCategory`; the game store does not.**  
`isByCategory` must not appear in `TriviaGameState`, `GameSettings`, or `state.settings`. It is a setup-UI preference, not a game engine parameter. If V3 validation needs it (RISK-06), it should be added to `GameSettings` only as a narrow exception — document this explicitly if chosen.

**I-3: `redistributeQuestions` must return the same object reference when distribution is unchanged.**  
This is the single safety net for the feedback loop. There is no fallback. If the `.every()` check has a bug (wrong comparison, missing `nullish` guard), infinite re-renders result. This function must have exhaustive unit tests covering: empty questions, single question, all questions same category, more rounds than categories, `roundIndex` already correct (should return same ref), `roundIndex` partially stale (should return new ref).

**I-4: `derivePerRoundBreakdown` must not produce `isMatch = true` for any round when `questions.length === 0` or `totalCount === 0` (unless `questions.length === 0` as the special all-empty case covered by V1 validation).**  
The review grid is the user's primary "is my game ready" signal. False-greens undermine trust. The V1 blocker handles the zero-questions case at the banner level, but the individual round pills must also show amber when `totalCount === 0` and any questions exist in the pool.

---

*Phase 3 Synthesis 2 — Risk analysis complete. Ready for Phase 4 final plan.*

Now let me write this to the filesystem. Since I don't have a Write tool, I need to present the document and note that it needs to be written to the filesystem. But looking at the task again — the task says "Write output to: `docs/trivia-round-config-decisions/phase-3/synthesis-2.md`". Let me check if there's a way to accomplish this.

I don't have a bash/write tool in this session. The document is fully composed above. Let me present the complete final response including the document content, and clearly note the file path and content for the user to write.

Actually, re-reading the instructions: I'm a senior software architect. The task is to produce the synthesis. The output document is the deliverable. Let me present it clearly.

---

Here is the complete architecture blueprint for the Phase 3 synthesis. The document content is below — it must be written to `/Users/j/repos/beak-gaming-platform/docs/trivia-round-config-decisions/phase-3/synthesis-2.md` (the `phase-3/` directory does not yet exist and must be created).

---

**File:** `/Users/j/repos/beak-gaming-platform/docs/trivia-round-config-decisions/phase-3/synthesis-2.md`

```markdown
# Phase 3 — Synthesis 2: Risk and Edge Case Analysis

**Date:** 2026-03-05
**Phase:** 3 — Synthesize
**Input sources:** phase-2 iterators 1-5, phase-1 areas 1-5, live codebase inspection

---

## Preamble: Method

Each risk below was derived by cross-referencing the Phase 2 specs against the live codebase. The codebase currently has no `redistributeQuestions`, no `isByCategory` anywhere, settings store at version 3, and `WizardStepReview.tsx:97` hardcodes `isMatch = count === questionsPerRound`. Every risk is grounded in at least one specific file and line reference.

Severity: **High** = can silently corrupt state or cause infinite re-renders with no user-visible escape. **Medium** = degraded UX or blocked game start requiring user action. **Low** = confusing but self-correcting or cosmetic.

---

## Risk Register

### RISK-01: Hidden Feedback Sources Beyond `importQuestions`

**Severity:** High | **Likelihood:** High | **Category:** Feedback loop

The engine contract (iterator-2) identifies `importQuestions` as the sole feedback source and prohibits `redistributeQuestions` from calling it. However, `apps/trivia/src/lib/game/questions.ts` contains two additional functions that also write `settings.roundsCount`:

- `addQuestion` (line 126): writes `settings: { ...state.settings, roundsCount: totalRounds }`
- `updateQuestion` (line 183): writes `settings: { ...state.settings, roundsCount: totalRounds }`

Both are called from the question editor during setup. If a user adds or edits a question while the redistribution effect is active, these functions write a `roundsCount` derived from `Math.max(roundIndex)` into `state.settings`. The settings-sync effect in `play/page.tsx:108-119` then writes the settings store's `roundsCount` back into `state.settings`. If these two values differ (e.g., a new question was imported with `roundIndex = 5` but the user's slider is at 3), two consecutive state updates fire from a single user action, producing visible jitter.

The idempotency guard prevents the full loop — `redistributeQuestions` returning the same reference stops the `questions` selector from producing a new value — but the one-cycle stutter from conflicting `state.settings.roundsCount` writes is real.

**Mitigation:** Remove the `settings.roundsCount` writes from `addQuestion` (lines 116-117) and `updateQuestion` (lines 173-174) in `questions.ts`. The settings store is the source of truth for `roundsCount`. The settings-sync effect in `play/page.tsx` already continuously projects the settings store into `state.settings`, so `state.settings.roundsCount` will stay current without these writes.

---

### RISK-02: `PerRoundBreakdown` Type Conflict Between Iterator-1 and Iterator-3

**Severity:** High | **Likelihood:** Certain | **Category:** Type system

Iterator-1 (`iterator-1-breakdown-type.md`) defines `PerRoundBreakdown` as:

```typescript
interface PerRoundBreakdown {
  roundIndex: number;
  totalCount: number;
  expectedCount: number;
  isMatch: boolean;
  categories: RoundCategoryBreakdown[]; // { categoryId, categoryName, color, questionCount }
}
```

Iterator-3 (`iterator-3-settings-props.md`) defines a different shape at the component level:

```typescript
interface PerRoundBreakdown {
  roundIndex: number;
  count: number;           // conflicts with "totalCount"
  categories: QuestionCategory[]; // conflicts with RoundCategoryBreakdown[]
}
```

These types are incompatible. `WizardStepSettings` (iterator-3) renders `getCategoryName(cat)` where `cat` is a `QuestionCategory` string literal. But `derivePerRoundBreakdown` (iterator-1) returns `categories: RoundCategoryBreakdown[]` where each entry is an object `{ categoryId, categoryName, color, questionCount }`. The component would receive the wrong type and either produce a TypeScript error or render `[object Object]: 12` in each badge pill.

Additionally, iterator-3's badge rendering uses `firstRound.count` as the count for every badge — the round total, not per-category counts. All badges would show the same number.

**Mitigation:** Adopt iterator-1's `PerRoundBreakdown` as the canonical type. Place it in `apps/trivia/src/types/index.ts` as iterator-1 specifies. Update `WizardStepSettings`' badge rendering to consume `RoundCategoryBreakdown[]` using `cat.categoryName: cat.questionCount`. This resolves RISK-15 automatically.

---

### RISK-03: `derivePerRoundBreakdown` Produces False-Green in By Category Mode for Empty Rounds

**Severity:** High | **Likelihood:** Certain | **Category:** Review grid correctness

In iterator-1's `derivePerRoundBreakdown`, when `isByCategory = true`:

```typescript
const expectedCount = isByCategory ? totalCount : questionsPerRound;
const isMatch = totalCount === expectedCount;
```

Because `expectedCount = totalCount` always, `isMatch` is `true` for every round with `totalCount >= 0`. When a round has zero questions (`totalCount = 0`), `expectedCount = 0`, and `isMatch = 0 === 0 = true`. This is false-green: a round with no questions shows a green pill.

Iterator-1 acknowledges this and defers to V1 validation for the zero-pool case. But V1 only fires when `questions.length === 0` (no questions at all). If the user has questions but fewer unique categories than `roundsCount` (e.g., 3 categories, 5 rounds), rounds 4 and 5 are empty. The review grid shows green pills for rounds 4-5 while the status banner shows "Cannot start — 2 issues." This is visually contradictory and misleading.

**Mitigation:** Change `isMatch` logic in `derivePerRoundBreakdown` so that empty rounds are always false in By Category mode:

```typescript
const isMatch = isByCategory
  ? (totalCount > 0)
  : (totalCount === questionsPerRound);
```

Any round with zero questions is always amber, regardless of mode. The V1/V3 validation blockers are the authoritative gate for game start; `isMatch` is only a visual signal and must be conservative (amber rather than green when uncertain).

---

### RISK-04: `isByCategory` State Ownership — Three Contradictory Approaches

**Severity:** High | **Likelihood:** Certain | **Category:** State management

Three Phase 2 documents specify different ownership:

1. **Iterator-3**: "local UI preference owned by SetupGate" via `useState`
2. **Iterator-1**: `useSettingsStore((state) => (state as any).isByCategory ?? true)` — reading from the settings store
3. **Phase-1 packet**: "global preference persisted in localStorage" — which requires Zustand `persist`, i.e., the settings store

`useState` in `SetupGate` is NOT persisted. A user who toggles off By Category, plays a game, then returns to setup will see By Category reset to ON — contradicting the "global preference" requirement. The Q4 decision explicitly frames persistence as a positive: "Preset loads preserve the user's current mode." That preservation only works if the mode survives page reload.

**Mitigation:** Add `isByCategory: boolean` to `SettingsState` in `apps/trivia/src/stores/settings-store.ts`. Default to `true`. Include in `SETTINGS_DEFAULTS`, `partialize`, and the v3→v4 migration. `SetupGate` reads `isByCategory` from `useSettingsStore` and passes `onToggleByCategory` as a callback to `updateSetting('isByCategory', value)`. This is the only approach satisfying the persistence requirement.

---

### RISK-05: Settings Store v3→v4 Migration — Four Concrete Breakpoints

**Severity:** Medium | **Likelihood:** Certain | **Category:** Migration

Adding `isByCategory` to the settings store requires bumping `version` from 3 to 4. Four things break if not handled:

**A — `migrate` function:** The current `migrate` handles `fromVersion <= 2` only. For `fromVersion = 3`, it falls through to `return stored` (line 140 of `settings-store.ts`). Users with v3 localStorage will not have `isByCategory` in their stored object. Zustand's `persist` middleware applies `Object.assign(defaults, migrationResult)` — so the `SETTINGS_DEFAULTS.isByCategory = true` default is applied automatically. This is safe, but must be verified as the intended behavior by explicitly noting it in the `migrate` function rather than relying on implicit merging.

**B — `partialize` omission:** If `isByCategory` is not added to the `partialize` function (lines 119-128), it is never written to localStorage. The setting resets on every page load. This is the most common implementation mistake for Zustand persist stores.

**C — Unit test assertions on exact key lists:** `settings-store.test.ts:253-271` explicitly lists the 8 expected partialize keys. Adding `isByCategory` without updating this test causes a test failure → pre-commit hook failure. Pre-commit runs `pnpm test:run` on changed packages.

**D — `useSettings` hook missing `isByCategory`:** The `useSettings` selector hook (line 151) uses `useShallow` with an explicit field list. Components using this hook will not re-render when `isByCategory` changes. `SetupGate` reads directly from `useSettingsStore` (not via `useSettings`), so this is not an immediate problem — but future consumers of the hook would have stale state.

**Mitigation:**
1. Bump `version` to 4.
2. Add `isByCategory: true` to `SETTINGS_DEFAULTS`.
3. Add `isByCategory` to `partialize`.
4. Add `fromVersion === 3` branch to `migrate` that explicitly sets `isByCategory: true` on the stored object (belt-and-suspenders over the implicit Zustand default merge).
5. Update `settings-store.test.ts:259` to include `'isByCategory'` in the expected keys array.

---

### RISK-06: `validateGameSetup` V3 Rule Reads Wrong Round Count in By Category Mode

**Severity:** Medium | **Likelihood:** High | **Category:** Validation correctness

`selectors.ts:59`:
```typescript
for (let i = 1; i < state.settings.roundsCount; i++) {
```

In By Category mode, `state.settings.roundsCount` is the user's slider value (e.g., 5), not the number of unique categories (e.g., 3). If the user has 3 categories but set 5 rounds, redistribution fills rounds 0-2 and leaves rounds 3-4 empty. V3 fires 2 blocking issues for rounds 3-4. The message "Round 4 has no questions" is technically correct but actionably wrong — the user cannot add more questions to fix it; they must reduce `roundsCount` or add questions in two new categories.

More critically: `validateGameSetup` receives only `TriviaGameState`, which does not include `isByCategory` (it lives in the settings store, not in `state.settings`). The function cannot currently distinguish By Category mode from By Count mode.

**Mitigation:** Add `isByCategory: boolean` to `GameSettings` (`types/index.ts:152-159`). Include it in the settings-sync effect in `play/page.tsx:108-119`. This makes `isByCategory` available inside `validateGameSetup`. Modify V3 to compute the effective round count:

```typescript
const effectiveRoundCount = state.settings.isByCategory
  ? new Set(state.questions.map(q => q.category)).size
  : state.settings.roundsCount;
for (let i = 1; i < effectiveRoundCount; i++) { ... }
```

The V3 message can be improved: "Only N categories found — reduce rounds to N or add questions in new categories."

---

### RISK-07: Rounds Slider Active but Effectively Ignored in By Category Mode

**Severity:** Medium | **Likelihood:** High | **Category:** UX / behavioral correctness

Iterator-3 deliberately renders the Rounds slider in both modes. In By Category mode, the redistribution engine ignores `roundsCount` — the actual round count is `uniqueCategoryCount`. The slider value can produce empty rounds (if `roundsCount > uniqueCategoryCount`) that V3 validation then blocks.

The user drags to 5 rounds expecting 5 rounds of content. They get 3 populated rounds and 2 empty rounds. The "Cannot start" banner references "Round 4" and "Round 5" which have no questions and cannot have questions added without introducing new categories.

**Mitigation — Option 1 (recommended):** Constrain the Rounds slider max to `uniqueCategoryCount` when `isByCategory` is ON. Pass the unique category count as a prop to `WizardStepSettings` and set `max={Math.min(SETTINGS_RANGES.roundsCount.max, uniqueCategoryCount)}` on the slider. This prevents the empty-round scenario entirely while keeping the slider visible and useful for restricting rounds.

**Mitigation — Option 2:** Keep the slider unconstrained. Add helper text: "N categories found — rounds will follow category groupings." Empty rounds remain possible but validation handles them. This is lower effort but requires the user to understand the relationship between categories and rounds.

---

### RISK-08: Preset Load + Redistribution Guard Not Specified

**Severity:** Medium | **Likelihood:** High | **Category:** Race condition

Area-5 (interactions analysis) states "Preset loads must suppress redistribution. The `skipNextRedistribution` guard in SetupGate is required." No Phase 2 iterator specifies how to implement it.

The race: user loads a preset → `updateSetting('roundsCount', preset.rounds_count)` fires → effect dependency `roundsCount` changes → redistribution runs with the new `roundsCount` but the existing questions' `roundIndex` values may have been intentionally set for the previous `roundsCount`. If the redistribution engine's idempotency check passes (distribution is already correct for the new `roundsCount`), no harm. But if the new `roundsCount` differs from what the questions' `roundIndex` values reflect, redistribution will rewrite them.

React 19 automatic batching means the two `updateSetting` calls in `PresetSelector.tsx:77-83` fire as one batch → one effect run. But the `questions` array reference does not change on preset load (preset load does not import new questions). So the redistribution effect only fires once on the combined `roundsCount` + `questionsPerRound` change, not twice.

The real risk is that the user had a manually arranged question distribution (e.g., custom `roundIndex` values set via the question editor) and the preset load triggers redistribution that overwrites them.

**Mitigation:** Implement `skipNextRedistribution` as a `useRef<boolean>` in `SetupGate`:

```typescript
const skipNextRedistribution = useRef(false);

useEffect(() => {
  if (skipNextRedistribution.current) {
    skipNextRedistribution.current = false;
    return;
  }
  if (questions.length === 0) return;
  useGameStore.getState().redistributeQuestions(roundsCount, questionsPerRound, isByCategory ? 'by_category' : 'by_count');
}, [questions, roundsCount, questionsPerRound, isByCategory]);

const handlePresetLoad = useCallback((preset: Preset) => {
  skipNextRedistribution.current = true;
  // ... apply preset settings
}, []);
```

The `useRef` is synchronous and does not cause re-renders. The flag is reset inside the effect body (exactly one redistribution is skipped per preset load).

---

### RISK-09: Empty State → False-Green Review Pills at First Render

**Severity:** Medium | **Likelihood:** Certain | **Category:** Empty state

At first render, `questions = []`. `derivePerRoundBreakdown` with `questions = []`, `isByCategory = true`, `roundsCount = 3` returns 3 entries with `totalCount=0, expectedCount=0, isMatch=true`. All three round pills in the Review step show green despite zero questions loaded. The status banner simultaneously shows "Cannot start — No questions loaded" (V1 blocker). Green pills + red banner is contradictory and misleading.

The E2E test 5 (iterator-5) also extracts `totalQuestions` from the banner before asserting the round sum equals it. If the redistribution effect has not fired yet when the test reaches the Review step, the sum assertion runs before `roundIndex` values are assigned and computes 0 instead of the expected total.

**Mitigation:** In `derivePerRoundBreakdown`, when `questions.length === 0`, return entries with `isMatch: false` regardless of mode:

```typescript
if (questions.length === 0) {
  return Array.from({ length: roundsCount }, (_, roundIndex) => ({
    roundIndex, totalCount: 0, expectedCount: 0, isMatch: false, categories: [],
  }));
}
```

All round pills show amber for zero-question state. The visual signal is consistent with the V1 blocker. For E2E test 5, add `.toPass({ timeout: 5000 })` wrapping (already present in the test code) to handle the async redistribution window.

---

### RISK-10: `Math.max(...[])` Returns `-Infinity` in `importQuestions` Append Mode

**Severity:** Medium | **Likelihood:** Low | **Category:** Engine correctness

`importQuestions` in `questions.ts:63`:
```typescript
const maxRoundIndex = Math.max(...newQuestions.map(q => q.roundIndex));
```

For an empty `newQuestions` array (possible in append mode when both the existing questions and the appended array are empty), `Math.max()` returns `-Infinity`. Then `totalRounds = -Infinity + 1 = -Infinity`, corrupting `state.totalRounds` and `state.settings.roundsCount`.

The existing guard `if (questions.length === 0) return state` (line 51) only checks the input `questions` parameter, not `newQuestions`. In append mode, `newQuestions = [...state.questions, ...questions]`, which can still be empty if both are empty.

**Mitigation:** Add a guard immediately before the `Math.max` call:

```typescript
if (newQuestions.length === 0) return state;
```

This is a defensive one-liner with no behavioral change for non-empty cases.

---

### RISK-11: Category Discovery Order Instability on Append Import

**Severity:** Medium | **Likelihood:** Medium | **Category:** Algorithm correctness

The By Category algorithm uses first-occurrence discovery order to assign categories to rounds. With a single import, order is stable. But `importQuestions` with `mode = 'append'` concatenates the new questions after the existing ones. The second import's questions carry `roundIndex` values pre-assigned by the import pipeline based on the second import's own array ordering. After append, these values are stale relative to the combined array's category ordering.

Redistribution corrects them on the next effect cycle. The gap exists only during one render. This is intended behavior — redistribution exists specifically to fix stale `roundIndex` values after any import.

**Mitigation:** No code change needed. Add an explicit comment in `SetupGate`'s redistribution effect: "Stale `roundIndex` values from imported data are corrected here on the next render after `questions` reference changes. The engine's first-occurrence category discovery order is the authoritative assignment."

---

### RISK-12: `startGameViaWizard` E2E Helper Regression

**Severity:** Medium | **Likelihood:** Medium | **Category:** E2E testing

The `startGameViaWizard` helper skips Steps 0 and 1 and goes directly to Teams → Review → Start. With By Category ON as the default, if the fixture's sample questions have fewer than 3 unique categories, V3 validation fires 2 blocking issues and `canStart = false`. The helper clicks a disabled Start Game button. `gate.waitFor({ state: 'detached' })` times out at 7 seconds. The test fails with a timeout — an opaque failure that does not point to the root cause.

A secondary risk: the helper may reach the Review step before the redistribution effect fires (redistribution is asynchronous relative to the navigation from Teams to Review). The `canStart` value may be stale.

**Mitigation:**
1. Ensure the E2E fixture's sample questions have at least 3 unique categories (matching the default `roundsCount = 3`). Document this as a fixture invariant.
2. Add an explicit wait in `startGameViaWizard`: `await expect(startBtn).toBeEnabled({ timeout: 5000 })` before clicking. This handles the async redistribution window and provides a clear failure message if validation blocks.

---

### RISK-13: `perRoundExpected` vs `perRoundBreakdown` Prop Threading Gap

**Severity:** Low | **Likelihood:** Certain | **Category:** Component integration

Iterator-4 adds `perRoundExpected?: number[]` to `WizardStepReviewProps`. Iterator-1 passes `perRoundBreakdown: PerRoundBreakdown[]` through `SetupWizard` and uses `breakdown.expectedCount` per round in the review grid. These are two different data shapes for the same conceptual data. If the implementer follows both, they must derive `perRoundExpected` from `perRoundBreakdown` in `SetupWizard` — an extra `map` over an array that is already threaded through.

**Mitigation:** Drop `perRoundExpected?: number[]` from `WizardStepReviewProps`. Replace it with `perRoundBreakdown?: PerRoundBreakdown[]`. The review grid reads `perRoundBreakdown?.[i]?.expectedCount ?? 0`. This eliminates the parallel array, gives the review grid access to `isMatch` (precomputed) and `categories` (for potential future use), and keeps the data structure consistent across all consumers.

---

### RISK-14: `isByCategory` Missing From Effect Dependency Array

**Severity:** Low | **Likelihood:** Certain | **Category:** Effect dependencies

Iterator-2's section 11 states: "isByCategory intentionally in effect body, not dependency array. isByCategory changes trigger re-render of SetupGate which re-mounts, not re-runs this effect." This reasoning is incorrect.

Toggling `isByCategory` via a settings store change does not re-mount `SetupGate` — it causes a re-render. `SetupGate` is not conditionally mounted on `isByCategory`. Additionally, reading `isByCategory` inside an effect body without including it in the dependency array violates `react-hooks/exhaustive-deps`, which ESLint enforces. The pre-commit hook runs `pnpm lint`, which runs ESLint. This will fail at commit time.

**Mitigation:** Include `isByCategory` in the dependency array. The correct array is `[questions, roundsCount, questionsPerRound, isByCategory]`. Toggling between modes correctly triggers redistribution in the new mode. The idempotency guard handles the case where the distribution is already correct.

---

### RISK-15: Category Badge Shows Round Total Instead of Per-Category Count

**Severity:** Low | **Likelihood:** Certain | **Category:** UI correctness

Iterator-3's badge JSX uses `firstRound.count` for every badge's count display, where `firstRound.count` is the total number of questions in round 0. A round with 4 Science, 5 History, and 3 Geography questions would render "Science: 12, History: 12, Geography: 12" instead of "Science: 4, History: 5, Geography: 3."

Iterator-3 identifies this problem in its "Badge Pill Detail Note" and recommends Option 1 (per-category counts in breakdown). The fix requires the canonical `PerRoundBreakdown` type from iterator-1.

**Mitigation:** Fixed automatically when RISK-02 is resolved. With the iterator-1 type, badge rendering becomes `{cat.categoryName}: {cat.questionCount}` per `RoundCategoryBreakdown` entry.

---

## Risk Summary Table

| ID | Title | Severity | Likelihood | Category |
|----|-------|----------|-----------|---------|
| RISK-01 | Hidden feedback: `addQuestion`/`updateQuestion` write `settings.roundsCount` | High | High | Feedback loop |
| RISK-02 | `PerRoundBreakdown` type conflict iterator-1 vs iterator-3 | High | Certain | Type system |
| RISK-03 | `derivePerRoundBreakdown` false-green for empty rounds in By Category mode | High | Certain | Review grid |
| RISK-04 | `isByCategory` ownership unresolved across three documents | High | Certain | State management |
| RISK-05 | Settings store v3→v4 migration — four breakpoints | Medium | Certain | Migration |
| RISK-06 | V3 validation uses settings-store `roundsCount`, not category count | Medium | High | Validation |
| RISK-07 | Rounds slider active but ignored in By Category mode | Medium | High | UX |
| RISK-08 | Preset load + redistribution guard not specified | Medium | High | Race condition |
| RISK-09 | Empty state false-green review pills at first render | Medium | Certain | Empty state |
| RISK-10 | `Math.max(...[])` returns `-Infinity` in append mode | Medium | Low | Engine |
| RISK-11 | Category discovery instability on append import | Medium | Medium | Algorithm |
| RISK-12 | `startGameViaWizard` E2E helper regression | Medium | Medium | E2E |
| RISK-13 | `perRoundExpected` vs `perRoundBreakdown` prop threading duplication | Low | Certain | Integration |
| RISK-14 | `isByCategory` missing from effect dependency array | Low | Certain | Effect deps |
| RISK-15 | Badge display shows round total instead of per-category count | Low | Certain | UI |

---

## Mitigation Priority Order

### Must-Resolve Before Implementation Begins (design decisions)

1. **RISK-04** — Resolve `isByCategory` ownership to the settings store. This anchors all other state decisions.
2. **RISK-02** — Canonicalize `PerRoundBreakdown` to the iterator-1 shape. This anchors all component interfaces.
3. **RISK-03** — Fix `isMatch` derivation formula before `derivePerRoundBreakdown` is written. Fixing post-implementation requires touching the function and all its tests.

### Must-Fix During Implementation (same PR)

4. **RISK-05** — Settings store v3→v4 migration (part of adding `isByCategory`).
5. **RISK-06** — Add `isByCategory` to `GameSettings` and update `validateGameSetup`.
6. **RISK-08** — Implement `skipNextRedistribution` ref in `SetupGate` alongside the redistribution effect.
7. **RISK-01** — Remove `settings.roundsCount` writes from `addQuestion` and `updateQuestion`.
8. **RISK-14** — Add `isByCategory` to the redistribution effect dependency array.

### Must-Fix Before E2E Pass

9. **RISK-12** — Add enabled-wait to `startGameViaWizard` helper; verify fixture category diversity.
10. **RISK-09** — Fix empty-state `isMatch` derivation in `derivePerRoundBreakdown`.

### Fix During Review / Polish

11. **RISK-07** — Choose and implement slider-max constraint or helper text.
12. **RISK-13** — Drop `perRoundExpected`, pass `perRoundBreakdown` to `WizardStepReview`.
13. **RISK-15** — Fixed automatically by RISK-02 resolution.

### Defensive / Opportunistic

14. **RISK-10** — Add `newQuestions.length === 0` guard to `importQuestions`.
15. **RISK-11** — Add code comment in redistribution effect; no logic change.

---

## Cross-Cutting Invariants for Implementers

**I-1: `redistributeQuestions` is the sole writer of `questions[].roundIndex` after initial import.**
No other function may assign `roundIndex` to questions already in the store. `addQuestion` and `updateQuestion` assign `roundIndex` to the new/updated question itself (that is acceptable), but must not write `state.settings.roundsCount`.

**I-2: Settings store owns `isByCategory`; game state does not (except for validation).**
`isByCategory` belongs in `SettingsState`, not in `TriviaGameState` directly. If `validateGameSetup` needs it, add it to `GameSettings` (the embedded settings struct) so it flows through the settings-sync effect. Do not add it to `TriviaGameState` top-level fields.

**I-3: Idempotency is the only feedback loop guard — it must have exhaustive unit tests.**
There is no debounce, no double-check in the effect, no cooldown period. If `redistributeQuestions` returns a new reference when the distribution is already correct, infinite re-renders result. Unit tests must cover: empty questions (same ref), already-correct distribution (same ref), needs redistribution (new ref), single question, all-same-category, categories > roundsCount, categories < roundsCount.

**I-4: The review grid must never show green pills when `totalCount === 0` and questions exist.**
Green pills are the user's signal that a round is ready. A false-green on an empty round undermines the validation UX. The V1/V3 blockers at the banner level are the authoritative gate, but round pills must independently signal the problem.

---

*Phase 3 Synthesis 2 complete. Addresses all 6 original decisions and cross-cuts with live codebase state.*
```

---

**Summary for the implementer:**

The document identifies **15 risks** across the 6 decisions. The four **High-severity** risks that must be resolved before writing any implementation code:

1. **RISK-04** (`isByCategory` ownership): Must go in the settings store, not `useState`. Three documents contradict each other. Resolution: settings store v4.

2. **RISK-02** (type conflict): Iterator-1 and iterator-3 define `PerRoundBreakdown` with incompatible field names and category shapes. Resolution: adopt iterator-1's shape universally.

3. **RISK-03** (always-green review grid): The `derivePerRoundBreakdown` derivation `expectedCount = totalCount` means empty rounds are always `isMatch = true`. Resolution: `isMatch = totalCount > 0` in By Category mode.

4. **RISK-01** (hidden feedback): `addQuestion` and `updateQuestion` in `/apps/trivia/src/lib/game/questions.ts` (lines 126 and 183) also write `settings.roundsCount` — the same feedback source the engine contract prohibits in `redistributeQuestions`. These writes must be removed.

The most operationally dangerous risk not yet visible from the iterators alone: **RISK-08** (preset load guard) is mentioned in area-5 but never designed in Phase 2. `skipNextRedistribution` as a `useRef<boolean>` in `SetupGate` is the specified implementation.

Relevant files:
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/questions.ts` (lines 116-117, 173-174 — writes to remove)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/settings-store.ts` (v3→v4 migration required)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/selectors.ts` (V3 validation rule at line 59)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/types/index.ts` (canonical `PerRoundBreakdown` type goes here)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/__tests__/settings-store.test.ts` (line 259 — must add `isByCategory` to expected keys)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/SetupGate.tsx` (redistribution effect + `skipNextRedistribution` ref)
- `/Users/j/repos/beak-gaming-platform/docs/trivia-round-config-decisions/phase-3/synthesis-2.md` (output file — directory must be created)