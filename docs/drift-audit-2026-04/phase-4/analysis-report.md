# Drift Audit 2026-04: Final Analysis Report

**Funnel:** Phase 4 of 4
**Repo:** `julianken/hosted-game-night` (PUBLIC)
**Branch / HEAD:** `main` at `a7369f16`
**Verified against:** Repo state at main HEAD `a7369f16` on 2026-04-13
**Re-validate before acting if more than 2 weeks have passed.**
**Prior related funnel:** `docs/post-standalone-audit/` (2026-04-11, HEAD `25cdc983`, COMPLETE)

---

## A. Executive Summary

The prior audit at HEAD `25cdc983` left a single sharpened finding: **what you run is correct, but what you read is wrong.** Two days and twenty commits later, at HEAD `a7369f16`, this differential audit confirms that framing and extends it in the direction the prior audit explicitly excluded: **what the AI agent reads most authoritatively drifts fastest, and the surfaces most load-bearing for agent cognition have no lifecycle, no gatekeeper, and no freshness signal.** The rebrand (BEA-718/719) and standalone conversion landed cleanly at the machine layer — package scope is `@hosted-game-night/*`, the `hgn-` prefix is live, TypeScript compiles, E2E fixtures are purged, and code drift is effectively zero. All drift concentrates on the unenforced soft surfaces: prose docs, the manual test plan, templates that prescribe deleted architecture, 22 orphaned `<claude-mem-context>` stubs (two actively citing deleted JWT and OAuth analysis), 7 unmanaged worktrees (one containing 30 pre-standalone CLAUDE.md files that will poison any agent that opens it), and a user-scoped MEMORY.md that still claims the rebrand is in progress two days after it shipped. The one surprise is reframing rather than discovery: the repo is public (`julianken/hosted-game-night`), which converts the prior audit's "invalidated" Supabase key leak from a dead issue into an externally-scannable historical blob and elevates the open Sentry/Grafana token rotation (prior U2) from lingering hygiene into latent security exposure. The master finding of this audit is not new drift per se — it is the observation that **the cleanup itself produces new drift** (the rebrand string-swap reinforced Supabase references in templates by making the scope look current), and that **the repository's biggest prevention leverage already exists** in the form of the audit-funnel → BEA-ticket → landed-commit reflex the prior cycle proved out. The decisive gap is not inventory but measurement: no one knows what drift costs per agent-session, so the question of whether to invest in a CI gate for doc staleness cannot yet be answered from evidence.

## B. Analysis Question & Scope

The question — restated from Phase 0 — is where drift remains between what the codebase IS at HEAD `a7369f16` and what the documentation, test plans, agent context files, config, and branding artifacts CLAIM it is, after both the auth/platform-hub/user-system/Supabase removal wave (BEA-682 through BEA-695) and the `joolie-boolie` → `hosted-game-night` rebrand (BEA-718/719). In scope are tracked source files across `apps/`, `packages/`, and `e2e/`; prose documentation in the root and `docs/` tree (excluding archives); `docs/MANUAL_TEST_PLAN.md`; every `CLAUDE.md` file both tracked and on-disk; `/Users/j/.claude/projects/.../memory/MEMORY.md`; and configuration surfaces across `vercel.*`, `turbo.json`, `package.json`, `.env*`, `.github/`, `scripts/`, `.claude/`, and branding-count sweeps. Explicitly out of scope are `docs/archive/*`, `node_modules/`, the prior audit's artifacts themselves, the `docs/superpowers/` and `docs/*-analysis/` trees (referenced only for stale cross-links), and any implementation-level fix work. This audit is differential: it does not re-audit issues the prior funnel already closed, only verifies which of its recommendations landed, what new drift accrued since 2026-04-11, and what the prior audit deliberately excluded — specifically the `.worktrees/*/CLAUDE.md` surfaces and the user-scoped MEMORY.md. The analysis reflects the repository state as of 2026-04-13; any action taken more than two weeks after that date should re-verify against a current `git log` before acting on the recommendations below.

## C. Table of Contents

- **A. Executive Summary** — Master finding, the one surprise, and the "what the agent reads drifts fastest" extension to the prior audit's thesis.
- **B. Analysis Question & Scope** — Restated Phase 0 question, inclusions, exclusions, and the time caveat that bounds the report's validity.
- **C. Table of Contents** — This section.
- **D. Methodology** — The 5→5→3→1 funnel shape, which MCP tools gathered evidence at each phase, the Phase 1→Phase 2 verification pattern that caught a wrong hypothesis, and the provenance framework that disciplines every claim in this report.
- **E. Key Findings** — Organized by five themes — enforced vs. advisory surfaces, string ≠ semantic rebrand, agent context has no lifecycle, write-once test plans, and public-repo reframing — with findings sorted by confidence × impact.
- **F. Analysis & Implications** — How themes compound, structural risks, positive patterns to preserve (notably the funnel→ticket workflow), which decisions the evidence does and does not unlock.
- **G. Confidence Assessment** — Strongest, moderate, and weakest claims with known blind spots of the audit itself.
- **H. Recommendations** — Grouped by quadrant: URGENT, action-now, important-investments, hygiene-batch, defer/accept. High-level work categories, not implementation specs.
- **I. Open Questions** — The four divergence resolutions this audit made explicit, plus the remaining gaps (including the one meta-question: operating cost of drift).
- **J. Appendix: Evidence Index** — A table mapping each major finding to its Phase 1/2 source file, provenance tag, and traceable location.

## D. Methodology

