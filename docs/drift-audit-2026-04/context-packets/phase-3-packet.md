# Phase 3 Context Packet — Drift Audit 2026-04

**For Phase 4 final synthesizer.** Cross-comparison of all 3 synthesis lenses. The Phase 4 agent will read this PLUS the 3 full synthesis reports (Phase 4 is the one phase where raw artifacts are passed along).

---

## The three lenses side-by-side

| Aspect | Synth 1: Thematic | Synth 2: Risk/Opportunity | Synth 3: Gap/Implication |
|--------|-------------------|---------------------------|--------------------------|
| **Central frame** | Drift has 5 recurring mechanisms, not 60+ independent instances | Drift is an unevenly distributed attack surface on agent + human cognition | Drift is an epistemic problem — what we know vs. don't, what we can decide vs. can't |
| **Organizing unit** | 5 themes (mechanisms) | 13 risks + 8 positives in a 2x2 quadrant | 8 knowns + 11 gaps + 7 implications + 5+7 decisions |
| **Lead conclusion** | The enforcement boundary (compiler) is the only gatekeeper — anything outside it drifts | R9 (no CI gate for doc staleness) is the root cause behind the loudest risks | The one meta-question: what's the operating cost of the current drift state? |
| **Biggest blind spot (self-stated)** | Severity bias; can over-weight small themes that frame well | Under-values cumulative hygiene cost (Quadrant 3) | Under-values Part A (the known); privileges "what's uncertain" over "what's confirmed" |

## Where the 3 lenses AGREE (strong convergence → high-confidence inputs for final report)

