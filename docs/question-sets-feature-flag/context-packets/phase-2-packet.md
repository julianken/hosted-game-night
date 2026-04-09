# Context Packet: Phase 2

## Key Findings (by theme)

### Feature Boundary (confirmed)
- QS feature is well-bounded: 1 page, 3 API routes, 4 components, 1 DB table
- AddQuestionsPanel + EmptyStateOnboarding are exclusively on `/question-sets` page (not in wizard/play)
- No FK between question sets and templates — parallel JSONB storage
- Shared deps that CANNOT be gated: `lib/categories.ts`, `TriviaQuestion` type, `lib/questions/api-adapter.ts`

### Gating Surface (6 active changes + 2 dead code removals)
1. `layout.tsx` — flag redirect before E2E bypass (covers entire `/question-sets` segment)
2. `page.tsx` (home) — flag condition on QS link inside auth block
3. 3 API route files — flag check after auth, return 404, before DB operations
4. `TriviaApiImporter.tsx` — env var check to hide save section in preview state
5. `play/page.tsx` — remove dead SaveQuestionSetModal (import + state + JSX)
6. `QuestionSetSelector.tsx` — remove dead file

### TriviaApiImporter (critical finding)
- "Save to My Question Sets" button is UNCONDITIONALLY visible in wizard preview state
- `WizardStepQuestions.tsx:46` passes no `context` or `onSaveSuccess` — button is live
- In-component env var check is the only viable gating mechanism (layout gate doesn't cover wizard)

### Dead Code (1,411 lines)
- 5 dead components + 2 dead test files + 17 dead type lines
- Recommend: separate cleanup PR merged before feature flag PR

### Test Impact
- 7 QS-dedicated test files (85 tests) — skip when flag off
- 2 cross-feature test files (20 tests) — need conditional assertions
- 4 superficial-contact test files — unaffected

## Confidence Levels
- **High**: Feature boundary, gating locations, dead code inventory, test classification
- **Medium**: Whether 404 vs 503 is the better disabled-feature status code
- **Low**: None remaining

## Contradictions & Open Questions
1. `lib/feature-flags.ts` module shape not yet designed (out of scope per Phase 0)
2. CLAUDE.md says PUT for `[id]` route but it's actually PATCH — doc error to fix
3. Whether dead code cleanup should be same PR or separate (recommendation: separate)
