# Context Packet: Phase 0

## Analysis Question
What is the complete scope of changes to gate the trivia app's question sets feature behind `lib/feature-flags.ts`? What are the risks?

## Scope
- `apps/trivia/src/` only
- 37 files reference "question sets"
- Flag module design is decided: `NEXT_PUBLIC_FEATURE_QUESTION_SETS` env var
- Non-goal: designing the flag module or planning implementation

## Key Surfaces (known)
- Page: `/question-sets` (page.tsx, layout.tsx)
- API: `/api/question-sets`, `/api/question-sets/[id]`, `/api/question-sets/import`
- Components: QuestionSetSelector, QuestionSetImporter, SaveQuestionSetModal, QuestionSetEditorModal
- Cross-refs: AddQuestionsPanel, EmptyStateOnboarding, SetupGate, play/page.tsx, SaveTemplateModal, TemplateSelector

## Quality Criteria
Evidence strength (30%), Completeness (25%), Accuracy (20%), Actionability (15%), Nuance (10%)

## What Each Investigator Should Do
- Cite specific file paths and line numbers for every claim
- Read code on-demand from `apps/trivia/src/`
- Flag surprises and unknowns
- Write output to designated file BEFORE returning