This audit executed the analysis-funnel skill's 5→5→3→1 pattern: five Phase 1 investigators with distinct area ownership (source code, prose docs, manual test plan, agent context, config), five Phase 2 iterators that verified and extended Phase 1 findings with specific command outputs, three Phase 3 synthesis lenses (thematic, risk/opportunity, gap/implication), and this single Phase 4 unified report. Phase 1 investigators used `git ls-files` and `git show HEAD:path` to verify tracked state, `grep` across scoped directories to find residual references, and file reads to build local inventories. Phase 2 iterators ran probes Phase 1 called out as needing verification — for example, Iterator 4 ran `grep -c '<claude-mem-context>'` across tracked CLAUDE.md files and disassembled the stubs to falsify Phase 1's hypothesis that claude-mem was writing stale output; Iterator 5 ran `gh api repos/julianken/hosted-game-night --jq .visibility` and confirmed the repo is public. Phase 3 synthesized the roughly eighty finding-nodes through three lenses instructed not to see each other's output, producing convergent and divergent claims this Phase 4 report resolves.

The methodology inherits one critical discipline from the prior audit's Phase 1 errors: every finding carries a provenance tag — `[tracked-HEAD]` when verified against `git show HEAD:path` or `git ls-files`, `[on-disk-snapshot]` when found on disk without git verification, and `[live-verified]` when confirmed against an external live system such as the Vercel CLI or the GitHub API. The report uses that framework throughout Section E. A second discipline — "don't duplicate the prior audit" — means recommendations the prior audit resolved (BEA-697 through BEA-719 landed) are noted as status-tracked but not re-argued; only new drift, deliberately-excluded dimensions, and still-open prior items appear as findings. The prior audit's framing is treated as a lens, not a template: this audit's job was to test whether two days of rebrand cleanup undermined the framing or deepened it. The answer is the latter.

A noteworthy positive signal about the methodology itself: the funnel design caught one wrong hypothesis. Phase 1 Area 4 inferred that the 22 orphaned `<claude-mem-context>` stubs were live output from the claude-mem MCP tool polluting tracked files; Iterator 4 falsified this by reading the git log of those files and confirming they were one-time February 2026 commits with no subsequent writes. The correction changed the recommendation from "reconfigure the tool" to "delete the stubs" — a structurally different action. That self-correcting pattern is the reason this report is more confident about dispositions than the prior audit was about its initial hypotheses.

## E. Key Findings

Findings are organized by five themes from Synthesis 1 that describe *mechanisms* of drift rather than individual instances. Within each theme, findings are ordered high-confidence-first and high-impact-first. Every finding traces to a Phase 1/2 source via the cross-references in Section J.

### Theme 1 — Enforced vs. Advisory Surfaces: The Compiler Is the Only Gatekeeper

The single most generative observation from this audit: every drift finding maps to a surface with no automated check, and every clean finding maps to a surface that TypeScript, ESLint, Vitest, or pre-commit hooks police. The asymmetry is near-total; the drift is the shadow cast by the compiler's blind spots.

| # | Finding | Confidence | Provenance | Evidence | Impact |
|---|---------|------------|------------|----------|--------|
| 1.1 | Code and config drift is effectively zero at HEAD `a7369f16`. | High | `[tracked-HEAD]` | Iterator 5 `git show HEAD:package.json` confirms `@hosted-game-night/*`; `turbo.json`, `vercel.*`, and CI configs match current architecture; `pnpm lint && pnpm typecheck && pnpm test:run` clean per pre-commit hook enforcement. | Baseline: the machine layer's cleanliness is the positive space against which all subsequent findings are drift. (Phase 2 Iterator 5; Phase 1 Area 1 Findings 1.1–1.7) |
| 1.2 | `docs/E2E_TESTING_GUIDE.md` contains selectors, fixture names, and spec file references that no longer exist. | High | `[tracked-HEAD]` | Findings 2.1–2.4: guide references `authenticatedXyzPage`, `waitForRoomSetupModal`, a data-testid table of removed selectors, and a spec file deleted in BEA-714. Iterator 5 velocity: 40% of commits touched `e2e/`, only 2 touched the guide. | Any agent writing an E2E test from the guide will hit a compile error on the imported fixture; the guide is partially fiction. (Phase 1 Area 2 Findings 2.1–2.4; Phase 2 Iterator 5) |
| 1.3 | ADR-001 references `e2e/fixtures/auth.ts`, which does not exist. | Medium | `[tracked-HEAD]` | Finding 2.12: `git ls-files e2e/fixtures/` shows no `auth.ts`. | Low direct impact (ADRs are historical), but illustrates the pattern. (Phase 1 Area 2 Finding 2.12) |
| 1.4 | Three manual test cases reference the removed `/question-sets` route. | High | `[tracked-HEAD]` | F3.5, F3.6, F3.25: test cases narrate flows through a route returning 404. | Agent running the MTP attempts non-existent flows and either reports false failures or hallucinates the removed feature. (Phase 2 Iterator 1) |
| 1.5 | `docs/plans/BEA-697-e2e-baseline-fix.md` records resolved bugs as still open. | Medium | `[tracked-HEAD]` | Finding 2.11. | Agents reading plan docs get an inflated backlog. (Phase 1 Area 2 Finding 2.11) |
| 1.6 | Root `README.md` and `docs/ARCHITECTURE.md` are currently clean. | High | `[tracked-HEAD]` | Findings 2.14, 2.15. | Positive confirmation of the mechanism — clean because they were rewritten in dedicated sprints (BEA-702, BEA-719), not because anything enforces correctness. They will drift next. (Phase 1 Area 2) |

**Theme mechanism.** Code cleanup is forced by compile-time errors. Doc cleanup is forced only by humans noticing. Between sprints, the gap grows at the rate of code change. BEA-719 was a string-swap sprint with no semantic review. The observable velocity confirms this: 40% of recent commits changed `e2e/` while only two changed the E2E guide.

### Theme 2 — String Rebrand ≠ Semantic Rebrand: the BEA-719 Methodology Gap

The rebrand swap (`joolie-boolie` → `hosted-game-night`, `@joolie-boolie/*` → `@hosted-game-night/*`, `jb-` → `hgn-`) passed because its check was a grep. But documents contain architectural claims in natural language that name deleted systems without using any brand strings. Any cleanup relying only on string matching leaves these in place — and, catastrophically, *reinforces* them by making the rebranded scope look current.

