# Synthesis 3: Gap & Implication Lens

## Synthesis Approach

This synthesis reads the Phase 0 and Phase 2 packets as a closed epistemic
system: everything the audit claims to know, and — more importantly — the
shape of the hole around what it doesn't. I am deliberately not re-reading
the raw Phase 1/2 reports, because the question here is not "what did each
investigator find" but "what does the union of findings let us decide, and
where does it force us to punt?"

The frame is imported from scientific writing: a finding is only as useful
as the decision it enables. An investigation's quality is measured not by
what it says but by what the next actor can now do differently. So I sort
everything into four buckets — known, unknown-but-cheap-to-resolve,
unknown-and-expensive, unknown-and-requires-human-judgment — and grade the
audit on whether its deliverables match those buckets.

## Core Narrative

The audit established, with high confidence, that the **machine layer is
clean and the human layer has concentrated drift in three predictable
surfaces** (prose docs, manual test plan, agent context files). Phase 2
quantified those surfaces — 49% of MTP test cases need rewrite/delete, 22
claude-mem stubs are orphaned, 7 worktrees are unmanaged, one worktree is
actively poisonous. The audit also surfaced one **structural discovery**
the prior audit missed entirely: worktree CLAUDE.md files as an unpoliced
AI-agent context vector, which interacts with the (new, separately
discovered) fact that the repo is **public**.

What the audit does NOT establish, and what a careful reader must not
conflate with establishment: (1) the **operating cost** of each day of
drift — how many agent sessions read the stale docs and produce subtly
wrong work, (2) whether the "string rebrand ≠ semantic rebrand" pattern
generalizes beyond the 4 files Iterator 2 inventoried, (3) whether the
BEA-718/719 sprint-to-fix cadence scales to the next cleanup wave, and
(4) whether there are OTHER unpoliced agent-context surfaces (skill files,
archived docs, sub-directory CLAUDE.md files) that share the same
structural weakness as worktrees. The gap between "we found drift" and
"we understand the drift-generating process" is where the next audit
should aim.

## Part A: High-Confidence Known

The evidence supports these with high confidence. All have direct
file:line or git-log provenance in Phase 1/2, tagged `[tracked-HEAD]`
or `[live-verified]`.

1. **Package scope migration is complete.** `@hosted-game-night/*` is
   live in package.json. `[tracked-HEAD]` via Iterator 5.

2. **MEMORY.md's "IN PROGRESS" rebrand claim is false.** The rebrand
   landed at HEAD. `[tracked-HEAD]` + inference.

3. **22 `<claude-mem-context>` stubs exist as tracked orphans, not
   live claude-mem output.** Iterator 4 falsified the "claude-mem is
   writing stale stubs" hypothesis. `[tracked-HEAD]`.

4. **All 7 worktrees are orphaned.** Their feature branches either
   merged or are abandoned. `[tracked-HEAD]` via git log.

5. **`docs/templates/APP_README_TEMPLATE.md` still prescribes Supabase
   + auth packages** despite BEA-719 string-rebrand. This is direct
   evidence of the "string ≠ semantic" methodology gap. `[tracked-HEAD]`.

6. **The repo is public.** Iterator 5 verified this. `[live-verified]`.

7. **M1 dead-types landed; M3 CSP did not; U1 Supabase rotation is
   invalidated by project deletion.** Prior-audit recommendation status
   is tracked via git log. `[tracked-HEAD]`.

8. **Code-to-docs commit ratio is 2.5:1 over 2 days**, and docs lag
   code by days, shipped in bundled sprints (BEA-701/702/719). This is
   the velocity signal for the drift-generating process. `[tracked-HEAD]`.

This 8-item foundation is the bedrock. Everything else is inference.

## Part B: Evidence Gaps

Per-gap detail. Each gap is tagged by the class of resolution it
requires.

### B1 — Operating cost of prose drift

- **Question:** How many agent-hours per day are consumed by sessions
  that read stale docs (E2E guide, app READMEs, MTP) and produce
  subtly-wrong code that later requires rework?
