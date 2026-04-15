# Vercel Deploy Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-enable GitHub Actions and gate Vercel production deploys on successful E2E tests, so bad code never reaches `host-bingo.com` or `host-trivia.com`.

**Architecture:** The PR workflow builds once, runs E2E across 4 parallel shards, and gates merges. On merge to `main`, the same E2E workflow re-runs against the merge commit, then deploys both apps to Vercel production using `vercel --prebuilt` (build happens in GitHub Actions, only artifacts ship to Vercel). Vercel's own auto-deploy for `main` is suppressed via `ignoreCommand` in each app's `vercel.json`, while preview deploys on PR branches continue working normally. The nightly workflow is slimmed to build/lint/typecheck/unit-test only.

**Tech Stack:** GitHub Actions (ubuntu-latest, Node 24, pnpm 9.15.0), Playwright 1.57, Vercel CLI (`npx vercel`), Turborepo 2.3, Next.js 16.

---

## Context the implementing engineer needs

- **Repo**: `julianken/hosted-game-night` (public; GitHub Actions is free + unlimited on public repos for standard runners)
- **Actions is currently disabled at the repo level** — verified via `gh api repos/julianken/hosted-game-night/actions/permissions` returning `{"enabled":false}`
- **Two Vercel projects, same team**:
  - `bingo`: `prj_eZjT2Royhj7xz5syh5LQ0v62MkZ1`, root `apps/bingo`, domain `host-bingo.com`
  - `trivia`: `prj_u8cTEH2rSdfknBahBwAMDEmDklZB`, root `apps/trivia`, domain `host-trivia.com`
  - Team: `team_bVYUjB0ZgUT5velRCWNIglgf`
