# Iteration: Ended-State UI Lifecycle

## Assignment
Deep-dive the ended-state lifecycle to determine what triggers 'ended', whether RoundSummary auto-shows, and what the presenter sees.

## Findings

### Two paths trigger ended — neither auto-shows RoundSummary
- **Evidence:** Path A: `store.endGame()` (game-store.ts:131-141) sets status='ended', audienceScene='final_buildup'. Path B: `advanceScene` reaching final_buildup triggers `endGameEngine` as side effect (scene-transitions.ts:301-307). Neither calls `setShowRoundSummary(true)`. Auto-show at page.tsx:78-82 requires `audienceScene === 'round_summary' && status === 'between_rounds'`.
- **Confidence:** Definitive
- **Relation to Phase 1:** Confirms critical finding — zero auto-show paths for RoundSummary when ended
- **Significance:** The "View Final Results" button is definitively the only way to see final standings on the presenter

### audienceScene on game end is always final_buildup → final_podium (3s auto)
- **Evidence:** SCENE_TIMING.FINAL_BUILDUP_MS = 3000ms (audience-scene.ts:133). Auto-advance via use-game-keyboard.ts:118-124. final_podium is terminal (scene.ts:292-293). VALID_SCENES_BY_STATUS for ended: {final_buildup, final_podium, emergency_blank} — round_summary NOT valid for ended.
- **Confidence:** Definitive
- **Relation to Phase 1:** Extends — confirms round_summary scene cannot exist during ended status
- **Significance:** No mechanism can trigger RoundSummary auto-show during ended state

### Center panel during ended shows stale last question with disabled controls
- **Evidence:** QuestionDisplay shows last selectedQuestion. displayQuestionIndex set to null by endGameEngine (lifecycle.ts:100). SceneNavButtons: forward=null for final_podium (nav-button-labels.ts:101-104). NextActionHint shows "Press R when ready for a new game" (next-action-hints.ts:23). RoundSummary guard (line 475) returns null since showRoundSummary starts false.
- **Confidence:** Definitive
- **Relation to Phase 1:** Confirms — center panel has zero ended-state differentiation
- **Significance:** Presenter sees stale question while audience sees cinematic finale

### RoundSummary component handles ended correctly but has no trigger
- **Evidence:** RoundSummary.tsx shows "Final Results" header when isLastRound=true. Has winner display, standings table. page.tsx:480-483 passes isLastRound={game.isLastRound || game.status === 'ended'}. But component only renders when showRoundSummary===true, which is never auto-set during ended.
- **Confidence:** Definitive
- **Relation to Phase 1:** Extends — the component IS designed for ended state, it's just orphaned from any trigger
- **Significance:** The code was designed around the sidebar button existing

## Resolved Questions
1. What triggers ended? Two paths: endGame() directly (vestigial) and advanceScene reaching final_buildup (primary)
2. Does RoundSummary auto-show during ended? No — auto-show requires between_rounds
3. What is audienceScene during ended? final_buildup (3s) → final_podium (terminal)
4. What does presenter see? Stale question, disabled nav, hint text "Press R when ready"

## Remaining Unknowns
- handleNextRound behavior when called from ended status (game.nextRound() may be a no-op or cause state corruption)

## Revised Understanding
The ended-state is a complete UI vacuum on the presenter side. The RoundSummary component is designed for this state but orphaned. Any sidebar removal MUST add either auto-show logic or a replacement button. This is the single hardest blocker.
