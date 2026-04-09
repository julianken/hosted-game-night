# Iterator 2: Gating UX Feedback — How Does the Presenter Know?

## Files Read

- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/SceneNavButtons.tsx`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/hooks/use-nav-button-labels.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/NextActionHint.tsx`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/presenter/nav-button-labels.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/presenter/next-action-hints.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/RoundScoringPanel.tsx`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/__tests__/SceneNavButtons.test.tsx`
- `/Users/j/repos/beak-gaming-platform/packages/ui/src/toast.tsx`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/layout.tsx`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/hooks/use-game-keyboard.ts` (relevant sections)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/game-store.ts` (relevant sections)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/scene.ts` (round_scoring case)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/presenter/__tests__/nav-button-labels.test.ts`

---

## Finding 1: SceneNavButtons disabled mechanism — two tiers, well understood

`SceneNavButtons.tsx:26` computes `forwardDisabled` as:

```
const forwardDisabled = labels.forward === null || labels.forward.disabled;
```

This means the forward button has two independent disable states:

- **Structural null** (`labels.forward === null`): button renders with no label text, icon-only, `disabled` attribute set. Used for terminal scenes (`final_podium`, `paused`, `emergency_blank`). The `aria-label` fallback "Forward" fires (`SceneNavButtons.tsx:122`).
- **Transient disabled** (`labels.forward.disabled === true`): button renders WITH its label text visible, but is `disabled`. The text is still visible; only clicks and pointer events are suppressed. CSS applies `opacity-[0.38]`, `cursor-not-allowed`, `pointer-events-none`.

The reveal-lock pattern uses the transient form: the button text ("Next Answer") stays visible at 38% opacity, signaling to the presenter that the action exists but is momentarily unavailable. This is the correct model to adopt for the submission gate — the label should remain visible and legible.

**Implication:** For the submission gate, use `disabled: true` (not `null`). The presenter sees the button text at 38% opacity, which signals "this action exists, but not yet."

---

## Finding 2: NavButtonState.disabled field — currently only used for reveal lock

`use-nav-button-labels.ts:71-79`:

```typescript
const isRevealLocked = revealPhase !== null && audienceScene === 'answer_reveal';

const forward: NavButtonLabelsResult['forward'] =
  labels.forward === null
    ? null
    : {
        text: labels.forward,
        disabled: isRevealLocked,
      };
```

The `disabled` field is computed entirely in the hook layer, not in `getNavButtonLabels()`. The pure function returns strings only; disabling logic lives in `useNavButtonLabels`. This is the correct layer to add the submission gate check — no change to `nav-button-labels.ts` is needed.

The hook currently subscribes to `{ audienceScene, revealPhase, recapShowingAnswer, isLastQuestion, isLastRound }`. Adding a submission gate requires subscribing to `roundScoringSubmitted` from game state in this same `useShallow` selector.

Proposed change to `useNavButtonLabels`:

```typescript
const isSubmissionGated =
  audienceScene === 'round_scoring' && !roundScoringSubmitted;

const forward = labels.forward === null
  ? null
  : { text: labels.forward, disabled: isRevealLocked || isSubmissionGated };