- **Why it matters:** Determines whether documentation drift is a
  low-priority hygiene issue or a high-priority operational tax. If
  each session wastes 2-5 agent cycles correcting stale guidance, the
  cumulative cost over a week may dwarf the edit cost to fix the docs.
- **Why we don't know:** No instrumentation. Phase 2 only estimated
  edit-hours for fixes, never wasted-hours from the status quo.
- **Resolution cost:** **External data required.** Would need session
  logs with failure attributions, or a controlled experiment (run N
  agent tasks against current docs vs. fixed docs, measure iteration
  count). Likely a week of instrumentation + analysis.

### B2 — Worktree actual usage

- **Question:** How often does a Claude agent actually start a session
  in `.worktrees/wt-BEA-677-layout-constraints/` (the active-poison
  worktree)?
- **Why it matters:** The worktree-poison finding is severity-weighted
  by frequency. If the user never `cd`s there, the poison risk is
  theoretical. If they do so daily, it is urgent.
- **Why we don't know:** Audit did not instrument agent session-start
  paths. Phase 2 inferred poison severity from content, not usage.
- **Resolution cost:** **Single-command probe** — check shell history,
  check recent worktree mtimes, ask the user. 2 minutes.

### B3 — Other public-repo security implications

- **Question:** Beyond the known Supabase service-role-key leak in git
  history, are there other secrets (Sentry tokens, Grafana keys,
  GitHub PATs, trivia-api keys) present in historical commits?
- **Why it matters:** The public-repo status converts every historical
  secret into a live externally-scannable threat. A full git-history
  secret scan is the only way to bound the damage.
- **Why we don't know:** Out of scope — Area 5 flagged the legacy U1
  finding but did not run a git-history scan.
- **Resolution cost:** **Full investigation** — `trufflehog`,
  `gitleaks`, or `git-secrets` scan over all history. Few hours. High
  actionability because escalation path is clear (rotate whatever
  surfaces).

### B4 — "String ≠ semantic" pattern scope

- **Question:** Does the APP_README_TEMPLATE semantic-Supabase bug
  exist in docs NOT inventoried by Iterator 2 — sub-directory
  CLAUDE.mds, archived docs we forgot were live-referenced, skill
  files, ADRs other than ADR-001?
- **Why it matters:** If the pattern is broader, BEA-719's string-swap
  methodology needs a second pass. If it's contained to the 4 files
  Iterator 2 found, we can close with confidence.
- **Why we don't know:** Iterator 2's scope was 4 files. Broader grep
  was out of scope for Phase 2.
- **Resolution cost:** **Single-command probe + judgment** — grep for
  "Supabase|OAuth|platform-hub|session|question-set" across all live
  docs and triage. 1 hour.

### B5 — CI-gate tool maturity

- **Question:** Would a CI gate for doc drift (e.g., `ctxlint`,
  `DocDrift`, or hand-rolled grep-in-CI) actually catch the semantic
  rebrand gap, or only the string-swap gap?
- **Why it matters:** The audit's predictive risk surfaces recommendation
  implicitly calls for a CI gate. But a gate that only catches the easy
  case while missing the hard case creates false confidence.
- **Why we don't know:** No tool evaluation was in scope. Context7/web
  search would be the resolution path.
- **Resolution cost:** **Full investigation** — tool eval, probably
  a day. Requires human judgment on false-positive tolerance.

### B6 — Sprint-to-fix pattern scalability

- **Question:** The BEA-701/702/719 pattern (docs catch up in a
  dedicated sprint days after code lands) worked over 20 commits. Does
  it scale to 200? To 2000?
- **Why it matters:** If the pattern is scale-limited, the team needs
  to invest in automation (CI gates, auto-generated docs) before
  hitting the wall. If it's robust, keep doing what works.
- **Why we don't know:** 20-commit window is too short for a trend.
- **Resolution cost:** **Requires external data** — retrospective
  analysis over 6+ months of history, which would have to come from
  a different repo with a longer track record (this one is too young).

