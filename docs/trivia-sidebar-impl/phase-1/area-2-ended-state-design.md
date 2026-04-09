# Area 2: Ended-State Replacement Design

**Phase:** 1 — Investigation
**Area:** 2 of N
**File:** `docs/trivia-sidebar-impl/phase-1/area-2-ended-state-design.md`

---

## Current State Analysis

### The Sidebar Button (Being Removed)

`apps/trivia/src/app/play/page.tsx` lines 538–559 contain the entire `ended` state sidebar panel:

```tsx
{game.status === 'ended' && (
  <div className="bg-surface border border-border rounded-xl p-3 shadow-sm">
    <h2 className="text-base font-semibold mb-3 text-center text-foreground">Game Over</h2>
    <div className="space-y-2">
      <button
        onClick={() => setShowRoundSummary(true)}   // LINE 543 — the only re-open mechanism
        className="..."
      >
        View Final Results
      </button>
      <button
        onClick={game.resetGame}
        className="..."
      >
        Start New Game
      </button>
    </div>
  </div>
)}
```

Removing the right sidebar eliminates both of these buttons. The "Start New Game" action is already available via the `R` keyboard shortcut and the `handleNewGame` button in the top header bar (lines 320–333, guarded by `game.status !== 'setup'`). Only "View Final Results" has no header-bar equivalent.

### Existing Auto-Show/Auto-Hide Effects

**Auto-hide effect 1 (lines 63–67):** Clears `showRoundSummary` when status is `setup` or `playing`. Intentionally does NOT clear during `ended` — the comment is explicit: "so 'View Final Results' overlay stays visible."

**Auto-hide effect 2 (lines 69–73):** Clears `showRoundSummary` when `between_rounds` AND `audienceScene !== 'round_summary'`. Does not touch `ended` at all.

**Auto-show effect (lines 78–82):** Sets `showRoundSummary = true` when `audienceScene === 'round_summary' && game.status === 'between_rounds'`. The `ended` guard (`game.status === 'between_rounds'`) means this effect is entirely inert during the `ended` phase. It will never fire when status is `ended`.

### The handleNextRound Latent Bug

`handleNextRound` (lines 89–93):

```tsx
const handleNextRound = () => {
  game.nextRound();                                        // LINE 90
  setShowRoundSummary(false);                             // LINE 91
  useGameStore.getState().setAudienceScene('round_intro'); // LINE 92
};
```

`game.nextRound()` calls `nextRoundEngine` in `lib/game/rounds.ts` (line 24). That function has an early return: `if (state.status !== 'between_rounds') return state;`. When `status === 'ended'`, nextRound is a complete no-op — the state does not change.

Line 92 then calls `setAudienceScene('round_intro')`. From `VALID_SCENES_BY_STATUS` in `types/audience-scene.ts` (lines 189–192), the valid ended scenes are `final_buildup`, `final_podium`, and `emergency_blank`. Setting `round_intro` while `status === 'ended'` is invalid — it puts the store into an inconsistent state where the scene is not in `VALID_SCENES_BY_STATUS['ended']`.

The `onNextRound` prop in `RoundSummary.tsx` (line 107) renders the button as "End Game" when `isLastRound === true`. During `ended`, `isLastRound` is forced to `true` via the prop calculation at line 482:

```tsx
isLastRound={game.isLastRound || game.status === 'ended'}
```

So clicking "End Game" in the overlay during `ended` calls `handleNextRound`, which: (1) no-ops on the game engine, (2) hides the overlay, (3) sets an invalid scene. This is the latent bug.

### The RoundSummary Render Location

The `RoundSummary` component renders conditionally inside the center panel (lines 474–491), not as a modal overlay. It is gated by `showRoundSummary` state. When rendered during `ended`, it receives:

- `isLastRound={true}` (via the `|| game.status === 'ended'` expression)
- `roundWinners={game.overallLeaders}` (via the same conditional expression)
- `onReviewAnswers={undefined}` (correctly gated to `between_rounds` only)
- `onClose={() => setShowRoundSummary(false)}` — works as a dismiss

The component itself is already correct for `ended`. The "View Questions" dismiss button on line 92 of `RoundSummary.tsx` (`aria-label="View questions"` when `isLastRound`) calls `onClose`, which just sets `showRoundSummary = false`. No game state changes occur on dismiss.

### The Audience Scene Flow into `ended`