```

The existing `disabled: boolean` field absorbs both conditions with a simple OR.

---

## Finding 3: Forward label for round_scoring should change when gated

Currently `nav-button-labels.ts:95-96` returns `'Review Answers'` unconditionally. When scores are not yet submitted, "Review Answers" is misleading — it implies the action is available. Two options:

**Option A — Label change based on submission state**: Gate adds `roundScoringSubmitted` to `NavLabelContext` and `getNavButtonLabels` returns `'Submit Scores First'` or `'Enter Scores to Continue'` when unsubmitted. This makes the label itself instructional.

**Option B — Label stays, button disabled**: Keep `'Review Answers'`, set `disabled: true`. The 38% opacity button with visible text signals "proceed once done." No change to `nav-button-labels.ts`.

**Recommendation: Option B.** The RoundScoringPanel is visually dominant in the center panel (per Phase 1 layout findings). The presenter's attention is on the panel, not the nav button. The disabled button serves as a secondary confirmation, not the primary guide. Making the label dynamic adds complexity (new context field, new test cases) for marginal benefit. The hint text (Finding 5) covers the instructional need.

However, there is a case for a label change: if the button label dynamically reads `'Submit Scores'` while unsubmitted, it directly tells the presenter what to do next. This makes the nav button itself instructional without requiring them to read the hint. The tradeoff is that it implies the nav button does the submitting (it does not — the Done button does). This could cause confusion.

**Final recommendation: Option B.** Keep `'Review Answers'`, apply `disabled: true`. The label is accurate (when enabled, it does go to review), and the hint text covers the "what to do" message.

---

## Finding 4: NextActionHint can change per submission state — but is structurally limited

`NextActionHint.tsx:17-18`:

```typescript
const audienceScene = useGameStore((state) => state.audienceScene ?? 'waiting');
const hint = NEXT_ACTION_HINTS[audienceScene];
```

The hint is a static lookup keyed only on `audienceScene`. It does not react to sub-scene state. The current hint for `round_scoring` is:

```
'Enter scores in sidebar. Right Arrow to advance, Left Arrow to go back. Enter is blocked.'
```

This is already outdated (sidebar has moved to center panel per Phase 1 decisions). More importantly, it references "Right Arrow to advance" which would mislead the presenter when the gate is active.

Two approaches:

**Option A — Keep static lookup, update string.** Change the hint to:
```
'Enter scores for all teams, then press Done. Left Arrow to go back.'
```
This removes the "Right Arrow" reference (avoiding confusion when the button is disabled), and focuses on the Done button as the primary action. The hint applies equally before and after submission.

**Option B — Make NextActionHint state-aware.** Subscribe to both `audienceScene` and `roundScoringSubmitted`, conditionally return different text. Requires component change from static lookup to conditional logic.

**Recommendation: Option A.** The hint's purpose is to orient the presenter, not to be a real-time status indicator. "Enter scores for all teams, then press Done" remains accurate regardless of submission state — it tells you what to do. The `aria-live="polite"` region will announce this text when the scene is entered. No second live announcement is needed when submission state changes (the Done button's own state change is sufficient feedback).

---

## Finding 5: Toast exists in the app and is correctly set up — but is wrong UX for this gate

`apps/trivia/src/app/layout.tsx:51`: `ToastProvider` wraps the entire app at root level.

The `@joolie-boolie/ui` `Toast` component (`packages/ui/src/toast.tsx`) provides:
- `useToast()` hook with `success`, `error`, `info`, `warning` methods
- Auto-dismiss with progress bar (default 5000ms)
- `aria-live="assertive"` on each toast item
- Position variants including `top-right` (default)

The `PresetSelector`, `SavePresetModal`, `TemplateSelector` etc. all use `useToast()` for async operation feedback (load success, save error). The pattern is well established.

**However, toast is the wrong pattern for a navigation gate.** Reasons:

1. **Toast is for async events** (save succeeded, load failed). Navigation gates are synchronous UI constraints. Toasting "You must submit scores first" every time the presenter presses ArrowRight would be noisy and feel like an error, not a guidance system.

2. **The gate fires on every key press.** ArrowRight key handling goes through `handleForward()` in `SceneNavButtons.tsx`, which calls `store.advanceScene('advance')`. With gating at the orchestrator, this call returns `false`. If a toast fired on every `false` return, rapid keypresses could stack multiple toasts.

3. **The disabled button IS the feedback.** A visually-disabled forward button at 38% opacity is clear, immediate, and non-intrusive. It requires no new component infrastructure.

4. **There is no existing precedent for toasting blocked actions.** The reveal-lock pattern silently disables the button — no toast. This app uses toast only for async CRUD results.

**Conclusion: Do not use toast for the submission gate.** The disabled button + updated hint text is sufficient.

---

## Finding 6: N key path needs the same gate — and should also be silent

`use-game-keyboard.ts:225-236`: The N key dispatches `SCENE_TRIGGERS.NEXT_ROUND` from `round_scoring`. This skips the entire recap AND the score review in one keypress. With the orchestrator-level gate (Phase 1, Finding 5), `orchestrateSceneTransition` returns `null` for any `ADVANCEMENT_TRIGGERS` when `!roundScoringSubmitted`. `NEXT_ROUND` is in `ADVANCEMENT_TRIGGERS`.

The keyboard handler currently does not check return value or show any feedback. `store.advanceScene()` returns `boolean` but the keyboard handler ignores it (checked: `use-game-keyboard.ts` calls `store.advanceScene(SCENE_TRIGGERS.NEXT_ROUND)` with no assignment).

For the N key, the same "silent rejection" is appropriate. The presenter is looking at the scoring panel; the disabled forward button catches their attention if they also try ArrowRight. A toast for N-key blocking would be especially jarring since N is a shortcut they might use from habit. The updated hint text ("Enter scores for all teams, then press Done") tells them the correct action.

If additional UX reinforcement is desired for N key specifically, the `NEXT_ACTION_HINTS` string can note "N key requires scores to be submitted first" — but this adds length and complexity to a hint that should stay one line.

**Recommendation: silent rejection for N key, no toast.**

---

## Finding 7: The Done button already has partial visual feedback — extend it

`RoundScoringPanel.tsx:285-309`: The Done button currently changes visual appearance based on `allEntered`:

```tsx
background: allEntered ? 'var(--primary)' : 'var(--surface-elevated)',
color: allEntered ? 'var(--primary-foreground)' : 'var(--foreground)',
borderWidth: allEntered ? '0' : '1px',
```

When `allEntered` is false, the Done button appears as a muted outline button. When all scores are entered, it fills with primary color. This is a good inline affordance — the presenter can see "button is active, I'm ready to proceed."

The Done button is **always clickable** — it zero-fills missing entries and calls `onSubmitScores`. This is the existing behavior from Phase 1 findings. The button is the submission gate's unlock mechanism, and it is always available.

This means: even if the presenter hasn't filled in all fields, clicking Done submits zeros and unlocks forward navigation. The visual distinction (`allEntered` styling) is a hint about completeness, not a hard lock.

This is acceptable behavior to keep. The gate question is specifically about forward nav from `round_scoring`, not about preventing incomplete score submission.

---

## Summary: Recommended UX Pattern

The complete gating UX for `round_scoring` forward navigation is:

1. **Forward button**: Disabled (`disabled: true`, not `null`) when `roundScoringSubmitted === false`. Text label `'Review Answers'` remains visible at 38% opacity. No label change needed. The button becomes fully enabled (primary color, clickable) immediately when `setRoundScores()` fires.

2. **NextActionHint**: Update static string for `round_scoring` from the current sidebar-referencing text to:
   `'Enter scores for all teams, then press Done. Left Arrow to go back.'`
   This removes the "Right Arrow to advance" instruction (which would mislead while button is disabled) and focuses on the Done button as the correct action.

3. **N key**: Silent rejection via orchestrator gate. No toast, no special UI treatment.

4. **Toast**: Not used for gate feedback. No ToastProvider changes needed.

5. **Done button**: No change to `RoundScoringPanel`. Its existing styling differential (`allEntered` primary fill) is sufficient affordance. `handleRoundScoresSubmitted` in `page.tsx` calls `setRoundScores()` which sets `roundScoringSubmitted: true` — this is the unlock event.

6. **Back button**: No gating. Back to `round_summary` is always allowed regardless of submission state (correctly — you should be able to leave without submitting). The back button label `'Round Summary'` already exists and is correct.

---

## Implementation Touch Points for Gating UX

These are the files that need changes to implement the complete gating UX:

- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/hooks/use-nav-button-labels.ts` — add `roundScoringSubmitted` to `useShallow` selector, add `isSubmissionGated` condition to `forward.disabled`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/presenter/next-action-hints.ts` — update `round_scoring` hint string
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/presenter/nav-button-labels.ts` — no change needed (label stays `'Review Answers'`)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/SceneNavButtons.tsx` — no change needed (disabled rendering already handles both null and true)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/NextActionHint.tsx` — no change needed (static lookup picks up the updated string automatically)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/RoundScoringPanel.tsx` — no change needed

The state machine gate (`orchestrateSceneTransition`) and the `roundScoringSubmitted` flag are the Phase 1 concern. This document covers only the UX feedback layer above that.

---

## Confidence Assessment

| Finding | Confidence | Basis |
|---------|------------|-------|
| Disabled button is correct feedback model (not toast) | High | No precedent for blocking-action toasts in app; reveal-lock is silent; toast pattern is async-only |
| `NavButtonState.disabled` field absorbs gate condition | High | Existing field, existing OR-able pattern from reveal lock |
| Label stays `'Review Answers'` (no change) | High | Instructional gap covered by hint; dynamic label would imply button does the submitting |
| NextActionHint static update is sufficient | High | Component re-renders on scene entry; hint already has `aria-live="polite"` |
| N key stays silent (no toast) | High | Keyboard handler ignores return value; toast would stack on repeated presses |
| Done button needs no change | High | Already has visual completeness affordance; always-clickable is correct existing behavior |
| Back button needs no gating | High | Back to `round_summary` should always be allowed |

Now let me write this to the file. Since I don't have a bash/write tool, I'll present the content clearly so it can be saved. Actually, looking at the task instructions again — the task says "Write findings to" that path. Let me check whether there might be another way.

Looking at my available tools: Glob, Grep, Read, WebFetch, WebSearch. There is no Write tool. I'll present the document content in full below, clearly delimited, so it can be written to the target path.

---

The document content to write to `/Users/j/repos/beak-gaming-platform/docs/trivia-round-scoring-ux/phase-2/iterator-2-gating-ux.md`:

```markdown
# Iterator 2: Gating UX Feedback — How Does the Presenter Know?

