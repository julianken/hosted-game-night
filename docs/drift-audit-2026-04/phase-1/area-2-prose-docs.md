# Investigation Area 2: Prose Documentation Accuracy

**Investigator:** Phase 1 — Area 2
**Target:** Prose docs at HEAD `a7369f16` excluding `docs/archive/*`, `docs/CLAUDE.md` (Area 4), `docs/MANUAL_TEST_PLAN.md` (Area 3), and prior-funnel artifacts (`docs/*-analysis/`, `docs/*-decisions/`, `docs/*-plan/`, `docs/*-audit/`, `docs/*-ux/`, `docs/*-impl/`, `docs/*-removal/`, `docs/*-flag/`).
**In-scope file set (tracked):**
- `README.md` (root)
- `docs/ARCHITECTURE.md`
- `docs/E2E_TESTING_GUIDE.md`
- `docs/ALERTING_SETUP.md`
- `docs/security-log.md`
- `docs/adr/README.md`, `docs/adr/ADR-001-*.md`, `docs/adr/ADR-002-*.md`, `docs/adr/ADR-007-*.md`
- `docs/plans/BEA-697-e2e-baseline-fix.md`
- `docs/templates/APP_README_TEMPLATE.md`, `docs/templates/PACKAGE_README_TEMPLATE.md`, `docs/templates/ROOT_README_TEMPLATE.md`
- `apps/bingo/README.md`, `apps/trivia/README.md` (app-level READMEs)

