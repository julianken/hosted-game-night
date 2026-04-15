# Phase 2 Context Packet — Drift Audit 2026-04

**For Phase 3 synthesizers.** Compressed, thematic summary of all Phase 1 + Phase 2 findings. Do NOT read raw Phase 2 reports unless your synthesis lens needs specific detail.

---

## The emergent narrative (after 2 waves of investigation)

The repository at HEAD `a7369f16` has **code/config drift ~0** (rebrand + standalone conversion are machine-complete) and **non-executable-surface drift concentrated** in three layers — human prose docs, the manual test plan, and agent context files. This continues the prior audit's ("what you run is correct, what you read is wrong"), but Phase 2 quantified the costs and surfaced **two structural findings** the prior audit missed:

1. **Worktree directories are AI-agent context vectors and have no lifecycle policy.** All 7 worktrees are orphaned; one carries 30 stale CLAUDE.md files (783 MB) describing platform-hub / supabase / OAuth architecture that no longer exists. An agent operating in that worktree reads fiction as fact.
2. **The `julianken/hosted-game-night` repo is PUBLIC.** This materially changes the risk model of the historical Supabase service-role-key leak (prior audit URGENT U1) — even though the current Supabase project is deleted, the leaked blob is externally scannable.

## Quantified drift costs (Phase 2 deliverables)

| Target | Current state | Edit cost | Priority |
|--------|--------------|-----------|----------|
| `docs/MANUAL_TEST_PLAN.md` | 85 test cases: 17 KEEP / 24 REWRITE / 18 DELETE / 18 ADD | ~350 lines edit; one session | HIGH |
| `docs/E2E_TESTING_GUIDE.md` | ~45 lines / ~8% churn; 5 surgical rewrites | Small | HIGH |
| `apps/trivia/README.md` | ~35 lines / ~19% churn | Small | HIGH |
| `docs/templates/APP_README_TEMPLATE.md` | ~55 lines / ~13% churn — **still prescribes Supabase + auth packages** | Small | HIGH |
| `docs/adr/ADR-001` | 1 line + body fix for `e2e/utils/port-isolation.ts` reference | Trivial | MEDIUM |
| `.worktrees/*` | All 7 are orphaned; `wt-BEA-677` is active poison; no lifecycle policy | Delete + write policy | HIGH (security-adjacent) |
| 22 `<claude-mem-context>` stubs | Orphaned artifacts from one-time Feb 2026 commit, NOT live claude-mem output; 2 still cite OAuth/JWT | Delete all 22 | MEDIUM |
| MEMORY.md (user memory, outside repo) | "Rebrand IN PROGRESS" block is false | Update 3 claims | LOW (but misleading) |

## Prior-audit recommendation status (Iterator 5's sweep)

**URGENT bucket:**
- U1 Rotate Supabase service-role key — **INVALIDATED** (Supabase project deleted), BUT the blob remains in git history of a PUBLIC repo (new risk framing)
- U2 Rotate Sentry + Grafana tokens — **OPEN** (no evidence of rotation)
- U3 Fix Faro `\n` corruption — **LANDED** (a717c61a, including deeper TURBO env fix)

**Quick Wins bundle (8 items):** 3 landed, 4 still open, 1 partial. Still-open items cluster around Vercel env state (legacy domain aliases, Faro flag cleanup, orphan vars, trivia keys).

**Important Investments (3 items):**
- M1 Dead-types cleanup — **LANDED** (BEA-700)
- M2 MANUAL_TEST_PLAN rewrite — **PARTIAL** (brand clean; per-test-case drift remains — Iterator 1 produced the missing rewrite spec)
- M3 CSP enforcing — **OPEN**

**6 Open Questions from prior audit: ALL resolved.**

## Velocity signal (20 commits, 2026-04-11 → 2026-04-13)

Commit counts overlap across surfaces. 10 code, 8 e2e, 4 docs, 8 config (many commits touch multiple surfaces).

