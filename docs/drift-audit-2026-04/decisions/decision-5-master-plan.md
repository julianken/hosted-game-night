# Decision 5: Master Execution Plan

**Funnel:** Drift Audit 2026-04 → Master Planning
**Repo:** `julianken/hosted-game-night` (PUBLIC)
**HEAD at planning:** `a7369f16`
**Inputs:** analysis-report §F/§H/§I + decision-1 (H.0) + decision-2 (H.2+H.3) + decision-3 (H.5+H.6+H.7) + decision-4 (H.4)

---

## TL;DR (5 sentences)

This audit closes in **5 waves across 4 Linear epics** — Security Posture (A), Drift-Audit Cleanup (B), Agent Development Conventions (C), Drift Cost Measurement (D) — executed via **roughly 11 implementation PRs** plus 1 investigation ticket and 1 measurement ticket. Wave 0 is already done in-session (7 worktree deletions + MEMORY.md fix); Wave 1 runs H.0 scan + U2 rotation + PR1 hygiene batch in parallel because neither blocks the other; Wave 2 ships PR2 (MTP) and PR3 (prose + broader-grep archive moves) sequentially because PR3 review surfaces may cascade back to PR2 references. Wave 3 lands the single consolidated AGENT_DEVELOPMENT_CONVENTIONS.md + worktree-audit.sh + PR templates, Wave 4 instruments 2-week drift-cost measurement, and Wave 5 is a gated go/no-go on a doc-staleness CI gate *based on* Wave 4 evidence. The biggest risk to the plan is **H.0 scan finding live credentials that balloon Epic A** — mitigated by rotating U2 tokens *in parallel* with the scan so a hit only adds triage work, not fresh rotation work, and by accepting Decision 1's explicit "do not rewrite history for dead blobs" posture. Audit is **closed** when all implementation PRs land, Wave 4 measurement produces a documented decision, and a single `decision-6-audit-close.md` captures residual follow-up.

---

## 1. Dependency Graph

```
                        Wave 0 (DONE in-session, live)
                        ├─ worktree deletions (7/7)
                        └─ MEMORY.md three-claim fix

                                    │
                                    ▼
   ┌────────────────────────── Wave 1 ──────────────────────────┐
   │                                                            │
   │  H.0 secret scan ──┐            PR1 hygiene batch          │
   │  (BEA-A1)          │            (BEA-B1, invokes           │
   │     │              │             H.1-remnant + H.8 + H.9)  │
   │     │              │                    │                  │
   │     ▼              │                    │                  │
   │  U2 rotation       │                    │                  │
   │  (BEA-A2, parallel)│                    │                  │
   │     │              │                    │                  │
   │     ▼              │                    │                  │
   │  scan-triage ──────┘                    │                  │
   │  (BEA-A3)                               │                  │
   │     │                                   │                  │
   │     ▼                                   ▼                  │
   │  (optional) dedicated sec audit   PR1 merged               │
   │  (BEA-A4, only if hits)           (blockers cleared)       │
   └────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
   ┌────────────────────────── Wave 2 ──────────────────────────┐
   │                                                            │
   │  PR2 MTP rewrite (BEA-B2, H.2)                             │
   │       │                                                    │
   │       ▼  (probes run; no cross-file coupling discovered)   │
   │  PR3 prose pass + broader-grep archive                     │
   │  (BEA-B3, H.3 + PACKAGE_README_TEMPLATE + 2+ archive moves)│
   └────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
   ┌────────────────────────── Wave 3 ──────────────────────────┐
   │                                                            │
   │  PR4 AGENT_DEV_CONVENTIONS.md doc scaffolding              │
   │  (BEA-C1, Decision-3 Phase 1)                              │
   │     │                                                      │
   │     ▼                                                      │
   │  PR5 worktree-audit.sh + manifest emission                 │
   │  (BEA-C2, Decision-3 Phase 2)                              │
   │     │                                                      │
   │     ▼                                                      │
   │  PR6 PR templates + subagent-workflow addendum             │
   │  (BEA-C3, Decision-3 Phase 3)                              │
   └────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
   ┌────────────────────────── Wave 4 ──────────────────────────┐
   │                                                            │
   │  PR7 measurement scaffolding                               │
   │  (BEA-D1, sessions.jsonl + drifted-docs.txt + analyze.sh + │
   │           subagent-workflow 3-line append)                 │
   │     │                                                      │
   │     ▼ (2 weeks OR 20 sessions accrued)                     │
   │  Retro-grep + analysis session                             │
   │  (BEA-D2 measurement ticket; no PR)                        │
   └────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
   ┌────────────────────────── Wave 5 ──────────────────────────┐
   │                                                            │
   │  decision-4b-ci-gate-result.md written                     │
   │  (BEA-D3 investigation ticket; no PR until choice known)   │
   │                                                            │
   │  THEN one of:                                              │
   │    (a) BEA-E-accept: CLAUDE.md updated with funnel-as-     │
   │        policy one-liner; H.4 closed. Single small PR.      │
   │    (b) BEA-E-invest-grep: custom grep CI gate, scoped per  │
   │        decision-4 §Coverage.                               │
   │    (c) BEA-E-invest-grep+llm: grep (blocking) + LLM        │
   │        (advisory) Tier-1+Tier-3 per decision-4.            │
   └────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                          decision-6-audit-close.md
                          (Definition of Audit Closed §8)
```

### Edge rationale (item-level)

