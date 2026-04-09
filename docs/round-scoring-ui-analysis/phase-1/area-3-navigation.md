# Investigation: Scene Transition & Navigation Consistency

## Summary

There are 5 distinct ways to leave `round_scoring`: (1) the RoundScoringPanel "Done" button, (2) the SceneNavButtons forward arrow, (3) the ArrowRight keyboard shortcut, (4) the N key (next_round), and (5) the Enter key (skip). Of these, **only the Done button calls `setRoundScores()`** before advancing. The other four paths all advance the scene without persisting the scoring panel's input values, silently discarding any entries the presenter typed into the spinbuttons. This is inconsistent with other scenes where nav buttons and keyboard shortcuts are semantically equivalent — in most scenes, there is no scene-specific action that the nav button could skip. The `round_scoring` scene is unique in coupling a data-persistence action to advancement.

## Key Findings

### Finding 1: Five exit paths exist, only one saves scores

- **Evidence:**
  - **Done button:** `RoundScoringPanel.tsx:248-282` — calls `onSubmitScores(scores)` which maps to `handleRoundScoresSubmitted` in `play/page.tsx:179-183`, calling `setRoundScores(scores)` then `advanceScene('advance')`.
  - **Forward nav button:** `SceneNavButtons.tsx:61-65` — calls only `store.advanceScene(SCENE_TRIGGERS.ADVANCE)` for `round_scoring`.
  - **ArrowRight key:** `use-game-keyboard.ts:196-209` — calls `advanceScene(SCENE_TRIGGERS.ADVANCE)` for the general case (no special handling for `round_scoring`).
  - **N key:** `use-game-keyboard.ts:217-231` — calls `advanceScene(SCENE_TRIGGERS.NEXT_ROUND)` when `round_scoring` is in the `BETWEEN_ROUNDS_SCENES` set.
  - **Enter key:** `use-game-keyboard.ts:241-248` — calls `advanceScene(SCENE_TRIGGERS.SKIP)` unconditionally.
- **Confidence:** High
- **Implication:** 80% of exit paths (4 of 5) skip score persistence. The presenter can easily lose work by pressing ArrowRight (a natural "next" reflex) or Enter instead of clicking the Done button in the right sidebar.

### Finding 2: Enter key (skip trigger) advances from round_scoring despite it not being a timed scene

- **Evidence:** `use-game-keyboard.ts:241-248` — Enter dispatches `SCENE_TRIGGERS.SKIP` for all scenes without any scene-specific guard. `scene.ts:270-277` shows `round_scoring + skip` maps to `recap_scores`, same as the `advance` trigger.
- **Confidence:** High
- **Implication:** The Enter key is described as "Skip timed scene" in the keyboard shortcuts documentation (`CLAUDE.md`), but `round_scoring` is not a timed scene — it has no auto-advance timer. Despite this, Enter still advances, creating an additional accidental-skip vector. The semantic mismatch between the key's purpose (skip timers) and its behavior (universal advance) is a documentation/behavior gap.

### Finding 3: ArrowRight and forward nav button are semantically identical for round_scoring

- **Evidence:** `use-game-keyboard.ts:196-209` calls `advanceScene(SCENE_TRIGGERS.ADVANCE)` for most scenes, matching the `handleForward` logic in `SceneNavButtons.tsx:61-65` which does the same for `round_scoring`. Both produce the same state transition: `round_scoring + advance → recap_scores`.
- **Confidence:** High
- **Implication:** The keyboard shortcut and nav button are consistent with each other — both advance without saving. The inconsistency is between these two "advance" mechanisms and the Done button's "save + advance" behavior. In other scenes (e.g., `question_display`), the forward button performs `stopTimer() + advanceScene()` — a compound action — but `round_scoring`'s compound action (save + advance) is only available through the Done button.

### Finding 4: N key skips both scoring and recap_scores, jumping directly to next round

