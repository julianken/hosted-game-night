# Synthesis 2: Risk / Opportunity Lens

## Synthesis Approach

This synthesis partitions the Phase 1/2 evidence as a **threat model**, treating drift not as mere untidiness but as latent attack surface — with a distinction between (a) drift that is intrinsically harmful (security, false claims) and (b) drift that is harmful only when an AI agent enters a specific context (worktree CLAUDE.md, claude-mem stubs). Each risk is tagged with severity, likelihood, and a manifestation mode that names the exact failure sequence. I then plot risks on a 2x2 quadrant for triage and balance the picture with a Part B inventory of positive findings — the unspoken assumption of most audits is "everything found is broken," but this audit produced unusually strong positive signal (rebrand machine-complete, 6 open questions all resolved, claude-mem hypothesis correctly falsified) that deserves preservation because **those patterns are the leverage points** for future hygiene work.

## Core Narrative

The repository is in a **structurally healthy** state — code, config, and scope migrations are machine-clean. The drift lives in the **soft surfaces** (prose docs, manual test plans, agent context files) and in **legacy artifacts from past architectures** (orphaned worktrees, claude-mem stubs citing deleted OAuth/JWT code). In a human-only workflow, most of this drift would be low-priority cosmetic debt. But this is an **AI-agent-native** project ("developed exclusively with AI agents" per CLAUDE.md), which inverts the risk model: stale CLAUDE.md files and agent-readable fiction are no longer cosmetic — they are **context poisoning vectors** that silently produce incorrect code. A developer who reads `docs/templates/APP_README_TEMPLATE.md` will notice it says "Supabase." An AI agent scaffolding a new app from it will silently inherit that deleted architecture.

Overlaying this is a **latent-security** concern: the repository is public (`julianken/hosted-game-night`), and git history contains a Supabase service-role key blob (prior audit U1). The live credential is dead — the Supabase project has been deleted — but the **blob is still externally scannable**, which means (a) it signals to attackers that secrets have leaked here before, (b) it re-raises the question of whether other secrets are also in history, and (c) prior audit URGENT U2 (Sentry + Grafana token rotation) remains **open**, meaning at least one class of live credential has never been rotated post-leak-audit. The posture is "mostly clean, quietly leaky at the edges, and context-poisoning on the agent surface." Small, cheap fixes would cascade substantial improvements; large neglected fixes (U2, M3, documentation CI) should not remain open through another audit cycle.

## Part A: Risk Inventory

### Risk Summary Table

