# Investigation: Exclusive Functionality Detection

## Summary

Every store action used by sidebar components is reachable through at least one non-sidebar path, but three have important caveats. `renameTeam` is available in setup wizard but the sidebar is the ONLY mid-game rename path. `setTeamScore` (direct score set to arbitrary number) has its sole runtime UI in the sidebar's TeamScoreInput. The "View Final Results" button (setShowRoundSummary(true)) is the ONLY way to reopen the RoundSummary overlay when status === 'ended'. `addTeam`/`removeTeam` are not callable through any UI during active gameplay. `adjustTeamScore` is fully redundant via keyboard. `resetGame` has two non-sidebar paths (R key, header button).

## Key Findings

### Finding 1: renameTeam — Sidebar is the ONLY mid-game rename path
- **Evidence:** TeamManager.tsx:88-95 renders Rename button regardless of status. SetupGate only renders when status === 'setup' (page.tsx:568). No keyboard shortcut for rename in use-game-keyboard.ts. No other component calls renameTeam during playing/between_rounds/ended.
- **Confidence:** High
- **Implication:** Removing sidebar makes mid-game team renaming impossible. Whether this matters is a product question.

### Finding 2: setTeamScore — Sidebar is the ONLY direct-score-set path during gameplay
- **Evidence:** TeamScoreInput.tsx:27-35 is the only component calling onSetScore. Keyboard handler only calls adjustTeamScore (±1) and quickScore.toggleTeam (±1). RoundScoringPanel uses setRoundScores (bulk), not setTeamScore. No other component calls setTeamScore during gameplay.
- **Confidence:** High
- **Implication:** Removing sidebar eliminates ability to set a team's score to an arbitrary number. For large corrections (e.g., 150→15), only path would be repeated ±1 adjustments.

### Finding 3: adjustTeamScore — Fully redundant via keyboard during scoring phases
- **Evidence:** use-game-keyboard.ts:141-158 handles digit keys in SCORING_PHASE_SCENES. Unmodified digit = quickScore.toggleTeam (+1 toggle). Shift+digit = adjustTeamScore(-1). Ctrl+Z = undo. All three paths reach same store action.
- **Confidence:** High
- **Implication:** adjustTeamScore fully covered by keyboard shortcuts.

### Finding 4: addTeam / removeTeam — Cannot be invoked through any UI during active gameplay
- **Evidence:** TeamManager.tsx:97-108 wraps Remove in `{status === 'setup' && (...)}`. Lines 121-138 wrap Add Team similarly. When status is playing/between_rounds/ended, both hidden.
- **Confidence:** High
- **Implication:** These are setup-only. Removing sidebar has no effect on these during gameplay.

### Finding 5: resetGame — Sidebar is one of three paths, but the fastest in ended state
- **Evidence:** Three callsites: (1) sidebar button, direct game.resetGame (no confirmation, preserves teams). (2) R key → onResetRequest → confirmation modal. (3) confirmNewGame → resetGame + remove all teams. R key always routes through confirmation in current setup.
- **Confidence:** High
- **Implication:** Sidebar button is the only single-click reset in ended state. R key requires two steps (R + confirm).

### Finding 6: "View Final Results" button is sidebar-exclusive in ended state
- **Evidence:** page.tsx:542-549 calls setShowRoundSummary(true). Auto-show logic (page.tsx:78-82) fires only when audienceScene === 'round_summary' AND status === 'between_rounds' — not ended. No keyboard shortcut opens RoundSummary in ended state.
- **Confidence:** High
- **Implication:** **Most significant finding.** When game ends, "View Final Results" is the ONLY way to open final scores overlay on presenter. Removal without replacement is a hard blocker.

## Surprises
- Rename during gameplay is intentional — TeamManager deliberately does NOT gate rename on status === 'setup'
- "View Final Results" has no auto-show path in ended state — the auto-show only fires during between_rounds
- Sidebar "Start New Game" is actually the faster reset path (single click vs R + confirm)
- Sidebar resetGame doesn't reset audienceScene — audience stays on final_podium after sidebar reset (bug)

## Unknowns & Gaps
- Whether RoundScoringPanel exposes score-setting that overlaps with TeamScoreInput (not investigated since sidebar hidden during round_scoring)
- Whether E2E tests exercise mid-game rename or "View Final Results" button
- Ended-state accessibility: sidebar is the only place with focusable end-game elements

## Raw Evidence
- renameTeam callsites: page.tsx:511 (sidebar), SetupGate.tsx:29,158 (setup only)
- setTeamScore callsites: TeamScoreInput.tsx:31 (sidebar only)
- adjustTeamScore callsites: use-game-keyboard.ts:150, use-quick-score.ts:78,83,106,114, TeamScoreInput.tsx:88,127
- resetGame callsites: page.tsx:129 (confirmNewGame), page.tsx:551 (sidebar), use-game-keyboard.ts:218 (R key, but routed through confirmation)
- setShowRoundSummary(true) callsites: page.tsx:78-82 (auto, between_rounds only), page.tsx:543 (sidebar, ended only)