**Phase:** 2 — Iterator 2
**Date:** 2026-03-10
**Scope:** How presenter UI communicates the submission gate for `round_scoring` forward navigation

---

## Context

Phase 1 established that gating belongs in `orchestrateSceneTransition()`, returning `null` for advancement triggers when `roundScoringSubmitted === false`. This document answers the complementary question: how does the presenter know they are gated, and what should change in the UI to communicate that?

---

## Files Read

- `apps/trivia/src/components/presenter/SceneNavButtons.tsx`
- `apps/trivia/src/hooks/use-nav-button-labels.ts`
- `apps/trivia/src/components/presenter/NextActionHint.tsx`
- `apps/trivia/src/lib/presenter/nav-button-labels.ts`
- `apps/trivia/src/lib/presenter/next-action-hints.ts`
- `apps/trivia/src/components/presenter/RoundScoringPanel.tsx`
- `apps/trivia/src/components/presenter/__tests__/SceneNavButtons.test.tsx`
- `packages/ui/src/toast.tsx`
- `apps/trivia/src/app/layout.tsx`
- `apps/trivia/src/hooks/use-game-keyboard.ts` (relevant sections)
- `apps/trivia/src/stores/game-store.ts` (relevant sections)
- `apps/trivia/src/lib/game/scene.ts` (round_scoring case)
- `apps/trivia/src/lib/presenter/__tests__/nav-button-labels.test.ts`

