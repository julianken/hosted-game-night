# Investigation: Layout & Visual Hierarchy

## Summary

During `round_scoring`, the trivia presenter's 3-column layout distributes work extremely unevenly: the primary task (entering per-team scores) is confined to the w-80 right sidebar while the flex-1 center panel renders a completely stale question card from the previous round — a leftover from gameplay that has zero relevance to score entry. The RoundSummary overlay (`showRoundSummary`) is always false during `round_scoring`, meaning no summary context appears anywhere in the layout. The scoring form is architecturally correct (right sidebar, functional, accessible) but the center panel is effectively dead real estate that actively competes for visual attention without contributing anything. Compared to other `between_rounds` scenes, `round_scoring` is unique in that nothing changes in the center panel — all other scenes either show the RoundSummary inline or are navigating through recap flows.

## Key Findings

### Finding 1: Center panel renders stale question content during score entry

- **Evidence:** `apps/trivia/src/app/play/page.tsx:389-402` — The center `<main>` unconditionally renders `<QuestionDisplay question={game.selectedQuestion} ...>` wrapped in a `bg-surface border` card. There is no conditional on `audienceScene` or `isRoundScoringScene` around this block. Whatever question was last selected when the round ended remains on screen throughout the entire `round_scoring` scene.
- **Confidence:** High
- **Implication:** A question card with its text, answer options grid, "Show/Hide on Display" toggle, and "Peek" button — all of which are meaningless when the round is over and score entry is the task — occupies roughly 60-70% of the horizontal viewport. This is the wrong component for this moment in the game flow. From a component API perspective, `QuestionDisplay` has no variant or prop to suppress itself or degrade gracefully for non-playing states; it renders fully whenever `question !== null`.

### Finding 2: RoundSummary overlay is always hidden during `round_scoring`

- **Evidence:** `apps/trivia/src/app/play/page.tsx:66-70` — The `showRoundSummary` state is forced to `false` whenever `game.status === 'between_rounds' && audienceScene !== 'round_summary'`. Since `round_scoring` is a `between_rounds` scene that is not `round_summary`, the overlay is actively suppressed. The auto-show effect at lines 75-79 only fires when `audienceScene === 'round_summary'`.
- **Confidence:** High
- **Implication:** The presenter has no summary context (current scores, standings, round winner) visible anywhere on screen while filling in the scoring form. The RoundScoringPanel does show each team's `Total: {team.score}` as a sub-label under the team name (`RoundScoringPanel.tsx:205-207`), but this is a compact inline display — not the full scoreboard that RoundSummary provides. The presenter must remember the game state from memory.

### Finding 3: RoundScoringPanel is the sole action-relevant component in the right sidebar during `round_scoring`

- **Evidence:** `apps/trivia/src/app/play/page.tsx:500-544` — The right sidebar renders: (1) `<TeamManager>` always, (2) `<QuickScoreGrid>` when `isScoringScene && !isRoundScoringScene`, (3) `<RoundScoringPanel>` when `isRoundScoringScene`, (4) `<TeamScoreInput>` when `!isScoringScene && !isRoundScoringScene`. The three right-panel widgets are mutually exclusive via the scoring-scene flags. During `round_scoring`, only TeamManager + RoundScoringPanel render.
- **Confidence:** High
- **Implication:** The mutual exclusion is correctly implemented — QuickScoreGrid and TeamScoreInput are correctly suppressed. However, the entire right sidebar (w-80 = 320px) must accommodate TeamManager stacked above RoundScoringPanel. With N teams, TeamManager renders N team rows plus Add Team UI, and RoundScoringPanel renders N score input rows. On a typical 1920px wide presenter display, 320px is a narrow column for what is the only interactive task on screen.

### Finding 4: SceneNavButtons and NextActionHint render in center panel for all scenes uniformly

- **Evidence:** `apps/trivia/src/app/play/page.tsx:405-408` — `<SceneNavButtons>` and `<NextActionHint>` render unconditionally below the QuestionDisplay card in the center panel. `SceneNavButtons.tsx:62-65` shows the forward button dispatches `advanceScene(SCENE_TRIGGERS.ADVANCE)` for `round_scoring`, which advances the scene normally.
- **Confidence:** High
- **Implication:** The forward arrow button ("advance") lives in the center panel, separated from the "Done" submit button in RoundScoringPanel which is the natural completion action. These are two competing "finish this step" affordances in different columns: pressing forward in center advances without committing scores, while "Done" in the right sidebar commits scores then advances. The presenter must understand which one to use. The `Done` button in RoundScoringPanel calls `onSubmitScores` then internally triggers `advanceScene('advance')` — so it is the correct path — but the center panel's forward arrow also works as an escape hatch.

### Finding 5: Column widths create a 1:4:2.5 ratio that inverts task importance

- **Evidence:** `apps/trivia/src/app/play/page.tsx:363-378` (left rail: `w-64` = 256px), `apps/trivia/src/app/play/page.tsx:381-492` (center: `flex-1`), `apps/trivia/src/app/play/page.tsx:495-571` (right sidebar: `w-80` = 320px). On a 1440px viewport, flex-1 center receives approximately 864px.
- **Confidence:** High
- **Implication:** The component with the active task (RoundScoringPanel) gets 320px. The component with no relevant content for this scene (QuestionDisplay) gets ~864px. This is the canonical layout inversion problem in design systems — the column widths were designed for the `playing` state (question display deserves hero space), but the layout never adapts to `between_rounds` scenes where score management is primary.

