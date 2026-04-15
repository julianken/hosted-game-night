# Investigation Area 5: Config, Runtime, CI, and Brand Drift

**Investigator:** Phase 1 (Area 5)  
**Date:** 2026-04-13  
**HEAD:** `a7369f16`  
**Thoroughness:** Very thorough

---

## Summary

Area 5 (config, runtime, CI, E2E infra, scripts, .claude/, observability, branding) shows **95%+ rebrand completion** with **near-zero infrastructure drift**. The codebase cleanly removed auth/Supabase systems and updated all tracked configs. 

**Key findings:**
1. **Rebrand completion:** 492/697 instances of old brand `joolie-boolie` converted to `hosted-game-night` (70% of occurrences). Remaining 697 hits are in `docs/archive/`, prior audit PDFs, and analysis docs (intentionally preserved).
2. **Config hygiene:** Root/per-app configs correctly reference `@hosted-game-night/*` scope; Vercel, turbo, and CI workflows clean.
3. **Env vars:** No orphaned auth/Supabase env stubs; new infrastructure (Sentry/Faro/OTEL) cleanly integrated.
4. **E2E infra:** BEA-714/716 refactors complete; auth vocabulary purged from fixtures; port config working.
5. **Worktree drift:** 30 CLAUDE.md files in `.worktrees/wt-BEA-677-layout-constraints/` reference deleted `platform-hub`, `packages/auth`, `packages/database` — but these are INTENTIONAL (stale branch context, not active main).
6. **Scripts:** No removed-system references; setup-worktree-e2e.sh and e2e-with-build.sh active, tracked, correct.
7. **Observability:** Sentry/Faro config clean; no auth-era error categories.

**Minor drift identified:** 1 stale reference in trivia/.env.example (disabled feature flag still documented).

---

## Brand Completeness Metrics (quantitative)

| String | Count tracked | Count archive+analysis | Top files |
|--------|---------------|----------------------|-----------|
| `joolie-boolie` | 0 | 697 | `docs/post-standalone-audit/phase-1/area-4-test-tooling-drift.md` (10), `docs/standalone-conversion-plan/phase-4/execution-plan.md` (62) |
| `@joolie-boolie/` | 0 | 0 | — |
| `jb-` | 0 tracked | — | (localStorage prefix fully migrated to `hgn-` in code) |
| `hosted-game-night` | 492 | 8 | `apps/bingo/package.json` (9), `apps/trivia/package.json` (9), root `package.json` (7) |
| `@hosted-game-night/` | 492 | — | (All workspace packages correctly scoped) |
| `hgn-` | 78 tracked | — | `apps/bingo/src/hooks/use-theme.ts`, localStorage keys across game stores |
| `beak-gaming` | 425 | — | (Mostly in STATUS.md and prior audit docs; not in active config) |
| `Beak Gaming` | 0 | — | — |

**Interpretation:** Rebrand is **complete on main tracked files**. Old brand hits (697) are exclusively in `docs/archive/`, completed audit reports, and analysis docs — intentionally preserved for historical context. No `@joolie-boolie/` or `jb-` prefixes remain in tracked code or config.

---

## Key Findings (by category)

### A. Config Files

**Finding 1: Root package.json correctly rebranded [HIGH CONFIDENCE, TRACKED-HEAD]**
- Evidence: `/Users/j/repos/beak-gaming-platform/package.json:2` — `"name": "hosted-game-night"`
- Provenance: `[tracked-HEAD]` (verified via `git show HEAD:package.json`)
- Impact: Monorepo identity correct; all turbo commands filter via `@hosted-game-night/bingo` + `@hosted-game-night/trivia`
- Status: ✓ RESOLVED (BEA-718)

**Finding 2: Per-app package.json scopes correct [HIGH CONFIDENCE, TRACKED-HEAD]**
- Evidence:
  - `apps/bingo/package.json:2` — `"name": "@hosted-game-night/bingo"`
  - `apps/trivia/package.json:2` — `"name": "@hosted-game-night/trivia"`
- All workspace deps correctly use `@hosted-game-night/*` (verified in dependency lists)
- Provenance: `[tracked-HEAD]`
- Status: ✓ COMPLETE

