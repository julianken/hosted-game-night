# Phase 0: Analysis Brief — Trivia Round Configuration Redesign

## Analysis Question

How should the trivia setup wizard's round configuration (Step 2) be redesigned to:

1. **Remove "Questions Per Round" input** — since total questions are known from Step 1, QPR is derived as `totalQuestions / roundsCount`
2. **Add "Number of Rounds" input** — replaces QPR as the primary control, with computed QPR shown as an info label
3. **Add "By Category" radio button** (default ON) — auto-organizes rounds by question categories, disabling manual round count
4. **Ensure propagation** — changes must flow correctly through settings store, game engine, validation, and all consumers

## Assumptions & Unknowns

### Known Knowns
- Total question count is known after Step 1 (TriviaApiImporter)
- Each `Question` has `category: QuestionCategory` (7 canonical categories)
- Rich category utilities in `lib/categories.ts` (getUniqueCategories, getCategoryStatistics, filterByCategory)
- roundIndex currently assigned sequentially: `Math.floor(index / questionsPerRound)` in TriviaApiImporter.handleLoadIntoGame()
- importQuestions() engine function calculates totalRounds from max roundIndex and syncs settings.roundsCount
- Settings store persists roundsCount and questionsPerRound to localStorage (version 3)
- Validation V6 warns when per-round counts don't match questionsPerRound setting

### Known Unknowns
- All consumers of `questionsPerRound` beyond TriviaApiImporter and the engine
- Whether `questionsPerRound` can be removed from settings store or must remain for backward compat
- How "By Category" assignment handles unequal category counts (e.g., 12 science, 3 history)
- How computed QPR should handle non-evenly-divisible totals (e.g., 20 questions / 3 rounds)
- How other importers (QuestionSetSelector, file import) assign roundIndex
- What tests reference questionsPerRound

### Suspected Unknowns
- Whether audience display or scene engine depends on questionsPerRound
- Whether templates/presets store questionsPerRound and need migration
- Edge cases when "By Category" mode produces rounds of very different sizes

## Domain Tags
- **UI/Visual** — WizardStepSettings component redesign
- **React/Components** — Props flow, state management, component architecture
- **State Management** — Settings store, game store, round assignment logic
- **Architecture** — How settings propagate through engine, validation, and consumers

## Quality Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Evidence strength | 25% | Findings backed by concrete code references |
| Completeness | 20% | All consumers, all assignment patterns, all edge cases |
| Accuracy | 20% | Claims factually correct against the codebase |
| Actionability | 15% | Clear enough to implement from |
| Nuance | 10% | Trade-offs and edge cases acknowledged |
| Clarity | 10% | Organized and comprehensible |

## 5 Investigation Areas

### Area 1: questionsPerRound Consumers
Find every place that reads, writes, or depends on `questionsPerRound` — in stores, components, engine functions, API adapters, selectors, hooks, templates, presets, and tests. Determine which consumers can be removed vs. which need the value computed differently.

### Area 2: Round Assignment Patterns
Find all code paths that assign `roundIndex` to questions — TriviaApiImporter, QuestionSetSelector, file importers, question editor, api-adapter. Understand the current assignment logic and what needs to change for "by category" mode.

### Area 3: Category Data & Distribution
Analyze how categories are distributed in fetched questions, what the "by category" round assignment algorithm should look like, and how to handle edge cases (unequal counts, single category, more categories than reasonable round count).

### Area 4: Validation, Templates & Presets
Understand how removing QPR as an independent setting affects validation (V6), templates (stored in DB), presets (stored in DB), and settings persistence (localStorage). Determine migration needs.

### Area 5: UI Architecture & State Flow
Map the component tree for WizardStepSettings, understand how the "By Category" toggle should interact with round count, and how the computed QPR info label should work. Consider the flow from settings → importQuestions → game state.
