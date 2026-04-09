# Investigation: Type and Utility Dependencies

## Summary
Types and utilities split into three tiers. QS-specific types (`QuestionSet`, `CreateQuestionSetRequest`, `UpdateQuestionSetRequest`) are never imported outside QS files. `lib/questions/` is largely QS-exclusive except `api-adapter.ts` (used by Trivia API proxy route). `lib/categories.ts` is shared by both QS and core game engine — cannot be gated.

## Key Findings

### Finding 1: QS types in types/index.ts are QS-exclusive
- **Evidence:** `types/index.ts:344-367` — `QuestionSet`, `CreateQuestionSetRequest`, `UpdateQuestionSetRequest`; 0 imports outside QS files
- **Confidence:** high
- **Implication:** Safe to gate or leave in place (type-only, tree-shaken).

### Finding 2: Core types (Question, QuestionCategory, PerRoundBreakdown) are NOT gateable
- **Evidence:** Used in 50+ files across game engine, audience display, setup wizard
- **Confidence:** high
- **Implication:** Cannot be gated. Core vocabulary.

### Finding 3: lib/questions/ is QS-exclusive EXCEPT api-adapter.ts
- **Evidence:** `api/trivia-api/questions/route.ts:21` imports `triviaApiQuestionsToQuestions` from api-adapter. All other files (types, validator, parser, exporter) only imported by QS code.
- **Confidence:** high
- **Implication:** api-adapter.ts cannot be file-level gated. Other files can.

### Finding 4: api-adapter.ts exports both QS and non-QS functions
- **Evidence:** `triviaApiQuestionsToQuestions` (non-QS, used by trivia proxy) vs `triviaApiQuestionsToTriviaQuestions` (QS-only, DB persistence)
- **Confidence:** high
- **Implication:** Could theoretically be split but not required for flag gating.

### Finding 5: conversion.ts used by TriviaApiImporter (shared/dual-context component)
- **Evidence:** `TriviaApiImporter.tsx:7` imports `questionsToTriviaQuestions`. TriviaApiImporter used in both QS management AND setup wizard (`WizardStepQuestions.tsx:46`)
- **Confidence:** high
- **Implication:** File-level gate on conversion.ts would break wizard. Flag the save-to-QS action in TriviaApiImporter instead.

### Finding 6: lib/categories.ts is firmly Shared
- **Evidence:** 13 import sites. Non-QS: `lib/game/questions.ts`, `lib/game/selectors.ts`, `components/presenter/QuestionList.tsx`, `SetupGate.tsx`, `WizardStepSettings.tsx`. QS: `question-sets/page.tsx`, `QuestionSetEditorModal.tsx`, `CategorySelector.tsx`, `QuestionSetImporter.tsx`
- **Confidence:** high
- **Implication:** Cannot be gated. Must remain always-on.

### Finding 7: QuestionSetEditorModal.utils.ts is QS-exclusive
- **Evidence:** 0 imports outside `components/question-editor/`
- **Confidence:** high

### Finding 8: Dead code — CategoryFilter, QuestionImporter, QuestionExporter never imported
- **Evidence:** 0 import sites for all three
- **Confidence:** high

### Finding 9: ApiResponse<T> and PaginatedResponse<T> never used
- **Evidence:** Defined in types/index.ts:372-383, 0 imports anywhere
- **Confidence:** high

## Surprises
- api-adapter.ts bridges QS and non-QS (Trivia API proxy depends on it)
- TriviaApiImporter is dual-context — appears in wizard AND QS management
- 3 dead components and 2 dead types found
