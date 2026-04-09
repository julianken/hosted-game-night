# Context Packet: Phase 3

## Synthesis Agreement (all 3 synthesizers converge on)

### Architecture
- **Single canonical type:** `PerRoundBreakdown { roundIndex, totalCount, expectedCount, isMatch, categories: RoundCategoryEntry[] }` — serves both Q1 (badge pills) and Q5 (review grid). Eliminates separate `perRoundExpected: number[]` array.
- **`isByCategory` lives in settings store v4** (not `useState` in SetupGate). Bumped from v3; Zustand merge provides default `true` for upgrading users.
- **`isByCategory` MUST be in the redistribution effect dep array** — toggling mode must trigger redistribution.
- **`derivePerRoundBreakdown` in `selectors.ts`** — not re-exported from engine barrel. Pure derivation, not engine function.
- **Build order:** Types → Engine → Store → SetupGate → Presentational leaves → Wizard threading → E2E

### Resolved Inconsistencies
- `totalCount` (not `count`) at PerRoundBreakdown top level
- `categoryId`/`questionCount` (not `id`/`count`) in RoundCategoryEntry
- No embedded display strings (categoryName, color) in type — use `getCategoryName()` and `getCategoryBadgeClasses()` at render time
- `isMatch` precomputed with `expectedCount > 0` guard — components use `breakdown[i].isMatch` directly

### Risk Findings (Synthesis 2)
- **RISK-01 (High):** `addQuestion` and `updateQuestion` also write `settings.roundsCount` — not just `importQuestions`. Need guard in redistribution to ignore these cascading writes.
- **RISK-02 (High):** Engine idempotency `.every()` scan on `roundIndex` — must handle `NaN` and `undefined` safely.
- **Mitigation for both:** Status guard in `redistributeQuestions` (only runs during setup) + the idempotent same-reference return.
- **V6 validation spurious warns** in By Category mode (compares against global `questionsPerRound`). Not a blocker — follow-on issue.

### Work Units (Synthesis 3) — 8 units
1. **WU-1:** Types (`PerRoundBreakdown`, `RoundCategoryEntry`) + `derivePerRoundBreakdown()` in selectors.ts
2. **WU-2:** `redistributeQuestions()` engine function in questions.ts + barrel export + game-store action
3. **WU-3:** Settings store v3→v4 migration (`isByCategory: boolean`)
4. **WU-4:** SetupGate orchestration (useEffect + useMemo + new props down to SetupWizard)
5. **WU-5:** WizardStepSettings redesign (Toggle + category badge pills + three render states)
6. **WU-6:** WizardStepReview adaptation (mode-aware isMatch, hint span)
7. **WU-7:** SetupWizard prop threading
8. **WU-8:** E2E tests (round-config.spec.ts)

### Parallelization
- **Wave 1 (parallel):** WU-1, WU-2, WU-3 — no dependencies between them
- **Wave 2 (sequential after wave 1):** WU-4 — depends on all of wave 1
- **Wave 3 (parallel after wave 2):** WU-5, WU-6 — both depend on WU-4
- **Wave 4 (after wave 3):** WU-7 — depends on WU-5 and WU-6
- **Wave 5 (after wave 4):** WU-8 — depends on all

## Divergences Between Synthesizers
- **Synthesis 1** focused on type shape resolution and file modification list — definitive canonical types.
- **Synthesis 2** focused on risk — found additional feedback loop sources (`addQuestion`, `updateQuestion`) not caught by Phase 1/2.
- **Synthesis 3** focused on work unit specs — complete acceptance criteria and sequencing.
- No fundamental disagreements between synthesizers.

## Artifacts (read only if needed)
- `phase-3/synthesis-1.md`: Unified architecture, data flow diagram, type resolution, 16 sections
- `phase-3/synthesis-2.md`: Risk register with severity/likelihood/mitigation for each risk
- `phase-3/synthesis-3.md`: 8 work unit specs with acceptance criteria, dependencies, agent types
