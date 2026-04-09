# Investigation: Data Flow & Score Persistence

## Summary

`setRoundScores()` is a destructive, atomic write that replaces each team's round score for the current round using `setTeamRoundScore()` engine calls, then computes score deltas and clears all in-progress tracking state. It is entirely independent of the quick-score accumulation path: quick-score calls `adjustTeamScore()` which modifies `roundScores[currentRound]` incrementally, while `setRoundScores()` overwrites that same slot unconditionally via the round-specific setter. Advancing without calling `setRoundScores()` — via either the nav button (ArrowRight) or the N key from `round_scoring` — leaves whatever scores are currently in the store intact and accumulated from quick-score; those scores are not lost, but neither are they recorded with delta metadata, and `roundScoringInProgress` is never cleared. The `updateRoundScoringProgress()` function writes exclusively to the audience display cache fields (`roundScoringEntries`) and has no effect on canonical team scores.

---

## Key Findings

### Finding 1: setRoundScores() uses round-specific overwrite semantics

- **Evidence:** `game-store.ts:214-251`. The function loops over the `teamScoresMap`, calling `setTeamRoundScoreEngine(newState, teamId, state.currentRound, score)` for each entry. `scoring.ts:62-86` shows `setTeamRoundScore` sets `roundScores[roundIndex] = Math.max(0, score)` then recomputes `score` as the sum of all round scores. This is an unconditional overwrite of the current round slot, not an addition.
- **Confidence:** high
- **Implication:** If quick-score has already accumulated 7 points for a team via `adjustTeamScore()` during play, and then `setRoundScores()` is called with a value of 3 for that same team, the result is 3 — not 10. The two mechanisms are mutually exclusive for the same round slot. The UI presents them as alternatives (QuickScoreGrid is hidden when `isRoundScoringScene` is true), but there is no guard preventing prior accumulation from being silently discarded by a subsequent `setRoundScores()` call.

### Finding 2: setRoundScores() always clears roundScoringInProgress and roundScoringEntries

- **Evidence:** `game-store.ts:248-249`: `roundScoringInProgress: false, roundScoringEntries: {}` is returned unconditionally from every `setRoundScores()` invocation.
- **Confidence:** high
- **Implication:** The function is its own cleanup. Calling it a second time is safe — idempotent in the sense that the second call will overwrite with whatever the new map contains and re-clear the flags. However it is not truly idempotent if the maps differ: a second call with different values produces different team scores. There is no guard against double-invocation.

### Finding 3: Advancing via SceneNavButtons skips setRoundScores() entirely

- **Evidence:** `SceneNavButtons.tsx:62-66` handles `round_scoring` by calling only `store.advanceScene(SCENE_TRIGGERS.ADVANCE)`. `scene-transitions.ts:299-306` shows the side effect for entering `round_scoring` sets `roundScoringInProgress: true, roundScoringEntries: {}`, but there is no corresponding side effect when *leaving* `round_scoring` via `advance` — `applyTransitionSideEffects()` has no branch for `current === 'round_scoring'`. Only `buildSceneUpdate('recap_scores')` is returned.
- **Confidence:** high
- **Implication:** When the presenter clicks the forward nav button without filling in the `RoundScoringPanel`, the scene advances to `recap_scores` with `roundScoringInProgress` still `true` and `roundScoringEntries` still `{}`. Whatever scores the teams have at that moment (from quick-score or manual adjustment) persist in the store — they are not zeroed — but the `scoreDeltas` array is also not updated for this transition path. The audience display at `recap_scores` renders scores from `state.teams[*].score`, so the displayed numbers will be correct, but the animated delta overlays (driven by `scoreDeltas`) will show stale or empty delta data.

### Finding 4: The N key (next_round trigger) from round_scoring also skips setRoundScores()