### B7 — Other pending cleanup waves

- **Question:** Are there other legacy-feature residuals awaiting a
  cleanup sprint — feature flags from removed features, old API
  proxies, Vercel project config that references deleted paths,
  `.claude/` plugin config for unused plugins?
- **Why it matters:** Each unresolved cleanup wave is a future drift
  surface. Knowing the backlog lets the user sequence the work.
- **Why we don't know:** Phase 1 Area 5 covered config but did not
  exhaustively enumerate "things that reference removed features."
- **Resolution cost:** **Full investigation** — 2-3 hours of grep +
  triage.

### B8 — Claude-mem stub count across worktrees

- **Question:** Phase 2 found 22 stubs on main. How many exist in the
  7 worktrees combined? (Each worktree has its own tracked CLAUDE.md
  files and may have additional stubs.)
- **Why it matters:** If worktrees contain additional stubs, the
  "delete 22 stubs" recommendation is incomplete. More importantly,
  it changes the poison-surface calculation.
- **Why we don't know:** Phase 2 only counted main-branch stubs; did
  not enumerate across worktrees.
- **Resolution cost:** **Single-command probe** — `grep -r
  '<claude-mem-context>' .worktrees/`. 30 seconds.

### B9 — Why claude-mem stubs were written once and never again

- **Question:** Iterator 4 established the stubs are one-time Feb 2026
  commits. But WHY did the integration stop? Was it removed?
  Misconfigured? Intentional? This informs whether re-enabling
  claude-mem would be valuable or would recreate the pollution.
- **Why it matters:** Decides whether to remove the claude-mem plugin
  entirely vs. restart it with a convention.
- **Why we don't know:** Out of scope; Iterator 4 was disposition-only.
- **Resolution cost:** **Human judgment + config archaeology** —
  1 hour to reconstruct; 15 minutes if the user remembers.

### B10 — Agent-context-hygiene category boundaries

- **Question:** The audit identified 3 agent-context surfaces
  (worktrees, claude-mem stubs, memory files). Are there others? Skill
  files? `.claude/settings.json`? Slash-command prompts? Custom agent
  prompts in subagent-workflow?
- **Why it matters:** "Agent context hygiene" is emerging as a new
  category (Phase 2 convergence point 2). Defining its boundary is
  prerequisite to formal treatment.
- **Why we don't know:** The audit identified surfaces reactively; no
  systematic enumeration.
- **Resolution cost:** **Requires human judgment** — the definition
  of "agent context surface" is prior to any grep. Needs a design
  session, ~2 hours.

### B11 — Cadence correctness

- **Question:** The prior audit ran 2 days before this one. Is 2 days
  the right differential-audit cadence? Too frequent (low signal)? Too
  rare (would have caught more drift if run sooner)?
- **Why it matters:** Establishes the operating rhythm for
  drift-audits as an ongoing practice.
- **Why we don't know:** N=1 comparison. Need more data points.
- **Resolution cost:** **External data, longitudinal** — can't resolve
  from inside one audit cycle. Would need 3-4 more iterations to
  calibrate.

## Part C: Implications for the Audience

Audience: a senior developer who works exclusively with AI agents,
reads in monospace, wants evidence-based analysis.

### C1 — CLAUDE.md strategy

- **Finding:** 22 claude-mem stubs are scattered across sub-directory
  CLAUDE.mds. Some cite deleted systems (JWT, OAuth). Plus
  per-worktree drift. Plus MEMORY.md drift.
- **Consequence:** The "many CLAUDE.md files, each local to a domain"
  strategy multiplies the maintenance surface and produces drift
  faster than any single owner can service it.
- **Decision type enabled:** **Structural** — consider collapsing to
  a single root CLAUDE.md with inline sections, or introduce a
  convention (header line) that identifies each CLAUDE.md's freshness
  date. Constrains: do NOT add more scattered CLAUDE.mds without a
  freshness policy.

### C2 — Cleanup campaign methodology

