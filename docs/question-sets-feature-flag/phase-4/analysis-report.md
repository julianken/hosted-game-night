# Question Sets Feature Flag: Final Analysis Report

**Phase 4 — Final Unified Synthesis**
**Analysis Funnel: Question Sets Feature Flag Gating**
**Date:** 2026-03-10
**Scope:** `apps/trivia/src/` only

---

## C) Table of Contents

| Section | Summary |
|---------|---------|
| A) Executive Summary | 6-sentence overview of what was analyzed, the key finding (wizard leak), and the two-PR approach. |
| B) Analysis Question & Scope | Exact restatement of the question, what was in scope, and what was explicitly excluded. |
| C) Table of Contents | This table. |
| D) Methodology | 37 files examined across 5 investigation areas, 5 deep-dive iterations, 3 synthetic lenses. |
| E) Key Findings | 8 findings organized by theme, high-confidence/high-impact first, with code references. |
| F) Analysis & Implications | Thematic patterns, risk inventory with severity, opportunities, and known unknowns. |
| G) Confidence Assessment | Overall high confidence on gating surface; medium confidence on test mechanics; known blind spots. |
| H) Recommendations | 6 high-level recommendations ordered by priority, with trade-offs and open questions. |
| I) Open Questions | 7 questions that surfaced but were not answered, ranked by implementation-blocking severity. |
| J) Appendix: Evidence Index | Table mapping every finding to its Phase 1/2/3 source. |

---

## A) Executive Summary

This analysis investigated the complete scope of changes needed to gate the trivia app's question sets feature behind a `lib/feature-flags.ts` config module backed by a `NEXT_PUBLIC_FEATURE_QUESTION_SETS` environment variable. The investigation examined 37 files across 5 areas, produced 5 deep-dive iteration reports, and was synthesized through 3 independent lenses (thematic, risk/opportunity, gaps/implications). The central finding is that the gating surface is small — 6 active file changes plus 2 dead code removals — but contains one non-obvious leak point that is the primary implementation risk: the "Save to My Question Sets" button inside `TriviaApiImporter.tsx`, which is mounted in the setup wizard (`/play`) entirely outside the `/question-sets` route segment, and therefore cannot be closed by the layout gate alone. A second structural finding is that 1,411 lines of dead code exist adjacent to the live gating surface, and conflating their removal with the feature flag work creates review noise and merge-conflict risk; these must be separated into a prior cleanup PR. The investigation also surfaced a documentation error in `apps/trivia/CLAUDE.md` (listing `PUT` instead of `PATCH` for the `[id]` route) that will mislead any implementer who uses the doc as a reference. All three synthesis lenses reached independent agreement on the gating surface, the wizard leak severity, and the two-PR sequencing strategy, giving the core findings high confidence.

---

## B) Analysis Question & Scope

**Analysis Question:** What is the complete scope of changes needed to gate the trivia app's question sets feature behind a `lib/feature-flags.ts` config module (backed by `NEXT_PUBLIC_FEATURE_QUESTION_SETS` env var), and what are the risks of incomplete gating?

**In scope:**
- All files under `apps/trivia/src/` that must change, be created, or be deleted to achieve complete gating
- All surfaces (UI, API, navigation, tests) where the feature is currently reachable
- Risks of partial, incorrect, or out-of-order implementation
- Test suite impact — both unit/integration and E2E

**Out of scope:**
- Designing the `lib/feature-flags.ts` module (shape is identified but design is deferred to implementer)
- Planning the implementation sequence in prescriptive detail
- Database migrations, RLS policies, or infrastructure changes
- Other apps in the monorepo (`apps/bingo`, `apps/platform-hub`)
- Feature behavior changes beyond on/off gating

---

## D) Methodology

**Investigation breadth:** 37 files examined directly across 5 investigation areas:
1. Dedicated surfaces (the question sets page, layout, and API routes)
2. Cross-feature references (components that touch QS from outside the QS route)
3. Type and utility dependencies (shared vs QS-exclusive `lib/` files)
4. API and data layer (DB table relationships, route structure, coverage)
5. Navigation and entry points (all paths by which a user can reach QS functionality)

