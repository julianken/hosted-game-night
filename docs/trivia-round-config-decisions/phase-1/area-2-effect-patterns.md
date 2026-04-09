# Area 2: Effect Patterns — Q2 (Trigger Timing) and Q3 (Dependency Array)

State Manager analysis. Focus: where state lives, what triggers re-computation, and how to avoid feedback loops.

---

## Evidence Base

### Files Read

- `apps/trivia/src/app/play/page.tsx` lines 108–119 — existing settings-sync effect
- `apps/trivia/src/components/presenter/SetupGate.tsx` — current store subscriptions in the gate
- `apps/trivia/src/components/presenter/WizardStepSettings.tsx` — how Slider is wired to settings
- `packages/ui/src/slider.tsx` — wrapper around react-aria-components Slider
- `node_modules/.pnpm/@react-stately+slider@3.7.3_.../src/useSliderState.ts` — the authoritative source on when onChange fires
- `apps/trivia/src/stores/settings-store.ts` — updateSetting flow and validateSetting clamping
- `apps/trivia/src/lib/game/questions.ts` — importQuestions: writes roundsCount back to game state
- `apps/trivia/src/lib/game/lifecycle.ts` lines 133–153 — updateSettings: also writes roundsCount to game state

---

## Q2: Fire on every slider onChange vs. only on value settle

### How the Slider actually fires

The `@joolie-boolie/ui` `Slider` wraps `react-aria-components` `AriaSlider`, which internally uses `@react-stately/slider` `useSliderState`. The critical path in `useSliderState.ts`:

```ts
// useSliderState.ts line 194–198
const [values, setValuesState] = useControlledState<number[]>(
  value,
  defaultValue,
  onChange   // <-- wired directly to useControlledState
);
```

`useControlledState` calls `onChange` on every `setValues` call. `setValues` is called by `updateValue`, which is called by `setThumbPercent` on every pointer move event. There is no batching, no threshold, no settle delay.

The `onChangeEnd` callback (lines 261–264 in `useSliderState.ts`) fires separately — only when dragging stops (when `setThumbDragging(index, false)` is called after pointer up). The `@joolie-boolie/ui` `Slider` component does **not** expose `onChangeEnd` — its props interface only has `onChange: (value: number) => void`.

**Measured behavior:** A user dragging the "Number of Rounds" slider from 3 to 6 will call `updateSetting('roundsCount', value)` on every integer step it snaps to. With `step={1}` and a range of 1–6, that is at most 5 calls. With `step={1}` and the timer range of 10–120, that is up to 110 calls during a single drag. Zustand `set` is synchronous and React 19 batches renders in event handlers — so these do not produce 110 individual renders, but they do produce N Zustand state snapshots and N subscriptions firing.

### Performance cost of firing on every change

The redistribution effect (wherever it lives) will run after every render that has a changed dependency. For a Slider with `step={1}`:

- **roundsCount (range 1–6):** max 5 intermediate values during a drag
- **questionsPerRound (range 3–10):** max 7 intermediate values during a drag

Each fire of `redistributeQuestions` will do array manipulation proportional to `questions.length`. For a typical question set (say 30 questions), this is cheap — O(n) array work with integer arithmetic. The cost is negligible compared to a React render.

The **only meaningful risk** from firing on every step is intermediate invalid states being visible to the user. For example, if the user drags `questionsPerRound` from 10 down to 3, intermediate values like 7 or 5 will briefly redistribute questions. This is actually desirable: the live preview updates as the thumb moves, giving the user instant feedback on how their questions are distributed across rounds. It mirrors how the slider value display itself updates live.

**Recommendation for Q2: Fire on every onChange. Do not debounce.**

Rationale:
1. The performance cost is trivial — integer arithmetic on a small array, not a network request.
2. Live redistribution preview during drag is a better UX than a stale preview that snaps at release.
3. There is no `onChangeEnd` prop available on the current `Slider` without modifying `packages/ui/src/slider.tsx`. Adding it requires exposing a new prop and threading it through. That is additional scope with no benefit given the negligible cost.
4. The existing settings-sync effect in `play/page.tsx` (lines 108–119) fires on every `roundsCount` and `questionsPerRound` change with no debounce. The redistribution effect should match that established pattern.
5. `validateSetting` in the settings store already clamps values before writing to Zustand state, so no invalid numeric value ever reaches the effect.

If profiling later reveals a render budget problem (unlikely for a setup wizard), the correct fix is to add `onChangeEnd` to the `Slider` component API rather than debouncing in a useEffect — effect-level debouncing with `useRef` + `setTimeout` introduces cleanup complexity and can leave stale timers on unmount.

---

## Q3: Exact dependency array for the redistribution useEffect

### What the effect depends on

The purpose of `redistributeQuestions` is: given the current pool of questions in game state and the current `roundsCount` + `questionsPerRound` settings, rewrite the `roundIndex` on each question to reflect the new distribution, then write the result back to game store state — **without touching `roundsCount` in game state** (the key constraint that prevents the feedback loop).

The effect must run when any of its inputs change. The inputs are:

1. `roundsCount` — from settings store. Changing this changes how many rounds questions are spread across.
2. `questionsPerRound` — from settings store. Changing this changes how many questions per round.
3. `questions` (the array reference from game store) — the pool being redistributed. If the user imports a new question set or adds/removes questions, the pool changes and must be re-redistributed with the current settings.

