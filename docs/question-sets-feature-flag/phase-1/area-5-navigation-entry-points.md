# Investigation: Navigation, Routing, and UI Entry Points

## Summary
Exactly 3 user-visible entry points lead to question sets, plus 2 dead surfaces. No shared nav component exists — all links are page-local. Middleware does not protect `/question-sets` (layout handles auth). QuestionSetSelector component exists but is rendered nowhere in production.

## Key Findings

### Finding 1: Home page has "Question Sets" button (auth-gated)
- **Evidence:** `app/page.tsx:33-37` — `<Link href="/question-sets">Question Sets</Link>` inside `isAuthenticated` conditional
- **Confidence:** high
- **Implication:** Primary entry point. Add flag check: `isAuthenticated && featureEnabled`.

### Finding 2: SaveQuestionSetModal on play page is permanently unreachable (dead code)
- **Evidence:** `app/play/page.tsx:28,98,585-588` — imported, mounted with `isOpen={false}`, no trigger exists
- **Confidence:** high
- **Implication:** Dead import pulling in QS dependency. Should be removed.

### Finding 3: No global nav links to /question-sets
- **Evidence:** `app/layout.tsx` renders no nav. No Header/Sidebar/Nav components found.
- **Confidence:** high
- **Implication:** No layout-level changes needed.

### Finding 4: /question-sets is auth-gated by layout, NOT middleware
- **Evidence:** `app/question-sets/layout.tsx:10-20` checks `jb_access_token` cookie. `middleware.ts:13` only protects `/play`.
- **Confidence:** high
- **Implication:** Feature flag fits in layout.tsx alongside existing auth check. E2E bypass must be preserved.

### Finding 5: QuestionSetSelector component is orphaned — rendered nowhere
- **Evidence:** Only import is in test file `__tests__/QuestionSetSelector.test.tsx:3`. No production .tsx imports it.
- **Confidence:** high
- **Implication:** Dead code. Not an entry point needing gating.

### Finding 6: Setup wizard does NOT reference /question-sets
- **Evidence:** SetupGate, SetupWizard, WizardStepQuestions — none import or link to QS components/routes
- **Confidence:** high
- **Implication:** Setup flow completes without question sets.

### Finding 7: TriviaApiImporter has "Save to My Question Sets" button
- **Evidence:** `components/presenter/TriviaApiImporter.tsx:671-686` — button calls `handleSaveToQuestionSets()` → POST /api/question-sets
- **Confidence:** high
- **Implication:** Secondary entry point into QS data layer. Must hide when flag is off.

### Finding 8: /question-sets page links back to / only
- **Evidence:** `app/question-sets/page.tsx:170-176` — `<Link href="/">Back to Home</Link>`
- **Confidence:** high
- **Implication:** If user reaches page when flagged off, layout redirect prevents rendering anyway.

## Surprises
- QuestionSetSelector is fully built and tested but orphaned (never rendered)
- SaveQuestionSetModal is mounted on play page but unreachable
- Setup wizard Step 0 (Questions) has no link to /question-sets at all
- Middleware doesn't protect /question-sets — layout handles it
