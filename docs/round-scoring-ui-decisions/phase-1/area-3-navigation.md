# Area 3: Navigation & Keyboard Changes for `round_scoring`

## Investigation Summary

Files read:
- `apps/trivia/src/lib/game/scene.ts` (lines 270-277) — `round_scoring` transitions
- `apps/trivia/src/lib/presenter/nav-button-labels.ts` (lines 95-96, 114-125) — forward/back labels
- `apps/trivia/src/hooks/use-game-keyboard.ts` (lines 173-181, 272-274, 282-289) — keyboard handlers
- `apps/trivia/src/components/presenter/RoundScoringPanel.tsx` (lines 110-125) — Ctrl+Z handler
- `apps/trivia/src/hooks/use-nav-button-labels.ts` — hook wiring

---

## Current State

### Back navigation: Absent

`getNextScene('round_scoring', 'back')` falls through to `return null` (scene.ts:277). ArrowLeft handler (use-game-keyboard.ts:174-176) guards against `round_scoring` — it only fires for `recap_qa`, `recap_title`, and `recap_scores`. The back button is structurally disabled (`getBackLabel` returns `null` for `round_scoring` via the default case at nav-button-labels.ts:122-123).

### Forward navigation: Two competing paths

1. **SceneNavButtons "View Scores"** — calls `store.advanceScene('advance')` which transitions to `recap_scores` WITHOUT saving panel entries
2. **RoundScoringPanel "Done"** — calls `onSubmitScores(scores)` which calls `setRoundScores()` + `advanceScene('advance')` (page.tsx:179-183)

Both advance to `recap_scores` but only the Done button persists panel data. This is intentional (bar-trivia design: quick-score is primary, panel is optional) but invisible to the presenter.

### Enter key: Unconditional skip

Enter dispatches `SCENE_TRIGGERS.SKIP` unconditionally (use-game-keyboard.ts:272-274). During `round_scoring`, this advances without saving — same as the nav button. This is consistent with the bar-trivia model but creates a subtle trap if the presenter expects Enter to submit the form.

### Ctrl+Z: Dual handler

Both RoundScoringPanel (lines 111-125, `window.addEventListener`) and use-game-keyboard.ts (lines 282-288) handle Ctrl+Z. The global handler calls `quickScore.undo()`. The panel handler calls `handleUndo()` (panel undo stack). When focus is outside inputs, both fire. The panel's handler uses `e.preventDefault()` but does NOT `e.stopPropagation()` — both stacks operate independently.

Mitigating factor: use-game-keyboard.ts lines 125-130 have an early return for `HTMLInputElement` and `HTMLTextAreaElement`, so when focus IS on a scoring input, only the panel handler fires. The conflict only manifests when focus is elsewhere on the page during `round_scoring`.

---

## Proposed Changes (8 line-level edits)

### Change 1: Add back transition in state machine
**File:** `apps/trivia/src/lib/game/scene.ts` line 270-277
**Edit:** Add `if (trigger === 'back') return 'recap_qa';` before the advance check

```ts
case 'round_scoring':
  if (trigger === 'back') return 'recap_qa';  // NEW
  if (trigger === 'advance' || trigger === 'skip') return 'recap_scores';
  if (trigger === 'next_round') {
    return isLastRound ? 'final_buildup' : 'round_intro';
  }
  return null;
```

### Change 2: Add back label
**File:** `apps/trivia/src/lib/presenter/nav-button-labels.ts` line 114-125
**Edit:** Add explicit case in `getBackLabel`:

```ts
case 'round_scoring':
  return 'Q&A Review';
```

### Change 3: Add `round_scoring` to ArrowLeft handler
**File:** `apps/trivia/src/hooks/use-game-keyboard.ts` line 174-176
**Edit:** Add `currentScene === 'round_scoring'` to the guard:

```ts
if (
  store.status === 'between_rounds' &&
  (currentScene === 'recap_qa' || currentScene === 'recap_title' || currentScene === 'recap_scores' || currentScene === 'round_scoring')
) {
```

