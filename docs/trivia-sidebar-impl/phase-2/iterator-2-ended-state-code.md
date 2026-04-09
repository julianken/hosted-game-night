# Phase 2 Iterator 2: Ended-State Replacement Code Design

**File scope:** `apps/trivia/src/app/play/page.tsx` only
**Reads:** lines 63–93 (effects + handleNextRound), 474–491 (RoundSummary render), 538–560 (right-sidebar ended block)

---

## Grounding observations from the source

### Current auto-hide effects (lines 63–73)

```tsx
// Lines 63–67
useEffect(() => {
  if (game.status === 'setup' || game.status === 'playing') {
    setShowRoundSummary(false);
  }
}, [game.status]);

// Lines 69–73
useEffect(() => {
  if (game.status === 'between_rounds' && audienceScene !== 'round_summary') {
    setShowRoundSummary(false);
  }
}, [audienceScene, game.status]);
```

The existing comment on line 62 explicitly says: "does NOT hide during 'ended' so 'View Final Results' overlay stays visible." This is correct behavior — we must not disturb these effects.

### Current auto-show effect (lines 78–82)

```tsx
useEffect(() => {
  if (audienceScene === 'round_summary' && game.status === 'between_rounds') {
    setShowRoundSummary(true);
  }
}, [audienceScene, game.status]);
```

Only fires for `between_rounds`. Nothing currently auto-shows for `ended`.

### Current handleNextRound (lines 89–93)

```tsx
const handleNextRound = () => {
  game.nextRound();
  setShowRoundSummary(false);
  useGameStore.getState().setAudienceScene('round_intro');
};
```

The bug: `setAudienceScene('round_intro')` fires unconditionally. When `status === 'ended'`, `game.nextRound()` is a no-op per the engine, but the scene is incorrectly forced to `'round_intro'` — overwriting `'final_podium'`.

### endGame() store action (game-store.ts lines 131–141)

When `endGame()` is called, `audienceScene` transitions to `'final_buildup'` which auto-advances to `'final_podium'` (indefinite, no further auto-advance). Status becomes `'ended'`.

### RoundSummary render (center panel, lines 474–491)

```tsx
{showRoundSummary && (
  <div className="mt-4">
    <RoundSummary
      currentRound={game.currentRound}
      totalRounds={game.totalRounds}
      roundWinners={(game.isLastRound || game.status === 'ended') ? game.overallLeaders : game.roundWinners}
      teamsSortedByScore={game.teamsSortedByScore}
      isLastRound={game.isLastRound || game.status === 'ended'}
      onNextRound={handleNextRound}
      onReviewAnswers={game.status === 'between_rounds' ? () => {
        setShowRoundSummary(false);
        useGameStore.getState().advanceScene('advance');
      } : undefined}
      onClose={() => setShowRoundSummary(false)}
    />
  </div>
)}
```

When `status === 'ended'`, `isLastRound` is forced `true`, `onReviewAnswers` is `undefined`, and the "End Game" button calls `onNextRound` → `handleNextRound`. This is the broken path.

### Right sidebar ended block (lines 538–560)

Already has a "View Final Results" button calling `setShowRoundSummary(true)`. This sidebar block is the **existing re-open mechanism**. Phase 1 proposes removing the right sidebar, so this block will be removed — therefore the center panel needs its own re-open button.

---

## Decision: Option B — Split into two handlers

**Rationale:** Option A (early return) leaves `handleNextRound` doing two unrelated things silently. Option C (status guard inside `handleNextRound`) is an improvement but still conflates the `between_rounds` and `ended` paths in one function. Option B is the cleanest expression of intent: each status transition gets its own named handler with no shared side-effect path.

The `ended` path has exactly one job: dismiss the overlay (`setShowRoundSummary(false)`). It must NOT touch `audienceScene` — `final_podium` should remain untouched.

---

## 1. handleNextRound fix

**Replace lines 89–93:**

```tsx
// between_rounds only: advance to next round and reset scene.
const handleNextRound = () => {
  if (game.status !== 'between_rounds') return;
  game.nextRound();
  setShowRoundSummary(false);
  useGameStore.getState().setAudienceScene('round_intro');
};

// ended only: dismiss the final results overlay.
// Does NOT touch audienceScene — final_podium must remain stable.
const handleEndGameDismiss = () => {
  setShowRoundSummary(false);
};
```

The early-return guard in `handleNextRound` is a safety net; in practice the button is only reachable during `between_rounds` once the JSX wiring (Item 3) uses `handleEndGameDismiss` for the `ended` path.