1. **Runnable surfaces are clean; read-only surfaces are stale.** (Synth 1 Theme 1, Synth 2 Part B positives, Synth 3 Part A #1-3)
2. **`wt-BEA-677-layout-constraints/` is an agent-poisoning vector that should be addressed immediately.** (Synth 1 Theme 3, Synth 2 Q1/R1, Synth 3 Part D D1)
3. **BEA-719 did string-swap, not semantic rewrite — `APP_README_TEMPLATE.md` still prescribes Supabase.** (Synth 1 Theme 2, Synth 2 R11, Synth 3 Part C/E)
4. **There is no CI gate for doc staleness — this structural gap recreates drift after every fix.** (Synth 1 Theme 1+4, Synth 2 R9 "most urgent," Synth 3 Part E "not enabled without external tool eval")
5. **The MANUAL_TEST_PLAN has 49% drift and no ownership model.** (Synth 1 Theme 4, Synth 2 R5, Synth 3 Part D D3)
6. **The funnel→BEA-ticket→landed-commits workflow is the biggest existing leverage.** (Synth 2 Part E explicitly; Synth 3 implicit in D5 + C6)

## Where the 3 lenses DIVERGE (needs resolution in Phase 4)

### Divergence 1: Priority of the public-repo finding

- **Synth 1** treats it as Theme 5 "Public-Repo Reframing" — acknowledged as weaker but frame-shifting; a meta-finding about audit-scope bias
- **Synth 2** rates it Medium/Rare — live Supabase project is deleted, so credential is inert, but blob is externally scannable and hints at other-secrets-in-history
- **Synth 3** flags it in Part D D4 as a "one-way" decision — absorbing it into this audit vs. escalating to a separate security-sweep audit changes scope

**Resolution needed:** Phase 4 must decide: is this a FINDING in this audit's report, a SEPARATE investigation to spawn, or a footnote? The most honest framing is probably "elevated because of new information; requires its own scope."

### Divergence 2: Deleting vs. policy-first for the 22 claude-mem stubs and 7 worktrees

- **Synth 1** treats "agent context has no lifecycle" as a systemic theme — suggests prevention-class solution
- **Synth 2** puts immediate deletion in Q1 (action now) for R1 and as a hygiene item for R2
- **Synth 3** Part D makes it explicitly two separate decisions (D1: worktrees, D2: stubs) with reversibility ratings

**Resolution:** Final report should present "delete now" as the low-cost immediate action but flag the underlying lifecycle policy as the real fix — both lenses converge on this when teased apart.

### Divergence 3: The most urgent risk

- **Synth 2** picks R9 (no CI gate) as most urgent because it's the root cause of other risks
- **Synth 3** picks "operating cost of drift" as the one meta-question — implying we can't prioritize without data
- **Synth 1** doesn't single out ONE; it presents themes as co-equal

**Resolution:** Final report should present this as a sequencing question: R9 is the structural fix, but cost quantification would unlock WHEN to pay for it. Both are valid; they serve different planning horizons.

### Divergence 4: Tone toward the audit's relationship with its predecessor

- **Synth 1 + Synth 2** treat the prior `post-standalone-audit` as successful (its recommendations largely landed)
- **Synth 3** frames this audit as PARTIALLY an evaluation of whether the prior-audit workflow scales — the "audit cadence" open question

**Resolution:** Final report can acknowledge the recursive structure (an audit of an audit's follow-through) as methodology evidence that the funnel process works for this repo.

## What each lens uniquely contributes

| Contribution | From | Why it matters |
|--------------|------|----------------|
| The 5 themes as a mental model | Synth 1 | A reader can predict WHERE next drift will appear |
| The 2x2 quadrant + "R9 is root cause" insight | Synth 2 | Actionable prioritization at a glance |
| The 11 gaps + "zero-cost probes exist" | Synth 3 | Honest bounding of what this audit can and cannot claim |
| The "one meta-question" framing | Synth 3 | Guides what's worth investing in measuring next |
| "Biggest leverage = funnel→ticket workflow" | Synth 2 | Makes the audit's own existence a positive finding |
| "String rebrand ≠ semantic rebrand" as generalizable methodology | Synth 1 | Applies beyond this repo; teachable lesson |

## Strongest claims across all 3 lenses (Phase 4 should lean on these)

1. **Drift exists almost entirely outside the compiler's reach.** (Synth 1 T1; Synth 2 all Q1 risks; Synth 3 Part A #1-3)
2. **The rebrand BEA-719 did string-swap and missed architectural prose in templates.** (Synth 1 T2 Finding 2.9 ref; Synth 2 R11; Synth 3 Part D D2)
3. **Agent-specific drift surfaces exist and are quantifiable** — worktrees (30 files, 783 MB), claude-mem stubs (22), memory files. (Unified across all 3)
4. **22 claude-mem stubs are orphaned one-time commits, NOT live output** — delete is safe, not a workflow change. (Synth 2 R2; Synth 3 D2)
5. **The audit-funnel workflow itself is the repo's biggest drift-prevention leverage**, proven by the prior audit's BEA-697→BEA-719 wave. (Synth 2 Part E; Synth 3 C6/D5)

## Weakest claims across all 3 lenses (Phase 4 should caveat)

1. **"The operating cost of drift" is unquantified.** All 3 lenses acknowledge this — Synth 3 makes it THE meta-question.
2. **Public-repo security implications are bounded by this audit's scope** — all 3 lenses flag this as needing separate work.
3. **Worktree hygiene policy specifics are still TBD.** Synth 1/2/3 all agree "delete now" is safe; none specifies the enforcement mechanism.
4. **Predictions about next drift wave are based on 20 commits of history** (Iterator 5 caveat; not contested by synth lenses).

## What Phase 4 must do

- Weave the 3 lenses into a SINGLE unified narrative (not 3 parallel sections)
- Use Synth 1's 5 themes as a backbone for organizing findings
- Borrow Synth 2's quadrant for prioritization
- Borrow Synth 3's "knowns vs. gaps" for confidence calibration
- Resolve the 4 divergences explicitly (public-repo, policy-first, most-urgent, audit cadence)
- Produce recommendations that honor the "analysis not planning" scope (high-level, not implementation-specific)
- Cite back to specific Phase 1/2 finding references for every strong claim
- Include the Appendix Evidence Index mapping each finding to its Phase 1/2 source

## Phase 3 artifacts (Phase 4 WILL read these fully — they are in-scope per the skill)

- `phase-3/synthesis-1.md` (197 lines, Thematic)
- `phase-3/synthesis-2.md` (~290 lines, Risk/Opportunity)
- `phase-3/synthesis-3.md` (~350 lines, Gap/Implication)
