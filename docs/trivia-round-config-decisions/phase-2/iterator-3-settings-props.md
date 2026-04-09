# Iterator 3: WizardStepSettings — Props Interface and JSX Layout

**Phase:** 2 — Design
**Question addressed:** Q1 (QPR display in Step 2) — concrete props interface and JSX for both modes
**Agent type:** component-architect
**Date:** 2026-03-05

---

## Files Read

| File | Purpose |
|------|---------|
| `apps/trivia/src/components/presenter/WizardStepSettings.tsx` | Current implementation — two sliders, existing prop types |
| `packages/ui/src/toggle.tsx` | Toggle API: `checked`, `onChange`, `label`, `disabled?`, `size?`, `labelPosition?`; `role="switch"`, `aria-checked` already built in |
| `apps/trivia/src/components/presenter/SettingsPanel.tsx` | Toggle usage pattern, Pattern B helper text (`text-base text-muted-foreground -mt-4`) |
| `apps/trivia/src/lib/categories.ts` | `getCategoryBadgeClasses(id)`, `getCategoryName(id)`, `CategoryConfig`; returns full dark-mode Tailwind string |
| `apps/trivia/src/stores/settings-store.ts` | `SETTINGS_RANGES.roundsCount` (min 1, max 6), `SETTINGS_RANGES.questionsPerRound` (min 3, max 10); `SettingsState` type |
| `apps/trivia/src/types/index.ts` | `QuestionCategory` union type (7 members) |
| `docs/trivia-round-config-decisions/phase-1/area-1-ui-display.md` | Decision Q1 = Option B; Pattern C badge vocabulary; Pattern B helper text |
| `docs/trivia-round-config-decisions/phase-1/area-5-interactions.md` | `perRoundBreakdown` shape — same data as `perRoundExpected`; single upstream computation |
| `docs/trivia-round-config-decisions/context-packets/phase-1-packet.md` | Q1 final decision confirmed; carry-forward: `perRoundBreakdown` type to be shared |

---

## API Surface Questions

Before writing code, the three characteristic questions this analysis must answer:

1. **What is the component API surface?** — What does `SetupGate` need to pass down; what can WizardStepSettings compute for itself?
2. **How do variants compose together?** — Toggle ON vs Toggle OFF are not just conditional renders — the entire control surface changes shape. How do the two layout branches share structure?
3. **What is the right abstraction level?** — `perRoundBreakdown` is an array of round objects. The component should receive it fully computed, not raw questions.

---

## Key Findings from Code Reading

### Toggle component API

`Toggle` from `@joolie-boolie/ui` already emits `role="switch"` and `aria-checked={checked}` on the inner `<button>`. The wrapping `<div>` carries `min-h-[44px]` for the touch target. No additional accessibility attributes are needed at the call site — the component handles all ARIA.

Props that matter here:

```typescript
// From packages/ui/src/toggle.tsx
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;           // not needed here — toggle is always active in Step 2
  size?: 'sm' | 'md';          // default 'md' is correct
  labelPosition?: 'left' | 'right';  // default 'right' is correct
}
```

The toggle's visual state drives which control set renders. This is a branch on `isByCategory`, not a disabled state.

### Pattern B: sibling helper text

Used in `SettingsPanel` lines 158-160 directly under the TTS toggle:

```tsx
<p className="text-base text-muted-foreground -mt-4">
  Reads questions aloud when displayed
</p>
```

The `-mt-4` collapses the `space-y-6` gap between the toggle and the helper sentence, keeping them visually coupled. This exact pattern applies below the "By Category" toggle in Step 2.

### Pattern C: category badge pill

Used in `TriviaApiImporter` and `CategoryFilter`. The concrete class composition:

```tsx
className={`px-2 py-0.5 text-xs font-medium border rounded-full ${getCategoryBadgeClasses(cat)}`}
```

`getCategoryBadgeClasses` returns a complete string covering `bg-*`, `text-*`, and `border-*` in both light and dark mode. No additional color classes needed.

### `perRoundBreakdown` shape

From `area-5-interactions.md` and `area-1-ui-display.md`:

```typescript
{ roundIndex: number; count: number; categories: QuestionCategory[] }[]
```