- **Finding:** BEA-718/719 passed grep but missed "uses Supabase for
  auth" (semantic prose). Iterator 2 inventoried 4 files still needing
  semantic rewrite.
- **Consequence:** String-swap alone is insufficient. The next cleanup
  wave must pair grep with a secondary LLM-assisted semantic read.
- **Decision type enabled:** **Methodological** — future rebrand/
  removal sprints add a "semantic pass" checklist step. Constrains:
  cannot claim a cleanup is done on grep-clean alone.

### C3 — Worktree policy

- **Finding:** 7 orphan worktrees; 1 is active poison (783 MB of
  deleted-system docs). No lifecycle policy.
- **Consequence:** Worktrees are AI context vectors without a
  garbage-collection story. Operating in a merged-branch worktree
  silently reads fiction.
- **Decision type enabled:** **Operational** — adopt a
  post-merge-delete policy AND/OR an at-session-start freshness check
  (compare worktree HEAD to main). Constrains: the user must never
  `cd .worktrees/` without verifying branch status first.

### C4 — Trusting memory files

- **Finding:** MEMORY.md claims rebrand "IN PROGRESS" 2 days after it
  shipped at HEAD.
- **Consequence:** Auto-memory is NOT authoritative. It is a recording
  of past beliefs, not a reflection of present state. Reading
  MEMORY.md as truth will cause errors.
- **Decision type enabled:** **Behavioral** — every agent session
  should verify MEMORY.md's claims against `git log` before acting
  on them. Constrains: MEMORY.md cannot be the sole source for any
  claim about current state.

### C5 — Audit cadence

- **Finding:** 2-day differential audit surfaced real, actionable
  drift (worktrees, semantic-rebrand gap, public-repo security
  reframe) that a string-grep-only check would have missed.
- **Consequence:** High-frequency, narrow-scope audits yield more
  signal per minute than infrequent comprehensive audits.
- **Decision type enabled:** **Operational** — schedule a 2-day
  differential audit after each major cleanup wave. Constrains: don't
  wait for "big audit week."

### C6 — Security prioritization

- **Finding:** Public-repo status converts historical Supabase leak
  (prior audit URGENT U1) from "rotate the key" (moot) to "the blob
  is externally scannable." Plus U2 (Sentry/Grafana tokens) still
  open.
- **Consequence:** The security backlog is larger than it looked before
  the public-repo discovery. Full git-history secret scan is now a
  prerequisite to closing security posture.
- **Decision type enabled:** **Triage** — escalate B3 (git-history
  scan) to URGENT; absorb into this audit's recommendations rather
  than deferring. Constrains: cannot claim the standalone-conversion
  cleanup is "secure" without the scan.

### C7 — Agent onboarding

- **Finding:** CLAUDE.md files differ by directory. Root CLAUDE.md is
  current; some sub-directory CLAUDE.mds have 5 stale JWT entries;
  worktree CLAUDE.mds describe deleted systems.
- **Consequence:** When an agent starts a session, WHICH CLAUDE.md
  it reads depends on its working directory. The authority hierarchy
  is implicit and inconsistent.
- **Decision type enabled:** **Structural** — publish a CLAUDE.md
  authority ordering (root > app-level > src-level > worktree),
  document that MEMORY.md is historical-only, and have each CLAUDE.md
  declare its freshness. Constrains: cannot trust agent behavior
  consistency without this.

## Part D: Decisions This Enables

### D1 — Delete the 22 claude-mem stubs now vs. formalize a convention first?

- **Choice:** Delete now (single commit) vs. write a writing-convention
  doc first and apply retroactively.
- **Evidence favors:** Delete now. Iterator 4 established these are
  orphaned one-time artifacts, not live output. Nothing depends on
  them. Convention doc can come later.
- **Still needed:** B9 answer — is claude-mem intentionally inactive?
  If yes, also remove the plugin config. If no, restart the plugin
  after deletion.
- **Reversibility:** Fully reversible (git revert). Low risk.

