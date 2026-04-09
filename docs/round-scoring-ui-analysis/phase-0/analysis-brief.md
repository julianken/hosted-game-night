# Phase 0: Analysis Brief — Round Scoring Scene Presenter UI

## Analysis Question

What are the UX problems in the trivia presenter's `round_scoring` scene, and what improvements would make the scoring workflow efficient, error-proof, and consistent with the rest of the presenter flow?

### Observable Facts
- During `round_scoring`, the center panel shows a stale question card (last question from the round) — not actionable
- The RoundSummary overlay auto-hides when the scene leaves `round_summary`, so standings are not visible during scoring
- The scoring input form (RoundScoringPanel) is in the 320px right sidebar — cramped for the primary task
- Two competing "advance" actions exist: RoundScoringPanel "Done" (saves scores + advances) vs SceneNavButtons "View Scores" (advances without saving)
- No answer reference is available during scoring — the recap_qa review happened in a prior scene
- The keyboard handler (ArrowRight) also advances without saving, same as the nav button
- The audience display has a dedicated RoundScoringScene component that shows scoring progress

### What We Need to Find Out
- How do presenters actually use the scoring flow? (intended workflow vs actual UX)
- What data/context does the presenter need visible during scoring?
- How should the competing advance actions be reconciled?
- What layout changes would best serve the scoring task?
- Are there accessibility or touch-target issues in the current scoring UI?

## Assumptions & Unknowns

### Known Knowns
- The scene engine has 16 scenes; `round_scoring` comes after `recap_qa` (last answer) and before `recap_scores`
- RoundScoringPanel uses spinbutton inputs per team, sorted by current score descending
- `setRoundScores()` applies scores to team state; `advanceScene('advance')` transitions to `recap_scores`
- The audience display syncs scoring progress via `updateRoundScoringProgress()`
- Quick score (1-9 keys) and TeamScoreInput (+/-) are both hidden during `round_scoring`

### Known Unknowns
- Is `setRoundScores()` idempotent? What happens if called twice or not at all?
- Does the N key (next_round) also skip scoring without saving?
- What does the audience RoundScoringScene actually display?
- How does the scoring panel interact with scores already accumulated via quick-score during question phases?
- Are there any tests covering the "advance without saving" path?

### Suspected Unknowns
- Whether the 3-column layout (question list / center / right sidebar) is the right layout for scoring at all
- Whether the RoundSummary component could be repurposed during scoring
- How the scene flow handles going back to `round_scoring` after advancing past it

## Domain Tags
1. **UI/Visual** — layout, space allocation, visual hierarchy during scoring
2. **React/Components** — component boundaries, what renders where, prop flow
3. **State Management** — competing advance paths, score persistence, data consistency
4. **Accessibility** — touch targets, keyboard flow, screen reader experience
5. **Architecture** — scene engine design, separation of concerns between nav and scoring

## Quality Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Evidence strength | 25% | Findings backed by specific code references and observable behavior |
| Completeness | 20% | Covers all 4 identified issues plus any discovered issues |
| Accuracy | 20% | Claims are technically correct about the codebase |
| Actionability | 15% | Findings are specific enough to inform design decisions |
| Nuance | 10% | Acknowledges trade-offs and multiple valid approaches |
| Clarity | 10% | Well-organized, comprehensible to the project developer |

## 5 Investigation Areas

### Area 1: Layout & Visual Hierarchy
**Domain:** UI/Visual
**Focus:** Analyze the 3-column layout during `round_scoring`. What's visible, what's hidden, what's wasted space. Compare with other `between_rounds` scenes. How much screen real estate does the scoring UI actually get vs need?

### Area 2: Data Flow & Score Persistence
**Domain:** State Management
**Focus:** Trace the full data flow of `setRoundScores()` — what it does to team state, how it interacts with scores accumulated via quick-score during play, whether it's idempotent, what happens if skipped. Trace the `advanceScene('advance')` path from both the Done button and SceneNavButtons.

### Area 3: Scene Transition & Navigation Consistency
**Domain:** Architecture
**Focus:** Map all ways to leave `round_scoring` (Done button, nav forward button, ArrowRight key, N key, Enter key). For each: does it save scores? Is the behavior documented? How does this compare to other scenes where the nav button and scene-specific actions coexist?

### Area 4: Answer Reference & Context During Scoring
**Domain:** React/Components
**Focus:** What information does the presenter need while entering scores? Currently no answer reference is available. Investigate: what does the audience see during `round_scoring`? What data is available in the store that could be surfaced? How does the `recap_qa` → `round_scoring` transition work — could answer data persist?

### Area 5: Accessibility & Input Ergonomics
**Domain:** Accessibility
**Focus:** Evaluate the RoundScoringPanel's input UX — spinbutton sizing, keyboard flow between inputs, touch targets, Enter key behavior within inputs vs global keyboard shortcuts. Check for conflicts between the scoring panel's keydown handlers and the global game keyboard handler.
