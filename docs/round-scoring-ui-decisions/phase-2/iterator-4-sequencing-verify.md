# Iterator 4: Sequencing Dependency Verification

## Assignment
Stress-test the 4-wave implementation plan for hidden dependencies.

## Verification Results

### Q1: Can WU-1 (tests) and WU-2 (pre-fill) truly run in parallel?

**YES — confirmed independent.**

P0 tests exercise the Zustand store (`setRoundScores`, `advanceScene`, `adjustTeamScore`) and the scene state machine (`getNextScene`). They never reference `RoundScoringPanel`'s `useState` initializer. Pre-fill only changes the component's lazy initializer. No file overlap.

### Q2: Does WU-3 (back nav) require changes in scene-transitions.ts?

**YES — hidden dependency found.**

`applyTransitionSideEffects()` in scene-transitions.ts handles `recap_qa` entry from different origins:
- From `recap_scores` (backward): sets `recapShowingAnswer: true` (answer face)
- From `recap_title` (forward): sets `recapShowingAnswer: false` (question face)

When backing from `round_scoring` → `recap_qa`, a new side effect is needed: `recapShowingAnswer: true` (the presenter has seen the answers already and is backing out of scoring).

**Required addition to WU-3:**
```ts
// In applyTransitionSideEffects, recap_qa entry section:
// Add round_scoring as a backward-entry origin alongside recap_scores
```

Without this, backing from `round_scoring` to `recap_qa` may show the question face instead of the answer face.

### Q3: Does WU-5 (cleanup of `roundScoringInProgress`) require test factory updates?

**NO — no factory updates needed.**

`createInitialState()` in the game engine initializes `roundScoringInProgress: false` automatically. Test helpers use `resetGameStore()` which calls `createInitialState()`. No separate test factory references this field for setup.

If `roundScoringInProgress` is removed from the type, the initializer and any test assertions referencing it must be updated, but these are direct test file changes, not shared factory changes.

### Q4: Does WU-6 (center panel) depend on Wave 2?

**NO — WU-6 can start independently.**

The center panel component (`RoundScoringView`) is purely display-only — it reads `game.currentRoundQuestions` and `game.teamsSortedByScore`, neither of which are affected by navigation changes (WU-3) or keyboard guards (WU-4).

**However:** Finalizing WU-6 after WU-2 (pre-fill) is ideal so the center panel's UX guidance text can reference pre-filled values ("Digit-key scores are pre-filled below").

### Q5: Any TypeScript exhaustiveness checks that break?

**NO breaking exhaustiveness checks.**

`getBackLabel()` uses `default: return null;` — no exhaustiveness check. Adding a new case for `round_scoring` is safe.

`getForwardLabel()` DOES have exhaustiveness checking (`const _exhaustive: never = scene`) but `round_scoring` already has a case there (line 95-96: `return 'View Scores'`). No change needed.

## Hidden Dependencies Summary

| Dependency | Severity | Affects |
|-----------|----------|---------|
| scene-transitions.ts side effect for `round_scoring` → `recap_qa` | **Critical** | WU-3 — must set `recapShowingAnswer: true` |
| Test for backward transition side effect | Medium | WU-1 — add test for `round_scoring` back transition |

## Revised Sequencing

The wave structure is **confirmed valid** with one addition:

**WU-3 scope expanded:** Back nav must include:
1. `scene.ts` — add back transition (already planned)
2. `nav-button-labels.ts` — add back label (already planned)
3. `use-game-keyboard.ts` — add to ArrowLeft guard (already planned)
4. **`scene-transitions.ts` — add `recapShowingAnswer: true` for backward entry from `round_scoring`** (NEW)
5. Test for the backward transition side effect (NEW)

No changes to wave ordering. WU-1 and WU-2 remain parallel. WU-6 remains Wave 3.

## Confidence
**High.** All five questions verified against code. One hidden dependency found and addressed.