For the Step 2 display (Q1 Option B decision), only the **first round's categories** are rendered, since in "By Category" mode all rounds share the same category distribution proportionally. The `count` for round 0 gives the per-round expected count.

The component receives this pre-computed — no question filtering inside `WizardStepSettings`.

### What stays unchanged

- `roundsCount` slider and its `onUpdateSetting` callback remain in both modes
- `SETTINGS_RANGES.roundsCount` bounds remain the constraint source of truth
- The containing `div.space-y-4` and section card structure (`bg-surface border border-border rounded-xl p-4`) are preserved

---

## Complete New Props Interface

```typescript
import type { QuestionCategory } from '@/types';
import type { SettingsState } from '@/stores/settings-store';

/**
 * Per-round category breakdown from the redistribution engine.
 * Produced upstream by SetupGate — never derived inside this component.
 * Each entry represents one round. In "By Category" mode all rounds share
 * the same category distribution, so round 0 is representative.
 */
export interface PerRoundBreakdown {
  roundIndex: number;
  count: number;
  categories: QuestionCategory[];
}

export interface WizardStepSettingsProps {
  // ── Always-present settings ──────────────────────────────────────────────
  /** Current number of rounds (1–6). Controls the Rounds slider. */
  roundsCount: number;

  /** Current QPR setting (3–10). Used only when isByCategory is false. */
  questionsPerRound: number;

  // ── Mode toggle ──────────────────────────────────────────────────────────
  /**
   * When true: category-badge breakdown replaces the QPR slider.
   * When false: standard Rounds + QPR slider pair.
   */
  isByCategory: boolean;

  // ── By-Category mode data ────────────────────────────────────────────────
  /**
   * Pre-computed per-round breakdown from redistributeQuestions().
   * Required when isByCategory is true; may be empty array when no
   * questions are imported yet (triggers empty state helper text).
   * Should be undefined / empty array when isByCategory is false.
   */
  perRoundBreakdown: PerRoundBreakdown[];

  // ── Callbacks ────────────────────────────────────────────────────────────
  /** Generic settings updater — mirrors the SettingsPanel/existing pattern. */
  onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;

  /** Toggles the By Category mode. Owned by SetupGate, not the settings store. */
  onToggleByCategory: (isByCategory: boolean) => void;
}
```

### Interface decisions and rationale

**`isByCategory` and `onToggleByCategory` are separate props, not part of `SettingsState`.** The phase-1 Q4 decision explicitly deferred adding `isByCategory` to the settings store or preset schema. For now it is a local UI preference owned by `SetupGate`. If it moves to the store later, the call site changes but the component interface is stable.

**`perRoundBreakdown: PerRoundBreakdown[]` — always present, not optional.** An empty array is the natural "no questions yet" signal. Making it optional (`perRoundBreakdown?`) would require null-coalescing at every use site inside the component. The empty array already encodes the empty state unambiguously.

**`questionsPerRound` is still present even when `isByCategory` is true.** The slider is not rendered in that mode, but the prop must remain so the parent does not need a conditional prop shape. This matches the component API surface principle: presentational components should not change their interface based on internal mode state — the parent always passes the same shape.

**No `totalQuestions` prop.** The component does not need a separate count — it derives emptiness from `perRoundBreakdown.length === 0`. This is one less prop to keep in sync.

---

## Concrete JSX — Both Modes

