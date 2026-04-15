# Decision 4: Doc-Staleness CI Gate + Measurement Strategy (H.4)

## TL;DR

**Option B — Measure first, then decide.** Spend a 2-week instrumentation window tagging the next ~20 agent sessions for "did a known-drifted doc get consulted, and did it cost an extra iteration?" — then make the tool/gate decision against that signal rather than against theory. Measurement is cheap (a tiny log-plus-tag script + one afternoon of analysis), while the wrong tool choice is expensive: a string-grep gate would have passed BEA-719 and locked in false confidence on the template-Supabase class of drift. The audit-funnel reflex continues as the interim prevention mechanism during the measurement window; if measurement shows drift cost below threshold, Option C (accept status quo) is acceptable and the funnel becomes the permanent answer.

## Core Decision: B

**Option B (measure first) is chosen.** Rationale and rejections:

- **Reject A (invest now).** The deepest finding of this audit (Theme 2, "string ≠ semantic") shows that BEA-719 — a well-executed string-grep rebrand with pre-commit checks — still shipped `APP_README_TEMPLATE.md` prescribing Supabase. *Every* off-the-shelf doc-drift-lint tool known at audit time (`ctxlint`, `DocDrift`, `Doctective`) is primarily a string/pattern engine. Buying string-catch tooling to fix a semantic-catch problem creates **false confidence** — the worst failure mode, because it silently blesses future BEA-719-class regressions while adding lint-maintenance cost. Investing now without measurement also violates the solo-maintainer-plus-AI constraint: CI gates have ongoing maintenance cost (false-positive triage, rule updates per rebrand) that must be justified against observed, not hypothesized, drift cost.

- **Reject C (accept status quo) — as a final answer, not as an interim posture.** The audit-funnel has demonstrably worked (BEA-697 → BEA-719 in 2 days, ~50% of prior-audit items landed), and is explicitly called out in §F as "the biggest leverage point in the entire system." But §F also names a structural flaw: **every fix is reactive**. Accepting status quo without measurement means accepting the next audit cycle in 2–4 weeks by default. That may be correct — but it should be a measured acceptance, not a defaulted one. The measurement window tells us whether the funnel is the right cadence or a stopgap.

- **Accept B (measure first) with a 2-week window and pre-committed decision thresholds (see §Sequencing).** Instrumentation cost is low, cache-warm (no blocking), reversible, and converts the "most urgent structural risk" (R9 / H.4) from a hypothesis into a decidable question. If the measurement shows cheap drift, we formally adopt status quo (Option C, with the funnel documented as the policy). If it shows expensive drift, we invest in exactly the tool class the drift data points to — LLM-assisted for semantic, grep for string-only — rather than guessing.

The sequencing framing from Divergence 3 (§I.1) makes this explicit: "Build the measurement first (a week of session instrumentation), then decide the investment."

## Measurement Design

Three signals, sorted by effort-to-value ratio. **Signals 1 and 2 are MUST; Signal 3 is nice-to-have** and runs in parallel at zero marginal cost.

| Signal | Collection method | Window | Decision threshold |
|--------|-------------------|--------|--------------------|
| **1. Drift-touch tag per session** (which doc was read; was it on the known-drift list?) | Lightweight append to a session log at `docs/drift-audit-2026-04/measurement/sessions.jsonl`. Each session ends with a 4-line tag block: `{session_id, linear_ticket or task_slug, drifted_docs_read: [...], rework_iterations: N, rework_attributable_to_drift: bool}`. Populated by the agent at end-of-session per a one-line instruction added to the subagent-workflow skill. Known-drift list is the inventory in `analysis-report.md` §E (MTP, E2E guide, APP_README_TEMPLATE, PACKAGE_README_TEMPLATE, trivia README, the 22 claude-mem stubs, MEMORY.md, `wt-BEA-677` CLAUDE.md). | 2 weeks / 20 sessions, whichever comes first | **≥30% of sessions** touch a drifted doc AND **≥20%** incur drift-attributable rework → invest (Option A). **<10% drift-attributable rework** → accept (Option C). Between → extend window 1 more week, then decide at midpoint. |
| **2. Retro-grep: drift hits per commit in the window** (did commit authors reference stale facts from drifted docs in commit messages, PR descriptions, or code comments?) | After the 2-week window, run `git log --format='%H %s%n%b' 25cdc983..HEAD` and grep commit bodies + code-change diffs for the known-drift vocabulary: `Supabase`, `OAuth`, `platform-hub`, `session token`, `question-set`, `room-setup`, removed fixture names (`authenticatedXyzPage`, `waitForRoomSetupModal`). Anything matching + landing in a non-cleanup commit = "drifted doc successfully misled an author." | Same 2 weeks (retrospective) | **≥3 drift-hits** in 2 weeks → invest. **0 drift-hits** → strong signal toward accept. 1–2 → tiebreaker with Signal 1. |
| **3. Session iteration count baseline** (absolute iterations per session, drifted-vs-not comparison group) | Same log as Signal 1 — just the `rework_iterations` field. Compare median iterations for sessions that touched drifted docs vs. those that did not. | 2 weeks | **≥50% higher median iterations** for drifted-doc sessions → corroborating evidence for invest. Below → corroborating evidence for accept. Not decision-controlling on its own (N=20 is thin for statistical inference), but a useful sanity check against Signals 1+2. |

