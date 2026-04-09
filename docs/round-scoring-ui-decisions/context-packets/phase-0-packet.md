# Context Packet: Phase 0

## Problem
Implement 6 improvements to the trivia presenter's `round_scoring` scene: pre-fill panel with quick-score values, move scoring UI to center panel, add back navigation, establish test coverage, add UX guidance, clean up dead state.

## Constraints
- Preserve bar-trivia dual-mechanism design (quick-score primary, panel optional)
- Scope changes to `round_scoring` scene only — other scenes unaffected
- All changes must pass E2E tests locally before commit
- State machine is sound — extend, don't replace

## Key Files
- `apps/trivia/src/components/presenter/RoundScoringPanel.tsx` (scoring form, 312 lines)
- `apps/trivia/src/app/play/page.tsx` (presenter layout, 603 lines)
- `apps/trivia/src/lib/game/scene.ts` (state machine)
- `apps/trivia/src/hooks/use-game-keyboard.ts` (keyboard shortcuts)
- `apps/trivia/src/lib/presenter/nav-button-labels.ts` (nav labels)
- `apps/trivia/src/stores/game-store.ts` (Zustand store)
- `apps/trivia/src/lib/game/scene-transitions.ts` (transition side effects)

## Evaluation Criteria
User impact 25%, Correctness 20%, Risk 20%, Complexity 15%, Testability 10%, Maintainability 10%

## Analysis Report
Full analysis at `docs/round-scoring-ui-analysis/phase-4/analysis-report.md`