| # | Risk | Severity | Likelihood | Quadrant |
|---|------|----------|-----------|----------|
| R1 | Stale `.worktrees/wt-BEA-677/` CLAUDE.md files (30 docs) poison agents | High | Weekly | Q1 (action now) |
| R2 | `APP_README_TEMPLATE.md` prescribes deleted Supabase architecture | High | Monthly | Q2 (watch) |
| R3 | Public repo + historical Supabase key blob in git history | Medium | Rare (but persistent) | Q2 (watch) |
| R4 | Prior URGENT U2 — Sentry + Grafana token rotation open | High | Rare | Q2 (watch) |
| R5 | `docs/MANUAL_TEST_PLAN.md` 49% drifted — agents generate bad test prose | Medium | Weekly | Q1 (action now) |
| R6 | `docs/E2E_TESTING_GUIDE.md` references non-existent fixtures | Medium | Weekly | Q1 (action now) |
| R7 | 22 orphaned `<claude-mem-context>` stubs; 2 cite OAuth/JWT | Medium | Monthly | Q3 (hygiene) |
| R8 | MEMORY.md "rebrand IN PROGRESS" block is false | Low | Daily (this user's sessions) | Q3 (hygiene) |
| R9 | No CI gate for documentation staleness — every future feature re-drifts | High | Monthly (recurrence) | Q1 (action now) |
| R10 | Prior Important Investment M3 — CSP enforcing still open | Medium | Rare | Q4 (accept until revisited) |
| R11 | No worktree lifecycle policy — every merge increases poison surface | Medium | Monthly | Q3 (hygiene) |
| R12 | `apps/trivia/README.md` 19% churn — specific false claims about sessions | Medium | Weekly | Q3 (hygiene) |
| R13 | Vercel legacy env state (stale aliases, orphan vars) | Low | Rare | Q4 (accept) |

---

### R1 — Stale worktree CLAUDE.md files poison agents

- **Severity:** High — agent operating in `wt-BEA-677` gets wrong mental model of the entire platform; 30 files, 783 MB scale means encounter is near-certain during any session there.
- **Likelihood:** Weekly — any AI agent invoked inside that worktree reads its CLAUDE.md as truth.
- **Manifestation mode:** Claude (or another agent) is dispatched into `.worktrees/wt-BEA-677-layout-constraints/` to "continue BEA-677," reads platform-hub/Supabase/OAuth docs as authoritative, proposes a fix that references deleted architecture, burns a review cycle before the discrepancy is caught. Worse: agent edits code in that worktree based on assumed architecture, then that branch gets merged.
- **Affected audience:** AI agents primarily; secondarily developers who inspect a stalled worktree.
- **Evidence:** Phase 2 Iterator 3 — 7 orphaned worktrees, `wt-BEA-677` singled out with 30 stale CLAUDE.md files.
- **Mitigation class:** Remediation (delete worktrees) + prevention (lifecycle policy).

### R2 — APP_README_TEMPLATE still prescribes Supabase

- **Severity:** High — the template's purpose is to be *copied* to bootstrap new apps. Copying propagates deleted architecture into live code.
- **Likelihood:** Monthly — new apps are scaffolded rarely, but when they are, the template is the single source.
- **Manifestation mode:** A task to scaffold a new game ("apps/poker") begins by copying `APP_README_TEMPLATE.md`. The template instructs adding `@hosted-game-night/auth` and Supabase config. The agent writes an import that doesn't resolve, or worse, re-introduces the deleted packages as stubs.
- **Affected audience:** AI agents and developers scaffolding new apps.
- **Evidence:** Phase 2 packet: "APP_README_TEMPLATE.md ~55 lines / ~13% churn — still prescribes Supabase + auth packages." Phase 2 convergence: BEA-719 did string-swap, not semantic rewrite.
- **Mitigation class:** Remediation (rewrite template semantically).

### R3 — Public repo + historical Supabase key blob

- **Severity:** Medium — the specific leaked credential is *dead* (Supabase project deleted), so no live exfiltration path. But (a) blob is externally scannable via GitHub secret-scanning tools / trufflehog-style crawls, (b) presence of the blob signals "this repo has leaked secrets before" and invites further scanning, (c) implies other secrets may also be in history but unaudited.
- **Likelihood:** Rare (but persistent) — the blob does not expire and any automated scanner can find it; harm only manifests if an attacker uses it as a lead or finds a still-live secret nearby.
- **Manifestation mode:** Security scanner flags the repo; attacker enumerates git log for other secret-shaped blobs; if any live secret is found, exploitation begins. OR: GitHub's own secret-scanning flags it, creating a public vulnerability record.
- **Affected audience:** Security / ops; reputationally, the project owner.
- **Evidence:** Phase 2 packet: "URGENT U1 **INVALIDATED** (Supabase project deleted), BUT the blob remains in git history of a PUBLIC repo (new risk framing)."
- **Mitigation class:** Detection (audit git history for other secrets) + optional remediation (history rewrite, though heavy).

### R4 — URGENT U2: Sentry + Grafana token rotation still open

- **Severity:** High — Sentry auth token has sourcemap upload rights; Grafana token has telemetry write access. If either was exposed (history search not conducted), active exfiltration or tampering is possible.
- **Likelihood:** Rare — depends on whether tokens ever left a controlled environment; no evidence they did. But the prior audit flagged this as URGENT and nothing landed.
- **Manifestation mode:** If a token was in a prior commit / .env file / CI log, an attacker with that token can upload malicious sourcemaps (Sentry) or poison telemetry (Grafana). No current indicator of exploitation; but the lack of rotation means if exposure did occur, it is still active.
- **Affected audience:** Security; observability operators.
- **Evidence:** Phase 2 packet: "U2 Rotate Sentry + Grafana tokens — **OPEN** (no evidence of rotation)."
- **Mitigation class:** Prevention (rotate; this is operational).

### R5 — MANUAL_TEST_PLAN 49% drifted

- **Severity:** Medium — the plan is agent-readable and claims coverage for features that don't exist (sessions, question-sets). An agent running "manual verification from MANUAL_TEST_PLAN" will attempt flows that fail — not catastrophically, but wastefully.
- **Likelihood:** Weekly — every manual QA request reads this file.
- **Manifestation mode:** Agent dispatched to "run manual tests," opens MANUAL_TEST_PLAN, sees test case for online session creation, attempts to navigate to non-existent route, reports "test failed" when the feature is legitimately gone. Worse: agent files a bug against deleted feature.
- **Affected audience:** AI agents running QA; developers doing handoff.
- **Evidence:** Phase 2 Iterator 1: 17 KEEP / 24 REWRITE / 18 DELETE / 18 ADD of 85 cases → 49% drift.
- **Mitigation class:** Remediation (execute Iterator 1's rewrite spec).

### R6 — E2E_TESTING_GUIDE references non-existent fixtures

- **Severity:** Medium — fixtures were refactored in BEA-714 (split `triviaPage`); guide not updated. Agent writes test against stale fixture name, test fails to compile.
- **Likelihood:** Weekly — E2E is an active surface; 40% of recent commits touched `e2e/`.
- **Manifestation mode:** Agent tasked with adding a new E2E test reads the guide, imports a fixture that was removed/renamed in BEA-714, test fails at TypeScript compile, developer debugs the import before realizing the guide is wrong.
- **Affected audience:** AI agents writing E2E tests; developers.
- **Evidence:** Phase 2: 40% of commits touched `e2e/`, only 2 touched the guide; ~45 lines / ~8% churn specifically identified.
- **Mitigation class:** Remediation (5 surgical rewrites) + prevention (CI gate).

### R7 — 22 orphaned claude-mem stubs

- **Severity:** Medium — 20 of 22 are empty "no recent activity" stubs (effectively harmless noise). But 2 files contain substantive stale content: `apps/bingo/src/CLAUDE.md` has 5 JWT entries and `apps/trivia/src/CLAUDE.md` has an OAuth/CORS analysis — both referencing deleted architecture.
- **Likelihood:** Monthly — agents only read CLAUDE.mds in paths they operate in. The two poisonous ones are in hot paths (`apps/bingo/src`, `apps/trivia/src`).
- **Manifestation mode:** Agent dispatched to work in `apps/bingo/src/` reads the CLAUDE.md, sees 5 JWT bullet points, concludes the app has JWT auth, tries to integrate with it, fails.
- **Affected audience:** AI agents primarily.
- **Evidence:** Phase 2 Iterator 4 — 22 stubs confirmed, 2 poisonous files identified exactly.
- **Mitigation class:** Remediation (delete all 22, one commit) + prevention (document that claude-mem doesn't write tracked files, so these will not regenerate).

### R8 — MEMORY.md "rebrand IN PROGRESS" is false

- **Severity:** Low — only affects this specific user's sessions (MEMORY.md is user-scoped, not repo).
- **Likelihood:** Daily (for this user) — every Claude session on this repo starts by reading MEMORY.md.
- **Manifestation mode:** Claude reads "rebrand IN PROGRESS" + "@joolie-boolie/* still on main," acts on that model, e.g., warns user "remember the rebrand isn't done" when in fact it landed in BEA-718.
- **Affected audience:** This specific user's AI agent sessions.
- **Evidence:** Phase 2 packet: "Iterator 5 verified package.json scope is `@hosted-game-night/*`; prefix migration is complete. MEMORY.md is stale."
- **Mitigation class:** Remediation (update 3 claims in MEMORY.md).

### R9 — No CI gate for documentation staleness

- **Severity:** High — this is the root cause of ~all documentation drift in this audit. Without a gate, the same drift pattern will recur after every feature.
- **Likelihood:** Monthly — each sprint that lands code without corresponding docs re-establishes the drift window.
- **Manifestation mode:** Sprint N ships feature X with code + tests; docs are added in sprint N+1 or skipped entirely. In sprint N+2 an agent reads the docs, sees no mention of feature X, either re-invents it or uses deleted patterns that the docs still reference.
- **Affected audience:** All future work.
- **Evidence:** Phase 2 packet: "Manual test plan has no CI gate — drift will recur without one." Phase 2 velocity analysis: 40% of commits touched e2e/, only 2 touched the guide.
- **Mitigation class:** Prevention (CI gate for doc touches when code touches; docs-bot; section-level checksum).

### R10 — Prior Important Investment M3: CSP enforcing still open

- **Severity:** Medium — CSP in report-only mode means no active mitigation against XSS. Public-facing apps (host-bingo.com, host-trivia.com) operate with the riskier mode.
- **Likelihood:** Rare — direct XSS exploitation requires an injection vector that current code doesn't obviously expose.
- **Manifestation mode:** A future content-injection vulnerability (e.g., via trivia question text, user-provided display names) becomes exploitable because CSP is in report-only mode.
- **Affected audience:** End users if exploited; security posture in general.
- **Evidence:** Phase 2 packet: "M3 CSP enforcing — **OPEN**."
- **Mitigation class:** Prevention (enforce CSP).

### R11 — No worktree lifecycle policy

- **Severity:** Medium — each worktree created becomes a future poison vector once its branch merges. Without a policy, count grows monotonically.
- **Likelihood:** Monthly — worktrees are created per-BEA; 7 are already orphaned at audit time.
- **Manifestation mode:** Developer finishes BEA-XXX, merges, doesn't clean up worktree. Two months later an agent ends up in that worktree and reads months-old CLAUDE.md state.
- **Affected audience:** AI agents.
- **Evidence:** Phase 2 Iterator 3 — all 7 worktrees orphaned.
- **Mitigation class:** Prevention (lifecycle policy, post-merge cleanup hook).

### R12 — apps/trivia/README.md 19% churn

- **Severity:** Medium — trivia README is a high-read surface (developers opening the app folder).
- **Likelihood:** Weekly — any session touching trivia opens this file.
- **Manifestation mode:** README claims session/online-play features that were removed in BEA-657; agent references those features in new work, gets confused when they don't exist.
- **Affected audience:** AI agents and developers.
- **Evidence:** Phase 2 packet: "apps/trivia/README.md ~35 lines / ~19% churn."
- **Mitigation class:** Remediation (small rewrite).

### R13 — Vercel legacy env state

- **Severity:** Low — stale aliases and orphan vars are cosmetic; no functional impact detected.
- **Likelihood:** Rare — only manifests when someone audits Vercel env state.
- **Manifestation mode:** Developer updating env hits confusion about which alias is live vs legacy; minor time cost.
- **Affected audience:** Ops.
- **Evidence:** Phase 2 packet: Quick Wins "still-open items cluster around Vercel env state (legacy domain aliases, Faro flag cleanup, orphan vars, trivia keys)."
- **Mitigation class:** Remediation (env cleanup).

---

## Part B: Positive Findings

### P1 — Code + config drift is effectively zero

- **Why good:** Machine-checkable surfaces are clean. `package.json` is `@hosted-game-night/*`. `turbo.json`, `vercel.*`, CI configs all match current architecture. This is the strongest outcome a rebrand can produce.
- **Evidence:** Phase 2 packet opening: "code/config drift ~0 (rebrand + standalone conversion are machine-complete)." Iterator 5 verified package.json scope directly.
- **What enables it:** (a) The rebrand PRs (BEA-718/719) had grep-able scope, (b) pre-commit hooks run `pnpm lint`/`typecheck`/`test`, (c) Turbo tasks force consistent builds.
- **What could erode it:** Any future sweep that skips the grep-then-verify pattern.

### P2 — E2E fixture vocabulary purge worked (BEA-716)

- **Why good:** A dedicated BEA to purge auth-era vocabulary *from fixtures* landed cleanly. This is the pattern that could be applied to docs.
- **Evidence:** Commit `6d412fd5` "refactor(e2e): purge auth-era vocabulary from fixtures (BEA-716)."
- **What enables it:** Fixtures are code; they fail fast if they reference deleted types. Agent-readable prose has no such feedback loop.
- **What could erode it:** Fixture drift if future refactors add new auth-era vocabulary; but the precedent for purging-by-ticket is set.

### P3 — Rebrand worked at machine level

- **Why good:** `@joolie-boolie/*` → `@hosted-game-night/*` across all packages without a single broken import. Zustand persist/BroadcastChannel prefix `jb-` → `hgn-` also landed.
- **Evidence:** Phase 2 packet: BEA-718 commit `14a521e2`; Iterator 5 verified.
- **Reusable pattern:** Scoped, single-commit renames run via workspace tooling (pnpm recursive updates, Turbo-aware builds) scale cleanly when the rename is scope-only.
- **What could erode it:** Partial string-swap of semantic prose (the BEA-719 template gap).

### P4 — Funnel → landed-commits workflow produces results

- **Why good:** The prior audit's Phase 4 recommendations translated into landed commits BEA-697 through BEA-719, visibly in `git log`. This is the *second* audit funnel run on this repo, and the first one produced measurable change.
- **Evidence:** Phase 2 packet: "20 commits, 2026-04-11 → 2026-04-13"; Iterator 5 sweep showing 3/3 URGENT + 3/8 Quick Wins + 1/3 M items landed.
- **Meta-lesson:** Sequential audits work *if* recommendations are ticketed (BEA-###) and tracked. Open items (U2, M3, documentation CI) reveal the workflow's gap: it lacks a "parking lot" for items that span beyond one cycle.
- **What could erode it:** If this audit's findings don't translate to BEA-### tickets, next audit finds the same issues.

### P5 — All 6 Open Questions from prior audit resolved

- **Why good:** The questions were sharp enough that Phase 2 iterators could answer them definitively.
- **Evidence:** Phase 2 packet: "6 Open Questions from prior audit: ALL resolved."
- **What enables it:** Questions were well-scoped, answerable with `git log` / `git show` / file reads.
- **What could erode it:** Vague open questions without a specific artifact to check.

### P6 — Hypothesis falsification discipline

- **Why good:** Phase 1 hypothesized "claude-mem is producing stale stubs" (would have led to reconfiguring the tool). Iterator 4 falsified this — claude-mem doesn't write to tracked CLAUDE.md — and reframed the fix as a one-time deletion.
- **Evidence:** Phase 2 packet, Contradictions resolved section.
- **Meta-lesson:** The 5→5→3→1 funnel design allowed correction of a wrong hypothesis before it drove remediation. This is the audit methodology paying off.
- **What could erode it:** Compressing audit phases (skipping Phase 2 iteration) would lose this correction layer.

### P7 — Observability stack is actually working post-leak

- **Why good:** Despite U2 being open, Sentry + Grafana Cloud Tempo + Faro RUM are all live and receiving data (per MEMORY.md live status). The Faro `\n` bug (U3) landed, as did the deeper TURBO env fix.
- **Evidence:** MEMORY.md Observability section confirms live; Phase 2 packet: U3 landed in `a717c61a`.
- **What could erode it:** U2 unaddressed if a historical token exposure ever surfaces.

### P8 — Pre-commit hooks enforced

- **Why good:** CLAUDE.md explicitly forbids `--no-verify`; hooks run lint/typecheck/test on changed packages. This is a non-trivial commitment that has likely prevented many code-level drift incidents.
- **Evidence:** CLAUDE.md project instructions: "**NEVER use `--no-verify`**."
- **What could erode it:** Hook bypass pressure during hotfixes.

---

## Part C: 2x2 Risk Quadrant

```
                    SEVERITY
                  low        high
         high |  R8        |  R1, R5, R6, R9       |
              |  R7, R11   |                       |
              |  R12       |                       |
  LIKELIHOOD  |------------+-----------------------|
              |            |                       |
          low |  R13       |  R2, R3, R4, R10      |
              |            |                       |
```

**Quadrant 1 — Action now (high severity × high likelihood):**
- R1 — Stale worktree CLAUDE.md (wt-BEA-677, 30 files)
- R5 — MANUAL_TEST_PLAN 49% drifted
- R6 — E2E_TESTING_GUIDE references non-existent fixtures
- R9 — No CI gate for doc staleness

**Quadrant 2 — Watch (high severity × low likelihood):**
- R2 — APP_README_TEMPLATE prescribes Supabase (rare but catastrophic when triggered)
- R3 — Public repo + historical key blob (rare exploitation, persistent existence)
- R4 — Sentry + Grafana token rotation open (rare harm, high if realized)
- R10 — CSP still report-only

**Quadrant 3 — Hygiene (low severity × high likelihood, cumulative cost):**
- R7 — 22 claude-mem stubs (mostly harmless, 2 poisonous)
- R8 — MEMORY.md stale rebrand claim
- R11 — No worktree lifecycle policy (compounds R1 over time)
- R12 — apps/trivia/README.md 19% churn

**Quadrant 4 — Accept (low severity × low likelihood):**
- R13 — Vercel legacy env state

---

## Part D: Most Urgent Risk

**R9 — No CI gate for documentation staleness.**

Reasoning: R1, R5, R6, R11, R12 are all *symptoms* of the same underlying absence. Every remediation of R1/R5/R6/R12 will be re-undone within weeks unless a prevention layer exists. Fixing R9 is the only item whose payoff *compounds* — every other fix pays off once.

What addressing it unlocks:
- Forces future feature work to include doc touches (or explicitly opt out with reason).
- Makes the "string rebrand ≠ semantic rebrand" gap visible at PR-review time.
- Converts docs from lagging indicator (caught in audits) to coincident indicator (caught in PR).
- Creates a template for other hygiene gates (worktree cleanup, CLAUDE.md freshness checks).

Implementation can be cheap: a CI job that runs when `apps/`, `packages/`, or `e2e/` change and fails unless a paired `docs/` touch is present OR the PR title includes `[docs-skip]` with reason.

---

## Part E: Biggest Leverage Opportunity

**The "audit-funnel → ticketed-BEA → landed-commit" workflow (P4) is the biggest leverage point in this entire system.**

Evidence: The prior audit produced BEA-697 through BEA-719 as landed commits in 2 days. This is a **working organizational reflex** — findings become tickets, tickets become commits. Most audit processes die in a PDF; this one doesn't.

**The leverage move:** Take this audit's Phase 4 output and feed it directly into BEA-### ticket creation, with each risk R1-R13 getting a ticket, labeled by quadrant priority. Even better — automate: a script that parses Phase 3/4 synthesis and generates Linear issues with the Phase 1/2 evidence quoted in the description.

Why this is the biggest leverage point:
- **It's already proven to work** (prior audit → landed commits is evidence).
- **It scales to future audits** — the same mechanism will drain the next audit's findings.
- **It addresses R9 from a different angle** — if audit findings reliably become tickets, the "drift accumulates between audits" problem is less urgent because audits have teeth.
- **It preserves P6** — the hypothesis-falsification discipline becomes part of the process, not an accident of this run.

A smaller-but-related leverage move: promote `.claude/skills/subagent-workflow/SKILL.md` to explicitly include a step "if this work changes code that docs reference, update the docs in the same PR" — converts the mandatory workflow skill into the prevention layer R9 needs.

---

## Confidence

- **Risk inventory completeness:** High — all candidate risks from the prompt are evaluated and several additional ones surfaced (R11 lifecycle, R12 trivia README).
- **Severity/likelihood grading:** Medium-high — grading is qualitative but grounded in manifestation modes tied to specific evidence. Public-repo risk (R3) is the most contested; I've graded it Medium/Rare to avoid overclaim per the prompt's methodology note.
- **Positive findings:** High — P1-P8 each has direct evidence citation.
- **Quadrant placement:** Medium — grid edges are fuzzy (R2 could arguably be Q1 if "monthly" scaffolds tip to "weekly"; R4 could be Q1 if a historical exposure is discovered).
- **Leverage claim (Part E):** Medium-high — rests on the specific observation that prior audit → BEA-### tickets actually happened; the claim is that this is the lever, not a theoretical could-be.

---

## Blind Spots of the Risk/Opportunity Lens

1. **User-experience harms invisible:** This lens frames everything through developer/agent impact. Any risks that surface only via end-user effect (broken game session, sound glitch) aren't captured — but those are also largely out of drift-audit scope.
2. **Composability of risks not modeled:** Risks R1 + R11 compound (no lifecycle → more stale worktrees). R9 + R2 compound (no CI gate → template stays Supabase-stale). The 2x2 treats them independently.
3. **Severity grades are agent-centric:** An agent reading stale docs and a human reading them have different failure modes; I've weighted agent harm higher because CLAUDE.md explicitly says "developed exclusively with AI agents," but a reviewer focused on human-readable quality might re-grade.
4. **Positive findings can mask residual risk:** P1 ("code drift zero") is true *today*. The absence of a CI gate (R9) means the zero state is fragile. I've called this out in the Core Narrative but it's worth flagging as a lens limitation.
5. **No quantitative likelihood data:** "Weekly" / "Monthly" are estimates tied to audit-observable frequency (commit velocity, agent session cadence), not measured rates. A time-series of when drift was introduced vs. detected would sharpen this.
6. **Doesn't address out-of-scope surfaces:** archive dirs, prior-audit artifacts, superpowers docs — explicitly out of scope per Phase 0, but some may have drift-bleed if agents read them.

---

## Recommendations (high-level)

1. **Immediate (Q1 action-now):** Delete `wt-BEA-677` worktree (R1). Execute Iterator 1 MTP rewrite (R5). Execute Iterator 2 E2E guide rewrite (R6). Create a CI job for doc-staleness (R9) — simplest form first.
2. **This sprint (Q2 watch, prevent escalation):** Semantic-rewrite `APP_README_TEMPLATE.md` (R2). Rotate Sentry + Grafana tokens (R4). Audit git history for other secret-shaped blobs (R3).
3. **Next sprint (Q3 hygiene batch):** One-commit deletion of 22 claude-mem stubs (R7). Update MEMORY.md (R8). Draft + merge worktree lifecycle policy (R11). Rewrite apps/trivia/README.md (R12).
4. **Defer (Q4 accept + Q2 long-running):** CSP enforcing (R10) — separate security sprint. Vercel env cleanup (R13) — opportunistic.
5. **Meta (leverage):** Convert every Rx above into a Linear BEA-### ticket before this synthesis closes, using the prior-audit workflow as template. Consider promoting "same-PR doc updates" to a subagent-workflow mandatory step.
