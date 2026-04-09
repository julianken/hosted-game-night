# Context Packet: Phase 0

## Analysis Question
Can the right sidebar (320px `complementary` region) in trivia presenter view (`/play`) be safely removed? Hypothesis: all items are redundant or broken.

## Scope
- `apps/trivia/src/` only
- Presenter view: `apps/trivia/src/app/play/page.tsx`
- Non-goal: Don't design replacement or plan implementation

## Sidebar Contents (page.tsx lines 496-563)
- **TeamManager** (always shown when sidebar visible) — teams list, add/remove/rename
- **QuickScoreGrid** (scoring scenes: question_closed, answer_reveal, round_summary) — visual scoring grid
- **TeamScoreInput** (non-scoring playing/between_rounds) — +/- score buttons, per-round breakdown
- **Game Over block** (status === 'ended') — "View Final Results" + "Start New Game" buttons
- Sidebar hidden during `round_scoring` scene

## Key Store Actions Used by Sidebar
- `addTeam`, `removeTeam`, `renameTeam` (TeamManager)
- `adjustTeamScore`, `setTeamScore` (TeamScoreInput)
- Quick-score toggle (QuickScoreGrid via useQuickScore hook)
- `resetGame` (Game Over block)

## Quality Criteria
| Criterion | Weight |
|-----------|--------|
| Evidence strength | 25% |
| Completeness | 25% |
| Accuracy | 20% |
| Actionability | 15% |
| Nuance | 10% |
| Clarity | 5% |

## Artifacts
- `phase-0/analysis-brief.md`: Full analysis brief with 5 investigation areas