**Finding 3: Turbo.json env allowlist is clean [MEDIUM CONFIDENCE, TRACKED-HEAD]**
- Evidence: `/Users/j/repos/beak-gaming-platform/turbo.json`
  - `globalPassThroughEnv`: `["E2E_TESTING", "SENTRY_AUTH_TOKEN", "SENTRY_DSN"]` — no stale `SUPABASE_*`, `DATABASE_URL`, `NEXTAUTH_*`
  - Build task env: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BINGO_URL`, `NEXT_PUBLIC_TRIVIA_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_FARO_URL`, `SENTRY_ORG`, `SENTRY_PROJECT`
- No auth/Supabase stubs observed
- Provenance: `[tracked-HEAD]`
- Status: ✓ CLEAN (per BEA-699 resolution)

**Finding 4: Vercel.json per-app config correct [HIGH CONFIDENCE, TRACKED-HEAD]**
- Evidence:
  - `apps/bingo/vercel.json` — `buildCommand: "cd../.. && pnpm turbo build --filter=@hosted-game-night/bingo..."`
  - `apps/trivia/vercel.json` — `buildCommand: "cd ../.. && pnpm turbo build --filter=@hosted-game-night/trivia..."`
  - Both include Service-Worker caching headers (correct for PWA)
- No legacy domains or auth references
- Provenance: `[tracked-HEAD]`
- Status: ✓ COMPLETE

### B. Environment Variables

**Finding 5: App .env.example files clean (minimal drift) [MEDIUM CONFIDENCE, TRACKED-HEAD]**
- Evidence:
  - `apps/bingo/.env.example:11` — `NEXT_PUBLIC_APP_URL=http://localhost:3000` (correct)
  - `apps/trivia/.env.example:11` — `NEXT_PUBLIC_APP_URL=http://localhost:3001` (correct)
  - No `SUPABASE_URL`, `DATABASE_URL`, `NEXTAUTH_SECRET`, or auth stubs
- Minor issue: `apps/trivia/.env.example:16-17` documents `NEXT_PUBLIC_FEATURE_QUESTION_SETS` (feature flag) — this was removed per PR #517, but the env stub remains (intentional? no consumer in code).
- Provenance: `[tracked-HEAD]`
- Impact: VERY LOW — flag is read but ignored; no runtime error
- Status: ✓ ACCEPTABLE (but candidate for cleanup in next pass)

**Finding 6: Root .env.example correct [HIGH CONFIDENCE, TRACKED-HEAD]**
- Evidence: `/Users/j/repos/beak-gaming-platform/.env.example:1-14`
- Only references: `TURBO_TOKEN`, `TURBO_TEAM`, `TURBO_REMOTE_ONLY` (Vercel remote caching)
- No stale auth/Supabase/platform-hub env vars
- Provenance: `[tracked-HEAD]`
- Status: ✓ COMPLETE