- **Evidence:** `scene.ts:274-276` — `round_scoring + next_round` transitions to `round_intro` (or `final_buildup` if it's the last round). This bypasses `recap_scores` entirely. `scene-transitions.ts` applies `nextRoundEngine(state)` side effect for `round_intro` entry, which increments `currentRound` and snapshots `questionStartScores`.
- **Confidence:** High
- **Implication:** N is the most destructive skip path — it not only skips score persistence but also skips the `recap_scores` scene where the presenter and audience would see the updated standings. However, this is consistent with the N key's behavior in other `between_rounds` scenes (it always jumps to next round), so the behavior is architecturally intentional even if the data-loss risk is unintentional.

### Finding 5: No confirmation dialog or guard exists for any non-saving exit path

- **Evidence:** Searched for `confirm`, `dialog`, `unsaved`, `dirty`, and `guard` across all presenter components and keyboard handlers — no results. The `RoundScoringPanel` tracks `enteredCount` and `allEntered` state internally but does not expose these to the parent or to the navigation system.
- **Confidence:** High
- **Implication:** There is no "you have unsaved scores" warning. The scoring panel's internal state (which teams have been scored) is invisible to `SceneNavButtons`, `use-game-keyboard`, and the scene engine. A guard system would need either: (a) the scoring panel to expose dirty state to the store, or (b) the nav/keyboard handlers to check `roundScoringInProgress` before advancing.

### Finding 6: Comparison with other scenes — round_scoring is uniquely risky

- **Evidence:** Surveyed all scenes with scene-specific actions:
  - `question_display`: Forward button calls `stopTimer() + advanceScene()` — both nav and keyboard do the same compound action.
  - `waiting`: Forward calls `startGame()` — a unique action, but irreversible by design (starting the game is intentional).
  - `question_closed`: Forward calls `advanceScene(CLOSE)` — consistent with keyboard.
  - `round_scoring`: Forward calls only `advanceScene(ADVANCE)` — inconsistent with Done button's `setRoundScores() + advanceScene()`.
- **Confidence:** High
- **Implication:** `round_scoring` is the only scene where the forward nav button and the scene's primary action button perform different operations. In every other scene, the nav button IS the primary action. This makes `round_scoring` an architectural outlier — the navigation system was designed for scenes where "advance" is the only action, not for scenes where advancement should be coupled with data persistence.

## Surprises

- The Enter key works as a universal advance despite being documented as "skip timed scene." It has no scene-specific filtering, making it the least-expected exit path from `round_scoring`.
- The `roundScoringInProgress` flag (set `true` on `round_scoring` entry) is never read by any navigation guard. It exists purely as an audience display hint. A natural guard point (`if roundScoringInProgress, block advance`) was never implemented.
- The ArrowRight key handler in `use-game-keyboard.ts` has special-case logic for `answer_reveal` (where it checks `revealAnimationCompleteRef`) but no special-case logic for `round_scoring`.

## Unknowns & Gaps

- Whether the presenter community has a strong preference for "always save" vs "optional save" behavior during scoring — the current design effectively treats scoring as optional, which may be intentional for bar-trivia-style games where quick-score accumulation during play IS the scoring mechanism.
- Whether `roundScoringInProgress` was originally intended to serve as a navigation guard that was never wired up, or whether it was always intended as a display-only flag.
- Whether there are analytics or user reports indicating accidental score loss from the nav button or keyboard shortcuts.

## Raw Evidence

- `apps/trivia/src/components/presenter/SceneNavButtons.tsx` lines 29-79 — `handleForward` switch statement
- `apps/trivia/src/components/presenter/RoundScoringPanel.tsx` lines 248-282 — Done button and `onSubmitScores` callback
- `apps/trivia/src/app/play/page.tsx` lines 179-183 — `handleRoundScoresSubmitted` calling `setRoundScores` + `advanceScene`
- `apps/trivia/src/hooks/use-game-keyboard.ts` lines 196-248 — ArrowRight, N key, Enter key handlers
- `apps/trivia/src/lib/game/scene.ts` lines 270-277 — `round_scoring` state machine transitions for all triggers
- `apps/trivia/src/lib/game/scene-transitions.ts` lines 297-306 — `round_scoring` entry side effects
- `apps/trivia/src/types/audience-scene.ts` — scene type definitions and validity maps
