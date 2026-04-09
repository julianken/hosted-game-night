# Investigation: API and Data Layer

## Summary
Three API route groups serve question sets, all hitting exactly one Supabase table (`trivia_question_sets`). No other routes (templates, presets, trivia-api) reference that table. Templates and question sets share `TriviaQuestion` type but have no FK relationship — they store questions independently as JSONB. The `/api/trivia-api/*` routes are a fully separate subsystem with no DB dependency.

## Key Findings

### Finding 1: Three API routes, all auth-gated
- **Evidence:** `api/question-sets/route.ts` (GET/POST), `api/question-sets/[id]/route.ts` (GET/PATCH/DELETE), `api/question-sets/import/route.ts` (POST)
- **Confidence:** high
- **Implication:** Gate with 404 (not 401) when flag off. 401 leaks feature existence.

### Finding 2: Single Supabase table, no cross-table dependencies
- **Evidence:** `packages/database/src/tables/trivia-question-sets.ts` — all functions call `from('trivia_question_sets')`. No joins with templates/presets tables.
- **Confidence:** high
- **Implication:** No schema migration needed. Just gate the API routes.

### Finding 3: Templates and presets have zero QS references
- **Evidence:** Full-text search across `api/templates/**` and `api/presets/**` — zero matches for `question_set` or `trivia_question_sets`
- **Confidence:** high

### Finding 4: api-adapter.ts is a pure type-conversion module, not an HTTP adapter
- **Evidence:** All functions are pure (no fetch, no Supabase). Only caller: `api/trivia-api/questions/route.ts:22`
- **Confidence:** high
- **Implication:** Does not need to be gated with QS routes.

### Finding 5: /api/trivia-api/* is fully separate — no Supabase, no QS dependency
- **Evidence:** `api/trivia-api/categories/route.ts` — static data, public, no auth. `api/trivia-api/questions/route.ts` — external HTTP to the-trivia-api.com, no DB writes.
- **Confidence:** high
- **Implication:** Can remain enabled when QS is disabled.

### Finding 6: Collection GET uses two-tier response (paginated vs detail)
- **Evidence:** `api/question-sets/route.ts:20` — list excludes `questions` JSONB. `fields=full` param includes it.
- **Confidence:** high

### Finding 7: [id] route uses PATCH not PUT (CLAUDE.md has error)
- **Evidence:** `api/question-sets/[id]/route.ts:101` — `export async function PATCH`
- **Confidence:** high

### Finding 8: Import route has own parsing pipeline via lib/questions
- **Evidence:** `api/question-sets/import/route.ts:10` — imports `parseJsonQuestions`, `questionsToTriviaQuestions`
- **Confidence:** high

### Finding 9: TriviaQuestion type shared with templates
- **Evidence:** `packages/database/src/types.ts:76-86` — `TriviaQuestion` used by both `TriviaTemplate.questions[]` and `TriviaQuestionSet.questions[]`
- **Confidence:** high
- **Implication:** Cannot remove TriviaQuestion type. Only QS-specific types are exclusive.

### Finding 10: TriviaApiImporter bridges external API and QS storage
- **Evidence:** `components/presenter/TriviaApiImporter.tsx:236-277` — POSTs to `/api/question-sets` from client
- **Confidence:** high
- **Implication:** When QS gated off, "Save to My Question Sets" button must be hidden.

## Surprises
- No FK between question sets and templates — parallel JSONB storage
- CLAUDE.md lists PUT but route is PATCH
- /api/trivia-api/categories is fully public (no auth)
- 11 of 16 DB functions are unused by any API route (duplicateTriviaQuestionSet, addQuestionsToSet, etc.)
