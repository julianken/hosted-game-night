# Phase 0: Analysis Brief — Question Sets Feature Flag Gating

## Analysis Question

What is the complete scope of changes needed to gate the trivia app's question sets feature behind a `lib/feature-flags.ts` config module, and what are the risks of incomplete gating?

### Restated as bullet points:
- Map the full surface area of the question sets feature (pages, API routes, components, imports, types)
- Identify where question sets are referenced from non-question-set code (setup wizard, play page, onboarding)
- Determine the cleanest gating strategy for each surface (route redirect, conditional render, API 404)
- Find shared types/utilities/schemas that other features depend on from question sets
- Assess risks of incomplete gating (dead links, broken imports, orphaned API routes)

## Assumptions

### Known knowns
- 37 files reference "question sets" in `apps/trivia/src/`
- Dedicated page at `/question-sets`, API routes at `/api/question-sets/*`
- Dedicated components: QuestionSetSelector, QuestionSetImporter, SaveQuestionSetModal, QuestionSetEditorModal
- No existing feature flag system
- Next.js App Router, React 19, Zustand, Tailwind, Supabase BFF

### Known unknowns
- Exact coupling of each reference (import vs string mention vs deep dependency)
- Whether question set types are used by non-question-set features
- Template ↔ question set dependency direction
- Database schema dependencies
- Navigation links to `/question-sets` from other pages

### Suspected unknowns
- Setup wizard behavior when question sets disabled
- Whether CSV/JSON import is question-sets-only or also standalone
- Tree-shaking implications of the flag

## Domain Tags
1. React/Components
2. Architecture
3. API/Backend
4. Testing

## Quality Criteria

| Criterion | Weight |
|-----------|--------|
| Evidence strength | 30% |
| Completeness | 25% |
| Accuracy | 20% |
| Actionability | 15% |
| Nuance | 10% |

## 5 Investigation Areas

1. **Dedicated question-set surfaces** — `/question-sets` page, `/api/question-sets/*` routes, dedicated components. Internal dependencies, exports.
2. **Cross-feature references** — Non-QS files that reference QS: how (import, prop, link, conditional)?
3. **Type and utility dependencies** — Shared types in `types/`, utilities in `lib/questions/`, shared vs exclusive code.
4. **API and data layer** — API routes, contracts, Supabase tables, `lib/questions/api-adapter.ts`, cross-dependencies.
5. **Navigation, routing, UI entry points** — Links to `/question-sets`, home page, setup wizard, nav bars.
