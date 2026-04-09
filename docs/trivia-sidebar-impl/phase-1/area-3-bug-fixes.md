# Area 3: Bug Fix Scoping — Trivia Sidebar Bugs

**Investigator:** React Specialist
**Phase:** 1 — Investigation
**Date:** 2026-03-11

---

## Executive Summary

Both bugs are real. Bug 1 (Dual useQuickScore) is a correctness defect that silently breaks keyboard-to-grid sync and Ctrl+Z. Bug 2 (Divergent Reset) is a UX inconsistency with non-obvious data consequences. The key finding is that **both bugs are intimately coupled to the sidebar's structure**, so fixing them before sidebar removal creates wasted churn. The correct sequence is: fix as part of removal, not before.

---

## Source File Map

| File | Role |
|---|---|
| `/apps/trivia/src/hooks/use-quick-score.ts` | Hook definition — owns `scoredTeamIds` Set and `historyRef` |
| `/apps/trivia/src/hooks/use-game-keyboard.ts` | Instance 1 at line 100 — keyboard scoring uses this instance |
| `/apps/trivia/src/app/play/page.tsx` | Instance 2 at line 172 — QuickScoreGrid uses this instance |
| `/apps/trivia/src/components/presenter/QuickScoreGrid.tsx` | Consumes `UseQuickScoreReturn` via props |

---

## Bug 1: Dual useQuickScore Instances

### State Model (from `use-quick-score.ts`)

`useQuickScore` is a standalone hook that maintains:
- `useState<Set<string>>` — the `scoredTeamIds` tracking which teams got points this question
- `useRef<HistoryEntry[]>` — a local history stack for Ctrl+Z undo
- Resets both on `selectedQuestionIndex` change via `useEffect`