- **H.0 scan → scan-triage:** scan output feeds triage SOP (decision-1 §Triage).
- **U2 rotation ∥ scan:** decision-1 §U2 explicit "rotate regardless of scan outcome." **Amended 2026-04-14:** BEA-A2 now covers verify→rotate OR reconfigure OR deprovision depending on Playwright-MCP-assessed state.
- **PR1 ∥ Wave-1-A work:** decision-2 §Batching — PR1 is hygiene-only, no overlap with secret surfaces.
- **PR2 → PR3:** decision-2 §Ordering — "MTP before prose; probe delta during PR3 broader-grep may invalidate PR2 claims about doc cross-refs."
- **Wave 2 → Wave 3:** Decision-3 §Rollout Phase 4 validation *uses* PR3 as the first Type-B sprint execution to test the template. If PR3 ships before Wave 3 policy, validation is retroactive. Acceptable — Wave 3 documents the pattern PR3 already embodies.
- **Wave 3 can overlap Wave 2 mid-phase.** PR4 (doc scaffolding only) has no source-file dependency on Wave 2. Only PR5 (worktree-audit.sh) depends on Wave 2 being clean (worktrees already zero, so trivially satisfied).
- **Wave 4 → Wave 5 gate:** decision-4 §Sequencing — measurement decides tool choice; no earlier commit.
- **Wave 5 → audit close:** all H.0-H.12 items either done or explicitly deferred/documented.

### Parallelism annotations

- Wave 1 A-track (A1→A2→A3) and B-track (B1) are fully independent → ship concurrently.
- Wave 3 is internally serial (PR4 → PR5 → PR6) but can overlap with tail of Wave 2.
- Wave 4 instrumentation (PR7) can start as soon as Wave 2 ships; the 2-week clock is independent of Wave 3.
- Wave 5 is strictly serial — gated on Wave 4 data.

---

## 2. Linear Ticket Structure

