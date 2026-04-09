# Synthesis: Thematic

## Synthesis Approach

This synthesis organizes findings from Phases 1 and 2 into 4 coherent themes. Each theme captures a structural pattern that spans multiple investigation areas rather than restating individual findings. The goal is to identify the underlying forces that shape both the gating strategy and the implementation risk.

The analysis draws on: Phase 1 area reports (5 files), Phase 2 iterator reports (5 files), and direct codebase inspection of key files including `/apps/trivia/src/components/presenter/TriviaApiImporter.tsx`, `/apps/trivia/src/app/question-sets/layout.tsx`, the 3 API routes under `/apps/trivia/src/app/api/question-sets/`, `QuestionSetSelector.tsx`, and `app/play/page.tsx`.

---

## Core Narrative

The question sets feature is architecturally self-contained at the data layer — one DB table, three API route groups, no FK relationships outward — but it has grown tendrils into adjacent surfaces that were never cleaned up as the feature evolved. The gating strategy must handle two distinct problems simultaneously: closing the clean boundary (page + APIs) and patching the leakage points (TriviaApiImporter save button, dead code imports). The 1,411 lines of dead code are not noise; they are archaeological evidence that the feature's integration into the broader app was partially built, then abandoned. That abandonment created an asymmetry: the surfaces that need active gating are not where the dead code is, and the dead code is not where the live surfaces are.

---

## Key Conclusions

### Conclusion 1: The Feature Boundary Is Clean at the Data Layer but Leaky at the UI Layer

The data layer has zero outward dependencies. `trivia_question_sets` has no FK to templates or presets. The three API route groups share no state with other API routes. Gating the data layer requires only a flag check after `getApiUser` in each of the 3 route handlers.

The UI layer is the opposite. Four entry points exist: the `/question-sets` page (covered by layout gate), the home page link (covered by auth-block condition), and two secondary surfaces that were never recognized as entry points — the "Save to My Question Sets" button in `TriviaApiImporter` (active in the setup wizard via `WizardStepQuestions.tsx:46`) and the dead `SaveQuestionSetModal` import in `play/page.tsx`. The layout gate alone closes the page route but leaves the wizard-mounted save button fully functional, creating a bypass path into the disabled feature.

Supporting findings: area-1 Finding 2, area-5 Findings 1/7, iterator-1 (all), iterator-2 (both), iterator-5 findings 3/4. Confidence: high.

### Conclusion 2: Dead Code Is a Distinct Problem From Gating and Must Be Separated

The 1,411 lines of dead code (`QuestionSetSelector.tsx`, `SaveQuestionSetModal.tsx`, `CategoryFilter.tsx`, `QuestionImporter.tsx`, `QuestionExporter.tsx`, two dead type definitions) are cleanup concerns, not gating concerns. None are actively rendered in production. Including their removal in the feature flag PR conflates two separate objectives: controlling feature visibility and reducing maintenance surface.

The exception is the `SaveQuestionSetModal` import in `play/page.tsx` (lines 28, 98, 585–588), which shares a file with live code. But its removal is mechanically independent of any flag logic — deleting the import and three JSX lines carries zero behavioral risk.

Separating dead code removal into a pre-merged cleanup PR produces a cleaner feature flag diff and eliminates review noise. If skipped, the cleanup should be a distinct commit with its own message in the flag PR.

Supporting findings: iterator-4 (all), area-1 Finding 8, area-2 Findings 3/5, area-3 Findings 8/9. Confidence: high.

### Conclusion 3: Shared Infrastructure Cannot Be Gated and Defines the Minimum Stable Footprint

Three categories of code are load-bearing for non-QS features and cannot be disabled:

1. `lib/categories.ts` — 13 import sites including `lib/game/questions.ts`, `SetupGate.tsx`, `WizardStepSettings.tsx`. Category data is shared vocabulary for the entire game engine.

2. `lib/questions/api-adapter.ts` — Used by `/api/trivia-api/questions/route.ts` via `triviaApiQuestionsToQuestions`. Converts external Trivia API responses into the app's `Question[]` type for game use, entirely independent of QS persistence.

3. `TriviaQuestion` type — Shared by both `TriviaTemplate.questions[]` and `TriviaQuestionSet.questions[]`. Cannot be removed.

This footprint defines what stays enabled when the flag is off. None of these files need flag checks — they serve non-QS consumers and should be left untouched.