---

## Finding 1: SceneNavButtons has two distinct disabled tiers — use the right one

`SceneNavButtons.tsx:26`:
```typescript
const forwardDisabled = labels.forward === null || labels.forward.disabled;
```

**Tier 1 — Structural null** (`labels.forward === null`): Button renders with no label text, icon-only, `disabled` attribute set. Used for terminal scenes (`final_podium`, `paused`, `emergency_blank`). The `aria-label` fallback "Forward" fires.

**Tier 2 — Transient disabled** (`labels.forward.disabled === true`): Button renders WITH its label text visible at 38% opacity (`disabled:opacity-[0.38]`), but `disabled`. The text remains legible. Used for the reveal lock on `answer_reveal`.

For the submission gate, Tier 2 is correct. The presenter sees the button label "Review Answers" at 38% opacity — signaling the action exists but is not yet available. This matches the established reveal-lock precedent and does not require hiding the button.

**Implication:** Use `disabled: true` (not `null`) for the submission gate. The button text "Review Answers" stays visible as a placeholder for what comes next.

---

## Finding 2: `NavButtonState.disabled` in `useNavButtonLabels` is the correct insertion point

`use-nav-button-labels.ts:71-79`:
```typescript
const isRevealLocked = revealPhase !== null && audienceScene === 'answer_reveal';

const forward = labels.forward === null
  ? null
  : { text: labels.forward, disabled: isRevealLocked };
```

