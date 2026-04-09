# Iteration: Layout Quantification

## Assignment
Quantify the layout waste during `round_scoring` and analyze how the scoring panel scales with team count.

## Findings

### Finding: Center Panel Uses 59.8% of Width for Inactive Content
- **Evidence:** On 1440px viewport: left rail w-64=256px, center flex-1=864px (59.8%), right sidebar w-80=320px (22.2%). QuestionDisplay renders ~600-700px of actual content within the 864px center, leaving 164-264px of padding/whitespace. Content is stale (last round question) and non-actionable.
- **Confidence:** High
- **Relation to Phase 1:** Confirms and quantifies Area 1's "layout inversion" finding.
- **Significance:** The primary task (scoring) gets 22% of width while inactive reference gets 60%.

### Finding: RoundScoringPanel Overflows at 5-6 Teams in Sidebar
- **Evidence:** TeamManager consumes ~380px at top of right sidebar (max-h-[300px] team list + header). Remaining space for RoundScoringPanel: 844px - 380px = 464px. Per-team row: 52px minHeight + 8px gap = 60px effective. Panel fixed overhead: 132px (header + instructions + action buttons). At 6 teams: 132 + (6 × 60) = 492px > 464px available. Overflow begins.
- **Confidence:** High
- **Relation to Phase 1:** Extends Area 1's finding with exact measurements.
- **Significance:** With 6+ teams (a common count for bar trivia), the scoring panel requires scrolling within the right sidebar. The center panel's 864px sits mostly empty while the scoring UI scrolls in 320px.

### Finding: Panel Fits 12 Teams Standalone, But Only 5 in Sidebar
- **Evidence:** Standalone (full 844px height): 132px overhead + (12 × 60px) = 852px. In sidebar with TeamManager: 464px available, fits ~5 teams (132 + 5×60 = 432px).
- **Confidence:** High
- **Relation to Phase 1:** New quantification not in Phase 1.
- **Significance:** Moving the scoring panel to the center panel would nearly triple the available vertical space (464px → 844px), eliminating scrolling until 12+ teams.

### Finding: No Independent Overflow Handling for RoundScoringPanel
- **Evidence:** play/page.tsx line 497 — right sidebar has `overflow-y-auto`. RoundScoringPanel scrolls as part of sidebar content, competing with TeamManager. No independent scroll container.
- **Confidence:** High
- **Relation to Phase 1:** New finding.
- **Significance:** Both TeamManager and RoundScoringPanel share the same scroll context. User must scroll past TeamManager to access scoring inputs.

## Resolved Questions
- At what team count does overflow begin? **5-6 teams** in sidebar (with TeamManager), **12 teams** standalone.
- How much width is wasted? **864px (59.8%)** on non-actionable content.

## Remaining Unknowns
- Actual TeamManager height with collapsed/expanded states and different team counts.
- Behavior on smaller viewports (1280px, tablet).

## Revised Understanding
The layout problem is more severe than Phase 1 suggested. The scoring panel overflows at just 5-6 teams — well within the normal range for bar trivia (typically 8-20 teams). Moving the scoring UI to the center panel would provide 2.7x more vertical space and align visual hierarchy with task importance.