`endGame()` in the store (lines 131–141) sets `audienceScene: 'final_buildup'`. `final_buildup` is a timed scene (`SCENE_TIMING.FINAL_BUILDUP_MS = 3000ms`) that auto-advances to `final_podium`. The `ended` status never produces a `round_summary` scene — `round_summary` is only valid in `between_rounds`. So there is no existing scene trigger that could auto-show the RoundSummary overlay during `ended`.

---

## Proposed Approaches

### Approach A: Auto-Show on Status Transition to `ended`

Add a new `useEffect` in `page.tsx` that fires when `game.status` transitions to `ended` and automatically sets `showRoundSummary = true`.

**Lines that change in `page.tsx`:**

1. Add a new effect after line 82 (after the existing auto-show effect):

```tsx
// Auto-show Final Results overlay when game ends.
// Gives presenter immediate visibility into final standings without
// requiring any sidebar interaction.
useEffect(() => {
  if (game.status === 'ended') {
    setShowRoundSummary(true);
  }
}, [game.status]);
```

2. Fix `handleNextRound` (lines 89–93) — the "End Game" button in RoundSummary during `ended` should do nothing harmful. Since `nextRound()` is already a no-op during `ended`, the real fix is removing the invalid `setAudienceScene('round_intro')` call and giving the button a semantically correct action:

```tsx
const handleNextRound = () => {
  if (game.status === 'ended') {
    // During ended: "End Game" button in RoundSummary dismisses the overlay.
    // The game is already ended; no scene or status change needed.
    setShowRoundSummary(false);
    return;
  }
  game.nextRound();
  setShowRoundSummary(false);
  useGameStore.getState().setAudienceScene('round_intro');
};
```

**Re-open mechanism:** None. Once the presenter dismisses the overlay with "View Questions", there is no way to reopen it. For a host who accidentally dismisses too early, this is a dead end.

**Interaction with existing effects:** The auto-hide effects at lines 63–67 clear the overlay when `status === 'setup' || status === 'playing'` — they do NOT clear during `ended`, so the overlay survives status remaining in `ended`. No conflict.

**Verdict:** Incomplete alone. The missing re-open path is a UX gap that will surprise presenters who dismiss the overlay prematurely.

---

### Approach B: Persistent "View Final Results" Button in Center Panel

Render a visible "View Final Results" button directly in the center panel during `ended` state (replacing the sidebar button location with a center-panel location). No auto-show behavior — the presenter manually opens the overlay.

**Lines that change in `page.tsx`:**

1. Inside the center panel's non-`isRoundScoringScene` branch (after line 492, before the closing `</>`), add a conditional block for ended state:

```tsx
{/* Game ended: Final Results re-open button */}
{game.status === 'ended' && !showRoundSummary && (
  <div className="mt-4 bg-surface border border-border rounded-xl p-4 shadow-md">
    <h2 className="text-lg font-semibold text-center text-foreground mb-3">Game Over</h2>
    <button
      onClick={() => setShowRoundSummary(true)}
      className="w-full px-4 py-3 rounded-xl text-sm font-medium
        bg-surface-elevated hover:bg-surface-hover text-foreground
        border border-border transition-colors min-h-[44px]"
    >
      View Final Results
    </button>
  </div>
)}
```

This renders when `ended` AND the overlay is not already showing. When the overlay is showing, this block disappears (they are mutually exclusive via `!showRoundSummary`).

2. Fix `handleNextRound` — same fix as Approach A, using the status guard.

**Re-open mechanism:** The button in the center panel is always available during `ended` when the overlay is dismissed.

**Interaction with existing effects:** The auto-hide effects leave `showRoundSummary` alone during `ended`, so a manually-opened overlay stays open until explicitly dismissed.

**Verdict:** Functional but requires a manual step after game end. The presenter sees "Game Over" but must click to see results. Slightly worse first-impression UX than auto-show.

---

### Approach C: Auto-Show + Persistent Re-Open Button (Recommended)

Combine Approach A and Approach B. When status transitions to `ended`, auto-show the Final Results overlay immediately. After dismissal, a persistent "View Final Results" button in the center panel allows reopening. This matches the UX of the `between_rounds` flow: auto-show on `round_summary` scene entry, with the ability to navigate back.

**Lines that change in `page.tsx`:**

1. **New auto-show effect** — add after line 82:

```tsx
// Auto-show Final Results overlay when game transitions to ended.
useEffect(() => {
  if (game.status === 'ended') {
    setShowRoundSummary(true);
  }
}, [game.status]);
```