**Epic structure confirmed** (matches the user's prompt with two refinements):

- Epic A is **Security Posture** — absorbs H.0 scan + U2 rotation + optional spawned security audit.
- Epic B is **Drift-Audit 2026-04 Cleanup** — absorbs H.1-remnant + H.2 + H.3 + H.8 + H.9 (the landed-PR path).
- Epic C is **Agent Development Conventions** — absorbs H.5 + H.6 + H.7 in the single-doc model decision-3 chose.
- Epic D is **Drift Cost Measurement** — absorbs H.4 measurement-only phase. **Epic E ("CI gate investment")** is pre-declared as conditional on Wave 5 outcome; does NOT get created until Wave 5 decides.

**H.10 opportunistic Vercel env cleanup** folds into Epic B as a single small PR (PR-B4) at the tail, or is deferred if bandwidth tight — decision-2 does not address it, analysis-report §H.10 marks it Q3/Q4.

**H.11 CSP enforcing** is explicitly out-of-scope (see §6).

**H.12 meta** is *this plan* + the ticket-creation step of §7.

---

### Epic A: Security Posture

| Ticket | Type | Scope | Exit Criteria | Blocked By | PR Count |
|--------|------|-------|---------------|------------|----------|
| **BEA-A** | Parent epic | Secret hygiene + rotation + any scan-driven follow-up | All child tickets Done; `scan-results.md` committed | — | 0 (epic) |
| **BEA-A1**: run trufflehog + gitleaks full-history scan | Implementation | Execute both scans per decision-1 §Scan Scope; write redacted JSON outputs to `docs/drift-audit-2026-04/decisions/scan-results/`; commit. | Both scanner outputs exist under `scan-results/` with timestamps; `scan-results.md` has header row + 1 row per unique hit (status may be "pending-triage") | — | 1 |
| **BEA-A2**: verify obs stack live-state, then rotate-OR-reconfigure-OR-deprovision (Sentry + Grafana) | Implementation | **Scope amended 2026-04-14** per user report that obs integrations may be broken. Step 1 — Assistant executes decision-1 §Playwright MCP verification playbook against Sentry + Grafana dashboards to determine per-service disposition: (a) live / (b) broken-salvageable / (c) dead. Step 2 — Apply the disposition from decision-1 §"Updated U2 resolution matrix": for (a) rotate; for (b) reconfigure then rotate; for (c) strip the integration code + env vars per decision-1 §"Deprovision scope." | Per-service disposition documented in `docs/drift-audit-2026-04/decisions/obs-stack-assessment.md`; action taken matches disposition; post-action probe confirms desired end state (telemetry flowing if (a)/(b), or integration fully excised if (c)); `.secrets/observability-accounts.json` updated or marked archived | — (parallel to A1) | 1 (assessment + action; if deprovision, this becomes a substantive code PR) |
| **BEA-A3**: triage scan results + add pre-commit Gitleaks hook | Implementation | Walk decision-1 §Triage SOP for every A1 hit; disposition each; rotate any live hits; add Gitleaks `protect --staged` to `.husky/pre-commit`; verify hook blocks a fake `sntrys_` token in a test. | Every row in `scan-results.md` has non-"pending" disposition; `.husky/pre-commit` blocks a fabricated `sntrys_aaaaaaaaaa` commit in a probe; no "unknown" status remains | A1, A2 | 1 |
| **BEA-A4**: (conditional) dedicated security sub-audit | Investigation | Spawned ONLY if A3 surfaces ≥1 verified-live secret that is not in the known inventory. Full scope TBD per what A3 finds. | Separate decision doc (`decision-5a-security-audit.md`) + closure of any live exposure | A3 findings | Conditional: 0-? |

**Epic A exit:** BEA-A1, A2, A3 Done. A4 either unopened (clean scan) or closed with its own scope.

---

### Epic B: Drift-Audit 2026-04 Cleanup

| Ticket | Type | Scope | Exit Criteria | Blocked By | PR Count |
|--------|------|-------|---------------|------------|----------|
| **BEA-B** | Parent epic | H.1-remnant + H.2 + H.3 + H.8 + H.9 (+ H.10 opportunistic) | All child PRs merged | — | 0 (epic) |
| **BEA-B1**: PR1 doc-hygiene batch | Implementation | Decision-2 §PR1: ADR-001 tail Note (Rewrite 4.A Option B); 22 claude-mem stub deletions; worktree-list verification note; MEMORY.md probe confirmation. | All 7 PR1 per-file DODs from decision-2 pass; `rg '<claude-mem-context>'` returns 0 in live docs; ADR-001 tail matches spec | — | 1 |
| **BEA-B2**: PR2 MTP rewrite | Implementation | Decision-2 §PR2: full Iterator-1 disposition (17 KEEP / 24 REWRITE / 18 DELETE / 18 ADD); execution-history wipe + rebase-marker; inline PASS annotations stripped; status line reset to `0 PASS, 0 BUGS, 85 NOT TESTED`; source citations in every REWRITE/ADD row; PR2 probes in body. | All 8 PR2 per-file DODs from decision-2 pass; probe outputs pasted in PR body; delta count = 85 | B1 merged (probe freshness) | 1 |
| **BEA-B3**: PR3 prose semantic pass + broader-grep archive | Implementation | Decision-2 §PR3: E2E guide rewrite (1.A-E); trivia README rewrite (2.A-E); APP_README_TEMPLATE positive replacement (3.A-F); PACKAGE_README_TEMPLATE lines 5 + 52-54; ADR-001 body `port-isolation.ts` → `port-config.ts`; broader-grep triage → archive moves for `apps/bingo/documentation/mvp_specification.md` + `apps/bingo/docs/GITHUB_PROJECT_PLAN.md` + any other broader-grep hits. **This PR serves as Decision-3 Phase 4 validation** of the Type-B template — use the Type-B PR description template even though Epic C hasn't landed yet. | All 6 PR3 per-file DODs from decision-2 pass; broader-grep post-merge returns 0 non-archive Supabase hits; Type-B PR template used in body | B2 merged | 1 |
| **BEA-B4** (opportunistic): Vercel env cleanup | Implementation | H.10: legacy alias pruning, orphan vars removal, Faro flag + trivia key audit. Defer if bandwidth tight — NOT gating audit close. | `vercel env ls` both projects returns only active vars; deprecated entries removed | B1, B2, B3 (low priority; may skip) | 0-1 |

**Epic B exit:** B1, B2, B3 merged. B4 deferred or merged at user's option.

---

### Epic C: Agent Development Conventions

| Ticket | Type | Scope | Exit Criteria | Blocked By | PR Count |
|--------|------|-------|---------------|------------|----------|
| **BEA-C** | Parent epic | H.5 + H.6 + H.7 via single consolidated doc per decision-3 | All three child PRs merged | — | 0 (epic) |
| **BEA-C1**: PR4 doc scaffolding | Implementation | Create `docs/AGENT_DEVELOPMENT_CONVENTIONS.md` with all 4 sections; one-line reference added to root `CLAUDE.md` Instructions section; freshness-stamp headers added to MTP, E2E guide, ARCHITECTURE.md, AGENT_DEVELOPMENT_CONVENTIONS.md, and MEMORY.md (offer as a user-edit diff for MEMORY.md per decision-3 §H.6.3). | Doc file exists at the exact path; root CLAUDE.md references it; 4 of 5 stamp headers land (MEMORY.md may stay opt-in); `pnpm lint && pnpm typecheck` green | B3 merged (to avoid template doc conflicting with in-flight rewrite) | 1 |
| **BEA-C2**: PR5 worktree automation | Implementation | Update `scripts/setup-worktree-e2e.sh` to emit CLAUDE.md redirect stub + `.worktree-manifest`; create `scripts/worktree-audit.sh`; add `worktree:audit` script to root `package.json`; one-line addition to `superpowers:finishing-a-development-branch` skill pointing at the audit. | `pnpm worktree:audit` returns 0 orphans (since all worktrees already cleaned); creating a test worktree produces both stub + manifest; audit detects a synthetic orphan in a probe | C1 merged | 1 |
| **BEA-C3**: PR6 PR templates + skill integration | Implementation | Add Type A + Type B PR-description templates into `.github/PULL_REQUEST_TEMPLATE.md` as additive sections ABOVE the existing Five-Level Explanation (decision-3 §Open Q1 provisional); add sprint-type classification line to `.claude/skills/subagent-workflow/SKILL.md`. | Template renders correctly when gh CLI creates a PR; Five-Level Explanation section unchanged below; subagent-workflow kickoff reads the new line | C1 merged (C2 is parallel-safe but conventional order) | 1 |

**Epic C exit:** C1, C2, C3 merged. First post-merge Type-B PR (if any) uses the template from .github/PULL_REQUEST_TEMPLATE.md rather than inline decision-3 content.

---

### Epic D: Drift Cost Measurement

| Ticket | Type | Scope | Exit Criteria | Blocked By | PR Count |
|--------|------|-------|---------------|------------|----------|
| **BEA-D** | Parent epic | H.4 measurement phase only. Decides Epic E's existence. | D1 + D2 + D3 all Done | — | 0 (epic) |
| **BEA-D1**: PR7 measurement scaffolding | Implementation | Create `docs/drift-audit-2026-04/measurement/sessions.jsonl` (empty), `drifted-docs.txt` (from analysis-report §E known-drift inventory), `analyze.sh`; add 3-line end-of-session append instruction to `.claude/skills/subagent-workflow/SKILL.md`; optional: hookify rule that fires at session-end to ensure write (decision-4 Open Q1). | All 3 files exist; subagent-workflow skill updated; `analyze.sh` runs without error on empty input | C3 merged (avoid conflicting skill edits) | 1 |
| **BEA-D2**: Collection window | Measurement | 2 weeks elapsed OR 20 sessions accrued in sessions.jsonl, whichever first; during window, NO decisions taken. Retro-grep (decision-4 Signal 2) runs at window end. | Window closed; `sessions.jsonl` has ≥15 rows (extend if <15 per decision-4 §Bias protections); retro-grep output committed | D1 merged; elapsed time | 0 (no PR — measurement ticket) |
| **BEA-D3**: Analysis + decision-4b | Investigation | Run `analyze.sh`; compute Signals 1/2/3; apply decision-4 §Sequencing thresholds mechanically; write `decision-4b-ci-gate-result.md` with the verdict: `{Invest-custom-grep, Invest-grep+LLM, Accept-status-quo}`. | `decision-4b-ci-gate-result.md` committed; verdict named | D2 closed | 0-1 (PR if verdict needs policy doc edit) |

**Epic D exit:** D3 decision doc committed. Verdict determines whether Epic E gets created.

---

### Epic E (conditional): CI-Gate Investment

**DO NOT CREATE** at plan-execution time. This epic is **pre-declared** for Wave-5 convenience; create it only when BEA-D3's verdict is either `Invest-custom-grep` or `Invest-grep+LLM`.

If Accept-status-quo: a single small PR lands a one-line policy statement in root `CLAUDE.md` naming the audit-funnel as the official prevention mechanism (decision-4 §Definition of Done item 4). This is filed as **BEA-E-accept** (single ticket, no epic needed).

If Invest: Epic E structure mirrors Epic C (one epic, 2-3 child tickets for custom-grep CI step, optional LLM review Action, coverage-vocabulary list maintenance). Scope defined in the verdict doc.

---

## 3. Execution Wave Plan

### Wave 0 (DONE in-session)

- **Delivered:** 7/7 worktree deletions (`git worktree list` shows only main); MEMORY.md three stale claims fixed live.
- **Gate to Wave 1:** n/a (already passed).
- **Rollback posture:** None needed; deletions are git-preserved and MEMORY.md is in the user's home dir (recoverable via Time Machine if regret surfaces).

### Wave 1 — Urgent + Quick (PARALLEL)

- **Delivers:** Security posture reset (Epic A) + first doc-hygiene landed (BEA-B1).
- **Tickets in wave:**
  - **A-track, serial within track:** BEA-A1 (scan) → BEA-A2 (**verify via Playwright MCP → rotate / reconfigure / deprovision**, parallel from start) → BEA-A3 (triage + hook).
  - **B-track, parallel to A-track:** BEA-B1 (PR1 hygiene).
- **Parallelism:** A-track and B-track run concurrently; no shared files.
- **Gate to Wave 2:** BEA-A3 closed (scan + triage + hook landed) AND BEA-A2 disposition documented in `obs-stack-assessment.md` (live / reconfigured / deprovisioned, per-service) AND BEA-B1 merged AND no BEA-A4 emergency opened. If BEA-A4 fires, halt B-track progression until A4 scope defined.
- **Rollback posture:** If scan finds live secret not in inventory, escalate via BEA-A4, which may re-open U2 scope. If BEA-A2 deprovision branch commits a large code delete, standard revert applies. BEA-B1 is pure deletion — rollback = revert single PR.
- **Assistant-owned sub-task inside BEA-A2:** obs verification walkthrough uses Playwright MCP; user supplies auth only when SSO blocks automation. User explicitly offloaded this step 2026-04-14.

### Wave 2 — Rewrite Bulk (SERIAL)

- **Delivers:** MTP + prose + broader-grep archive (Epic B tail).
- **Tickets in wave:** BEA-B2 then BEA-B3.
- **Parallelism:** None within wave; explicit serial per decision-2 §Ordering.
- **Gate to Wave 3:** BEA-B3 merged. Broader-grep post-merge returns 0 hits outside archive. PR3 executed under Type-B template framing (even without Epic C merged yet — template copied inline).
- **Rollback posture:** Each PR is independent; revert affects only that PR. If PR3 broader-grep surfaces a third category of drift (not prose, not archive), halt and re-spec.

### Wave 3 — Structural Policy (SERIAL, can overlap Wave 2 tail)

- **Delivers:** AGENT_DEVELOPMENT_CONVENTIONS.md + automation + templates.
- **Tickets in wave:** BEA-C1 → BEA-C2 → BEA-C3.
- **Parallelism:** None within wave. C2 and C3 could technically parallel but are small and touch adjacent surfaces (skills, scripts); serial is cleaner.
- **Overlap with Wave 2:** BEA-C1 (doc-only) can start as soon as BEA-B2 merges (MTP-safe). BEA-C2 + BEA-C3 wait for BEA-B3.
- **Gate to Wave 4:** BEA-C1, C2, C3 merged. First orphan test of `pnpm worktree:audit` passes.
- **Rollback posture:** Policy-doc PRs are near-zero-risk reverts. Script PR has the most risk (setup-worktree-e2e.sh modification); revert if it breaks worktree creation on next use.

### Wave 4 — Measurement (DURATION-BOUND)

- **Delivers:** Instrumentation + 2-week data collection + analysis.
- **Tickets in wave:** BEA-D1 → BEA-D2 (passive wait) → BEA-D3.
- **Parallelism:** BEA-D1 is one PR; D2 is a clock; D3 is analysis. No parallelism.
- **Gate to Wave 5:** `decision-4b-ci-gate-result.md` committed with named verdict.
- **Rollback posture:** If instrumentation is disruptive (agents ignore the skill step, JSONL fills with noise), revert PR7 and iterate the instruction language. If mid-window a categorically-new finding emerges, document as audit-cadence input for a future funnel; do not reset the window.

### Wave 5 — Gated Decision (CONDITIONAL)

- **Delivers:** Either CI gate investment OR documented status-quo acceptance.
- **Tickets in wave:** Depending on D3 verdict — either BEA-E-accept (1 ticket, 1 PR) or BEA-E (epic) + 2-3 child PRs.
- **Parallelism:** Within Invest path, custom-grep and LLM-review can be separate PRs in parallel.
- **Gate to audit close:** Verdict acted on, H.4 documentation complete.
- **Rollback posture:** CI gate can always be reverted; accept path is a CLAUDE.md one-liner with no runtime impact.

### Audit close gate

All Wave 1-5 gates passed → write `decision-6-audit-close.md` per §8. Tag HEAD as `drift-audit-2026-04/closed` (optional).

---

## 4. Risk Register

| # | Risk | Prob | Impact | Warning Signal | Mitigation |
|---|------|------|--------|----------------|------------|
| R1 | **Broader-grep surfaces many more Supabase-bearing files than decision-2 expects** (plan cost explodes) | Med | Med | PR3-start broader-grep returns >5 non-archive hits outside the 4 Iterator-2 files + the 2 decision-2 discovered | decision-2 already absorbed 2 extra files; accept up to ~3 more via archive move. If >10, halt PR3, re-spec into PR3a (4-file scope) + PR3b (newly-discovered batch). Broader-grep triage cost is capped at 60min per decision-2 — enforce that cap. |
| R2 | **Secret scan surfaces live non-inventory credentials** (Epic A scope explodes into full security audit BEA-A4) | Low-Med | High | TruffleHog reports verified-live hit outside `.secrets/observability-accounts.json` inventory | Decision-1 triage SOP is the runbook. Rotate IMMEDIATELY per per-hit-type specifics. Open BEA-A4 with scope = "remediation of the specific finding." Do not block Wave 2 unless the hit has code-consequence beyond token rotation. |
| R3 | **PR2 MTP review surfaces cross-file coupling forcing re-spec** (Iterator-1 disposition drift) | Low | Med | PR2 probe `rg -n "KeyZ" apps/trivia/src/hooks/use-game-keyboard.ts` returns unexpected result; or keyboard shortcut source-truth drifted since `a7369f16` | Decision-2 explicitly prescribes "abort and re-spec" on probe delta. Treat as information, not setback: re-run relevant Iterator-1 derivation, update spec, resume. Max 1 delta iteration before re-considering scope. |
| R4 | **AGENT_DEVELOPMENT_CONVENTIONS.md gets bike-shed or ignored (no enforcement teeth)** | Med | Low | Wave 3 PRs merge but first post-merge cleanup sprint ignores the Type-B template | Decision-3 §Enforcement Table accepts this: high teeth reserved for setup-worktree-e2e stub + PR-review independent-synonym grep. BEA-B3 (PR3) is the first real test — if it doesn't use the template framing, that's the signal the policy needs teeth before more policy. |
| R5 | **Wave 4 measurement produces ambiguous results** ("mixed signals" per decision-4 §Sequencing) | Med | Med | Signals 1+2 land in 10-30% band | Decision-4 already has the tiebreaker: extend window 1 week; if still mixed, Invest in cheapest option (custom-grep only). Mechanize the decision — do not re-debate. |
| R6 | **User runs out of interest/bandwidth before Waves 3-5** | Med-High | Low-Med | No BEA-C or BEA-D tickets moved to In Progress within 5 days of Wave 2 close | Epic B alone closes the most-urgent drift. Wave 3 policy can ship months later at moderate cost. Wave 4 can start any time (independent clock). Accept that audit "CLOSED" might be Epic A + Epic B only, with Epic C/D re-opened as their own differential audit later. Document this as acceptable in §8. |
| R7 | **Source code drifts between planning and execution** (decisions cite HEAD `a7369f16`, but main moves) | Low | Low-Med | Probe-at-PR-start returns different values than iterator specs captured | Every PR in Wave 1-3 has a probe-log requirement. Probes ARE the drift detector. If probe reveals drift, the PR author re-verifies spec vs. new HEAD. This is why decision-2 baked probes into per-PR kickoff. |
| R8 | **Obs stack verification (BEA-A2) lands in an ambiguous middle state** — account exists, tokens valid, but events aren't flowing due to config drift (Faro URL, turbo env allowlist, instrumentation misconfigured) | Med | Med-High | Playwright walkthrough shows "token live, no recent events" simultaneously | Treat as "broken-salvageable" branch: one reconfigure-attempt (re-check `NEXT_PUBLIC_FARO_URL`, `SENTRY_AUTH_TOKEN`, turbo allowlist per MEMORY.md obs notes, `registerOTel` spanProcessors). If reconfigure doesn't flow events within 15 minutes of deploy, escalate to deprovision. Hard time-box on salvage effort prevents indefinite debugging. |

**Risks 1-6 are top six; R7 is the framework-level risk the probe discipline addresses; R8 was added 2026-04-14 when the user reported the obs stack may be dead — it is the highest-probability new risk introduced by the scope amendment.**

---

## 5. Smart-Decision Audit

### Decision 1 (H.0 secret scan + U2 verify-then-act — amended 2026-04-14)

- **Amendment note:** The original plan assumed rotate-regardless. User 2026-04-14 reports obs integrations may not work. Decision-1 §Scope Amendment now branches into verify→rotate OR reconfigure OR deprovision. Assistant executes the Playwright MCP verification; user supplies auth if SSO gates. If "dead" on both stacks, BEA-A2 becomes a code PR (strip `@sentry/nextjs`, `@vercel/otel`, Faro init, env vars) rather than pure ops. This may extend Wave 1 A-track duration but materially reduces long-term maintenance if the integrations are truly orphaned.


- **Strong:** TruffleHog primary + Gitleaks cross-check is diverse (different detector philosophies); parallelizing scan with U2 rotation eliminates serial pipelining; history-rewrite-no decision is cost-honest for dead credentials on a public repo; pre-commit Gitleaks hook shifts enforcement left which matches Theme 1.
- **Weak:** Assumes TruffleHog verifiers are accurate — a false-negative on a live Grafana or Sentry token would be catastrophic because the decision defers to "verified = real." The scan cost is trivially cheap, so "run both + also manual spot-check the live inventory" is good defense-in-depth.
- **Falsifiable by:** Scan returns >0 verified-live hits for tokens *already rotated in U2* — would indicate rotation timing was wrong or Vercel env lag. Or: TruffleHog misses a detector class, caught by Gitleaks' generic entropy — good outcome (cross-check worked), but signals need more tools.
- **Hedge:** Decision-1 §Forward-Looking Cadence (pre-commit hook + push protection + quarterly re-scan) explicitly builds in post-one-shot defense. The "may spawn BEA-A4" escape hatch is the biggest hedge — allows the plan to expand scope without halting.

### Decision 2 (H.2 + H.3 rewrite execution)

- **Strong:** Three-PR split separates review models cleanly; broader-grep absorbed into PR3 scope preempts a class of "miss next time" risk; MTP wipe-and-reset is the only honest count; APP_README_TEMPLATE positive-replacement (not minimal-stub) prevents regression via scaffolding.
- **Weak:** Assumes reviewer has bandwidth to read 350 lines of MTP PR meaningfully. In a solo-maintainer-plus-AI repo, "reviewer" IS the author via the subagent-workflow spec-review step. If the spec-review agent is thin, MTP correctness is not independently verified. Mitigation: the Iterator-1 spec IS the review contract, making correctness mechanically checkable.
- **Falsifiable by:** PR3 broader-grep returns 0 hits (would falsify the premise that semantic-drift extends past the 4-file Iterator-2 scope — but then PR3 just ships faster, a good surprise). Or: PR2 probe delta of >3 items — means Iterator-1 spec is no longer aligned with HEAD, requiring re-spec.
- **Hedge:** Per-PR probe discipline is the hedge. Any PR that returns unexpected probe delta triggers explicit "STOP and re-spec" — so the spec surviving HEAD-drift is engineered in, not assumed.

### Decision 3 (H.5 + H.6 + H.7 policy)

- **Strong:** Single-doc consolidation prevents meta-drift (policy docs themselves drifting); auto-generated worktree CLAUDE.md redirect stub is the highest-leverage intervention for the lowest code cost (~10 LOC); Concept Table + independent synonym grep + spec-review is a *layered* defense matching Theme 1's mechanism.
- **Weak:** Enforcement is almost entirely convention-based. If solo-maintainer + AI-only agents don't adopt Type-B templates voluntarily, the policy provides zero prevention. Decision-3 acknowledges this: "teeth reserved for two highest-leverage moments." But those two moments can both be bypassed by an agent that doesn't read the policy before starting a cleanup sprint.
- **Falsifiable by:** PR3 (which should naturally be a Type-B cleanup) ships without using the Type-B template. That would indicate the template isn't discoverable at authoring time. Fix: earlier one-line skill injection.
- **Hedge:** Phase 4 of decision-3 §Rollout IS the validation: "Use Type B template on the next semantic-review sprint (likely H.3, which IS a Type B cleanup)." The plan has already picked the retrospective-check moment. If it fails, we iterate on the skill step — cheap, reversible.

### Decision 4 (H.4 CI gate measurement)

- **Strong:** Defers the most-expensive decision (tool selection) past the only gate that matters (evidence). Refuses to buy string-catch tooling for a semantic problem. Bakes in specific thresholds + window size + retro-grep as non-self-report corroboration. Acknowledges Hawthorne explicitly and treats it as a lower-bound effect.
- **Weak:** Agent self-report of "rework caused by drift" is a judgment call. Two agents reading the same drifted doc and writing the same rework count may disagree. N=20 is thin; Signal 3 acknowledges this.
- **Falsifiable by:** Retro-grep (Signal 2) returns ≥3 hits but self-report (Signal 1) says <10% drift-rework — would reveal systematic under-reporting. In that case, the retro-grep should dominate.
- **Hedge:** Three-signal design means any single signal being unreliable still leaves two. Mixed-signal tiebreaker rule pre-declared. Worst-case is an honest "Invest in cheapest tool" — acceptable fallback.

### Decision 5 (this plan)

- **Strong:** Follows the proven audit-funnel → BEA-ticket → landed-commit reflex (H.12 mechanism). Uses parallelism where evidence shows tracks don't share state. Defers Epic E explicitly and conditionally. Every epic has a concrete exit criterion.
- **Biggest unknown:** Whether user bandwidth carries through Waves 3-5. R6 acknowledges this. If bandwidth collapses after Wave 2, audit is "half-closed" — acceptable per §8 definition, but signals the audit funnel may be over-producing follow-up work.
- **Plan response if unknown reveals:** §8's "closed" vs. "ready for next audit" split is the explicit fork. Wave 1+2 closure IS audit closure in the strict drift sense; Waves 3-5 are structural and cumulative. Document the state transparently in decision-6.
- **Hedge:** No calendar dates in any wave plan; sequencing is gate-based not time-based. If user-bandwidth lapses 3 weeks, Wave 4 just starts 3 weeks later with no plan damage.

---

## 6. Out-of-Scope Explicit List

| Item | Disposition | Rationale |
|------|-------------|-----------|
| Re-auditing prior audit's closed items (BEA-697 through BEA-719) | REJECTED | Already re-verified in Phase 2 Iterator 5; re-checking is funnel-loop overhead with zero expected yield. |
| Adding new features or non-drift work to this audit | REJECTED | Audit scope is drift. Feature work flows through normal Linear + subagent-workflow. |
| H.11 CSP enforcing mode | DEFERRED | analysis-report §H.11 Q4 explicitly defers; no injection vector observed; security sprint is the right vehicle, not drift audit. |
| Rewriting docs outside broader-grep triage scope | DEFERRED | Broader-grep is the scope-setter. If a doc isn't caught by the grep AND isn't in Iterator-2, it's not known-drifted, period. Future differential audit will catch whatever leaks. |
| H.6.1 inclusion of `.claude/settings.json` as ownership-bound surface | DEFERRED | decision-3 §Open Q3 notes cross-repo scope. Include as inventory (already done in H.6.1 table) but don't own-enforce from this repo. |
| H.6.3 freshness stamp on CLAUDE.md files | REJECTED | decision-3 §H.6.3 explicit "stamps invite 'check the stamp' substitute." CLAUDE.md drift is caught per-PR reflex, not stamps. |
| Converting convention-only enforcement to git hooks | DEFERRED | decision-3 §Phase 5: blocks on 2 more audit cycles' worth of convention-drift data. Not actionable now. |
| Epic E (CI-gate investment) creation at plan-execution time | CONDITIONAL | Gated on Wave 4 verdict. Creating prematurely commits Wave 5 before evidence exists. |
| BEA-A4 (dedicated security audit) upfront opening | CONDITIONAL | Only opened if A3 triage surfaces live non-inventory credentials. Decision-1 explicit. |
| MTP re-execution of 85 test cases post-PR2 | DEFERRED | PR2 ships rebaselined (0 PASS / 0 BUGS / 85 NOT TESTED). Actual re-execution is a separate audit-plus-execution pass, not a drift fix. |
| Migrating to auto-generated docs | OUT-OF-SCOPE | analysis-report §F names this as an unevaluated option; requires a design spike this audit did not run. |
| Re-running the audit funnel itself | DEFERRED | At next major cleanup sprint. Cadence is 2-4 weeks per analysis-report §F prediction. |

---

## 7. Ticket Creation Checklist

Concrete Linear actions to execute now. Team ID: `4deac7af-714d-4231-8910-e97c8cb1cd34`. Slug: `beak-gaming`.

**Suggested approach:** Use `mcp__linear-server__save_issue` to batch-create. Each ticket references this plan file path: `docs/drift-audit-2026-04/decisions/decision-5-master-plan.md`. Preserve BEA-###:<verb> <object> format.

### Epic-level tickets (create first, empty state)

1. **BEA-A** — Epic: Security Posture (Drift Audit 2026-04)
2. **BEA-B** — Epic: Drift-Audit 2026-04 Cleanup
3. **BEA-C** — Epic: Agent Development Conventions
4. **BEA-D** — Epic: Drift Cost Measurement

Description boilerplate for each epic:

```markdown
Parent epic tracking [A/B/C/D in Decision 5 master plan](../../docs/drift-audit-2026-04/decisions/decision-5-master-plan.md#epic-[a/b/c/d]).

**Scope:** [copy Scope row from §2 Epic table]
**Exit criteria:** [copy epic exit line]
**Source decisions:**
- Analysis report: docs/drift-audit-2026-04/phase-4/analysis-report.md
- Decision-[N]: docs/drift-audit-2026-04/decisions/decision-[N]-*.md
```

### Child tickets (attach to the respective epic)

5. **BEA-A1**: run trufflehog + gitleaks full-history scan [parent: BEA-A]
6. **BEA-A2**: rotate Sentry + Grafana OTLP tokens [parent: BEA-A]
7. **BEA-A3**: triage scan results + add pre-commit Gitleaks hook [parent: BEA-A; blocked-by: A1, A2]
8. **BEA-B1**: PR1 doc-hygiene batch (ADR-001 tail + 22 claude-mem stubs) [parent: BEA-B]
9. **BEA-B2**: PR2 MTP rewrite per Iterator-1 disposition [parent: BEA-B; blocked-by: B1]
10. **BEA-B3**: PR3 prose semantic pass + broader-grep archive [parent: BEA-B; blocked-by: B2]
11. **BEA-C1**: PR4 AGENT_DEVELOPMENT_CONVENTIONS.md + freshness stamps [parent: BEA-C; blocked-by: B3]
12. **BEA-C2**: PR5 worktree-audit.sh + setup-worktree-e2e stub emission [parent: BEA-C; blocked-by: C1]
13. **BEA-C3**: PR6 PR templates + subagent-workflow addendum [parent: BEA-C; blocked-by: C1]
14. **BEA-D1**: PR7 drift-cost measurement scaffolding [parent: BEA-D; blocked-by: C3]
15. **BEA-D2**: (measurement) drift-cost collection window [parent: BEA-D; blocked-by: D1]
16. **BEA-D3**: (investigation) analysis + decision-4b verdict [parent: BEA-D; blocked-by: D2]

### Description boilerplate for each implementation ticket

```markdown
## Context
Master plan: [Decision 5](../../docs/drift-audit-2026-04/decisions/decision-5-master-plan.md)
Source decision: [Decision-N](../../docs/drift-audit-2026-04/decisions/decision-N-*.md)

## Scope
[Copy the Scope cell from §2 Epic table row]

## Exit Criteria
[Copy the Exit Criteria cell, typically ≥3 concrete probes or DOD items]

## Blocked By
[Copy Blocked By cell]

## PR Count
Expected: [N]

## Probes to run at start
[If decision-2 §Pre-Execution Verification Probes applies, inline the relevant PR1/PR2/PR3 probe block]

## Type (for Type-B cleanup sprints)
If this ticket is a refactor/cleanup/rebrand/concept-removal, use the Type-B PR description template from docs/AGENT_DEVELOPMENT_CONVENTIONS.md §4 (or if that doesn't exist yet, copy from decision-3 §H.7.3).
```

### Ticket that does NOT get created yet

- **BEA-E** (CI-gate investment) and children — pre-declared conditional; create only after BEA-D3 verdict.
- **BEA-A4** (dedicated security audit) — create only if BEA-A3 triage surfaces live non-inventory credentials.
- **BEA-B4** (Vercel env cleanup) — create only if Wave 2 has bandwidth. If skipped, note as "deferred to next audit" in decision-6.

---

## 8. Definition of "Audit Closed"

### Closed — minimum-viable definition (strict drift-audit sense)

The audit is **CLOSED** when all of:

1. **Wave 0 verifiable:** `git worktree list` shows only main; MEMORY.md contains no "IN PROGRESS" or `@joolie-boolie/*` claim. **[Already true as of Wave 0.]**
2. **Epic A exit:** BEA-A1, A2, A3 Done. `scan-results.md` has 0 rows with "pending" status. `.husky/pre-commit` contains Gitleaks step that blocks fake tokens. `.secrets/observability-accounts.json` has `rotated_at ≥ 2026-04-13` for both Sentry and Grafana tokens.
3. **Epic B exit:** B1, B2, B3 merged. `rg '<claude-mem-context>'` returns 0 in live docs. MTP status line shows `0 PASS, 0 BUGS, 85 NOT TESTED`. Broader-grep over `docs/ apps/*/README.md apps/*/docs/ apps/*/documentation/` returns 0 Supabase hits outside `docs/archive/`.
4. **Decision-6 written:** `docs/drift-audit-2026-04/decisions/decision-6-audit-close.md` committed, with a section per Epic naming final state (Done / Deferred / Conditional) and explicit call-out of any residual H.* items.

This minimum set closes the *drift* half of the audit. It maps to Wave 0 + Wave 1 + Wave 2.

### Closed — full definition (drift + structure + measurement)

The audit is **FULLY CLOSED** when all of the above AND:

5. **Epic C exit:** C1, C2, C3 merged. `docs/AGENT_DEVELOPMENT_CONVENTIONS.md` exists. `pnpm worktree:audit` runs clean. PR description template includes Type A/B sections.
6. **Epic D exit:** D1, D2, D3 done. `decision-4b-ci-gate-result.md` committed with named verdict.
7. **Wave 5 resolution:** Verdict acted on (BEA-E-accept single PR OR BEA-E epic spawned + its tickets closed).

This closes the *structural* half — the mechanisms that make next-audit cheaper.

### "Ready for next audit" (distinct from closed)

A **"ready for next audit"** state is acceptable with the minimum-viable closure + explicit deferral doc for Waves 3-5. This is the R6-mitigation state: Epic A + Epic B landed, Epic C/D/E rolled into the *next* drift audit as carry-forward items.

decision-6 should name which closure state the audit landed in:

- **"Closed strict"** = Waves 0-2 done; Waves 3-5 carried forward. Note in decision-6: "Mechanism work (Epics C, D) deferred to next cycle; user accepts that next audit will re-surface H.4/H.5/H.6/H.7 unless addressed."
- **"Closed full"** = Waves 0-5 done. decision-6 lists every H.* as Done or explicitly Accepted. Next audit has a clean slate.

### Verifiability checklist (decision-6 template)

Every item is a probe. None require subjective judgment.

| # | Item | Probe |
|---|------|-------|
| 1 | Worktree count | `git worktree list \| wc -l` = 1 (main only) |
| 2 | MEMORY.md freshness | `grep -c 'IN PROGRESS\\|@joolie-boolie' MEMORY.md` = 0 |
| 3 | Scan triage complete | `grep -c 'pending-triage' scan-results.md` = 0 |
| 4 | Tokens rotated | JSON: `.sentry.auth_token.rotated_at >= "2026-04-13"` AND same for grafana |
| 5 | Pre-commit hook live | Test commit with `sntrys_fakeabcdef` in a .txt → should BLOCK |
| 6 | claude-mem stubs gone | `rg '<claude-mem-context>' --glob '*.md' --glob '!docs/drift-audit-*' --glob '!docs/post-standalone-audit/**'` = 0 |
| 7 | MTP rebaselined | `grep -c '0 PASS, 0 BUGS, 85 NOT TESTED' docs/MANUAL_TEST_PLAN.md` ≥ 1 |
| 8 | Broader-grep clean | `rg -l 'Supabase\\|SESSION_TOKEN_SECRET' docs/ apps/*/README.md apps/*/docs/ apps/*/documentation/ --glob '!docs/archive/**'` = 0 |
| 9 | AGENT_DEV_CONVENTIONS exists | `ls docs/AGENT_DEVELOPMENT_CONVENTIONS.md` = 0 exit code *(full-closure only)* |
| 10 | Worktree audit script live | `pnpm worktree:audit` exit code = 0 *(full-closure only)* |
| 11 | Measurement verdict committed | `ls docs/drift-audit-2026-04/decisions/decision-4b-ci-gate-result.md` = 0 exit code *(full-closure only)* |
| 12 | decision-6 exists | `ls docs/drift-audit-2026-04/decisions/decision-6-audit-close.md` = 0 exit code (any closure state) |

---

## Open Questions for User Input

1. **Closure preference: strict vs. full?** If the user wants to commit to full-closure, Epics C/D get tickets at plan-approval time. If strict-closure is acceptable, Epics C/D can be deferred and the plan stops at Wave 2. **Suggested default:** create all epics + Wave 1-2 tickets now; defer Wave 3-5 ticket creation until Wave 2 closes.
2. **BEA-B4 (Vercel env cleanup) — in or out?** Analysis-report §H.10 Q3/Q4 boundary. Suggest: file as optional; defer if bandwidth tight.
3. **MEMORY.md freshness stamp — add or skip?** decision-3 §H.6.3 suggests yes; decision-3 Open Q5 notes user hand-edits may strip it. User's reflex is unknown. **Suggest:** try it, revisit at Wave 3 validation.
4. **Should BEA-A4 be pre-opened empty to track "awaiting A3 outcome"?** Slight overhead; default no — create only if triggered.
5. **Should Epic B's PR3 explicitly use the Type-B template before Epic C ships it?** Suggested yes, inline the template from decision-3 §H.7.3 into PR3's description. Establishes the template's validity retroactively as Wave 3 Phase 4 validation.
6. **Is there value in tagging HEAD as `drift-audit-2026-04/closed` at audit close?** Low cost, useful for next differential audit's "compare against this anchor." Suggest yes.
7. **R6 threshold:** how many days of inactivity on Waves 3-5 before explicitly declaring "strict closure, deferred structural work"? Suggest: if no Wave 3 ticket In-Progress within 14 days of Wave 2 close, write decision-6 as strict-closure.

---

**Document status:** Proposed. Awaiting user confirmation of epic structure + closure preference (Q1-Q7 above) before Linear-ticket creation per §7.
