# Context Packet: Phase 1

## Key Findings

1. **Critical path is 4 sequential PRs:** handleNextRound fix → ended-state replacement → sidebar deletion → layout cleanup
2. **Ended-state replacement: auto-show + persistent re-open button recommended.** Three localized changes to page.tsx only. RoundSummary component needs no changes.
3. **handleNextRound fix:** Add `status === 'ended'` early return that dismisses overlay and skips the no-op nextRound() + invalid setAudienceScene.
4. **Sidebar deletion is ~75 lines from page.tsx:** 4 imports, 1 hook, 1 constant (isScoringScene — confirmed dead, only used inside sidebar at lines 516/526), 68-line JSX block.
5. **QuickScoreGrid.tsx should be deleted** (zero consumers after removal). TeamManager survives (WizardStepTeams). TeamScoreInput stays dormant (SHOULD RELOCATE).
6. **View Final Results has ZERO tests at all levels.** E2E test is mandatory in removal PR.
7. **Bug fixes touch lines inside the deletion zone.** Fixing independently creates short-lived patches.

## Contradictions

1. **Bug fix sequencing:** Area 1 says fix bugs independently before removal (parallel work, fixes production today). Area 3 says both bugs are inside the deletion zone — fixing independently is wasted churn since lines get deleted by the sidebar PR. **Tension: production bug fix urgency vs. code churn.**
2. **Dual useQuickScore validity:** Area 5 claims it's NOT a real bug ("no second useQuickScore() call inside QuickScoreGrid"). This is incorrect — the bug is two separate useQuickScore() calls in different files (page.tsx:172 vs use-game-keyboard.ts:100), not inside QuickScoreGrid. The prop passing doesn't eliminate the dual-instance state desync. **Resolution: the bug is real, Area 5 is wrong on this point.**

## Carry-Forward Concerns

1. Should bug fixes be separate PRs (production urgency) or absorbed into the sidebar deletion PR (avoid churn)?
2. What is the exact code for the handleNextRound fix — simple early return or a new handler?
3. Should QuickScoreGrid.tsx be deleted in the sidebar PR or separately?

## Artifacts
- phase-1/area-1-dependency-graph.md: Critical path, conflict matrix, sequencing recommendation
- phase-1/area-2-ended-state-design.md: 3 approaches for replacement, recommended auto-show + button
- phase-1/area-3-bug-fixes.md: Both bugs scoped, minimal fixes, absorption argument
- phase-1/area-4-deletion-scope.md: Complete deletion manifest, component survival, layout changes
- phase-1/area-5-test-strategy.md: Test matrix, 5 E2E to delete, 5 new needed, zero-test gaps