### Change 4: Guard Enter key during `round_scoring`
**File:** `apps/trivia/src/hooks/use-game-keyboard.ts` line 272-274
**Edit:** Add guard so Enter doesn't silently advance past scoring:

```ts
case 'Enter':
  if (currentScene !== 'round_scoring') {
    store.advanceScene(SCENE_TRIGGERS.SKIP);
  }
  break;
```

Rationale: During `round_scoring`, Enter should cycle focus between inputs (already handled by RoundScoringPanel's `onKeyDown` at line 219-230) or do nothing at the global level. Advancing via Enter without saving would be surprising.

### Change 5: Scope Ctrl+Z to exclude `round_scoring` from global handler
**File:** `apps/trivia/src/hooks/use-game-keyboard.ts` line 282-289
**Edit:** Add scene exclusion:

```ts
case 'KeyZ':
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
    if (SCORING_PHASE_SCENES.has(currentScene) && currentScene !== 'round_scoring') {
      event.preventDefault();
      quickScore.undo();
    }
  }
  break;
```

### Change 6: Add `e.stopPropagation()` to panel Ctrl+Z handler
**File:** `apps/trivia/src/components/presenter/RoundScoringPanel.tsx` line 118-121
**Edit:** Add `e.stopPropagation()` after `e.preventDefault()`:

```ts
e.preventDefault();
e.stopPropagation();  // NEW — prevent global handler from also firing
handleUndo();
```

### Change 7: Add `type="button"` to Done button
**File:** `apps/trivia/src/components/presenter/RoundScoringPanel.tsx`
**Edit:** Ensure the Done button has `type="button"` to prevent implicit form submission on Enter.

### Change 8: Update scene transition test
**File:** `apps/trivia/src/lib/game/__tests__/round-scoring-scenes.test.ts`
**Edit:** Add test case for the new back transition:

```ts
it('should transition from round_scoring to recap_qa on back', () => {
  const next = getNextScene('round_scoring', 'back', defaultCtx);
  expect(next).toBe('recap_qa');
});
```

---

## State Loss on Back Navigation

**Critical constraint:** RoundScoringPanel uses local `useState` for `entries` and `undoStack`. Navigating back (to `recap_qa`) unmounts the panel, destroying all in-progress entries. Returning to `round_scoring` remounts with blank inputs (or pre-filled from `team.roundScores[currentRound]` if pre-fill is implemented).

**Mitigation options (from Area 2):**
- Option A (pre-fill): On re-entry, inputs show committed quick-score values — not terrible but in-progress edits are lost
- Option B (state lift): Draft survives remount — full solution but larger scope

**Recommendation:** Implement back navigation WITH pre-fill (Option A from Area 2). The facilitator loses in-progress panel edits on back-nav but recovers quick-score values on re-entry. This is acceptable because: (a) the bar-trivia model treats the panel as optional, (b) back-nav is a deliberate action, (c) the facilitator is going back to review answers, not to continue scoring.

---

## Dependency on Other Areas

- **Area 2 (pre-fill):** Back navigation is most useful when pre-fill is implemented — otherwise re-entry shows blank inputs
- **Area 4 (tests):** Changes 1-5 must be tested before merge. Scene machine test (Change 8) is trivial. Keyboard handler tests need integration coverage.
- **Area 1 (center panel):** Independent — navigation changes don't affect the center panel content

---

## Risk Assessment

| Change | Risk | Reason |
|--------|------|--------|
| Back transition (1-2) | Low | 3 one-line additions, state machine is well-tested |
| ArrowLeft guard (3) | Low | Adding to existing guard, no new behavior |
| Enter guard (4) | Medium | Changes existing behavior — Enter currently advances from any scene. Need to verify no user expects Enter to advance from `round_scoring` |
| Ctrl+Z scoping (5-6) | Low | Removes an invisible dual-handler conflict, panel handler takes sole ownership |
| Done button type (7) | Low | Defensive, prevents implicit submit |
| Test update (8) | None | Pure test addition |
