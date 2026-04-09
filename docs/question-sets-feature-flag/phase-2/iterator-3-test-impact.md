# Iteration: Test File Impact

## Assignment
Map all test files that reference question sets and classify their flag sensitivity.

## Findings

### QS-Dedicated Tests (7 files, ~85 tests) — skip/remove when flag off
| File | Tests |
|------|------:|
| `api/question-sets/[id]/__tests__/route.test.ts` | 15 |
| `api/question-sets/import/__tests__/route.test.ts` | 18 |
| `question-editor/__tests__/QuestionSetEditorModal.utils.test.ts` | 30 |
| `question-sets/__tests__/page.test.tsx` | 8 |
| `presenter/__tests__/QuestionSetSelector.test.tsx` | 3 |
| `presenter/__tests__/SaveQuestionSetModal.test.tsx` | 3 |
| `presenter/__tests__/QuestionSetImporter.test.tsx` | 8 |

### Cross-Feature Tests with Real QS Coupling (2 files, ~20 tests)
- `presenter/__tests__/AddQuestionsPanel.test.tsx` (~12 tests) — mocks QS components, 3-4 tests exercise QS tabs
- `presenter/__tests__/EmptyStateOnboarding.test.tsx` (~8 tests) — same pattern

### Cross-Feature Tests with Superficial Contact (4 files, ~75 tests) — no action needed
- `question-editor/__tests__/RoundEditor.test.tsx` (23) — type import only
- `question-editor/__tests__/QuestionEditor.test.tsx` (28) — type import only
- `presenter/__tests__/SaveTemplateModal.test.tsx` (12) — string label assertion
- `presenter/__tests__/TemplateSelector.test.tsx` (12) — string label assertion

### Missing test: base `GET/POST /api/question-sets` route has zero coverage

## Resolved Questions
- 13 test files total reference QS. 7 are dedicated (can be skipped). 2 need conditional assertions. 4 are unaffected.
- Maximum test action: 85 tests to skip + 8 tests needing conditionals = 93 tests impacted.

## Revised Understanding
Test impact is manageable. Most QS tests are self-contained and can be skipped when the flag is off without affecting other test suites.
