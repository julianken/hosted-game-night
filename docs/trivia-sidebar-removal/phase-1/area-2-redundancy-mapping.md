# Investigation: Redundancy Analysis

## Summary

Every functional capability offered by the sidebar has a direct or close equivalent elsewhere in the presenter UI, with notable exceptions. Team add/remove/rename is fully covered by the setup wizard's WizardStepTeams (identical TeamManager component). QuickScoreGrid mirrors keyboard keys 1-9/0. RoundScoringPanel covers end-of-round entry. The "Game Over" buttons duplicate R key / header New Game. However, three capabilities are unique to the sidebar: mid-game team rename, click-to-edit direct score override (setTeamScore), and the per-round score breakdown table.

## Key Findings

### Finding 1: TeamManager is identical component in both sidebar and setup wizard
- **Evidence:** WizardStepTeams.tsx:128-135 renders `<TeamManager teams={teams} status="setup" ...>`. Sidebar page.tsx:506-513 renders same component with runtime status. Both wire to same Zustand store actions.
- **Confidence:** High
- **Implication:** Setup wizard provides complete team management pre-game. Post-game-start, sidebar TeamManager is rename-only (add/remove hidden when status !== 'setup'). Mid-game rename is the one unique runtime capability.

### Finding 2: QuickScoreGrid is mouse affordance for keyboard keys 1-9/0
- **Evidence:** use-game-keyboard.ts:141-157 calls `quickScore.toggleTeam(team.id)` on digit keys. QuickScoreGrid.tsx:78 does same on click. Grid renders keyboard hint badges, acknowledging it mirrors keys.
- **Confidence:** High
- **Implication:** Grid is not needed for keyboard users. Shift+digit (subtract) and Ctrl+Z (undo) from keyboard have NO click equivalent on the grid — grid only covers toggle-add.

### Finding 3: TeamScoreInput +/- redundant during scoring; unique click-to-edit and per-round breakdown
- **Evidence:** TeamScoreInput hidden during scoring scenes (page.tsx:526). RoundScoringPanel covers end-of-round entry. Keyboard Shift+digit also adjusts scores. BUT: `onSetScore` (click-to-edit direct score override, TeamScoreInput.tsx:113-123) and per-round breakdown row (lines 140-163) have no equivalent anywhere.
- **Confidence:** High on duplication; medium on gap severity
- **Implication:** +/- incremental adjustment covered by keyboard. Direct score override and per-round history are sidebar-exclusive.

### Finding 4: "View Final Results" has weak duplication; "Start New Game" has behavioral bug
- **Evidence:** "View Final Results" (page.tsx:543) calls `setShowRoundSummary(true)` — only way to reopen RoundSummary overlay when status === 'ended'. Auto-show logic (line 79) fires only during between_rounds, not ended. "Start New Game" (line 551) calls `game.resetGame` directly — no confirmation, preserves teams — diverges from header/R key path which shows modal and clears teams.
- **Confidence:** High
- **Implication:** "View Final Results" is sidebar-exclusive in ended state. "Start New Game" is behaviorally inconsistent with other reset paths.

### Finding 5: Per-round score breakdown is unique to sidebar
- **Evidence:** TeamScoreInput.tsx:140-163 renders per-round badge row from `team.roundScores[i]`. No other presenter component renders full roundScores history. RoundScoringPanel shows only current total. RoundSummary shows sorted totals. Audience RecapScoresScene shows totals + round delta, not full history.
- **Confidence:** High
- **Implication:** Structurally unique sidebar capability. Practical value depends on how often host needs per-round audit mid-game.

## Surprises
- TeamManager is partially disabled at runtime — add/remove hidden when status !== 'setup', so sidebar TeamManager is rename-only during gameplay
- Sidebar "Start New Game" is behaviorally inconsistent with header path (no confirmation, teams retained) — a latent bug
- QuickScoreGrid does NOT duplicate Shift+digit subtract or Ctrl+Z undo keyboard paths
- SceneNavButtons is a no-op at final_podium — only escape is sidebar buttons, header button, or R key

## Unknowns & Gaps
- Live rename frequency during gameplay — is mid-game rename actually needed?
- Mouse-only presenter workflow — removing sidebar removes all mouse/touch scoring shortcuts
- No alternative path to reopen RoundSummary overlay after dismissal when status === 'ended'

## Raw Evidence
- `apps/trivia/src/components/presenter/WizardStepTeams.tsx:128-135` — TeamManager embed
- `apps/trivia/src/components/presenter/QuickScoreGrid.tsx:78` — toggleTeam click handler
- `apps/trivia/src/hooks/use-game-keyboard.ts:141-157` — digit key scoring
- `apps/trivia/src/components/presenter/TeamScoreInput.tsx:113-123` — click-to-edit score (unique)
- `apps/trivia/src/components/presenter/TeamScoreInput.tsx:140-163` — per-round breakdown (unique)
- `apps/trivia/src/components/presenter/RoundScoringPanel.tsx` — end-of-round entry
- `apps/trivia/src/components/presenter/SceneNavButtons.tsx:69-72` — final_podium no-op