### D2 — Delete 7 worktrees now vs. establish policy first?

- **Choice:** Delete all 7 vs. write a lifecycle policy first.
- **Evidence favors:** Delete 6 of 7 now (all merged/orphaned); policy
  first for wt-BEA-677 since it's the active-poison case and the user
  may need to decide whether its branch is live work.
- **Still needed:** B2 answer — is the user actively using
  wt-BEA-677? Single-command probe.
- **Reversibility:** Fully reversible (branches are still in refs;
  worktrees can be recreated with `git worktree add`). Safe.

### D3 — MTP rewrite as one session or piecemeal?

- **Choice:** One 350-line rewrite session vs. per-test-case patches
  over a week.
- **Evidence favors:** One session. Iterator 1 produced a complete
  rewrite spec (17 KEEP / 24 REWRITE / 18 DELETE / 18 ADD). Piecemeal
  risks partial state that is worse than either endpoint.
- **Still needed:** Nothing blocking.
- **Reversibility:** Fully reversible. One PR can be reverted.

### D4 — Escalate public-repo security or absorb?

- **Choice:** Spin a separate security audit vs. include in this
  audit's final recommendations.
- **Evidence favors:** Absorb. Phase 2 already surfaced the
  reframing; context switch cost for a separate audit outweighs
  marginal benefit. Add B3 (git-history scan) as a URGENT item in
  the final analysis report.
- **Still needed:** User agreement that public-repo changes risk
  model (likely yes given the memory shows the user already knows
  the repo is public).
- **Reversibility:** One-way — once the scan runs and any exposed
  secrets are identified, they cannot be "unleaked." The only
  reversibility is rotation.

### D5 — Prefer single root CLAUDE.md vs. scattered sub-directory files?

- **Choice:** Consolidate to one CLAUDE.md vs. keep hierarchy but add
  freshness metadata.
