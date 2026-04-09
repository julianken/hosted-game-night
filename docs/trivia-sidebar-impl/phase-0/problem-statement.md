# Phase 0: Problem Statement — Trivia Sidebar Removal Implementation

## Problem Restatement

1. The trivia presenter view (`/play`) has a 320px right sidebar that the analysis funnel (docs/trivia-sidebar-removal/) concluded should be removed.
2. Removal is blocked by one hard prerequisite: the "View Final Results" button is the only way to access final standings when `status === 'ended'`. This must be relocated atomically with sidebar deletion.
3. A latent bug in `handleNextRound` (page.tsx:89-93) unconditionally sets `audienceScene` to `round_intro` even during `ended` state — becomes high-severity the moment any ended-state replacement is added. Must be fixed before replacement ships.
4. Two confirmed production bugs exist today (independent of removal): dual `useQuickScore` instances causing visual desync + broken undo, and a divergent reset path that skips confirmation and preserves teams.
5. Two sidebar-exclusive features merit relocation as follow-up: mid-game team rename and direct score override (`setTeamScore`).
6. Per-round score breakdown is acceptable loss (data in recap flow).
7. Center panel gains +37% width after removal — needs `max-w-*` constraints and visual verification.
8. Pre-existing a11y bug: skip link targets `#main` (a `<div>`) instead of `#main-content` (the `<main>` element).
9. The project uses Linear (BEA-### format), one issue = one worktree = one PR, all work via dispatched subagents.

## Assumptions

- **Assumed true:** The analysis report's findings are accurate (code-traced, definitive confidence on all blockers).
- **Assumed true:** `RoundSummary` component already handles `ended` state correctly — only the trigger is missing.
- **Assumed true:** Keyboard scoring (digit keys 1-9) continues to work without the sidebar.
- **Unknown:** Whether the two production bugs (dual useQuickScore, divergent reset) have been observed by real users. This affects filing urgency but not the fix strategy.
- **Unknown:** Whether `id="game-controls"` is referenced elsewhere in the codebase. Must be checked before removal.
- **Design decision needed:** What should happen when "End Game" is clicked from RoundSummary during `ended` state? (Dismiss only? Reset flow? Confirmation?)

## Domain Tags

1. **React/Components** — Component restructuring, hook cleanup, new auto-show logic
2. **State Management** — Zustand store interactions, scene state machine, audienceScene transitions
3. **Testing** — Zero-test ended-state flow needs coverage, existing test gaps
4. **UI/Visual** — Layout changes (+320px), max-width constraints, visual verification
5. **Accessibility** — Landmark removal, skip link fix, focus management

## Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Correctness | 25% | Does the plan solve all identified issues completely? |
| Risk mitigation | 20% | Are failure modes covered? Can each change be verified independently? |
| Dependency ordering | 20% | Are prerequisites satisfied before dependent work? |
| Parallelizability | 15% | How much work can run concurrently? |
| Testability | 10% | Can each work unit be verified with automated tests? |
| Scope control | 10% | Does each unit have clear boundaries? No scope creep? |

## 5 Investigation Areas

### Area 1: Dependency Graph & Sequencing (Architecture)
What is the precise dependency graph between all identified work items? Which items can truly parallelize vs. which have hard prerequisites? Map the critical path.
**Agent type:** `feature-dev:code-architect`

### Area 2: Ended-State Replacement Design (React/Components + State Management)
How should the ended-state UI vacuum be filled? Auto-show on `status → ended`? Persistent button in center panel? What does the `handleNextRound` fix look like? How does the auto-show interact with the existing auto-show/auto-hide effects?
**Agent type:** `frontend-excellence:react-specialist`

### Area 3: Bug Fix Scoping (React/Components + State Management)
What is the minimal fix for each of the two production bugs (dual useQuickScore, divergent reset)? Can they be fixed in the sidebar-present state? What tests should accompany each fix? Are they truly independent of the removal?
**Agent type:** `frontend-excellence:react-specialist`

### Area 4: Sidebar Deletion Mechanics (React/Components + UI/Visual)
What exactly gets deleted/modified when the sidebar is removed? What are all the references to sidebar components, hooks, and state that must be cleaned up? What layout changes are needed (max-width, responsive)?
**Agent type:** `feature-dev:code-architect`

### Area 5: Test Strategy & Verification (Testing + Accessibility)
What tests need to be written or modified? What is the E2E verification plan for the ended-state flow? What manual Playwright MCP checks are needed for visual and a11y verification?
**Agent type:** `backend-development:tdd-orchestrator`
