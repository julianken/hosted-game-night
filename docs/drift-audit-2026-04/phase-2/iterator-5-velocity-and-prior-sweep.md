# Iteration 5: Historical Velocity + Prior-Audit Sweep

## Assignment

Phase 2 Iterator 5. Analyze commit velocity since the prior audit (HEAD `25cdc983`, 2026-04-11) to present HEAD `a7369f16` (2026-04-13). Produce a unified view of which prior-audit recommendations landed, which are open, and what structural drift risk the velocity pattern implies.

Methodology note: every claim below is either `[tracked-HEAD]` (verified via `git show HEAD:` or `git ls-files`), `[live-verified]` (curl / dig / gh api), or `[provenance-recorded]` (direct evidence from the prior audit report + commit message). The prior audit made errors by conflating on-disk files with tracked state; this report re-verifies before claiming.

Source of truth for recommendations: `docs/post-standalone-audit/phase-4/analysis-report.md` §H (lines 378-473) and §I (lines 476-514).

---

## 1. Velocity Analysis (commits since 25cdc983)

**Total commits:** 20 (`git log --oneline 25cdc983..HEAD | wc -l` → 20). `[live-verified]`

Window: 2026-04-11 → 2026-04-13 (≈2 days, which is the sweep window — the commits are bunched, not distributed evenly). This is an intense post-audit cleanup burst, not a steady-state measurement.

### By commit-prefix category

Parsing each commit's subject prefix (`git log --oneline 25cdc983..HEAD`):

| Category | Count | % of total | Commits |
|----------|-------|------------|---------|
| `fix(...)` | 6 | 30% | `a717c61a` (turbo faro), `4ee3aafc` (turbo sentry), `42901dd0` (e2e hydration), `3c06ee28` (trivia SetupGate), `381fb156` (e2e display), `f0c64d4b` (e2e bingo presenter) |
| `refactor(...)` | 3 | 15% | `14a521e2` (BEA-718 code rebrand), `6d412fd5` (BEA-716 fixture rename), `d2a6d207` (BEA-714 fixture split) |
| `chore(...)` | 5 | 25% | `a7369f16` (TURBO_TEAM), `030d03b8` (BEA-712 e2e typecheck), `7f1deb28` (BEA-701 copy), `ec36f674` (BEA-699 CI stubs), `e7b4b5e6` (BEA-700 dead types) |
| `docs(...)` | 3 | 15% | `45a84e89` (BEA-719 doc rebrand), `913e5e61` (BEA-702 doc sprint), `75e87fe0` (audit artifacts), `14fb0f56` (BEA-697 plan) |
| `feat(...)` | 1 | 5% | `31856c8e` (BEA-698 E2E baseline + /api/health) |
| No-prefix | 1 | 5% | `542d427b` (Add MIT license) |

**Note:** the `docs(...)` count is 4 if we include `14fb0f56`, bringing docs share to 20% (`4/20`). I'll use the 4 figure below.

### By target surface

Cross-tabulating commits against the files they touched (`git log --oneline 25cdc983..HEAD -- <path>`):

| Surface | Commits touching | % of commits | Evidence |
|---------|------------------|--------------|----------|
| Source code (`apps/**`, `packages/**`) | 10 | 50% | `git log --oneline 25cdc983..HEAD -- 'apps/**' 'packages/**' \| wc -l` → 10 |
| E2E tests (`e2e/**`) | 8 | 40% | `git log --oneline 25cdc983..HEAD -- 'e2e/**' \| wc -l` → 8 |
| Docs (`docs/**/*.md`, `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`) | 4 | 20% | `git log --oneline 25cdc983..HEAD -- 'docs/**/*.md' 'README.md' 'CLAUDE.md' 'CONTRIBUTING.md' \| wc -l` → 4 |
| Config (root configs, `.github/**`, `turbo.json`, `vercel.*`, `.config.*`) | 8 | 40% | `git log --oneline 25cdc983..HEAD -- '.github/**' 'vercel*.json' 'turbo.json' '*.config.*' \| wc -l` → 8 |
| Tracked `CLAUDE.md` anywhere | 3 | 15% | BEA-702 (apps/bingo/CLAUDE.md), BEA-718 (apps/bingo/CLAUDE.md, apps/trivia/CLAUDE.md), BEA-719 (root CLAUDE.md + apps/trivia/CLAUDE.md + packages/game-stats/CLAUDE.md) |
| Branding rebrand commits | 3 | 15% | `14a521e2` (BEA-718), `45a84e89` (BEA-719), `a7369f16` (stray skills) |