**Code-to-docs ratio: 2.5:1.** But docs were shipped as dedicated sprints (BEA-701, BEA-702, BEA-719), not as side-effects of code commits. The pattern: code lands, then docs catch up in a sprint days later. This works, but leaves a drift window after every feature.

**Predictive risk surfaces** (Iterator 5):
- E2E_TESTING_GUIDE.md: 40% of commits touched `e2e/`, only 2 touched the guide
- Manual test plan has no CI gate — drift will recur without one
- APP_README_TEMPLATE semantic-Supabase bug shows BEA-719 did string-swap, not semantic rewrite

## Convergences across Phase 1 + Phase 2

1. **"String rebrand ≠ semantic rebrand."** BEA-719 passed grep but missed sentences like "uses Supabase for auth." Both Area 2 (template) and Iterator 2 (rewrite spec) confirm. This is a methodology lesson for future cleanup waves.
2. **AI-agent-specific drift surfaces are real and quantifiable.** Area 4 + Iterator 3 + Iterator 4 all uncovered distinct agent-poisoning vectors the prior audit excluded: worktrees, claude-mem stubs, memory files. Together they suggest a category — "agent context hygiene" — that deserves formal treatment.
3. **Test-plan drift tracks code changes.** Iterator 1's 18 DELETE + 24 REWRITE = 49% of test cases need work, matching the 4+ structural changes (sessions removed, question-sets removed, BEA-713 SetupGate, BEA-704/706 selectors).

## Contradictions resolved in Phase 2

- **Count correction:** Area 4 said "21 claude-mem stubs, 2 cite OAuth/JWT"; Iterator 4 confirmed **22 stubs** (one miscounted) and identified the exact 2 files: `apps/bingo/src/CLAUDE.md` (5 JWT entries) and `apps/trivia/src/CLAUDE.md` (OAuth/CORS analysis).
- **"claude-mem is producing stale stubs"** was the Phase 1 hypothesis. Iterator 4 falsified: claude-mem does NOT write to tracked CLAUDE.md; the stubs are orphaned one-time commits from early integration. Fix is deletion, not reconfiguration.
- **"MEMORY.md claim that rebrand is in progress" was in doubt.** Iterator 5 verified package.json scope is `@hosted-game-night/*`; prefix migration is complete. MEMORY.md is stale.

## Remaining unknowns (for Phase 3 to address at a higher level)

1. **Is there a design pattern** that would prevent the "semantic rebrand gap" (string-swap cleanup that misses architectural prose)?
2. **What's the right primitive for worktree CLAUDE.md hygiene?** Options: delete worktrees post-merge, symlink CLAUDE.mds to main, add a pre-session check. No consensus in Phase 2.
3. **The public-repo + historical-leak question** is now a security concern, not just hygiene. How should this be escalated? (Prior audit had it as URGENT; iterator 5 found it's semi-invalidated but re-elevated by the public-repo discovery.)
4. **Is there an operating cost to the prose doc drift** that's not captured by edit-hour estimates? E.g., every AI-agent session that reads a stale E2E guide produces subtly wrong code. What's the daily cost?
5. **Should claude-mem's 22 stubs be deleted in one commit, or should the workflow be formalized first** (e.g., add a `CLAUDE.md` writing convention)?

## Artifacts (read only if your lens needs detail)

- `phase-1/area-{1..5}-*.md` — the original investigations
- `phase-2/iterator-1-mtp-rewrite-spec.md` — the manual test plan surgery plan (560 lines)
- `phase-2/iterator-2-prose-rewrite-spec.md` — the 4-file prose surgery plan (977 lines)
- `phase-2/iterator-3-worktree-hygiene.md` — 7-worktree inventory + hygiene policy (253 lines)
- `phase-2/iterator-4-claude-mem-audit.md` — what claude-mem actually does + 22-stub disposition (~500 lines)
- `phase-2/iterator-5-velocity-and-prior-sweep.md` — commit velocity + prior-audit status + MEMORY.md verification (~700 lines)
