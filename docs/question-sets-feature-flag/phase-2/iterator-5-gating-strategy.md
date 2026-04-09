# Iteration: Gating Strategy Per Surface

## Assignment
Determine the cleanest gating approach for each of 8 surfaces identified in Phase 1.

## Findings

### Strategy Summary

| Surface | Action | Files Changed |
|---------|--------|---------------|
| `/question-sets` layout | Add flag redirect before E2E bypass | `app/question-sets/layout.tsx` |
| Home page link | Add flag condition inside auth block | `app/page.tsx` |
| 3 API route groups | Add flag check after auth, return 404 | 3 route files |
| TriviaApiImporter save section | Env var check to hide save UI in preview | `TriviaApiImporter.tsx` |
| play/page.tsx SaveQuestionSetModal | Remove dead code (no flag needed) | `app/play/page.tsx` |
| QuestionSetSelector | Remove dead code (no flag needed) | Delete file |

### Key Decisions

1. **Layout gate placement:** Before E2E bypass (line 9). Even E2E mode should respect disabled features.
2. **API status code:** 404 (not 401/403). Avoids confirming feature existence to authenticated callers.
3. **API check placement:** After `getApiUser` guard. Auth errors (401) should still fire for unauthenticated callers.
4. **AddQuestionsPanel/EmptyStateOnboarding:** Zero changes. Layout gate covers them (exclusively on QS page).
5. **TriviaApiImporter:** In-component env var check. Only option that handles WizardStepQuestions (outside QS layout gate) without prop threading.
6. **SaveQuestionSetModal:** Delete, don't gate. Dead code should not acquire feature flags.

### Zero Changes Required To
AddQuestionsPanel, EmptyStateOnboarding, QuestionSetImporter, QuestionSetEditorModal, any type definitions, `lib/questions/*`, `lib/categories.ts`, shared packages.

## Resolved Questions
- Q1: Layout check is sufficient for page route — yes
- Q2: API flag after auth, before DB — yes, with 404 status
- Q3: AddQuestionsPanel/EmptyStateOnboarding — no changes (option c: parent gate)
- Q4: TriviaApiImporter — env var inside component
- Q5: SaveQuestionSetModal — remove (dead code)

## Remaining Unknowns
- `lib/feature-flags.ts` module shape (boolean export vs function vs record)
- Whether 404 or 503 is the better disabled-feature status code (no precedent in codebase)

## Revised Understanding
The complete gating surface is 6 files changed + 2 files deleted. The gating is non-redundant: layout covers the page, API checks cover direct access, TriviaApiImporter check covers the wizard's QS write path, home page check covers discoverability. Together they form a complete, minimal gate.
