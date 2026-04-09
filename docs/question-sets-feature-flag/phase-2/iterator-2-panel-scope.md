# Iteration: AddQuestionsPanel & EmptyStateOnboarding Scope

## Assignment
Determine if AddQuestionsPanel and EmptyStateOnboarding are used outside the `/question-sets` page.

## Findings

### AddQuestionsPanel — QS page exclusive
- **Evidence:** Only import: `app/question-sets/page.tsx:7`. Rendered at line 209 inside `hasQuestionSets && showAddPanel` branch.
- **Confidence:** high
- **Significance:** No other page imports it. Route-level gating is sufficient.

### EmptyStateOnboarding — QS page exclusive
- **Evidence:** Only import: `app/question-sets/page.tsx:6`. Rendered at line 195 inside `isEmpty` branch.
- **Confidence:** high
- **Significance:** Same conclusion — route-level gating covers it.

## Resolved Questions
- **Phase 1 Q2 resolved: Both are exclusively on the `/question-sets` page.** Neither appears in the setup wizard, play page, or any other component.

## Remaining Unknowns
None.

## Revised Understanding
Route-level gating (layout.tsx redirect) is sufficient for both components. No per-component flag checks needed. This contrasts with TriviaApiImporter which requires its own in-component check.
