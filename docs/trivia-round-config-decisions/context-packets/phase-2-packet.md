# Context Packet: Phase 2

## Decisions Developed

### Q1 + Q5 Shared Data (Iterator 1)
- **Type:** `PerRoundBreakdown { roundIndex, totalCount, expectedCount, isMatch, categories: { id, count }[] }`
- **Derivation:** Pure function `derivePerRoundBreakdown(questions, roundsCount, isByCategory, questionsPerRound)` — O(n) single pass, returns `roundsCount` entries (empty rounds included)
- **Location:** New file `lib/game/selectors.ts`, type alongside existing types in `types/index.ts`
- **SetupGate integration:** Single `useMemo` with deps `[questions, roundsCount, isByCategory, questionsPerRound]`
- `isMatch` is precomputed in the breakdown — no scatter-site comparisons in child components

### Q2 + Q3 Engine Contract (Iterator 2)
- **Signature:** `redistributeQuestions(state, roundsCount, questionsPerRound, mode: 'by_count' | 'by_category'): TriviaGameState`
- **Idempotency:** `.every()` scan comparing computed assignments vs current `roundIndex` values. Same reference return on match.
- **By Category algo:** First-occurrence discovery order of categories determines round slots. Deterministic, stable.
- **By Count algo:** Existing `Math.floor(index / questionsPerRound)` logic.
- **Must NOT write:** `settings.roundsCount`, `totalRounds`, `selectedQuestionIndex`
- **Only writes:** `state.questions` array with updated `roundIndex` per element
- **Edge cases:** Empty rounds surfaced (not discarded); `validateGameSetup` V3 rule blocks start

### Q1 UI Layout (Iterator 3)
- **New props:** `isByCategory`, `perRoundBreakdown: PerRoundBreakdown[]`, `onToggleByCategory: (v: boolean) => void`
- **Three render states:** (1) By Category OFF = Toggle + Rounds slider + QPR slider, (2) By Category ON + questions = Toggle + Rounds slider + category badge pills, (3) By Category ON + no questions = Toggle + Rounds slider + helper text
- **Key:** `questionsPerRound` stays in interface even when By Category ON; `perRoundBreakdown` is always `[]` not `undefined`
- Rounds slider renders in BOTH modes — changing round count in category mode is valid
- Zero store reads, zero effects, zero local state — fully presentational

### Q5 Review Grid (Iterator 4)
- **New optional props:** `isByCategory?: boolean`, `perRoundExpected?: number[]`
- **isMatch rewrite:** `expected = isByCategory ? (perRoundExpected?.[i] ?? 0) : questionsPerRound; isMatch = expected > 0 && count === expected`
- **`expected > 0` guard:** Empty rounds always amber (not false-green on 0===0)
- **Hint span:** `(expected N)` shown only when `isByCategory && !isMatch && expected > 0`
- **Backward-compatible:** Props are optional; existing call sites compile unchanged
- Grid layout, pill classes, color tokens all unchanged

### Q6 E2E Tests (Iterator 5)
- **New spec file:** `e2e/trivia/round-config.spec.ts`
- **5 concrete tests written:** toggle default ON, toggle OFF reveals QPR, review grid distribution, start game with By Category ON, startGameViaWizard regression
- **Selectors:** `getByRole('switch', { name: /by category/i })`, `getByRole('slider', { name: /number of rounds/i })`, `getByRole('slider', { name: /questions per round/i })`
- **Patterns:** `test.use({ skipSetupDismissal: true })`, gate-scoped interactions, `.toPass()` retry, zero `waitForTimeout`

## Carry-Forward Concerns
- The `mode` parameter for `redistributeQuestions` (`'by_count' | 'by_category'`) needs to be threaded from settings store through the effect call in SetupGate
- `onToggleByCategory` callback needs to be wired — either writes to settings store (if `isByCategory` is added to settings store v4) or manages local state in SetupGate
- The `perRoundBreakdown` array must be stable across renders (useMemo) to prevent child re-renders

## Artifacts (read only if needed)
- `phase-2/iterator-1-breakdown-type.md`: Type definition, derivation function, SetupGate integration
- `phase-2/iterator-2-engine-idempotency.md`: Engine contract, idempotency spec, algorithm pseudocode
- `phase-2/iterator-3-settings-props.md`: Complete props interface, JSX for all modes
- `phase-2/iterator-4-review-adaptation.md`: isMatch rewrite, hint span, backward compatibility
- `phase-2/iterator-5-e2e-code.md`: Complete Playwright spec with 5 test scenarios
