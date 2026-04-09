# Context Packet: Phase 2

## Key Findings

1. **Each sidebar function has a clear replacement**: TeamManager rename → modal or click-to-edit, QuickScoreGrid → center panel below nav buttons, RoundScoringPanel → center panel primary card, TeamScoreInput ±1 → drop (keyboard duplicates), TeamScoreInput direct-set → compact ScoreEditor, "View Final Results" → auto-show in center on ended status, "Start New Game" → already redundant with top-bar + R key. (Iterator 1, high confidence)

2. **Forward button should use transient `disabled: true`** (38% opacity, label visible) — matching existing reveal-lock pattern in SceneNavButtons. No toast. N key silently rejected by same gate. Done button unchanged. NextActionHint text updates to remove "sidebar" reference and clarify gating. (Iterator 2, high confidence)

3. **Side-by-side merged layout recommended**: Scoring form in ~400px left column, Q&A reference in flex-1 right column. Hide SceneNavButtons + NextActionHint during `round_scoring` — Done button is the sole advancement path. Consolidate duplicate "Round N Scoring" headers. Replace hardcoded `max-h-[calc(100vh-400px)]`. (Iterator 3, high confidence)

4. **Only `round_scoring` needs center panel changes** among 5 between-rounds scenes. Backward re-entry from `recap_qa` preserves `roundScoringSubmitted: true`. Forward button reaches degenerate never-visible-enabled state in normal flow (auto-advance fires first). 8 production files + 2 test files require changes. (Iterator 4, high confidence)

5. **Skip link `href="#game-controls"` is a hard accessibility break** if sidebar removed — must remove in same commit. Undo stacks (QuickScoreGrid vs RoundScoringPanel) are independent and scene-coordinated, not location-coordinated. No E2E selector coupling. Flex layout degrades cleanly to 2-column. (Iterator 5, high confidence)

## Confidence Levels

- **High confidence**: All 5 iterators produced high-confidence findings backed by specific code references
- **Medium confidence**: 20-team ergonomics in 2-column grid tab order, exact responsive behavior below 1200px viewports
- **Low confidence**: Whether `max-h-[calc(100vh-400px)]` constant is correct in merged layout (needs empirical verification)

## Convergences

- Iterators 1+3+4 agree: only `round_scoring` needs significant center panel restructuring
- Iterators 2+4 agree: forward button disabled state is the correct feedback mechanism (not toast, not modal)
- Iterators 3+4 agree: SceneNavButtons should be hidden during `round_scoring` (Done button is sole advancement path, forward button is degenerate)
- Iterators 1+5 agree: sidebar removal is low-risk for CSS/layout (flex-1 expands naturally)
- Iterators 4+5 agree: backward re-entry preserves submitted state (no re-gating)

## Contradictions

- Iterator 2 proposes keeping forward button visible (disabled at 38% opacity) during `round_scoring`
- Iterator 3 proposes hiding SceneNavButtons entirely during `round_scoring`
- Iterator 4 resolves: forward button never appears enabled in normal flow anyway, so hiding is cleaner than showing a permanently-disabled button. On backward re-entry, it would be enabled but redundant.

## Open Questions

- Should SceneNavButtons be hidden or disabled during `round_scoring`? (Iterators 2 vs 3 disagree; Iterator 4 leans toward hiding)
- What replaces TeamManager rename if sidebar is removed? Modal vs click-to-edit vs omit entirely?
- Should QuickScoreGrid move to center panel for its active scenes (round_summary, etc.)?
- Does `roundScoringSubmitted` need to be in BroadcastChannel sync payload?

## Artifacts

- phase-2/iterator-1-sidebar-replacement.md: Sidebar function replacement design
- phase-2/iterator-2-gating-ux.md: Gating UX feedback mechanisms
- phase-2/iterator-3-merged-layout.md: Merged center panel layout design
- phase-2/iterator-4-scene-flow-crosscut.md: Cross-cut scene flow impact analysis
- phase-2/iterator-5-sidebar-removal-validation.md: Sidebar removal hidden dependencies
