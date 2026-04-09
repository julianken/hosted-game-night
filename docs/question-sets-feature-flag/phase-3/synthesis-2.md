# Synthesis: Risk & Opportunity

## Synthesis Approach

This synthesis draws on direct codebase examination of the six primary files in the gating surface, all five phase-2 iterator reports, and the phase-1 and phase-2 context packets. Evidence is cited by file path and line number throughout. The orientation is forward-looking: given that Phase 2 has established what to change, this synthesis answers what breaks if we do it wrong and what we gain beyond the stated goal.

The three organizing questions are: (a) what are the failure modes if gating is partial or incorrectly ordered, (b) what is the severity of each failure mode, and (c) what non-obvious benefits does this work create if executed correctly.

## Core Narrative

The question sets feature is well-bounded and the gating surface is small — 6 files changed, 2 deleted. That smallness is simultaneously the implementation's greatest asset and its most significant risk vector. Because the surface appears minimal, an implementer may stop at the obvious gates (the layout redirect and the API route guards) and miss the one non-obvious gate: the `TriviaApiImporter` save section inside the setup wizard. That single omission leaves a functional write path to the `trivia_question_sets` table open from a UI the user can reach without knowing the feature exists.

The second narrative thread is dead code sequencing. 1,411 lines of dead code sit adjacent to live code. The `SaveQuestionSetModal` dead code specifically shares `play/page.tsx` with the feature flag work. If cleanup and feature flag PRs are not coordinated, merge conflicts or orphaned test files result.

The third thread is test suite integrity. 85 dedicated tests exist for question sets. When the feature is gated off, those tests become tests of whether the flag blocks correctly — which is not what they assert today. Without explicit handling, CI fails for the wrong reasons during and after implementation.

## Key Conclusions

### Conclusion 1: The Wizard Leak Is the Highest-Severity Risk

**Description.** If only the layout gate and API route guards are implemented, the "Save to My Question Sets" button remains visible and functional inside the setup wizard (`/play`). A user in game setup, who fetches questions via TriviaApiImporter, will see the save button and can click it. The click fires `POST /api/question-sets`. If the API route is gated with 404, the user receives a silent failure (error appears in `saveError` state). If the API route is not gated, the write succeeds but the QS page is inaccessible — data written to a table with no management UI.

**Evidence.** `apps/trivia/src/components/presenter/WizardStepQuestions.tsx:46` — `<TriviaApiImporter disabled={false} />` with no `context` prop, defaulting to `'game'`. `apps/trivia/src/components/presenter/TriviaApiImporter.tsx:671-686` — "Save to My Question Sets" button renders with only `!saveName.trim()` as its disabled condition. `TriviaApiImporter.tsx:650` — `{!isManagement && (...)}` gates only the "Load into Game" button. The save button has no equivalent guard. The `handleSaveToQuestionSets` handler at line 236 POSTs to `/api/question-sets` regardless of context.

**Severity: High.** A visibly active UI control that silently fails or writes orphaned data depending on whether the API gate is in place. Users encountering this during live game setup will be confused or assume the feature is broken rather than disabled.

**Mitigation.** Implement an in-component env var check in `TriviaApiImporter.tsx` that controls a boolean derived from `process.env.NEXT_PUBLIC_QUESTION_SETS_ENABLED`. This boolean gates the entire save section (the save form fields at lines 607-636 and the save button at lines 671-686 in the preview state). The check must use a `NEXT_PUBLIC_` prefix because `TriviaApiImporter` is a client component and cannot access server-only env vars. The layout gate cannot substitute for this check because the wizard is outside the `/question-sets` route segment.

---

### Conclusion 2: The E2E Bypass Ordering Creates a Flag Gap in Tests

**Description.** `apps/trivia/src/app/question-sets/layout.tsx` currently checks `E2E_TESTING === 'true'` at line 10 and returns early, bypassing the auth check. If the feature flag redirect is placed after this check — a natural implementation instinct — E2E tests can reach the question sets page even when the feature is flagged off. This contradicts the gating intent and produces false-passing E2E tests.