The `disabled` field is computed in the hook, not in `getNavButtonLabels()` (pure function). No changes to `nav-button-labels.ts` are needed. The hook currently subscribes to `{ audienceScene, revealPhase, recapShowingAnswer, isLastQuestion, isLastRound }`.

To add the submission gate:
1. Add `roundScoringSubmitted` to the `useShallow` selector
2. Compute `isSubmissionGated = audienceScene === 'round_scoring' && !roundScoringSubmitted`
3. Change `disabled: isRevealLocked` to `disabled: isRevealLocked || isSubmissionGated`

The existing `disabled: boolean` field absorbs both conditions via OR. No type changes needed.

---

## Finding 3: Forward button label for `round_scoring` should NOT change

`nav-button-labels.ts:95-96` returns `'Review Answers'` unconditionally for `round_scoring`. This label is accurate: when forward navigation is enabled, it does proceed to Q&A review.

**Option A (dynamic label):** Change label to `'Submit Scores'` when `!roundScoringSubmitted`. Makes the button instructional. But: implies the nav button submits scores (it does not — the Done button does). Adds a new context field to `NavLabelContext`, new tests, increased surface area.

**Option B (static label, disabled state):** Keep `'Review Answers'`, set `disabled: true`. The 38% opacity button signals "this action is coming, not yet." The hint text (Finding 4) carries the instructional message.

**Recommendation: Option B.** The label is accurate and the disabled state is sufficient. The Done button in the scoring panel is the primary focus during `round_scoring`; the nav button is a secondary indicator. Keeping the label static avoids the misleading implication that the nav button does the submitting.

---

## Finding 4: NextActionHint static string for `round_scoring` must be updated

`next-action-hints.ts:31`:
```
round_scoring: 'Enter scores in sidebar. Right Arrow to advance, Left Arrow to go back. Enter is blocked.',
```

Two problems:
1. "In sidebar" is stale — panel has moved to center (Phase 1 decision)
2. "Right Arrow to advance" is misleading when the forward button is disabled

`NextActionHint.tsx:17-18` does a static lookup: `NEXT_ACTION_HINTS[audienceScene]`. The component subscribes only to `audienceScene` — not to `roundScoringSubmitted`. It does not need to be made state-aware.

**Recommended replacement:**
```
round_scoring: 'Enter scores for all teams, then press Done. Left Arrow to go back.',
```

This change:
- Removes the sidebar reference
- Removes the "Right Arrow" instruction (eliminating confusion when disabled)
- Focuses on the Done button as the primary action
- Remains accurate both before and after submission (scores can be re-entered before advancing)

The `aria-live="polite"` region on `NextActionHint` announces the hint text when the scene is first entered, orienting the presenter to the correct action.

**No change to `NextActionHint.tsx` itself.** Only the string in `next-action-hints.ts` changes.

