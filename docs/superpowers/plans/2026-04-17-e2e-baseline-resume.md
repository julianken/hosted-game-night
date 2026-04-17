# E2E Baseline + Deploy Pipeline — Resume Notes (2026-04-17)

Resume file for continuing the E2E baseline cleanup after a context clear. Ships the unresolved trivia wizard-step-2 race as the primary open problem, with everything else cleaned up.

## TL;DR

- ✅ Six PRs shipped: CI fix, composed hydration gate, merge guards, audio-unlock fix, presenter drift, docs checklist, deploy pipeline.
- ✅ Bingo E2E nearly green in CI (3 failures in shard 1).
- ❌ Trivia E2E still red (~118 failures in shards 2–4).
- ❌ Deploy pipeline is live but blocked from production deploys until trivia baseline is green.
- 🔍 Real remaining bug: `startGameViaWizard` → click on `[data-testid="wizard-step-2"]` does not advance the wizard from step 0 (Questions) to step 2 (Teams). Not a hydration race — survives every hydration-adjacent fix.

## Start here when you resume

1. `cd /Users/j/repos/beak-gaming-platform && git checkout main && git pull`
2. Confirm main head is `257eca39 ci: gate Vercel deploys on E2E success (#545)` or later.
3. Read the rest of this file, pick a path in **Next steps**, cut a worktree, go.

## What's on `main` now (6 merges from 2026-04-16–17)

| SHA | PR | Linear | Purpose |
|---|---|---|---|
| `91ff3204` | #550 | — | CI `include-hidden-files: true` so `.next` artifact uploads |
| `4a61644e` | #547 | BEA-729 + BEA-730 | Composed `data-play-hydrated` gate across settings+game+`_isHydrating`; defensive `merge(undefined)` guards in three stores |
| `a03461bf` | #548 | BEA-731 | Bingo `/display` audio-unlock overlay gated on `window.__E2E_TESTING__` set via `context.addInitScript`; race-tolerant `dismissAudioUnlockOverlay` with terminal `toBeHidden` |
| `5cdacc3a` | #549 | BEA-733 | Bingo presenter spec rebrand + pattern-selector + reset-modal strict-mode fixes |
| `6b2b2ff7` | #553 | BEA-734 | CLAUDE.md "Adding a new persisted zustand store" checklist |
| `257eca39` | #545 | — | Vercel deploy pipeline (push-to-main runs E2E then deploys both apps via `vercel --prebuilt`; `ignoreCommand` blocks Vercel's own auto-deploy on main) |

## Known open Linear issues

