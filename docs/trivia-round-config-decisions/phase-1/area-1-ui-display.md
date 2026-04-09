# Area 1: UI Display Patterns for Variable Data

**Phase:** 1 — Investigate
**Questions addressed:** Q1 (QPR display in Step 2), Q5 (Review grid adaptation)
**Agent type:** frontend-excellence:react-specialist
**Date:** 2026-03-05

---

## What Was Read

| File | Purpose |
|------|---------|
| `apps/trivia/src/components/presenter/WizardStepSettings.tsx` | Current Step 2 — two Sliders only |
| `apps/trivia/src/components/presenter/WizardStepReview.tsx` | Review grid, line 97 `isMatch = count === questionsPerRound` |
| `apps/trivia/src/lib/categories.ts` | `getCategoryBadgeClasses()`, `getCategoryName()`, `getCategoryColor()`, `getCategoryStatistics()` |
| `apps/trivia/src/components/presenter/CategoryFilter.tsx` | Category badge buttons with per-category counts |
| `apps/trivia/src/components/presenter/TriviaApiImporter.tsx` | Per-question category + difficulty badges in preview list |
| `apps/trivia/src/components/presenter/WizardStepQuestions.tsx` | `bg-success/10 border-success/30` pattern for computed count |
| `apps/trivia/src/components/presenter/SettingsPanel.tsx` | `text-base text-muted-foreground` for helper text below controls |
| `packages/ui/src/badge.tsx` | `Badge` component: `filled | outline | dot`, `sm | md`, semantic colors |
| `packages/ui/src/slider.tsx` | `Slider` — no `description` or `hint` prop; label + SliderOutput only |
| `apps/trivia/src/stores/settings-store.ts` | `questionsPerRound` range 3–10, `roundsCount` range 1–6 |

---

## Existing Patterns Inventory

Before proposing options, it is worth naming the concrete patterns already in use, because new UI must fit one of them.

### Pattern A: Success/count banner
`WizardStepQuestions` line 31–37:
```
px-4 py-3 bg-success/10 border border-success/30 rounded-xl
text-sm font-medium text-success
```
Used to surface a single computed number ("N questions loaded"). Purely informational, no interaction.

### Pattern B: Inline helper text below a control
`SettingsPanel` line 158–160:
```
text-base text-muted-foreground -mt-4
```
Used directly under the TTS Toggle. One short sentence of supplemental context for a control the user just touched.

### Pattern C: Category badges (`getCategoryBadgeClasses`)
`TriviaApiImporter` lines 543–554, `CategoryFilter` throughout:
```
text-base px-2 py-0.5 rounded-full border  +  getCategoryBadgeClasses(category)
```
Inline pill with category-specific background+text+border. Used for per-question metadata and for filterable buttons. `getCategoryBadgeClasses` maps the 7 internal categories to Tailwind color classes with full dark-mode support.

### Pattern D: `@joolie-boolie/ui` Badge component
`packages/ui/src/badge.tsx` — semantic color tokens (`success`, `warning`, `info`, etc.), `filled | outline | dot` styles. Does NOT use the per-category color map. Most appropriate for status/semantic signals, not category identity.

### Pattern E: Key-value summary row
`SettingsPanel` "Saved Teams" box lines 195–200:
```
<span className="text-base font-medium">Saved Teams</span>
<span className="text-base text-muted-foreground">{n} team{...}</span>
```
Label on left, derived value on right, inside a `p-4 bg-muted/20 border border-border rounded-xl`.

### Pattern F: Per-round status pill (current review grid)
`WizardStepReview` lines 99–110:
```
px-3 py-2 rounded-lg text-sm font-medium
bg-success/10 text-success   (match)
bg-warning/10 text-warning   (mismatch)
```
Grid of 2–3 columns. One pill per round. Each pill shows "Round N: X questions" and colors green if `count === questionsPerRound`, amber otherwise. This is the Q5 target.