- **Evidence:** `use-game-keyboard.ts:217-231` dispatches `SCENE_TRIGGERS.NEXT_ROUND` when N is pressed while `currentScene === 'round_scoring'`. `scene.ts:274-276` maps `round_scoring + next_round` to either `round_intro` or `final_buildup`. `scene-transitions.ts` has no side-effect branch for leaving `round_scoring` on `next_round` — it falls through to the `nextRoundEngine(state)` call in the `round_intro` side effect branch. `rounds.ts:24-56` shows `nextRound()` snapshots `questionStartScores` for the new round but does not touch existing team scores.
- **Confidence:** high
- **Implication:** N key during `round_scoring` will skip the scoring step entirely. Existing scores (from quick-score) survive. `roundScoringInProgress` is left `true` — a stale flag — carried into the `playing` state for the next round. This is a latent state pollution issue: the flag has no effect on gameplay but the audience display or any conditional logic checking it will see an incorrect value for the entirety of the next round.

### Finding 5: updateRoundScoringProgress() is purely an audience display cache — no score impact

- **Evidence:** `game-store.ts:254-256`: `set({ roundScoringEntries: entries })`. The `roundScoringEntries` field is only a live preview for the audience display, written by `handleRoundScoringProgress` in `play/page.tsx:186-188` on every input change. It is never read by any scoring engine function.
- **Confidence:** high
- **Implication:** This field is completely decoupled from canonical score state. Entries typed into `RoundScoringPanel` are previewed on the audience display in real-time via `roundScoringEntries`, but actual scores are only committed when `setRoundScores()` is explicitly called. If the presenter advances without submitting, `roundScoringEntries` contains the partially typed values while team scores remain at their pre-panel state.

### Finding 6: scoreDeltas are only computed inside setRoundScores(), not on the nav-advance path

- **Evidence:** `game-store.ts:243-248`: `computeScoreDeltasEngine` is called inside `setRoundScores()` using `state.questionStartScores` as the baseline. The `applyTransitionSideEffects()` in `scene-transitions.ts` only computes deltas in one place: the `question_closed -> round_summary` transition (line 229-238). There is no delta computation on `round_scoring -> recap_scores`.
- **Confidence:** high
- **Implication:** The `recap_scores` scene will show stale `scoreDeltas` (from the `round_summary` transition) if the presenter navigates forward without submitting scores. If the Done button path is used, `setRoundScores()` produces fresh deltas immediately before `advanceScene('advance')` transitions to `recap_scores`. These two paths produce meaningfully different state: one has current deltas, the other has round-start deltas.

### Finding 7: Quick-score uses adjustTeamScore() which modifies roundScores[currentRound] additively

- **Evidence:** `use-quick-score.ts:71-88` calls `adjustTeamScore(teamId, +1)` or `adjustTeamScore(teamId, -1)`. `scoring.ts:8-31` shows `adjustTeamScore` computes `roundScores[currentRound] = Math.max(0, (roundScores[currentRound] || 0) + delta)`. This writes to the same array slot that `setTeamRoundScore` later overwrites. The `SCORING_PHASE_SCENES` set in `use-game-keyboard.ts:64-72` includes `round_scoring`, meaning quick-score digit keys remain active during `round_scoring` even though the `RoundScoringPanel` is the primary UI at that point.
- **Confidence:** high
- **Implication:** A presenter could accumulate quick-score points during `round_scoring` while the panel is displayed. If they then use the Done button without entering panel values, `setRoundScores()` with null-defaulted-to-0 values will zero out the quick-score accumulation for teams the panel was submitted for. The two input mechanisms have no coordination layer.

---

## Surprises

- `round_scoring` is included in `SCORING_PHASE_SCENES` in `use-game-keyboard.ts:70`, meaning digit keys 1-9 for quick-score remain active while `RoundScoringPanel` is displayed. However, inputs in the panel capture keyboard events first (the input `onKeyDown` handler runs), so digit keys inside the panel inputs go to the number field — but keys pressed outside any input (e.g. if focus is on the panel header area) would route to quick-score via the global `keydown` handler. This creates a subtle dual-input race condition during the `round_scoring` scene.

