# Investigation: Test Coverage & Breaking Change Assessment

## Summary

Six unit test files contain ~52 round_scoring-related tests. Zero E2E tests cover round_scoring. The most impactful breaks: (1) `scene-transitions.test.ts:428` and `game-store.test.ts:336` assert unconditional forward nav from `round_scoring` — gating breaks these; (2) `RoundScoringPanel.test.tsx` (15 tests) survives layout changes since it's tested in isolation; (3) `nav-button-labels.test.ts` has NO test for the `round_scoring` forward label — making label changes zero-risk.

## Key Findings

### Finding 1: `scene-transitions.test.ts:428` — direct casualty of store-level gating
- **Evidence:** Tests `orchestrateSceneTransition(state, 'advance')` from `round_scoring` with no entries set, expects `recap_qa`.
- **Confidence:** High
- **Implication:** Gating check would return null instead of valid transition. Must update to pre-fill entries or rewrite as "gate blocked" test.

### Finding 2: `game-store.test.ts:336` — same failure mode
- **Evidence:** "seed recap_qa from round_scoring" calls `advanceScene('advance')` from empty-entries state, expects `recap_qa`.
- **Confidence:** High

### Finding 3: `round-scoring-scenes.test.ts` — 13 tests, only breaks if state machine modified
- **Evidence:** Line 29-31 tests `skip → recap_qa`. Tests `getNextScene` directly (pure function).
- **Confidence:** High
- **Implication:** If gating is at orchestrator/store level (above `getNextScene`), all 13 survive.

### Finding 4: `RoundScoringView.test.tsx` — 5 tests, all survive layout move
- **Evidence:** Tests only query header text, standings region, questions section. No queries for RoundScoringPanel or score inputs.
- **Confidence:** High

### Finding 5: `RoundScoringPanel.test.tsx` — 15 tests survive layout change
- **Evidence:** All tests render component in isolation with mock props. `onProgressChange` is already tested (lines 302-318) — the natural hook for gating.
- **Confidence:** High

### Finding 6: `nav-button-labels.test.ts` — forward label `'Review Answers'` has ZERO coverage
- **Evidence:** Static forward label table skips `round_scoring`. Back label `'Round Summary'` is covered.
- **Confidence:** High
- **Implication:** Changing forward label (e.g., conditional based on submission state) carries zero test risk.

### Finding 7: `use-game-keyboard.test.ts` — all 4 round_scoring tests survive all changes
- **Evidence:** All 4 test blocking/exclusion behaviors (Enter blocked, Ctrl+Z excluded). None test forward nav.
- **Confidence:** High

### Finding 8: `SceneNavButtons.test.tsx` — no forward button test for round_scoring
- **Evidence:** 2 back-button tests exist. No test for "Review Answers" forward click.
- **Confidence:** High

### Finding 9: Zero E2E coverage for round_scoring
- **Evidence:** Grep of `round_scoring` across all trivia E2E specs returns zero matches.
- **Confidence:** High

## Test Impact Summary

| File | Tests | Break: gating (a) | Break: layout (b) | Break: sidebar (c) |
|------|-------|-------------------|-------------------|---------------------|
| round-scoring-scenes.test.ts | 13 | 0-1 (if state machine changed) | 0 | 0 |
| scene-transitions.test.ts | 5 | 1 (line 428) | 0 | 0 |
| scene.test.ts | 4 | 0 | 0 | 0 |
| nav-button-labels.test.ts | 1 | 0 | 0 | 0 |
| use-game-keyboard.test.ts | 4 | 0 | 0 | 0 |
| RoundScoringPanel.test.tsx | 15 | 0-3 (if props change) | 0 | 0 |
| RoundScoringView.test.tsx | 5 | 0 | 0 | 0 |
| SceneNavButtons.test.tsx | 3 | 0 | 0 | 0 |
| game-store.test.ts | 7 | 1 (line 336) | 0 | 0 |
| **E2E (all)** | **0** | **0** | **0** | **0** |

**Minimum breaks for gating: 2** (`scene-transitions.test.ts:428`, `game-store.test.ts:336`)
**Minimum breaks for layout move: 0**
**Minimum breaks for sidebar removal: 0**

## Surprises
- `nav-button-labels.test.ts` silently skips `round_scoring` in its static forward-label table
- `RoundScoringView.test.tsx` does NOT verify RoundScoringPanel is rendered inside it
- `onProgressChange` is already tested — the exact hook needed for gating, no new API required

## Unknowns & Gaps
- `next-action-hints.ts` is modified but has no test file
- SceneNavButtons forward button behavior during round_scoring is entirely untested
- No test covers the RoundScoringView + RoundScoringPanel composition