The corollary: `lib/questions/` files other than `api-adapter.ts` (parser, validator, exporter, conversion, types) are QS-exclusive. However, `conversion.ts` remains live because `TriviaApiImporter.tsx` imports it for the save-to-QS path — and TriviaApiImporter itself stays enabled (only the save section is hidden by the flag).

Supporting findings: area-3 Findings 2/3/4/5/6, area-4 Findings 4/5/9. Confidence: high.

### Conclusion 4: The Test Suite Mirrors the Feature Boundary Asymmetry

The 180-test landscape divides along the same lines as the gating analysis. Dedicated QS test files (7 files, 85 tests) map to the cleanly bounded surfaces and can be skipped atomically when the flag is off. Cross-feature tests (2 files, 20 tests — `AddQuestionsPanel.test.tsx`, `EmptyStateOnboarding.test.tsx`) map to the "leaky" UI layer: these components are QS-page-exclusive but contain mocked QS sub-components, and certain tests exercise QS-specific tabs or save flows.

Superficial-contact tests (4 files, 75 tests) expose a naming false-positive problem: `SaveTemplateModal` and `TemplateSelector` use "question set" in label strings but call the templates API. Any grep-based scan for QS coupling would misclassify these 24 tests. The correct distinction is coupling type — label string vs. API call target — not text occurrence.

One notable gap: the base `GET/POST /api/question-sets` route has zero test coverage (area-1 Finding 9). This is the only API surface in the QS feature without tests. The flag check added to this route would be untested code at merge time.

Supporting findings: iterator-3 (all), area-1 Finding 9, area-2 Findings 6/7. Confidence: high (classification), medium (skip mechanism — depends on `lib/feature-flags.ts` shape not yet designed).

---

## Blind Spots

**1. `lib/feature-flags.ts` module shape is unresolved.** The synthesis assumes a boolean `NEXT_PUBLIC_*` env var. If the module requires a server-only check, the TriviaApiImporter (a client component) cannot read it directly and would need the flag passed as a prop from a Server Component parent — requiring prop threading through `WizardStepQuestions` → `TriviaApiImporter`. This trade-off was not evaluated in Phase 2 and is the highest-priority open question for implementation.

**2. `NEXT_PUBLIC_*` flags are baked in at build time.** A flag implemented as `NEXT_PUBLIC_ENABLE_QUESTION_SETS` cannot be toggled without a redeploy. If runtime toggleability is required, the architecture changes significantly (a Server Component must pass the flag as a prop to `TriviaApiImporter`).

**3. `AddQuestionsPanel` and `EmptyStateOnboarding` import QS components.** Iterator-5 concluded zero changes are required because the layout gate covers them. This is correct for the happy path. But both components import `QuestionSetImporter` and `QuestionSetEditorModal`. If the layout gate fails or Next.js bundle analysis is performed, these imports could surface as unexpected QS dependencies in a "disabled" build.

**4. No E2E test coverage of the disabled state.** The existing suite tests QS functionality but not the gated state. Post-implementation, E2E tests should verify: (a) `/question-sets` redirects when flag off, (b) API routes return 404 when flag off, (c) home page hides the QS link, (d) wizard does not render the save button.

---

## Recommendations

1. **Design `lib/feature-flags.ts` first.** The module shape — specifically whether it exports a `NEXT_PUBLIC_*` boolean or a server-side function — determines the TriviaApiImporter gating mechanism and is the single decision with the largest downstream impact on implementation complexity.

2. **Merge dead code cleanup PR before the feature flag PR.** This produces a minimal, high-signal feature flag PR diff.

3. **Add a test for `GET/POST /api/question-sets` base route** before or alongside the feature flag PR. The flag check in this route will be new code with no existing coverage.

4. **Use 404 for gated API routes** (not 403 or 503). This is consistent with the existing ownership-check pattern in `[id]/route.ts` (lines 72–77, 138–143, 192–195), which returns 404 for unauthorized access.

5. **Document the feature flag env var** in the trivia app's `CLAUDE.md` and the root `CLAUDE.md` environment variables section. Feature flags implemented as env vars are invisible unless documented at the repository level.

---

*Synthesis generated from Phase 1 (5 area reports) and Phase 2 (5 iterator reports) findings. File:line citations cross-referenced against live codebase during Phase 3 research.*