# Iteration: Double-Advance Race Condition

## Assignment
Trace the exact event flow when Enter is pressed on the Done button during `round_scoring`.

## Findings

### Finding: Race Condition Confirmed — But Likely No-Op in Practice
- **Evidence:** Done button (RoundScoringPanel.tsx:284-308) has `onClick={handleSubmit}` but NO `onKeyDown` handler. Global keyboard handler (use-game-keyboard.ts:125-130) returns early only for `HTMLInputElement`/`HTMLTextAreaElement`, NOT `HTMLButtonElement`. Enter on Done button triggers: (1) browser-synthesized click → `handleSubmit()` → `onSubmitScores(scores)` → parent calls `setRoundScores()` + `advanceScene('advance')` → scene becomes `recap_scores`. (2) Same keydown bubbles to document → global handler's Enter case → `advanceScene('skip')` on current scene. Since scene is now `recap_scores`, and `recap_scores + skip` returns `null` in the state machine (scene.ts:279-286 — only `advance` and `next_round` are valid, not `skip`), the second call is a no-op.
- **Confidence:** High
- **Relation to Phase 1:** Confirms Area 5's concern but downgrades severity — the second advance returns null, so no double-transition occurs.
- **Significance:** The race condition exists architecturally but is harmless because `recap_scores` doesn't accept the `skip` trigger. However, if the scene machine were ever updated to accept `skip` on `recap_scores`, this would become a real double-advance bug.

### Finding: Root Cause — No `onKeyDown` on Done Button
- **Evidence:** RoundScoringPanel.tsx:284-308 — Done button has no `onKeyDown` handler to call `preventDefault()` on Enter. The global handler doesn't guard against `HTMLButtonElement`.
- **Confidence:** High
- **Relation to Phase 1:** New finding — the specific missing handler.
- **Significance:** Simple fix: add `onKeyDown` to Done button that calls `event.preventDefault()` on Enter, or add `HTMLButtonElement` to the global handler's early return.

## Resolved Questions
- Does the double-advance cause visible bugs? **No** — `recap_scores + skip` returns null.
- Is the race condition real? **Yes** — both handlers fire, but the second is a no-op.

## Remaining Unknowns
- Whether Zustand's synchronous `set()` guarantees the scene update is visible to the global handler before it reads state. If state reads are batched, the global handler might see the old scene (`round_scoring`) and transition again.

## Revised Understanding
The Enter-on-Done-button race is a latent bug, not an active one. The state machine's null return for `recap_scores + skip` acts as an accidental guard. A defensive fix (preventDefault on Done button) would be good hygiene but is not urgently needed.