**Iteration depth:** 5 focused deep-dive iterations validated and extended the area findings:
- Iterator 1: TriviaApiImporter — the non-obvious leak point
- Iterator 2: Panel scope — AddQuestionsPanel and EmptyStateOnboarding coupling
- Iterator 3: Test impact — 180 tests classified by QS coupling type
- Iterator 4: Dead code — 1,411 lines inventoried and categorized
- Iterator 5: Gating strategy — complete gate placement specification

**Synthesis:** 3 independent lenses applied to the combined Phase 1+2 findings:
- Synthesis 1 (Thematic): Organized findings into 4 structural themes
- Synthesis 2 (Risk/Opportunity): Produced 9 severity-rated risk and opportunity conclusions
- Synthesis 3 (Gaps/Implications): Identified 8 gaps left by the investigation that block implementation

**Conflict resolution:** Where syntheses diverged (primarily on test handling specifics and edge-case scope), this report resolves by prioritizing the most conservative approach and explicitly marking remaining decisions for the implementer.

---

## E) Key Findings

### Finding 1: The Layout Gate Alone Is Insufficient — the Wizard Leak Is the Critical Gap

**Confidence:** High
**Impact:** High (direct functional bypass of a disabled feature)

The `/question-sets` layout gate (`apps/trivia/src/app/question-sets/layout.tsx`) closes the QS page route but does not cover `TriviaApiImporter.tsx`, which is mounted at `apps/trivia/src/components/presenter/WizardStepQuestions.tsx:46` inside the setup wizard at `/play`. This is entirely outside the `/question-sets` route segment, so the layout redirect never fires.

Within `TriviaApiImporter.tsx`, the "Save to My Question Sets" save form (lines 607-636) and save button (lines 671-686) have only one condition governing their display: the `!isManagement` branch at line 650 controls a different UI element (the "Load into Game" button). The save section has no equivalent guard. The `handleSaveToQuestionSets` handler at line 236 POSTs to `/api/question-sets` unconditionally.

**Consequence of omission:** If only the layout gate and API route guards are implemented, a user in game setup who fetches questions via TriviaApiImporter sees a fully functional save button. Clicking it either silently fails (if the API route is gated — 404 response lands in `saveError` state with no clear user message) or writes orphaned data to `trivia_question_sets` with no management UI to access it.

**Related findings:** Finding 3 (API gating), Finding 6 (layout gate ordering).

---

### Finding 2: The Gating Surface Is 6 Active Changes Plus 2 Dead Code Removals

**Confidence:** High
**Impact:** High (defines the complete implementation scope)

All three syntheses and the five iteration reports independently converged on the same gating surface. Complete gating requires changes to exactly these files:

**Files to create:**
- `apps/trivia/src/lib/feature-flags.ts` — the flag module (new file, single source of truth)

**Files to modify:**
- `apps/trivia/src/app/question-sets/layout.tsx` — add flag redirect as the first check
- `apps/trivia/src/app/page.tsx` — conditionally render the QS navigation link
- `apps/trivia/src/app/api/question-sets/route.ts` — add flag guard (after auth, return 404)
- `apps/trivia/src/app/api/question-sets/[id]/route.ts` — add flag guard to GET, PATCH, DELETE
- `apps/trivia/src/app/api/question-sets/import/route.ts` — add flag guard
- `apps/trivia/src/components/presenter/TriviaApiImporter.tsx` — hide save section when flag off

**Files to delete (dead code, separate PR):**
- `apps/trivia/src/components/presenter/QuestionSetSelector.tsx`
- `apps/trivia/src/components/presenter/SaveQuestionSetModal.tsx`
- `apps/trivia/src/components/presenter/CategoryFilter.tsx`
- `apps/trivia/src/components/presenter/QuestionImporter.tsx`
- `apps/trivia/src/components/presenter/QuestionExporter.tsx`
- `apps/trivia/src/components/presenter/__tests__/QuestionSetSelector.test.tsx`
- `apps/trivia/src/components/presenter/__tests__/SaveQuestionSetModal.test.tsx`
- Dead import/usage sites in `apps/trivia/src/app/play/page.tsx` (lines 28, 98, 585-588)

