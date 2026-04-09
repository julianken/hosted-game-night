# Investigation: Dedicated Question-Set Surfaces

## Summary
The question-sets feature occupies five bounded surfaces: one page route with a layout guard, three API route groups, and four dedicated components. All communicate through `/api/question-sets*` endpoints and the shared `@joolie-boolie/database` package. The feature touches exactly one Supabase table: `trivia_question_sets`. Test coverage exists for most surfaces except the base `GET/POST /api/question-sets` route.

## Key Findings

### Finding 1: Page route is self-contained
- **Evidence:** `app/question-sets/page.tsx:6-13` — imports `EmptyStateOnboarding`, `AddQuestionsPanel`, `QuestionSetEditorModal`, categories utils, and `triviaQuestionsToQuestions`
- **Confidence:** high
- **Implication:** Gating the page requires no changes to other pages.

### Finding 2: Layout performs cookie-based auth (redundant with middleware)
- **Evidence:** `app/question-sets/layout.tsx:1-23` — reads `jb_access_token`, redirects to `/` if absent. E2E bypass exists.
- **Confidence:** high
- **Implication:** Feature flag check fits naturally here alongside existing auth check.

### Finding 3: All three API routes use single table `trivia_question_sets`
- **Evidence:** `api/question-sets/route.ts:7-14`, `api/question-sets/[id]/route.ts:8-12`, `api/question-sets/import/route.ts:9-14`
- **Confidence:** high
- **Implication:** No cross-table dependencies. Gating is simple: check flag at top of each handler.

### Finding 4: QuestionSetSelector talks to list + detail endpoints, writes to game-store
- **Evidence:** `components/presenter/QuestionSetSelector.tsx:46-93`
- **Confidence:** high
- **Implication:** Silently degrades on non-200 (console.warn, empty list). Soft dependency.

### Finding 5: QuestionSetImporter is client-side parse + POST to `/api/question-sets/import`
- **Evidence:** `components/presenter/QuestionSetImporter.tsx:118-139`
- **Confidence:** high
- **Implication:** No store interaction; error shows inline on gated API.

### Finding 6: SaveQuestionSetModal reads game-store questions, POSTs to `/api/question-sets`
- **Evidence:** `components/presenter/SaveQuestionSetModal.tsx:29,65-74`
- **Confidence:** high

### Finding 7: QuestionSetEditorModal supports create (POST) and edit (PATCH) modes
- **Evidence:** `components/question-editor/QuestionSetEditorModal.tsx:236-249`
- **Confidence:** high
- **Implication:** Rich modal with dirty-state tracking. Hiding entry points is sufficient; modal doesn't need its own flag.

### Finding 8: Import route depends on `@/lib/questions` (shared parser)
- **Evidence:** `api/question-sets/import/route.ts:10`
- **Confidence:** high
- **Implication:** `lib/questions` parser is shared infrastructure, not QS-exclusive.

### Finding 9: No test file for base `GET/POST /api/question-sets` route
- **Evidence:** Glob returned no `__tests__/` in `api/question-sets/`
- **Confidence:** high

### Finding 10: [id] route uses owner-verification before mutations
- **Evidence:** `api/question-sets/[id]/route.ts:137-142, 191-195`
- **Confidence:** high
- **Implication:** Feature flag gate should be added before owner check to avoid unnecessary DB reads.

## Surprises
- No test file for base collection route
- Layout does its own cookie check (redundant with middleware)
- QuestionSetSelector silently degrades on non-200 (shows "No saved question sets")
- QuestionSetEditorModal has no component test (only utils tested)

## Unknowns & Gaps
- Where QuestionSetSelector is actually mounted (likely AddQuestionsPanel — but it's orphaned, see Area 5)
- Where SaveQuestionSetModal is opened from (play/page.tsx, but trigger is dead)
- Whether EmptyStateOnboarding/AddQuestionsPanel are used outside QS page