(Percentages sum >100% because many commits touch multiple surfaces — e.g., BEA-702 touched docs AND scripts, BEA-718 touched code + configs + CLAUDE.md.)

### Code-to-docs update ratio (the drift-growth indicator)

- Source-code commits: **10**
- Doc-touching commits: **4**
- Ratio: **2.5 : 1** (source updates per doc update)

This is actually healthier than it looks in isolation because BEA-702 (`913e5e61`) is a dedicated 13-file doc sprint, not an incidental patch. Of the 4 doc-touching commits, 3 are intentional doc work (BEA-697 plan, BEA-702 sprint, BEA-719 rebrand) and 1 is the audit artifact dump. None are "code commit that also touched docs as a side-effect."

**Interpretation:** The velocity pattern is not "code is drifting because docs aren't being updated alongside." It is "code and docs are being updated in parallel tracked issues." That's a healthier pattern for drift-containment than the usual case. BUT: it means when a doc is not explicitly called out in a Linear issue, it does not get updated. Areas 2 and 3 of this drift audit found exactly that — BEA-719 was a mechanical string rebrand and left the semantic content of `docs/templates/APP_README_TEMPLATE.md` still prescribing Supabase (see §4 below).

**Separately: `e2e/` churn is high.** 8 of 20 commits (40%) touched E2E. This reflects three rounds of E2E drift recovery (BEA-698 baseline, BEA-704/706 selectors, BEA-712/714/715/716 fixture split). E2E selectors are the most drift-prone surface in the repo right now because the app code is moving faster than the selector contracts.

---

## 2. Prior-Audit Recommendation Sweep

### URGENT (3 items)

| Item | Status | Evidence | Commits |
|------|--------|----------|---------|
| U1: Rotate Supabase service role key for `iivxpjhmnalsuvpdzgza` | **INVALIDATED** (gracefully) | The commit message of `75e87fe0` (audit artifact commit) says: *"the project was confirmed dead via DNS probe (curl exit 6, host unreachable)"*. The blob in git log is inert. `[provenance-recorded]` from `75e87fe0` commit body. No explicit rotation commit, but the underlying risk is gone. | `75e87fe0` |
| U2: Rotate live Sentry + Grafana Cloud tokens in `.secrets/observability-accounts.json` | **UNKNOWN / PROBABLY OPEN** | `.secrets/` is gitignored so git cannot prove rotation. `docs/ALERTING_SETUP.md:46` references `hosted-game-night-ci` token name (post-rebrand), which hints the Sentry token was at least touched post-2026-04-14 when the rename happened. Grafana Cloud token has no observable change signal. MEMORY.md does not claim rotation happened. Treat as **open** unless rotation evidence surfaces. | *(none visible in git)* |
| U3: Fix `NEXT_PUBLIC_FARO_URL` `\n` corruption on Vercel | **LANDED + deeper fix** | Commit `a717c61a` (*"fix(turbo): expose NEXT_PUBLIC_FARO_URL to build env"*) reveals a more fundamental Turbo-passthrough bug: the env var was never reaching the build pipeline at all because it was missing from `turbo.json` `tasks.build.env`. Fix added it to line 19 of turbo.json `[tracked-HEAD]`. Commit message explicitly notes *"The earlier fix in this session that removed a literal \n from the env value was real but downstream of this more fundamental issue."* So both the `\n` AND the cache-strip bug are resolved. | `a717c61a`, plus implied prior env-value cleanup |

**URGENT summary: 1 landed + extra (U3), 1 invalidated (U1), 1 open (U2).**

### Quick Wins (8 items from §H1)

Mapping the 8 items enumerated in §H1 (lines 412-419 of prior report):

