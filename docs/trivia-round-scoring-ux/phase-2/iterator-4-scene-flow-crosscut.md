# Phase 2 — Iterator 4: Cross-Cut — Scene Flow Impact of All Three Changes Combined

## Summary

Only `round_scoring` requires center panel changes among the 5 between-rounds scenes. Backward re-entry from `recap_qa` preserves `roundScoringSubmitted: true`. The SceneNavButtons forward button reaches a degenerate never-visible-enabled state in normal flow — the Done button auto-advances before the user can see it enabled. On backward re-entry, forward is enabled and functional. 8 production files + 2 test files require changes.

---

## 1. Which Between-Rounds Scenes Are Affected?

The 5 between-rounds scenes flow through `scene.ts:255-284`:

**Affected by Change (a) — Gate forward nav on score submission:**
- **`round_scoring`** (PRIMARY) — Forward button transitions unconditionally via `getNextScene()` at `scene.ts:259`. Proposed: block until `roundScoringSubmitted === true`.

**Affected by Change (b) — Move scoring form to center panel:**
- **`round_scoring`** (PRIMARY) — RoundScoringPanel lives in right sidebar (`page.tsx:511-520`), RoundScoringView in center (`page.tsx:394-395`). Proposed: consolidate both into center panel.

**Affected by Change (c) — Remove right sidebar:**
- **`round_scoring`** (DIRECT) — eliminates RoundScoringPanel's current home
- **`round_summary`, `recap_qa`, `recap_scores`** (SECONDARY) — loss of TeamManager + QuickScoreGrid in sidebar

**NOT affected (no center panel changes):**
- **`round_intro`** — Timed scene, no scoring UI
- **`final_buildup`** — Final round transition, no scoring UI

**Conclusion:** `round_scoring` is heavily impacted by all 3 changes. Other between-rounds scenes lose sidebar UI but retain their center panel display logic.

---

## 2. Backward Re-entry Behavior

From `scene-transitions.ts:273-288`:

```typescript
if (nextScene === 'round_scoring') {
  // Forward entry from round_summary: clear entries for fresh scoring.
  if (state.audienceScene === 'round_summary') {
    return {
      ...buildSceneUpdate(nextScene),
      roundScoringEntries: {},
      recapShowingAnswer: null,
    };
  }
  // Backward entry from recap_qa: preserve existing scores.
  return {
    ...buildSceneUpdate(nextScene),
    recapShowingAnswer: null,
  };
}
```

**Key insight:** On backward re-entry from `recap_qa`, the function does NOT clear `roundScoringEntries` — preserves them by omitting that field from the update.

**Answer:** `roundScoringSubmitted` should be **preserved as `true`** on backward re-entry. Reasoning:
1. User entered round_scoring, filled in scores, clicked Done → auto-advanced to recap_qa
2. User navigated back to round_scoring from recap_qa
3. Scores are still there, form is unchanged, forward button should be enabled (already submitted)
4. No need to re-gate — user already committed scores

**Implementation:** Forward entry from `round_summary` resets `roundScoringSubmitted: false` (fresh session). Backward entry from `recap_qa` omits the field (preserves `true`).

---

## 3. SceneNavButtons Forward Button State Lifecycle

### Normal Flow (forward entry → submission → auto-advance):

```
[Enter round_scoring from round_summary]
  roundScoringSubmitted = false
  forward button text = "Review Answers"
  forward button disabled = true (gated)

[User fills form, clicks "Done"]
  handleRoundScoresSubmitted() called (page.tsx:187-190):
    setRoundScores(scores)     → roundScoringSubmitted = true
    advanceScene('advance')    → transitions to recap_qa

[Auto-advances to recap_qa immediately]
  forward button is now on a different scene
```

**The forward button NEVER visually appears enabled in normal flow.** The Done button auto-advances before the user can see it transition from disabled to enabled. This is a degenerate never-visible-enabled state.

### Backward Re-entry Flow:

```
[User at recap_qa Q1, navigates back]
  Returns to round_scoring
  roundScoringSubmitted = true (preserved)
  forward button text = "Review Answers"
  forward button disabled = false (enabled)
  forward button IS VISIBLE AND CLICKABLE
```

Clicking it advances to `recap_qa` again — redundant but harmless.

### Implication for SceneNavButtons Visibility

Since the forward button is:
- **Never enabled in normal flow** (auto-advance happens first)
- **Enabled on backward re-entry** (scores already submitted)

This confirms that **hiding SceneNavButtons during round_scoring** (as proposed by Iterator 3) is the cleanest approach. The Done button IS the advancement mechanism. On backward re-entry, the user can use the Done button again or navigate forward via keyboard (ArrowRight, since gate is satisfied).

---

## 4. Complete File Change Inventory

### Type Definition & Store (2 files):

| File | Change | Details |
|------|--------|---------|
| `apps/trivia/src/types/index.ts` | Add field | `roundScoringSubmitted: boolean` to TriviaGameState |
| `apps/trivia/src/stores/game-store.ts` | Logic + state | Set `roundScoringSubmitted: true` in `setRoundScores()` (~line 214), initialize as `false` (~line 476) |

### Scene Flow & Transition Logic (1 file):

| File | Change | Details |
|------|--------|---------|
| `apps/trivia/src/lib/game/scene-transitions.ts` | 2 insertions | (1) Submission gate after reveal-lock at ~line 364-367. (2) Reset `roundScoringSubmitted: false` on forward entry to `round_scoring` from `round_summary` at ~line 273-288 |

### UI Layout (3 files):

| File | Change | Details |
|------|--------|---------|
| `apps/trivia/src/app/play/page.tsx` | Major refactor | Remove sidebar (~lines 482-559), move RoundScoringPanel to center, remove skip link (~lines 239-244) |
| `apps/trivia/src/components/presenter/RoundScoringView.tsx` | Adjust layout | Modify `max-h-[calc(100vh-400px)]` constraint at line 103 for merged layout |
| `apps/trivia/src/lib/presenter/next-action-hints.ts` | Update text | Line 30 references "sidebar" — must update |

### Navigation Labels (2 files):

| File | Change | Details |
|------|--------|---------|
| `apps/trivia/src/hooks/use-nav-button-labels.ts` | Add gate | Add `roundScoringSubmitted` to disabled logic at ~line 71 (OR with existing `isRevealLocked`) |
| `apps/trivia/src/lib/presenter/nav-button-labels.ts` | No change | Label "Review Answers" at line 95 stays unchanged |

### Tests (2 files):

| File | Change | Details |
|------|--------|---------|
| `apps/trivia/src/lib/game/__tests__/scene-transitions.test.ts` | Fix test | Line ~428: add `roundScoringSubmitted: true` to test state |
| `apps/trivia/src/stores/__tests__/game-store.test.ts` | Fix test | Line ~336: mock `roundScoringSubmitted: true` or use `setRoundScores()` first |

### Total: 8 production files + 2 test files = 10 files

---

## Resolved Questions

- **Q: Do other between-rounds scenes need center panel changes?** A: No. Only `round_scoring` requires layout changes.
- **Q: Should roundScoringSubmitted persist on backward re-entry?** A: Yes. Forward entry resets, backward entry preserves.
- **Q: Is forward button ever visible-and-enabled during round_scoring?** A: Only on backward re-entry. Normal flow auto-advances.

## Remaining Unknowns

- Whether hiding SceneNavButtons during `round_scoring` should be scene-specific (hardcoded) or driven by a new state flag
- How QuickScoreGrid relocates for `round_summary` and other between-rounds scenes (out of scope for this iterator)
- Whether `roundScoringSubmitted` needs to be included in BroadcastChannel sync payload