**Evidence.** `apps/trivia/src/app/question-sets/layout.tsx:9-12` — E2E bypass returns `<>{children}</>` before the auth check at lines 14-20. Phase 2 iterator-5-gating-strategy.md specifies: "Layout gate placement: Before E2E bypass (line 9). Even E2E mode should respect disabled features."

**Severity: Medium.** E2E tests produce false passes — tests that should fail (feature disabled) pass because E2E mode skips the gate. This erodes test signal quality and could cause a disabled feature to appear enabled in CI.

**Mitigation.** The feature flag redirect must be the very first check in `layout.tsx`, placed before the `E2E_TESTING` branch. Correct order: (1) feature flag check → redirect if disabled, (2) E2E bypass → return children, (3) cookie auth check → redirect if unauthenticated. No other ordering achieves correct behavior across all scenarios.

---

### Conclusion 3: Incomplete API Gating Leaves a Data Write Path Open

**Description.** Three API route groups serve question sets: `GET/POST /api/question-sets`, `GET/PATCH/DELETE /api/question-sets/[id]`, and `POST /api/question-sets/import`. Each requires an independent feature flag check. The base `GET/POST /api/question-sets` route currently has zero test coverage — making it the route most likely to be missed or incorrectly implemented during the flag PR, since the implementer has no tests to guide correct behavior.

**Evidence.** No test file exists at `apps/trivia/src/app/api/question-sets/__tests__/route.test.ts`. Phase 2 iterator-3-test-impact.md: "Missing test: base GET/POST /api/question-sets route has zero coverage." Contrast with `api/question-sets/[id]/__tests__/route.test.ts` (15 tests) and `api/question-sets/import/__tests__/route.test.ts` (18 tests).

**Severity: Medium.** An authenticated user who knows the API shape can POST to `/api/question-sets` and write to the database even with the UI fully gated. Not a security risk (auth is still enforced) but a data consistency risk — question set records accumulate in a table whose management UI is disabled.

**Mitigation.** (a) Add the feature flag check to all three route groups consistently, placed after `getApiUser` (so 401 still fires for unauthenticated callers) but before any DB operation, returning 404. (b) Write tests for the base `GET/POST` route as a required deliverable of the feature flag PR — not optional cleanup. At minimum: verify 401 for unauthenticated callers and 404 for authenticated callers when flag is off.

---

### Conclusion 4: Dead Code Sequencing Risk Between Two PRs

**Description.** The dead code inventory includes `SaveQuestionSetModal`, which is imported and mounted (but permanently unreachable) in `play/page.tsx` at lines 28, 98, and 585-588. The feature flag PR must also touch `play/page.tsx`. If the cleanup PR and the feature flag PR are sequenced incorrectly or overlap, two failure modes arise: (a) double-deletion of the same lines causes a merge conflict, or (b) the cleanup PR deletes `SaveQuestionSetModal.tsx` but leaves its test file (`presenter/__tests__/SaveQuestionSetModal.test.tsx`) intact, causing the test suite to fail at collection (importing a deleted module).

**Evidence.** `apps/trivia/src/app/play/page.tsx:28` — `import { SaveQuestionSetModal }`. `play/page.tsx:98` — `const [showSaveQuestionSetModal, setShowSaveQuestionSetModal] = useState(false)`. `play/page.tsx:585-588` — modal mounted with `isOpen={showSaveQuestionSetModal}`. Grep of `setShowSaveQuestionSetModal` in the file returns only the initial `false` setter — no opener exists anywhere. The modal is permanently unreachable.

**Severity: Medium.** Merge conflicts are recoverable but waste time. More critically, a test file that imports a deleted component fails at collection and blocks all commits via lint-staged pre-commit hooks (per CLAUDE.md: "if hooks fail, fix the underlying issue before committing").

**Mitigation.** Delete `SaveQuestionSetModal` as an atomic unit: the component file, its test file, and its three import/usage sites in `play/page.tsx` in the same commit. The cleanup PR should delete all dead files simultaneously. The feature flag PR must be branched from the merged cleanup PR commit, not from main before cleanup merges.

---

### Conclusion 5: Test Suite Will Produce Misleading Failures Without Explicit Handling