| # | Item | Status | Evidence | Commit |
|---|------|--------|----------|--------|
| 1 | Delete `.github/workflows/nightly.yml:81-89` stub env block | **LANDED** | `ec36f674` (BEA-699) diff: `-7 lines` removed from nightly.yml. Verified via commit message + `git show ec36f674 --stat`. `[tracked-HEAD]` | `ec36f674` |
| 2 | Fix `.github/workflows/e2e.yml:152 --project=bingo-mobile` | **LANDED** | Same commit `ec36f674` (BEA-699) removed `--project=bingo-mobile` from e2e.yml. | `ec36f674` |
| 3 | Patch `docs/ALERTING_SETUP.md:52-53` probe URLs | **LANDED** | BEA-698 (`31856c8e`) added `/api/health` endpoints. `git show HEAD:docs/ALERTING_SETUP.md` lines 50-52 now say `https://host-bingo.com/api/health` / `https://host-trivia.com/api/health`. Both URLs return HTTP 200 live. `[live-verified]` via `curl -s -o /dev/null -w "%{http_code}\n" https://host-bingo.com/api/health` → `200`. | `31856c8e`, `45a84e89` |
| 4 | Remove/301-redirect `bingo.beak-gaming.com` / `trivia.beak-gaming.com` aliases | **OPEN** | `dig +short bingo.beak-gaming.com` → `216.150.1.193, 216.150.16.1` (Vercel IPs) `[live-verified]`. Resolution matches `bingo.joolie-boolie.com` → `216.150.16.193, 216.150.1.65` which are also Vercel IPs. Both legacy domain families are still live, no evidence of redirect rules added. OQ3 now resolves to "DNS still points at Vercel." | *(none)* |
| 5 | Fix `NEXT_PUBLIC_FEATURE_QUESTION_SETS` `\n` corruption on trivia Vercel | **UNKNOWN (Vercel env not probed)** | `apps/trivia/.env.example:19` shows the var commented out with `# NEXT_PUBLIC_FEATURE_QUESTION_SETS=true`, unchanged from prior audit. Trivia README still documents it at line 118. Cannot prove live Vercel fix from git. Area 5 of Phase 1 found `apps/trivia/.env.example` still contains this stale flag — concurring. | *(none visible)* |
| 6 | Clean up orphan Vercel preview aliases | **UNKNOWN** | No git-observable signal. Would need `vercel alias ls` output. | *(none)* |
| 7 | Set `THE_TRIVIA_API_KEY` on trivia Vercel project | **UNKNOWN** | No git signal. Docs unchanged. | *(none)* |
| 8 | Forward-only verification of `.env.example` cleanliness | **PARTIAL** | Post-rebrand `.env.example` root file and per-app `.env.example` files are all post-rename (`@hosted-game-night/*` etc.), but `apps/trivia/.env.example:19` still has the stale `NEXT_PUBLIC_FEATURE_QUESTION_SETS` comment (Phase 1 Area 5 finding). BEA-719 did a mechanical string rebrand; did not revisit semantic content. | `45a84e89` (partial) |

**Quick Wins summary: 3 landed (items 1, 2, 3), 1 partial (item 8), 4 open or unknown (items 4, 5, 6, 7).**

### Important Investments (3 items)