| # | Finding | Confidence | Provenance | Evidence | Impact |
|---|---------|------------|------------|----------|--------|
| 2.1 | `docs/templates/APP_README_TEMPLATE.md` prescribes Supabase auth, `@hosted-game-night/database`, and `@hosted-game-night/auth`. | High | `[tracked-HEAD]` | Findings 2.8–2.10: BEA-719 successfully rebranded the scope prefix while leaving references to packages deleted in BEA-688/BEA-694. "Uses Supabase for auth" survived because it contains no brand string. | Catastrophic-on-trigger: the template's purpose is to be copied when scaffolding a new app. Copy propagates deleted architecture into live code. (Phase 1 Area 2 Findings 2.8–2.10; Phase 2 Iterator 2) |
| 2.2 | `docs/templates/PACKAGE_README_TEMPLATE.md` contains the same class of drift. | High | `[tracked-HEAD]` | Finding 2.10. | Same mechanism, packages scope. (Phase 1 Area 2 Finding 2.10) |
| 2.3 | Root `CLAUDE.md` claims trivia has a "buzz-in feature." | High | `[tracked-HEAD]` | Finding A1: no meaningful implementation in `apps/trivia/src`. | Agents reading the root CLAUDE.md take this as a requirement and implement against a phantom spec. (Phase 1 Area 4 Finding A1) |
| 2.4 | `apps/trivia/README.md` has ~19% churn including false claims about online sessions (removed in BEA-657). | Medium | `[tracked-HEAD]` | Phase 2 packet; Iterator 1 cross-check. | High-read surface; drift here has weekly read cadence. (Phase 2 packet) |
| 2.5 | Worktree `.worktrees/wt-BEA-677/CLAUDE.md` still names "Joolie Boolie" + Supabase auth + OAuth. | High | `[on-disk-snapshot]` | Finding B2: BEA-719 ran against `git ls-files`; worktree CLAUDE.mds are on-disk-only. | Classed under Theme 3 for agent impact; mechanism is pure Theme 2. (Phase 1 Area 4 Finding B2) |

**Theme mechanism.** Prose describes concepts using many synonymous and unnamed references. A template saying "auth" implies a package; a doc saying "uses the online session model" implies removed infrastructure. These are architectural ghosts — references without names. BEA-719 was scoped as string-only, likely because a semantic rebrand would have required reading every doc. The hidden variable is cleanup budget versus semantic coverage, and the next cleanup wave will leave the same residue unless methodology changes.

### Theme 3 — Agent Context Has No Lifecycle and No Gatekeeper

The prior audit explicitly excluded `.worktrees/*/CLAUDE.md` files and the user-scoped MEMORY.md; this audit's charge was to investigate them. What it found is a category — "what the AI reads" — that spans multiple process boundaries (tracked files, on-disk files, user-home files, worktree files), has no owner, no rotation policy, no staleness signal, and no enforcement. Three independent investigators (Area 4, Iterator 3, Iterator 4) surfaced distinct instances of the same failure mode.

| # | Finding | Confidence | Provenance | Evidence | Impact |
|---|---------|------------|------------|----------|--------|
| 3.1 | `.worktrees/wt-BEA-677-layout-constraints/` contains 30 pre-standalone CLAUDE.md files (~783 MB), invisible to git, advertising Supabase and `@joolie-boolie/*`. | High | `[on-disk-snapshot]` | Finding B1 + Iterator 3 inventory. | An agent invoked with CWD in that worktree reads fiction as fact; may edit code against assumed architecture and merge the result. Single highest agent-poisoning vector in the repo. (Phase 1 Area 4 Finding B1; Phase 2 Iterator 3) |
| 3.2 | All 7 worktrees are orphaned; no lifecycle policy exists. | High | `[tracked-HEAD]` + `[on-disk-snapshot]` | Iterator 3: every worktree's branch has either merged or been abandoned. | Each merge monotonically grows the poison surface. (Phase 2 Iterator 3) |
| 3.3 | 22 `<claude-mem-context>` stubs exist across tracked CLAUDE.md files as orphaned one-time commits, NOT live claude-mem output. | High | `[tracked-HEAD]` | Finding A5 + Iterator 4 correction: area reported 21, iterator verified 22; git log shows one-time February 2026 commits with no subsequent writes. | 20 of 22 are empty "no recent activity" stubs; 2 carry substantive stale content — `apps/bingo/src/CLAUDE.md` (5 JWT bullet points) and `apps/trivia/src/CLAUDE.md` (OAuth/CORS analysis). Two poisonous ones are in hot paths. (Phase 1 Area 4 Finding A5; Phase 2 Iterator 4) |
| 3.4 | User-scoped `/Users/j/.claude/projects/-Users-j-repos-beak-gaming-platform/memory/MEMORY.md` claims "Branding IN PROGRESS" and `@joolie-boolie/* still on main`. | High | `[on-disk-snapshot]` | Finding C1: verified against HEAD `a7369f16` `package.json` (scope is `@hosted-game-night/*`) and git log (BEA-718 `14a521e2` landed). | Read at every session start. Every session begins with a false claim. (Phase 1 Area 4 Finding C1) |
| 3.5 | Root `CLAUDE.md` Context7 version pins lag actual package versions. | Medium | `[tracked-HEAD]` | Finding A2. | Agents fetch docs for outdated versions. (Phase 1 Area 4 Finding A2) |
| 3.6 | `packages/audio/` has no CLAUDE.md. | Low | `[tracked-HEAD]` | Finding A7. | Absence rather than misinformation; related lifecycle problem. (Phase 1 Area 4 Finding A7) |

**Theme mechanism.** These files accumulate context-rot because (a) they span process boundaries no single policy reaches; (b) they are read but rarely written; (c) worktrees are designed to be disposable but nothing enforces disposal; (d) MEMORY.md persists learning with no mechanism distinguishing "still true" from "invalidated"; (e) claude-mem stubs masquerade as live auto-output, and the truth only emerged after Iterator 4's disassembly.

### Theme 4 — Write-Once Test Plans and Documentation Run at a Different Cadence from Code

