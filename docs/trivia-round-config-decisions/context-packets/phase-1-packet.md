# Context Packet: Phase 1

## Decisions Made
- **Q1 (QPR Display):** Use category badge breakdown (Option B) — replace QPR slider with `getCategoryBadgeClasses` pills showing per-category counts when `isByCategory` is ON. Empty state: "No questions loaded yet" helper text.
- **Q2 (Trigger):** Fire redistribution on every slider onChange. No debounce. Performance cost is trivial (integer arithmetic on small arrays). Live preview is better UX.
- **Q3 (Dependencies):** `[questions, roundsCount, questionsPerRound]`. Effect lives in SetupGate. No status guard needed (SetupGate only mounts during setup). Feedback loop prevented by engine idempotency.
- **Q4 (Preset Schema):** NO — do not add `isByCategory` to preset DB table. It's a global preference persisted in localStorage. Preset loads preserve the user's current mode.
- **Q5 (Review Grid):** Mode-aware `isMatch` using `perRoundExpected: number[]` (Option A). In "By Category" mode, `expected = perRoundExpected[i]`. Same green/amber pill structure. Amber pills show `(expected N)` hint.
- **Q6 (E2E):** 10 test scenarios defined — 9 must-have, 1 nice-to-have. Tests cover toggle default state, toggle interactions, slider behavior, review grid redistribution, game start in both modes, helper regression, accessibility.

## Key Data
- `perRoundExpected` (Q5) and `perRoundBreakdown` (Q1) are outputs of the SAME redistribution computation — must be derived once upstream in SetupGate
- Dependency array has 3 items; idempotent engine short-circuit prevents feedback loop
- Preset schema change would touch 9 files + production ALTER TABLE — deferred
- E2E selector strategy: prefer `getByRole`/`getByLabel` over test IDs

## Carry-Forward Concerns
- The redistribution engine function must be idempotent (return same state reference when distribution unchanged) — this is the architectural invariant the entire effect pattern relies on
- `perRoundBreakdown` prop shape needs to be defined — both Q1 and Q5 depend on it; suggest a shared type in `types/index.ts`
- The `Slider` component has no `onChangeEnd` prop — if future profiling shows a need, that's a `packages/ui` change, not a debounce hack

## Artifacts (read only if needed)
- `phase-1/area-1-ui-display.md`: Q1/Q5 options with code examples and ratings
- `phase-1/area-2-effect-patterns.md`: Q2/Q3 detailed analysis with react-aria internals
- `phase-1/area-3-preset-schema.md`: Q4 decision with 5-point rationale and behavioral spec
- `phase-1/area-4-e2e-strategy.md`: Q6 with 10 test scenarios, selectors, wait patterns
- `phase-1/area-5-interactions.md`: Cross-question dependency matrix and shared data analysis
