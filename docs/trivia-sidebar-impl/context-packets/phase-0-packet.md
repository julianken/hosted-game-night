# Context Packet: Phase 0

## Problem
Implement the trivia sidebar removal based on completed analysis at `docs/trivia-sidebar-removal/phase-4/analysis-report.md`. Break into discrete Linear issues (BEA-###), each one worktree + one PR.

## Key Files
- `apps/trivia/src/app/play/page.tsx` — sidebar at lines 496-563, handleNextRound at 89-93, auto-show at 78-82, dual useQuickScore at 172, confirmNewGame at 125-135
- `apps/trivia/src/hooks/use-quick-score.ts` — hook with independent useState/useRef per call
- `apps/trivia/src/hooks/use-game-keyboard.ts` — keyboard useQuickScore instance at line 100
- `apps/trivia/src/components/presenter/TeamManager.tsx` — rename ungated at 88-95
- `apps/trivia/src/components/presenter/TeamScoreInput.tsx` — sole setTeamScore callsite at 27-35
- `apps/trivia/src/components/presenter/QuickScoreGrid.tsx` — visual scoring grid
- `apps/trivia/src/components/presenter/RoundSummary.tsx` — handles ended state correctly, orphaned from trigger
- `apps/trivia/src/lib/game/rounds.ts` — nextRound no-op guard at 24-25

## Work Items Identified by Analysis
1. Fix handleNextRound latent bug (prerequisite for replacement)
2. Build ended-state replacement (auto-show + re-open affordance)
3. Delete sidebar (atomic with #2)
4. Fix dual useQuickScore bug (independent)
5. Fix divergent reset bug (independent)
6. Layout cleanup (max-width constraints)
7. Skip link a11y fix (independent)
8. File SHOULD RELOCATE items as Linear issues (rename, score override)

## Constraints
- One Linear issue = one worktree = one PR
- `--repo julianken/joolie-boolie` for gh pr create
- Never `--no-verify`
- `pnpm test:e2e` + `pnpm test:e2e:summary` before final commit
- Scope: `apps/trivia/src/` only

## Evaluation Criteria
| Criterion | Weight |
|-----------|--------|
| Correctness | 25% |
| Risk mitigation | 20% |
| Dependency ordering | 20% |
| Parallelizability | 15% |
| Testability | 10% |
| Scope control | 10% |
