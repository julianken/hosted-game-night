# Context Packet: Phase 1

## Key Findings

1. **"View Final Results" is sidebar-exclusive in ended state** — the auto-show logic fires only during between_rounds, not ended. No keyboard shortcut or other UI opens the RoundSummary overlay after game ends. This is the highest-risk item. (confidence: high)
2. **Mid-game team rename is sidebar-exclusive** — TeamManager's rename button is always visible regardless of game status, but the setup wizard only renders during status === 'setup'. No keyboard shortcut for rename. (confidence: high)
3. **setTeamScore (direct score override) is sidebar-exclusive** — TeamScoreInput's click-to-edit number input is the only UI for setting a score to an arbitrary number. Keyboard only does ±1 adjustments. (confidence: high)
4. **Per-round score breakdown table is sidebar-exclusive** — TeamScoreInput renders team.roundScores history; no other presenter component shows this. (confidence: high)
5. **QuickScoreGrid is fully redundant with keyboard** — keys 1-9/0 do identical toggleTeam calls. BUT: the grid provides visual feedback (which teams are scored) that keyboard-only lacks. Two separate useQuickScore instances exist. (confidence: high)
6. **Sidebar "Start New Game" has divergent behavior** — calls resetGame directly (no confirmation, preserves teams, doesn't reset audienceScene). Header/R key path shows confirmation modal and clears teams. The audienceScene not being reset is a bug. (confidence: high)
7. **Center panel has NO ended-state UI** — during status === 'ended', center shows stale last question while audience sees final_podium. Sidebar "Game Over" block is the only presenter-side ended-state acknowledgment. (confidence: high)

## Confidence Levels
- **High:** All 7 findings above — backed by specific code references from 5 investigators
- **Medium:** Accessibility test gap (no landmark tests exist, but this is about absence of tests, not presence of issues)
- **Low:** None — all investigators found strong evidence

## Contradictions & Open Questions
1. **Is mid-game rename actually used?** Area 1 and Area 3 confirm it exists and is intentional (not gated on status), but no investigator could determine usage frequency. Product question.
2. **Duplicate useQuickScore instances** — Area 1 found keyboard and visual scoring track separate state. Is this intentional design or latent bug? Removing sidebar makes the page.tsx instance dead weight.
3. **What replaces the ended-state UI?** Areas 3 and 5 converge on "View Final Results" being a hard blocker. Area 5 adds that the center panel has zero ended-state differentiation. Removal requires at minimum moving the "View Final Results" button elsewhere.

## Artifacts (read only if needed)
- `phase-1/area-1-component-inventory.md`: Full component catalog with props, conditions, store actions
- `phase-1/area-2-redundancy-mapping.md`: Feature-by-feature duplication map
- `phase-1/area-3-exclusive-functionality.md`: Store action exclusivity analysis
- `phase-1/area-4-accessibility.md`: Landmark structure, skip links, focus management, ARIA
- `phase-1/area-5-layout-edge-cases.md`: CSS layout, game-state edge cases, ended-state gap
