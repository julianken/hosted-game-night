# Context Packet: Phase 0

## Analysis Question
What are the UX problems in the trivia presenter's `round_scoring` scene, and what improvements would make the scoring workflow efficient, error-proof, and consistent with the rest of the presenter flow?

## Scope
- App: `apps/trivia` (presenter view at `/play`)
- Scene: `round_scoring` (comes after `recap_qa`, before `recap_scores`)
- In bounds: presenter UI layout, data flow, navigation, accessibility
- Out of bounds: audience display redesign, new game features, other scenes

## Key Files
- `apps/trivia/src/app/play/page.tsx` — Main presenter layout, panel visibility (lines 167-188, 511-542)
- `apps/trivia/src/components/presenter/RoundScoringPanel.tsx` — Score entry form (313 lines)
- `apps/trivia/src/components/presenter/SceneNavButtons.tsx` — Nav buttons with forward handler
- `apps/trivia/src/components/presenter/RoundSummary.tsx` — Round summary overlay
- `apps/trivia/src/lib/game/scene.ts` — Scene transition state machine
- `apps/trivia/src/lib/presenter/nav-button-labels.ts` — Button label logic
- `apps/trivia/src/hooks/use-game-keyboard.ts` — Global keyboard shortcuts
- `apps/trivia/src/stores/game-store.ts` — Zustand store (setRoundScores, advanceScene)
- `apps/trivia/src/components/audience/scenes/RoundScoringScene.tsx` — Audience display

## Known Issues (from conversation)
1. Center panel shows stale question card — not useful during scoring
2. Two competing advance actions: Done button (saves + advances) vs nav button (advances only)
3. No answer reference during scoring — Q&A review was in prior scene
4. Scoring panel cramped in 320px right sidebar while center panel is wasted

## Quality Criteria
| Criterion | Weight |
|-----------|--------|
| Evidence strength | 25% |
| Completeness | 20% |
| Accuracy | 20% |
| Actionability | 15% |
| Nuance | 10% |
| Clarity | 10% |