### Finding 6: QuickScoreGrid correctly suppresses itself but leaves its absence unexplained

- **Evidence:** `apps/trivia/src/app/play/page.tsx:513` — `isScoringScene` is defined as `audienceScene === 'question_closed' || audienceScene === 'answer_reveal' || audienceScene === 'round_summary'` (lines 170-174). `round_scoring` is explicitly excluded from this set. QuickScoreGrid is hidden via `!isRoundScoringScene` guard.
- **Confidence:** High
- **Implication:** The suppression logic is correct — per-question scoring and per-round scoring should not coexist. However, the `isScoringScene` constant's name implies it covers all scoring scenes, which it does not (`round_scoring` is a scoring scene by name but excluded by value). This naming creates a vocabulary mismatch in the component composition layer. A future maintainer could incorrectly extend `isScoringScene` to include `round_scoring` and create a widget collision.

## Scene Comparison: `between_rounds` Scenes

| Scene | Left Rail | Center Panel: Question Card | Center Panel: Round Summary inline | Right Sidebar Active Widget |
|---|---|---|---|---|
| `round_summary` | QuestionList (all rounds) | Stale question card (always shown) | RoundSummary rendered if `showRoundSummary=true` (auto-triggered) | TeamScoreInput (not scoring/round-scoring scene) |
| `recap_title` | QuestionList | Stale question card | Hidden (auto-hidden when scene != round_summary) | TeamScoreInput |
| `recap_qa` | QuestionList | Stale question card | Hidden | TeamScoreInput |
| `recap_scores` | QuestionList | Stale question card | Hidden | TeamScoreInput |
| `round_scoring` | QuestionList | Stale question card | Hidden (actively suppressed) | **RoundScoringPanel** |

Key observation: the center panel's QuestionDisplay renders identically across ALL five `between_rounds` scenes. No scene differentiation occurs in the center column during `between_rounds`. The only visual change between these scenes is which right-sidebar widget is active, and whether the RoundSummary is injected below the question card in the center panel's scrollable area.

## Visual Hierarchy Analysis

First eye landing during `round_scoring`:
1. **QuestionDisplay (center panel)** — largest surface area, high contrast question text at `text-2xl font-semibold`, answer options in a 2-column grid. The eye goes here first.
2. **Header bar** — status badge, audience scene indicator at the top.
3. **TeamManager (right sidebar, top)** — team list, always first in the right sidebar stacking order.
4. **RoundScoringPanel (right sidebar, below TeamManager)** — the actual task, but below the fold if there are many teams in TeamManager.
5. **SceneNavButtons (center panel, below question card)** — back/forward navigation.

The correct priority hierarchy for `round_scoring` would be: scoring form > team context > navigation. The actual rendered hierarchy inverts this: stale question > team management > scoring form.

## Surprises

- The `showRoundSummary` state is actively reset (not just unset) when `audienceScene !== 'round_summary'` during `between_rounds`. This means entering `round_scoring` via `advanceScene` from `round_summary` will immediately hide the summary that was just showing. The presenter loses the context right as they need it for score entry.
- `QuestionDisplay` has no empty-state handling for `between_rounds` context — the `question === null` guard only renders a "Select a question" message; there is no scene-aware empty state or suppression.
- The `RoundScoringPanel` sorts teams by descending `team.score` (`sortedTeams` at line 65 of `RoundScoringPanel.tsx`) while `TeamManager` above it sorts differently (insertion order). The two team lists in the same right sidebar column display teams in different orders, which is a visual inconsistency.
- The `Done` button in RoundScoringPanel changes visual treatment based on `allEntered` state (primary color vs surface-elevated), but the center panel's forward arrow has no corresponding state to show "score entry in progress."

## Unknowns & Gaps

- What `game.selectedQuestion` is set to when `round_scoring` begins — is it always the last question of the completed round, or could it be null if the presenter navigated away? The current analysis assumes it is non-null (showing a stale question), but behavior when null would show the "Select a question from the list" empty state instead.
- Whether TeamManager scrolls out of view in the right sidebar when there are many teams (e.g., 8+), pushing RoundScoringPanel below the initial viewport of the sidebar column. The sidebar has `overflow-y-auto` (page.tsx:497) so it scrolls, but the fold position for RoundScoringPanel with large team counts was not tested.
- What `NextActionHint` renders during `round_scoring` — this component was not inspected and may provide useful or contradictory guidance in the center panel.
- Whether the audience display (`/display`) shows anything meaningful during `round_scoring` on the projection screen — the scoring flow is presenter-side, but this affects whether the audience sees the stale question or a dedicated scoring scene.

## Raw Evidence

- `apps/trivia/src/app/play/page.tsx` — full file, 603 lines. Key sections: layout structure (246-572), center panel (380-492), right sidebar (494-571), scoring scene flags (169-183), showRoundSummary effects (60-79).
- `apps/trivia/src/components/presenter/RoundScoringPanel.tsx` — full file, 312 lines. Key sections: team sorting (65), score input row rendering (160-244), action buttons (248-309).
- `apps/trivia/src/components/presenter/QuestionDisplay.tsx` — full file, 170 lines. Key sections: null guard (24-32), question text render (126-130), options grid (133-166).
- `apps/trivia/src/components/presenter/RoundSummary.tsx` — full file, 117 lines.
- `apps/trivia/src/components/presenter/SceneNavButtons.tsx` — full file, 146 lines. Key: round_scoring forward dispatch (62-65).
- `apps/trivia/src/types/audience-scene.ts` — full file, 192 lines. Key: between_rounds valid scenes (184-188).
