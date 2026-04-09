# Context Packet: Phase 1

## Key Findings

1. **QS feature is well-bounded**: 1 page route, 3 API route groups, 4 dedicated components, 1 Supabase table (`trivia_question_sets`). No FK to templates/presets.
2. **3 real entry points**: Home page Link, TriviaApiImporter "Save to QS" button, and layout-level route access. QuestionSetSelector is orphaned (never rendered). SaveQuestionSetModal on play page is dead code (no trigger).
3. **Cross-feature coupling is shallow**: AddQuestionsPanel and EmptyStateOnboarding import 2 QS components each. SaveTemplateModal/TemplateSelector use "question set" labels but call templates API (string-only).
4. **Shared dependencies that CANNOT be gated**: `lib/categories.ts` (13 importers, 5 non-QS), `TriviaQuestion` type (shared with templates), `lib/questions/api-adapter.ts` (used by `/api/trivia-api/questions` proxy).
5. **TriviaApiImporter is dual-context**: Used in setup wizard AND QS management. Its QS save path must be flag-gated at the component level, not file level.
6. **Dead code found**: QuestionSetSelector (orphaned), SaveQuestionSetModal trigger (dead), CategoryFilter/QuestionImporter/QuestionExporter (never imported), ApiResponse/PaginatedResponse types (never used).
7. **Layout-based auth, not middleware**: `/question-sets` is protected by `layout.tsx` cookie check, not `middleware.ts`. Feature flag fits naturally in the layout.

## Confidence Levels
- **High**: Feature boundary mapping, API surface, DB isolation, entry points, cross-refs
- **Medium**: TriviaApiImporter dual-context behavior (save button visibility when no `onSaveSuccess` callback)
- **Low**: Whether `fields=full` on collection GET is used by any caller

## Contradictions & Open Questions
1. **TriviaApiImporter save button**: Does `WizardStepQuestions` render the "Save to QS" button? If `onSaveSuccess` is not passed, is the button hidden or visible-but-disabled?
2. **AddQuestionsPanel/EmptyStateOnboarding scope**: Are these used ONLY on the `/question-sets` page, or also elsewhere in the setup flow?
3. **CLAUDE.md says PUT but route is PATCH** — documentation error to fix

## Artifacts (read only if needed)
- `phase-1/area-1-dedicated-surfaces.md`: Page, API, component internals
- `phase-1/area-2-cross-feature-refs.md`: File-by-file coupling classification
- `phase-1/area-3-type-utility-deps.md`: Shared vs exclusive types/utilities
- `phase-1/area-4-api-data-layer.md`: API contracts, DB table, trivia-api separation
- `phase-1/area-5-navigation-entry-points.md`: Entry points, routing, middleware