```tsx
'use client';

/**
 * T4.3: WizardStepSettings
 *
 * Step 2 of the SetupWizard. Handles game settings: rounds and questions
 * per round configuration. Supports "By Category" mode where QPR is
 * derived from category distribution rather than a fixed target.
 */

import { Slider, Toggle } from '@joolie-boolie/ui';
import { SETTINGS_RANGES } from '@/stores/settings-store';
import { getCategoryBadgeClasses, getCategoryName } from '@/lib/categories';
import type { SettingsState } from '@/stores/settings-store';
import type { QuestionCategory } from '@/types';

export interface PerRoundBreakdown {
  roundIndex: number;
  count: number;
  categories: QuestionCategory[];
}

export interface WizardStepSettingsProps {
  roundsCount: number;
  questionsPerRound: number;
  isByCategory: boolean;
  perRoundBreakdown: PerRoundBreakdown[];
  onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  onToggleByCategory: (isByCategory: boolean) => void;
}

export function WizardStepSettings({
  roundsCount,
  questionsPerRound,
  isByCategory,
  perRoundBreakdown,
  onUpdateSetting,
  onToggleByCategory,
}: WizardStepSettingsProps) {
  // Derive emptiness from breakdown data — no questions imported yet.
  const hasBreakdown = perRoundBreakdown.length > 0;
  // Round 0 is representative of all rounds in "By Category" mode.
  const firstRound = perRoundBreakdown[0];

  return (
    <div className="space-y-4">
      {/* Step header */}
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-foreground-secondary mt-0.5">
          Configure rounds and question distribution
        </p>
      </div>

      {/* Game Configuration card */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-6">

        {/* ── By Category toggle ────────────────────────────────────────── */}
        {/*
          Toggle already renders role="switch" and aria-checked={isByCategory}
          on its inner <button>. No additional ARIA needed here.
        */}
        <Toggle
          checked={isByCategory}
          onChange={onToggleByCategory}
          label="Distribute questions by category"
        />
        {/* Pattern B: helper text below toggle, -mt-4 collapses space-y-6 gap */}
        <p className="text-base text-muted-foreground -mt-4">
          {isByCategory
            ? 'Questions are spread across rounds by category proportion.'
            : 'Set a fixed number of questions per round.'}
        </p>

        {/* ── Rounds slider — always shown ─────────────────────────────── */}
        <Slider
          value={roundsCount}
          onChange={(value) => onUpdateSetting('roundsCount', value)}
          min={SETTINGS_RANGES.roundsCount.min}
          max={SETTINGS_RANGES.roundsCount.max}
          step={1}
          label="Number of Rounds"
        />

        {/* ── Mode-dependent QPR area ───────────────────────────────────── */}
        {isByCategory ? (
          // ── By Category ON: category badge breakdown (Option B) ────────
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">
              Questions per round — by category
            </span>

            {hasBreakdown ? (
              // Pattern C: getCategoryBadgeClasses pills with name + count
              <div className="flex flex-wrap gap-1.5">
                {firstRound.categories.map((cat) => (
                  <span
                    key={cat}
                    className={`px-2 py-0.5 text-xs font-medium border rounded-full ${getCategoryBadgeClasses(cat)}`}
                  >
                    {getCategoryName(cat)}: {firstRound.count}
                  </span>
                ))}
              </div>
            ) : (
              // Empty state: no questions imported yet
              // Pattern B: helper text, no badge pills rendered
              <p className="text-base text-muted-foreground">
                No questions imported yet. Import questions in Step 1 to see the breakdown.
              </p>
            )}
          </div>
        ) : (
          // ── By Category OFF: QPR slider (existing behavior) ────────────
          <Slider
            value={questionsPerRound}
            onChange={(value) => onUpdateSetting('questionsPerRound', value)}
            min={SETTINGS_RANGES.questionsPerRound.min}
            max={SETTINGS_RANGES.questionsPerRound.max}
            step={1}
            label="Questions Per Round"
          />
        )}
      </div>
    </div>
  );
}
```

---

## Mode Layout Breakdown

### Mode A: "By Category" OFF (Toggle unchecked)

```
┌─ Game Configuration ─────────────────────────────────────────────┐
│  [Toggle: OFF]  Distribute questions by category                  │
│  Set a fixed number of questions per round.         ← Pattern B  │
│                                                                   │
│  [Slider] Number of Rounds  ●────────────  3                     │
│                                                                   │
│  [Slider] Questions Per Round  ●───────────  5                   │
└───────────────────────────────────────────────────────────────────┘
```

Identical to existing behavior except for the toggle row above the sliders. `onUpdateSetting` wires are unchanged.

---

### Mode B: "By Category" ON — questions loaded

```
┌─ Game Configuration ─────────────────────────────────────────────┐
│  [Toggle: ON]  Distribute questions by category                   │
│  Questions are spread across rounds by category proportion.  ← B │
│                                                                   │
│  [Slider] Number of Rounds  ●────────────  3                     │
│                                                                   │
│  Questions per round — by category                               │
│  [Science: 4] [History: 2] [Geography: 1]   ← Pattern C pills   │
└───────────────────────────────────────────────────────────────────┘
```

The QPR slider is replaced by the badge row. The Rounds slider remains active — the user still controls how many rounds there are; the distribution engine reacts to changes in `roundsCount`.