**What does NOT need a flag check:**
- `apps/trivia/src/lib/categories.ts` — 13 import sites including non-QS consumers
- `apps/trivia/src/lib/questions/api-adapter.ts` — used by `/api/trivia-api/questions/route.ts`
- `TriviaQuestion` type — shared between templates and question sets
- `apps/trivia/src/components/presenter/AddQuestionsPanel.tsx` — layout gate covers it
- `apps/trivia/src/components/presenter/EmptyStateOnboarding.tsx` — layout gate covers it

**Related findings:** Finding 1 (wizard leak), Finding 4 (shared infrastructure).

---

### Finding 3: All Three API Routes Require Independent Flag Guards, and One Has Zero Test Coverage

**Confidence:** High
**Impact:** High (API gating is the defense-in-depth layer below the UI gates)

Three independent API route groups serve question sets. Each must be independently gated:

- `GET/POST /api/question-sets` — `apps/trivia/src/app/api/question-sets/route.ts`
- `GET/PATCH/DELETE /api/question-sets/[id]` — `apps/trivia/src/app/api/question-sets/[id]/route.ts`
- `POST /api/question-sets/import` — `apps/trivia/src/app/api/question-sets/import/route.ts`

The flag guard must be placed after `getApiUser` (so 401 still fires for unauthenticated callers) but before any database operation, returning 404 (consistent with the existing ownership-check pattern at `[id]/route.ts` lines 72-77, 138-143, 192-195 which returns 404 for unauthorized access).

Critical gap: The base `GET/POST /api/question-sets` route has zero test coverage. No `apps/trivia/src/app/api/question-sets/__tests__/route.test.ts` file exists. The `[id]` route has 15 tests and the `import` route has 18 tests, both following an established mock pattern. Writing tests for the base route is a required deliverable of the flag PR, not optional cleanup.

**Related findings:** Finding 2 (gating surface), Finding 5 (documentation error).

---

### Finding 4: Shared Infrastructure Defines an Ungatable Footprint

**Confidence:** High
**Impact:** Medium (constrains what can be removed; prevents accidental breakage)

Three categories of code serve consumers outside the question sets feature and must not be gated:

`apps/trivia/src/lib/categories.ts` has 13 import sites including `lib/game/questions.ts`, `SetupGate.tsx`, and `WizardStepSettings.tsx`. It is shared vocabulary for the entire game engine and predates the question sets feature.

`apps/trivia/src/lib/questions/api-adapter.ts` is used by `/api/trivia-api/questions/route.ts` via `triviaApiQuestionsToQuestions` to convert external Trivia API responses into the app's `Question[]` type. This path is entirely independent of QS persistence.

The `TriviaQuestion` type is shared between `TriviaTemplate.questions[]` and `TriviaQuestionSet.questions[]`. It cannot be removed without breaking templates.

Corollary: `lib/questions/conversion.ts` remains live even when the flag is off because `TriviaApiImporter.tsx` imports it for internal question manipulation (the conversion is used before the save step, not only in the save path). Removing it would break TriviaApiImporter for all users.

**Related findings:** Finding 2 (gating surface).

---

### Finding 5: A Documentation Error in CLAUDE.md Will Mislead the Implementer

**Confidence:** High
**Impact:** Low (certain to cause confusion, not a runtime risk)

`apps/trivia/CLAUDE.md` lists the `/api/question-sets/[id]` route as supporting `GET, PUT, DELETE`. The actual implementation at `apps/trivia/src/app/api/question-sets/[id]/route.ts:101` exports `PATCH`, not `PUT`. An implementer who follows the CLAUDE.md documentation will add the flag guard to a non-existent `PUT` export and miss the live `PATCH` export, leaving that HTTP method ungated.

This error was independently confirmed by Phase 1 area-4 and Phase 2 iterator-5. It must be corrected as the first commit of the feature flag PR.

**Related findings:** Finding 3 (API routes).

---