---

## Finding 5: Toast is the wrong mechanism for gate feedback

**Toast is available:** `apps/trivia/src/app/layout.tsx:51` wraps the entire app with `ToastProvider`. The `useToast()` hook is used by `PresetSelector`, `SavePresetModal`, `TemplateSelector`, etc. for async CRUD results.

**Toast is wrong for this gate, for three reasons:**

1. **Toast is for async events.** Save succeeded, load failed — these are one-time outcomes of async operations. Navigation gates are synchronous UI constraints. Toasting "Submit scores first" on every ArrowRight press does not fit this pattern.

2. **The gate fires on repeated keypresses.** If the presenter holds ArrowRight or presses it multiple times, stacked toasts would appear. Even with deduplication logic, this is aggressive for a constraint the disabled button already communicates.

3. **No existing precedent.** The reveal-lock is a direct parallel: it also silently rejects `advanceScene('advance')` and relies entirely on the disabled button state. Introducing toast for one gate but not the other is inconsistent.

**Conclusion: Do not use toast for the submission gate.** The disabled button + updated hint text is sufficient.

---

## Finding 6: N key (`next_round`) gate is silent — correct

`use-game-keyboard.ts:225-236` dispatches `SCENE_TRIGGERS.NEXT_ROUND` from `round_scoring` with no return value check. The keyboard handler ignores the boolean returned by `store.advanceScene()`.

With the orchestrator gate in place (`orchestrateSceneTransition` returns `null` for `ADVANCEMENT_TRIGGERS` when `!roundScoringSubmitted`), the N key silently does nothing. No toast, no hint change, no keyboard handler modification needed.

`NEXT_ROUND` is in `ADVANCEMENT_TRIGGERS` (confirmed: `scene-transitions.ts` uses `Set(['advance', 'skip', 'next_round', 'close'])`), so the gate catches it automatically.

The updated NextActionHint text does not mention N key for `round_scoring` — removing the stale "Right Arrow" reference implicitly removes the suggestion to skip via keyboard. The N key already had no explicit mention in the current hint.

---

## Finding 7: Done button visual affordance is already correct — no change needed

`RoundScoringPanel.tsx:285-309`: Done button visual state changes based on `allEntered`:

- `allEntered === false`: muted outline button (surface-elevated background, border, foreground text)
- `allEntered === true`: filled primary button (primary background, primary-foreground text)

The Done button is **always clickable** — it zero-fills missing entries. This is existing, intentional behavior.

This provides an inline completeness affordance: the presenter can see the button "light up" as they fill in scores. The gate is about forward navigation from the scene, not about preventing incomplete submission — so this design is correct to keep unchanged.

The `aria-label` on Done is dynamic:
- `allEntered`: `'Submit scores and advance'`
- `!allEntered`: `'Submit scores (X of N entered)'`

This gives screen reader users progress feedback without any additional implementation.

---

## Recommended UX Pattern (Complete)