**Collection mechanics.** Zero new tooling required:

1. Add a 3-line append instruction to `.claude/skills/subagent-workflow/SKILL.md` asking agents to finalize a session by writing a JSONL row to `docs/drift-audit-2026-04/measurement/sessions.jsonl`.
2. Maintain the known-drift doc list as a tracked text file `docs/drift-audit-2026-04/measurement/drifted-docs.txt` (one path per line). Update only on cleanup-sprint landings.
3. A single 30-line analysis script (Python or shell) at `docs/drift-audit-2026-04/measurement/analyze.sh` that produces the §Sequencing decision inputs.

**Bias protections.**

- **Agent self-report bias:** agents may under-tag drift attribution. Mitigation: Signal 2 (retro-grep) is author-blind and does not depend on self-report.
- **Hawthorne effect:** knowing drift is being measured may make agents more careful and artificially depress the cost signal. Mitigation: accept this — a Hawthorne-depressed cost is a lower bound; if it still clears the invest threshold, the real cost is higher.
- **Selection bias:** the measurement window may not be representative if no cleanup-adjacent work happens in those 2 weeks. Mitigation: extend if fewer than 15 sessions accrue.

## Tool Evaluation Matrix

Deferred to post-measurement. This matrix is the *pre-committed* candidate shortlist; actual selection happens after Signals 1–3 land.

