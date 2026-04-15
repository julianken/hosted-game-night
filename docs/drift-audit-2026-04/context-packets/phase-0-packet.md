# Phase 0 Context Packet — Drift Audit 2026-04

**For Phase 1 investigators.** This is the compressed handoff. Do NOT read `phase-0/analysis-brief.md` unless you need the long version.

---

## The question (one sentence)

Where does drift remain between what the codebase IS at HEAD `a7369f16` and what the documentation, test plans, agent context files, config, and branding artifacts CLAIM it is — specifically after auth/platform-hub/user-system/Supabase removal AND the joolie-boolie → hosted-game-night rebrand?

## Prior context (critical — read before starting)

A prior funnel (`docs/post-standalone-audit/`) completed 2026-04-11 at HEAD `25cdc983`. It covered the same repo post-standalone-conversion and concluded **"what you run is correct, but what you read is wrong."** Since then many cleanup + rebrand commits landed (BEA-697 through BEA-719). This new audit is **differential** — focus on:

1. Which of the prior audit's **URGENT / Quick Wins / Important Investments** were implemented since 2026-04-11, and which remain open? (spot-verify only — don't re-audit their content)
2. NEW drift from the rebrand and recent E2E refactors
3. Dimensions the prior audit explicitly excluded: `.worktrees/` CLAUDE.md files, `/Users/j/.claude/projects/.../memory/MEMORY.md`

## Key systems recently removed (memorize this list)

- `apps/platform-hub` (deleted BEA-682)
- `packages/auth` (deleted BEA-688)
- `packages/database` + Supabase infra (deleted BEA-694)
- User system / profiles (removed BEA-695, PR #516)
- Online session / room mode (bingo BEA-656, trivia BEA-657, packages BEA-658)
- Question-sets feature (removed PR #517)
- OAuth flows / LoginButton (BEA-686)

## Current brand state (check this, don't trust memory)

- **Target brand:** "Hosted Game Night"
- **Target scope:** `@hosted-game-night/*` (BEA-718 claims this landed; verify)
- **Target prefix:** `hgn-` for localStorage/BroadcastChannel (BEA-718 claims this landed; verify)
- **Legacy brands to flag if present:** `joolie-boolie`, `beak-gaming`, `Joolie Boolie`, `Beak Gaming`
- **Current live domains:** `host-bingo.com`, `host-trivia.com`
- **Legacy domains still wired as aliases:** `bingo.joolie-boolie.com`, `trivia.joolie-boolie.com`

## Investigation area assignments (one per investigator)

| Area | Focus | Key files/paths |
|------|-------|------|
| 1 | Source code residual references | `apps/`, `packages/`, `e2e/` tracked source |
| 2 | Prose documentation accuracy | Root `README.md`, `docs/*.md` (non-archive, non-CLAUDE, non-MANUAL_TEST_PLAN) |
| 3 | Manual test plan deep dive | `docs/MANUAL_TEST_PLAN.md` only, cross-referenced vs. current app |
| 4 | Agent context file drift (CLAUDE.md hygiene + worktree + memory) | ALL `CLAUDE.md` files + `/Users/j/.claude/projects/.../memory/*` |
| 5 | Config, runtime, CI, branding drift | `vercel.*`, `turbo.json`, `package.json`, `.env*`, `.github/`, `scripts/`, `.claude/`, observability config, branding counts |

## Critical methodology warnings (learned from prior audit's Phase 1 errors)

1. **Always `git ls-files` before claiming a file is "tracked."** The prior audit repeatedly mis-reported gitignored/stale on-disk files as authoritative.
2. **Tag every finding with provenance:**
   - `[tracked-HEAD]` — verified against `git show HEAD:path` or `git ls-files`
   - `[on-disk-snapshot]` — found on disk; NOT verified as tracked
   - `[live-verified]` — verified against an external live system (Vercel CLI, GitHub API)
3. **Don't read `.worktrees/` as if it were main's state.** Worktree state diverges. In Area 4 the `.worktrees/*/CLAUDE.md` IS the scope — but only as "what Claude reads when operating there," not "what main says."
4. **Don't trust MEMORY.md.** It may say X was "in progress" — check git log to see if it landed.
5. **Don't duplicate the prior audit.** If a finding looks identical to one from `docs/post-standalone-audit/`, spot-check if it was fixed and note the status; don't re-write the same finding.

## Quality criteria (weighted)

| Criterion | Weight |
|-----------|--------|
| Evidence strength (provenance tags mandatory) | 30% |
| Completeness (covers the user's "other dimensions" invitation) | 20% |
| Accuracy | 20% |
| Actionability | 15% |
| Nuance (distinguish real drift vs. intentional archive) | 10% |
| Clarity | 5% |

## Out of scope

- `docs/archive/*`, `node_modules/`, `.turbo/`, `.next/`
- `docs/superpowers/`, `docs/*-analysis/`, `docs/*-decisions/`, `docs/*-audit/` (except for flagging stale cross-links from live docs)
- Implementation of fixes — report only
- Defending/attacking architectural decisions — describe drift

## Investigator output format

Write to `docs/drift-audit-2026-04/phase-1/area-{N}-{slug}.md`. Each finding must include:
- Title
- Evidence with `file:line` or command output
- Provenance tag (`[tracked-HEAD]` / `[on-disk-snapshot]` / `[live-verified]`)
- Confidence (high/medium/low) with reasoning
- Impact (why it matters, especially for AI agent coherence)
- Related findings (cross-references)

Cap each Phase 1 report at ~1500 lines max; focus on signal over exhaustive enumeration.

## Relevant prior funnel artifact

`docs/post-standalone-audit/phase-4/analysis-report.md` — reference only. Use its framing ("what you run is correct, what you read is wrong") as a lens. Verify which of its recommendations landed. Do NOT copy its findings.

## What "done" looks like for a Phase 1 investigator

- 5-15 well-evidenced findings in your area, provenance-tagged
- Explicit note on which prior-audit recommendations touching your area were implemented / still open
- Explicit list of things you did NOT investigate (so orchestrator can plan Phase 2 coverage)
- 3-10 specific questions or contradictions for Phase 2 to resolve