### Finding 6: The Layout Gate Must Be Ordered Before the E2E Bypass

**Confidence:** High
**Impact:** Medium (incorrect ordering produces false-passing E2E tests)

`apps/trivia/src/app/question-sets/layout.tsx` currently contains an E2E bypass at lines 9-12: when `E2E_TESTING === 'true'`, the layout returns `<>{children}</>` before the auth check. If the feature flag redirect is placed after this bypass — a natural implementation instinct, since auth checks follow the same pattern — E2E tests will reach the question sets page even when the feature is disabled. This makes E2E tests false-pass during CI runs where the flag is off.

The correct check order in `layout.tsx` is: (1) feature flag check → redirect if disabled, (2) E2E bypass → return children, (3) cookie auth check → redirect if unauthenticated.

**Related findings:** Finding 7 (test suite impact).

---

### Finding 7: The Test Suite Has Two Distinct Coupling Patterns That Require Different Handling

**Confidence:** High (classification); Medium (specific skip mechanism)
**Impact:** Medium (85 tests will misfire without explicit handling)

180 tests touch the question sets codebase, but coupling type varies significantly:

**Dedicated QS tests (7 files, 85 tests):** Test files exclusively for QS functionality. When the flag is off, these tests should be skipped atomically using `vi.skipIf` keyed on `process.env.NEXT_PUBLIC_FEATURE_QUESTION_SETS !== 'true'`. These are at:
- `apps/trivia/src/app/question-sets/__tests__/page.test.tsx`
- `apps/trivia/src/app/api/question-sets/__tests__/route.test.ts` (to be created)
- `apps/trivia/src/app/api/question-sets/[id]/__tests__/route.test.ts`
- `apps/trivia/src/app/api/question-sets/import/__tests__/route.test.ts`
- And 3 additional QS-dedicated component test files

**Cross-feature tests (2 files, 20 tests):** `AddQuestionsPanel.test.tsx` and `EmptyStateOnboarding.test.tsx` exercise both QS and non-QS functionality. The specific skip strategy (file-level `vi.skipIf` vs `describe.skipIf` vs `it.skipIf`) depends on whether QS-related tests are in isolated `describe` blocks. The implementation team must read these files before choosing the strategy.

**Superficial-contact tests (4 files, 75 tests):** `SaveTemplateModal` and `TemplateSelector` tests contain the string "question set" in label assertions but call the templates API. These are false positives for any grep-based QS coupling scan and require no changes.

**Related findings:** Finding 6 (E2E bypass ordering), Finding 3 (API coverage gap).

---

### Finding 8: 1,411 Lines of Dead Code Must Be Separated Into a Prior Cleanup PR

**Confidence:** High
**Impact:** Medium (conflating cleanup with flag work creates merge-conflict risk and review noise)

Five components are imported nowhere in production code: `QuestionSetSelector.tsx`, `SaveQuestionSetModal.tsx`, `CategoryFilter.tsx`, `QuestionImporter.tsx`, and `QuestionExporter.tsx`. Two dead test files accompany them. The only overlap with live code is `SaveQuestionSetModal`'s three import/usage sites in `apps/trivia/src/app/play/page.tsx` (lines 28, 98, 585-588), where the modal is mounted but permanently unreachable — no call to `setShowSaveQuestionSetModal(true)` exists anywhere in the file.

The feature flag PR must also touch `play/page.tsx` (to add TriviaApiImporter flag guard via `WizardStepQuestions`). If the cleanup PR and flag PR both modify `play/page.tsx` and are not sequenced correctly, merge conflicts result. More critically: if the cleanup PR deletes `SaveQuestionSetModal.tsx` but leaves its test file intact, the test file imports a non-existent module and fails at collection, blocking all commits via pre-commit hooks (per CLAUDE.md: "if hooks fail, fix the underlying issue before committing").

The cleanup PR must delete all dead files atomically — component, test file, and import sites in the same commit. The flag PR must be branched from the post-cleanup merged commit.

**Related findings:** Finding 2 (gating surface), Finding 5 (CLAUDE.md error — fix in same first-commit scope).

---

## F) Analysis & Implications