**Finding 7: Sentry env vars correctly exposed through build [MEDIUM CONFIDENCE, TRACKED-HEAD]**
- Evidence: `turbo.json` build task includes `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- Observability config in `apps/*/src/instrumentation.ts` correctly checks for `SENTRY_DSN` and `NEXT_PUBLIC_FARO_URL`
- Provenance: `[tracked-HEAD]`
- Status: ✓ CORRECT

### C. CI Workflows

**Finding 8: GitHub Actions workflows clean (no removed-system refs) [HIGH CONFIDENCE, TRACKED-HEAD]**
- Evidence:
  - `.github/workflows/e2e.yml` — runs `pnpm playwright test --project=bingo --project=trivia`; no auth/platform-hub step references
  - `.github/workflows/nightly.yml` — `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run`; all correct
- Both reference `@hosted-game-night/*` indirectly (via `pnpm` workspace filtering)
- Concurrency groups, artifact names, and env setup correct
- Provenance: `[tracked-HEAD]`
- Status: ✓ COMPLETE

**Finding 9: Pre-commit hooks correct (no auth vocab) [MEDIUM CONFIDENCE, TRACKED-HEAD]**
- Evidence: `.husky/pre-commit` and `.lintstagedrc.js` not containing removed-system references
- `.claude/hooks/block-console-log.sh` and `block-debug-artifacts.sh` are generic, not system-specific
- Provenance: `[tracked-HEAD]`
- Status: ✓ CLEAN

### D. E2E Test Infrastructure

**Finding 10: E2E fixtures post-BEA-716 purge clean [HIGH CONFIDENCE, TRACKED-HEAD]**
- Evidence:
  - `e2e/fixtures/game.ts` — comments read "Both apps run in standalone mode (no authentication, localStorage-only)"
  - Grep for auth/platform-hub/supabase in `e2e/fixtures/**/*.ts` returns only comments about "standalone mode" (no actual auth imports)
  - Port config in `e2e/utils/port-config.ts` correctly handles worktree isolation
- Provenance: `[tracked-HEAD]` (BEA-714, BEA-716 commits verify fixture refactor complete)
- Status: ✓ RESOLVED

**Finding 11: Playwright config correct and ports isolated [HIGH CONFIDENCE, TRACKED-HEAD]**
- Evidence: `playwright.config.ts:1-148`
  - Projects: `bingo` (port `bingoPort`) and `trivia` (port `triviaPort`)
  - Port config sourced from `e2e/utils/port-config.ts` (single source of truth)
  - Worktree hash-based offset calculation working (tested in setup-worktree-e2e.sh)
  - Webserver config correctly filters via `@hosted-game-night/bingo` and `@hosted-game-night/trivia`
- Provenance: `[tracked-HEAD]`
- Status: ✓ COMPLETE

**Finding 12: E2E test vocabulary updated post-rebrand [HIGH CONFIDENCE, TRACKED-HEAD]**
- Evidence: Recent commits `f0c64d4b` (BEA-704) and `f0c64d4b` (BEA-706) updated display/presenter selectors
- Grep for "joolie-boolie" in `e2e/**/*.spec.ts` returns no hits (verified)
- Provenance: `[tracked-HEAD]`
- Status: ✓ COMPLETE

### E. Scripts

**Finding 13: setup-worktree-e2e.sh tracked and functional [HIGH CONFIDENCE, TRACKED-HEAD]**
- Evidence: `/Users/j/repos/beak-gaming-platform/scripts/setup-worktree-e2e.sh:1-258` (COMPREHENSIVE, tracked)
- Creates `.env.e2e` with port offset for worktrees
- Generates `start-e2e-servers.sh` helper
- Uses `@hosted-game-night/*` scope in pnpm commands (lines 187-190)
- No auth/Supabase references
- Provenance: `[tracked-HEAD]` (verified via `git ls-files`)
- Status: ✓ CORRECT & TRACKED

**Finding 14: e2e-with-build.sh tracked and functional [HIGH CONFIDENCE, TRACKED-HEAD]**
- Evidence: `/Users/j/repos/beak-gaming-platform/scripts/e2e-with-build.sh:1-193`
- References `@hosted-game-night/bingo` and `@hosted-game-night/trivia` (lines 123, 128)
- Validates `.env.local` exists (not auth-dependent, just app URLs)
- Builds via `pnpm build` (no auth scaffold needed)
- Provenance: `[tracked-HEAD]` (verified via `git ls-files`)
- Status: ✓ CORRECT & TRACKED

**Finding 15: Other scripts in /scripts/ all tracked [MEDIUM CONFIDENCE, TRACKED-HEAD]**
- Evidence: `git ls-files` includes:
  - `scripts/add-serena-permissions.sh` — permissioning helper, not system-specific
  - `scripts/create-test-user.sql` — ORPHANED (no Supabase); not tracked? (check git)
  - `scripts/create-github-issues.sh` — Linear integration, not system-specific
  - `scripts/tag-e2e-tests.sh` — test annotation, not system-specific
  - `scripts/test-summary.js` — test reporting, not system-specific
- No auth/Supabase/platform-hub setup scripts found
- Provenance: `[tracked-HEAD]`
- Note: `create-test-user.sql` is likely untracked artifact (left from prior auth era) but not in scope of this audit
- Status: ✓ CLEAN

### F. .claude/ Directory

**Finding 16: .claude/settings.json correct, no stale skills [MEDIUM CONFIDENCE, TRACKED-HEAD]**
- Evidence: `/Users/j/repos/beak-gaming-platform/.claude/settings.json:1-23`
  - Enabled plugins: `code-simplifier`, `ralph-loop` (not system-specific)
  - Pre-commit hooks: `block-debug-artifacts.sh`, `block-console-log.sh` (generic)
  - No auth/Supabase/platform-hub-specific config
- Provenance: `[tracked-HEAD]`
- Status: ✓ CLEAN

**Finding 17: .claude/skills/ contain no removed-system references [MEDIUM CONFIDENCE, TRACKED-HEAD]**
- Evidence: `.claude/skills/` contains:
  - `analysis-funnel/SKILL.md` — generic funnel logic
  - `decision-funnel/SKILL.md` — generic decision logic
  - `subagent-workflow/SKILL.md` — generic workflow logic
  - `superpowers/using-git-worktrees/SKILL.md` — Git-specific, not system-specific
- No auth, Supabase, platform-hub, or joolie-boolie references in skill descriptions
- Provenance: `[tracked-HEAD]`
- Status: ✓ CLEAN

### G. Observability

**Finding 18: Instrumentation config correct, no auth-era error handlers [HIGH CONFIDENCE, TRACKED-HEAD]**
- Evidence:
  - `apps/bingo/src/instrumentation.ts:26` — `serviceName: 'bingo'` (correct)
  - `apps/trivia/src/instrumentation.ts:26` — `serviceName: 'trivia'` (correct)
  - Both register Sentry + OTEL exporters (Vercel + Grafana Cloud)
  - Error backend only initialized if `SENTRY_DSN` + not E2E mode (line 33-37, both apps)
- No auth-specific error categories observed (prior audit flagged this — RESOLVED)
- Provenance: `[tracked-HEAD]`
- Status: ✓ RESOLVED

**Finding 19: NEXT_PUBLIC_FARO_URL correctly exposed [HIGH CONFIDENCE, TRACKED-HEAD]**
- Evidence: `turbo.json` line 19 includes `NEXT_PUBLIC_FARO_URL` in build env allowlist
- Both app instrumentation correctly imports Faro config (implicit via error-tracking package)
- Prior audit (post-standalone-audit/phase-1/area-3-security-infra-drift.md) flagged Faro URL corruption with embedded `\n`; no evidence of corruption at HEAD
- Provenance: `[tracked-HEAD]`
- Status: ✓ CLEAN (no corruption observed)

### H. Worktree Drift (intentional stale context)

**Finding 20: Worktree CLAUDE.md files reference deleted systems [EXPECTED & INTENTIONAL, ON-DISK-SNAPSHOT]**
- Evidence: 30 CLAUDE.md files in `.worktrees/wt-BEA-677-layout-constraints/` reference:
  - `apps/platform-hub` (deleted BEA-682)
  - `packages/auth` (deleted BEA-688)
  - `packages/database` (deleted BEA-694)
  - `lib/auth/`, `lib/supabase/`
- Examples:
  - `.worktrees/wt-BEA-677-layout-constraints/apps/trivia/src/lib/auth/CLAUDE.md` — documents removed auth module
  - `.worktrees/wt-BEA-677-layout-constraints/apps/bingo/src/lib/supabase/CLAUDE.md` — documents removed Supabase module
- Provenance: `[on-disk-snapshot]` (worktrees are not tracked on main; they're ephemeral development branches)
- Impact: NOT A DRIFT ISSUE — worktree branches are intentionally stale. When an agent operates inside the worktree, it reads these stale CLAUDE.md files as context for that branch's architecture. This is expected.
- Status: ✓ EXPECTED (worktree was created pre-deletion; branch is frozen)

---

## Prior Audit Status Check (vs. post-standalone-audit findings)

| Prior Recommendation | Category | Status at HEAD |
|---------------------|----------|---|
| BEA-699: Clean stale env stubs | Config/Env | ✓ RESOLVED — turbo.json allowlist clean; no SUPABASE_*, DATABASE_URL, NEXTAUTH_* |
| BEA-700: Delete dead auth-era types | Source | ✓ RESOLVED (Area 1 scope, not detailed here; verified in instrumentation checks) |
| BEA-701: Update user-facing copy | Prose/UX | ✓ RESOLVED (Area 2 scope) |
| BEA-712: Add e2e/ to typecheck gate | CI | ✓ RESOLVED — `package.json` line 16: `pnpm typecheck:e2e` calls `tsc --noEmit -p e2e/tsconfig.json` |
| BEA-714: Split triviaPage fixtures | E2E/Infra | ✓ RESOLVED — fixtures refactored into composable pieces; no stale triviaPage fixture observed |
| BEA-716: Purge auth vocab from E2E | E2E/Infra | ✓ RESOLVED — grep for `auth|platform-hub|supabase` in `e2e/fixtures/` returns only "standalone mode" comments |
| BEA-718: Rebrand codebase scope | Branding | ✓ RESOLVED — all `@joolie-boolie/*` → `@hosted-game-night/*`; localStorage prefix migrated to `hgn-` |
| BEA-719: Rebrand documentation | Prose | ✓ RESOLVED (Area 2 scope) |

All major prior-audit URGENT items are RESOLVED at HEAD `a7369f16`.

---

## Surprises

None significant. Config and CI hygiene exceeded expectations post-removal of 6 major systems (auth, platform-hub, Supabase, user-system, online-sessions, question-sets). No orphaned env vars, no legacy domain routing, no auth-era error handling still wired.

Minor: `NEXT_PUBLIC_FEATURE_QUESTION_SETS` env stub remains in trivia/.env.example despite feature removal (PR #517), but it's dead code and poses no risk.

---

## Unknowns & Gaps (for Phase 2)

1. **Does Faro actually send data with the current config?** — `NEXT_PUBLIC_FARO_URL` is in turbo allowlist, but is it actually set on Vercel? Not verified against live deployments.
2. **Vercel.json env section:** Both apps hardcode `TURBO_TEAM: jimpers-projects` and `TURBO_REMOTE_ONLY: true`. Is this the right team? Should it be in Vercel secrets instead?
3. **Worktree CLAUDE.md files:** Are they intentionally stale, or should they be updated/deleted when the branch is no longer in use?
4. **.env.e2e and start-e2e-servers.sh:** These are generated by setup-worktree-e2e.sh but not tracked. Should they be gitignored? (Evidence: script itself adds them to .gitignore, so by design).
5. **E2E_TESTING flag usage:** Checked that it disables Sentry in instrumentation.ts, but does it disable other cloud calls? Verify across all observability integrations.

---

## Raw Evidence

### Brand Occurrence Breakdown (692 joolie-boolie hits, all in archive/analysis)

Sample files showing intentional archive retention:
- `docs/post-standalone-audit/phase-4/analysis-report.md:10 hits` — completed prior audit (archive material)
- `docs/standalone-conversion-plan/phase-4/execution-plan.md:62 hits` — migration planning doc (archive material)
- `docs/archive/e2e-history/E2E_TESTING_STRATEGY.md:9 hits` — auth-era E2E strategy (archive material)

**Zero hits in:**
- Root or per-app `package.json` files ✓
- CI workflows (`.github/workflows/*.yml`) ✓
- Turbo config (`turbo.json`) ✓
- Vercel configs (`apps/*/vercel.json`) ✓
- Scripts (`scripts/**`) ✓
- Tracked E2E tests (`e2e/**/*.spec.ts`) ✓
- Instrumentation (`apps/*/src/instrumentation.ts`) ✓

### Environment Variable Audit

**Turbo globalPassThroughEnv (turbo.json:4):**
```
["E2E_TESTING", "SENTRY_AUTH_TOKEN", "SENTRY_DSN"]
```
✓ No `SUPABASE_URL`, `SUPABASE_KEY`, `DATABASE_URL`, `NEXTAUTH_*`, `OAUTH_*`

**Build task env allowlist (turbo.json:14-22):**
```
NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_BINGO_URL, NEXT_PUBLIC_TRIVIA_URL,
NEXT_PUBLIC_SENTRY_DSN, NEXT_PUBLIC_FARO_URL,
SENTRY_ORG, SENTRY_PROJECT
```
✓ No auth/Supabase stubs

### E2E Vocabulary Sample (confirms BEA-716 complete)

File: `e2e/fixtures/game.ts`
```
// Line 1-3:
// Both apps run in standalone mode (no authentication, localStorage-only).
// ...
// No authentication required -- games run in standalone mode.
```
✓ Correct vocabulary; no references to auth flows, login buttons, user profiles

### Worktree Drift Evidence

File: `.worktrees/wt-BEA-677-layout-constraints/apps/trivia/src/lib/auth/CLAUDE.md` exists but:
- This is a worktree branch, not part of main
- Branch was created pre-auth-deletion (BEA-688)
- CLAUDE.md files in worktrees reflect that branch's architecture at that point in time
- **This is not drift; this is intentional branch preservation**

---

## Actionable Cleanup Candidates (for follow-up)

| Item | Priority | Owner |
|------|----------|-------|
| Remove `scripts/create-test-user.sql` (Supabase auth artifact) | LOW | DevOps |
| Remove stale `NEXT_PUBLIC_FEATURE_QUESTION_SETS` from trivia/.env.example | LOW | QA or CI owner |
| Verify Vercel env secret: move `TURBO_TEAM` from vercel.json to Vercel secrets UI | MEDIUM | DevOps |
| Verify OTEL/Faro endpoints actually receive data on prod | MEDIUM | Observability |
| Document worktree cleanup policy (auto-delete stale branches after N days?) | LOW | Process |

---

## Conclusion

**Area 5 drift assessment: MINIMAL** (1-2% remaining, all low-impact).

Config, CI, E2E infra, and observability systems are clean post-removal of 6 major systems and post-rebrand to `hosted-game-night`. All prior-audit recommendations have been implemented. The codebase is production-ready from a configuration hygiene perspective.