`docs/MANUAL_TEST_PLAN.md` (85 test cases, 49% drift per Iterator 1) and `docs/E2E_TESTING_GUIDE.md` (~8% churn) share a failure mode: written in a burst, never integrated into a process that re-executes them, they freeze while code evolves. Execution-history dates in the MTP make this literal — last runs were 2026-03-02, already a month stale at audit time.

| # | Finding | Confidence | Provenance | Evidence | Impact |
|---|---------|------------|------------|----------|--------|
| 4.1 | `docs/MANUAL_TEST_PLAN.md` has 49% drift: 17 KEEP / 24 REWRITE / 18 DELETE / 18 ADD out of 85 test cases. | High | `[tracked-HEAD]` | Iterator 1 full disposition per test case. | Plan claims coverage it cannot deliver; agents attempting deleted flows file false bugs or hallucinate features. (Phase 2 Iterator 1) |
| 4.2 | MTP test cases for removed room-setup modals (stories 2.2 and 3.2) remain. | High | `[tracked-HEAD]` | F3.1, F3.2. | Direct execution-impossible cases. (Phase 1 Area 3; Phase 2 Iterator 1) |
| 4.3 | Six feature-shipped-no-test-coverage gaps: `/api/health`, BEA-713 SetupGate, Trivia ChatGPT guide, BEA-685/687 template/preset stores, BEA-664 audio move, BEA-676/677 layout changes. | High | `[tracked-HEAD]` | F3.8–F3.14. | Plan is silent about real features — coverage illusion in reverse. (Phase 2 Iterator 1) |
| 4.4 | MTP execution-history entries all date from February / early March 2026. | High | `[tracked-HEAD]` | F3.16. | Plan is not "living" — a month-old snapshot masquerading as current. (Phase 2 Iterator 1) |
| 4.5 | MTP documents a "Skip to game controls" link that BEA-673 removed. | Medium | `[tracked-HEAD]` | F3.21. | Representative of silent-invalidation. (Phase 2 Iterator 1) |
| 4.6 | MTP has numbering gaps (tests 1–4 then 6–7). | Low | `[tracked-HEAD]` | F3.19. | Editorial error that persists because nobody re-reads. (Phase 2 Iterator 1) |

**Theme mechanism.** Test plans are written at feature-ship as a contract, executed a few times, then the author moves on. Subsequent feature work updates code and automated tests but not the plan. Every feature adds 0–2 test cases and implicitly invalidates 0–2 existing ones; the invalidation is silent, so drift grows linearly with feature count. The E2E guide follows the same pattern at a lower rate because it is read more often.

### Theme 5 — Public-Repo Reframing: Historical Leaks Outlive the Runtime

The prior audit's URGENT U1 — a leaked Supabase service-role key — was "invalidated" by Supabase project deletion. But `julianken/hosted-game-night` is public, so the leaked blob remains externally scannable via any `gitleaks`/`trufflehog`-class tool. This is a different kind of drift: between the confidentiality assumed at leak-time and the confidentiality that actually holds.

| # | Finding | Confidence | Provenance | Evidence | Impact |
|---|---------|------------|------------|----------|--------|
| 5.1 | The repository `julianken/hosted-game-night` is public. | High | `[live-verified]` | Iterator 5 via GitHub API (`repos/julianken/hosted-game-night --jq .visibility`). | Converts the threat model for every historical blob. (Phase 2 Iterator 5) |
| 5.2 | Prior audit URGENT U1 (Supabase key leak) is invalidated by project deletion, but the blob remains in git history. | High | `[tracked-HEAD]` + `[live-verified]` | Iterator 5: project deletion verified; blob location known from prior audit. | No live exploitation path, but (a) scanner-discoverable; (b) signals "secrets have leaked here before"; (c) raises question of what else sits in git history. (Phase 2 Iterator 5) |
| 5.3 | Prior URGENT U2 — Sentry + Grafana token rotation — remains open. | High | `[tracked-HEAD]` | Iterator 5 recommendation-status sweep; no rotation commit landed between `25cdc983` and `a7369f16`. | If either token was ever committed (not verified), public-repo framing converts that to active exposure. Sentry tokens can upload malicious sourcemaps; Grafana tokens can tamper with telemetry. (Phase 2 Iterator 5) |
| 5.4 | No git-history secret scan has been run on this repo. | Medium | Absence | Out-of-scope for Phase 1 Area 5; not run in Phase 2. | Bounds the impact of 5.2 and 5.3 — true attack surface unknown without a scan. (Phase 2 gap inventory) |

**Theme mechanism.** When a repo transitions from private to public (or is public at creation — this audit did not date the transition), every historical blob becomes externally discoverable. A private repo can tolerate sloppy secret hygiene historically; a public repo cannot, retroactively.

## F. Analysis & Implications

The five themes are not independent; they compound. Theme 1 (enforcement asymmetry) is the deepest layer — it explains why drift exists at all. Theme 2 (string vs. semantic) is Theme 1 applied to cleanup sprints: the rebrand passed every automated check because the check was a grep, exactly the shape of enforcement Theme 1 describes. Theme 3 (agent context lifecycle) is Theme 1 applied to an ecosystem of files — tracked CLAUDE.md, on-disk worktree CLAUDE.md, user-home MEMORY.md, orphaned claude-mem stubs — that no policy reaches. Theme 4 is Theme 1 with a second failure mechanism stacked: not just "no enforcement" but also "no re-execution cadence." Theme 5 is orthogonal but amplifies the others: if any agent-context file (Theme 3) ever carried a secret, Theme 5 is why that matters now more than it did at commit-time. The single mental model that captures all five: the repository's health is a function of what is policed, and the policing boundary sits at the compiler. Everything outside drifts at a rate proportional to adjacent code change, with prose docs, test plans, and agent context as the three highest-drift surfaces because they also have the highest code-change adjacency.