---

### Mode C: "By Category" ON — no questions imported yet (empty state)

```
┌─ Game Configuration ─────────────────────────────────────────────┐
│  [Toggle: ON]  Distribute questions by category                   │
│  Questions are spread across rounds by category proportion.  ← B │
│                                                                   │
│  [Slider] Number of Rounds  ●────────────  3                     │
│                                                                   │
│  Questions per round — by category                               │
│  No questions imported yet. Import questions in Step 1 to see    │
│  the breakdown.                                    ← Pattern B   │
└───────────────────────────────────────────────────────────────────┘
```

The badge area renders the helper text rather than an empty `flex-wrap` div. No pills, no misleading counts.

---

## Presentational Purity Verification

The component as specified:

- Reads from props only — no `use*Store()` calls, no `useEffect`, no `useState`
- Derives `hasBreakdown` and `firstRound` from props via pure expressions (no async, no side effects)
- All callbacks (`onUpdateSetting`, `onToggleByCategory`) are passed in, not originated
- `getCategoryBadgeClasses` and `getCategoryName` are pure utility functions (no module-level state)
- The `Slider` and `Toggle` components are both presentational — they emit events via callbacks

The component is fully testable in isolation with a static props object and a Jest/Vitest mock for the callback props.

---

## Badge Pill Detail Note

The Option B JSX in area-1 used `getQuestionCountByCategory(perRoundBreakdown[0].questions, cat)` — this assumed questions were embedded in the breakdown. The interface defined above passes `PerRoundBreakdown` without embedded questions. The pill count comes from `firstRound.count`, which is the total for the round.

This needs one refinement: if each category has a **per-category count** (not just the round total), the `PerRoundBreakdown` type should carry it. Two options:

**Option 1 — Per-category counts in breakdown (recommended)**

```typescript
export interface PerRoundBreakdown {
  roundIndex: number;
  count: number;             // total questions this round
  categories: {
    id: QuestionCategory;
    count: number;           // questions from this category in this round
  }[];
}
```

Badge renders as: `{getCategoryName(cat.id)}: {cat.count}`

**Option 2 — Pass only categories array, compute counts upstream**

Keep `categories: QuestionCategory[]` as in the area-5 shape but add a parallel `categoryCounts: Record<QuestionCategory, number>` to the breakdown object.

**Recommendation: Option 1.** The `categories` field changes from `QuestionCategory[]` to an array of `{ id, count }` objects. This is a slightly richer type but eliminates any need to look up per-category counts inside the component. The redistribution engine already knows these counts — it is free to include them in its output. Embedding them in the `PerRoundBreakdown` type keeps `WizardStepSettings` a pure leaf node.

The JSX for the badge row with the refined type:

```tsx
{firstRound.categories.map((cat) => (
  <span
    key={cat.id}
    className={`px-2 py-0.5 text-xs font-medium border rounded-full ${getCategoryBadgeClasses(cat.id)}`}
  >
    {getCategoryName(cat.id)}: {cat.count}
  </span>
))}
```

---

## Carry-Forward for Implementer

1. **`PerRoundBreakdown` type** — finalize with Option 1 shape above and place in `apps/trivia/src/types/index.ts` or a new `apps/trivia/src/types/wizard.ts`. Both `WizardStepSettings` and `WizardStepReview` must import from the same location.

2. **`isByCategory` state location** — `SetupGate` should own this via `useState`. The phase-1 Q4 decision keeps it out of the settings store and out of presets. If it later migrates to the store, only the call site changes.

3. **`onToggleByCategory` in `SetupGate`** — when toggled ON, `SetupGate` should trigger redistribution immediately (not wait for the next slider onChange). This is needed so that switching to "By Category" mode immediately shows a badge breakdown rather than a stale empty state.

4. **`getCategoryName` import path** — `@/lib/categories` (already used in `CategoryFilter.tsx` and `TriviaApiImporter.tsx`).

5. **Rounds slider in both modes** — the Rounds slider is intentionally present in both branches. Do not conditionally hide it when `isByCategory` is ON. Changing round count while in category mode is a valid operation (the redistribution engine reacts to `roundsCount` changes).

---

*Component Architect analysis — 2026-03-05*
