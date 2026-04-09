# Iteration: Answer Data Shape for Center Panel

## Assignment
Design what the center panel should show during `round_scoring` by analyzing available store data.

## Findings

### Finding: `teamAnswers` is Empty During Bar-Trivia `round_scoring`
- **Evidence:** `startGame()` initializes `teamAnswers: []` (lifecycle.ts:85). `setRoundScores()` (game-store.ts:214-252) preserves but never updates `teamAnswers`. `recordTeamAnswer()` (scoring.ts:95) exists for individual-question scoring but is not called in bar-trivia mode. Round scoring enters one aggregate score per team per round.
- **Confidence:** High
- **Relation to Phase 1:** Contradicts Area 4's suggestion that "all data needed for answer reference exists." Team-level answer data does NOT exist — only question data with correct answers.
- **Significance:** A per-team answer grid (30 cells for 5Q × 6T) is not possible in bar-trivia mode. The center panel should show question reference (correct answers) rather than team answer breakdowns.

### Finding: Round Questions with Correct Answers ARE Available
- **Evidence:** `questions` array persists through all transitions. Each `Question` has `text`, `correctAnswers[]`, `options[]`, `optionTexts[]`, `roundIndex`. Filter: `questions.filter(q => q.roundIndex === currentRound)`. Data is immediately available, no async fetch needed.
- **Confidence:** High
- **Relation to Phase 1:** Confirms Area 4 finding that question data is available.
- **Significance:** The center panel can display a compact round question list with correct answers as a facilitator reference sheet. For 5 questions, this would consume ~200-300px vertical space — well within the 844px available.

### Finding: RoundSummary is Reusable But Not Ideal for `round_scoring`
- **Evidence:** RoundSummary takes props: `currentRound`, `totalRounds`, `roundWinners`, `teamsSortedByScore`, `isLastRound`, callbacks. Shows "Round N Complete" header, round winner callout, top 5 standings. Pure presentational component, no store reads.
- **Confidence:** High
- **Relation to Phase 1:** Extends Area 4 finding. RoundSummary can be reused but is designed for post-round context, not mid-scoring context. Its "Next Round" and "Review Answers" buttons conflict with the scoring workflow.
- **Significance:** Extracting RoundSummary's standings display (without buttons) as a sub-component would provide useful scoring context. But the full RoundSummary is not the right fit.

### Finding: Recommended Center Panel Content
- **Evidence:** Based on available data shapes and the bar-trivia workflow:
  1. **Round question recap** — compact list showing Q number, text, and correct answer for each question this round. Computable from `questions.filter(q => q.roundIndex === currentRound)`.
  2. **Current standings** — ranked team list with cumulative scores. Available from `teams` sorted by `score` desc.
  3. No team-level answer data (empty `teamAnswers`), so no answer grid.
- **Confidence:** High
- **Relation to Phase 1:** Synthesizes Areas 1 and 4 into a concrete proposal.
- **Significance:** This uses only existing store data. Implementation requires: one new component (or conditional render within existing center panel) that filters questions by round and displays them with correct answers.

## Resolved Questions
- Can the center panel show per-team answer breakdowns? **No** — `teamAnswers` is empty in bar-trivia mode.
- What data IS available? Questions with correct answers, team standings, round number.
- Is RoundSummary reusable? **Partially** — standings display yes, full component no.

## Remaining Unknowns
- Whether `teamAnswers` will be populated in a future per-question scoring mode.
- Whether showing correct answers during scoring would be a spoiler concern for the audience (center panel is presenter-only, so likely fine).

## Revised Understanding
The center panel should show a **round question recap with correct answers** (facilitator reference sheet) plus **current standings**. This requires filtering existing store data — no new data sources needed. A per-team answer grid is not feasible in bar-trivia mode. The RoundSummary component's standings sub-display could be extracted and reused.