That compounding produces a prediction the Phase 2 packet made explicitly (Iterator 5) and this report endorses: **the next drift wave will concentrate on whichever advisory surface the next cleanup sprint does not touch.** BEA-719 was a string-swap sprint and missed the template Supabase prose; the next sprint will likely be scoped to something else and will by default miss everything outside that scope. The drift that matters most is not the drift currently cataloged but the drift the next sprint's scope will leave behind. The audit funnel itself cannot predict that scope, but it can point at the structural conditions that make new drift inevitable.

The audit produces unusual amounts of positive signal this report does not want to lose in risk-recitation. **Code and config drift is zero** at the machine layer (Finding 1.1): the rebrand worked, the standalone conversion worked, pre-commit hooks are enforced, `--no-verify` is forbidden in `CLAUDE.md`. **The E2E fixture vocabulary purge (BEA-716) landed cleanly** as demonstration that string-purge *can* work when the target is code — which fails fast if fixture names don't resolve. **All six open questions from the prior audit were resolved** in Phase 2, indicating the prior audit's questions were sharp enough to answer with `git log` / `git show` / file reads. **Phase 1 Area 4's wrong hypothesis about claude-mem was caught and corrected in Phase 2**, demonstrating that the funnel design has a built-in self-correction layer. Most importantly, **the prior audit's Phase 4 recommendations translated into landed commits BEA-697 through BEA-719** in two days — this is the biggest leverage point in the entire system, because it means the funnel is already a proven organizational reflex in this repo. This audit's own value will be measured by how many of its recommendations become BEA-### tickets and land; the precedent says that rate can be high.

The decisions this analysis enables are narrower than the total inventory suggests, because several depend on measurement the audit did not take. Immediate deletes are safe (22 orphaned claude-mem stubs; six merged-and-abandoned worktrees not including `wt-BEA-677`). Full rewrites are feasible now because Phase 2 produced complete specs (Iterator 1 for the MTP, Iterator 2 for four prose files). The semantic pass on `APP_README_TEMPLATE.md` and `PACKAGE_README_TEMPLATE.md` is unblocked because the files are small and deletions are known. The open public-repo security posture (Theme 5) justifies running a git-history secret scan before closing — a decision the audit has explicitly absorbed rather than deferred, because the consequence of leaving a secret unrotated is one-way. In contrast, several important decisions are *not* enabled by current evidence: whether to invest in a CI gate for doc staleness (blocks on operating-cost data), whether to keep the sprint-to-fix cadence or shift to in-line documentation updates (blocks on scalability over a longer window than 20 commits), whether to formalize "agent context hygiene" as a named category with boundaries (blocks on systematic enumeration — this audit identified three surfaces but did not complete the taxonomy), and whether to migrate from human-prose to auto-generated docs (requires a design spike this audit did not run).

The structural risk this report names but does not resolve is that **every fix proposed below is reactive**. Even the CI-gate recommendation, if enacted, is a better reactive layer rather than a prevention one; it catches drift at PR-review time rather than preventing it at authoring-time. The only truly preventive mechanism this repo has demonstrated is the audit-funnel itself, and its cadence is calibrated by nothing more specific than "after major cleanup waves." The analysis should therefore be read as two messages: (1) here is the drift and here is the prioritization, and (2) the tooling to *not* need the next audit cycle is not yet present; planning should assume another differential audit in two to four weeks, sized to whatever the next cleanup sprint leaves behind.

## G. Confidence Assessment

**Overall confidence: High on inventory; medium on prioritization magnitude; low on operating-cost claims.** The audit's catalog of drift surfaces is well-evidenced, with every finding in Section E traceable to specific Phase 1 or Phase 2 artifacts and provenance-tagged. The prioritization — which surfaces matter most — is defensible but rests on qualitative "weekly/monthly/rarely" likelihood grades rather than measured session frequencies. The operating-cost meta-claim is explicitly unmeasured.

**Strongest claims** (High confidence; direct `[tracked-HEAD]` or `[live-verified]` provenance, multi-investigator convergence):

1. **Package scope migration is complete** — verified at HEAD by Iterator 5; machine-layer drift is zero.
2. **`APP_README_TEMPLATE.md` still prescribes Supabase** — direct file read + Iterator 2 rewrite spec; canonical evidence for Theme 2.
3. **22 claude-mem stubs are orphaned one-time commits, not live output** — Iterator 4's git-log analysis is dispositive and falsified the initial hypothesis.
4. **`.worktrees/wt-BEA-677/` contains 30 pre-standalone CLAUDE.md files** — `[on-disk-snapshot]` verified via direct inventory; Iterator 3 confirmed all 7 worktrees are orphaned.
5. **The repo is public** — `[live-verified]` via GitHub API, reframes the security posture and scope of Theme 5.

**Moderate claims** (High provenance, medium inferential distance):

- **MTP drift is 49%** — rests on Iterator 1's disposition, well-grounded but applies a rewrite/keep/delete heuristic another analyst might tune differently; ±5% uncertainty.
- **E2E guide has ~8% churn** — estimated against file size and known deletions.
- **Two claude-mem stubs carry substantive stale content** — Iterator 4 identified them; "poisonous" is a judgment about blast radius, not a measurement.
- **The audit-funnel → BEA-ticket workflow is this repo's biggest leverage** — grounded in the prior audit's 20-commit landed-work stream, but "biggest" is comparative relative to alternatives not present.

**Weakest claims** (Caveat-worthy; thin exemplar count or inferred impact magnitude):

- **Agent-context pollution will harm agent work at meaningful frequency** — Theme 3 rests on the assumption that agents read the affected surfaces often enough to matter. Phase 2 did not instrument session CWDs; B2 (worktree actual usage) is a zero-cost probe not run. If the user rarely `cd`s into `wt-BEA-677`, Theme 3's severity is lower than assigned.
- **Public-repo historical-blob scannability is an active risk** — correct in framing but thin in exemplars. No git-history scan was run; only known secret-shaped blob is the invalidated Supabase key.
- **The "string ≠ semantic" pattern extends beyond the 4 files Iterator 2 inventoried** — a single grep across all live docs for `Supabase|OAuth|platform-hub|session|question-set` would confirm or disconfirm. Plausibly general, but not fully bounded.
- **Next drift will concentrate on whichever surface the next sprint misses** — a prediction, not a finding. The 20-commit history base is thin; the claim is logically sound but empirically weak.

