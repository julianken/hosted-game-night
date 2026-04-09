# Iteration: By-Category Algorithm Design

## Assignment
Design the round assignment algorithm for both "By Category" and "By Count" modes.

## Findings

### New Module: `lib/questions/round-assignment.ts`
- **Evidence:** `lib/questions/` holds pure transform functions (api-adapter, conversion, parser, validator, exporter). Round assignment is a question-array transform — same layer.
- **Confidence:** high
- **Significance:** Clean module boundary, barrel-exported via `lib/questions/index.ts`

### `assignRoundsByCategory(questions)` Algorithm
1. `getCategoryStatistics(questions)` returns groups sorted by count descending
2. Extract ordered category IDs
3. For each category (roundIndex 0, 1, 2...), filter questions and assign roundIndex
4. Preserves input order within each group (stable via `.filter()`)
- **Evidence:** `getCategoryStatistics` at categories.ts:289 already sorts descending. `filterQuestionsBySingleCategory` at :330 preserves order. `normalizeCategoryId` handles legacy categories.
- **Confidence:** high

### `assignRoundsByCount(questions, roundsCount)` Algorithm
1. `questionsPerRound = Math.ceil(total / roundsCount)`
2. `roundIndex = Math.floor(index / questionsPerRound)`
3. Last round gets remainder (fewer questions)
- **Evidence:** `getApiConversionSummary()` at api-adapter.ts:282 already uses Math.ceil for round count. Consistent formula.
- **Confidence:** high

### Edge Case: roundsCount > questions.length
- With QPR=1, only produces as many rounds as questions exist
- Engine derives totalRounds from maxRoundIndex+1, so empty rounds don't appear
- V3 validation flags empty rounds — this is correct behavior
- **Confidence:** high

## Resolved Questions
- "Where should functions live?" → `lib/questions/round-assignment.ts`
- "What formula for assignRoundsByCount?" → `Math.ceil(total/rounds)` for QPR, `Math.floor(index/QPR)` for assignment

## Remaining Unknowns
- None — algorithm is fully specified

## Revised Understanding
Both functions are pure, testable, ~15 lines each. The existing category utility library provides everything needed. No new utilities required.
