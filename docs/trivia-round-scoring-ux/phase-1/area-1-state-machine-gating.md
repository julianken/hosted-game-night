# Investigation: Scene State Machine & Navigation Gating

## Summary

The `round_scoring` scene has three ungated forward-navigation paths: ArrowRight (`advance`), N key (`next_round`), and SceneNavButtons "Review Answers" button (`advance`). All bypass score submission entirely. No `roundScoringSubmitted` flag exists in `TriviaGameState`. The closest architectural analog is the reveal-lock mechanism in `scene-transitions.ts`, which intercepts advancement triggers at the top of `orchestrateSceneTransition()` — the identical pattern is the cleanest insertion point for a submission gate.

## Key Findings

### Finding 1: All three forward paths are unconditional in the state machine
- **Evidence:** `scene.ts:259` — `advance|skip → recap_qa`, `scene.ts:261-263` — `next_round → round_intro|final_buildup`. No condition guards.
- **Confidence:** High
- **Implication:** `getNextScene()` receives only `SceneTransitionContext { isLastQuestion, isLastRound }`. Adding submission state would break the pure-context design. The orchestrator layer is the correct insertion point.

### Finding 2: Keyboard handler has one block (Enter) but two live forward-escape routes
- **Evidence:** `use-game-keyboard.ts:279` blocks Enter. `use-game-keyboard.ts:189` dispatches ADVANCE on ArrowRight unconditionally. `use-game-keyboard.ts:228-236` dispatches NEXT_ROUND on N with no submission check.
- **Confidence:** High
- **Implication:** Keyboard-layer guards alone leave SceneNavButtons unguarded. The orchestrator gate catches all channels simultaneously.

### Finding 3: SceneNavButtons forward button enabled unconditionally
- **Evidence:** `SceneNavButtons.tsx:61-66` dispatches ADVANCE with no guard. `nav-button-labels.ts:95-96` returns `'Review Answers'` (not null). `use-nav-button-labels.ts:71` only disables for `answer_reveal` reveal-lock.
- **Confidence:** High
- **Implication:** UI needs to extend disabled logic to check `roundScoringSubmitted` when `audienceScene === 'round_scoring'`.

### Finding 4: `roundScoringEntries` is partial-entry progress, not a submission flag
- **Evidence:** `game-store.ts:252-254` — `updateRoundScoringProgress` fires on every input change. `game-store.ts:247` clears it on submission. Empty after both "not started" and "submitted."
- **Confidence:** High
- **Implication:** A dedicated `roundScoringSubmitted: boolean` is needed.

### Finding 5: `orchestrateSceneTransition()` has an established guard intercept pattern
- **Evidence:** `scene-transitions.ts:29-46` — `revealLockUntil` + `ADVANCEMENT_TRIGGERS = new Set(['advance', 'skip', 'next_round', 'close'])`. Lines 364-367: guard fires before all handler layers.
- **Confidence:** High
- **Implication:** Same structure: `if (state.audienceScene === 'round_scoring' && !state.roundScoringSubmitted && ADVANCEMENT_TRIGGERS.has(trigger)) return null;` — a 3-line addition.

### Finding 6: `setRoundScores()` is the only submission path
- **Evidence:** `page.tsx:187-190` calls `setRoundScores(scores)` then `advanceScene('advance')`.
- **Confidence:** High
- **Implication:** `setRoundScores()` must set `roundScoringSubmitted: true` before `advanceScene('advance')` is called.

### Finding 7: Flag lifecycle — clear on forward entry, preserve on backward re-entry
- **Evidence:** `scene-transitions.ts:274-288` — forward entry from `round_summary` clears `roundScoringEntries`. Backward entry from `recap_qa` preserves scores.
- **Confidence:** High
- **Implication:** Forward entry: set `roundScoringSubmitted: false`. Backward entry: preserve `roundScoringSubmitted: true`.

## Surprises
- N key can bypass BOTH scoring AND answer review in a single keystroke (round_scoring → round_intro directly)
- Done button does NOT require `allEntered` — zero-fills missing entries silently
- `RoundScoringPanel` initializes from committed `team.roundScores[currentRound]` on mount, independent of store `roundScoringEntries`

## Unknowns & Gaps
- Presenter gets no visual feedback when gate blocks navigation (silent rejection)
- Back → round_summary → forward → round_scoring re-clears the flag (correct but needs test coverage)
- No existing test asserts submission-gated behavior
