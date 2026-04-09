# Investigation: Sidebar Component Inventory

## Summary

The right sidebar (page.tsx lines 496-563) is a `w-80` fixed-width `<aside>` rendered conditionally on `!isRoundScoringScene`. It hosts 4 conditional sections: TeamManager (always present when sidebar visible), QuickScoreGrid (scoring-phase scenes only), TeamScoreInput (non-scoring playing/between_rounds only), and an inline "Game Over" block (ended state only). QuickScoreGrid and TeamScoreInput are mutually exclusive. The scoring functionality in QuickScoreGrid has a complete parallel keyboard pathway via use-game-keyboard.ts that operates independently of the sidebar.

## Key Findings

### Finding 1: TeamManager is the only component active across all game states
- **Evidence:** TeamManager rendered unconditionally within sidebar (page.tsx:505-513). Add/Remove buttons gated on `status === 'setup'` internally (TeamManager.tsx:97-108, 121-139). Rename button always rendered regardless of status (line 87-95).
- **Confidence:** High
- **Implication:** During active gameplay, TeamManager is rename-only. Removing sidebar eliminates the only mid-game rename path.

### Finding 2: QuickScoreGrid's scoring logic is fully duplicated in keyboard hook
- **Evidence:** use-game-keyboard.ts:141-158 handles Digit1-Digit0 via `quickScore.toggleTeam(team.id)`. QuickScoreGrid.tsx:77 does the same on click. Both paths call the same `adjustTeamScore` store action.
- **Confidence:** High
- **Implication:** Keyboard shortcuts (1-9/0, Shift+1-9, Ctrl+Z) remain functional without sidebar. The grid is the visual feedback layer — removing it makes keyboard scoring blind (no visual confirmation of which teams are toggled).

### Finding 3: TeamScoreInput provides the only direct ±1 / set-score UI during non-scoring scenes
- **Evidence:** TeamScoreInput rendered when `!isScoringScene && !isRoundScoringScene` (page.tsx:526). Calls `adjustTeamScore(teamId, ±1)` and `setTeamScore(teamId, score)` via click-to-edit number input (TeamScoreInput.tsx:86-135).
- **Confidence:** High
- **Implication:** No keyboard shortcut for direct score-set or ±1 during non-scoring scenes. Removing sidebar eliminates mouse-based score correction.

### Finding 4: Game Over block provides the only non-keyboard paths for end-game actions
- **Evidence:** page.tsx:537-560. "View Final Results" calls `setShowRoundSummary(true)`. "Start New Game" calls `game.resetGame()` directly (no confirmation, preserves teams). No keyboard shortcut opens RoundSummary in ended state.
- **Confidence:** High
- **Implication:** "View Final Results" is sidebar-exclusive in ended state. "Start New Game" bypasses the confirmation flow (divergent from R key behavior).

### Finding 5: Sidebar "Start New Game" does shallow reset vs header's full reset
- **Evidence:** Sidebar: `game.resetGame()` (preserves teams, page.tsx:551). Header/R key: `confirmNewGame()` calls `resetGame()` AND removes all teams (page.tsx:128-135).
- **Confidence:** High
- **Implication:** Two different reset semantics under similar labels — arguably a bug rather than a feature.

### Finding 6: Duplicate useQuickScore instances
- **Evidence:** useQuickScore instantiated in use-game-keyboard.ts:100 (keyboard) and page.tsx:172 (passed to QuickScoreGrid). Separate React state instances — keyboard presses don't visually activate sidebar buttons.
- **Confidence:** High
- **Implication:** The keyboard and visual quick-score track different state. This is a pre-existing functional split.

### Finding 7: QuickScoreGrid and TeamScoreInput are mutually exclusive by scene
- **Evidence:** `isScoringScene` (question_closed, answer_reveal, round_summary) controls which shows. Both conditions cannot be true simultaneously.
- **Confidence:** High
- **Implication:** They form a context-sensitive scorekeeping panel. Removing both without replacement means no click-based scoring UI during gameplay.

## Surprises
- The sidebar "Start New Game" skips confirmation and preserves teams, unlike the header/R key path
- useQuickScore has two separate instances — keyboard and visual scoring track different state
- The sidebar is already absent during round_scoring, proving sidebar-free gameplay is accepted for at least one scene

## Unknowns & Gaps
- Whether the duplicate useQuickScore instances are intentional or a latent bug
- Whether keyboard-only scoring during round_summary scene (no visual feedback) is acceptable UX
- Whether any code references `id="game-controls"` (the aside's ID)

## Raw Evidence
- `apps/trivia/src/app/play/page.tsx` lines 496-563 (sidebar), 172-183 (scene guards), 120-135 (reset flows)
- `apps/trivia/src/components/presenter/TeamManager.tsx` — status-gated add/remove, always-visible rename
- `apps/trivia/src/components/presenter/QuickScoreGrid.tsx` — toggleTeam on click, keyboard hint badges, undo button
- `apps/trivia/src/components/presenter/TeamScoreInput.tsx` — +/- buttons, click-to-edit score, per-round breakdown
- `apps/trivia/src/hooks/use-quick-score.ts` — hook driving both keyboard and visual scoring
- `apps/trivia/src/hooks/use-game-keyboard.ts` lines 64-72, 141-158, 289-296 — keyboard scoring
