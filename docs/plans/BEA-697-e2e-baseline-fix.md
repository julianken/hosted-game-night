# BEA-697: E2E Baseline Restoration Plan

> **Status:** Planning only — no code changes in this PR.
> **Linear:** https://linear.app/beak-gaming/issue/BEA-697
> **Branch:** `chore/BEA-697-e2e-baseline-plan`
> **Follow-up implementation issue:** TBD (description drafted at the bottom of this doc)

---

## Context

BEA-696 (PR #522, "cleanup followup") surfaced that `pnpm test:e2e` fails on a baseline `main` checkout. The failures were verified to pre-date BEA-696 by stashing BEA-696's changes and re-running the suite against the unchanged baseline at commit `b42ac974`.

The failures are the cumulative drift between several independent standalone-conversion commits and the Playwright infrastructure that was authored against the pre-standalone (auth-aware) UI:

| Commit | Scope | Impact on E2E |
| --- | --- | --- |
| `00742c9b` | `feat(bingo): remove auth surface for standalone mode (BEA-683)` | Deleted `LoginButton` from `/`, leaving only a `<Link>` CTA. The home page now has **zero** `<button>` elements, which `waitForHydration` waits on. |
| `8acd4695` | `feat(trivia): remove auth surface for standalone mode (BEA-684)` | Same pattern on the trivia home page. |
| `3d3894cc` | `feat: delete packages/auth and clean up supabase deps (BEA-688)` | Removed `apps/bingo/src/app/api/health` (and equivalents). `e2e/bingo/health.spec.ts` still calls `/api/health`. |
| `397fe843` | `fix(trivia): remove auto-loading default template on setup` | Deleted the auto-template `useEffect` in `SetupWizard`, so a fresh Playwright browser has **zero** questions. `startGameViaWizard` was built assuming the step-0 (Questions) gating would already be satisfied. |
| `5a0b431d`, `a4738b94`, `b42ac974` | Orphan/config cleanup sweep | Incidental, but the cleanup trilogy confirms platform-hub assumptions are fully gone from `main`. |

This plan investigates each of the three failure clusters called out in BEA-697, proposes a preferred fix, and stages a follow-up implementation issue.

---

## Investigation summary

All three failures are confirmed (not guessed) root-cause traced. Two of them are the **same** underlying bug wearing different masks — an implicit contract between `waitForHydration` / `startGameViaWizard` and the pre-standalone UI. One (health endpoint) is a straightforward orphaned reference.

**High-level picture:**

1. **`waitForHydration` drift (failure 1):** `e2e/utils/helpers.ts:8` waits for a `button, input, [role="button"]` element. The bingo/trivia home pages and both `/display` invalid-session screens now render **only** links and SVGs — no buttons, no inputs, no `role=button`. Every test that visits `/` or `/display` (invalid-session path) through this helper stalls for 5 s and then fails the assertion. Cascades into ~28 test failures across four spec files.
2. **Orphan `/api/health` endpoint (failure 2):** `e2e/bingo/health.spec.ts` hits `/api/health`, but `apps/bingo/src/app/api/health/` was deleted in BEA-688. Both tests in the file return 404. Nothing else in the repo depends on the endpoint.
3. **`startGameViaWizard` helper rot (failure 3):** `e2e/utils/helpers.ts:272` calls `wizard-step-2` (Teams) first, which `SetupWizard.goToStep()` silently rejects when step 0 (Questions) is not yet complete. With no auto-load template (`397fe843`), a fresh Playwright browser has zero questions, so the Teams step never activates and the helper hangs looking for the `add team` button until the per-test timeout of 60 s (= the "1.0 m per test" symptom from the issue). Every trivia test that relies on the `authenticatedTriviaPage` fixture with default `skipSetupDismissal: false` inherits this timeout, so the damage is not limited to `display.spec.ts`.

---

## Failure 1: `waitForHydration` helper drift

### Root cause (confirmed)

`e2e/utils/helpers.ts:8-16`:

```ts
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await expect(async () => {
    const hasInteractiveElement = await page
      .locator('button, input, [role="button"]')
      .first()
      .isVisible({ timeout: 1000 });
    expect(hasInteractiveElement).toBe(true);
  }).toPass({ timeout: 5000 });
}
```

The helper waits for **any** `button`, `input`, or `[role="button"]`. The following pages, post-standalone, contain none of those on first paint:

| Page | Content | Source |
| --- | --- | --- |
| `apps/bingo/src/app/page.tsx` | Single `<Link href="/play">` CTA (renders as `<a>`). `LoginButton` was removed in `00742c9b`. | Lines 32–46 |
| `apps/trivia/src/app/page.tsx` | Single `<Link href="/play">` CTA. Stripped by BEA-684 (`8acd4695`). | Lines 14–20 |
| `apps/bingo/src/app/display/page.tsx` — `InvalidSessionError` | Pure text + SVG, no buttons. | Lines 32–64 |
| `apps/trivia/src/app/display/page.tsx` — `InvalidSessionError` | Pure text + SVG, no buttons. | Lines 17–49 |

Because `waitForHydration` uses `isVisible({ timeout: 1000 })` wrapped in `.toPass({ timeout: 5000 })`, it retries about five times, then the wrapper assertion fails the test.

### Tests affected

Enumerated by hand from the callsite grep (`waitForHydration` + `page.goto('/')` or `page.goto('/display')` without `authenticatedXyzPage` fixture):

| Spec file | Test block | Tests | Reason |
| --- | --- | --- | --- |
| `e2e/bingo/home.spec.ts` | Top-level describe `beforeEach` → `page.goto('/')` | **8** | Every test |
| `e2e/trivia/home.spec.ts` | Top-level describe `beforeEach` → `page.goto('/')` | **7** | Every test |
| `e2e/bingo/accessibility.spec.ts` → `Home Page` describe | `beforeEach` → `page.goto('/')` | **6** | Every test in that describe |
| `e2e/bingo/accessibility.spec.ts` → `Basic A11y Checks` → `home page passes basic accessibility checks` | Inline `page.goto('/')` | **1** | Single test |
| `e2e/bingo/display.spec.ts` → top-level | `page.goto('/display')` × 2 direct-access tests | **2** | 2 "invalid session" tests |
| `e2e/trivia/display.spec.ts` → `Direct Access - Invalid Session` | `page.goto('/display')` × 4 | **4** | All 4 tests in the block |

**Confirmed affected: 28 tests** across 5 spec files.

> The BEA-697 description mentions "~16 failures in accessibility.spec.ts and home.spec.ts"; the real count is higher once you include the trivia home spec and the two `/display` invalid-session describes. Those additional 12 failures are the same root cause, so they should be rolled into the same fix.

### Fix options

**Option A — Broaden the selector to include links.** Change the locator to `button, input, [role="button"], a[href]` (or `'main a, main button, main input'`).
- **Pros:** One-line fix. Zero spec churn. Works across all 28 affected tests at once. Matches user intuition of "React is interactive now".
- **Cons:** A page with only decorative links would still pass hydration (false positive). Does not cover the `/display` invalid-session page, which has **no** links either — only an SVG and text.

**Option B — Assert on body content presence, not a specific element type.** Wait for any rendered child of `<main>` to exist, e.g. `page.locator('main').locator(':visible').first()`.
- **Pros:** Independent of which element type the page picks; handles static-content pages like `InvalidSessionError`.
- **Cons:** Less strict — could pass while React is still hydrating client-only widgets. Since all our pages are primarily server-rendered with client islands, this is acceptable in practice.

**Option C — Swap out `waitForHydration` for `page.waitForLoadState('networkidle')`** or drop the helper altogether.
- **Pros:** Matches Playwright's native idioms.
- **Cons:** `networkidle` is explicitly discouraged by Playwright docs for hydration purposes; it can fire before React client components mount. Higher risk of flakiness under turbopack/service-worker load.

**Option D — Change the home pages to render a button instead of a Link.** Not viable — deliberate UX decision in BEA-683/684 and reverting it is scope creep.

### Recommendation

**Option B (body-content presence) with a narrower fallback.** Concretely, update `waitForHydration` to:

```ts
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  // A hydrated page must render at least one visible element inside <main>
  // (pages use <main> as the primary landmark in both apps).
  await expect(async () => {
    const hasMainContent = await page
      .locator('main :visible')
      .first()
      .isVisible({ timeout: 1000 });
    expect(hasMainContent).toBe(true);
  }).toPass({ timeout: 5000 });
}
```

Rationale:
- Covers every affected page (all render into `<main>`: bingo/trivia home pages, both `/display` invalid-session screens, and the authenticated `/play` pages).
- Removes the implicit "must have a button" contract that is fragile to UX changes.
- Retains the retry semantics and 5 s bound, so existing assumptions about timing hold.

Accept that this is slightly looser than the current gate — the real tests that follow `waitForHydration` still make specific assertions about the visible UI, so the helper is acting as a "DOM exists" smoke check, not a full hydration probe.

### Files to modify

- `e2e/utils/helpers.ts` — rewrite `waitForHydration` per Option B.
- No spec files need to change for this failure (the fix is in the helper).

### Verification

1. `pnpm test:e2e:bingo` — `e2e/bingo/home.spec.ts`, `e2e/bingo/accessibility.spec.ts`, and the `/display` invalid-session tests in `e2e/bingo/display.spec.ts` should pass.
2. `pnpm test:e2e:trivia` — `e2e/trivia/home.spec.ts` and the Direct Access block in `e2e/trivia/display.spec.ts` should pass. (Trivia Valid-Session tests still depend on failure 3's fix.)
3. Manual spot-check: `pnpm test:e2e --grep "displays the main title"` (the lightest test that exercises the helper) — should complete in under 10 s.

---

## Failure 2: `health.spec.ts` orphaned endpoint

### Root cause (confirmed)

- `e2e/bingo/health.spec.ts:4` calls `await request.get('/api/health')` expecting a 200 JSON payload with `status: 'ok'` and a timestamp.
- `apps/bingo/src/app/api/` currently contains only `csp-report/` and `monitoring-tunnel/`. No `health/` directory.
- `git log --all -- "apps/bingo/src/app/api/health/**"` last touches:
  - `3d3894cc` — `feat: delete packages/auth and clean up supabase deps (BEA-688) (#512)` **(deletion)**
- `apps/bingo/CLAUDE.md` "API Routes" table already lists only CSP and monitoring routes, confirming the endpoint is intentionally gone.
- `rg -g '!node_modules' '/api/health'` returns no live consumers outside `e2e/bingo/health.spec.ts` itself (no k8s manifest, no Vercel cron, no monitoring config).

Every time the spec runs, both tests get a 404, so both fail.

### Fix options

**Option A — Delete `e2e/bingo/health.spec.ts`.**
- **Pros:** Smallest possible change. Aligns the suite with the actual product surface (no runtime health endpoint).
- **Cons:** Loses whatever minimal monitoring-value the spec provided. Since it never existed as a real monitoring signal (no uptime check hit it), this "loss" is theoretical.

**Option B — Re-introduce a minimal `app/api/health/route.ts` returning `{ status: 'ok', timestamp: ISO }`.**
- **Pros:** Keeps the tests as a (minimal) smoke signal.
- **Cons:** Reintroduces a public API surface that the standalone-conversion sweep intentionally removed. Creates a new lint/security review touchpoint for a feature with no consumers. Violates the "standalone" direction.

**Option C — Keep the spec file but skip the tests (`test.skip(true, ...)`) with a TODO.**
- **Pros:** Preserves history.
- **Cons:** Zombie tests. Worst of both worlds.

### Recommendation

**Option A — Delete `e2e/bingo/health.spec.ts`.**

Rationale: the endpoint was removed as a deliberate simplification, nothing consumes `/api/health`, and the two tests duplicate the signal you already get from the first request Playwright makes to any page (if the bingo server is down, every test fails immediately). Keeping zombie tests is worse than deleting them, and we can re-add a health check later if an external monitor needs one.

### Files to modify

- **Delete:** `e2e/bingo/health.spec.ts` (22 lines)
- No trivia equivalent exists (grep confirms no `e2e/trivia/health.spec.ts`).

### Verification

1. `pnpm test:e2e:summary` should show the "Bingo Health Endpoint" describe block gone from the run manifest with no new failures.
2. `rg '/api/health' e2e/` should return zero matches after deletion.

---

## Failure 3: trivia `display.spec.ts` timeouts

### Root cause (confirmed)

Two compounding problems manifest as the "1.0 m per test" symptom:

**A. Direct Access tests** (`e2e/trivia/display.spec.ts:5-36`, four tests) — same as failure 1: they `page.goto('/display')` which renders `InvalidSessionError` with no buttons, then `waitForHydration` stalls for 5 s. These fail at the helper level, not the 60 s timeout.

**B. Valid Session tests** (the remaining ~30 tests in the file) — these use the `authenticatedTriviaPage` fixture from `e2e/fixtures/auth.ts:93-105`, which navigates to `/play` and then calls `startGameViaWizard(page)` to dismiss the SetupGate. This is where the 60 s timeout comes in:

`e2e/utils/helpers.ts:272-307` (`startGameViaWizard`):

```ts
// Navigate to Teams step (wizard step index 2)
await gate.locator('[data-testid="wizard-step-2"]').click();

// Add the requested number of teams
for (let i = 0; i < teamCount; i++) {
  const addTeamBtn = gate.getByRole('button', { name: /add team/i });
  await addTeamBtn.click();
  // ...
}
```

The helper clicks `wizard-step-2` (Teams) assuming the wizard will jump straight there. But `apps/trivia/src/components/presenter/SetupWizard.tsx:111-121`:

```ts
const goToStep = (step: number) => {
  // Allow going backwards freely; forwards only if all intermediate steps are complete
  if (step <= currentStep) {
    setCurrentStep(step);
  } else {
    for (let i = currentStep; i < step; i++) {
      if (!isStepComplete(i)) return;  // <-- silent early-return
    }
    setCurrentStep(step);
  }
};
```

And `isStepComplete(0)` returns `questions.length > 0` (`SetupWizard.tsx:97`).

On a fresh Playwright browser, `useGameStore.questions` is `[]` because:
- `397fe843` (`fix(trivia): remove auto-loading default template on setup`, 2026-03-05) deleted the `useEffect` that loaded the default template on mount.
- No localStorage is carried in from prior runs (Playwright uses isolated contexts by default).

So `goToStep(2)` silently does nothing, the wizard stays on step 0, `[data-testid="wizard-step-2"]` gets clicked but no step change happens, and then the helper tries `gate.getByRole('button', { name: /add team/i })`. The "Add Team" button only exists inside `WizardStepTeams`, which is **not rendered** on step 0. Playwright waits for it until the per-action timeout, then the test-level timeout pops at 60 s.

Every trivia test using `authenticatedTriviaPage` with default `skipSetupDismissal: false` inherits this hang — that's `display.spec.ts` but ALSO `presenter.spec.ts`, `dual-screen.spec.ts`, `round-config.spec.ts`, and any other trivia spec that imports that fixture. The "additional findings" section below tracks this blast radius.

### Fix options

**Option A — Seed questions before clicking the wizard step.** Load a canned question set directly into `useGameStore.importQuestions()` via `page.evaluate()` at the start of `startGameViaWizard`, or inject a fixture via `context.addInitScript()` to pre-populate localStorage.
- **Pros:** Smallest conceptual change — restores the implicit contract the helper was written for. Keeps `startGameViaWizard` as a "dismiss the wizard and go" tool.
- **Cons:** Couples the helper to `useGameStore` internals. `addInitScript` has to know the storage key (`jb-trivia-*`) and the serialized schema.

**Option B — Walk the full wizard in the helper.** Add step 0 handling: detect if the Questions step shows a "fetch questions" or "import" flow, run through it (via the API or by seeding), then proceed to Teams.
- **Pros:** Exercises the real user flow and catches regressions in the Questions step.
- **Cons:** The Questions step depends on `THE_TRIVIA_API_KEY` (for API fetch) or a file upload. Adds per-run network dependency + secrets surface. Brittle.

**Option C — Add a test-only escape hatch in the app.** Expose `window.__e2eSeedQuestions(questions)` when `E2E_TESTING=true` that loads a canned set.
- **Pros:** Explicit, predictable, no coupling to store internals from test code.
- **Cons:** Adds dev-only code to the app. Mixes test infrastructure into product code. `CLAUDE.md` says manual tests must NOT use `E2E_TESTING=true`, so this has to be scoped carefully (read the env at import time, not at runtime).

**Option D — Reintroduce the auto-load-default-template useEffect** behind an E2E-only flag.
- **Pros:** Restores the original contract.
- **Cons:** Same concern as C — product code branching on test env. Also, `397fe843`'s commit message explicitly says "Start with a clean slate — let the user fetch questions explicitly." Reverting this is scope creep and fights the intent.

### Recommendation

**Option A with `addInitScript`**, concretely:

1. Ship a fixtures module `e2e/utils/trivia-fixtures.ts` containing a minimal canned question set (3 questions × 2 rounds = 6 questions, enough to satisfy `isStepComplete(0)` and give round 1 some content).
2. Update `authenticatedTriviaPage` in `e2e/fixtures/auth.ts` to call `context.addInitScript(...)` before `page.goto('/play')`, seeding `jb-trivia-*` localStorage with the canned set. The init script runs on every navigation, so popups (like `/display`) inherit the seeded state automatically.
3. Simplify `startGameViaWizard` to no longer assume the Questions step is auto-satisfied — keep its current click path but add an explicit `isStepComplete` assertion that fails loud (with a helpful error) if the seed didn't take.

Rationale:
- Decouples test infrastructure from product code.
- Zero changes to `apps/trivia`.
- `addInitScript` is the Playwright-idiomatic way to pre-populate localStorage per Playwright docs.
- Scales to all trivia tests that use the fixture, not just `display.spec.ts`.

Trade-off accepted: the helper's `[data-testid="wizard-step-2"]` click-and-expect flow still runs; it just now reliably succeeds because the gate is open. If the SetupWizard ever changes its step model, both the helper and the fixture will need updates — but that's inherent to any helper abstraction and the `addInitScript` hook keeps the coupling surface small (one storage key + one schema).

### Files to modify

- **New:** `e2e/utils/trivia-fixtures.ts` — canned question set + serialized storage payload.
- **Modify:** `e2e/fixtures/auth.ts` — add `context.addInitScript()` in `authenticatedTriviaPage` before the `goto`.
- **Modify:** `e2e/utils/helpers.ts:272-307` — add a guard: after clicking `[data-testid="wizard-step-2"]`, assert the Teams step is visible; on failure, throw an error that names the likely cause ("seed not applied? check `e2e/utils/trivia-fixtures.ts`").
- **Maybe modify:** `e2e/trivia/display.spec.ts` — the Direct Access tests do NOT use the `authenticatedTriviaPage` fixture, so they shouldn't need changes (failure 1's helper fix is sufficient). Double-check during implementation.

### Verification

1. `pnpm test:e2e:trivia -- --grep "Valid Session Display"` — should run in normal time (~5–10 s per test) instead of 60 s.
2. `pnpm test:e2e:trivia -- --grep "Direct Access"` — should pass once failure 1 is fixed (no seed needed).
3. `pnpm test:e2e:trivia` (full run) — should complete without timeouts in `presenter.spec.ts`, `dual-screen.spec.ts`, `round-config.spec.ts`, or any spec that uses the `authenticatedTriviaPage` fixture.
4. Spot-check the seed: run `pnpm dev:trivia`, then in DevTools console: `localStorage.getItem('jb-trivia-questions')` should be empty on a clean browser, confirming the seed only applies under Playwright.

---

## Additional findings

While investigating, I surfaced items that are **not** inside BEA-697's scope but should be tracked. Per the planning guidance, these are documented but not fixed here.

### Test drift on copy/heading text

- `e2e/bingo/home.spec.ts:11` expects `/joolie boolie bingo/i` but `apps/bingo/src/app/page.tsx:16-18` renders `<h1>Bingo</h1>` only. Test would fail even with failure 1 fixed.
- `e2e/bingo/home.spec.ts:56` expects `/joolie boolie platform/i` but the footer text is `Joolie Boolie — games for groups and communities` (no word "Platform").
- `e2e/trivia/home.spec.ts:18-28` expects two links: `/start trivia/i` and `/open display/i`. Current trivia home renders a single `<Link>` labeled "Play". All 4 tests that rely on those names will fail post-hydration-fix.
- `e2e/bingo/presenter.spec.ts:18` expects `/joolie boolie bingo/i` heading on `/play`. Need to check whether `/play` still renders that string.

**Recommended action:** file a follow-up "test copy alignment" issue once the implementation of BEA-697's fix lands, because the post-fix failure list will cleanly show all copy-drift mismatches.

### `authenticatedTriviaPage` fixture blast radius

The trivia fixture's `startGameViaWizard` hang affects every trivia spec that imports `../fixtures/auth` with the default setting. Grep shows that's **at least** these files:

- `e2e/trivia/display.spec.ts` ← listed in the issue
- `e2e/trivia/presenter.spec.ts`
- `e2e/trivia/dual-screen.spec.ts`
- `e2e/trivia/round-config.spec.ts`
- `e2e/trivia/round-editor.spec.ts`
- `e2e/trivia/question-editor.spec.ts`
- `e2e/trivia/setup-overlay.spec.ts` (this one uses `skipSetupDismissal: true` in some blocks, so it's partially immune)

All of these are in the "blast radius" of failure 3's fix, meaning fixing `authenticatedTriviaPage` likely unblocks most of the trivia suite at once. The implementation issue should run `pnpm test:e2e:trivia` end-to-end after the fix and report the delta.

### Service Worker / localStorage isolation concern

Playwright tests run in isolated browser contexts, so localStorage seeding via `addInitScript` is safe. However, the bingo app's service worker (Serwist) may cache a stale build if the suite is re-run without `pnpm build`. The `pnpm test:e2e` script runs a build first, so this is already handled — but the implementer should confirm `pnpm test:e2e:dev` doesn't regress if the suite relies on fresh SW registration.

### Port-config worktree detection has an interesting edge case

While investigating, I noticed `e2e/utils/port-config.ts` walks up from `process.cwd()` to find `.git`. Nested-worktree setups (e.g., `wt-BEA-696/.worktrees/wt-BEA-697/`) work but produce a deterministic-but-deep port offset. Not a blocker, just worth knowing for parallel E2E runs.

---

## Proposed implementation issue

Ready-to-create Linear issue (block BEA-697 on its parent and this issue's fixes should sit in the same PR):

---

**Title:** `fix: restore E2E baseline after standalone conversion drift (BEA-697 follow-up)`

**Team:** Joolie-Boolie (`4deac7af-714d-4231-8910-e97c8cb1cd34`)

**Priority:** High (blocks unblocking BEA-697 and restores the repo's "green main" invariant)

**Blocks:** BEA-697 (planning), and any Linear issue that depends on a green E2E baseline.

**Description:**

Execute the plan in `docs/plans/BEA-697-e2e-baseline-fix.md`. Three independent fixes landed in a single PR:

1. **Broaden `waitForHydration`** to assert on `<main>` content presence instead of `button, input, [role="button"]`. Unblocks ~28 tests across `e2e/bingo/home.spec.ts`, `e2e/trivia/home.spec.ts`, `e2e/bingo/accessibility.spec.ts`, and the Direct Access / invalid-session blocks in both `e2e/bingo/display.spec.ts` and `e2e/trivia/display.spec.ts`. File: `e2e/utils/helpers.ts`.
2. **Delete `e2e/bingo/health.spec.ts`.** The `/api/health` endpoint was removed by BEA-688 and nothing else in the repo consumes it. Two tests become zero.
3. **Seed trivia questions via `addInitScript`** in `authenticatedTriviaPage`. Add `e2e/utils/trivia-fixtures.ts` with a canned question set, wire it into `e2e/fixtures/auth.ts` so the SetupGate's Questions step is satisfied on mount, and add a guard in `e2e/utils/helpers.ts::startGameViaWizard` that fails fast with a helpful error if the seed is missing. Unblocks the Valid Session tests in `e2e/trivia/display.spec.ts` plus the rest of the trivia suite.

**Out of scope (file separately):**
- Test-copy drift (bingo heading, trivia link labels) — surfaces only after this fix lands. See "Additional findings" in the plan.
- Re-adding a public `/api/health` endpoint (not needed; no consumers).

**Acceptance criteria:**

- [ ] `pnpm test:e2e:bingo` passes locally (target: 0 failures)
- [ ] `pnpm test:e2e:trivia` passes locally (target: 0 failures; allow for copy-drift tests to be triaged into the follow-up issue, but the hydration and timeout failures in BEA-697 must all be fixed)
- [ ] `pnpm test:e2e:summary` shows the full expected test count, minus the 2 deleted health tests
- [ ] Each fix is a separate commit so they can be reverted independently if something regresses
- [ ] No changes to `apps/bingo/**` or `apps/trivia/**` (standalone conversion direction is preserved)
- [ ] `docs/plans/BEA-697-e2e-baseline-fix.md` is referenced in the PR description
- [ ] Pre-commit hooks (lint, typecheck, tests) pass without `--no-verify`

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Option B's `main :visible` selector is too loose and passes a partially-hydrated page | All real test assertions that follow `waitForHydration` still make specific UI assertions (`getByRole('heading')`, `getByRole('link')`, etc.), so the helper acts as a DOM-exists smoke check. The real test logic catches hydration races. |
| `addInitScript` seed schema drifts from `useGameStore` serialization format | Document the schema in `e2e/utils/trivia-fixtures.ts` and reference the store key constant. If `game-store.ts` changes its `persist` config, both will need updates — but this is caught immediately by running `pnpm test:e2e:trivia`. |
| Deleting `health.spec.ts` loses a latent monitoring signal | False — no external uptime check hits `/api/health`, and the first request of any E2E test exercises the same code path as a health probe would. Monitoring is not regressed. |
| Test copy drift (bingo heading / trivia labels) causes post-fix failures that aren't in this issue's scope | File immediately as a follow-up issue once the implementation PR opens. Call it out in the PR description so the reviewer expects it. |
| The trivia fixture fix also changes behavior for tests that used to pass by accident (e.g., because they only ever touched the Questions step) | Run the full `pnpm test:e2e:trivia` after the fix and reconcile any delta. The SetupGate overlay tests with `skipSetupDismissal: true` should be unaffected because they don't call `startGameViaWizard`. |
| A future change to `waitForHydration` breaks again because the implicit "must have X element" contract is rebuilt | Add a comment on the helper pointing at this plan doc and at the BEA-697 Linear issue. Name the contract explicitly ("asserts body content exists — not a specific element type"). |