Secondary prose README files I spot-checked (for completeness): `apps/*/src/README.md`, `apps/*/src/components/README.md`, `apps/*/src/hooks/README.md`, `apps/*/src/lib/README.md`, `apps/*/src/stores/README.md`, `apps/*/src/test/README.md`, `apps/*/public/audio/sfx/README.md` — these are in the Area 4 agent-context scope per the Phase 0 brief (they're CLAUDE.md siblings for directory-level context), so I did not open them here.

## Summary

The rebrand wave (BEA-718 code / BEA-719 docs) and the post-standalone cleanup sprint (BEA-702) touched most of the in-scope doc set — root `README.md`, `docs/ARCHITECTURE.md`, `docs/ALERTING_SETUP.md`, `docs/security-log.md`, the three `docs/templates/*`, and both ADR-001 / ADR-002 headers are **clean of `joolie-boolie` / `Joolie Boolie` / `beak-gaming` strings** and accurately describe the current 2-app standalone architecture.

The drift that remains is concentrated in three places and one category:

1. **`docs/E2E_TESTING_GUIDE.md` is the highest-drift file in the in-scope set.** It still describes an authenticated E2E flow (`authenticatedXyzPage`, `waitForRoomSetupModal`, "session recovery" modal, a RoomStatus / GameSelector / PatternSelector / BallDisplay `data-testid` table) that no longer exists in `e2e/`. It references `room-setup.spec.ts` paths that aren't tracked. Its "Missing environment variables" troubleshooting steps describe a global-setup failure mode that the current `e2e/global-setup.ts` never produces. (~30% stale, ~70% accurate.)
2. **`apps/trivia/README.md`** still lists a `Question Sets` feature and a `/question-sets` route that were removed by PR #517 (commit `a4be900e`), plus documents `NEXT_PUBLIC_FEATURE_QUESTION_SETS` and `NEXT_PUBLIC_APP_URL` env vars with zero source consumers at HEAD. BEA-719 rebranded this file but did not reconcile the feature-removal.
3. **`docs/templates/APP_README_TEMPLATE.md` and `PACKAGE_README_TEMPLATE.md`** still ship with Supabase as the default "tech stack" example and `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SESSION_TOKEN_SECRET` as the canonical required-env-var example table. BEA-719 updated the brand/package-scope strings but left the example content describing the removed infra. Any future app or package scaffolded from this template would be given auth-era env-var guidance.
4. **Category — dead-link / stale-path drift in ADRs.** ADR-001 and ADR-002 explicitly reference `e2e/fixtures/auth.ts` (does not exist at HEAD), `packages/auth/src/game-middleware.ts` (does not exist), `E2E_JWT_SECRET` as a consumer (no source consumer exists), and the `bingoPage`/`triviaPage`/`triviaGameStarted` fixture refactor (BEA-714) is not reflected. The ADRs are marked Superseded/Rejected respectively and BEA-702 added header banners to ADR-002 and ADR-007 — so this is mostly intentional historical preservation. The outlier is **ADR-001 (Accepted)** which still makes the obsolete `e2e/fixtures/auth.ts` claim in a note at the bottom (line 53).

The prior audit's **URGENT** bucket (U3 Faro URL fix) and observability Quick Wins items (nightly.yml stub env block, bingo-mobile Playwright project reference) are not in my scope — they're Area 5 config drift. I checked the prior-audit Section H doc-recommendations: **M2 (doc cleanup sprint) and L1 (cheap hygiene bundle) both landed as BEA-702.** ALERTING_SETUP.md was patched (probe URLs now point at `host-bingo.com` / `host-trivia.com` with `/api/health` endpoints, which now exist — BEA-698 re-added them). APP_STRUCTURE.md and MIDDLEWARE_PATTERNS.md were deleted. ADR-002 and ADR-007 are marked Superseded/Rejected. **One recommendation is still partially open: M2's note about the `packages/testing/README.md` fix and the ADR-001 E2E fixture note — both still claim `e2e/fixtures/auth.ts` patterns that don't exist at HEAD.**

## Key Findings

### Finding 2.1 — `docs/E2E_TESTING_GUIDE.md` references removed E2E fixture API (`authenticatedXyzPage`, `waitForRoomSetupModal`)

**Theme:** Doc describes pre-BEA-714 fixture architecture
**Confidence:** high
**Provenance:** `[tracked-HEAD]` (both sides)
**Evidence:**
- `docs/E2E_TESTING_GUIDE.md:192` table row: `` | `waitForRoomSetupModal` from `utils/helpers` | Waiting for modal after session recovery | ``
- `e2e/utils/helpers.ts:20-440` contains 19 exports — `waitForHydration`, `waitForText`, `waitForSyncConnection`, etc. — **but NOT `waitForRoomSetupModal`**. Verified via `grep -n "^export" e2e/utils/helpers.ts`.
- `docs/E2E_TESTING_GUIDE.md:186-193` `Key Imports` table also predates the BEA-714 fixture rename. Current `e2e/fixtures/game.ts:30-46` exposes `bingoPage`, `triviaPage`, `triviaPageWithQuestions`, `triviaGameStarted` — the guide's neighbouring prose (lines 144-184) DOES describe these correctly, so the table at lines 186-193 is just a stale residue that the BEA-714 refactor missed.

**Impact:** An AI agent reading this table as authoritative would try to import a non-existent symbol from `e2e/utils/helpers.ts`, then either generate a wrong import or go looking for "session recovery" UI that was removed with the online-session feature. Because this is the canonical E2E authoring reference, it drags any agent into pre-standalone test conventions at the exact moment they're writing new tests.

**Related findings:** 2.2, 2.4.

### Finding 2.2 — `docs/E2E_TESTING_GUIDE.md` ships an entire `data-testid` table of selectors that no longer exist

**Theme:** Doc describes pre-standalone UI components
**Confidence:** high
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `docs/E2E_TESTING_GUIDE.md:464-472`:

  ```
  | Component | data-testid | Purpose |
  |-----------|-------------|---------|
  | RoomStatus | offline-session-id | Offline session ID display |
  | RoomStatus | online-room-code | Online room code display |
  | RoomStatus | room-pin-display | PIN display |
  | GameSelector | game-card-bingo | Bingo card |
  | GameSelector | game-card-trivia | Trivia card |
  | PatternSelector | pattern-preview | Pattern preview |
  | BallDisplay | current-ball | Current ball |
  ```

- A ripgrep across `apps/` for any of the first 5 testids (`offline-session-id`, `online-room-code`, `room-pin-display`, `game-card-bingo`, `game-card-trivia`) returns zero hits. Same for `pattern-preview` and `current-ball` — the actual BallDisplay component uses `ball-display-${ball.label}`, `balls-called-count`, `balls-remaining-count` selectors (`apps/bingo/src/components/presenter/BallDisplay.tsx:52,147,152`).
- `RoomStatus` and `GameSelector` components don't exist in the tracked source at all — they were part of the Platform Hub / online-session UI that was removed.

**Impact:** Same as 2.1 — agents writing E2E tests will author selectors that never match. The section references BEA-394 "for full refactoring" (line 474), so the entire table is branded as authoritative reference.

**Related findings:** 2.1, 2.4.

### Finding 2.3 — `docs/E2E_TESTING_GUIDE.md` troubleshooting describes a failure mode that the current `global-setup.ts` cannot produce

**Theme:** Doc describes removed auth-era E2E gating
**Confidence:** high
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `docs/E2E_TESTING_GUIDE.md:282-292` under "Issue: 'Missing environment variables'":

  ```
  **Symptom**: Global setup fails with "Missing required environment variables"
  **Cause**: Missing `.env` file in project root
  **Fix**:
  ```bash
  # Create .env in project root
  cp apps/bingo/.env.local .env
  ```
  ```

- `e2e/global-setup.ts` (the only global setup wired via `playwright.config.ts`) does not validate env vars — it only waits for servers on ports. No code path throws "Missing required environment variables".
- Furthermore, `cp apps/bingo/.env.local .env` is nonsense post-standalone — bingo needs no env var to run, and `apps/trivia` is the only app with a required var (`THE_TRIVIA_API_KEY`).

**Impact:** Misleads anyone debugging an unrelated E2E failure into creating a stray `.env` file whose contents are irrelevant to anything.

**Related findings:** 2.1, 2.2, 2.5.

### Finding 2.4 — `docs/E2E_TESTING_GUIDE.md` example commands reference a removed spec file

**Theme:** Doc references removed test file
**Confidence:** high
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `docs/E2E_TESTING_GUIDE.md:36`: `pnpm test:e2e e2e/bingo/room-setup.spec.ts`
- `docs/E2E_TESTING_GUIDE.md:380`: same command as an example of per-worktree test execution
- `git ls-files e2e/` at HEAD `a7369f16` does not contain `e2e/bingo/room-setup.spec.ts`. The tracked bingo spec files are `accessibility.spec.ts`, `display.spec.ts`, `dual-screen.spec.ts`, `health.spec.ts`, `home.spec.ts`, `keyboard.spec.ts`, `presenter.spec.ts`.

**Impact:** Copy-paste example fails. Agent following the parallel-workflow section gets a "no tests matched" error instead of a running suite.

**Related findings:** 2.1, 2.2.

### Finding 2.5 — `docs/E2E_TESTING_GUIDE.md` still claims GitHub Actions are disabled as the governance model; unverified live status is out of scope but the doc's framing is load-bearing

**Theme:** Unverified claim surviving standalone conversion
**Confidence:** medium — cannot verify GitHub repo state from here
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `docs/E2E_TESTING_GUIDE.md:3-8`, `521-536` both assert "GitHub Actions are disabled" and frame the entire guide around local-only validation.
- Root `CLAUDE.md:21` corroborates: "All code must pass E2E tests locally before committing (GitHub Actions are disabled)."
- Prior audit Open Question 2 was `gh api repos/julianken/joolie-boolie/actions/runs ...` which I cannot run. MEMORY.md records the repo was renamed to `julianken/hosted-game-night`, so even if Actions were enabled under the old name, the repo path in the probe command is stale.

**Impact:** If GitHub Actions are actually enabled at the new repo path (post-rename), the "Actions disabled" framing drifts into directly false. Area 5 investigator is better-placed to resolve. Flagged here as a cross-cutting concern.

**Related findings:** 2.11 (BEA-697 plan references Actions-disabled assumption).

### Finding 2.6 — `apps/trivia/README.md` documents a removed `Question Sets` feature and `/question-sets` route

**Theme:** Post-feature-removal cleanup miss
**Confidence:** high
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `apps/trivia/README.md:14`: `- **Question Sets** - Import, organize, and manage question libraries (localStorage)`
- `apps/trivia/README.md:61`: `- **`/question-sets`** - Question set management`
- `git log --all -- "apps/trivia/src/app/question-sets*"` shows PR #517 (`a4be900e`, `feat(trivia): remove question sets feature, load questions directly into game`) deleted the feature. `git ls-files apps/trivia/src/app/` at HEAD confirms no `question-sets` route remains.

**Impact:** A reader or agent planning work against the trivia app would believe a question-set manager route exists. This was NOT in the prior audit's findings (the question-sets removal was PR #517 after the audit closed) — confirmed new drift. BEA-719 (doc rebrand) did not reconcile feature-removal, only strings.

**Related findings:** 2.7.

### Finding 2.7 — `apps/trivia/README.md` documents env vars with no source consumers

**Theme:** Compiler-boundary drift in prose
**Confidence:** high
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `apps/trivia/README.md:116-118`:

  ```
  | `NEXT_PUBLIC_APP_URL` | Yes | App URL (default: `http://localhost:3001`) |
  | `THE_TRIVIA_API_KEY` | For API | Key for The Trivia API (free at https://the-trivia-api.com) |
  | `NEXT_PUBLIC_FEATURE_QUESTION_SETS` | No | Set to `'false'` to disable question sets (default: enabled) |
  ```

- Ripgrep of `apps/trivia/src/**/*.{ts,tsx}` for `NEXT_PUBLIC_APP_URL` returns zero matches. Same for `NEXT_PUBLIC_FEATURE_QUESTION_SETS`.
- `THE_TRIVIA_API_KEY` has consumers (the trivia-api proxy). That row is accurate.
- `apps/trivia/.env.example:17` keeps `# NEXT_PUBLIC_FEATURE_QUESTION_SETS=true` commented-out — the README presents it as if it's still a live feature flag.
- `apps/bingo/README.md:113` has the identical `NEXT_PUBLIC_APP_URL` claim. Ripgrep of `apps/bingo/src/**/*.{ts,tsx}` for `NEXT_PUBLIC_APP_URL` also returns zero consumers.

**Impact:** An operator configuring a new deploy sets three env vars; two of them are no-ops. The phantom feature flag is the bigger issue — it suggests Question Sets is a real live feature that can be toggled.

**Related findings:** 2.6, 2.11.

### Finding 2.8 — `docs/templates/APP_README_TEMPLATE.md` prescribes Supabase as the canonical tech-stack default

**Theme:** Template drift — next-app scaffolding would regress to pre-standalone
**Confidence:** high
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `docs/templates/APP_README_TEMPLATE.md:95`: `- Supabase project (for online mode)`
- `docs/templates/APP_README_TEMPLATE.md:171-172`:

  ```
  | Database | Supabase (PostgreSQL) |
  | Auth | Supabase Auth (via BFF) |
  ```

- `docs/templates/APP_README_TEMPLATE.md:268-270`:

  ```
  | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
  | `SESSION_TOKEN_SECRET` | Secret key for HMAC-signing session tokens | Generate with `openssl rand -base64 32` |
  ```

- `docs/templates/APP_README_TEMPLATE.md:277,283-285` adds `SUPABASE_SERVICE_ROLE_KEY` and an example `.env.local` block with live-looking Supabase URLs and a real-looking `SESSION_TOKEN_SECRET` value.
- BEA-719 rebrand commit `45a84e89` explicitly claims to have updated `docs/templates/APP_README_TEMPLATE.md` but confirmation by reading the file shows only `@hosted-game-night/...` scope strings in the Shared Packages section (lines 350-354) — the tech-stack / prerequisites / env-vars / `.env.local` example were left untouched. This is a partial rebrand, not a partial update.

**Impact:** An AI agent handed "use the template to scaffold a new app" would scaffold a Supabase/auth-era app README. The example `SESSION_TOKEN_SECRET=vGOwoWTO69KP5QXIcNYjyHGonXJZh3nFH3oq3XOCSwY=` is 44 chars of base64 and looks real enough to be copy-pasted into production by mistake. (I did NOT verify whether the specific value is checked anywhere else — flagging for security-adjacent follow-up.)

**Related findings:** 2.9, 2.10.

### Finding 2.9 — `docs/templates/APP_README_TEMPLATE.md` still lists `@hosted-game-night/database` and `@hosted-game-night/auth` as shared-package dependencies

**Theme:** Template drift — prescribes deleted packages
**Confidence:** high
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `docs/templates/APP_README_TEMPLATE.md:352-353`:

  ```
  - [`@hosted-game-night/database`](../../packages/database/README.md) - [Brief description of usage]
  - [`@hosted-game-night/auth`](../../packages/auth/README.md) - [Brief description of usage]
  ```

- `packages/database` and `packages/auth` were deleted in BEA-688 (`3d3894cc`). The packages directory at HEAD contains 8 packages: `audio`, `error-tracking`, `game-stats`, `sync`, `testing`, `theme`, `types`, `ui`.
- The BEA-719 rebrand (commit `45a84e89`) mechanically s/joolie-boolie/hosted-game-night/ on these two lines, upgrading the brand while preserving the bad references.

**Impact:** This is the epistemic-harm case from the prior audit's Theme 4 ("vocabulary without referent") — the text is now internally brand-consistent but still names packages that don't exist.

**Related findings:** 2.8.

### Finding 2.10 — `docs/templates/PACKAGE_README_TEMPLATE.md` example description centers on Supabase wrappers

**Theme:** Template drift (smaller-surface)
**Confidence:** high
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `docs/templates/PACKAGE_README_TEMPLATE.md:52-55`:

  ```
  - Example: "Comprehensive type-safe database utilities for Hosted Game Night.
    Provides Supabase client wrappers, CRUD helpers, React hooks, pagination, filtering,
    and table-specific utilities."
  ```

- The sample is a residual description of the deleted `packages/database` README.

**Impact:** Low — this is a `DESCRIPTION INSTRUCTIONS` comment block, not prescriptive. But it tells a template user that "Supabase client wrappers" are a plausible package concern in this monorepo, which is no longer true.

**Related findings:** 2.8, 2.9.

### Finding 2.11 — `docs/plans/BEA-697-e2e-baseline-fix.md` contains un-rebranded residues and records resolved bugs as open

**Theme:** Plan doc not updated after implementation
**Confidence:** high — prose side; plan-is-historical-or-live side is judgement call
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `docs/plans/BEA-697-e2e-baseline-fix.md:4`: `> **Linear:** https://linear.app/beak-gaming/issue/BEA-697` — Linear URL slug matches the Linear team slug (correct, verified in MEMORY.md: `Linear team ID: 4deac7af-714d-4231-8910-e97c8cb1cd34 (URL slug: beak-gaming)`). Not drift.
- `docs/plans/BEA-697-e2e-baseline-fix.md:294` quotes `joolie boolie platform` and `Joolie Boolie — games for groups and communities` as example of "test drift on copy/heading" — these were valid-at-authoring-time observations (pre-rebrand). Post-BEA-718, the home page/footer copy no longer says "Joolie Boolie" at all. The doc is a historical artifact now.
- `docs/plans/BEA-697-e2e-baseline-fix.md:332`: `**Team:** Joolie-Boolie (`4deac7af-714d-4231-8910-e97c8cb1cd34`)` — Linear team ID is right; the human-readable name is stale. Low-impact.
- `docs/plans/BEA-697-e2e-baseline-fix.md:241, 260, 283`: references `jb-trivia-*` localStorage keys as the migration target. Per root CLAUDE.md and `apps/bingo/CLAUDE.md`, the current prefix is `hgn-` (e.g., `hgn-bingo-templates`). BEA-718 landed the prefix swap in source. The plan still describes `jb-trivia-*` — historical accuracy at planning time, but drifted against HEAD.
- The plan is flagged `> **Status:** Planning only — no code changes in this PR.` at line 3, but the implementation landed as BEA-697/698 (commits `31856c8e`, `14fb0f56`) — the plan predates its own implementation. I cannot tell from the file whether it was intended as a live planning doc or as historical reference; the Header banner claims planning-only.

**Impact:** Medium. The doc is implemented-and-merged (per commits `31856c8e` / `14fb0f56`) but still reads like a proposal. Secondary effect: its `jb-trivia-*` storage-key claims are now misleading context if re-read during future E2E changes. Suggest either archive the plan (move to `docs/archive/` or similar) or add a top-of-file "implemented as PR #528" banner.

**Related findings:** 2.5.

### Finding 2.12 — `docs/adr/ADR-001-e2e-hash-port-isolation.md` still references `e2e/fixtures/auth.ts` (non-existent at HEAD)

**Theme:** ADR not reconciled post-fixture-refactor
**Confidence:** high
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `docs/adr/ADR-001-e2e-hash-port-isolation.md:53`: `Note: `e2e/fixtures/auth.ts` previously consumed the port config for Platform Hub URLs. After the standalone conversion (BEA-682–696), it navigates directly to /play on the target app and no longer reads hub URLs.`
- `git ls-files e2e/fixtures/` at HEAD returns only `e2e/fixtures/game.ts`. `auth.ts` was removed. BEA-714 (`d2a6d207`) introduced the `bingoPage` / `triviaPage` / `triviaPageWithQuestions` / `triviaGameStarted` composable fixture model; BEA-716 (`6d412fd5`) purged the auth vocabulary.
- ADR-001's main body is accurate (port hashing, offsets, worktree detection). Only the tail-end "Note" is stale.
- ADR-001's primary status is "Accepted" (line 5). This is the live ADR for the port system.

**Impact:** An agent reading ADR-001 as architecture reference would chase a non-existent file. Simple patch: delete or rewrite the Note to reference `e2e/fixtures/game.ts`.

**Related findings:** 2.1, 2.13.

### Finding 2.13 — ADR-002 and ADR-007 still describe removed infrastructure, but their header banners make the historical-record intent clear

**Theme:** Superseded ADRs (intentional)
**Confidence:** high that the superseded-banner pattern is intentional; high that the bodies are stale relative to HEAD
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `docs/adr/ADR-002-synthetic-jwt-auth-e2e.md:5-13` opens with `Status: Superseded (2026-Q1)` and a block quote: `> **Superseded (2026-Q1):** Platform Hub, packages/auth, and bingo/trivia middleware were removed in the standalone conversion (BEA-682–696). [...] Do not rely on any of the files, env vars, or flows described below — they no longer exist. > This ADR is preserved as an immutable historical record of a decision made and later reversed.`
- `docs/adr/ADR-007-docker-isolation-rejected.md:43-45` has a similar banner: `> **Note:** ADR-002 (Synthetic JWT Auth), referenced in rationale point 4, was subsequently superseded when the standalone conversion (BEA-682–696) removed authentication infrastructure entirely. The rationale below is preserved as the historical decision context.`
- `docs/adr/README.md:7-9` correctly lists ADR-002 as Superseded and ADR-007 as Rejected, dating both 2026-01.

**Impact:** None — this is BEA-702's explicit design. The banners do their job. Flagging for completeness because the bodies contain `SUPABASE_JWT_SECRET`, `packages/auth/src/game-middleware.ts`, `OAuth 2.1`, `Platform Hub login route` etc., which an inattentive reader could mistake for current truth. BEA-702 Recommendation M2 explicitly called for this annotation pattern and it's been executed.

**Related findings:** 2.12.

### Finding 2.14 — Root `README.md` is clean and current (intentional positive finding)

**Theme:** Rebrand + standalone rewrite succeeded
**Confidence:** high
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `README.md` at HEAD uses `Hosted Game Night` / `hosted-game-night` brand exclusively. Zero hits on `joolie-boolie`, `Joolie Boolie`, `beak-gaming`, `Beak Gaming`, `jb-`, `@joolie-boolie` (ripgrep confirmed).
- `README.md:43-55` monorepo tree lists all 8 current packages and both current apps — no `platform-hub`, no `packages/auth`, no `packages/database`.
- `README.md:18-22` correctly describes "No accounts, no server, no database — everything runs in the browser with localStorage persistence", matching HEAD.
- `README.md:5` links to `https://host-bingo.com` and `https://host-trivia.com`, matching MEMORY.md's live-domain list.
- `README.md:29`: clone URL is `https://github.com/julianken/hosted-game-night.git`, matching MEMORY.md repo-rename record.
- Commit `2cf4a299` ("docs: rewrite README for standalone architecture") was the deliberate rewrite; `7cd814b5` added screenshots; `62422edc` fixed a BroadcastChannel link. No rot detected.

**Impact:** Positive reference — the root README is the best-maintained prose doc in the repo. Worth calling out because "what you run is correct, but what you read is wrong" does NOT apply here.

**Related findings:** 2.15, 2.16.

### Finding 2.15 — `docs/ARCHITECTURE.md` is clean and current

**Theme:** Rebrand + standalone rewrite succeeded
**Confidence:** high
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `docs/ARCHITECTURE.md:1-66` describes the current 2-app standalone structure, the BroadcastChannel sync model, the pure-function engine pattern, the 8 packages, and the per-app `src/` layout. All consistent with HEAD.
- Zero stale-brand hits; zero references to Supabase / OAuth / Platform Hub / auth / packages/auth / packages/database.
- Only package name change called out: `@hosted-game-night/sync` at line 13, matching HEAD package name.
- Minor nuance: `docs/ARCHITECTURE.md:17` says the trivia engine has a "5-state GameStatus" but root CLAUDE.md:25 says `4-state GameStatus` and `apps/trivia/CLAUDE.md:[Architecture Notes]` says `4-state GameStatus (setup, playing, between_rounds, ended)`. Also `README.md:67` says `4-state game status`. This is a one-word inconsistency — likely an old count before `paused` was removed (or added-then-removed). Low-impact since 4 vs 5 is a count, not a behavior claim.

**Impact:** Cross-doc consistency drift for `4` vs `5` state count is trivial but notable given the doc was touched in BEA-719.

**Related findings:** 2.14, 2.16.

### Finding 2.16 — `docs/ALERTING_SETUP.md` health-check URLs now match live apps (prior-audit gap closed)

**Theme:** Recommendation implemented
**Confidence:** high
**Provenance:** `[tracked-HEAD]` (doc side); cross-referenced against `apps/*/src/app/api/health/route.ts`
**Evidence:**
- `docs/ALERTING_SETUP.md:52-53`:

  ```
  | `jb-bingo-health` | `https://host-bingo.com/api/health` | 60s |
  | `jb-trivia-health` | `https://host-trivia.com/api/health` | 60s |
  ```

- `apps/bingo/src/app/api/health/route.ts` and `apps/trivia/src/app/api/health/route.ts` both exist at HEAD (re-added in BEA-698, commit `31856c8e`) and return `{ status: 'ok', service: 'bingo' | 'trivia', timestamp: <ISO> }` with a `Used by Grafana Synthetic Monitoring probes` docstring that refers back to this file. Prior audit Finding 4.5 + Recommendation H1 item 3 is closed.
- `docs/ALERTING_SETUP.md:17,21,36,37,60` retain `jb-bingo` / `jb-trivia` as Sentry project slugs. Per prior audit Iterator 3 these are verified as real project names on Sentry, so "jb-*" survival here is correct — it's the Sentry project-name identifier, not a brand leak.

**Impact:** Positive — prior-audit doc recommendation landed. No drift to fix.

**Related findings:** 2.14, 2.15.

### Finding 2.17 — `docs/security-log.md` is short, accurate, and dated

**Theme:** Small doc, no drift
**Confidence:** high
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- File is 14 lines, dated 2026-04-10, describing the nightly security audit cycle and the `ajv` override incident.
- No stale brand hits. No references to removed systems. Last-updated commit `d9645efa` is 3 days old (relative to today 2026-04-13).

**Impact:** None — included for completeness.

**Related findings:** (none)

### Finding 2.18 — `docs/adr/README.md` index is accurate

**Theme:** Small doc, no drift
**Confidence:** high
**Provenance:** `[tracked-HEAD]`
**Evidence:**
- `docs/adr/README.md:5-9` is a 3-row table listing the three tracked ADRs with correct status (Accepted / Superseded / Rejected) and dates. Matches tracked file contents.
- Gaps in numbering (002, 007 with 003-006 missing) are historical — earlier ADRs were archived in `docs/archive/`. The README does not claim to be exhaustive.

**Impact:** None — mentioned to close the scope.

## Prior Audit Status Check

The prior audit's Section H (Recommendations) at `docs/post-standalone-audit/phase-4/analysis-report.md:378-466` identifies these doc-related items:

| Rec | Summary | Status at HEAD `a7369f16` | Evidence |
|---|---|---|---|
| H1 item 3 (Quick Wins) | Patch `docs/ALERTING_SETUP.md:52-53` health probe URLs | **Done** | Finding 2.16 — URLs now point at `host-bingo.com/api/health` + endpoints exist |
| M2 (Doc cleanup sprint) — REWRITE `MANUAL_TEST_PLAN.md` | Drop Platform Hub sections | Out of my scope (Area 3) — landed per BEA-702 commit `913e5e61` description |
| M2 — DELETE `docs/APP_STRUCTURE.md` | Remove duplicated stale doc | **Done** — `git ls-files docs/ \| grep APP_STRUCTURE` returns empty |
| M2 — DELETE `docs/MIDDLEWARE_PATTERNS.md` | No middleware exists | **Done** — grep returns empty |
| M2 — MARK-SUPERSEDED ADR-002 + ADR-007 | Add banners | **Done** — Finding 2.13 |
| M2 — PATCH `CONTRIBUTING.md` BFF section | No Supabase backend | **Done** per BEA-702 commit message; not in my Area 2 scope (root doc); spot-checked — `grep -n "BFF\|Supabase" CONTRIBUTING.md` returns no hits |
| M2 — PATCH `docs/E2E_TESTING_GUIDE.md` E2E_JWT_SECRET block | Remove dead env-var guidance | **Partially done** — the intro paragraph at line 23 is clean ("No source file reads E2E_JWT_SECRET"); but the data-testid table, `waitForRoomSetupModal`, `room-setup.spec.ts` refs, and "Missing environment variables" section were NOT touched. See Findings 2.1, 2.2, 2.3, 2.4 |
| M2 — PATCH `apps/bingo/CLAUDE.md:7-8` | Remove "cloud-based" claim | Out of my scope (Area 4) — BEA-702 commit message claims done |
| M2 — PATCH `docs/adr/ADR-001` context + README index | Remove Platform Hub context | **Partially done** — ADR-001 main body is clean; `docs/adr/README.md` is clean; but the tail Note at line 53 still names `e2e/fixtures/auth.ts` which does not exist. See Finding 2.12 |
| M2 — PATCH `packages/testing/README.md` (Supabase Mock marketing) | Not in my scope (package README) | BEA-702 commit says done |
| L1 (Cheap hygiene bundle) | Overlaps with M2 | Mostly done via BEA-702 |

**BEA-719 follow-ups** (not in prior audit — landed 2026-04-13):
- `docs/ARCHITECTURE.md` — Finding 2.15 confirms clean
- `docs/templates/APP_README_TEMPLATE.md` — **partially rebranded only**, see Findings 2.8–2.10

**Net assessment:** The prior audit's doc-cleanup sprint (M2/L1) + the BEA-719 doc rebrand executed ~85% of the in-scope doc fixes. Open residues are concentrated in two files (`docs/E2E_TESTING_GUIDE.md`, `docs/templates/APP_README_TEMPLATE.md`) plus one app README (`apps/trivia/README.md` — the Question Sets survival is post-audit drift, not re-opened audit drift).

## Surprises

1. **`apps/trivia/README.md` Question Sets survival.** The prior audit did not flag this because question-sets was live at audit close (PR #517 landed after). BEA-719 touched the file but only for brand strings. The feature-removal reconciliation is still owed.
2. **BEA-719 did a surgical rebrand of `docs/templates/*`.** I expected either a full pass or no pass. The actual state is: package-name strings were updated (line 19, 43, 350-354 etc.) but the surrounding prose content describing Supabase / session tokens / OAuth was left verbatim. This produces a file that is maximally misleading: it LOOKS rebranded, but ships with `@hosted-game-night/database` and `@hosted-game-night/auth` as "shared packages to list" — packages that do not exist. The mechanical nature of BEA-719 shows through.
3. **ADR-001's concluding Note is the only remaining `e2e/fixtures/auth.ts` reference in the ADR tree.** ADR-002 references it but is banner-annotated as historical. ADR-001 (Accepted / live) has one sentence that survives the post-BEA-714 world. Easy to miss because it's below the `## Consequences` section.
4. **`docs/plans/BEA-697-e2e-baseline-fix.md` is a planning doc that outlived its implementation.** The fact that the commit that added it (`14fb0f56`) pre-dates the commit that implemented it (`31856c8e`) by only one commit, plus the implementation PR never closed out the plan doc, creates a "plan describes future that is now past" artifact. The correct archival move (move to `docs/post-implementation-notes/` or add an "implemented as BEA-697 PR #528" banner) was skipped. This is a recurring pattern per the `docs/` tree structure (every `*-decisions/` subtree contains an `execution-plan.md` that may or may not be retrospectively accurate).
5. **The per-app `README.md` files have a `Future Work` section listing things that are already implemented.** `apps/bingo/README.md:162-165` lists `Voice pack selection UI improvements` and `Analytics/history tracking` as future work; `apps/trivia/README.md:171-172` lists `Pattern editor` (impossible — trivia has no patterns) and `Analytics/history tracking`. The "Pattern editor" future-work claim in the trivia README appears to be a copy-paste from the bingo README that was never fixed. Low-severity, but worth flagging as evidence that the app README maintenance cadence is uneven.

## Unknowns & Gaps (for Phase 2)

1. **Is `julianken/hosted-game-night` GitHub Actions enabled?** Findings 2.5 asserts the repo claim without live verification. Single-probe resolution: `gh api repos/julianken/hosted-game-night/actions/runs --jq '.workflow_runs[] | {name, status, conclusion, created_at}' | head -10`. If enabled, the "Actions disabled" framing across `README.md`, `CLAUDE.md`, `E2E_TESTING_GUIDE.md` is wrong.
2. **Are the Sentry project slugs `jb-bingo` / `jb-trivia` still valid?** Finding 2.16 assumes yes (per prior audit). Single probe: `vercel env pull .env.probe.tmp --environment=production --cwd apps/bingo` then `grep SENTRY_PROJECT .env.probe.tmp`. If the rebrand extended to Sentry project renames (e.g., `hgn-bingo`), ALERTING_SETUP.md is drifted.
3. **What is the actual live mtime / content of `docs/plans/BEA-697-e2e-baseline-fix.md` in the planning-docs directory structure?** Is this a deliberate "archive in place" model, or was the author intending to move it to `docs/archive/plans/`? Observational, not a drift call — a project-convention question Phase 2 could answer.
4. **Is there a canonical `docs/templates/` re-validation process?** The rebrand touched the templates but left Supabase guidance. Did the author intend partial update (rebrand only), or was it a miss? Resolution: ask the author, or check whether any new app/package has been scaffolded from these templates since the standalone conversion. If no consumer has used them, the drift has no blast radius yet.
5. **Do the sub-directory `apps/bingo/src/*/README.md` files (not `CLAUDE.md` — README) match current directory contents?** I did not open them because they're technically outside my Area 2 scope (they're on the boundary between prose-README and agent-context-CLAUDE). If Area 4 doesn't cover them, Phase 2 should pick them up.
6. **Does `docs/E2E_TESTING_GUIDE.md` have any references that would make a new E2E test silently fail instead of visibly fail?** The `data-testid` table hits a hard-error mode (selector doesn't match → test fails). But the `waitForRoomSetupModal` import would be a TS compile error, which is louder. Is there a softer failure mode I missed? Phase 2 could grep the guide for promises the code can't keep.
7. **Does any live deployment or cron still probe `/api/health` on a non-existent path (e.g., `host-bingo.com/api/status`)?** If Grafana synthetic monitoring is configured per `ALERTING_SETUP.md:52-53` at `/api/health`, is the probe actually running and succeeding? Not doc-drift — ops-state drift — but listed here in case it turns the "API docs match source" finding from theoretical to live-verified.

## Raw Evidence

### Commands run during investigation

```bash
git rev-parse HEAD
# a7369f16cd42a75c5e7208c75501b091c8a23db0

git ls-files docs/ | grep -v "^docs/archive/" | grep -v "^docs/superpowers/" | sort
# (filtered scope listing; cached in header)

git log --oneline -30 --format="%h %s"
# most recent: a7369f16 chore: fix TURBO_TEAM slug; 45a84e89 BEA-719; 14a521e2 BEA-718; 6d412fd5 BEA-716; 913e5e61 BEA-702

git show 913e5e61 --stat
# BEA-702 cleanup sprint: DELETE docs/APP_STRUCTURE.md, DELETE docs/MIDDLEWARE_PATTERNS.md,
# MARK-SUPERSEDED ADR-002 + ADR-007, PATCH multiple files

git show 45a84e89 --stat
# BEA-719 doc rebrand: README.md, CLAUDE.md, CONTRIBUTING.md, app CLAUDE.md files,
# package READMEs, docs/ARCHITECTURE.md, docs/ALERTING_SETUP.md, docs/templates/*

git ls-files e2e/
# confirms no fixtures/auth.ts, no room-setup.spec.ts — Findings 2.1, 2.4, 2.12

grep -n "^export" e2e/utils/helpers.ts
# 19 exports; no waitForRoomSetupModal — Finding 2.1

rg "joolie-boolie|Joolie Boolie|JoolieBoolie|@joolie-boolie|beak-gaming|Beak Gaming" \
   README.md docs/ARCHITECTURE.md docs/E2E_TESTING_GUIDE.md docs/ALERTING_SETUP.md \
   docs/security-log.md docs/adr/ docs/templates/
# Zero matches in the rebranded files; hits only in docs/plans/BEA-697-*.md:4 (Linear URL)

rg "NEXT_PUBLIC_APP_URL|NEXT_PUBLIC_FEATURE_QUESTION_SETS" apps/
# apps/trivia/README.md, apps/bingo/README.md, apps/trivia/.env.example — no source consumers

rg "RoomStatus|GameSelector|game-card-bingo|offline-session-id|online-room-code" apps/
# zero hits — Finding 2.2

git ls-files apps/trivia/src/app/
# no question-sets route — Finding 2.6

git log --all -- "apps/trivia/src/app/question-sets*"
# a4be900e feat(trivia): remove question sets feature (PR #517)
```

### File paths referenced

- `/Users/j/repos/beak-gaming-platform/README.md`
- `/Users/j/repos/beak-gaming-platform/docs/ARCHITECTURE.md`
- `/Users/j/repos/beak-gaming-platform/docs/E2E_TESTING_GUIDE.md`
- `/Users/j/repos/beak-gaming-platform/docs/ALERTING_SETUP.md`
- `/Users/j/repos/beak-gaming-platform/docs/security-log.md`
- `/Users/j/repos/beak-gaming-platform/docs/adr/README.md`
- `/Users/j/repos/beak-gaming-platform/docs/adr/ADR-001-e2e-hash-port-isolation.md`
- `/Users/j/repos/beak-gaming-platform/docs/adr/ADR-002-synthetic-jwt-auth-e2e.md`
- `/Users/j/repos/beak-gaming-platform/docs/adr/ADR-007-docker-isolation-rejected.md`
- `/Users/j/repos/beak-gaming-platform/docs/plans/BEA-697-e2e-baseline-fix.md`
- `/Users/j/repos/beak-gaming-platform/docs/templates/APP_README_TEMPLATE.md`
- `/Users/j/repos/beak-gaming-platform/docs/templates/PACKAGE_README_TEMPLATE.md`
- `/Users/j/repos/beak-gaming-platform/docs/templates/ROOT_README_TEMPLATE.md`
- `/Users/j/repos/beak-gaming-platform/apps/bingo/README.md`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/README.md`
- `/Users/j/repos/beak-gaming-platform/e2e/fixtures/game.ts`
- `/Users/j/repos/beak-gaming-platform/e2e/utils/helpers.ts`
- `/Users/j/repos/beak-gaming-platform/e2e/global-setup.ts`
- `/Users/j/repos/beak-gaming-platform/apps/bingo/src/app/api/health/route.ts`
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/api/health/route.ts`

### Prior-audit cross-reference

`docs/post-standalone-audit/phase-4/analysis-report.md:378-466` (Section H) — doc-related recommendations status checked in "Prior Audit Status Check" above.

---

**End of Area 2 report.** Verified against HEAD `a7369f16` on 2026-04-13. 18 findings across 4 drift themes (fixture-API drift, feature-removal-not-reconciled, template-partial-rebrand, historical-ADR-residue). No surprises for the rebrand or standalone-conversion completeness at the brand-string level. Drift is concentrated in the "intent" layer of docs (what do readers believe this codebase is) rather than the "name" layer (what does it call itself).