### Thematic Patterns

**The boundary asymmetry pattern.** The question sets feature is well-bounded at the data layer (one table, three route groups, no FK relationships outward) and leaky at the UI layer. The data layer can be gated mechanically and uniformly. The UI layer requires recognizing that four entry points exist, not two: the `/question-sets` page, the home page link, the TriviaApiImporter save section in the setup wizard, and (dead but import-present) the SaveQuestionSetModal in `play/page.tsx`. Two of these entry points are outside the `/question-sets` route segment and invisible to route-segment gating strategies. An implementer who thinks in terms of "gate the page and its API" will close two entry points and leave two open.

**The shared infrastructure pattern.** The investigation consistently found that `lib/categories.ts`, `lib/questions/api-adapter.ts`, and the `TriviaQuestion` type serve non-QS consumers and cannot be gated. This pattern recurred across 3 investigation areas and 2 iterations. The implication: the QS feature's utility layer is not a clean module boundary. A future redesign that wanted to make QS truly tree-shakeable would need to decouple these shared types from QS-exclusive types.

**The dead code archaeological pattern.** The 1,411 lines of dead code are not random accumulation — they represent a partial integration of QS into the broader game flow that was abandoned. `QuestionSetSelector.tsx` would have allowed QS-sourced questions to be selected during game setup. `QuestionImporter.tsx` and `QuestionExporter.tsx` would have allowed bulk import/export from the QS management page. The dead code's shape reveals the feature's intended (but unrealized) scope, which is useful context for whoever decides to expand or remove the feature.

**The test mirror pattern.** The 180-test landscape maps directly onto the boundary asymmetry. The 85 dedicated QS tests are as clean and well-bounded as the data layer. The 20 cross-feature tests are as messy as the UI layer. The 75 superficial-contact tests create false positives for any automated coupling analysis. This mirroring is not coincidental — the tests were written to match the code structure that existed at the time, including the partial integration artifacts.

### Risks & Vulnerabilities

| Risk | Severity | Description |
|------|----------|-------------|
| Wizard leak | **High** | TriviaApiImporter save button remains functional in setup wizard if not independently gated |
| Incorrect layout gate ordering | Medium | Placing flag after E2E bypass causes false-passing E2E tests |
| Incomplete API gating | Medium | Any ungated API route allows authenticated writes to disabled feature's table |
| Dead code sequencing conflict | Medium | Overlapping modifications to `play/page.tsx` cause merge conflicts or orphaned test files |
| Test suite noise | Medium | 85 tests misfire when flag off, hiding real regressions in noise |
| CLAUDE.md PUT/PATCH error | Low | Certain to cause brief implementer confusion |
| Build-time flag baked at deploy | Low | Cannot toggle without redeploy; brief cache inconsistency window |
| PWA/SW caching | Low | Service worker may serve cached QS page after flag off; API gates provide defense |

### Strengths & Opportunities

**Opportunity 1 — Forced creation of missing base route tests.** The base `GET/POST /api/question-sets` route has never had a test file. The feature flag PR creates a natural forcing function to write these tests.

**Opportunity 2 — First feature flag establishes a codebase pattern.** `lib/feature-flags.ts` does not exist. Its design will be the first instance of this pattern. A clean design becomes the template for all future flags.

**Opportunity 3 — Dead code removal simplifies bundle and maintenance.** Removing 1,411 lines eliminates five components and their import chains from the bundle and from search results.

### Gaps & Unknowns

- Cross-feature test grouping structure in `AddQuestionsPanel.test.tsx` and `EmptyStateOnboarding.test.tsx` — determines skip strategy
- E2E test QS coverage not inventoried — may block commits if flag is off in E2E environment
- Question sets page server-side data fetching behavior — layout redirect should prevent execution but needs verification
- Sentry noise from 404 responses — error handler in `handleSaveToQuestionSets` may send unexpected errors
- RLS policy on `trivia_question_sets` table not analyzed
- Existing user data persists when flag is off — no migration or communication planned

---

## G) Confidence Assessment