| # | Item | Status | Evidence | Commits |
|---|------|--------|----------|---------|
| M1 | Dead types cleanup (404 lines, 6 ordered steps) | **LANDED** | `e7b4b5e6` (BEA-700). Commit stats: 937 lines removed across 9 files. Specific deletions: `packages/types/src/user.ts` (92 lines), `packages/types/src/api.ts` (143 lines), partial `packages/types/src/game.ts` (85 lines), `apps/bingo/src/types/index.ts` lines 212-307 (96 lines), plus `categorizeError()` dead string branches in `packages/error-tracking/src/server.ts`. `git show HEAD:packages/types/src/user.ts` → `fatal: path does not exist in HEAD` confirms deletion. `[tracked-HEAD]` | `e7b4b5e6` |
| M2 | Documentation cleanup sprint | **LARGELY LANDED** | `913e5e61` (BEA-702) executed the 11-action doc plan. Verified deletions: `docs/APP_STRUCTURE.md` and `docs/MIDDLEWARE_PATTERNS.md` both now `fatal: path does not exist in HEAD` `[tracked-HEAD]`. ADR-002 marked superseded at HEAD (`git show HEAD:docs/adr/ADR-002-synthetic-jwt-auth-e2e.md` shows "Superseded (2026-Q1)" on line 5). MANUAL_TEST_PLAN.md dropped from 752 to ~610 lines per commit message. **But:** Area 2 + 3 of Phase 1 found the rewrite was incomplete — E2E_TESTING_GUIDE still has `waitForRoomSetupModal` table refs (line 192), `room-setup.spec.ts` refs (lines 36, 380), data-testid table, and MTP still has 25 drift findings. Call it **PARTIAL** — most items landed, several bugs per-file survived the sprint. | `913e5e61` |
| M3 | CSP enforcing-mode migration | **OPEN** | `git show HEAD:apps/bingo/next.config.ts:39` still returns `key: 'Content-Security-Policy-Report-Only'`, trivia is the same. `[tracked-HEAD]` No commits since `25cdc983` touched CSP configuration. | *(none)* |

**Important Investments summary: 1 landed (M1), 1 partial (M2), 1 open (M3).**

### 6 Open Questions: status now

Resolving each open question against current state:

| # | Question | Status now | Evidence |
|---|----------|------------|----------|
| OQ1 | Is Supabase project `iivxpjhmnalsuvpdzgza` alive, paused, or deleted? | **RESOLVED — DEAD** | Commit `75e87fe0` message: "the project was confirmed dead via DNS probe (curl exit 6, host unreachable)." The Phase 1 audit commits themselves did the probe. `[provenance-recorded]` | 
| OQ2 | Is GitHub Actions enabled at the repo level, and is the nightly cron firing? | **RESOLVED — EFFECTIVELY DISABLED** | `gh api repos/julianken/hosted-game-night/actions/runs` shows most-recent run `2026-01-24T03:29:29Z` — ~2.5 months stale. Workflows exist in YAML but are not firing. `[live-verified]` BEA-699 commit message explicitly says: *"Both fixes are cosmetic — GitHub Actions is effectively disabled at the repo level (most recent run 2026-01-24)."* Matches. |
| OQ3 | Does DNS for `beak-gaming.com` still point at Vercel? | **RESOLVED — YES (aliases still reachable)** | `dig +short bingo.beak-gaming.com` returns `216.150.1.193, 216.150.16.1` (Vercel IP range). Aliases are still resolving and reachable. Implies the aliases are still live and should be formally removed or 301-redirected — they aren't. `[live-verified]` |
| OQ4 | What URL should Grafana Synthetic Monitoring probe? | **RESOLVED — option (a) chosen** | BEA-698 (`31856c8e`) added `/api/health` to both apps and ALERTING_SETUP.md lines 51-52 now use those URLs. Both live: `curl https://host-bingo.com/api/health` → 200. Option (a) was selected (minimal `/api/health` restored). `[live-verified]` |
| OQ5 | Has Grafana RUM dashboard been showing a flatline since Faro was deployed? | **PROBABLY FLATLINE UNTIL `a717c61a` LANDED** | Commit `a717c61a` says: *"This means the Faro RUM URL has been **never** reaching the production client bundle, regardless of what was in Vercel's env."* So yes, flatline confirmed by commit-author's own investigation. Post-fix status not yet observable. `[provenance-recorded]` |
| OQ6 | Is `julianken/joolie-boolie` (now `julianken/hosted-game-night`) public or private? | **RESOLVED — PUBLIC** | `gh api repos/julianken/hosted-game-night --jq .visibility` → `public` `[live-verified]`. This is a **new finding**: the repo is public. The Supabase key leak in git history (blobs `3b40fb25` etc.) is therefore externally indexable. Project is dead so exposure is inert, but external scanners may have hit the blobs. Changes forensic backdrop. |

**OQ summary: all 6 resolved.**

---