---

## Q1: Options for Displaying Variable QPR in Step 2

### Context for Q1

In "By Category" mode the user does NOT set questionsPerRound as a fixed target. Instead the system derives per-round question counts from category distribution. Step 2 currently shows two Sliders ("Number of Rounds" and "Questions Per Round"). With "By Category" mode the QPR slider either disappears entirely or becomes display-only. The user needs to understand what will actually happen to their rounds.

The incoming props shape for the redesigned `WizardStepSettings` will include something like:
```typescript
interface WizardStepSettingsProps {
  roundsCount: number;
  questionsPerRound: number;          // still present for "By Count" mode
  isByCategory: boolean;              // new toggle
  // only present/non-empty in "By Category" mode:
  perRoundBreakdown?: { roundIndex: number; count: number; categories: QuestionCategory[] }[];
  onUpdateSetting: ...;
}
```

The three options below address only how the variable-count information is surfaced. The mode toggle UI itself is a separate decision.

---

### Q1 Option A: Inline helper text under the QPR slider (disabled state)

**Description**
Keep the QPR Slider in the DOM but mark it `disabled`. Add a one-line helper sentence below it, mirroring the existing SettingsPanel TTS helper text pattern (Pattern B).

```tsx
<Slider
  value={questionsPerRound}
  onChange={...}
  label="Questions Per Round"
  disabled={isByCategory}
/>
{isByCategory && (
  <p className="text-sm text-muted-foreground -mt-3">
    Varies by category — see the Review step for per-round totals.
  </p>
)}
```

**What the user sees:** The slider is visually grayed out (Slider already applies `opacity-[0.38]` when `disabled`). The helper sentence tells them why it is disabled and where to find the real numbers.

**Rating:**

| Criterion | Score | Reason |
|-----------|-------|--------|
| User clarity | 2/5 | Tells the user where to look but not what the actual numbers are here and now. "See Review step" is a forward-reference that may confuse users who expect to understand the game before moving on. |
| Consistency | 5/5 | Exactly follows Pattern B. No new classes, no new components. |
| Simplicity | 5/5 | ~4 lines of JSX. Zero new imports. No data dependencies. |

**Verdict:** Low-friction default but weak on clarity. Adequate if the user has already imported questions and the counts are visible on the Review step, but fails if the user is still in setup.

---

### Q1 Option B: Replace QPR slider with a per-category breakdown list (category badges + counts)

**Description**
When `isByCategory` is true, hide the QPR Slider and replace it with a compact list of category pills showing how many questions per round each category contributes. Uses `getCategoryBadgeClasses` directly (Pattern C) — the identical visual language already used in TriviaApiImporter and CategoryFilter.

```tsx
{isByCategory ? (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">
        Questions per round — by category
      </span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {perRoundBreakdown.length > 0 ? (
        perRoundBreakdown[0].categories.map((cat) => {
          const count = getQuestionCountByCategory(perRoundBreakdown[0].questions, cat);
          return (
            <span
              key={cat}
              className={`px-2.5 py-1 text-xs font-medium border rounded-full ${getCategoryBadgeClasses(cat)}`}
            >
              {getCategoryName(cat)}: {count}
            </span>
          );
        })
      ) : (
        <p className="text-sm text-muted-foreground">No questions loaded yet.</p>
      )}
    </div>
  </div>
) : (
  <Slider value={questionsPerRound} onChange={...} label="Questions Per Round" />
)}
```

**Note on data flow:** This option requires `perRoundBreakdown` to be computed and passed down. In "By Category" mode, each round gets the same category distribution (distribution is based on proportions across the whole question pool), so showing round 0's breakdown is representative of all rounds. If rounds differ, a tab or "Round N" selector would be needed — that is out of scope for Step 2.

**What the user sees:** Category-colored pills with names and counts. Visual language is immediately familiar from the importer. Empty-state handled.

**Rating:**