**Overall confidence: High** on the gating surface (what files change), **Medium** on test mechanics specifics (how exactly to handle cross-feature test skip strategy), **Low** on deployment and runtime edge cases (PWA caching, client-navigation cache behavior after flag toggle).

**Strongest claims (all 3 syntheses agree, independently verified in codebase):**
- The gating surface is exactly 6 active changes + 2 dead code removals. No additional files discovered across 5 investigation areas and 5 iterations.
- TriviaApiImporter wizard leak is the highest-severity risk. Evidence at `WizardStepQuestions.tsx:46`, `TriviaApiImporter.tsx:671-686`, and `TriviaApiImporter.tsx:236`.
- Base `GET/POST /api/question-sets` route has zero test coverage.
- `lib/categories.ts`, `lib/questions/api-adapter.ts`, and `TriviaQuestion` type cannot be gated without breaking non-QS features.
- CLAUDE.md documents `PUT` where `PATCH` is implemented (`[id]/route.ts:101`).
- Layout gate must precede E2E bypass to avoid false-passing E2E tests.

**Moderate confidence claims (supported by evidence, implementation detail may vary):**
- `vi.skipIf` is the right mechanism for dedicated QS test files. The exact env var expression depends on the final flag module design.
- Dead code removal should be a separate prior PR. This is a strong recommendation but the project could execute both in one PR with a clean commit split.
- API routes should return 404 (not 403). Consistent with existing pattern but is an implementation choice.

**Weakest claims (inference-based, not directly verified):**
- PWA service worker caching behavior for the `/question-sets` route. The Serwist configuration was not read.
- Client-side navigation cache behavior after flag toggle. Based on Next.js documentation knowledge, not live testing.
- Sentry will fire noise from 404 responses. The error handling code path was not traced to its Sentry integration.

**Known blind spots:**
- RLS policy analysis on `trivia_question_sets` was not performed.
- Whether any external analytics events track QS operations was not investigated.
- Whether any saved user data in `trivia_question_sets` creates UX complications when the flag is turned off.

---

## H) Recommendations

### Recommendation 1: Fix the CLAUDE.md Documentation Error First

**Priority:** Immediate (before implementation begins)
**Rationale:** The `PUT` → `PATCH` error in `apps/trivia/CLAUDE.md` for the `/api/question-sets/[id]` route is certain to cause implementer confusion. It costs one line to fix.
**Trade-offs:** None. Zero behavior risk.
**Open questions:** None.

### Recommendation 2: Merge a Dead Code Cleanup PR Before the Feature Flag PR

**Priority:** High (sequencing dependency)
**Rationale:** The 1,411 lines of dead code include `SaveQuestionSetModal`, whose import sites in `play/page.tsx` will also be touched by the feature flag PR. Separate PRs modifying the same file must be sequenced to avoid merge conflicts. The cleanup PR also deletes the two dead test files.
**Trade-offs:** Requires two PRs instead of one. The alternative (single PR with a clean commit split) is viable if the implementer is disciplined.
**Open questions:** Should the dead type definitions (17 lines) be removed in the cleanup PR or left for the flag PR?

### Recommendation 3: Treat TriviaApiImporter as a Required Gate, Not Optional Polish

**Priority:** High (highest-severity omission risk)
**Rationale:** The wizard leak is the most likely omission because it is non-obvious and the save button is in a 700+ line file outside the QS route. Any reviewer scanning "did we gate all the QS pages?" will not naturally check the game setup wizard.
**Trade-offs:** The in-component env var check creates a direct coupling between the component and the env var. If the flag module design changes later (e.g., to a server-side check), TriviaApiImporter will need a prop-threading update.
**Open questions:** Exact JSX boundary for the save section requires reading `TriviaApiImporter.tsx` lines 600-690.

### Recommendation 4: Place All Three API Route Guards After Auth, Before DB Operations, Returning 404

**Priority:** High (API-level defense in depth)
**Rationale:** The API routes are the defense-in-depth layer below the UI gates. Using 404 is consistent with the existing ownership-check pattern.
**Trade-offs:** 404 responses from a route that previously returned 200/201 will cause cached API clients to treat the response as "not found" — which is the correct UX for a disabled feature.
**Open questions:** What HTTP status should be returned if both the flag is off AND the caller is unauthenticated?

