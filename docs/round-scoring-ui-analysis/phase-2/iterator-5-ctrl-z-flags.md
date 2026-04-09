# Iteration: Ctrl+Z Double-Handler & roundScoringInProgress Validation

## Assignment
Validate Phase 1 claims about Ctrl+Z dual handlers and `roundScoringInProgress` stale flag.

## Findings

### Finding: Ctrl+Z Double-Handler Confirmed
- **Evidence:** RoundScoringPanel.tsx:110-125 registers `window.addEventListener('keydown')` for Ctrl+Z, calls `handleUndo()` (local form undo stack). use-game-keyboard.ts:282-289 global handler checks `SCORING_PHASE_SCENES.has(currentScene)` (includes `round_scoring`) and calls `quickScore.undo()`. Both handlers fire on the same keydown event when focus is NOT on an input (global handler returns early for inputs). They operate on different undo stacks: panel form entries vs quick-score toggles.
- **Confidence:** High
- **Relation to Phase 1:** Confirms Area 5 Finding 3.
- **Significance:** When Ctrl+Z is pressed with focus on a non-input element during `round_scoring`, both undo handlers fire. The panel undoes the last form entry; the global handler undoes the last quick-score toggle. If the presenter used both mechanisms, this creates a confusing double-undo. If only one mechanism was used, the other undo is a no-op (empty stack).

### Finding: `roundScoringInProgress` is Never Cleared on Advance-Without-Save — Confirmed
- **Evidence:** Set `true` on `round_scoring` entry (scene-transitions.ts:298-306). Cleared `false` only by `setRoundScores()` (game-store.ts:248). No side effect on `round_scoring → recap_scores` transition. `nextRound()` (rounds.ts:24-56) does NOT reset it. `startGame()` (lifecycle.ts:61-94) does NOT explicitly reset it (relies on initial state). Only `resetGame()` resets via `createInitialState()`.
- **Confidence:** High
- **Relation to Phase 1:** Confirms Area 2 Finding 2 and Area 3 Finding 5.
- **Significance:** After advancing without Done, `roundScoringInProgress` remains `true` for the entire rest of the game session. It's carried through `nextRound()` into subsequent rounds.

### Finding: `roundScoringInProgress` is Never Read as a Guard — Confirmed
- **Evidence:** Full codebase search found the flag in 12 files: type definitions, initial state, store state, hydration, sync hooks, status snapshots, and test fixtures. **Zero** conditional reads (no `if` statements, no ternary checks, no guard logic). Only state assignments and test assertions.
- **Confidence:** High
- **Relation to Phase 1:** Confirms Area 2 and Area 3 claims.
- **Significance:** The flag is effectively dead state. It was presumably designed for audience display or future guard logic but was never wired up. It could be removed without behavioral impact, or wired up as a navigation guard (block advance until scores are submitted or explicitly skipped).

### Finding: `roundScoringEntries` is Read Only by Audience Display
- **Evidence:** `RoundScoringScene.tsx:15-20` reads `roundScoringEntries` for progress bar display (entered count vs team count). No other consumer reads this field.
- **Confidence:** High
- **Relation to Phase 1:** Confirms Area 2 Finding 5.
- **Significance:** Entries typed into the panel preview on the audience display but have no effect on canonical scores. If the presenter advances without submitting, the audience display shows partial entries that were never committed.

## Resolved Questions
1. Ctrl+Z double-handler: **Confirmed real**, fires both stacks when focus outside inputs.
2. `roundScoringInProgress` stale: **Confirmed**, persists through `nextRound()`.
3. Flag purpose: **Never used as guard**, appears to be incomplete feature or display-only.

## Remaining Unknowns
- Whether the audience display shows incorrect state after advance-without-save (stale `roundScoringEntries` + stale `roundScoringInProgress`).
- Whether the flag was originally intended as a navigation guard that was never implemented.

## Revised Understanding
Both Phase 1 claims are fully validated. The Ctrl+Z double-handler is a real but moderate issue (confusing double-undo when both scoring mechanisms were used). The `roundScoringInProgress` flag is dead state that could either be cleaned up or wired into a navigation guard. The audience display may show stale scoring progress after advance-without-save.