| Criterion | Score | Reason |
|-----------|-------|--------|
| User clarity | 5/5 | Shows the actual numbers with category identity. No forward-references. |
| Consistency | 4/5 | Uses established `getCategoryBadgeClasses` pattern verbatim. Adds a new layout wrapper (the list) but no new pattern. |
| Simplicity | 3/5 | Requires `perRoundBreakdown` prop and a data computation upstream. The JSX is ~20 lines but the data dependency adds coupling. |

**Verdict:** Best clarity. The data dependency is real work but the correct work — this forces the upstream component (SetupGate or SetupWizard) to derive and pass category breakdown, which it will need to do anyway for the redistribution logic.

---

### Q1 Option C: Summary row showing total questions and derived average (key-value pattern)

**Description**
Replace the QPR Slider with a read-only summary row using Pattern E (key-value inside a muted surface). Show "Total questions" and "Avg per round" as the two values. Optionally add a `Badge` with `color="info"` and `badgeStyle="outline"` to label it as computed.

```tsx
{isByCategory ? (
  <div className="flex items-center justify-between px-3 py-2.5 bg-surface-elevated border border-border rounded-lg">
    <span className="text-sm font-medium text-foreground">Questions per round</span>
    <div className="flex items-center gap-2">
      <Badge color="info" badgeStyle="outline" size="sm">auto</Badge>
      <span className="text-sm font-semibold text-foreground tabular-nums">
        ~{Math.round(totalQuestions / roundsCount)}
      </span>
    </div>
  </div>
) : (
  <Slider value={questionsPerRound} onChange={...} label="Questions Per Round" />
)}
```

**What the user sees:** A compact row that looks like a disabled field but is actually just a display. The "auto" badge signals that the value is system-derived. The tilde (`~`) before the number communicates it is an average, not a fixed count.

**Rating:**

| Criterion | Score | Reason |
|-----------|-------|--------|
| User clarity | 3/5 | An average is honest but potentially misleading. If Science has 12 questions and History has 2, "~7" is not what the user will experience in either round. Still a forward-reference problem. |
| Consistency | 4/5 | Uses `Badge` component and key-value pattern already established. `bg-surface-elevated` class is in use throughout the app. |
| Simplicity | 4/5 | Requires only `totalQuestions` and `roundsCount` — simpler data dependency than Option B. About 12 lines of JSX. |

**Verdict:** Good balance of simplicity and clarity, but the "average" framing can mislead. Best as a companion to Option B's breakdown, not as a standalone replacement.

---

### Q1 Recommendation

**Primary: Option B** — category badge breakdown list.

The central problem with "By Category" mode is that the user genuinely cannot predict what their rounds will look like from a single average number. Option B resolves that by showing the real distribution using the existing `getCategoryBadgeClasses` vocabulary. The data dependency on `perRoundBreakdown` should be treated as a signal to push the computation upstream where it belongs (into the redistribution logic), not as a reason to avoid it.

**Fallback: Option C + Option A combined** — if `perRoundBreakdown` is not yet available when Step 2 renders (e.g., questions have not been imported yet), show Option C's summary row, and when there are zero questions show Option A's "No questions loaded yet" helper text inline.

This two-state approach keeps the surface clean:
- Zero questions: single disabled-looking row + "Import questions first" message
- Questions imported: category breakdown pills

---

## Q5: Options for the WizardStepReview Per-Round Grid

### Context for Q5

The current grid (line 94–111 of `WizardStepReview.tsx`) iterates `roundsCount` and for each round computes:
```typescript
const count = questions.filter((q) => q.roundIndex === i).length;
const isMatch = count === questionsPerRound;
```
`isMatch` drives the green/amber color. In "By Category" mode there is no single `questionsPerRound` target — each round can legitimately have a different count — so the `isMatch` check becomes meaningless or actively wrong (it will always show amber because count never equals questionsPerRound unless by coincidence).