### Recommendation 5: Write Tests for the Base GET/POST Route as a Required PR Deliverable

**Priority:** High (coverage gap on the primary API surface)
**Rationale:** The base route is the only API surface in the QS feature without any existing tests. Adding the flag check to an untested route means the flag behavior itself is unverified.
**Trade-offs:** Writing new tests in the same PR slightly expands scope. The alternative (deferring) leaves the flag check unverified at merge time.
**Open questions:** Minimum coverage: (a) 401 for unauthenticated callers regardless of flag state, (b) 404 for authenticated callers when flag is off, (c) existing CRUD behavior when flag is on.

### Recommendation 6: Ensure the E2E Environment Has the Flag Set to True

**Priority:** Medium (blocks committing if ignored)
**Rationale:** Per CLAUDE.md, all code must pass E2E tests before committing. Setting `NEXT_PUBLIC_FEATURE_QUESTION_SETS=true` in the E2E environment preserves all existing QS E2E coverage without requiring test modifications.
**Trade-offs:** E2E tests always run with the feature on, which does not test the "flag off" state. A complete test suite would add E2E tests for the disabled state.
**Open questions:** Does the trivia app have an `.env.test` or E2E-specific env configuration where this can be set?

---

## I) Open Questions

### Question 1: What is the exact JSX boundary for the save section in TriviaApiImporter?

**Why it matters:** The in-component flag check must hide exactly the save-related UI (save name input, category select, save button) without hiding the "Load into Game" button or the preview panel.
**Suggested approach:** Read `TriviaApiImporter.tsx` lines 600-690, identify the wrapping element for the save form group, confirm that `{QUESTION_SETS_ENABLED && (...)}` at that element level hides all save UI without affecting adjacent elements.

### Question 2: Are QS-related tests in AddQuestionsPanel.test.tsx and EmptyStateOnboarding.test.tsx in isolated describe blocks?

**Why it matters:** Determines whether `describe.skipIf` or `it.skipIf` is the right skip strategy.
**Suggested approach:** Read both test files, identify all `describe` blocks, check whether QS-specific tests are grouped separately.

### Question 3: Does the question sets page perform server-side data fetching in its Server Component body?

**Why it matters:** If `app/question-sets/page.tsx` calls `fetch('/api/question-sets')` in the component body and the API returns 404, there may be a server-side render error before the layout redirect fires.
**Suggested approach:** Read `apps/trivia/src/app/question-sets/page.tsx`. In Next.js App Router, `redirect()` in a layout aborts the render tree, so the page should not execute — but verify.

### Question 4: Do any E2E tests exercise the question sets page or API?

**Why it matters:** Per CLAUDE.md, all code must pass E2E tests before committing. If QS E2E tests exist and the flag is off, they fail and block commits.
**Suggested approach:** Search E2E test files for references to `question-sets` or QS-related selectors. If any exist, add `NEXT_PUBLIC_FEATURE_QUESTION_SETS=true` to the E2E environment.

### Question 5: Does TriviaApiImporter's error handler treat 404 as an expected signal or fire Sentry?

**Why it matters:** When the API returns 404 with the flag off, Sentry noise may result if the error handler doesn't distinguish "feature disabled" from "unexpected error."
**Suggested approach:** Read `TriviaApiImporter.tsx` around `handleSaveToQuestionSets` (line 236) and trace the error handling path.

### Question 6: What is the default value of the flag when the env var is unset?

**Why it matters:** Opt-out (`!== 'false'`, enabled by default) vs opt-in (`=== 'true'`, disabled by default) affects every environment that doesn't explicitly set the var.
**Suggested approach:** Phase 0 specified `!== 'false'` (opt-out). Confirm this is still the intent. Document the decision in `lib/feature-flags.ts` with a JSDoc comment.

### Question 7: Should the gated API routes return 404 or 410 (Gone)?