**Known blind spots** (what this audit deliberately did not see):

- No instrumented measurement of agent-session behavior — every "how often does an agent hit this file" judgment is inferential.
- No git-history secret scan — Theme 5's recommendations are calibrated to "at least run a scan before claiming the posture is safe."
- No systematic enumeration of "agent context surfaces" beyond the three identified (worktrees, claude-mem stubs, memory files). Skill files, `.claude/settings.json`, slash-command prompts, and subagent-workflow custom prompts are plausibly in the category but were not audited.
- No longitudinal data on sprint-to-fix cadence scalability — the 20-commit window is a snapshot, not a trend.
- No end-user impact assessment — this audit is developer-and-agent-scoped.

## H. Recommendations

All recommendations are categories of work, not implementation specs. They are organized by the 2x2 severity-likelihood quadrant from Synthesis 2, with one URGENT addition absorbed from Theme 5.

### URGENT — Absorbed from Theme 5

**H.0 — Run a git-history secret scan before closing this audit.**

- **Priority:** URGENT — one-way consequence.
- **Rationale:** Findings 5.1, 5.2, 5.3, 5.4. The consequence of leaving a historical token undetected on a public repo is that an attacker with a scanner finds it first. Rotation is the only remediation for exposure, and rotation presupposes knowing what to rotate.
- **Trade-offs:** Running a scan consumes a few hours plus triage time. Not running relies on GitHub's own secret-scanning (best-effort, not comprehensive) and accepts the asymmetry that the attacker gets the first result.
- **Open questions:** Which tool (`trufflehog`, `gitleaks`, `git-secrets`)? Triage process for discovered blobs? History-rewrite posture given public-repo force-push cost?

### Quadrant 1 — Action Now (high severity × high likelihood)

**H.1 — Clean the agent-context-poisoning vectors in a single commit.**

- **Priority:** Q1.
- **Rationale:** Findings 3.1, 3.2, 3.3, 3.4. Each is a low-cost deletion/update with a specific target; together they represent the highest agent-impact cleanup achievable in a single PR.
- **Trade-offs:** Deleting worktrees loses any unmerged local state; mitigation is verifying each worktree's branch status first. Deleting claude-mem stubs is safe per Iterator 4. Updating MEMORY.md is one user-scoped file edit.
- **Open questions:** `wt-BEA-677` specifically — is the user actively using this worktree? One-minute probe (shell history, mtimes, recall). If active, deletion pauses; if orphaned, proceeds.

**H.2 — Execute Iterator 1's MTP rewrite as a single session.**

- **Priority:** Q1.
- **Rationale:** Findings 4.1–4.6. Iterator 1 produced a full disposition (17 KEEP / 24 REWRITE / 18 DELETE / 18 ADD). Piecemeal patches risk partial state worse than either endpoint.
- **Trade-offs:** Commits one large doc PR that is hard to review line-by-line. Offset: Iterator 1's spec serves as the PR's review guide.
- **Open questions:** None blocking.

**H.3 — Execute Iterator 2's prose-doc rewrites (E2E guide, templates, trivia README).**

- **Priority:** Q1.
- **Rationale:** Findings 1.2, 2.1–2.2, 2.4. Iterator 2 inventoried 4 files needing semantic rewrites (977 lines of surgical plan); executing closes Theme 2's known exemplars.
- **Trade-offs:** Semantic rewrites are slower than string swaps; each sentence needs architectural review. Not executing leaves template-based new-app scaffolding as a live hazard.
- **Open questions:** Whether to run a broader semantic-drift grep *before* the rewrite, to confirm the 4-file scope is complete rather than a sample.

### Important Investments (structural)

**H.4 — Decide whether to invest in a doc-staleness CI gate — but defer pending operating-cost measurement.**

- **Priority:** Important but not yet actionable.
- **Rationale:** Theme 1 mechanism; every Q1 fix will re-drift without a prevention layer. Synthesis 2 placed this (R9) as "most urgent" because it is the root cause of other risks.
- **Trade-offs:** A gate that only catches string-swap drift creates false confidence (would have missed the template Supabase finding). A gate that catches semantic drift requires LLM-assisted review and is expensive. Doing nothing recreates this audit cycle in 4–8 weeks.
- **Open questions:** The meta-question in Section I. Which tool evaluations exist (`ctxlint`, `DocDrift`, hand-rolled)?

**H.5 — Draft a worktree lifecycle policy before the next wave of worktrees is created.**

- **Priority:** Important investment.
- **Rationale:** Finding 3.2, Theme 3 mechanism. Each merge increases poison surface monotonically; a policy converts worktrees from lifetime-unbounded to post-merge-disposable.
- **Trade-offs:** Policy has maintenance cost; enforcement spans convention-only (no teeth) to post-merge hook (automation cost). No policy guarantees recurrence.
- **Open questions:** Enforcement via hook or documented convention? Does the policy cover `.worktrees/` CLAUDE.md staleness or only worktree dir existence?

**H.6 — Formalize "agent context hygiene" as a named category with surface boundaries.**

- **Priority:** Important investment; blocks on B10 gap.
- **Rationale:** Findings 3.1–3.6 identified three surfaces but are likely not exhaustive. Without defined boundary, future drift in the same category is caught reactively or not at all.
- **Trade-offs:** Formal categorization implies ownership and policy — cost. Alternative: ad-hoc is how we got here.
- **Open questions:** What else counts? Skill files? `.claude/settings.json`? Slash-command prompts? Subagent-workflow custom prompts?

**H.7 — Adopt a future-cleanup-sprint convention separating string-swap from semantic-review passes.**