The incoming props change:
- `questionsPerRound` is still present (used in "By Count" mode)
- New: `isByCategory: boolean`
- New: per-round expected counts (derived by the redistribution function)

---

### Q5 Option A: Mode-aware isMatch — use expected per-round count array in "By Category" mode

**Description**
Pass a `perRoundExpected: number[]` prop alongside `isByCategory`. In "By Category" mode, `isMatch` compares `count` against `perRoundExpected[i]` instead of the global `questionsPerRound`.

```tsx
// In WizardStepReview:
{Array.from({ length: roundsCount }, (_, i) => {
  const count = questions.filter((q) => q.roundIndex === i).length;
  const expected = isByCategory
    ? (perRoundExpected[i] ?? 0)
    : questionsPerRound;
  const isMatch = count === expected;
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
      {isByCategory && !isMatch && (
        <span className="text-xs opacity-70 ml-1">(expected {expected})</span>
      )}
    </div>
  );
})}
```

**What the user sees:** Same pill layout. In "By Category" mode, a round is green only when its actual count matches the expected category-derived count. If a round is amber, the expected number is shown inline as a hint.

**Rating:**

| Criterion | Score | Reason |
|-----------|-------|--------|
| User clarity | 4/5 | The green/amber semantic is preserved and accurate. The expected-count hint on amber helps the user understand what went wrong. |
| Consistency | 5/5 | Identical pill structure, identical color classes, identical grid. The only change is the `expected` derivation. |
| Simplicity | 4/5 | Requires `perRoundExpected` array as a new prop. The computation is a straightforward slice of the redistribution output — not extra work if that output already exists. |

**Verdict:** Clean and backward-compatible. Preserves the mental model (green = correct, amber = problem). Correct semantic for both modes.

---

### Q5 Option B: Always-green mode — in "By Category" mode all rounds show green, and remove the count target concept

**Description**
When `isByCategory` is true, treat every round as "correct by definition" regardless of count. The premise is that in category mode the user chose the distribution, so there is no wrong answer.

```tsx
const isMatch = isByCategory ? true : count === questionsPerRound;
```

**What the user sees:** All rounds green in "By Category" mode. No amber feedback about distribution imbalance.

**Rating:**

| Criterion | Score | Reason |
|-----------|-------|--------|
| User clarity | 2/5 | Hides real information. If a user has 0 questions in Round 3 (because a category has no questions), the pill still shows green. This can lead to surprising game failures. |
| Consistency | 4/5 | Same pill structure, simpler logic. |
| Simplicity | 5/5 | One line change to the match condition. No new props. |

**Verdict:** Too permissive. An empty round is a genuine problem that the user needs to see before starting the game. Saves implementation time at the cost of correctness.

---

### Q5 Option C: Replace the grid with a per-round expandable breakdown showing categories

**Description**
In "By Category" mode, replace the pill grid with a more detailed layout: one collapsible row per round that shows the round's questions broken down by category using `getCategoryBadgeClasses` pills.

