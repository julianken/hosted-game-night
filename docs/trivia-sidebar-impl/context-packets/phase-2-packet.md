# Context Packet: Phase 2

## Decisions Made

1. **5 PRs total:** PR-A (Items 1+2), PR-B (Items 3+4+5), PR-C (Item 6), PR-D (Item 7), PR-E (Item 8)
2. **Items 1+2 combined:** handleNextRound fix inseparable from ended-state replacement at the handler level
3. **Items 4+5 absorbed into Item 3:** Both bugs are inside the deletion zone. Structural elimination > patches. Critical path is 1-2 days.
4. **Items 2+3 stay separate PRs:** Intermediate redundancy is harmless. Cleaner review boundaries.
5. **QuickScoreGrid.tsx deleted:** Zero consumers, zero tests after sidebar removal

## Key Data — PR Specs

**PR-A (Items 1+2):** ~25 lines in page.tsx. Split handleNextRound into two handlers (handleNextRound for between_rounds, handleEndGameDismiss for ended). New auto-show effect: `if (game.status === 'ended') setShowRoundSummary(true)`. Re-open button: `{!showRoundSummary && game.status === 'ended' && (<button>View Final Results</button>)}`.

**PR-B (Items 3+4+5):** ~77 net lines removed from page.tsx. Delete 4 imports, Instance 2 hook (line 172), isScoringScene (175-179), sidebar block (496-563). Delete QuickScoreGrid.tsx file. Keep isRoundScoringScene, TeamManager.tsx, TeamScoreInput.tsx.

**PR-C (Item 6):** max-w-3xl wrapper, layout comment update, visual verification at 1280×800 and 1366×768.

**PR-D (Item 7):** Skip link `#main` → `#main-content`. 2 lines.

**PR-E (Item 8):** File 2 Linear issues for mid-game rename + score override relocation.

## Key Data — Tests

- 1 unit test for handleNextRound guard (stores/__tests__/game-store.test.ts)
- 5 new E2E tests for ended-state (auto-show, dismiss+reopen, winners, R-key reset, no scene corruption)
- 5 E2E tests deleted (Score Adjustment block, presenter.spec.ts:237-328)
- All 17 TeamManager + 18 TeamScoreInput + 8 useQuickScore unit tests survive
- 8 manual Playwright MCP checks for visual/a11y verification

## Carry-Forward Concerns

1. Should PR-B also add max-w wrapper (Iterator 4 includes it in deletion spec) or defer to PR-C (Iterator 3 says separate)?
2. The analysis report's R4 recommends atomicity for Items 2+3 — Iterator 3 rejects this. Phase 3 must reconcile.
3. PR-E (Linear issues) — need acceptance criteria for the SHOULD RELOCATE items

## Artifacts
- iterator-1-bug-sequencing.md: Option B chosen — absorb bugs into deletion PR
- iterator-2-ended-state-code.md: Exact code design for handleNextRound fix + auto-show + re-open
- iterator-3-pr-grouping.md: 5-PR structure with merge order
- iterator-4-deletion-spec.md: Precise deletion checklist with line numbers
- iterator-5-test-plan.md: Test matrix with 5 new E2E, 5 deleted, 1 unit test