The hook calls `adjustTeamScore()` from the game store directly — score mutations hit the shared store. But the **tracking state** (which teams are highlighted, what's in undo history) is entirely local to each hook instance.

### The Two Instances

**Instance 1 — `use-game-keyboard.ts` line 100:**
```
const quickScore = useQuickScore(game.selectedQuestionIndex);
```
Keyboard handler at lines 141-157 calls `quickScore.toggleTeam(team.id)`.
Keyboard handler at lines 289-295 calls `quickScore.undo()`.
This instance owns the undo history that Ctrl+Z operates on.
This instance's `scoredTeamIds` is **never read by any component** — it is returned in the hook's return value at line 327 (`quickScore`) but only the keyboard dispatch code uses its methods.

**Instance 2 — `page.tsx` line 172:**
```
const quickScore = useQuickScore(game.selectedQuestionIndex);
```
Passed directly to `QuickScoreGrid` at lines 518-521:
```
<QuickScoreGrid teams={game.teams} quickScore={quickScore} />
```
`QuickScoreGrid` calls `quickScore.isTeamScored()` to determine button highlight state.
`QuickScoreGrid` calls `quickScore.toggleTeam()` when a button is clicked (grid click path).
`QuickScoreGrid` calls `quickScore.undo()` when its undo button is clicked (grid undo path).

### What Breaks

1. **Keyboard press (1-9) does not highlight grid button.** Keyboard toggleTeam updates Instance 1's `scoredTeamIds`. Instance 2's `scoredTeamIds` remains empty. QuickScoreGrid reads Instance 2 → no highlight.

2. **Ctrl+Z operates on wrong history.** Ctrl+Z calls `quickScore.undo()` via Instance 1. But the grid's undo button calls `quickScore.undo()` via Instance 2. These are separate stacks. A keyboard-scored action is in Instance 1's history; Ctrl+Z from keyboard correctly undoes it. But if the user then clicks the grid undo button (Instance 2), it operates on Instance 2's (potentially empty) history — potentially a no-op when the user expected to undo the keyboard score. More dangerously, Instance 2 stack can contain grid-click actions that Instance 1's Ctrl+Z cannot reach.

3. **Score count display is always wrong after keyboard scoring.** The grid header shows `{scoredCount}/{teams.length} scored` using `quickScore.scoredTeamIds.size` from Instance 2. Keyboard scores never increment Instance 2's set.

### Minimal Fix in Sidebar-Present State

The fix is to **thread Instance 1's `quickScore` down to `QuickScoreGrid`** instead of creating Instance 2.

In `page.tsx`:
- **Remove** line 172: `const quickScore = useQuickScore(game.selectedQuestionIndex);`
- **Remove** line 19: `import { useQuickScore } from '@/hooks/use-quick-score';`
- **Change** line 520: replace `quickScore={quickScore}` with `quickScore={game.quickScore}`

`game` is the return value of `useGameKeyboard()` (line 34). `useGameKeyboard` already returns `quickScore` at line 327. So `game.quickScore` is Instance 1.

That is three line changes. No logic changes, no new code, no hook changes.

### Does the Fix Survive Sidebar Removal?

**No** — the fix is only meaningful while `QuickScoreGrid` exists in the sidebar. When the sidebar is deleted, `QuickScoreGrid` goes with it, the `quickScore` prop reference is deleted, and the concern disappears entirely. The Instance 1 in `useGameKeyboard` remains and is the correct, single owner of scoring state.

### Merge Conflict Risk

**High overlap with sidebar deletion zone.** The deletion removes the `<aside>` block (lines ~499-562). Lines 516-523 (the `QuickScoreGrid` render) are inside that aside. Line 172 (Instance 2 declaration) and line 19 (import) are in the page setup section above the JSX — those lines would need to be deleted as part of sidebar removal anyway.

If we apply the "thread Instance 1 down" fix first, then later remove the sidebar, we delete the `quickScore={game.quickScore}` prop and the `QuickScoreGrid` import, making the fix commit partially reverted. The import removal at line 19 would also need to be coordinated. This creates unnecessary intermediate states.

### Should This Be Fixed Before or As Part of Removal?

**As part of removal.** The correct post-removal state is: one `useQuickScore` instance in `useGameKeyboard`, no `QuickScoreGrid`, no Instance 2 declaration, no import in `page.tsx`. Fixing it now creates a short-lived intermediate state that gets deleted a commit later. The fix is three lines; bundling it into the removal diff costs nothing and avoids a spurious commit.

**Exception:** If there is a decision to keep `QuickScoreGrid` in a non-sidebar location (e.g., inline in the main panel or as a floating overlay), then the fix must be applied first as a standalone commit before the refactor touches these files.

### Test Strategy

If fixing standalone (before removal):
- Add test to `use-game-keyboard.test.ts`: verify that after a keyboard Digit1 press, `result.current.quickScore.scoredTeamIds` contains the team's ID (confirms the single instance's state is visible from the hook return value).
- Add test: verify `quickScore.scoredTeamIds.size > 0` after keyboard score, then `Ctrl+Z` correctly undoes by checking `adjustTeamScore` mock call count.