| Element | State: scores NOT submitted | State: scores submitted |
|---------|---------------------------|------------------------|
| Forward button label | `'Review Answers'` (38% opacity, disabled) | `'Review Answers'` (full opacity, clickable) |
| Forward button `disabled` | `true` | `false` |
| Back button | `'Round Summary'` (always enabled) | `'Round Summary'` (always enabled) |
| NextActionHint | `'Enter scores for all teams, then press Done. Left Arrow to go back.'` | (same, scene hasn't changed) |
| N key | Silent rejection (orchestrator gate) | Allowed |
| Toast | Not used | Not used |
| Done button | Outline style, always clickable | Primary fill, always clickable |

---

## Implementation Touch Points (UX Layer Only)

Files requiring changes for the UX feedback layer:

| File | Change |
|------|--------|
| `apps/trivia/src/hooks/use-nav-button-labels.ts` | Add `roundScoringSubmitted` to `useShallow` selector; add `isSubmissionGated` to `forward.disabled` OR |
| `apps/trivia/src/lib/presenter/next-action-hints.ts` | Update `round_scoring` hint string (remove sidebar ref and Right Arrow mention) |

Files confirmed requiring NO change for UX layer:

| File | Reason |
|------|--------|
| `apps/trivia/src/lib/presenter/nav-button-labels.ts` | Label stays `'Review Answers'`; no context change |
| `apps/trivia/src/components/presenter/SceneNavButtons.tsx` | Existing disabled rendering handles both null and true |
| `apps/trivia/src/components/presenter/NextActionHint.tsx` | Static lookup picks up updated string automatically |
| `apps/trivia/src/components/presenter/RoundScoringPanel.tsx` | Done button unchanged |
| `apps/trivia/src/hooks/use-game-keyboard.ts` | N key silent rejection via orchestrator, no handler change |
| `packages/ui/src/toast.tsx` | Not used for gate feedback |

---

## Confidence Assessment

| Finding | Confidence | Basis |
|---------|------------|-------|
| Disabled button (Tier 2) is correct feedback model | High | Reveal-lock is identical pattern; both use transient disabled with visible text |
| Toast is wrong for this gate | High | No blocking-action toast precedent in app; gate fires on keypresses not async ops |
| `NavButtonState.disabled` OR-composition | High | Existing field, existing reveal-lock pattern to mirror |
| Label stays `'Review Answers'` | High | Accurate when enabled; dynamic label implies button does submitting |
| NextActionHint static update is sufficient | High | Component re-renders on scene entry; `aria-live="polite"` announces to screen readers |
| N key stays silent | High | Keyboard handler ignores return value; toast would stack |
| Done button needs no change | High | Already has visual completeness affordance; always-clickable is correct |
| Back button needs no gating | High | Leaving scoring without submitting must always be allowed |
```

---

Here is a summary of the key findings for your reference:

**SceneNavButtons disabled tiers.** The component has two separate disabled states: structural null (button is icon-only, no action exists) and transient `disabled: true` (button text visible at 38% opacity, action temporarily blocked). The reveal-lock uses the transient form. The submission gate should use the same form — "Review Answers" remains visible at 38% opacity, signaling the destination exists but is not yet reachable.

**`useNavButtonLabels` is the correct insertion point.** The `disabled` field on `NavButtonState` is computed in the hook layer, not in the pure `getNavButtonLabels()` function. Adding `roundScoringSubmitted` to the `useShallow` selector and OR-composing `isSubmissionGated` into `forward.disabled` mirrors the reveal-lock pattern exactly. No type changes are needed.

**Label stays "Review Answers".** A dynamic label like "Submit Scores" would imply the nav button does the submitting — it doesn't, the Done button does. Option B (static label, disabled state) is cleaner and avoids that confusion. The hint text carries the instructional message instead.

**NextActionHint string update is the one instructional change.** The current string references "sidebar" (stale) and "Right Arrow to advance" (misleading when disabled). Recommended replacement: `'Enter scores for all teams, then press Done. Left Arrow to go back.'`

**Toast is wrong here.** The gate fires synchronously on every keypress. No blocking-action toast precedent exists in the app. The reveal-lock is a direct parallel and uses silent rejection. The disabled button is sufficient feedback.

**N key is silent — correct.** The keyboard handler ignores the return value of `advanceScene()`. The orchestrator gate catches `next_round` the same way it catches `advance`. No handler change or toast needed.

**Done button needs no change.** Its existing `allEntered` styling differential already provides inline completeness affordance. It is always clickable (zero-fills), which is correct — the gate governs forward navigation, not score submission completeness.

Essential files for understanding this feature area:

- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/SceneNavButtons.tsx`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/hooks/use-nav-button-labels.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/presenter/nav-button-labels.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/presenter/next-action-hints.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/NextActionHint.tsx`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/RoundScoringPanel.tsx`
- `/Users/j/repos/beak-gaming-platform/packages/ui/src/toast.tsx`