This fires exactly once: when `game.status` first becomes `'ended'`. Because the existing auto-hide effects at lines 63–67 only clear during `setup` or `playing`, the overlay remains open until the presenter explicitly closes it. If the presenter starts a new game (resetting to `setup`), the auto-hide at line 64–65 will close the overlay correctly.

2. **Fix `handleNextRound`** — replace lines 89–93:

```tsx
const handleNextRound = () => {
  if (game.status === 'ended') {
    // "End Game" button during ended: dismiss overlay only.
    // nextRound() is a no-op for ended status; setAudienceScene('round_intro')
    // would set an invalid scene. Dismiss and let the presenter use New Game (R).
    setShowRoundSummary(false);
    return;
  }
  game.nextRound();
  setShowRoundSummary(false);
  useGameStore.getState().setAudienceScene('round_intro');
};
```

3. **Persistent re-open button in center panel** — add inside the `<>` block after the `{showRoundSummary && ...}` block (after line 491), before the closing `</>` at line 492:

```tsx
{/* Game ended: Final Results re-open button (shown when overlay is dismissed) */}
{game.status === 'ended' && !showRoundSummary && (
  <div className="mt-4 bg-surface border border-border rounded-xl p-4 shadow-md text-center">
    <p className="text-sm text-foreground-secondary mb-3">
      Game complete. Use <kbd className="px-1 py-0.5 bg-surface-elevated border border-border rounded font-mono text-xs">R</kbd> to start a new game.
    </p>
    <button
      onClick={() => setShowRoundSummary(true)}
      className="w-full px-4 py-3 rounded-xl text-sm font-medium
        bg-surface-elevated hover:bg-surface-hover text-foreground
        border border-border transition-colors min-h-[44px]"
    >
      View Final Results
    </button>
  </div>
)}
```

The `!showRoundSummary` guard means the center-panel button and the RoundSummary block are mutually exclusive — they never render simultaneously.

**Re-open mechanism:** Persistent center-panel button, always visible during `ended` when overlay is dismissed.

**Interaction with existing effects:**
- Auto-hide effect 1 (lines 63–67): Triggers on `setup` or `playing`. If presenter hits R → New Game → `setup`, overlay correctly clears. No conflict.
- Auto-hide effect 2 (lines 69–73): Only runs during `between_rounds`. No effect during `ended`. No conflict.
- Existing auto-show effect (lines 78–82): Only fires during `between_rounds`. No interaction with the new `ended` effect.
- The new effect and the existing effects are fully orthogonal — they guard on distinct `game.status` values.

---

## Bug Fix Summary

**Bug:** `handleNextRound` (lines 89–93) calls `setAudienceScene('round_intro')` unconditionally. When `status === 'ended'`, `round_intro` is not in `VALID_SCENES_BY_STATUS['ended']`. This creates an invalid scene/status combination in the store.

**Root cause:** `handleNextRound` was designed for `between_rounds` only, but the `RoundSummary` component also renders it as the "End Game" button during `ended` (because `isLastRound` is forced true). The handler never received a status guard.

**Fix:** All three approaches above include the same fix — add a `game.status === 'ended'` early return that only dismisses the overlay, skipping both the `game.nextRound()` call (already a no-op but misleading) and the invalid `setAudienceScene('round_intro')` call.

After this fix, the "End Game" button in RoundSummary during `ended` becomes a simple dismiss. The presenter then sees either the persistent re-open button (Approaches B/C) or a blank center panel (Approach A alone).

---

## Recommendation

**Approach C** is recommended. It provides:

1. Zero-friction first impression: overlay appears immediately on game end without any presenter action
2. Recovery path: persistent button if the overlay is dismissed prematurely
3. No new component abstractions — pure composition of existing state and conditional renders
4. Direct parity with the `between_rounds` auto-show pattern already in the codebase (lines 78–82)
5. Bug fix included as a required prerequisite

The implementation touches exactly three locations in a single file (`page.tsx`): one new effect (~5 lines), one modified handler (~8 lines replacing 4), and one new conditional render block (~12 lines). The `RoundSummary` component requires no changes.

---

## Files Referenced

- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/play/page.tsx` — primary change target (lines 63–93, 474–492, 538–560)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/RoundSummary.tsx` — no changes required
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/types/audience-scene.ts` — constraint reference (VALID_SCENES_BY_STATUS, lines 189–192)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/stores/game-store.ts` — endGame action (lines 131–141), nextRound action (lines 267–274)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/game/rounds.ts` — nextRoundEngine guard (line 25: `if (state.status !== 'between_rounds') return state`)
