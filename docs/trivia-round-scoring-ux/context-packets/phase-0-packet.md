# Context Packet: Phase 0

## Analysis Question
How to restructure trivia `round_scoring` scene: (1) gate forward nav on score submission, (2) move scoring form from sidebar to center panel, (3) evaluate removing the right sidebar entirely.

## Key Facts
- Scene state machine (`scene.ts`): `round_scoring` + `advance` → `recap_qa` unconditionally (no submission check)
- Keyboard (`use-game-keyboard.ts`): ArrowRight dispatches `advance`, N dispatches `next_round` — both bypass scoring
- Layout (`page.tsx`): 3-column layout — left rail (w-64, question navigator), center (flex-1, question display), right sidebar (w-80, teams + scoring)
- During `round_scoring`: center shows `RoundScoringView` (standings + Q&A answers), sidebar shows `RoundScoringPanel` (score inputs + Done button)
- `handleRoundScoresSubmitted` calls `setRoundScores(scores)` then `advanceScene('advance')` — triggered only by Done button
- No `roundScoringSubmitted` state flag exists in the store
- Enter key already blocked during `round_scoring`
- Sidebar always renders `TeamManager` (add/remove/rename teams) regardless of scene

## Quality Criteria (weighted)
Evidence strength (25%), Completeness (20%), Accuracy (20%), Actionability (15%), Nuance (10%), Clarity (10%)

## Scope
- In scope: `apps/trivia/` only — presenter layout, scene state machine, game store, keyboard hooks, tests
- Out of scope: audience display redesign, bingo app, platform-hub, database changes
