# Analysis Brief: Trivia Presenter Right Sidebar Removal Safety

## Analysis Question

Can the right sidebar (`complementary` region, `w-80`/320px) in the trivia presenter view (`/play`) be safely removed without losing any exclusive functionality?

### Restatement

- The sidebar occupies 320px of a fixed-viewport 3-column layout (left nav w-64, center flex-1, right sidebar w-80)
- It contains 4 conditional sections: TeamManager, QuickScoreGrid, TeamScoreInput, and a "Game Over" block
- The sidebar is already hidden during `round_scoring` scene (BEA-673)
- The user's hypothesis is that all sidebar items are redundant (duplicated elsewhere) or not working properly
- The question is whether removal is safe — not whether to do it or how

### Key Sub-Questions

1. What functionality does each sidebar component provide?
2. For each function, is it available elsewhere in the UI (setup wizard, center panel, keyboard shortcuts, audience display)?
3. Are there any sidebar features that are the ONLY way to accomplish something?
4. What are the interaction patterns — when/why would a presenter use the sidebar during gameplay?
5. What are the risks of removal? (accessibility landmarks, keyboard navigation, responsive layout, game-ended state)

## Known Knowns

- Sidebar is defined at `page.tsx:496-563`
- 4 components: TeamManager (always), QuickScoreGrid (scoring scenes), TeamScoreInput (non-scoring playing/between_rounds), Game Over block (ended)
- Already hidden during `round_scoring` scene
- Quick-score keyboard keys (1-9) exist for scoring during gameplay
- Teams are managed in the setup wizard before game starts
- The center panel has RoundScoringPanel with spinbuttons during round_scoring
- Sidebar takes 320px, significant horizontal space from center content

## Known Unknowns

- Can teams be renamed outside the sidebar? (setup wizard may or may not have rename)
- Is TeamScoreInput (+/- buttons) duplicated by quick-score keys + round scoring panel?
- Does the QuickScoreGrid in the sidebar duplicate the keyboard quick-score functionality?
- What happens to the "Game Over" buttons (View Final Results, Start New Game) if sidebar is removed?
- Are there accessibility implications of removing the `complementary` landmark?
- What CSS/layout changes are needed if the right column disappears?

## Suspected Unknowns

- Whether any component in the sidebar triggers store actions not available via any other UI path
- Whether the sidebar has any role in the sync system
- Whether removing the sidebar affects the display/audience view in any way

## Domain Tags

1. **UI/Visual** — Layout, 3-column grid, responsive behavior, visual hierarchy
2. **React/Components** — Component tree, conditional rendering, props, state flow
3. **Architecture** — Store actions, game flow, state machine interactions
4. **Accessibility** — ARIA landmarks, screen reader nav, keyboard tab order, focus management
5. **State Management** — Zustand store, game status, scene engine, scoring flow

## Quality Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Evidence strength | 25% | Are findings backed by concrete code references? |
| Completeness | 25% | Does the analysis cover ALL sidebar functionality? |
| Accuracy | 20% | Are claims about redundancy/exclusivity factually correct? |
| Actionability | 15% | Can someone decide go/no-go on removal based on this? |
| Nuance | 10% | Does it acknowledge edge cases and risks? |
| Clarity | 5% | Is it well-organized and scannable? |

## 5 Investigation Areas

### Area 1: Sidebar Component Inventory & Functionality Mapping
**Domain:** React/Components, State Management
**Task:** Catalog every component in the sidebar, what it renders, what store actions it calls, what props it receives, and under what conditions it appears. Include the conditional rendering logic.

### Area 2: Redundancy Analysis — Feature Duplication Mapping
**Domain:** UI/Visual, React/Components
**Task:** For EACH sidebar feature (team list, rename, add/remove teams, +/- score, quick-score grid, game-over buttons), find where else in the UI the same functionality exists. Map sidebar feature → duplicate location with evidence.

### Area 3: Exclusive Functionality Detection
**Domain:** Architecture, State Management
**Task:** Identify any store actions, user flows, or capabilities that are ONLY accessible through the sidebar. Trace each store action used by sidebar components and check if any other component also calls it. Focus on: renameTeam, adjustTeamScore, setTeamScore, addTeam, removeTeam.

### Area 4: Accessibility & Landmark Impact
**Domain:** Accessibility
**Task:** Analyze the accessibility implications of removing the sidebar: ARIA landmarks (`complementary` region), skip links, keyboard tab order, focus management during game state transitions, screen reader navigation patterns.

### Area 5: Layout, CSS, & Game-State Edge Cases
**Domain:** UI/Visual, Architecture
**Task:** Analyze the CSS layout impact of removing the right column (3-col → 2-col), responsive behavior, and identify game-state edge cases — particularly the "Game Over" block which provides "View Final Results" and "Start New Game" buttons that may not exist elsewhere.
