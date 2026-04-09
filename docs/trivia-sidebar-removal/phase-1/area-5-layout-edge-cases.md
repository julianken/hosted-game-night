# Investigation: Layout, CSS, & Game-State Edge Cases

## Summary

The 3-column flex layout gives the sidebar `w-80 flex-shrink-0` (320px fixed). Removing it gives the center panel an unconditional +320px width across all non-round_scoring scenes. No CSS media queries reference the sidebar. During round_scoring the sidebar is already absent. The "Game Over" block is the only end-game UI in the presenter center panel has no dedicated ended-state UI — it just shows the stale last question. The final_podium and final_buildup scenes are audience-only. Critically, the sidebar's "Start New Game" button has a bug: it calls resetGame without resetting audienceScene, leaving the audience on final_podium.

## Key Findings

### Finding 1: Flex model — center gets +320px unconditionally
- **Evidence:** Container: `flex flex-1 overflow-hidden` (line 352). Left: `w-64 flex-shrink-0` (256px). Center: `flex-1` (absorbs remainder). Sidebar: `w-80 flex-shrink-0` (320px). At 1440px viewport: center goes from ~864px to ~1184px (+37%).
- **Confidence:** High
- **Implication:** Center content has no max-width constraints. All cards will stretch. A max-w wrapper may be needed to prevent awkward line lengths.

### Finding 2: No responsive breakpoints reference the sidebar
- **Evidence:** Grepping page.tsx for sm:/md:/lg:/xl: shows only header-level responsive classes. globals.css has no sidebar-targeting media queries.
- **Confidence:** High
- **Implication:** No responsive CSS cleanup needed on removal.

### Finding 3: round_scoring already removes sidebar — no reappear logic
- **Evidence:** `{!isRoundScoringScene && (<aside>)}` (line 497). When scene leaves round_scoring, isRoundScoringScene becomes false and sidebar renders again. Pure conditional — no one-time flag.
- **Confidence:** High
- **Implication:** Sidebar currently reappears after round_scoring for recap scenes. If removed permanently, QuickScoreGrid and TeamScoreInput lose their home for recap scenes too.

### Finding 4: Center panel has NO end-state UI during status === 'ended'
- **Evidence:** Center panel uses no status guards. During ended: QuestionDisplay (stale last question), SceneNavButtons, NextActionHint, keyboard card, ThemeSelector, optionally RoundSummary overlay. No "game is over" signal in center.
- **Confidence:** High
- **Implication:** The sidebar's "Game Over" block is the entire presenter-side acknowledgment that the game ended. Without it, the presenter sees a stale question card while the audience sees final_podium.

### Finding 5: final_podium and final_buildup are audience-only scenes
- **Evidence:** SceneRouter.tsx handles final_buildup (FinalBuildupScene) and final_podium (FinalPodiumScene) — rendered only in audience display. VALID_SCENES_BY_STATUS maps ended to {final_buildup, final_podium, emergency_blank} — audience only.
- **Confidence:** High
- **Implication:** Presenter view has no "podium scene." When game ends, audience sees cinematic finale while presenter sees undifferentiated question card.

### Finding 6: Sidebar "Start New Game" has audienceScene bug
- **Evidence:** resetGame in game-store.ts (lines 143-150) does NOT set audienceScene. Sidebar button calls only `game.resetGame()` (page.tsx:551). confirmNewGame (line 134) separately calls `store.setAudienceScene('waiting')`. The sidebar path skips this.
- **Confidence:** High
- **Implication:** Sidebar "Start New Game" leaves audience display on final_podium after reset — a pre-existing bug regardless of sidebar removal.

### Finding 7: round_scoring center layout is self-contained
- **Evidence:** page.tsx:385-405: isRoundScoringScene renders flex with w-[400px] scoring form + flex-1 Q&A reference. Sidebar already absent. overflow-hidden instead of overflow-y-auto.
- **Confidence:** High
- **Implication:** Removing sidebar has zero effect on round_scoring layout.

### Finding 8: showRoundSummary auto-show intentionally skips ended state
- **Evidence:** page.tsx:78-82 auto-shows when audienceScene === 'round_summary' AND status === 'between_rounds'. Comment at line 62 confirms intentional: "does NOT hide during 'ended' so overlay stays visible." But the auto-SHOW only fires during between_rounds, not ended.
- **Confidence:** High
- **Implication:** Once RoundSummary overlay is dismissed in ended state, the sidebar button is the only way to reopen it.

## Surprises
- Sidebar "Start New Game" has a bug: doesn't reset audienceScene, leaving audience on final_podium
- Center panel has zero end-game differentiation — no visual signal that the game ended
- showRoundSummary auto-show intentionally fires only during between_rounds, not ended
- The sidebar reappears after round_scoring for recap scenes — permanent removal affects more scenes than just the main gameplay

## Unknowns & Gaps
- What happens to QuickScoreGrid and TeamScoreInput components if sidebar removed — they have no alternate rendering path
- Whether sidebar "Start New Game" audienceScene bug is known or filed
- What RoundSummary's "End Game" button does in ended state (calls handleNextRound which sets audienceScene to round_intro — likely incorrect)

## Raw Evidence
- Layout: page.tsx lines 352-563
- Keyboard R: use-game-keyboard.ts lines 213-222
- Scene validity: audience-scene.ts lines 177-192
- resetGame: game-store.ts lines 143-150 (doesn't reset audienceScene)
- RoundSummary auto-show: page.tsx lines 78-82 (between_rounds only)
- Game Over block: page.tsx lines 537-560 (sidebar-exclusive)
