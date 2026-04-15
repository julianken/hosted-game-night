# Drift Audit 2026-04 — Phase 0 Analysis Brief

**Artifact root:** `docs/drift-audit-2026-04/`
**Created:** 2026-04-13
**Git HEAD at start:** `a7369f16` (main)
**Prior related funnel:** `docs/post-standalone-audit/` (2026-04-11, completed)

---

## The Analysis Question

The user reports that since the last documentation pass (and since the prior `post-standalone-audit` funnel on 2026-04-11), several structural changes have shipped:

- **Auth removed** (BEA-683, BEA-684, BEA-686, BEA-688)
- **Platform-hub app removed** (BEA-682)
- **User system removed** (BEA-695, PR #516)
- **Supabase / database package removed** (BEA-694)
- **Online session / room mode removed** (BEA-656, BEA-657, BEA-658)
- **Question-sets feature removed** (PR #517)
- **Rebrand** joolie-boolie → hosted-game-night (BEA-718 codebase, BEA-719 docs)
- **Domain changes** (host-bingo.com, host-trivia.com live; joolie-boolie.com legacy)
- **E2E fixture composition + vocabulary purge** (BEA-714, BEA-716)

The question: **Where does drift remain between what the codebase now is and what the documentation, test plans, agent context files, config, and branding artifacts describe?**

The user specifically called out:
1. `docs/MANUAL_TEST_PLAN.md` — likely drifted across all the structural changes
2. **"Other dimensions you haven't thought of"** — open invitation to find drift surfaces beyond the obvious

## Assumptions and Unknowns

### Known knowns (established)
- The prior `post-standalone-audit` (HEAD `25cdc983`, 2026-04-11) found drift concentrated in non-executable surfaces (types, env stubs, docs, vocabulary). Its master finding: **"what you run is correct, but what you read is wrong."**
- Since then, many cleanup commits landed (BEA-697 through BEA-719). Rebrand was the last big wave.
- Repo's tracked app set is `apps/bingo` + `apps/trivia` only. `apps/bingo-voice-pack-temp` exists on disk but is not tracked — deleted via commit `a4738b94` but persisting as an untracked artifact (drift symptom).
- Multiple `.worktrees/` exist. At least `.worktrees/wt-BEA-677-layout-constraints/` retains CLAUDE.md files referencing `apps/platform-hub`, `lib/auth`, `lib/supabase` — i.e., pre-standalone agent context.
- Project is developed exclusively by AI agents. CLAUDE.md files, README files, and docs are load-bearing **agent context**, not just human reference material.

### Known unknowns (specific questions to answer)
- Which of the prior audit's **URGENT / Quick Wins / Important Investments** recommendations have actually been implemented since 2026-04-11? Which remain open?
- Is the rebrand complete? MEMORY.md claims "target scope: `@hosted-game-night/*` (currently still `@joolie-boolie/*` on main)" but BEA-718 commit message says rebrand landed — which is correct at HEAD `a7369f16`?
- Does `docs/MANUAL_TEST_PLAN.md` still reference auth flows, platform-hub navigation, or online-session flows that no longer exist?
- Do per-app and per-directory CLAUDE.md files accurately reflect the current file layout and architecture?
- Do E2E tests still carry auth-era vocabulary or reference removed features (BEA-716 was a purge, but did it catch everything)?
- Are there config files (`vercel.json` / `vercel.ts`, `turbo.json`, `.env.example`, `.github/workflows/*`) referencing removed systems, environment variables, or old domains?
- Does the root `/Users/j/.claude/projects/-Users-j-repos-beak-gaming-platform/memory/MEMORY.md` contain claims that are now stale?

### Suspected unknowns (gaps I haven't formed questions about yet)
- **Skills/plugins drift** — `.claude/skills/` may reference removed concepts or outdated project structure.
- **Linear label/workflow drift** — issue labels, states, templates may reference removed systems.
- **Scripts directory drift** — `scripts/*` may contain setup scripts for removed infrastructure (e.g., auth scaffolding, supabase seeders).
- **Screenshot/image drift** — README hero images and feature screenshots may show removed UI elements.
- **Observability config drift** — Sentry + Grafana/Faro setup was updated during standalone conversion; may still reference auth events or removed routes.
- **Archived doc cross-references** — live docs may link to `docs/archive/` paths that exist but are stale.
- **localStorage key / BroadcastChannel prefix migration** — `jb-` → `hgn-` rebrand: is the prefix swap actually complete in code? Does it break existing user state?

## Analysis Domains

This analysis spans the following domains (guides agent-type selection):

- **Architecture** — tracking what-is vs. what-docs-say for the system layout
- **Developer Experience** — AI agent context file hygiene, onboarding accuracy
- **Testing** — E2E vocabulary, manual test plan, fixture composition
- **DevOps/Infra** — Vercel config, env vars, CI workflows, domains
- **Documentation** — Prose accuracy across docs/, READMEs, and inline
- **UI/Visual** — screenshots, copy, any residual auth/hub UI elements

## Quality Criteria (weighted before investigation)

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Evidence strength | 30% | Every drift claim cites file:line, git history, or tool output. Especially critical given the prior audit's Phase 1 errors from reading stale on-disk artifacts as authoritative. |
| Completeness | 20% | Covers the dimensions the user explicitly named AND the "other dimensions" angle. |
| Accuracy | 20% | Distinguishes `[tracked-HEAD]` vs. `[on-disk-snapshot]` vs. `[live-verified]` per prior audit's provenance framework. |
| Actionability | 15% | Each finding is something someone could fix or close-out in a commit. |
| Nuance | 10% | Distinguishes real drift from intentional archive-retention. Acknowledges prior audit overlap. |
| Clarity | 5% | Well-organized for a senior AI-native developer audience. |

## The Five Investigation Areas

### Area 1 — Source Code Residual References
**Target:** `apps/`, `packages/`, `e2e/` (tracked source only)

**Investigator task:**
Find dead/stale code references to removed systems. Includes:
- Dead imports, type references, commented-out code
- Residual joolie-boolie / beak-gaming references (vs. hosted-game-night brand)
- `jb-` localStorage/BroadcastChannel prefixes still in source
- Old scope `@joolie-boolie/*` imports or package.json references
- References to removed packages (`@joolie-boolie/auth`, `@joolie-boolie/database`, `@joolie-boolie/platform-hub`)
- References to removed features (online sessions, question sets, rooms, auth, user profiles, OAuth)
- Dead `FEATURE_*` flags referencing removed functionality

**Starting points:** `git log` since `25cdc983` for rebrand + cleanup commits, `git ls-files` for scope, then ripgrep across tracked files.

**Do NOT:** investigate `.worktrees/`, `node_modules/`, `.turbo/`, `docs/archive/`. Do NOT read untracked files as authoritative — check `git ls-files` first.

### Area 2 — Prose Documentation Accuracy
**Target:** `README.md` (root), `docs/*.md` excluding `docs/CLAUDE.md` (separate area), excluding `docs/archive/`, excluding `docs/MANUAL_TEST_PLAN.md` (separate area), plus app-level `apps/*/README.md` if present.

**Investigator task:**
Audit prose documentation for post-standalone + post-rebrand accuracy. Ask of each doc:
- Does it describe the current standalone 2-app architecture?
- Does it reference removed infrastructure (auth, platform-hub, Supabase, user system, online sessions, question sets)?
- Does it use the new brand ("Hosted Game Night") consistently?
- Does it link to pages/paths that still exist?
- Does it list commands that still work?
- Does the `docs/ARCHITECTURE.md` accurately reflect the current module boundaries?
- Does `docs/E2E_TESTING_GUIDE.md` reflect current e2e/ structure after BEA-714/716 refactors?
- Does `docs/ALERTING_SETUP.md`, `docs/security-log.md`, `docs/templates/*` describe current state?
- Verify: which of the prior audit's `docs/` recommendations were executed?

**Starting points:** `ls docs/`, cross-reference against prior audit's Section H (Recommendations) to identify "still-open" items.

### Area 3 — Manual Test Plan Deep Dive
**Target:** `docs/MANUAL_TEST_PLAN.md` only (full file, every section)

**Investigator task:**
The user explicitly called this out. Audit every test case for drift:
- Does the test case still apply to a standalone localStorage-only app?
- Are there steps that reference auth flows, login UI, user profiles, platform-hub, online sessions, room joining, question-set management?
- Are the test counts / pass-fail statistics still accurate at HEAD `a7369f16`?
- Are there new features that shipped (e.g., `/api/health` endpoint, SetupGate changes, trivia question-creation guide, template stores) without corresponding test coverage in the plan?
- Do keyboard shortcuts listed match current app implementations?
- Are the execution history dates useful, or are they stale snapshots pretending to be authoritative?
- Is there coverage of the dual-screen / presenter flows post-selector-drift (BEA-704, BEA-706)?
- Does the plan reference BEA issues that no longer exist or have changed scope?

**Starting points:** Read MANUAL_TEST_PLAN.md top to bottom. Cross-reference test cases against current source in `apps/bingo/src/app` and `apps/trivia/src/app`.

### Area 4 — Agent Context Files (CLAUDE.md Hygiene + Context Rot)
**Target:** EVERY `CLAUDE.md` file Claude Code can read when operating in this repo tree:
- Root `CLAUDE.md`
- `docs/CLAUDE.md`
- `apps/bingo/CLAUDE.md`, `apps/trivia/CLAUDE.md`
- `apps/*/src/**/CLAUDE.md` (stores, components/presenter, hooks, lib/game, lib/sync, etc.)
- `packages/*/CLAUDE.md`, `packages/*/src/**/CLAUDE.md`
- `scripts/CLAUDE.md`
- `.worktrees/*/CLAUDE.md` and `.worktrees/*/**/CLAUDE.md`

**Investigator task:**
The prior audit explicitly excluded `.worktrees/` from scope — this investigation INCLUDES them because Claude Code reads those CLAUDE.md files when operating inside worktrees. They are live agent context, not archive material.

For each CLAUDE.md file:
- Does it reference removed paths (`apps/platform-hub`, `packages/auth`, `packages/database`, `lib/auth/`, `lib/supabase/`)?
- Does it contradict the root CLAUDE.md (e.g., different tech stack claims, different command sets, different auth assumptions)?
- Does it describe files that no longer exist?
- Does it use old brand names or scope names?
- Is the `docs/CLAUDE.md` auto-generated stub providing any value, or is it dead weight?
- **Worktree-specific:** which worktrees still have stale pre-rebrand / pre-standalone CLAUDE.md files? Measure: how many stale CLAUDE.md files exist across worktrees?
- Cross-file consistency: if root CLAUDE.md says X and a sub-directory CLAUDE.md says Y, flag it.

**Special sub-task — Memory drift:** Also audit `/Users/j/.claude/projects/-Users-j-repos-beak-gaming-platform/memory/MEMORY.md` and its sibling memory files. Check claims like "rebrand IN PROGRESS", "target scope @hosted-game-night/* (currently still @joolie-boolie/* on main)" against actual HEAD state. Flag memory records that are now stale post-commits.

**Starting points:** `find . -name CLAUDE.md -not -path "./node_modules/*"` and `/Users/j/.claude/projects/-Users-j-repos-beak-gaming-platform/memory/`.

### Area 5 — Config, Runtime, CI, and Branding Drift
**Target:** Everything non-source, non-prose:
- `vercel.json` / `vercel.ts` (if present)
- `turbo.json`
- Root `package.json`, `apps/*/package.json`, `packages/*/package.json`, `pnpm-workspace.yaml`
- `.env.example` (root + per-app)
- `.github/workflows/*`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/*` if any
- `scripts/*`
- `e2e/` directory (tests + fixtures + config, but treat test vocabulary/fixture-composition drift as in-scope here, NOT in Area 1)
- `playwright.config.*`, `vitest.config.*` at any scope
- `.claude/*` (skills, plugins, any project-level agent config)
- Observability config: `instrumentation.ts`, Sentry config, Faro config
- Branding drift measured systematically:
  - `joolie-boolie` vs. `hosted-game-night` vs. `beak-gaming` vs. `Hosted Game Night`
  - `@joolie-boolie/*` vs. `@hosted-game-night/*` package scope
  - `jb-` vs. `hgn-` localStorage/BroadcastChannel prefix (cross-check migration vs. cutover)
  - Domain references: `joolie-boolie.com`, `beak-gaming.com`, `host-bingo.com`, `host-trivia.com`
- Linear team/project references

**Investigator task:**
- Find every config + CI + scripts + env reference that still names a removed system
- Measure how complete the rebrand is (by count of stale-brand hits vs. new-brand hits across config)
- Identify env vars that are set but have no consumer, and consumers that reference missing env vars
- E2E test fixture vocabulary: post-BEA-716 (auth-era vocab purge), are there stragglers?

**Starting points:** `rg -l "joolie-boolie|@joolie-boolie|jb-|beak-gaming|platform-hub|supabase|\\bauth\\b" --glob '!node_modules' --glob '!docs/archive' --glob '!*.md'` then narrow.

---

## Scope Boundaries

### In scope
- All tracked files at HEAD `a7369f16` in `apps/`, `packages/`, `docs/` (non-archive), `e2e/`, `scripts/`, `.github/`, `.claude/`, root config
- `.worktrees/*/CLAUDE.md` files specifically (agent context reads)
- `/Users/j/.claude/projects/-Users-j-repos-beak-gaming-platform/memory/MEMORY.md` and sibling memory files

### Out of scope
- `docs/archive/*` — archived intentionally; drift there is expected
- `docs/*-analysis/`, `docs/*-decisions/`, `docs/*-plan/`, `docs/*-audit/` — these are prior funnel artifacts; don't re-audit their internal consistency, but DO flag if live docs link to them and they're now misleading
- `node_modules/`, `.turbo/`, `.next/`, `.playwright-report/`
- Non-CLAUDE.md files inside `.worktrees/` — too noisy; worktrees are ephemeral
- `docs/superpowers/` — skill infra, not project docs
- Actual implementation of fixes (this is a report-only pass)
- Rewriting the prior `post-standalone-audit` — instead, VERIFY which recommendations were implemented

### Time caveat
- HEAD at start: `a7369f16`. If acting on this report more than 2 weeks after 2026-04-13, re-verify single-command probes before executing fixes.
- The prior audit's findings are reference material, not ground truth — verify current state before acting on any "still open" label.

## Non-goals

- Producing an implementation plan for fixes (out of scope; this is analysis)
- Opening Linear issues (report only)
- Touching code
- Rewriting documentation (identify drift, don't fix it)
- Defending vs. criticizing architectural decisions (describe what's there, not whether it should be)