## 3. MEMORY.md Claim Verification Table

`[MEMORY.md]` is `/Users/j/.claude/projects/-Users-j-repos-beak-gaming-platform/memory/MEMORY.md`.

| Claim | Location | Current reality | Verdict |
|-------|----------|-----------------|---------|
| Repo renamed `julianken/hosted-game-night` | "Git Setup" §1 | `gh api repos/julianken/hosted-game-night --jq .visibility` → `public` (repo exists, is public) `[live-verified]` | **AGREES** |
| `gh pr create` should use `--repo julianken/hosted-game-night` | "Git Setup" §3 | Consistent with above. | **AGREES** |
| Worktrees use `.worktrees/wt-BEA-XXX-slug` format | "Git Setup" §4 | 7 dirs under `.worktrees/`; 4 follow `wt-BEA-XXX-slug` (e.g., `wt-BEA-677-layout-constraints`); 3 do not (`issue-79-trivia-e2e`, `wave2`, `work`). Inconsistent but claim describes the intended convention, not the current state. `[live-verified]` | **AGREES (as prescription)** |
| "Branding IN PROGRESS (2026-04-14)" | "Branding" §1 | **FALSE.** `rg '"name": "@hosted-game-night'` → 10 matches at HEAD including root `package.json`, all `apps/*/package.json`, all `packages/*/package.json` `[tracked-HEAD]`. `rg '"name": "@joolie-boolie'` → zero tracked matches. BEA-718 (`14a521e2`) landed 2026-04-13 and completed the code rebrand. BEA-719 (`45a84e89`) completed the doc rebrand. `a7369f16` swept stray references in skills. | **DISAGREES — stale, rebrand is done** |
| Target scope `@hosted-game-night/*`, "currently still `@joolie-boolie/*` on main" | "Branding" §2 | **FALSE.** See above: scope already migrated at HEAD. | **DISAGREES — stale** |
| Target localStorage prefix `hgn-`, "currently still `jb-` on main" | "Branding" §3 | **FALSE.** `rg 'jb-' apps/` → zero matches; `rg 'hgn-' apps/` → 29 hits across 18 files (e.g., `apps/bingo/src/lib/sync/session.ts`, `apps/bingo/src/stores/*.ts`). Migration complete. Note: `hgn:` statistics storage keys also present (per commit message). `[live-verified]` via Grep | **DISAGREES — stale** |
| `host-bingo.com` / `host-trivia.com` live | "Domains" §1-2 | **TRUE.** `curl -s -o /dev/null -w "%{http_code}\n" https://host-bingo.com/api/health` → `200`. Same for host-trivia. `[live-verified]` | **AGREES** |
| `bingo.joolie-boolie.com` / `trivia.joolie-boolie.com` still attached as aliases | "Domains" §3 | **TRUE.** `dig +short bingo.joolie-boolie.com` → Vercel IPs, resolving. `[live-verified]` | **AGREES** |
| `joolie-boolie.com` apex 404s | "Domains" §4 | Not probed in this iteration, but consistent with OQ3/OQ resolution pattern. | **PROBABLY AGREES (unverified)** |
| `beak-gaming.com` subdomains legacy, still attached | "Domains" §5 | **TRUE.** `dig +short bingo.beak-gaming.com` → `216.150.1.193, 216.150.16.1` (Vercel IPs). Still resolving. `[live-verified]` | **AGREES** |
| "NEVER use `--no-verify` on git commits" | "Subagent Patterns" | Policy claim, not verifiable factually. | **N/A** |
| Linear team ID `4deac7af-714d-4231-8910-e97c8cb1cd34`, URL slug `beak-gaming` | "Subagent Patterns" | Not probed this iteration (MCP access available but not needed for this claim). | **UNVERIFIED** |
| Playwright dark-mode cautionary tale (BEA-664) | "User Preferences" | Historical claim; not verifiable from source at HEAD. | **N/A (historical)** |
| Manual tests use `pnpm dev`, not `pnpm dev:e2e` | "User Preferences" | Consistent with `CLAUDE.md:17` at HEAD. | **AGREES** |
| Sentry tunnel at `/api/monitoring-tunnel` | "Observability" | `git ls-files apps/bingo/src/app/api/monitoring-tunnel/route.ts` exists, same for trivia. `[tracked-HEAD]` | **AGREES** |
| @vercel/otel gotcha with `VERCEL_OTEL_ENDPOINTS` + `spanProcessors: ['auto', …]` fix | "Observability" §3 | Technical claim about how the code works; matches pattern used in `apps/*/instrumentation.ts`. Not re-verified at byte level this iteration. | **AGREES (by pattern)** |
| Turbo passthrough trap for `NEXT_PUBLIC_FARO_URL` burned until `a717c61a` | "Observability" §4 | `git show a717c61a --stat` confirms the turbo.json change. `git show HEAD:turbo.json` line 19 now lists `NEXT_PUBLIC_FARO_URL` in `tasks.build.env`. `[tracked-HEAD]` | **AGREES** |
| Same pattern bit `SENTRY_AUTH_TOKEN` (in `4ee3aafc`) | "Observability" §4 | `git show 4ee3aafc --stat` confirms turbo.json touch. HEAD `globalPassThroughEnv` at line 4 contains `SENTRY_AUTH_TOKEN`, `SENTRY_DSN`. | **AGREES** |
| `NEXT_PUBLIC_AXIOM_INGEST_ENDPOINT` set in Vercel but has NO consumer in source | "Observability" §5 | `rg -l 'AXIOM' --glob '!node_modules/**'` → only `docs/drift-audit-2026-04/phase-1/area-4-claude-md-memory.md` + `docs/post-standalone-audit/phase-2/iterator-2-vercel-prod-env.md` (both are audit docs, not consumers). No source consumer. `[tracked-HEAD]` | **AGREES — still no consumer; BEA-710 still valid** |
| Filed as BEA-710 for investigation | "Observability" §5 | Not probed via Linear MCP this iteration. | **UNVERIFIED (Linear)** |

