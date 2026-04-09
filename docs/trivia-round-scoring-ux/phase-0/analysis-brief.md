# Phase 0: Analysis Brief — Trivia Round Scoring UX

## Analysis Question

How should the trivia app's `round_scoring` scene and presenter sidebar be restructured to:

1. **Gate forward navigation on score submission** — currently, pressing Right Arrow or N during `round_scoring` advances to the next scene without requiring score submission
2. **Relocate the scoring form from sidebar to center panel** — the scoring form is in the narrow right sidebar while reference material (standings + Q&A) occupies the wider center panel
3. **Evaluate sidebar removal** — the right sidebar shows team management + contextual scoring UI that may be redundant; removing it would reclaim ~320px of horizontal space

## Known Knowns

- **Scene state machine**: `getNextScene()` in `scene.ts` unconditionally returns `'recap_qa'` for `round_scoring` + `advance` trigger (line 259). No gating mechanism exists.
- **Keyboard handler**: `use-game-keyboard.ts` dispatches `SCENE_TRIGGERS.ADVANCE` on ArrowRight (line 189) and `SCENE_TRIGGERS.NEXT_ROUND` on N (line 235) without any submission check.
- **Scoring form location**: `RoundScoringPanel` rendered in right sidebar (`page.tsx` lines 510-520). `RoundScoringView` (standings + Q&A answers) rendered in center panel (`page.tsx` lines 394-396).
- **Sidebar always shows TeamManager**: Team naming/add/remove UI is always visible in the right sidebar regardless of game phase.
- **handleRoundScoresSubmitted**: The only submission path is via RoundScoringPanel's "Done" button, which calls `setRoundScores(scores)` then `advanceScene('advance')`. There's no state flag tracking whether scores were submitted.
- **Enter key is already blocked** during `round_scoring` (`use-game-keyboard.ts` line 279).
- **N key can bypass scoring** entirely — it fires `next_round` which transitions to `round_intro` or `final_buildup`.
- **ArrowRight can bypass scoring** — it fires `advance` which transitions to `recap_qa`.

## Known Unknowns

1. What does the audience display show during `round_scoring`? Does it depend on sidebar state?
2. What other sidebar contents exist across all game phases? Full inventory needed.
3. How does `roundScoringEntries` in the game store interact with `roundScoringSubmitted` (if such a flag exists)?
4. Are there tests that assert the current (broken) behavior of free forward nav from `round_scoring`?
5. What does `TeamManager` provide during gameplay that couldn't be available elsewhere?
6. Does `TeamScoreInput` (the non-round-scoring score adjustment panel) duplicate functionality with `QuickScoreGrid`?

## Suspected Unknowns

- Whether mobile/responsive breakpoints affect the 3-column layout
- Whether dual-screen sync state is affected by sidebar removal
- Impact on E2E tests that reference sidebar elements

## Domain Tags

1. **UI/Visual** — layout restructuring, spatial hierarchy, space reclamation
2. **React/Components** — component relocation, prop threading, conditional rendering
3. **State Management** — gating mechanism, submission tracking, store updates
4. **Architecture** — scene state machine modification, separation of concerns

## Quality Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Evidence strength | 25% | Are findings backed by concrete code references and file paths? |
| Completeness | 20% | Does the analysis cover all three user-reported issues? |
| Accuracy | 20% | Are claims about current behavior verifiable in code? |
| Actionability | 15% | Can someone design an implementation from the findings? |
| Nuance | 10% | Does it acknowledge trade-offs of each approach? |
| Clarity | 10% | Is it organized for a developer who knows this codebase? |

## 5 Investigation Areas

### Area 1: Scene State Machine & Navigation Gating
**Domain**: State Management, Architecture
**Focus**: How `round_scoring` transitions work today, where a gating mechanism would be inserted, what state flags are needed, impact on `getNextScene()` / `orchestrateSceneTransition()` / `use-game-keyboard.ts`.

### Area 2: Scoring Form & Center Panel Layout
**Domain**: UI/Visual, React/Components
**Focus**: Current `RoundScoringPanel` and `RoundScoringView` component structure, what lives in center vs. sidebar during `round_scoring`, how to merge/relocate the scoring form into the center panel.

### Area 3: Right Sidebar Inventory & Redundancy Analysis
**Domain**: UI/Visual, React/Components
**Focus**: Full inventory of what the right sidebar shows in every game phase/scene. Identify which sidebar contents are essential, redundant, or relocatable. Map dependencies.

### Area 4: Audience Display & Sync Impact
**Domain**: State Management, Architecture
**Focus**: What the audience display renders during `round_scoring`, how `roundScoringEntries` syncs to the display, whether sidebar removal affects audience display state.

### Area 5: Test Coverage & Breaking Change Assessment
**Domain**: Testing, Architecture
**Focus**: Existing tests for `round_scoring` scene transitions, nav button labels, keyboard behavior. Which tests assert current (broken) behavior and would need updating. E2E test impact.