- **Priority:** Important investment.
- **Rationale:** Theme 2 mechanism; BEA-719 was scoped string-only and successfully reinforced deleted architecture in templates. Distinguishing pass types at sprint planning prevents false completion.
- **Trade-offs:** Semantic passes are expensive. Making the cost explicit may defer cleanups rather than merely renaming them.
- **Open questions:** Codified in `CLAUDE.md`, the subagent-workflow skill, or a separate methodology doc?

### Quadrant 3 — Hygiene Batch

**H.8 — Delete all 22 claude-mem stubs in a single commit.**

- **Priority:** Q3.
- **Rationale:** Finding 3.3. Iterator 4 confirmed they are one-time commits, not regenerated; deletion is safe.
- **Trade-offs:** None material. The two poisonous files lose stale JWT/OAuth content, the desired outcome.
- **Open questions:** Whether to also audit the claude-mem MCP config.

**H.9 — Correct the user-scoped MEMORY.md's three stale claims.**

- **Priority:** Q3.
- **Rationale:** Finding 3.4. Read at every session start; every session begins with a false "rebrand IN PROGRESS" claim.
- **Trade-offs:** None; edit is ~3 lines.
- **Open questions:** Whether to add a freshness-header convention as general policy.

**H.10 — Opportunistic Vercel env cleanup (legacy aliases, orphan vars, Faro flag, trivia keys).**

- **Priority:** Q3 / Q4 boundary.
- **Rationale:** No functional impact, cosmetic cost only.
- **Trade-offs:** Opportunity cost vs. higher-priority work.
- **Open questions:** None.

### Quadrant 4 — Defer / Accept

**H.11 — CSP enforcing mode (prior M3).**

- **Priority:** Defer to a dedicated security sprint.
- **Rationale:** Report-only CSP is weaker posture, but no current content-injection vector is obvious. Enforcing includes potential breakage triage cost.
- **Trade-offs:** Accepting weaker posture while audit cycle focuses on drift. Explicit deferral, not omission.
- **Open questions:** Which sprint absorbs the CSP work?

### Meta Recommendation

**H.12 — Convert every Q1-and-above recommendation into a Linear BEA-### ticket before the audit closes.**

- **Priority:** Meta; leverages existing reflex.
- **Rationale:** The prior audit's recommendations landed because they became tickets (BEA-697 through BEA-719). Using the same path here is no-cost extension of the proven mechanism.
- **Trade-offs:** None; ticket-creation is mechanical.
- **Open questions:** Whether to also promote "same-PR doc updates when code changes" to a subagent-workflow mandatory step.

## I. Open Questions

### I.1 — The four divergences, resolved

**Divergence 1: Where does the public-repo finding belong?** **Resolution:** Absorb as Theme 5 with one URGENT recommendation (H.0 — run the git-history scan). Rationale: consequence is one-way, cost to run a scan is low, deferring to a "separate security audit" adds context-switch cost without proportional quality gain. The audit will note explicitly that H.0 may *spawn* a dedicated security audit if the scan returns hits — that decision is deferred until post-scan.

**Divergence 2: Delete-now vs. policy-first for worktrees and claude-mem stubs.** **Resolution:** Delete-now for low-risk items (22 stubs, 6 of 7 worktrees where branch status is clear), policy-draft in parallel (H.5, H.6). The critical exception is `wt-BEA-677` — the one active-poison worktree — which needs a user-judgment check on whether its work is live before deletion. Policy-first for that one specifically; delete-now for the rest.

**Divergence 3: Most urgent risk — structural (R9 CI gate) vs. meta (operating cost).** **Resolution:** Sequencing, not priority. R9 (CI-gate investment) is the structural fix that prevents recurrence; the operating-cost meta-question is the measurement that would right-size the investment. Build the measurement first (a week of session instrumentation), then decide the investment. This audit makes neither the measurement nor the tool choice; it recommends the sequence.

**Divergence 4: Tone toward the prior audit.** **Resolution:** Both "prior audit worked" and "this audit is partly an evaluation of whether the prior audit's cadence scales" are true and not contradictory. The prior audit produced landed work (BEA-697 through BEA-719 in two days), which is methodology evidence that the funnel scales for this repo's current size. This audit's own value will be measured the same way. The recursive structure is a feature, not a bug: differential audits are easier when the prior audit's recommendations are tracked as tickets (which is why H.12 matters).

### I.2 — Remaining open questions

**The meta-question (Synthesis 3 Part F):** *What is the operating cost, in agent-sessions-per-week, of the current documentation drift state?* This unblocks H.4, informs the cadence of future audits, and would right-size the audit funnel itself. **Suggested resolution:** Log the next 20 agent sessions with tags for (a) whether the agent consulted a known-drifted doc, (b) whether subsequent iteration was caused by that drift. One day of instrumentation, one week of logging, one afternoon of analysis.

**The zero-cost probes (Synthesis 3 Part B, unexecuted in Phase 2):**

- **B2 — Worktree actual usage.** Does the user actually `cd .worktrees/wt-BEA-677`? Shell history check, 2 minutes. Gates H.1's treatment of that specific worktree.
- **B4 — Pattern scope.** Does the "string ≠ semantic" bug exist outside the 4 files Iterator 2 inventoried? `grep -rE '(Supabase|OAuth|platform-hub|session|question-set)' docs/ apps/*/CLAUDE.md packages/*/CLAUDE.md`, 1 hour triage. Gates H.3's scope.
- **B8 — Claude-mem stubs in worktrees.** `grep -rc '<claude-mem-context>' .worktrees/`, 30 seconds. Completes the H.1 cleanup spec.

**Category-boundary questions (B10):** What counts as "agent context"? Worktree CLAUDE.md yes; MEMORY.md yes; claude-mem stubs yes. Skill files? Slash-command prompts? `.claude/settings.json`? H.6 is where this is resolved.

**Cadence correctness (B11):** Is 2 days the right inter-audit cadence? N=1 is not a trend. Run another differential audit after the next major cleanup sprint and see whether 2–4 weeks is the right interval; develop evidence over 3–4 iterations.