**MEMORY.md verdict: 3 sharply stale claims** — all 3 in the "Branding IN PROGRESS" block. Rebrand is **done**, not in progress. MEMORY.md should be updated to reflect completion. The Observability section is fully accurate. Domain claims are fully accurate. Policy and pattern claims are correct where testable.

---

## 4. Predictive Drift (next 4 weeks)

Surfaces most likely to drift again, sorted by vulnerability:

1. **`docs/E2E_TESTING_GUIDE.md` — HIGH risk.** 8 of 20 recent commits (40%) touched `e2e/` source; only 2 touched `docs/E2E_TESTING_GUIDE.md`. The fixture-rename wave (BEA-714/716) just invalidated `authenticatedXyzPage` / `waitForRoomSetupModal` and the guide has data-testid tables and fixture references that are already dead (Phase 1 Area 2 findings 2.1–2.4). Any new E2E work that cites this doc will hallucinate APIs. **Prediction:** next drift wave will concentrate here unless a dedicated E2E-guide rewrite PR is scheduled.

2. **`docs/MANUAL_TEST_PLAN.md` — HIGH risk.** 25 Phase 1 Area 3 findings remain. BEA-702 dropped the Room/Session sections but left behind contradictory test cases (Story 2.2, 3.2, 3.8 #1, 3.1 #1, 2.8 #5 per Area 3). Every new feature commit to bingo or trivia risks drifting the plan further because nothing in the CI gate requires the plan to be updated. **Prediction:** drift will grow monotonically here unless manual-test-plan-as-doctest tooling is adopted or the plan is converted to structured e2e specs.

3. **`docs/templates/APP_README_TEMPLATE.md` — MEDIUM risk BUT HIGH impact.** BEA-719 mechanically rebranded the string "joolie-boolie" but did **not** revisit semantic content. The template still prescribes Supabase, `SESSION_TOKEN_SECRET`, `@hosted-game-night/database`, `@hosted-game-night/auth` (Grep verified: `docs/templates/APP_README_TEMPLATE.md:90,95,171,172,268-270,277,283-285,352-353`; `PACKAGE_README_TEMPLATE.md:19,53`). **Agent-poison:** any agent asked to write a README for a new app will copy out the Supabase-prescribing template. **Prediction:** First new-app README request will inherit dead architecture if this isn't fixed.

4. **`apps/trivia/README.md` — MEDIUM risk.** Still lists removed Question Sets feature, `/question-sets` route, and `NEXT_PUBLIC_FEATURE_QUESTION_SETS` env var (lines 14, 61, 118). **Prediction:** this will drift further each time a trivia feature ships and the README is not synchronized.

5. **CLAUDE.md auto-generated stubs — SLOW DRIFT risk.** 22 of 26 CLAUDE.md files are 6-14-line `<claude-mem-context>` stubs with "# Recent Activity\n\n*No recent activity*" content. No claude-mem configuration found at `/Users/j/repos/beak-gaming-platform/.claude-mem` — these stubs are orphaned artifacts from a prior claude-mem install. **Prediction:** these won't update (source is gone) but they'll consume context space in every agent session. This is constant rather than growing, but it's persistent drag.

6. **`.worktrees/wt-BEA-677-layout-constraints/` CLAUDE.md pollution — HIGH local risk, zero systemic risk.** 30 CLAUDE.md files (verified by `find` count) from pre-standalone era. Any agent operating in that worktree gets auth/supabase/platform-hub context. **Prediction:** if anyone resumes that worktree, they get agent-poisoned instantly. Other 6 worktrees are clean.

7. **Legacy-domain aliases (`beak-gaming.com`, `joolie-boolie.com`) — ZERO-PROGRESS risk.** Quick Wins item 4 is still open 2 days after prior audit identified it. DNS still points at Vercel. Unless a Vercel domains cleanup is scheduled, these aliases persist indefinitely. **Prediction:** no organic resolution; needs a dedicated chore.

**Structural drift-gap analysis:**

Of the 20 commits in the window, exactly 1 is of the pattern "code commit that also updates associated docs inline" (BEA-719 touched CLAUDE.md files but that was itself the doc rebrand). The dominant pattern is "separate doc PR for separate docs work." This is healthier than "docs are never touched" but has a specific failure mode: **semantic drift survives string-level rebrands**. BEA-719 mechanically swept joolie-boolie → hosted-game-night but did not catch the Supabase-in-templates issue (Area 2 Phase 1 finding, re-verified above). Areas most at risk are ones where the brand string is already clean but the underlying architecture description is wrong.

---

## 5. Prior-Audit Known Unknowns: resolution status

Master scorecard:

| OQ | Prior status | Now | Resolution commit / source |
|----|--------------|-----|---------------------------|
| 1 | Unknown | **Resolved — project dead** | `75e87fe0` commit body |
| 2 | Unknown | **Resolved — Actions effectively disabled** | `gh api` live query; confirmed in `ec36f674` body |
| 3 | Unknown | **Resolved — DNS still points at Vercel** | live `dig` query |
| 4 | Product decision needed | **Resolved — option (a), `/api/health` added** | `31856c8e` |
| 5 | Dashboard blind spot | **Resolved (by inference) — flatline was real** | `a717c61a` commit body |
| 6 | Unknown | **Resolved — repo is public** | live `gh api` query |

**All six open questions from the prior audit are now answered** — 4 by landed commits, 2 by live probes during this audit iteration. None remain open.

---

## Resolved Questions

1. **Is claude-mem still configured to run?** Resolved: **No.** No `.claude-mem` directory at repo root. 22 stubs exist but the generator is not wired. Those stubs are historical artifacts — can be deleted safely.
2. **Is there a worktree-hygiene policy?** Partially resolved: MEMORY.md says "store in `.worktrees/wt-BEA-XXX-slug` format" and "run `./scripts/setup-worktree-e2e.sh` in each." But no cleanup cadence or pruning policy. 6 of 7 are clean; the outlier `wt-BEA-677-layout-constraints` (last touched 2026-03-11) is just forgotten.
3. **% of prior-audit recommendations landed:** URGENT = 1/3 landed + 1 invalidated + 1 unknown-open. Quick Wins = 3/8 landed + 1 partial. Important Investments = 1/3 landed + 1 partial + 1 open. OQs = 6/6 resolved. Overall: ~40-50% of actionable items landed, ~20-25% partial, ~30% still open. **Higher execution rate than the prior-audit framing implied was realistic in the 2-day window.**
4. **Velocity of doc updates vs code updates since 2026-04-11:** 10 code commits vs 4 doc commits (2.5:1). But doc commits are dedicated sprints, not side-effects, which is a better pattern than the raw ratio implies. See §1 analysis.
5. **Can we produce actionable rewrite specs for the top hotspots?** Scope for later iterators; Areas 2 and 3 reports have file:line evidence ready.
6. **Should `playwright.config.ts` E2E_TESTING flag + orphan comment be deleted?** MEMORY.md and `CLAUDE.md` both distinguish `pnpm dev` vs `pnpm dev:e2e`. The flag has consumers in `sentry.server.config.ts` and `instrumentation.ts` (per prior Iterator 3 Area 3 finding 3.1). **Answer: keep the flag, delete the misleading comment.** Hasn't been acted on.

## Remaining Unknowns

1. **Has `.secrets/observability-accounts.json` actually been rotated post-audit?** U2 can't be git-verified; `.secrets/` is gitignored. Action: ask user directly, or accept the risk posture of "unverified" and recommend rotation regardless.
2. **Did item 5 (trivia Vercel `NEXT_PUBLIC_FEATURE_QUESTION_SETS` `\n` corruption) get fixed on the live Vercel project?** Needs `vercel env pull` + `od -c` probe.
3. **Are orphan Vercel preview aliases still present (Quick Wins item 6)?** Needs `vercel alias ls`.
4. **Is `THE_TRIVIA_API_KEY` set in trivia Vercel production (item 7)?** Needs `vercel env ls` on the trivia project.
5. **Is BEA-710 (Axiom investigation) still open in Linear, and has it progressed?** Needs Linear MCP query — not run this iteration.
6. **Has CSP enforcing-mode migration (M3) been scheduled as a Linear issue?** Not yet visible in git. Needs Linear probe.

## Revised Understanding

- **The prior audit's action items were more actionable than they looked.** Within 2 days, the repo landed BEA-697 through BEA-719, hitting ~half the explicit items and gracefully invalidating several URGENTs.
- **The "what you run is correct, what you read is wrong" framing still holds** — the code-side cleanup (BEA-700 dead types, BEA-701 copy, BEA-716 fixture rename) outpaced the doc-side cleanup (BEA-702 doc sprint was one commit vs ~8 code commits). Area 2 and 3 Phase 1 reports confirm doc drift persists.
- **The rebrand (BEA-718/719) was a mechanical string-level operation.** It did not semantically re-audit content. Post-rebrand semantic bugs: Supabase still in templates, Question Sets still in trivia README, removed fixture APIs still in E2E guide. Any future rebrand should include a semantic-sweep step.
- **MEMORY.md drift is self-referential** — it claims "rebrand IN PROGRESS" when rebrand landed 2 days prior. This confirms the Phase 0 warning that MEMORY.md needs forward-only verification.
- **Open Questions 1-6 from prior audit are all resolved** (via mix of landed commits, live probes, and graceful invalidation). Prior audit's question set was well-scoped.
- **New surface area surfaced since prior audit:**
  - Turbo-passthrough env var class of bug (Faro + Sentry both bit it); explicit MEMORY.md entry captures the lesson.
  - Orphan worktree pollution (30 stale CLAUDE.md files); structural agent-poisoning vector.
  - claude-mem stubs orphaned (22 tracked stubs with dead generator); low-grade persistent context drag.
  - Repo is **public** (OQ6 resolved); Supabase key blob in git log may have been externally scanned — project is dead, so inert, but forensic impact is external not internal-only.

**One-sentence synthesis:** The post-standalone audit shipped roughly half its backlog in 2 days with excellent execution on code/config and weaker execution on docs; most remaining drift is in prose documentation surfaces that lack CI gates, and the rebrand sweep mechanically swapped strings without catching the template-still-prescribes-Supabase class of semantic drift.
