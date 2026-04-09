# Area 4: Test Strategy for `round_scoring` Changes

## Investigation Summary

Files read:
- `apps/trivia/src/stores/__tests__/round-scoring-store.test.ts` — existing store tests
- `apps/trivia/src/lib/game/__tests__/round-scoring-scenes.test.ts` — existing scene transition tests
- `apps/trivia/src/lib/game/__tests__/scene.test.ts` — full scene machine tests
- `apps/trivia/src/lib/game/__tests__/scene-transitions.test.ts` — transition side effect tests
- `e2e/trivia/presenter.spec.ts` — existing E2E (no round_scoring coverage)
- `e2e/trivia/dual-screen.spec.ts` — existing E2E (no round_scoring coverage)

---

## Current Coverage

### Existing tests (Vitest)

| Test file | What it covers | round_scoring? |
|-----------|---------------|----------------|
| `round-scoring-store.test.ts` | `setRoundScores` store action — applies scores to teams, generates scoreDeltas | Yes — happy path only (submit + verify) |
| `round-scoring-scenes.test.ts` | `getNextScene('round_scoring', ...)` for advance, skip, next_round | Yes — forward transitions only, no back |
| `scene.test.ts` | Full scene machine exhaustiveness | Covers `round_scoring` forward transitions |
| `scene-transitions.test.ts` | Side effects on scene entry (roundScoringInProgress, roundScoringEntries) | Yes — entry side effects |

### Existing tests (E2E / Playwright)

Zero E2E files reference `round_scoring`. The `e2e/trivia/presenter.spec.ts` tests game setup and basic flow but does not reach the between-rounds scoring phase. No Playwright test exercises the scoring UI.

### Coverage gaps