- **Current behavior**: Vercel's GitHub integration auto-deploys every push to `main` in parallel with (not after) any CI. We want: E2E passes → then deploy.
- **E2E infrastructure already works**: `playwright.config.ts` has an `isCI`-gated `webServer` block that boots `pnpm --filter @hosted-game-night/{bingo,trivia} start` and wires sharding from `process.env.SHARD`. The existing `e2e.yml` build+shard flow is functionally correct, it just doesn't trigger on `push` and doesn't deploy.
- **Issue tracker**: Linear (BEA-###), NOT GitHub Issues — the current `nightly.yml` incorrectly creates GitHub issues on failure. We'll remove that step entirely and rely on Actions' built-in failure email (simpler than integrating Linear API and matches the "don't add things we don't need yet" principle).
- **Pre-commit hooks**: Husky runs lint/typecheck/test:run on changed packages. **NEVER use `--no-verify`** — if hooks fail, fix the underlying issue.
- **Playwright MCP manual testing still exists** — this plan does not replace it, only adds CI.

## File Structure

Files created or modified:

- **Modify** `.github/workflows/e2e.yml` — add `push` trigger, fix concurrency key for push events, add deploy job (matrix over bingo/trivia)
- **Modify** `.github/workflows/nightly.yml` — remove dead Playwright setup (4 steps), remove GitHub-issue creation step
- **Modify** `apps/bingo/vercel.json` — add `ignoreCommand` to suppress Vercel auto-deploys on `main`
- **Modify** `apps/trivia/vercel.json` — same
- **No new files**

Out of scope (document in PR but don't implement):
- Migrating Vercel config to `vercel.ts` (Vercel's new recommended format) — unrelated refactor
- Linear API integration for nightly failures — can be added later if Actions email is insufficient
- Rollback automation on failed deploys — Vercel's own dashboard rollback is fine for now

---

## Task 1: Add Vercel repo secrets

**Files:**
- No files touched. Secrets live in GitHub repo settings.

**Context:** The deploy job in Task 6 needs these four secrets. They must exist before re-enabling Actions in Task 8, otherwise the first post-merge run fails.

- [ ] **Step 1: Create a Vercel access token**

Open https://vercel.com/account/tokens in a browser. Click "Create Token". Name it `hosted-game-night-ci`. Scope: "Full Account" (Vercel doesn't offer per-project tokens for deploy). Expiration: "No Expiration" (or 1 year if you prefer rotation). Copy the token — it's shown only once.

- [ ] **Step 2: Set VERCEL_TOKEN**

Run:
```bash
gh secret set VERCEL_TOKEN --repo julianken/hosted-game-night --body "<paste-token-here>"
```
Expected output: `✓ Set Actions secret VERCEL_TOKEN for julianken/hosted-game-night`

- [ ] **Step 3: Set VERCEL_ORG_ID**

Run:
```bash
gh secret set VERCEL_ORG_ID --repo julianken/hosted-game-night --body "team_bVYUjB0ZgUT5velRCWNIglgf"
```
Expected output: `✓ Set Actions secret VERCEL_ORG_ID for julianken/hosted-game-night`

- [ ] **Step 4: Set VERCEL_BINGO_PROJECT_ID**

Run:
```bash
gh secret set VERCEL_BINGO_PROJECT_ID --repo julianken/hosted-game-night --body "prj_eZjT2Royhj7xz5syh5LQ0v62MkZ1"
```
Expected output: `✓ Set Actions secret VERCEL_BINGO_PROJECT_ID for julianken/hosted-game-night`

- [ ] **Step 5: Set VERCEL_TRIVIA_PROJECT_ID**

Run:
```bash
gh secret set VERCEL_TRIVIA_PROJECT_ID --repo julianken/hosted-game-night --body "prj_u8cTEH2rSdfknBahBwAMDEmDklZB"
```
Expected output: `✓ Set Actions secret VERCEL_TRIVIA_PROJECT_ID for julianken/hosted-game-night`

- [ ] **Step 6: Verify all four secrets exist**

Run:
```bash
gh secret list --repo julianken/hosted-game-night
```
Expected: output includes `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_BINGO_PROJECT_ID`, `VERCEL_TRIVIA_PROJECT_ID` (among any pre-existing secrets like `TURBO_TOKEN`).

No commit — this task touches no files.

---

## Task 2: Create feature branch and worktree

**Files:**
- No repo files touched yet.

**Context:** All subsequent file changes live on a single branch so they ship as one atomic PR. The PR itself will exercise the new `e2e.yml` once Actions is re-enabled (Task 8), so the order is: branch → edit files → enable Actions → push → PR.

- [ ] **Step 1: Create worktree**

From the main repo checkout:
```bash
git fetch origin main
./scripts/setup-worktree-e2e.sh feat/vercel-deploy-pipeline
```
Expected: new worktree at `.worktrees/wt-feat-vercel-deploy-pipeline` (path format per project convention in memory). If the script doesn't accept a branch name, fall back to:
```bash
git worktree add -b feat/vercel-deploy-pipeline .worktrees/wt-vercel-deploy-pipeline origin/main
```

- [ ] **Step 2: Move into the worktree**

```bash
cd .worktrees/wt-vercel-deploy-pipeline
```

- [ ] **Step 3: Install dependencies**

```bash
pnpm install --frozen-lockfile
```
Expected: clean install, no lockfile mutations.

No commit.

---

## Task 3: Add `ignoreCommand` to `apps/bingo/vercel.json`

**Files:**
- Modify: `apps/bingo/vercel.json`

**Context:** Vercel's `ignoreCommand` is evaluated in each project when Vercel's GitHub integration receives a webhook. Exit code 0 = skip build; exit code 1 = proceed. The command `[[ "$VERCEL_GIT_COMMIT_REF" == "main" ]]` exits 0 on main (skip) and 1 on any other branch (build preview). This replaces Vercel's default monorepo change detection — that's acceptable because we want deploys gated on E2E, not on file-change detection.

- [ ] **Step 1: Read current file to see where to insert**

Run:
```bash
cat apps/bingo/vercel.json
```
Note the top-level key order. The `ignoreCommand` goes at the top level alongside `buildCommand`, `outputDirectory`, etc.

- [ ] **Step 2: Add `ignoreCommand` key**

Edit `apps/bingo/vercel.json`. Insert this line near the top of the top-level object (after `"framework": "nextjs"` is a natural spot):

```json
"ignoreCommand": "bash -c '[[ \"$VERCEL_GIT_COMMIT_REF\" == \"main\" ]]'",
```

The full top-of-file should look like:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "framework": "nextjs",
  "ignoreCommand": "bash -c '[[ \"$VERCEL_GIT_COMMIT_REF\" == \"main\" ]]'",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm turbo build --filter=@hosted-game-night/bingo...",
  ...
}
```

- [ ] **Step 3: Validate JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('apps/bingo/vercel.json','utf8')); console.log('ok')"
```
Expected output: `ok`

- [ ] **Step 4: Commit**

```bash
git add apps/bingo/vercel.json
git commit -m "ci(bingo): suppress Vercel auto-deploy on main via ignoreCommand

E2E pipeline will deploy to production after tests pass.
Preview deploys on feature branches are unaffected."
```

---

## Task 4: Add `ignoreCommand` to `apps/trivia/vercel.json`

**Files:**
- Modify: `apps/trivia/vercel.json`

**Context:** Identical change to Task 3, different file. Same rationale.

- [ ] **Step 1: Edit file**

Add the same `ignoreCommand` line to `apps/trivia/vercel.json`, in the same position (after `"framework": "nextjs"` or equivalent top-level anchor — match the file's existing style).

Line to add:
```json
"ignoreCommand": "bash -c '[[ \"$VERCEL_GIT_COMMIT_REF\" == \"main\" ]]'",
```

- [ ] **Step 2: Validate JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('apps/trivia/vercel.json','utf8')); console.log('ok')"
```
Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add apps/trivia/vercel.json
git commit -m "ci(trivia): suppress Vercel auto-deploy on main via ignoreCommand

E2E pipeline will deploy to production after tests pass.
Preview deploys on feature branches are unaffected."
```

---

## Task 5: Clean up `nightly.yml`

**Files:**
- Modify: `.github/workflows/nightly.yml`

**Context:** The current nightly installs Playwright browsers and system deps (~60–120s) but never runs Playwright tests — dead weight. It also creates GitHub issues on failure, but this project tracks work in Linear. We remove both pieces. Actions emails the repo owner on workflow failure by default, which is sufficient for a nightly canary.

- [ ] **Step 1: Replace file contents**

Overwrite `.github/workflows/nightly.yml` with this exact content:

```yaml
name: Nightly Build

on:
  schedule:
    # Daily at 8am UTC (midnight PST / 3am EST)
    - cron: '0 8 * * *'
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  nightly:
    name: Nightly Build
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          ref: main

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.15.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Setup Turborepo cache
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build all apps
        run: pnpm build

      - name: Run linting
        run: pnpm lint

      - name: Run type checking
        run: pnpm typecheck

      - name: Run tests
        run: pnpm test:run

      - name: Write success summary
        if: success()
        run: |
          echo "## Nightly Build - Success" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "All checks passed on \`main\` at $(date -u '+%Y-%m-%d %H:%M UTC')." >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Step | Status |" >> $GITHUB_STEP_SUMMARY
          echo "|------|--------|" >> $GITHUB_STEP_SUMMARY
          echo "| Build | Passed |" >> $GITHUB_STEP_SUMMARY
          echo "| Lint | Passed |" >> $GITHUB_STEP_SUMMARY
          echo "| Typecheck | Passed |" >> $GITHUB_STEP_SUMMARY
          echo "| Tests | Passed |" >> $GITHUB_STEP_SUMMARY
```

Changes from previous file: Node bumped 22→24 (matches Vercel project setting), removed three Playwright steps (cache, install, install-deps), removed the `Create GitHub issue on failure` step.

- [ ] **Step 2: Validate YAML syntax**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/nightly.yml')); print('ok')"
```
Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/nightly.yml
git commit -m "ci(nightly): drop Playwright setup and GitHub-issue creation

Nightly runs build/lint/typecheck/unit tests only — Playwright install
steps were dead weight. Failures will surface via the built-in workflow
failure email rather than a GitHub issue, since this project tracks
work in Linear."
```

---

## Task 6: Rewrite `e2e.yml` with push trigger and deploy job

**Files:**
- Modify: `.github/workflows/e2e.yml`

**Context:** This is the biggest change. We're adding a `push` trigger to `main`, fixing the concurrency group so push events don't collide, bumping Node to 24, and appending a `deploy` job that runs `vercel pull`, `vercel build --prod`, `vercel deploy --prebuilt --prod` for each app in a matrix. The deploy job only runs on push to main (not on PR) and only if `e2e-summary` succeeded.

**Why `vercel --prebuilt`**: the build happens inside GitHub Actions (free on public repos), and only the prebuilt output uploads to Vercel. This avoids double-building and saves Vercel build minutes.

**Why a matrix for deploy**: bingo and trivia are independent Vercel projects. Running them in parallel shaves ~1 min off the post-E2E wait.

- [ ] **Step 1: Replace file contents**

Overwrite `.github/workflows/e2e.yml` with this exact content:

```yaml
name: E2E Tests

on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main

concurrency:
  group: e2e-${{ github.event.pull_request.number || github.sha }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  build:
    name: Build Apps
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.15.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Get pnpm store directory
        shell: bash
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Cache pnpm store
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build all apps
        run: pnpm build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: next-build-artifacts
          path: |
            apps/bingo/.next
            apps/trivia/.next
          retention-days: 1

  e2e:
    name: E2E — Shard ${{ matrix.shard }}
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: build

    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.15.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Get pnpm store directory
        shell: bash
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Restore pnpm store cache
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Cache Playwright browsers
        id: playwright-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-playwright-

      - name: Install Playwright browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: pnpm playwright install chromium --with-deps

      - name: Install Playwright system dependencies only (cache hit)
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: pnpm playwright install-deps chromium

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: next-build-artifacts
          path: apps

      - name: Verify build artifact structure
        shell: bash
        run: |
          for app in bingo trivia; do
            if [ ! -d "apps/${app}/.next" ]; then
              echo "ERROR: apps/${app}/.next not found after artifact download"
              exit 1
            fi
          done
          echo "Build artifacts verified."

      - name: Run E2E tests (shard ${{ matrix.shard }}/4)
        run: |
          pnpm playwright test \
            --project=bingo \
            --project=trivia
        env:
          CI: true
          SHARD: ${{ matrix.shard }}

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-shard-${{ matrix.shard }}
          path: playwright-report/
          retention-days: 7

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results-shard-${{ matrix.shard }}
          path: test-results/
          retention-days: 7

  e2e-summary:
    name: E2E Gate
    runs-on: ubuntu-latest
    needs: e2e
    if: always()

    steps:
      - name: Check E2E results
        env:
          E2E_RESULT: ${{ needs.e2e.result }}
        run: |
          if [ "$E2E_RESULT" != "success" ]; then
            echo "E2E tests failed or were cancelled. PR cannot be merged."
            exit 1
          fi
          echo "All E2E shards passed."

  deploy:
    name: Deploy ${{ matrix.app }} to Vercel Production
    runs-on: ubuntu-latest
    needs: e2e-summary
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    timeout-minutes: 15

    strategy:
      fail-fast: false
      matrix:
        include:
          - app: bingo
            project_id_secret: VERCEL_BINGO_PROJECT_ID
          - app: trivia
            project_id_secret: VERCEL_TRIVIA_PROJECT_ID

    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets[matrix.project_id_secret] }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.15.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Pull Vercel environment
        run: npx vercel@latest pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: apps/${{ matrix.app }}

      - name: Build with Vercel
        run: npx vercel@latest build --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: apps/${{ matrix.app }}

      - name: Deploy prebuilt output to production
        run: npx vercel@latest deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: apps/${{ matrix.app }}
```

Key changes from the previous file:
1. Added `push: branches: [main]` trigger
2. Concurrency group now uses `github.sha` for push events so merges don't cancel each other; `cancel-in-progress` is scoped to PR events only
3. Node bumped 22→24 everywhere for consistency with Vercel project settings
4. New `deploy` job gated on `github.event_name == 'push' && github.ref == 'refs/heads/main'`
5. Deploy matrix runs bingo and trivia in parallel, each with its own Vercel project ID
6. `working-directory` per step is the cleanest way to run Vercel CLI from inside an app dir without mutating the global state

- [ ] **Step 2: Validate YAML syntax**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/e2e.yml')); print('ok')"
```
Expected output: `ok`

- [ ] **Step 3: Validate with actionlint if available**

Run:
```bash
which actionlint && actionlint .github/workflows/e2e.yml .github/workflows/nightly.yml || echo "actionlint not installed, skipping — GitHub will surface errors on push"
```
Expected: either clean actionlint output or the "not installed" message. Do not fail the step if actionlint isn't present — it's optional local tooling.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/e2e.yml
git commit -m "ci(e2e): run on merge to main + deploy to Vercel after E2E passes

- Add push trigger for main so E2E re-runs on the merge commit
- Fix concurrency group so pushes use sha (avoids cross-merge cancels)
- Bump Node to 24 to match Vercel project runtime
- Add deploy job: vercel pull + build + deploy --prebuilt --prod
  for bingo and trivia in parallel, gated on e2e-summary success"
```

---

## Task 7: Push branch and open PR

**Files:**
- None edited in this task.

**Context:** The PR will exercise the new `e2e.yml` against itself (the `pull_request` trigger uses the workflow file from the PR branch). But Actions is still disabled — we fix that in Task 8 before expecting anything to run.

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/vercel-deploy-pipeline
```
Expected: branch created on origin.

- [ ] **Step 2: Open PR**

Run:
```bash
gh pr create \
  --repo julianken/hosted-game-night \
  --base main \
  --head feat/vercel-deploy-pipeline \
  --title "ci: gate Vercel deploys on E2E success" \
  --body "$(cat <<'EOF'
## Summary

- Re-enables GitHub Actions to run E2E on every PR and every merge to main
- Adds deploy job to push both Vercel projects to production after E2E passes
- Suppresses Vercel auto-deploy for main via ignoreCommand (preserves PR previews)
- Cleans up nightly.yml (removes dead Playwright install, removes GH-issue creation)

## Five-Level Explanation

**Kid**: The robots will test the game before putting it online.

**Teenager**: Instead of letting Vercel publish the site the instant we merge, we now require a full Playwright test run to pass first. If anything is broken, the live site stays on the last good version.

**Engineer**: Push to main triggers e2e.yml (build → 4-shard Playwright → gate). The gate's success unblocks a matrix deploy job that runs \`vercel pull + build --prod + deploy --prebuilt --prod\` for each app in parallel using GH Actions minutes (free on public repo). Vercel's native main auto-deploy is suppressed via ignoreCommand in each app's vercel.json; preview deploys on PR branches are unchanged.

**Architect**: This inverts the deployment control plane from "Vercel decides when to deploy based on git webhooks" to "GitHub Actions decides when to deploy based on a test gate." Cost: deploys gain E2E latency (~8-12 min post-merge instead of ~90 s). Benefit: bad code cannot reach host-bingo.com or host-trivia.com. Rollback path: revert the PR; Vercel's ignoreCommand goes away with the vercel.json revert and main pushes auto-deploy again.

**PhD**: The pipeline now forms a two-phase commit over the deployment state machine where phase one (E2E) is non-idempotent (tests have side effects in ephemeral CI state) and phase two (Vercel prebuilt deploy) is idempotent over {project, commit SHA}. Failure modes: (a) E2E flake blocks deploys — mitigated by Playwright's \`retries: 2\` on CI; (b) VERCEL_TOKEN expiry — detectable via deploy job's pull step failing; (c) partial deploy if one app succeeds and the other fails — matrix.fail-fast is false, surfaced in the UI but not auto-rolled-back.

## Test plan

- [ ] Actions re-enabled via \`gh api -X PUT\` before merge
- [ ] PR run: all 4 shards green, deploy job skipped (correct — we're on PR, not push)
- [ ] After merge: push-triggered run completes E2E and runs deploy for both apps
- [ ] Verify host-bingo.com and host-trivia.com serve the new commit SHA
- [ ] Vercel dashboard shows a new production deployment for each project
- [ ] Open a throwaway follow-up PR, confirm preview deploy still works (ignoreCommand doesn't affect previews)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: PR URL printed. Save it for Task 9.

No commit.

---

## Task 8: Re-enable GitHub Actions

**Files:**
- None. This is a repo-level API call.

**Context:** This is the point of no return for the automation. Until this flips, nothing we just wrote runs. Once enabled, the open PR from Task 7 should start its first E2E run within a few seconds.

- [ ] **Step 1: Enable Actions at repo level**

Run:
```bash
gh api -X PUT repos/julianken/hosted-game-night/actions/permissions \
  -f enabled=true \
  -f allowed_actions=all
```
Expected: empty 204 response, no error.

- [ ] **Step 2: Verify**

Run:
```bash
gh api repos/julianken/hosted-game-night/actions/permissions
```
Expected output (JSON): `{"enabled":true,"allowed_actions":"all","sha_pinning_required":false}` or similar with `enabled: true`.

- [ ] **Step 3: Watch for the first run**

Run:
```bash
sleep 15 && gh run list --repo julianken/hosted-game-night --limit 5
```
Expected: a new run for `E2E Tests` on the PR branch, status `in_progress` or `queued`.

No commit.

---

## Task 9: Verify PR run passes

**Files:**
- None.

**Context:** The PR must pass E2E before we merge. If it doesn't, do not proceed to Task 10 — instead, investigate and fix on the same branch. The deploy job should be **skipped** on this run (because it only fires on `push` events), which is the expected behavior.

- [ ] **Step 1: Wait for run and stream status**

Run:
```bash
gh run watch --repo julianken/hosted-game-night --exit-status
```
This blocks until the most recent run completes. Exit code 0 = all jobs succeeded or correctly skipped.

- [ ] **Step 2: Verify job list**

Run:
```bash
gh run list --repo julianken/hosted-game-night --branch feat/vercel-deploy-pipeline --limit 1 --json databaseId --jq '.[0].databaseId' | xargs -I {} gh run view {} --repo julianken/hosted-game-night
```
Expected: `build` ✓, `e2e (shard 1–4)` all ✓, `e2e-summary` ✓, `deploy (bingo)` and `deploy (trivia)` both **skipped** (not failed — skipped). If deploy shows as `failed`, the `if:` guard is wrong.

- [ ] **Step 3: If anything fails, fix in place**

If a shard is flaky, re-run failed jobs:
```bash
gh run rerun --repo julianken/hosted-game-night --failed <run-id>
```
If the failure is genuine (config bug, typo, YAML issue), edit files, commit on the same branch, push. The PR will auto-trigger a new run.

**Do not proceed to Task 10 until this step shows a clean run.**

No commit.

---

## Task 10: Merge PR and verify production deploy

**Files:**
- None.

**Context:** Merging is the real test. On merge, a new `e2e.yml` run kicks off against the merge commit, this time as a `push` event, so the `deploy` job actually runs. Both Vercel projects should receive a new production deployment from the prebuilt output, and the `ignoreCommand` we added should have suppressed Vercel's own webhook-triggered build.

- [ ] **Step 1: Merge PR**

Run:
```bash
gh pr merge --repo julianken/hosted-game-night --squash --delete-branch <pr-number>
```
Expected: PR merged, branch deleted.

- [ ] **Step 2: Watch the main-push run**

```bash
sleep 10 && gh run watch --repo julianken/hosted-game-night --exit-status
```
Expected: `build` → `e2e (×4)` → `e2e-summary` → `deploy (bingo)` + `deploy (trivia)` all green. This run takes approximately 10–14 minutes end-to-end.

- [ ] **Step 3: Verify Vercel received the deploys**

Run:
```bash
npx vercel@latest ls --token=<your-local-vercel-token> bingo | head -5
npx vercel@latest ls --token=<your-local-vercel-token> trivia | head -5
```
Expected: the most recent deployment for each project shows a timestamp within the last few minutes and a commit SHA matching `git rev-parse main`.

Alternate verification via browser:
```bash
curl -sI https://host-bingo.com | grep -i 'x-vercel'
curl -sI https://host-trivia.com | grep -i 'x-vercel'
```
Expected: `x-vercel-cache` and `x-vercel-id` headers present, confirming Vercel is serving.

- [ ] **Step 4: Verify Vercel did NOT also auto-deploy**

Open https://vercel.com/jimpers-projects/bingo/deployments and https://vercel.com/jimpers-projects/trivia/deployments in a browser. For the merge commit SHA, there should be exactly **one** production deployment per project (the one from GitHub Actions), not two. If there are two, the `ignoreCommand` isn't working and Vercel is still auto-deploying — investigate the escaped-quotes in `vercel.json` (the single-quote wrapping around the bash `-c` argument is fragile).

- [ ] **Step 5: Smoke test both apps**

In a browser:
- Open https://host-bingo.com — verify the home page loads and shows the current brand/theme
- Open https://host-trivia.com — same check
- Both should be reachable, no 500s, no CSP console errors

- [ ] **Step 6: Confirm nightly is scheduled**

Run:
```bash
gh workflow view --repo julianken/hosted-game-night nightly.yml
```
Expected: nightly workflow listed as `active`, cron `0 8 * * *`. No manual trigger needed — it'll fire at the next 08:00 UTC.

No commit. Pipeline is live.

---

## Rollback procedure

If the deploy job breaks production after merging:

1. **Immediate rollback via Vercel dashboard**: promote the previous production deployment on each affected project. This is faster than reverting code.
2. **Then revert the PR**: `gh pr revert <pr-number> --repo julianken/hosted-game-night`. Reverting removes the `ignoreCommand` from both `vercel.json` files, which restores Vercel's native auto-deploy on main. Merge the revert PR, and Vercel will deploy the revert commit automatically.
3. **If Actions itself is misbehaving**: disable Actions again with `gh api -X PUT repos/julianken/hosted-game-night/actions/permissions -f enabled=false`. This stops all workflow runs but does not touch Vercel.

---

## Self-review checklist (performed during plan authoring)

1. **Spec coverage**: Every requirement from the conversation is mapped to a task — push trigger (Task 6), concurrency fix (Task 6), deploy job (Task 6), vercel.json ignoreCommand × 2 (Tasks 3/4), nightly cleanup (Task 5), re-enable Actions (Task 8), verification (Tasks 9/10).
2. **Placeholder scan**: No TBDs, no "implement later", no "similar to Task N" without inlined code. Every workflow file is shown in full.
3. **Type consistency**: Project IDs match `apps/{bingo,trivia}/.vercel/project.json` verified earlier in the conversation. Team ID `team_bVYUjB0ZgUT5velRCWNIglgf` consistent in Task 1 and Task 6's matrix. Node 24 used consistently across both workflow files.
4. **Decision locked**: Picked "remove GH issue step, rely on Actions email" over Linear API integration — simpler, matches YAGNI. Documented as out-of-scope so it can be added later if needed.
5. **Ordering safety**: Secrets before Actions re-enable. File changes before PR push. PR passes before merge. No window exists where main pushes neither auto-deploy nor CI-deploy.