**Description.** When the feature flag is off in a test environment, 85 dedicated QS tests fail for reasons unrelated to the feature's correctness. API tests receive 404 responses instead of the 200/201 they assert. Page tests that mock `fetch` and assert on rendered question set cards find no cards because the component never renders (layout redirect fires server-side). The cross-feature tests in `AddQuestionsPanel.test.tsx` and `EmptyStateOnboarding.test.tsx` exercise QS-tab interactions that become unreachable.

**Evidence.** `apps/trivia/src/app/question-sets/__tests__/page.test.tsx:76-85` — mocks `global.fetch`, asserts `screen.getByText('My Question Sets')`. `apps/trivia/src/app/api/question-sets/import/__tests__/route.test.ts:114` — expects 401 for unauthenticated caller; this still works, but the 15 other tests expecting 200/201 receive 404 when the flag guard fires first. `apps/trivia/src/components/presenter/__tests__/AddQuestionsPanel.test.tsx` — exercises QS import tabs.

**Severity: Medium.** 85 misfiring tests during development make CI unreliable. When CI is red for the wrong reasons, real regressions hide in the noise.

**Mitigation.** Use `vi.skipIf` wrappers on the 7 dedicated QS test files, keyed on the same env var as runtime code (`process.env.NEXT_PUBLIC_QUESTION_SETS_ENABLED !== 'true'`). Add flag-aware conditional assertions to the 2 cross-feature test files. Do not mix strategies within a file — pick one approach and apply it consistently.

---

### Conclusion 6: CLAUDE.md Documentation Error Is a Certain Implementation Confusion Vector

**Description.** `apps/trivia/CLAUDE.md` lists the `/api/question-sets/[id]` route methods as `GET, PUT, DELETE`. The actual implementation exports `GET`, `PATCH`, and `DELETE`. An implementer who writes the feature flag check for this route based on CLAUDE.md alone will add the check to a non-existent `PUT` export and miss the existing `PATCH` export.

**Evidence.** `apps/trivia/src/app/api/question-sets/[id]/route.ts:101` — `export async function PATCH`. CLAUDE.md API Routes table — `GET, PUT, DELETE`. Confirmed in Phase 2 area-4 and iterator-5.

**Severity: Low (certain, not severe).** The implementer will catch this when they open the file and see only `PATCH`. But it adds an unnecessary friction point and the doc error will mislead future contributors even after the feature flag PR.

**Mitigation.** Fix CLAUDE.md in the first commit of the feature flag PR. Change `GET, PUT, DELETE` to `GET, PATCH, DELETE`. Single-line change; zero behavior risk.

---

### Conclusion 7: Opportunity — Forced Creation of Missing Test Coverage

**Description.** The base `GET/POST /api/question-sets` route has never had a test file. The feature flag PR requires adding a flag check to this route, creating a natural moment to also write the missing tests. This is not merely optional — the absence of tests for the flag check itself would leave the most important behavior unverified.

**Evidence.** No `apps/trivia/src/app/api/question-sets/__tests__/` directory exists. The `[id]` route tests (15) and the `import` route tests (18) follow an established pattern: mock `getApiUser`, mock DB functions, assert on status codes. The base route follows the same pattern and can be tested the same way.

**Impact: Medium.** Writing tests for the base route closes a coverage gap that has existed since the feature was first implemented. The tests are low-effort (same mocking pattern as adjacent test files) and the benefit is permanent.

---

### Conclusion 8: Opportunity — Establishing a Feature Flag Pattern for the Codebase

**Description.** `lib/feature-flags.ts` does not yet exist in the trivia app. Its design will be the first instance of a feature flag pattern. A well-designed module — typed boolean exports, single import site, JSDoc explaining purpose and expected env var name — becomes the template for all future flags. A poorly designed module (magic strings, inconsistent naming, no JSDoc) becomes technical debt that compounds with each new flag.

**Evidence.** No existing `apps/trivia/src/lib/feature-flags.ts` (confirmed by Glob). Phase 2 context packet open question 1: "lib/feature-flags.ts module shape not yet designed."

