# Phase 0: Problem Statement — Round Scoring UI Implementation

## Problem Restatement

1. The `round_scoring` scene's scoring form (RoundScoringPanel) is cramped in a 320px sidebar while the center panel (864px) shows stale content — the layout must be reorganized.
2. Two scoring mechanisms (quick-score digit keys + panel form) write to the same data slot with conflicting semantics (additive vs destructive) — the panel should pre-fill with accumulated quick-score values.
3. Five exit paths exist from `round_scoring` but only the Done button persists panel data — the relationship between mechanisms must be made visible to the presenter.
4. No back navigation exists from `round_scoring` — the presenter cannot return to answer review.
5. Zero E2E/integration test coverage exists for the advance-without-save path — tests must precede navigation changes.
6. Dead state (`roundScoringInProgress`), dual Ctrl+Z handlers, and a latent double-advance race exist — cleanup is needed.
7. RoundScoringPanel uses local React state that is lost on unmount — this constrains relocation and back-navigation features.

## Assumptions
- The bar-trivia dual-mechanism design (quick-score primary, panel optional) is correct and should be preserved.
- The 3-column layout is correct for all other scenes — changes should be scoped to `round_scoring` only.
- The state machine architecture is sound and should be extended, not replaced.
- All changes must pass existing E2E tests + new tests before merging.

## Domain Tags
1. **React/Components** — component relocation, conditional rendering, state lifting
2. **State Management** — Zustand store changes, panel state lifting, pre-fill logic
3. **Architecture** — scene machine additions, navigation consistency
4. **Testing** — integration test strategy, E2E coverage

## Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| User impact | 25% | How much does this improve the presenter's scoring experience? |
| Correctness | 20% | Does it preserve bar-trivia semantics and fix identified issues? |
| Risk | 20% | What can break? How contained is the blast radius? |
| Complexity | 15% | How much new code/patterns does it introduce? |
| Testability | 10% | Can we verify it works with automated tests? |
| Maintainability | 10% | Will future developers understand the changes? |

## 5 Investigation Areas

### Area 1: Component Architecture for Center Panel
**Domain:** React/Components
**Focus:** How should the center panel content change during `round_scoring`? Options: (A) conditionally hide QuestionDisplay and show new scoring layout, (B) overlay/replace the center content, (C) create a scene-specific center panel component. How does RoundScoringPanel relocate without losing state? What about the round question recap component?

### Area 2: State Management — Panel Pre-fill and State Lifting
**Domain:** State Management
**Focus:** How should pre-fill work? Should panel entries be lifted to Zustand? What's the interaction between `roundScoringEntries` (audience display) and panel draft state? How does state lifting affect the Done button, undo, and advance-without-save paths?

### Area 3: Navigation & Keyboard Changes
**Domain:** Architecture
**Focus:** Back navigation implementation details. How to unify advance behavior (auto-save vs pre-fill makes it moot). Keyboard handler changes for ArrowLeft, Ctrl+Z scoping, Done button Enter fix.

### Area 4: Test Strategy
**Domain:** Testing
**Focus:** What's the minimum viable test suite before implementation? Integration (Vitest store tests) vs E2E (Playwright)? What specific scenarios must be covered? How to test the advance-without-save path?

### Area 5: Implementation Sequencing & Dependencies
**Domain:** Architecture
**Focus:** Dependency graph between the 6 recommendations. Which can be parallelized? What's the optimal ordering to minimize risk and maximize early value delivery? How many work units/tickets?