- **Evidence favors:** Hybrid — keep root + app-level (they work),
  remove src-level stubs entirely (they don't hold live content),
  add freshness headers to remaining files.
- **Still needed:** B4 answer (scope of semantic drift in remaining
  CLAUDE.mds) and B10 answer (what else counts as agent context).
- **Reversibility:** Structural change; git-reversible but may
  require follow-up commits if freshness convention causes friction.

## Part E: Decisions NOT Enabled

These the evidence is too thin to decide:

1. **Whether to invest in a CI gate for doc drift** (blocks on B1
   operating-cost + B5 tool-eval). Without knowing how much drift
   actually costs, cannot justify the tool-build investment.

2. **Whether to keep the BEA-701/702/719 sprint-to-fix cadence** or
   shift to in-line documentation updates (blocks on B6 scalability
   data). 20 commits is too few to trend.

3. **Whether the claude-mem plugin should be re-enabled, deleted, or
   reconfigured** (blocks on B9 — why it stopped writing).

4. **Whether to adopt auto-generated docs** (e.g., extract APP_README
   content from package.json + codebase introspection). No evidence on
   whether the doc-drift pattern is intrinsic to human prose or solvable
   with generation. Would need a design spike.

5. **Whether to audit other tracked-but-invisible surfaces** (skill
   files, slash-command prompts, agent prompts) (blocks on B10 — no
   definition of the category boundary).

6. **Whether to change audit cadence** (blocks on B11 — N=1 is not a
   trend).

7. **How to prioritize the 4 still-open Quick Wins from the prior
   audit** — Vercel env state cleanup is real work but its urgency
   is unquantified in Phase 2.

## Part F: The One Meta-Question

If the reader could answer only ONE question to maximize audit value:

> **What is the operating cost, in agent-sessions-per-week, of the
> current documentation drift state?**

**Why this one:**
The audit has produced a strong inventory of what's wrong and a
plausible edit-cost to fix it. What it lacks is the **denominator** —
what the daily cost of inaction looks like. Without that:
- Cannot prioritize doc-drift work against feature work
- Cannot justify CI-gate investment (D5 is blocked on this)
- Cannot decide whether to migrate from human-prose to
  auto-generation (E4 is blocked on this)
- Cannot calibrate audit cadence (C5, E6)
- Cannot set a SLO for doc-freshness

Every other question is either answerable with a 1-line probe (B2,
B4, B8, B9), is already decidable with current evidence (D1, D2, D3,
D4), or is a derivative of this one (E1-E6). This question is the
unlock.

**How to answer it (lightweight):** Log the next 20 agent sessions
with tags for (a) whether the agent consulted a known-drifted doc,
(b) whether subsequent iteration was caused by that drift. A day of
instrumentation, a week of logging, one afternoon of analysis. If the
answer is "3 sessions per week lose 15 minutes each," doc drift is a
hygiene issue. If "every session loses 30 minutes," it's the
highest-ROI fix available.

## Confidence

- **Part A (known):** High. Each item has `[tracked-HEAD]` or
  `[live-verified]` provenance per Phase 0's methodology rules.
- **Part B (gaps):** High for the catalog; medium for resolution-cost
  estimates (I'm inferring investigation hours from scope, not from
  measurement).
- **Part C (implications):** Medium-high. Each implication traces to
  a specific finding, but the "consequence" column is my inference
  from the evidence, not evidence itself. A sophisticated reader
  should pressure-test each one.
- **Part D (decisions enabled):** High on D1-D3 (directly supported
  by Phase 2 artifacts); medium on D4-D5 (require user input).
- **Part E (not enabled):** High. These are explicit about their
  blocking conditions.
- **Part F (meta-question):** Medium. I'm confident this is A
  meta-question; less confident it's the ONE meta-question vs.
  tied with "is agent-context-hygiene a real category boundary?"
  (B10). I chose B1 over B10 because B1 has a clearer answer path
  and B10's answer depends on B1 for prioritization.

## Blind Spots of the Gap/Implication Lens

This lens is inherently biased toward listing unknowns. A reader using
only this synthesis might walk away thinking the audit is mostly
incomplete. It isn't — Part A is substantial and actionable. The
gap-listing is a scaffold for the NEXT audit, not a critique of this
one.

Other blind spots:
- This lens cannot evaluate the **quality** of the edit specs
  (Iterators 1 and 2) — Synthesis 1 or 2 should cover that. I've
  assumed they're correct.
- This lens undervalues the "this is fine, don't fix it" finding.
  Some drift is intentional (legacy aliases). I'm not distinguishing
  here because Phase 2 already did.
- I've treated the audience as purely rational. In practice, the
  senior-developer + AI-agent operator may weight security higher
  (C6, D4) than efficiency (C1, D5) for reasons this lens doesn't
  capture.
- By focusing on gaps, I may be under-signaling that the audit's
  core finding ("machine clean, human prose dirty") is itself
  a high-value result that justifies action without further gaps
  resolved.

## Recommendations (high-level)

1. **Absorb B3 into this audit.** Run a git-history secret scan before
   closing. One-way consequence.

2. **Run the 3 zero-cost probes NOW** (B2, B4, B8) before writing the
   final analysis report. Each is a 1-line command and sharpens the
   decisions in Part D.

3. **Write the final analysis report with Part F answered or
   explicitly deferred.** If deferred, make deferral a tracked Linear
   item — do not let it fade into the audit archive.

4. **Do D1 (delete stubs) + D3 (MTP rewrite) as single-session
   commits before the next cleanup sprint.** Don't wait for
   convention.

5. **Add a freshness-header convention to all remaining CLAUDE.mds
   and MEMORY.md.** Example: `<!-- Last verified against HEAD
   <short-sha> on <date> -->`. Cheap, reversible, solves the "which
   file is authoritative" problem (C7).

6. **Do NOT invest in CI-gate tooling yet.** Blocks on Part F answer.
   Revisit after 2 weeks of instrumentation.

7. **Treat "agent context hygiene" as a named category** in the final
   report. Document its current known surfaces (worktrees, stubs,
   memory). Flag B10 as open.
