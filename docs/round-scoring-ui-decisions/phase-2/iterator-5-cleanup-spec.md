# Iterator 5: Dead State & Dual Handler Cleanup Specification

## Assignment
Specify exact code changes for `roundScoringInProgress` removal, Ctrl+Z fix, and Done button cleanup.

## Finding 1: `roundScoringInProgress` Is Dead State — CONFIRMED

**Written in 4 locations, never read as a guard:**

| Location | Action | Line |
|----------|--------|------|
| `scene-transitions.ts` | Set `true` on `round_scoring` entry | ~302 |
| `game-store.ts` | Cleared in `setRoundScores` | ~248 |
| `game-store.ts` | Cleared in `completeRound` | ~373 |
| `lifecycle.ts` | Initialized to `false` | ~52 |

**Read locations (all non-guard):**
- `use-game.ts` — extracted from store but never used by callers as a guard
- Audience `RoundScoringScene` — reads `roundScoringEntries`, NOT `roundScoringInProgress`
- BroadcastChannel sync — synced but audience never checks it

**Recommendation: Remove entirely (Option A).**

### Removal checklist

1. **`apps/trivia/src/types/index.ts`** — remove `roundScoringInProgress: boolean` from `TriviaGameState`
2. **`apps/trivia/src/lib/game/lifecycle.ts`** — remove `roundScoringInProgress: false` from initial state
3. **`apps/trivia/src/lib/game/scene-transitions.ts`** — remove `roundScoringInProgress: true` from `round_scoring` entry side effect
4. **`apps/trivia/src/stores/game-store.ts`** — remove `roundScoringInProgress: false` from `setRoundScores` and `completeRound` cleanup
5. **`apps/trivia/src/hooks/use-game.ts`** — remove from extracted fields (if explicitly destructured)
6. **Test files** — update any assertions that check `roundScoringInProgress`:
   - `scene-transitions.test.ts` — remove assertion that it's set to `true` on entry
   - `round-scoring-store.test.ts` — remove assertion that it's cleared on submit

**Estimated test file changes:** ~13 files reference `roundScoringInProgress` in tests or type factories. Most are simple deletions of one field from object literals.

## Finding 2: Dual Ctrl+Z Handlers — CONFIRMED

### Current state

**Handler 1: RoundScoringPanel** (lines 111-125)
```ts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      handleUndo();  // Panel undo stack
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleUndo]);
```

**Handler 2: use-game-keyboard.ts** (lines 282-289)
```ts
case 'KeyZ':
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
    if (SCORING_PHASE_SCENES.has(currentScene)) {
      event.preventDefault();
      quickScore.undo();  // Quick-score undo stack
    }
  }
  break;
```

**Conflict:** Both handlers are on `window`. Both fire on the same Ctrl+Z event during `round_scoring`. The panel's `e.preventDefault()` does NOT prevent the global handler from also firing because `preventDefault` blocks browser defaults, not other JS listeners. `stopPropagation` wouldn't help either since both are on the same element (`window`).

**Mitigating factor:** use-game-keyboard.ts lines 125-130 return early for `HTMLInputElement`, so when focus IS on a scoring input, only the panel handler fires. The conflict only manifests when focus is elsewhere.

### Recommended fix

**Option: Exclude `round_scoring` from global Ctrl+Z handler.**

In `use-game-keyboard.ts`:
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

This gives RoundScoringPanel sole ownership of Ctrl+Z during `round_scoring`. The panel's own handler covers both in-input and out-of-input cases.

**Files changed:** 1 — `use-game-keyboard.ts` (1 line addition to conditional)

## Finding 3: Done Button Type

**Current state:** The Done button in RoundScoringPanel does NOT have `type="button"`. However, it's also NOT inside a `<form>` element, so implicit form submission is not a risk.

**Recommendation:** Add `type="button"` for defensive clarity. This prevents any future wrapping in a `<form>` from causing implicit submission.

**File:** `RoundScoringPanel.tsx` — add `type="button"` to the Done button element.

## Summary of All Changes

| Change | File | Lines | Risk |
|--------|------|-------|------|
| Remove `roundScoringInProgress` from type | `types/index.ts` | 1 line | Low |
| Remove from initial state | `lifecycle.ts` | 1 line | Low |
| Remove from scene entry side effect | `scene-transitions.ts` | 1 line | Low |
| Remove from `setRoundScores` cleanup | `game-store.ts` | 1 line | Low |
| Remove from `completeRound` cleanup | `game-store.ts` | 1 line | Low |
| Remove from `use-game.ts` extraction | `use-game.ts` | 1 line | Low |
| Update test assertions | ~13 test files | ~13 lines | Low |
| Exclude `round_scoring` from Ctrl+Z | `use-game-keyboard.ts` | 1 line | Low |
| Add `type="button"` to Done | `RoundScoringPanel.tsx` | 1 line | None |

**Total: ~22 line changes across ~17 files. All deletions or trivial additions.**

## Confidence
**High.** Dead state confirmed by exhaustive grep. Ctrl+Z conflict verified by reading both handlers. All changes are simple deletions or one-line conditionals.