**Impact: Low-to-medium.** The design decision is bounded now (one feature, one flag), but the precedent effect is durable. A consistent pattern (`export const FEATURES = { questionSets: process.env.NEXT_PUBLIC_QUESTION_SETS_ENABLED === 'true' } as const`) is self-documenting and easy to extend.

---

### Conclusion 9: Opportunity — Dead Code Removal Simplifies the Bundle and Future Refactors

**Description.** Removing the 1,411 lines of dead code eliminates five components and their associated import chains from the bundle. `SaveQuestionSetModal` specifically imports `@/stores/game-store` and `@/lib/questions/conversion` — removing it removes one unnecessary evaluation path from the play page bundle. The remaining dead components (`CategoryFilter`, `QuestionImporter`, `QuestionExporter`) import from `@/lib/questions/*` and `@/lib/categories.ts`, contributing to bundle size without serving any user.

**Evidence.** iterator-4-dead-code.md: 5 dead components, 2 dead test files, 17 dead type lines. `SaveQuestionSetModal.tsx:7-8` — imports from `@/stores/game-store` and `@joolie-boolie/ui`. `CategoryFilter.tsx` — never imported in any production `.tsx` file (confirmed by Grep).

**Impact: Low.** The bundle reduction is modest (1,411 lines is not large). The maintenance clarity benefit is more significant — contributors no longer encounter these files in search results and wonder whether they need to update them during feature work.

## Blind Spots

**Flag evaluation environment.** This synthesis assumes a build-time env var (`NEXT_PUBLIC_QUESTION_SETS_ENABLED`). If the decision is made to use a runtime flag (server-only env var, database-stored value, or third-party flag service), all client-side gating points (TriviaApiImporter save section, home page link) require re-evaluation. Client components cannot read server-only env vars. The choice of flag evaluation strategy must be made before implementation begins.

**Existing user data.** If users have created question sets before the flag is turned off, that data persists in `trivia_question_sets`. The flag does not purge data. This synthesis does not cover user communication, data migration, or the edge case where a user's default template references a question set (though Phase 2 confirmed no FK exists between these tables).

**Browser caching of the home page.** The home page is a Server Component. Changing the flag value without redeploying will not update cached page responses. A window exists where the "Question Sets" link is visible in a cached page but the destination is gated. This is a deployment concern, not a code concern, but it affects user experience during flag transitions.

**TriviaApiImporter future embedding.** This synthesis treats the setup wizard as the only non-QS-page context for TriviaApiImporter. The in-component env var check correctly gates the save button in any future context where TriviaApiImporter is embedded. No additional work is required for new contexts, but removing the in-component check in the future (thinking it is "only needed for the wizard") would re-expose the save path in all contexts.

## Recommendations

In priority order:

1. **Immediate:** Fix the CLAUDE.md `PUT` → `PATCH` error for the `[id]` route. Single-line change. Eliminates a certain confusion vector for the implementer.

2. **First PR (cleanup):** Delete all dead files atomically — `QuestionSetSelector.tsx`, `SaveQuestionSetModal.tsx`, `CategoryFilter.tsx`, `QuestionImporter.tsx`, `QuestionExporter.tsx`, `__tests__/QuestionSetSelector.test.tsx`, `__tests__/SaveQuestionSetModal.test.tsx` — plus the three import/usage sites in `play/page.tsx` and the unused type definitions. Zero behavior risk. Cleans the field before the flag PR.

3. **Second PR (feature flag):** Implement gating in dependency order:
   - Create `lib/feature-flags.ts` first (single source of truth for all flag checks)
   - Add flag redirect to `question-sets/layout.tsx` as line 1, before the E2E bypass
   - Add flag condition to home page `app/page.tsx` QS link
   - Add flag check to all three API route files (after auth, before DB, return 404)
   - Add in-component env var check to `TriviaApiImporter.tsx` save section
   - Write missing tests for base `GET/POST /api/question-sets` route
   - Add `vi.skipIf` wrappers to 7 dedicated QS test files
   - Add flag-aware conditionals to 2 cross-feature test files

4. **Verification step:** After implementation, manually open `/play` in setup mode, fetch questions via TriviaApiImporter, confirm the save form section is absent when the flag is off. This is the highest-severity risk and warrants explicit manual verification before merging.