---

## 2. Auto-show effect for ended state

### When to fire

The `status` transition to `'ended'` is the correct trigger — not `audienceScene === 'final_podium'`. Reasons:

1. `final_podium` is reached after a `final_buildup` auto-advance timer. Waiting for `final_podium` introduces a delay; firing on `status → ended` shows the overlay immediately so the presenter sees it the moment they end the game.
2. The audience display independently advances through `final_buildup → final_podium` regardless. The presenter overlay is orthogonal.
3. Using `status` keeps the dependency array minimal and the intent explicit.

### Should it use a ref to prevent re-triggering?

No ref is needed. The existing auto-hide effect (lines 63–67) only hides on `status === 'setup' || status === 'playing'`. A transition from `ended` back to `ended` is impossible — the state machine is one-directional for this edge. The only way out of `ended` is `resetGame()` → `status === 'setup'`, which auto-hides the overlay anyway. The effect fires exactly once per game lifecycle.

### Interaction with existing auto-hide effects

The auto-hide at lines 63–67 ignores `ended`, and the auto-hide at lines 69–73 only fires for `between_rounds`. Neither will fight the new auto-show. No conflicts.

### New effect — insert after lines 78–82:

```tsx
// Auto-show RoundSummary (as Final Results) when game ends.
// Fires exactly once per game: status can only reach 'ended' once before
// resetGame() resets it to 'setup', which the existing auto-hide handles.
// Does NOT use a ref — no risk of double-fire across the status lifecycle.
useEffect(() => {
  if (game.status === 'ended') {
    setShowRoundSummary(true);
  }
}, [game.status]);
```

**Exact insertion point:** after line 82 (close of the existing auto-show effect), before line 84 (`const openDisplay`).

---

## 3. Re-open button in center panel

### Where in the JSX

The re-open button belongs immediately before the RoundSummary render block (line 474). This places it inline with the main content scroll area, visible to the presenter after they dismiss the overlay. It should NOT go inside the `<main>` preamble blocks (QuestionDisplay, SceneNavButtons, shortcuts reference, ThemeSelector) — those are always-visible panels.

The exact insertion point is after the ThemeSelector closing `</div>` (line 472) and before the `{showRoundSummary && ...}` block (line 474).

### Conditional rendering

```tsx
{!showRoundSummary && game.status === 'ended'}
```

Both conditions are necessary:
- `game.status === 'ended'` — the button is meaningless in other states
- `!showRoundSummary` — avoid showing "View Final Results" while the overlay is already open

### Button design

Follow the existing sidebar button pattern (lines 542–548): `w-full`, `px-4 py-3`, `rounded-xl`, `text-sm font-medium`, `bg-surface-elevated hover:bg-surface-hover`, `border border-border`, `min-h-[44px]`.

```tsx
{/* Re-open final results: shown when ended and overlay is dismissed */}
{!showRoundSummary && game.status === 'ended' && (
  <div className="mt-4">
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

The wrapping `<div className="mt-4">` mirrors the RoundSummary wrapper below it for consistent spacing.

---

## 4. RoundSummary onNextRound prop wiring change

With the two-handler split, the `onNextRound` prop passed to `<RoundSummary>` must use `handleEndGameDismiss` during `ended` and `handleNextRound` during `between_rounds`.

**Replace lines 483:**

```tsx
// Before
onNextRound={handleNextRound}

// After
onNextRound={game.status === 'ended' ? handleEndGameDismiss : handleNextRound}
```

This is the only JSX line that changes inside the existing RoundSummary render block. The `onClose` prop (`() => setShowRoundSummary(false)`) continues to work as-is — it already does the right thing for both states.

---

## Complete diff summary (page.tsx only)

| Lines | Change |
|-------|--------|
| 89–93 | Replace single `handleNextRound` with two handlers: `handleNextRound` (guarded `between_rounds`) + `handleEndGameDismiss` |
| After 82 | Insert new `useEffect` auto-show on `status === 'ended'` |
| After line 472 | Insert re-open button block: `{!showRoundSummary && game.status === 'ended' && (...)}` |
| Line 483 | Change `onNextRound={handleNextRound}` to `onNextRound={game.status === 'ended' ? handleEndGameDismiss : handleNextRound}` |

No imports change. No other files touched. The right-sidebar "View Final Results" button (lines 538–560) becomes redundant once the sidebar is removed per Phase 1 — these center-panel changes are designed to replace it entirely.