- **BEA-732** (Backlog) — Drop `page.waitForTimeout(500)` in `e2e/bingo/keyboard.spec.ts`. Deferred; re-open after baseline is green.
- **BEA-735** (Canceled) — "fixture-level hydration wait". Two attempts (PRs #551, #552) showed no CI improvement. Notes preserved on the issue.

No other E2E-related issues open.

## The real remaining bug

### Symptom

Under CI (`--workers=4`, 4 shards), `startGameViaWizard` in `e2e/utils/helpers.ts` fails with:

```
Error: [startGameViaWizard] Wizard step 2 (Teams) did not activate after click.
Most likely causes: (1) hydration race …; (2) the trivia game store has zero questions …
Underlying error: Timeout 5000ms exceeded while waiting on the predicate
```

At the moment of failure, the page snapshot shows:
- `[data-play-hydrated="true"]` **is** attached (gate is open)
- Right pane shows the Questions step content ("Fetch from Trivia API")
- `1 / 4` step-counter in the wizard nav
- "15 questions loaded" text — so `questions.length > 0` → `isStepComplete(0) === true`
- No `aria-current="step"` visible on any wizard-step button

The retry-toPass loop (`startGameViaWizard:361-394`) retries the step-2 click for 5s, expecting `aria-current="step"` on `wizard-step-2`. It never arrives. Eventually the loop times out or passes briefly then the `addTeamBtn.toBeVisible()` on line 410 times out at 5s.

### Reproduces reliably

- CI workers=4, any trivia spec using `triviaGameStarted` or direct `wizard-step-2` click (e.g., `e2e/trivia/presenter.spec.ts:150 shows ready message with team count`).
- Local workers=4 reproduces but with confounding local-env 500s on static chunks — use CI as the authoritative signal.

### Does **not** repro

- Local `--workers=1` (passes).
- Bingo (doesn't have a wizard).

### What I tried and what didn't fix it

- BEA-729 composed hydration gate (settings + game + `_isHydrating`) with poll fallback — helped bingo significantly, did not fix trivia wizard-click.
- BEA-730 defensive `merge(undefined)` guards — required for unit tests post-BEA-729, no E2E effect.
- BEA-735 fixture-level `await waitForHydration(page)` before `use(page)` — CI neutral.
- Structural skeleton approach (early-return a skeleton `<main>` pre-hydration) — made things worse; SetupGate freshly mounts after gate flips, disrupting SetupWizard's `currentStep` state. Reverted.

### Candidate causes worth chasing

1. **SetupGate's redistribute useEffect** (`apps/trivia/src/components/presenter/SetupGate.tsx` ~line 75): runs `redistributeQuestions` when questions/roundsCount/isByCategory change. If this fires after SetupWizard mounts and the engine returns a new array reference, SetupGate re-renders. SetupWizard stays mounted but React may interrupt the step-2 setState. Worth verifying idempotency under load.
2. **motion/AnimatePresence mid-transition**: `SetupWizard.tsx` wraps step content in `<AnimatePresence mode="wait" initial={false}>` with a 180ms fade. If the helper's `expect(stepButton).toHaveAttribute('aria-current', 'step', { timeout: 750 })` retry-toPass lands multiple clicks during the fade, the setState chain may be non-deterministic.
3. **React 19 concurrent render interrupting `setCurrentStep(2)`**: If a higher-priority update (from a store subscription) arrives mid-commit, React may discard the low-priority transition update. React 19's default priorities for store subscribers differ from 18.
4. **Seed not actually applied in some shards**: the seed is via `context.addInitScript` which runs on every page. Verify the store actually has 15 questions at click time — could be empty despite "15 questions loaded" rendering from a stale prop.

### Concrete debugging plan

```bash
# 1. Cut a diag worktree
git worktree add -b diag/wizard-race-r2 .worktrees/wt-diag-wizard2 origin/main
cd .worktrees/wt-diag-wizard2
cp /Users/j/repos/beak-gaming-platform/.env .
cp /Users/j/repos/beak-gaming-platform/apps/{bingo,trivia}/.env.local apps/{bingo,trivia}/
./scripts/setup-worktree-e2e.sh

# 2. Add rich diagnostic logging to the wizard click path. Log:
#    - apps/trivia/src/components/presenter/SetupWizard.tsx::goToStep
#        - entry: from, to, questions.length, currentTeams.length, isStepComplete(0), isStepComplete(1)
#        - each branch taken (backward, forward-blocked, forward-advance)
#        - setCurrentStep call
#    - apps/trivia/src/components/presenter/SetupGate.tsx::redistributeQuestions useEffect
#        - when it fires, with questions.length before/after
#    - apps/trivia/src/app/play/page.tsx::playHydrated setState
#        - when it flips true
#    - apps/trivia/src/stores/game-store.ts::merge
#        - log questions.length in, out
#        - onRehydrateStorage: log when setTimeout fires and _isHydrating clears
#
# All of these should be `console.log('[DIAG …] …', JSON.stringify({...}))`.
# Plain console.log is captured by Playwright trace under `"type":"console"`.

# 3. Build and start production servers
pnpm build
pnpm --filter @hosted-game-night/trivia start > /tmp/t.log 2>&1 &
pnpm --filter @hosted-game-night/bingo start > /tmp/b.log 2>&1 &

# 4. Run ONE failing test with trace-on
E2E_BINGO_PORT=3000 E2E_TRIVIA_PORT=3001 E2E_PORT_BASE=3000 \
  pnpm exec playwright test --project=trivia --workers=4 --retries=0 --trace=on \
    --grep "shows ready message with team count" --reporter=line

# 5. Extract and inspect the trace
mkdir -p /tmp/trace-extract
unzip -o test-results/*/trace.zip -d /tmp/trace-extract
grep -oE '"\[DIAG [^"]*"' /tmp/trace-extract/0-trace.trace
# Trace is JSONL — console entries look like:
#   {"type":"console","messageType":"log","text":"[DIAG goToStep] …","args":[...],"time":…,"pageId":…}
```

If logs show `setCurrentStep(2)` was called but `aria-current` never flipped, the React commit was interrupted — investigate concurrent-mode priorities. If `setCurrentStep(2)` was never called, `isStepComplete` returned false at click time — investigate `questions.length === 0` under load.

Once diagnosed, open a new BEA issue (NOT BEA-735 — that's poisoned by my two failed attempts) with the fix + a regression test.

## Deploy pipeline — what's live, what to watch

`push` to `main` now triggers `.github/workflows/e2e.yml`:

1. **Build Apps** → uploads `next-build-artifacts` (with `include-hidden-files: true` from #550).
2. **E2E — Shard 1–4** → downloads artifact, runs sharded Playwright.
3. **E2E Gate** (`needs: e2e`) → fails if any shard failed.
4. **Deploy** matrix over bingo+trivia → only runs if `github.event_name == 'push'` AND `github.ref == 'refs/heads/main'` AND `needs: e2e-summary` succeeded. Calls `vercel pull + build --prod + deploy --prebuilt --prod` for each app.

Because the baseline is currently red, the deploy job will **skip** on every push to main. That's the intended safety until you fix the wizard race.

Once you fix it:
- First green push-to-main run: deploy job fires, pushes both apps to production.
- Verify `x-vercel-cache` headers on `host-bingo.com` and `host-trivia.com` match the merge SHA.
- Verify Vercel dashboard shows exactly **one** production deploy per merge (the GH Actions one) — the `ignoreCommand` in each app's `vercel.json` blocks Vercel's own webhook-triggered build. If you see two, the escaped-quotes in `ignoreCommand` are wrong.

## Rollback cheat sheet

- Any single cluster regression: `gh pr revert <number>` — each cluster was squash-merged as one commit.
- Deploy pipeline itself misbehaving: promote previous production in Vercel dashboard, then revert PR #545. Reverting removes `ignoreCommand`; Vercel's native auto-deploy resumes on the next main push.
- CI workflow loop (shouldn't happen): `gh api -X PUT repos/julianken/hosted-game-night/actions/permissions -f enabled=false`.

## Linear reference

- https://linear.app/beak-gaming/issue/BEA-729 — hydration gate (Done)
- https://linear.app/beak-gaming/issue/BEA-730 — merge guards (Done, folded into 729)
- https://linear.app/beak-gaming/issue/BEA-731 — audio-unlock (Done)
- https://linear.app/beak-gaming/issue/BEA-733 — presenter drift (Done)
- https://linear.app/beak-gaming/issue/BEA-734 — hydration checklist (Done)
- https://linear.app/beak-gaming/issue/BEA-732 — keyboard 500ms (Backlog, deferred)
- https://linear.app/beak-gaming/issue/BEA-735 — fixture hydration wait (Canceled; do NOT re-use for the real wizard race — open a new issue)

## Files worth knowing about when you resume

- `e2e/utils/helpers.ts` — `waitForHydration` (line 20), `startGameViaWizard` (line ~361), `dismissAudioUnlockOverlay` (line ~314)
- `e2e/fixtures/game.ts` — `bingoPage`, `triviaPage`, `triviaPageWithQuestions`, `triviaGameStarted` fixtures
- `e2e/utils/e2e-flags.ts` — `applyE2ERuntimeFlags` (new, used by fixtures to inject `window.__E2E_TESTING__`)
- `apps/trivia/src/app/play/page.tsx` — `playHydrated` gate composition (top of component)
- `apps/trivia/src/components/presenter/SetupGate.tsx` — calls `redistributeQuestions` useEffect
- `apps/trivia/src/components/presenter/SetupWizard.tsx` — `goToStep` (line ~111), `isStepComplete`, `AnimatePresence` wrap
- `apps/trivia/src/stores/game-store.ts` — `persist()` config, `merge`, `onRehydrateStorage`
- `.github/workflows/e2e.yml` — full pipeline (build → e2e × 4 → gate → deploy matrix)
- `apps/{bingo,trivia}/vercel.json` — each has `ignoreCommand` suppressing main auto-deploy

## Local-environment caveat

Under local `--workers=4` on an M-series Mac, a single `next start` chokes on concurrent static-asset requests — I captured a Playwright trace with **35 HTTP 500 errors on `.next/static/chunks/*.js`** plus MIME-type failures on CSS. Tests fail because JS handlers never attach, not because of a React race. This does **not** reproduce in CI (each shard has its own dedicated server). **Trust CI, not local `--workers=4`** when measuring baseline improvement.

## How to keep the deploy gate honest

If the wizard fix takes a while, consider:
1. Temporarily relaxing the `E2E Gate`'s exit criterion to "pass if N-1 shards green" so the pipeline stops acting as a full regression.
2. Adding a `@critical` tag filter so the gate only blocks on critical failures.
3. Moving flaky specs behind `test.skip('@flaky')` with Linear issues linking back.

None of these are free lunches — they trade coverage for unblock. Do them only with intent.

---

When you finish the wizard fix, delete this file (or archive it under `docs/superpowers/plans/archive/`) and close out the related Linear issues.
