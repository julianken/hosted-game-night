# Context Packet: Phase 0

## Analysis Question
Redesign trivia setup wizard Step 2 (Settings): remove "Questions Per Round" input, keep "Number of Rounds", add "By Category" radio (default ON) that auto-organizes rounds by category. Total questions are known from Step 1.

## Key Architecture
- **Wizard**: SetupWizard.tsx → 4 steps (Questions, Settings, Teams, Review)
- **Settings store**: `stores/settings-store.ts` — persists roundsCount, questionsPerRound to localStorage
- **Game store**: `stores/game-store.ts` — holds TriviaGameState with questions[], settings
- **Engine**: `lib/game/questions.ts` importQuestions() computes totalRounds from max roundIndex
- **API importer**: `components/presenter/TriviaApiImporter.tsx` assigns roundIndex via `Math.floor(index / questionsPerRound)`
- **Categories**: `lib/categories.ts` — 7 canonical categories, utilities for filtering/statistics
- **Question type**: has `category: QuestionCategory` and `roundIndex: number`

## Scope
- `apps/trivia/` only (no other apps affected)
- Step 2 UI component, settings store, round assignment logic, validation
- Templates and presets that may store questionsPerRound

## Quality Focus
Evidence-based: cite file paths and line numbers. Flag all consumers of questionsPerRound.