If fixing as part of removal:
- No dedicated test needed — the bug disappears with the second instance. Existing `use-game-keyboard.test.ts` quick score tests (which test the hook's own `quickScore` return) remain valid.

---

## Bug 2: Divergent Reset Paths

### The Two Reset Paths

**Path A — Sidebar "Start New Game" button (`page.tsx` line 550-558):**
```jsx
<button onClick={game.resetGame} ...>
  Start New Game
</button>
```
This calls `game.resetGame` directly. `game` is `useGameKeyboard`'s return, which spreads `useGame()`'s return. `resetGame` maps to `store.resetGame()` in the game store (line 143-150 of game-store.ts), which calls `resetGameEngine(state)`.

`resetGameEngine` (lifecycle.ts line 109-120) creates a fresh initial state but **preserves `teams` (with scores zeroed), `settings`, and `questions`**. Specifically, teams are preserved: `resetGame` does NOT remove team entries.

After Path A: status=setup, teams preserved (scores=0), audienceScene unchanged (stays at whatever it was — likely `final_buildup` or `final_podium` since this button only appears during `ended`), no confirmation dialog.

**Path B — Header "New Game" button / R key (`page.tsx` lines 119-135):**
```javascript
const handleNewGame = useCallback(() => {
  if (game.status === 'setup') return;
  setShowNewGameConfirm(true);
}, [game.status]);

const confirmNewGame = useCallback(() => {
  setShowNewGameConfirm(false);
  const store = useGameStore.getState();
  store.resetGame();
  for (const team of useGameStore.getState().teams) {
    store.removeTeam(team.id);
  }
  store.setAudienceScene('waiting');
}, []);
```

After Path B: status=setup, teams removed, audienceScene='waiting', confirmation dialog shown first.

### What Breaks

The two paths produce meaningfully different post-reset states:

| Dimension | Path A (sidebar) | Path B (header/R-key) |
|---|---|---|
| Confirmation | No | Yes (modal) |
| Teams after reset | Preserved (score=0) | All removed |
| audienceScene after reset | Unchanged (wrong) | 'waiting' (correct) |

**The audienceScene problem in Path A is a real defect:** When Path A runs during `ended`, the audienceScene is `final_podium`. After calling `game.resetGame()`, the status becomes `setup` but audienceScene stays `final_podium`. The audience display is showing the podium while the presenter sees the setup screen. The audience display will not return to the waiting screen until something explicitly sets `audienceScene='waiting'`. Path B always does this.

**The team preservation difference is ambiguous UX:** Path A's "preserve teams" behavior could be argued as intentional for "play again with same teams" — but this is the `ended` state sidebar button, not a mid-game reset. Path B's "remove all teams" behavior aligns with the full setup wizard flow. No product decision was made explicit in code comments.

### Minimal Fix in Sidebar-Present State

The minimal fix targets only the confirmed defect: audienceScene not reset to 'waiting'.

In `page.tsx`, change the sidebar button's onClick handler from `game.resetGame` to an inline callback:

**Old (line 551):**
```jsx
onClick={game.resetGame}
```

**New:**
```jsx
onClick={() => {
  game.resetGame();
  useGameStore.getState().setAudienceScene('waiting');
}}
```

This requires `useGameStore` to be in scope (it already is, imported at line 9).

If team removal alignment is also desired, the fix becomes:
```jsx
onClick={() => {
  const store = useGameStore.getState();
  store.resetGame();
  for (const team of useGameStore.getState().teams) {
    store.removeTeam(team.id);
  }
  store.setAudienceScene('waiting');
}}
```

This would make Path A and Path B identical in behavior — but removes the confirmation dialog distinction (Path A still has no confirmation).

Recommendation: Fix **only the audienceScene** in the minimal fix. The confirmation dialog and team-removal policy are UX decisions outside scope of a bug fix.

### Does the Fix Survive Sidebar Removal?

**Moot** — when the sidebar is removed, the entire `{game.status === 'ended'}` block (lines 538-560) is deleted. Path A disappears. Path B remains as the only reset path. The divergence bug is eliminated structurally.

### Merge Conflict Risk

**Direct overlap with sidebar deletion zone.** The button at line 551 is inside the `aside` block that sidebar removal deletes. Any standalone fix to line 551 will conflict with or be superseded by the deletion diff. The deletion diff must either include the fix or will delete code that the fix modified — both are clean if coordinated, but create a confusing diff if done in separate PRs.

### Should This Be Fixed Before or As Part of Removal?

**As part of removal.** When the sidebar is removed, Path A disappears entirely. The divergence is resolved by elimination. There is no audienceScene bug remaining because there is only one reset path (Path B) which already correctly sets `audienceScene='waiting'`.

If immediate production risk justifies a standalone fix: fix only the audienceScene line (`useGameStore.getState().setAudienceScene('waiting')` appended to the onClick). This is a single-line addition, minimal conflict surface. But given the button is only visible in `game.status === 'ended'`, the impact window is narrow and the fix will be deleted with the sidebar shortly after.

### Test Strategy

If fixing standalone (before removal):
- Add integration test in `page.tsx` test suite (if one exists) or a store-level test: after `store.resetGame()`, verify `audienceScene === 'waiting'` when explicitly set.
- Add unit test: confirm that calling `resetGame` + `setAudienceScene('waiting')` in sequence produces correct state (audienceScene is not automatically reset by `resetGameEngine` — the lifecycle.ts code does not set audienceScene, confirming the gap).

If fixing as part of removal:
- Existing `confirmNewGame` path tests (if any) cover Path B. No new tests needed for Path A since it is deleted.
- Add regression test for `confirmNewGame`: verify that after `confirmNewGame()`, `audienceScene === 'waiting'` and `teams.length === 0` and `status === 'setup'`.

---

## Sequencing Recommendation

```
┌─────────────────────────────────────────────────────────────────┐
│  RECOMMENDED SEQUENCE                                           │
│                                                                 │
│  1. Sidebar removal PR                                          │
│     - Deletes aside block (lines ~499-562)                      │
│     - Deletes Instance 2: line 172 + line 19 import            │
│     - Result: Bug 1 resolved (Instance 2 gone)                  │
│     - Result: Bug 2 resolved (Path A gone)                      │
│     - useGameKeyboard's Instance 1 remains as sole owner        │
│                                                                 │
│  No standalone bug fix PRs needed.                              │
└─────────────────────────────────────────────────────────────────┘
```

**Exception trigger:** If any stakeholder decision keeps `QuickScoreGrid` alive post-sidebar (floating panel, inline location), then Bug 1 **must** be fixed in a standalone commit first:
- Remove line 172 (`const quickScore = useQuickScore(...)`) from `page.tsx`
- Remove line 19 import
- Pass `game.quickScore` to `QuickScoreGrid`

That fix is safe, minimal, and does not conflict with a subsequent sidebar removal.

---

## Answers to Required Questions

### Bug 1: Dual useQuickScore

| Question | Answer |
|---|---|
| Minimal fix in sidebar-present state | Thread `game.quickScore` (Instance 1) to `QuickScoreGrid` instead of creating Instance 2. Delete lines 19 and 172 in `page.tsx`, change `quickScore={quickScore}` to `quickScore={game.quickScore}` at line 520. |
| Does fix survive sidebar removal? | No. Fix is deleted with `QuickScoreGrid`. Instance 1 remains as correct sole owner. |
| Merge conflict risk | High. Lines 19, 172, and 516-523 all overlap with sidebar removal changeset. |
| Test strategy | If standalone: test that `useGameKeyboard` return's `quickScore.scoredTeamIds` updates after keyboard digit press. If bundled: no new tests; existing keyboard tests cover Instance 1 behavior. |
| Fix before or as part of removal? | As part of removal. Standalone fix creates transient dead code. |

### Bug 2: Divergent Reset

| Question | Answer |
|---|---|
| Minimal fix in sidebar-present state | Add `useGameStore.getState().setAudienceScene('waiting')` to the sidebar button's onClick (line 551), fixing the audienceScene-not-reset defect. |
| Does fix survive sidebar removal? | No. The button is deleted with the sidebar. Path B remains as sole reset path and already sets audienceScene correctly. |
| Merge conflict risk | High. Line 551 is inside the aside block deleted by sidebar removal. |
| Test strategy | If standalone: assert `audienceScene === 'waiting'` after the sidebar button's action. If bundled: add `confirmNewGame` regression test verifying post-reset state (audienceScene, teams, status). |
| Fix before or as part of removal? | As part of removal. Bug is eliminated structurally when Path A is deleted. |