**Tool-evaluation questions (B5):** Would a CI gate for doc drift actually catch the semantic-rebrand gap or only the string-swap gap? Blocks H.4.

## J. Appendix: Evidence Index

| Finding | Source | Provenance | Location |
|---------|--------|------------|----------|
| 1.1 (code/config drift zero) | Phase 2 Iterator 5 | `[tracked-HEAD]` | `phase-2/iterator-5-*.md`; `git show HEAD:package.json` |
| 1.2 (E2E guide stale) | Phase 1 Area 2 Findings 2.1–2.4 + Iterator 5 velocity | `[tracked-HEAD]` | `phase-1/area-2-*.md`; `docs/E2E_TESTING_GUIDE.md` |
| 1.3 (ADR-001 stale path) | Phase 1 Area 2 Finding 2.12 | `[tracked-HEAD]` | `phase-1/area-2-*.md`; `docs/adr/ADR-001*` |
| 1.4 (MTP /question-sets) | Iterator 1 F3.5, F3.6, F3.25 | `[tracked-HEAD]` | `phase-2/iterator-1-*.md`; `docs/MANUAL_TEST_PLAN.md` |
| 1.5 (BEA-697 plan stale) | Phase 1 Area 2 Finding 2.11 | `[tracked-HEAD]` | `phase-1/area-2-*.md`; `docs/plans/BEA-697-e2e-baseline-fix.md` |
| 1.6 (README/ARCH clean) | Phase 1 Area 2 Findings 2.14, 2.15 | `[tracked-HEAD]` | `phase-1/area-2-*.md` |
| 2.1 (APP_README Supabase) | Phase 1 Area 2 2.8–2.10 + Iterator 2 | `[tracked-HEAD]` | `phase-1/area-2-*.md`; `phase-2/iterator-2-*.md`; `docs/templates/APP_README_TEMPLATE.md` |
| 2.2 (PACKAGE_README drift) | Phase 1 Area 2 Finding 2.10 | `[tracked-HEAD]` | `phase-1/area-2-*.md`; `docs/templates/PACKAGE_README_TEMPLATE.md` |
| 2.3 (root CLAUDE buzz-in) | Phase 1 Area 4 Finding A1 | `[tracked-HEAD]` | `phase-1/area-4-*.md`; `CLAUDE.md` |
| 2.4 (trivia README drift) | Phase 2 packet | `[tracked-HEAD]` | `phase-2/iterator-1-*.md`; `apps/trivia/README.md` |
| 2.5 (wt-BEA-677 CLAUDE) | Phase 1 Area 4 Finding B2 | `[on-disk-snapshot]` | `phase-1/area-4-*.md`; `.worktrees/wt-BEA-677-layout-constraints/CLAUDE.md` |
| 3.1 (wt-BEA-677 30 files) | Phase 1 Area 4 B1 + Iterator 3 | `[on-disk-snapshot]` | `phase-1/area-4-*.md`; `phase-2/iterator-3-*.md` |
| 3.2 (7 worktrees orphaned) | Phase 2 Iterator 3 | `[tracked-HEAD]`+`[on-disk-snapshot]` | `phase-2/iterator-3-*.md`; `git worktree list` |
| 3.3 (22 claude-mem stubs) | Phase 1 Area 4 A5 + Iterator 4 | `[tracked-HEAD]` | `phase-1/area-4-*.md`; `phase-2/iterator-4-*.md`; `apps/bingo/src/CLAUDE.md`; `apps/trivia/src/CLAUDE.md` |
| 3.4 (MEMORY.md stale) | Phase 1 Area 4 Finding C1 | `[on-disk-snapshot]` | `phase-1/area-4-*.md`; `/Users/j/.claude/projects/-Users-j-repos-beak-gaming-platform/memory/MEMORY.md` |
| 3.5 (Context7 pins lag) | Phase 1 Area 4 Finding A2 | `[tracked-HEAD]` | `phase-1/area-4-*.md`; `CLAUDE.md` |
| 3.6 (packages/audio no CLAUDE) | Phase 1 Area 4 Finding A7 | `[tracked-HEAD]` | `phase-1/area-4-*.md` |
| 4.1 (MTP 49% drift) | Phase 2 Iterator 1 | `[tracked-HEAD]` | `phase-2/iterator-1-*.md` |
| 4.2 (MTP room-setup) | Phase 1 Area 3 + Iterator 1 F3.1, F3.2 | `[tracked-HEAD]` | `phase-2/iterator-1-*.md`; `docs/MANUAL_TEST_PLAN.md` |
| 4.3 (6 feature gaps) | Iterator 1 F3.8–F3.14 | `[tracked-HEAD]` | `phase-2/iterator-1-*.md` |
| 4.4 (MTP exec history) | Iterator 1 F3.16 | `[tracked-HEAD]` | `phase-2/iterator-1-*.md` |
| 4.5 (skip-to-game) | Iterator 1 F3.21 | `[tracked-HEAD]` | `phase-2/iterator-1-*.md` |
| 4.6 (MTP numbering) | Iterator 1 F3.19 | `[tracked-HEAD]` | `phase-2/iterator-1-*.md` |
| 5.1 (repo public) | Phase 2 Iterator 5 | `[live-verified]` | `phase-2/iterator-5-*.md`; `gh api repos/julianken/hosted-game-night --jq .visibility` |
| 5.2 (Supabase blob) | Prior U1 + Iterator 5 | `[tracked-HEAD]`+`[live-verified]` | `phase-2/iterator-5-*.md`; `docs/post-standalone-audit/phase-4/analysis-report.md` U1 |
| 5.3 (U2 tokens open) | Phase 2 Iterator 5 | `[tracked-HEAD]` | `phase-2/iterator-5-*.md` |
| 5.4 (no history scan) | Absence | — | `phase-0/analysis-brief.md` scope; Synthesis 3 Part B B3 |
| Positive P1–P8 | Phase 2 packet Part B | `[tracked-HEAD]`+`[live-verified]` | `phase-3/synthesis-2.md` Part B |