- `roundScoringInProgress` is never checked anywhere in the scene machine or the advance logic as a guard. It was presumably designed as a flag the audience display could use, but there is no code in the codebase that reads it to change behavior — it is set to `true` on entry and cleared by `setRoundScores()`, but advancing without submitting leaves it permanently `true` for the remainder of that game session (since `nextRound()` and subsequent lifecycle functions do not clear it).

- The `RoundScoringPanel` Done button is not disabled when `enteredCount < teams.length` — it always calls `onSubmitScores` on click, with null entries defaulting to 0. This means partial submissions are possible and silently treat unentered teams as having scored 0 that round.

---

## Unknowns & Gaps

- There are no tests covering the "advance without calling setRoundScores()" path at the store integration level. The `round-scoring-store.test.ts` file tests only the happy path (scores submitted, deltas computed, flags cleared). No test verifies the state of `scoreDeltas` or `roundScoringInProgress` after a nav-advance through `round_scoring`.

- No test covers the interaction between quick-score accumulation during `round_scoring` and a subsequent `setRoundScores()` call that discards those accumulated values.

- The audience display component for `round_scoring` and `recap_scores` was not examined in this investigation. It is unknown whether `roundScoringEntries` or `roundScoringInProgress` are actually read by any display component, or whether they are orphaned state fields.

- It is unclear whether the `questionStartScores` snapshot taken at `startGame()` / `nextRound()` correctly reflects pre-round scores for the delta computation inside `setRoundScores()`. If quick-score points were added during round play, `questionStartScores` holds the round-start baseline, so deltas would correctly reflect all scoring (quick + panel). But if `setRoundScores()` is called in `between_rounds` (after `question_closed -> round_summary` already ran `computeScoreDeltas`), the `questionStartScores` baseline is from round start, not from the round_summary transition — meaning deltas double-count quick-score points made during play.

---

## Raw Evidence

- `apps/trivia/src/stores/game-store.ts` lines 214-256 — `setRoundScores()` and `updateRoundScoringProgress()` full implementations
- `apps/trivia/src/lib/game/scoring.ts` lines 62-86 — `setTeamRoundScore()` engine function (round-slot overwrite)
- `apps/trivia/src/lib/game/scoring.ts` lines 8-31 — `adjustTeamScore()` engine function (additive accumulation)
- `apps/trivia/src/lib/game/scoring.ts` lines 214-238 — `computeScoreDeltas()` implementation
- `apps/trivia/src/lib/game/scene-transitions.ts` lines 297-306 — entering `round_scoring` side effect (sets `roundScoringInProgress: true`)
- `apps/trivia/src/lib/game/scene-transitions.ts` lines 217-361 — `applyTransitionSideEffects()` full scan (no exit side effect for `round_scoring`)
- `apps/trivia/src/lib/game/scene.ts` lines 270-277 — `round_scoring` state machine transitions
- `apps/trivia/src/lib/game/rounds.ts` lines 24-56 — `nextRound()` (snapshots `questionStartScores`, does not clear `roundScoringInProgress`)
- `apps/trivia/src/components/presenter/SceneNavButtons.tsx` lines 29-79 — `handleForward()` — `round_scoring` case calls only `advanceScene(ADVANCE)`
- `apps/trivia/src/app/play/page.tsx` lines 179-188 — `handleRoundScoresSubmitted` and `handleRoundScoringProgress`
- `apps/trivia/src/hooks/use-game-keyboard.ts` lines 64-72 — `SCORING_PHASE_SCENES` includes `round_scoring`
- `apps/trivia/src/hooks/use-game-keyboard.ts` lines 217-231 — N key handler for `round_scoring`
- `apps/trivia/src/hooks/use-quick-score.ts` lines 71-88 — `toggleTeam()` calls `adjustTeamScore(teamId, ±1)`
- `apps/trivia/src/stores/__tests__/round-scoring-store.test.ts` — all 6 tests cover the `setRoundScores()` happy path only
- `apps/trivia/src/lib/game/__tests__/round-scoring-scenes.test.ts` — scene machine transition tests (no store-level data flow coverage)
