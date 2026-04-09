# Iteration: Dead Code Inventory

## Assignment
Quantify dead QS-related code and determine cleanup strategy.

## Findings

### Dead Code Summary

| File | Lines | Test Lines | Total | Status |
|------|-------|------------|-------|--------|
| `QuestionSetSelector.tsx` | 155 | 109 | 264 | Never imported in production |
| `SaveQuestionSetModal.tsx` | 232 | 110 | 342 | Mounted but trigger never called |
| `CategoryFilter.tsx` | 234 | 0 | 234 | Never imported anywhere |
| `QuestionImporter.tsx` | 351 | 0 | 351 | Never imported anywhere |
| `QuestionExporter.tsx` | 203 | 0 | 203 | Never imported anywhere |
| `ApiResponse<T>` + `PaginatedResponse<T>` | 17 | 0 | 17 | Types never imported |
| **Total** | **1,192** | **219** | **1,411** | |

### Phase 1 Correction: QuestionSetImporter is NOT dead
- **Evidence:** Imported by `AddQuestionsPanel.tsx:5` and `EmptyStateOnboarding.tsx:5` — both rendered on `/question-sets` page
- **Confidence:** high
- **Significance:** 471 lines of live QS code, not dead code. Should be gated (via route), not deleted.

## Resolved Questions
- Total deletable: 1,411 lines across 7 files (5 components + 2 test files + 17 type lines)
- QuestionSetImporter is live (Phase 1 misclassified it)

## Remaining Unknowns
- Whether dead code cleanup should be a separate PR or bundled with the feature flag PR

## Revised Understanding
**Recommendation: separate cleanup PR, merged first.** Zero behavior risk (dead code), cleaner feature flag PR diff. Exception: SaveQuestionSetModal removal touches `play/page.tsx` which the feature flag PR also modifies — either sequence works since the modal deletion is self-contained (3 line removals).