1. **Advance-without-save path** — no test verifies that advancing past `round_scoring` via ArrowRight or N key preserves quick-score data and does NOT call `setRoundScores`
2. **Pre-fill behavior** — no test verifies that entries initialize from `team.roundScores[currentRound]`
3. **Keyboard conflicts during `round_scoring`** — no test verifies Enter behavior, Ctrl+Z scoping, or ArrowLeft behavior
4. **Back navigation** — no test exists (transition doesn't exist yet)
5. **Multi-round scoring** — no test verifies that `roundScores` array accumulates correctly across 2+ rounds

---

## Recommended Test Strategy: All Vitest, P0 Before Implementation

### Why Vitest, not Playwright E2E

1. **Speed:** Vitest store tests run in <1s. Playwright tests require a build + server startup (30-60s overhead).
2. **Precision:** The behaviors being tested are state machine transitions, store actions, and initialization logic — all testable at the unit/integration level without a browser.
3. **Reliability:** Vitest tests are deterministic. E2E tests for keyboard interactions and component state are flakier.
4. **The critical behaviors are in pure functions:** `getNextScene()`, `setRoundScores()`, `buildSceneUpdate()` are all pure functions or Zustand store actions testable without React rendering.

### Test tiers

| Tier | Layer | Tool | When to write |
|------|-------|------|--------------|
| **P0** | Store integration | Vitest | Before any code changes (document current behavior) |
| **P1** | Component unit | Vitest + Testing Library | After pre-fill and navigation changes |
| **P2** | E2E smoke | Playwright | After all changes merged, covers full scoring flow |

---

## P0 Tests: 5 Integration Tests (Vitest Store Tests)

These tests exercise the Zustand store directly (no React rendering). They document the intended behavior BEFORE implementation changes. Write them first, expect some to fail against the current code (those failures confirm the gaps we're about to fix).

### Test 1: Advance-without-save preserves quick-score data

**File:** `apps/trivia/src/stores/__tests__/round-scoring-store.test.ts`

```ts
it('should preserve quick-score data when advancing past round_scoring without clicking Done', () => {
  const teams = setupGameInRoundScoring();

  // Simulate quick-score during question phase
  const store = useGameStore.getState();
  store.adjustTeamScore(teams[0].id, 1);  // +1 for team 0
  store.adjustTeamScore(teams[1].id, 1);  // +1 for team 1

  // Advance past round_scoring without calling setRoundScores
  store.advanceScene('advance');

  // Verify quick-score data persists in roundScores
  const state = useGameStore.getState();
  const t0 = state.teams.find(t => t.id === teams[0].id)!;
  const t1 = state.teams.find(t => t.id === teams[1].id)!;
  expect(t0.roundScores[0]).toBe(1);
  expect(t1.roundScores[0]).toBe(1);
});
```

### Test 2: setRoundScores overwrites quick-score data (destructive)

```ts
it('should overwrite quick-score data when Done is clicked with panel entries', () => {
  const teams = setupGameInRoundScoring();
  const store = useGameStore.getState();

  // Quick-score: +2 for team 0
  store.adjustTeamScore(teams[0].id, 1);
  store.adjustTeamScore(teams[0].id, 1);

  // Panel submit: set team 0 to 5
  store.setRoundScores({
    [teams[0].id]: 5,
    [teams[1].id]: 0,
    [teams[2].id]: 0,
  });

  const state = useGameStore.getState();
  const t0 = state.teams.find(t => t.id === teams[0].id)!;
  expect(t0.roundScores[0]).toBe(5);  // Panel overwrites quick-score
});
```

### Test 3: scoreDeltas correctness per exit path

```ts
it('should produce correct scoreDeltas when setRoundScores is called', () => {
  const teams = setupGameInRoundScoring();
  const store = useGameStore.getState();

  store.setRoundScores({
    [teams[0].id]: 3,
    [teams[1].id]: 1,
    [teams[2].id]: 0,
  });

  const state = useGameStore.getState();
  expect(state.scoreDeltas).toBeDefined();
  // Verify deltas match the submitted scores
});
```

### Test 4: Back transition returns to recap_qa (NEW — will fail until implemented)

**File:** `apps/trivia/src/lib/game/__tests__/round-scoring-scenes.test.ts`

```ts
it('should transition from round_scoring to recap_qa on back', () => {
  const next = getNextScene('round_scoring', 'back', defaultCtx);
  expect(next).toBe('recap_qa');
});
```

### Test 5: Multi-round scoring accumulation

```ts
it('should accumulate roundScores across multiple rounds', () => {
  // Setup: 2 rounds, 1 question each
  // Round 1: setRoundScores with scores
  // Advance to round 2
  // Round 2: setRoundScores with different scores
  // Verify: team.roundScores[0] and team.roundScores[1] are independent
});
```

---

## P1 Tests: Component Unit Tests (After Implementation)

### Test 6: Pre-fill initialization (after Area 2 Option A)

**File:** `apps/trivia/src/components/presenter/__tests__/RoundScoringPanel.test.tsx`

```ts
it('should pre-fill entries from team.roundScores[currentRound]', () => {
  const teams = [
    { id: 'a', name: 'Team A', roundScores: [3], score: 3 },
    { id: 'b', name: 'Team B', roundScores: [0], score: 0 },
  ];
  render(<RoundScoringPanel teams={teams} currentRound={0} onSubmitScores={vi.fn()} />);

  const inputA = screen.getByLabelText(/Team A/);
  expect(inputA).toHaveValue(3);  // Pre-filled from roundScores

  const inputB = screen.getByLabelText(/Team B/);
  expect(inputB).toHaveValue(null);  // 0 shows as blank (null)
});
```

### Test 7: Enter key does not advance during round_scoring

Integration test using the keyboard hook's behavior:

```ts
it('should not dispatch SKIP trigger on Enter during round_scoring', () => {
  // Set store to round_scoring scene
  // Simulate Enter keypress
  // Verify advanceScene was NOT called
});
```

### Test 8: Ctrl+Z scoping — only panel handler fires during round_scoring

```ts
it('should not call quickScore.undo during round_scoring', () => {
  // Set store to round_scoring scene
  // Simulate Ctrl+Z keypress
  // Verify quickScore.undo was NOT called
});
```

---

## P2 Tests: E2E Smoke (After All Changes)

A single Playwright E2E test that exercises the full scoring flow:

**File:** `e2e/trivia/round-scoring.spec.ts`

1. Start a game with 2 teams, 1 round, 1 question
2. Advance through question → answer → round summary → recap → round_scoring
3. Verify center panel shows question recap with correct answers
4. Verify scoring panel in sidebar has pre-filled values
5. Enter scores via the panel, click Done
6. Verify advancement to recap_scores
7. Verify scores are displayed correctly

This E2E test is not a prerequisite for implementation — it's a post-merge verification.

---

## Implementation Order

1. **Write P0 tests (Tests 1-5)** — documents current behavior, some will fail
2. **Implement pre-fill (Area 2 Option A)** — Test 6 expectation, but Test 1-3 should pass
3. **Implement navigation (Area 3)** — Test 4 passes
4. **Implement keyboard guards (Area 3)** — Tests 7-8 pass
5. **Implement center panel (Area 1)** — visual, test via P2 E2E
6. **Write P2 E2E test** — full flow verification

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| P0 tests may need `setupGameInRoundScoring` to advance through full scene flow | Existing helper already sets up teams + starts game; may need to advance scenes to reach `round_scoring` |
| Component tests need mock store setup | Existing test patterns in `stores/__tests__` show the pattern |
| E2E test needs question setup | Use the setup wizard flow already tested in `e2e/trivia/setup-overlay.spec.ts` |