**Why it matters:** 404 = "not found" (ambiguous). 410 = "intentionally removed" (semantically precise for a disabled feature). For a feature that may be re-enabled, 404 is more appropriate.
**Suggested approach:** 404 is recommended for consistency with the existing ownership-check pattern. Use 410 only if the feature is being permanently removed.

---

## J) Appendix: Evidence Index

| Finding | Claim | Evidence Source | File:Line |
|---------|-------|----------------|-----------|
| F1 | TriviaApiImporter save section has no flag guard | Phase 2 Iterator 1, Phase 3 S1 C1, Phase 3 S2 C1 | `TriviaApiImporter.tsx:671-686`, `TriviaApiImporter.tsx:236`, `WizardStepQuestions.tsx:46` |
| F1 | Layout gate does not cover wizard route | Phase 1 Area 5 F1, Phase 2 Iterator 5 | `question-sets/layout.tsx:9-20`, `app/play/page.tsx` |
| F2 | Complete gating surface: 6 active changes | Phase 2 Iterator 5, Phase 3 S2, Phase 3 packet | All three syntheses agree independently |
| F2 | Dead code: 5 components, 2 test files | Phase 2 Iterator 4 | `QuestionSetSelector.tsx`, `SaveQuestionSetModal.tsx`, `CategoryFilter.tsx`, `QuestionImporter.tsx`, `QuestionExporter.tsx` |
| F2 | Dead import sites in play/page.tsx | Phase 2 Iterator 4, Phase 3 S2 C4 | `play/page.tsx:28,98,585-588` |
| F3 | Three API routes, each needs independent guard | Phase 1 Area 4, Phase 2 Iterator 5 | `api/question-sets/route.ts`, `api/question-sets/[id]/route.ts`, `api/question-sets/import/route.ts` |
| F3 | Base route zero test coverage | Phase 1 Area 1 F9, Phase 3 S2 C3 | No `api/question-sets/__tests__/route.test.ts` file exists |
| F3 | 404 consistent with ownership check pattern | Phase 3 S1 R4 | `[id]/route.ts:72-77,138-143,192-195` |
| F4 | `lib/categories.ts` has 13 import sites | Phase 1 Area 3 F2-5, Phase 3 S1 C3 | `lib/categories.ts` (13 import sites including `lib/game/questions.ts`) |
| F4 | `api-adapter.ts` used by trivia API route | Phase 1 Area 3, Phase 3 S1 C3 | `lib/questions/api-adapter.ts`, `/api/trivia-api/questions/route.ts` |
| F5 | CLAUDE.md lists PUT, route exports PATCH | Phase 1 Area 4, Phase 2 Iterator 5, Phase 3 S2 C6 | `[id]/route.ts:101`, `apps/trivia/CLAUDE.md` API Routes table |
| F6 | E2E bypass precedes auth check in layout | Phase 2 Iterator 5, Phase 3 S2 C2 | `question-sets/layout.tsx:9-12` |
| F6 | Flag check must be line 1 in layout | Phase 3 S2 C2, Phase 3 packet | All 3 syntheses agree |
| F7 | 85 dedicated QS tests, 7 files | Phase 2 Iterator 3, Phase 3 S1 C4 | 7 QS-dedicated test files |
| F7 | 20 cross-feature tests in 2 files | Phase 2 Iterator 3, Phase 3 S1 C4 | `AddQuestionsPanel.test.tsx`, `EmptyStateOnboarding.test.tsx` |
| F7 | 75 superficial-contact tests are false positives | Phase 2 Iterator 3, Phase 3 S1 C4 | `SaveTemplateModal` and `TemplateSelector` tests |
| F8 | 1,411 lines of dead code | Phase 2 Iterator 4, Phase 3 S2 C9 | 5 components + type definitions |
| F8 | Cleanup + flag PR sequencing risk | Phase 3 S2 C4 | `play/page.tsx:28,98,585-588` |

---

*Phase 4 Final Report. Generated from Phase 1 (5 area reports, 37 files), Phase 2 (5 iterator reports), Phase 3 (3 synthesis lenses), and Phase 3 comparison packet. All claims trace to at least one Phase 1/2/3 source.*