```tsx
{isByCategory ? (
  <div className="space-y-2">
    {Array.from({ length: roundsCount }, (_, i) => {
      const roundQuestions = questions.filter((q) => q.roundIndex === i);
      const stats = getCategoryStatistics(roundQuestions);
      const isEmpty = roundQuestions.length === 0;
      return (
        <div
          key={i}
          className={`px-3 py-2 rounded-lg text-sm ${
            isEmpty ? 'bg-warning/10 text-warning' : 'bg-surface-elevated border border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">
              Round {i + 1}: {roundQuestions.length} question{roundQuestions.length !== 1 ? 's' : ''}
            </span>
          </div>
          {!isEmpty && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {stats.map((s) => (
                <span
                  key={s.categoryId}
                  className={`px-2 py-0.5 text-xs border rounded-full ${getCategoryBadgeClasses(s.categoryId)}`}
                >
                  {s.categoryName}: {s.questionCount}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    })}
  </div>
) : (
  /* existing pill grid unchanged */
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
    {/* ... existing code ... */}
  </div>
)}
```

**What the user sees:** Each round is a row with the total count plus a row of category badges. Empty rounds are amber. This is the richest representation — the user can see "Round 2: 4 Science, 2 History" directly.

**Rating:**

| Criterion | Score | Reason |
|-----------|-------|--------|
| User clarity | 5/5 | Full transparency about what each round contains. No surprises at game time. |
| Consistency | 4/5 | Uses `getCategoryBadgeClasses` and `getCategoryStatistics` exactly as TriviaApiImporter does. The row layout is new but built from existing atoms. |
| Simplicity | 2/5 | Significantly more JSX. Two entirely separate render paths (grid vs rows). Adds component surface area. The `getCategoryStatistics` call per round is straightforward but it is a new data dependency for this component. |

**Verdict:** Excellent for power users and completeness, but may be too much information density in a review/confirm step that should read quickly. Best suited for a future "detailed mode" toggle.

---

### Q5 Recommendation

**Primary: Option A** — mode-aware `isMatch` using `perRoundExpected`.

The review step's purpose is validation before starting the game. The green/amber signal is the correct abstraction. The only change needed is that in "By Category" mode the expected count comes from the redistribution output rather than the global setting. This is minimal, backward-compatible, and does not change the visual contract the user has already learned.

The inline `(expected N)` hint on amber pills gives the user enough information to understand a mismatch without overwhelming the layout with category breakdowns.

**Optional enhancement:** Option C can be layered on top of Option A as an expansion panel inside each amber pill. If a round's count does not match expected, an amber pill could show a "Details" link that expands the category breakdown. This keeps the default view clean while making diagnosis possible. This enhancement is independent of the primary implementation and can ship separately.

---

## Cross-cutting Observations

1. **The `perRoundExpected` array and `perRoundBreakdown` for Q1 are the same data.** The redistribution function that assigns `roundIndex` to questions produces both pieces of information. Both Q1 and Q5 should receive this data from a single upstream computation — not duplicate the derivation in each component. This points to a selector or a helper function in `lib/game/` that takes `(questions, roundsCount, isByCategory)` and returns `{ perRoundCounts: number[], categoryBreakdown: ... }`.

2. **The `Badge` component from `@joolie-boolie/ui` is NOT the right tool for category display.** Its `BadgeColor` type is semantic (`success`, `warning`, etc.), not categorical. The `getCategoryBadgeClasses` utility already handles the correct color mapping with full dark-mode support. Always use `getCategoryBadgeClasses` for category identity and `Badge` for semantic status signals.

3. **The Slider component has no `description` or `hint` prop.** Option A for Q1 correctly uses a sibling `<p>` element rather than trying to add a prop. If a Slider description prop is added to `packages/ui/src/slider.tsx`, it should pass through to `aria-describedby` on the thumb — but that is a separate ui-package change and not required for this feature.

4. **Component composition question for Step 2:** Should `isByCategory` mode conversion happen inside `WizardStepSettings` (pure presentational, receives computed props) or in the parent (`SetupGate` or `SetupWizard`)? Given that both the Q1 display and the redistribution effect live upstream, the cleanest pattern is: `WizardStepSettings` is a pure client component that receives `isByCategory`, `perRoundBreakdown`, and `roundsCount` — it does no computation. The `SetupGate` or `SetupWizard` derives the breakdown once and passes it down. This keeps `WizardStepSettings` fully testable in isolation.

5. **"By Category" mode affects step navigation gating.** Currently `SetupWizard` gates step navigation on `questions.length > 0`. In "By Category" mode, there is an additional concern: are there enough questions to fill all rounds? The review step's amber pills are the user-visible signal, but there may also need to be a minimum threshold check. That is outside the scope of Area 1 but worth flagging for the synthesis phase.