The effect must **not** include anything that `redistributeQuestions` itself writes back. Since `redistributeQuestions` is a separate engine function that only reassigns `roundIndex` values on questions (and does NOT call `importQuestions`, does NOT write `roundsCount` back to game state), the only game store write it makes is to `questions` — specifically the `roundIndex` field on each question.

This creates a potential loop: the effect reads `questions`, redistribution writes `questions`, which changes the `questions` reference, which re-triggers the effect. The guard against this is **referential stability**: if the redistribution produces the same logical distribution (same `roundIndex` values for each question), the engine should return the existing state object unchanged (`return state` early-exit), which means Zustand will not update the store, which means the `questions` selector will return the same reference, which means the effect will not re-fire.

This requires that the engine implement a stable-identity check: compare the incoming questions' `roundIndex` values against what redistribution would compute, and short-circuit if nothing changed. This is a standard derived state pattern — the engine function is the single source of truth and its output must be idempotent given the same inputs.

**Given the constraint that `redistributeQuestions` does NOT call `importQuestions` and does NOT rewrite `roundsCount`**, the feedback loop is contained. The dependency array is:

```ts
useEffect(() => {
  if (questions.length === 0) return;
  useGameStore.getState().redistributeQuestions(roundsCount, questionsPerRound);
}, [questions, roundsCount, questionsPerRound]);
```

### Rationale for each dependency

**`questions`** — must be included. The redistribution operates on the current question pool. If the user imports a different question set while `roundsCount` and `questionsPerRound` are unchanged, the effect must still run to assign `roundIndex` to the new questions. Omitting this would mean newly imported questions sit with stale `roundIndex` values until the user touches a slider.

**`roundsCount`** — must be included. The primary trigger. When the user moves the Rounds slider, redistribution must recompute.

**`questionsPerRound`** — must be included. Changing questions-per-round changes the packing of questions into rounds, so redistribution must recompute.

**`game.status` guard** — not needed here. `SetupGate` only renders during `status === 'setup'` (the conditional in `play/page.tsx` line 576: `{game.status === 'setup' && <SetupGate ... />}`). The component is unmounted when status leaves setup, so the effect is automatically cleaned up. No explicit status guard is required inside the effect body. This contrasts with the effect in `play/page.tsx` lines 108–119, which persists across all statuses and therefore needs `if (game.status === 'setup')`.

**`useGameStore.getState().redistributeQuestions`** — this is a store action reference, not a reactive value. It is stable for the lifetime of the store. Do not include it in the dependency array. Use the escape-hatch pattern (call via `useGameStore.getState()`) as the existing codebase does in `play/page.tsx` lines 110, 182, 183. This avoids adding a selector that would subscribe the component to irrelevant store updates.

### The early-exit guard

The `questions.length === 0` guard before calling `redistributeQuestions` is important. If no questions have been imported yet, there is nothing to redistribute. Calling the engine with an empty array is a no-op by definition, but the explicit guard makes intent clear and avoids any edge case in the engine's `Math.max(...[])` computations (which return `-Infinity` on empty arrays in `questions.ts` line 63).

### Where the effect should live

The effect belongs in `SetupGate`, not in `play/page.tsx`. The redistribution is a setup-phase concern — it is the gate's job to keep game state consistent with the wizard's current settings. Placing it in `play/page.tsx` would mix setup logic into the gameplay coordinator, which already has the `game.status === 'setup'` guard burden on its existing settings-sync effect.

`SetupGate` already reads `roundsCount`, `questionsPerRound`, and `questions` from their respective stores (lines 22–38 of `SetupGate.tsx`). The effect is a natural addition alongside those existing subscriptions.

### Summary

```ts
// In SetupGate, alongside existing store subscriptions:
const questions = useGameStore((state) => state.questions);
const { roundsCount, questionsPerRound } = useSettingsStore();

useEffect(() => {
  if (questions.length === 0) return;
  useGameStore.getState().redistributeQuestions(roundsCount, questionsPerRound);
}, [questions, roundsCount, questionsPerRound]);
```

Three dependencies. No status guard. No debounce. No `useRef` timer. Fires on every slider step and on every question pool change. The feedback loop is prevented entirely by the engine's idempotent short-circuit, not by the effect's dependency array.

---

## Connection to the Feedback Loop Risk

The analysis identifies the loop: `redistributeQuestions → importQuestions → overwrites roundsCount → triggers effect again`. The dependency array above assumes `redistributeQuestions` is the new engine function that:

1. Does NOT call `importQuestions`
2. Does NOT write `settings.roundsCount` back to game state
3. Only reassigns `question.roundIndex` values
4. Returns state identity unchanged if the distribution is already correct

If those constraints hold, `roundsCount` in game state never changes as a result of redistribution, and the settings store `roundsCount` (the dependency) is only changed by user slider interaction. The loop cannot form.

If a future implementer is tempted to call `importQuestions` from within `redistributeQuestions`, they must understand that `importQuestions` (in `questions.ts` lines 66–76) writes `roundsCount: totalRounds` back into `state.settings`. That write would propagate back to the dependency via the `questions` selector change, creating the loop. The separation of these two engine functions is the architectural invariant that makes the effect pattern safe.