| Tool | Fit | Semantic catch | False-positive rate | Cost to integrate | Ongoing cost | Recommendation |
|------|-----|----------------|---------------------|-------------------|--------------|----------------|
| **`ctxlint`** | Designed for AI-agent context files (CLAUDE.md, skill files). Good shape-match for Theme 3 (agent context hygiene) surfaces. | String/pattern-based per current implementation; does NOT catch Supabase-in-prose-template semantic drift. | Likely low on well-formed CLAUDE.md, but unknown on our custom freshness conventions. | Medium (config file + CI step). | Low-medium (version bumps, rule drift). | **Candidate IF measurement shows drift is concentrated in CLAUDE.md family; rejected if drift is concentrated in prose docs.** |
| **`DocDrift` (GitHub Action)** | General doc-drift Action; checks docs against code references. | Partial — catches "code references renamed but doc still cites old name" patterns. Would catch the stale fixture names in E2E_TESTING_GUIDE. Would NOT catch "doc still prescribes Supabase" since there's no live Supabase code to cross-reference. | Medium — fires on every stale code-reference, including intentional historical callouts in ADRs. Expect triage overhead. | Low (add workflow file). Note: GitHub Actions at this repo are currently effectively disabled (last run 2026-01-24 per Iterator 5); would need to re-enable. | Medium (allowlist maintenance, re-enabling Actions implies monitoring cost). | **Candidate IF measurement shows drift is concentrated in code-reference staleness (E2E guide, templates that cite live packages). Best fit for Theme 1 catch-at-PR gate if instrumented.** |
| **`Doctective`** | GitHub App; opens companion PRs with proposed fixes. | Partial — depends on its internal model; assume string/structure, not full semantic. | Unknown; reputational signal is "surfaces mostly-correct suggestions" which implies moderate FP. | Low to install; high to evaluate (install, run on a sample PR, judge suggestions). | Low if suggestions are high-quality; high if PR noise is added for human triage. | **Trial candidate — its companion-PR failure mode is the friendliest for a solo maintainer (warns without blocking).** Evaluate post-measurement only if invest-decision. |
| **Custom hand-rolled grep checker** (`.github/workflows/doc-drift.yml` + a shell script) | Perfect fit for known failure modes we've already cataloged: "does any doc mention `Supabase`, `@joolie-boolie/*`, `jb-` prefix, `authenticatedXyzPage`, `/question-sets`?" | String-only — same class as BEA-719's methodology that this audit critiqued. Will NOT catch semantic-on-novel-terms. | Very low (authored against a known vocabulary list). | Low (one script). | Medium (vocabulary list maintenance after each cleanup). | **Strong interim candidate if measurement shows cheap-but-nonzero drift concentrated in known vocabulary.** Treat as a floor: something a reasonable solo-maintainer repo with a proven audit reflex can ship in <2 hours. Composes with LLM-assisted for semantic. |
| **LLM-assisted review in CI** (Anthropic SDK call comparing changed code vs. touched docs, with known-drift vocabulary as context) | Highest semantic-catch capability. Only option likely to catch the template-Supabase class of drift. | High — can reason about "this doc describes auth flows but the app is standalone." | Medium (LLMs sometimes hallucinate drift that isn't there). | Medium-high (API key in CI secrets, budget guardrails, retry/backoff, prompt engineering). | High per month (API cost + prompt tuning drift + monitoring budget). | **Best-case tool for high-cost measured drift.** Requires non-trivial per-month budget and an `ANTHROPIC_API_KEY` in CI; both are achievable at this repo's scale but are new spend. Recommended **only if measurement shows high drift cost AND drift is semantic-dominated**. |

**Preferred composite (post-measurement, if invest):** custom grep (floor, catches known-vocabulary drift cheaply) + LLM-assisted review on PRs touching `docs/**/*.md` or `CLAUDE.md` files (catches semantic drift), with the custom grep as a **blocking** gate and the LLM review as **advisory comment-only**. This splits the false-positive tolerance: grep is precise, LLM is recall-oriented.

## Coverage Scope

**Minimum viable scope**, sized against highest-leverage drift surfaces from the audit:

1. **`docs/templates/*`** — **HIGHEST LEVERAGE.** Any new-app or new-package scaffolding inherits these. A single semantic miss here (Supabase-still-prescribed) poisons every downstream README.
2. **All `CLAUDE.md` files** (root + app-level + sub-dir stubs, excluding `.worktrees/` since worktrees are pending lifecycle policy H.5) — agent-context-hygiene category per Theme 3.
3. **`docs/E2E_TESTING_GUIDE.md` + `docs/MANUAL_TEST_PLAN.md`** — Iterator 1 and Iterator 2 concentrated their rewrite specs here; these are the known-highest-drift prose docs.
4. **Root `README.md` + `apps/*/README.md`** — user-facing; trivia README is already flagged with Question Sets drift.

**Explicitly excluded from minimum scope:**

- `docs/drift-audit-2026-04/**` and `docs/post-standalone-audit/**` — audit archives; historical by design.
- `docs/adr/**` — ADRs are point-in-time by convention; superseded is a metadata attribute, not drift.
- Any `.md` under `.worktrees/` — covered by H.5 worktree lifecycle policy, not H.4 gate.
- `PACKAGE_README_TEMPLATE.md` in the first wave — ride along with H.3 rewrite, not a gate target.

**Scope expansion trigger:** if a drift surface not in the minimum scope accumulates ≥2 drift-hits in the measurement window, promote it on next calibration.

## Failure-Mode Design

**Tiered by catch confidence:**

- **Tier 1 (custom grep, known-drift vocabulary):** **Block merge** with a clear error message pointing to the offending file and suggested fix. Low FP rate justifies blocking. Matches the repo's existing pre-commit-hooks posture (lint/typecheck/test block; this is another deterministic check).
- **Tier 2 (DocDrift / structural cross-reference if adopted):** **Comment-only warning** on the PR with specific file:line citations. Medium FP rate does not justify blocking; human triage in review is the right handoff.
- **Tier 3 (LLM-assisted semantic review if adopted):** **Open a companion PR** (Doctective-style) with proposed semantic rewrites. Never blocks. Never comments directly on the original PR (to avoid LLM noise on every change). Companion PR is closable without merge if the suggestion is wrong.

**Rationale for no blanket-block posture:** solo-maintainer-plus-AI-only has no human PR reviewer to soak up false positives. A blocking gate on a speculative catch creates exactly the maintenance tax that Theme 1 critiques on the opposite side — enforcement asymmetry. Blocking is reserved for deterministic rules; everything fuzzy is advisory.

**Bypass-policy corollary:** the Root CLAUDE.md already forbids `--no-verify` for pre-commit hooks. Extend the same convention to CI gates — no admin-merge of a failed Tier-1 block without a Linear-tracked exception ticket. Mechanism: lightweight; a BEA-### in the merge commit message confirms the exception is tracked.

## Interaction with Audit Funnel

**Convergence, not replacement.** The audit funnel and any CI gate should merge into a single reinforcing loop:

- **The funnel retains these exclusive responsibilities:**
  - Discovery of **new drift surfaces** (the gate cannot catch what its rules don't mention; only an audit catches the category you didn't know existed — e.g., this audit's finding of worktrees as an agent-context vector).
  - Discovery of **semantic drift classes** not yet in the rulebook (Theme 2's "Supabase prescribed in semantic prose" was unknown until this audit).
  - **Calibration of the gate's vocabulary list.** Every cleanup sprint (BEA-### rebrand, dead-feature removal) updates the known-drift vocabulary that the gate checks against.
  - **Periodic scope review** of what counts as a covered doc.

- **The gate retains these exclusive responsibilities:**
  - **Fast-cycle catches** between audits. Catching a regression at PR-time is ~100× cheaper than catching it at the next audit.
  - **Prevention of known-pattern recurrence.** If the audit establishes a pattern, the gate prevents its re-emergence.

- **Shared responsibility:**
  - **Recommending audit cadence.** Gate miss frequency is itself data — if the gate stops flagging anything, the audit cadence can slow. If the gate misses lots of drift that an audit later surfaces, the audit cadence speeds up or the gate's vocabulary expands.

**Pictorially:** the audit-funnel is the outer loop (offline, periodic, human-judgment-intensive); the gate is the inner loop (per-PR, automated, rule-based). The outer loop updates the inner loop's rules.

**If the measurement shows drift is cheap (Option C):** the funnel *is* the prevention mechanism, period. The gate never ships. The funnel's cadence is then the thing to calibrate (see Divergence 4 / B11).

## Definition of Done

H.4 is **done** when **all** of the following are true:

1. A decision of record exists at `docs/drift-audit-2026-04/decisions/decision-4-ci-gate.md` (this document). **[Will be true on file write.]**
2. Measurement instrumentation is live: `sessions.jsonl` and `drifted-docs.txt` exist; subagent-workflow skill has a 3-line append instruction. **[Tracked as a follow-up BEA-### ticket; H.12 applies.]**
3. A date-certain decision gate is on the calendar (2 weeks out, see §Sequencing) at which the collected data is analyzed and one of `{Invest-custom-grep-only, Invest-custom-grep+LLM, Accept-status-quo}` is chosen and committed to a second decision document `decision-4b-ci-gate-result.md`.
4. If **Accept-status-quo**: the audit-funnel is documented as the official prevention mechanism in root `CLAUDE.md`, with the 2–4 week cadence from §F named explicitly, and H.4 is closed.
5. If **Invest**: the chosen tool is integrated, its scope matches the §Coverage minimum, its failure modes match §Failure-Mode Design, and the first PR that would have caught a real drift (synthesized from the measurement data) is demonstrated to be caught. Then H.4 is closed.

**Verifiability:** each of 1–5 is an artifact or a git-landed commit. None requires subjective judgment to check.

## Sequencing (timeline)

No calendar dates — AI-developed project, so sequencing is in **audit cycles** and **session counts**, not days.

| Phase | Gate | What happens |
|-------|------|--------------|
| **Phase M0 — Today** | This decision document lands | Measurement strategy chosen; tool choice deferred. |
| **Phase M1 — Instrumentation setup** (next 2–3 sessions) | `sessions.jsonl` + `drifted-docs.txt` + `analyze.sh` + subagent-workflow skill append | Tiny PR, reviewed under H.12 ticketing. No gating behavior — measurement only. |
| **Phase M2 — Collection window** | 20 sessions accrued OR 2 weeks elapsed (whichever first) | Agents self-tag. Retro-grep is run at end. No decision taken during collection. |
| **Phase M3 — Analysis + decision** (1 afternoon) | `decision-4b-ci-gate-result.md` lands | Signals 1, 2, 3 computed. Decision thresholds applied mechanically. Tool selection (if invest) chosen against the §Tool Evaluation Matrix. |
| **Phase M4 — If invest: integration** (1 sprint cycle) | First demo catch of a real drift | Custom-grep is authored first (floor), LLM-assisted if warranted. Coverage scope from §Coverage. |
| **Phase M4' — If accept: documentation** (1 commit) | Root `CLAUDE.md` updated | Funnel cadence is named policy. H.5 worktree lifecycle still ships separately. |

**Decision thresholds flipping measurement → investment** (restated, single-source):

- Signal 1 ≥30% drift-touch AND ≥20% drift-rework → **Invest**.
- Signal 2 ≥3 retro-grep drift-hits → **Invest**.
- Signal 1 <10% drift-rework AND Signal 2 = 0 → **Accept** (Option C).
- Mixed signals → extend 1 week; if still mixed, **Invest** in the cheapest option (custom grep only). "Mixed evidence" historically favors undercommitting rather than overcommitting on solo-maintainer projects.

## Open Questions

1. **Is instrumentation sustainable across agent restarts?** Session-level logging depends on agent honoring the end-of-session write. If session-end is implicit (context compaction, tab close), the tag may be missed. Mitigation: wrap in a lightweight hookify rule that fires at session end. (Hookify is available per the skill manifest.) **Tracked as a sub-task of M1.**

2. **Is the known-drift vocabulary keyword list too narrow?** Measurement reduces this by running Signal 2 retro-grep on the union of all Iterator 1/2 findings, not just the short vocabulary. But post-cleanup, the list needs curation or Signal 2 stops working.

3. **Does the public-repo status (Theme 5) add constraints to LLM-assisted CI?** If PRs contain anything that could leak through an LLM provider's model-training — unlikely in a public repo by definition, but explicitly surface as a pre-check before integrating Tier 3.

4. **Does H.5 (worktree lifecycle) or H.6 (agent context hygiene taxonomy) change H.4's scope?** If H.6 formalizes `.claude/settings.json` or slash-command prompts as agent-context surfaces, they may join the gate's scope. Revisit at next calibration.

5. **B6 scalability question (from Synthesis 3):** does the sprint-to-fix cadence scale past 20 commits? The measurement window doubles as a mini-probe here — if drift is low in the measurement window but the cleanup-sprint frequency is high, the funnel is scaling. If drift is high and cleanups are lagging, scaling is breaking. Not decisional for H.4 but a diagnostic by-product.

## Rationale Summary

The H.4 recommendation in §H.4 is explicit that a decision is not yet actionable because it blocks on operating-cost measurement (I.2). Section F calls out the structural flaw that **every fix is reactive**, and names the audit-funnel as the only proven prevention mechanism. The audit evidence (BEA-719 passed grep, shipped Supabase) directly disqualifies string-only tools as the answer. The correct response is therefore not tool selection but **a measurement-first posture** that gates tool selection on evidence — Divergence 3's "sequencing, not priority" framing applied concretely.

Two weeks of cheap instrumentation produces the data to make a defensible choice between:

- **Invest (A)** — justified by measured cost above threshold, with tool choice informed by drift class.
- **Accept (C)** — justified by measured cost below threshold, with the audit-funnel documented as official policy.

Both terminate H.4. Neither bet is made blindly. The repo's biggest proven strength (the audit-funnel reflex from BEA-697 → BEA-719) is neither abandoned nor duplicated — it is either ratified (Option C) or supplemented (Option A, where the gate becomes the fast inner loop and the funnel remains the slow outer loop).

The worst outcome — shipping a string-grep gate that earns a green check while locking in the template-Supabase class of bug — is specifically what this decision avoids.
