# Decision 3: Policy Framework (H.5 + H.6 + H.7)

**Scope:** H.5 (worktree lifecycle), H.6 (agent context hygiene category), H.7 (cleanup-sprint methodology).
**Audience:** Solo maintainer + AI agents. Policy must cost less than the drift it prevents.
**Provenance anchors:** analysis-report Theme 2 (string-swap gap), Theme 3 (lifecycle gap), Sections H.5/H.6/H.7, I.2 open questions; Iterator 3 worktree inventory; Iterator 4 claude-mem disassembly.

---

## TL;DR (3 sentences)

Codify all three policies inside a single new **`docs/AGENT_DEVELOPMENT_CONVENTIONS.md`** that is referenced (but not duplicated) from root `CLAUDE.md`, plus one shared enforcement script (`scripts/worktree-audit.sh`) that serves both H.5 and H.6 via a quarterly `pnpm worktree:audit` command; no git hooks, no CI gate yet. Worktrees get convention-only lifecycle (delete on merge) with a post-creation stub file that redirects agents to main's docs, and cleanup sprints split into two declared types — **string-swap** (automatable, grep-based, small scope) vs. **semantic-review** (mandatory when removing an architectural concept), each with a required PR-description template that serves as the reviewer's proof-of-correctness checklist. The "agent context hygiene" category is drawn around surfaces the agent reads at session-load OR tool-call time (root CLAUDE.md, sub-directory CLAUDE.md, worktree CLAUDE.md, user MEMORY.md, claude-mem stubs, `.claude/skills/*`, `.claude/settings*.json`) and explicitly excludes ephemeral / per-session context (slash-command prompts, MCP transcripts, subagent turns) because those drift harmlessly with each invocation.

---

## Cross-cutting Decision: Single Policy Doc vs. Separate

**Chosen: Single `docs/AGENT_DEVELOPMENT_CONVENTIONS.md` + root CLAUDE.md cross-reference + one shared script.**

### Rationale for consolidation

- **Solo maintainer + AI-only development.** Three separate docs increases the surface that itself drifts (Theme 4 mechanism — "write-once docs running at a different cadence from code"). One doc means one freshness target.
- **The three policies share mechanism.** All three are layered responses to the same root cause (Theme 1: advisory surfaces without gatekeepers). Separating them hides the shared structure.
- **Root CLAUDE.md is already dense.** Adding full policy text there pushes it past the "every agent reads this at every session start" budget. A pointer with one sentence per convention fits; the full policy lives in `AGENT_DEVELOPMENT_CONVENTIONS.md` and is read on-demand when an agent is actually doing the relevant thing (merging, running a cleanup, inventorying agent-context surfaces).

### What lives where — the three-layer documentation model

| Layer | File(s) | Who reads it | What goes here |
|-------|---------|--------------|----------------|
| **L1 — Session-time context** | Root `CLAUDE.md`, `apps/*/CLAUDE.md`, user MEMORY.md | Every agent at session start | One-liner conventions + pointer to L2 for details. Max: "When doing X, see `docs/AGENT_DEVELOPMENT_CONVENTIONS.md#x`." |
| **L2 — Policy document** | `docs/AGENT_DEVELOPMENT_CONVENTIONS.md` | Agent when it needs the policy, human at audit time | Full policy text, checklists, templates, rationale, cross-refs. |
| **L3 — Skill files** | `.claude/skills/*/SKILL.md`, `superpowers:*` | Agent when invoking a skill | Methodology bound to specific workflow invocations. Delta references policy doc for definitions. |

The single new file + CLAUDE.md one-line addendum + one audit script is the minimum viable codification. Anything more is premature until the operating-cost measurement (analysis-report I.2) right-sizes further investment.

### What does NOT get its own document

- **Not a new `docs/WORKTREE_POLICY.md`** — too narrow; fragments lifecycle thinking. Folded into AGENT_DEVELOPMENT_CONVENTIONS.md §1.
- **Not a new `superpowers:cleanup-sprint-methodology` skill** — skills are for methodology tied to workflow invocation; cleanup sprints are ticket-scoped Linear work, not invocation-scoped. Folded into AGENT_DEVELOPMENT_CONVENTIONS.md §3 with PR template.
- **Not an addendum to `subagent-workflow` skill** — keeps that skill focused on its current job (parallel task execution). Cleanup-sprint-type declaration is a one-line link in the subagent-workflow kickoff step, not an embedded policy.

---

## H.5 — Worktree Lifecycle

### H.5.1 — Enforcement mechanism: **convention-only (documented) + quarterly script**

**Chosen:** Convention documented in `AGENT_DEVELOPMENT_CONVENTIONS.md §1` + one `scripts/worktree-audit.sh` runnable as `pnpm worktree:audit`. No post-merge git hook, no automated deletion.

**Why not a post-merge hook:**
- Detecting "this merge corresponds to branch X whose worktree should now be removed" requires knowing the PR-to-worktree mapping; naming convention (`wt-BEA-XXX-slug`) is the only signal and is advisory. A hook that deletes a worktree containing uncommitted work is a catastrophic failure mode for tiny upside.
- Solo maintainer + AI agent execution: the agent can run `pnpm worktree:audit` explicitly at the end of a `subagent-workflow` feature task. That's better teeth than a hook because the agent sees the audit's output and reacts.

**Why not automated in subagent-workflow:**
- Not every task uses a worktree. Forcing an audit on every task is noise.
- Prescription: when an agent finishes a task that DID use a worktree, the `superpowers:finishing-a-development-branch` checklist gains one step: "Run `pnpm worktree:audit`; resolve any `[ORPHANED]` rows for your branch." This is pull-based — invoked when relevant, skipped when not.

**Teeth vs. cost:**
- Convention-only: teeth low, cost near-zero (one doc edit, one script).
- Hook: teeth medium, cost high (false-positive risk, breakage risk on force-push scenarios).
- Chosen balance is explicit: the audit detects drift quarterly (or on-demand); the agent is responsible for cleanup once detected. The cost of undetected drift is bounded by quarterly check.

### H.5.2 — Deletion trigger: **on branch merge, via `finishing-a-development-branch` checklist**

**Trigger order:**
1. **Primary (per-branch):** Branch merges → `superpowers:finishing-a-development-branch` skill prompts agent to run `git worktree remove .worktrees/<name>` as part of its checklist.
2. **Secondary (quarterly):** `pnpm worktree:audit` flags worktrees whose branches are merged or deleted and which have been idle > 14 days. Human or agent cleans up the list.
3. **Tertiary (annual):** Full prune of `.worktrees/*` directories not in `git worktree list`.

**Not chosen:** PR close trigger (noisy — PRs close for many reasons), manual-only (how we got here).

### H.5.3 — Storage location + naming: **keep `.worktrees/wt-BEA-XXX-slug`**

Keep current convention. Reasons:
- `.worktrees/` is already `.gitignored` (verified Iterator 3 §3).
- `wt-BEA-XXX-slug` naming encodes Linear ticket → worktree mapping, which the audit script uses to cross-check against Linear status.
- Changing the convention now invalidates `scripts/setup-worktree-e2e.sh`'s assumptions and retroactively renames no work that exists (since `.worktrees/` was just cleaned).

**Required addition:** `setup-worktree-e2e.sh` must write a `WORKTREE_MANIFEST` file (`.worktrees/<name>/.worktree-manifest`) containing `{branch, created, linear_id, parent_head}` to give the audit script deterministic metadata instead of parsing directory names.

### H.5.4 — Special CLAUDE.md handling for worktrees: **YES — redirect stub**

**Chosen:** `setup-worktree-e2e.sh` writes a top-level `CLAUDE.md` in each new worktree that REPLACES whatever main's CLAUDE.md was at branch-creation time:

```markdown
# CLAUDE.md — WORKTREE REDIRECT

You are in worktree `<name>` on branch `<branch>`.

This worktree's tracked CLAUDE.md files may become stale relative to main.
**For authoritative repo context, read main's CLAUDE.md at:**
`/Users/j/repos/beak-gaming-platform/CLAUDE.md`

Freshness check:
- Branch HEAD: <sha>, created <date>
- Main HEAD when worktree was created: <sha>
- Run `git log --oneline <parent_head>..main` to see what has changed since branch-off.

If branch is more than 14 days old or drift between branch CLAUDE.md and main is significant, ABORT the current task and consult the human before proceeding.
```

**Why do this, given `.gitignore` already excludes `.worktrees/`:**
- Iterator 3 Finding 3.1 proved the failure mode: agent in wt-BEA-677 read 30 stale CLAUDE.md as authoritative. `.gitignore` prevents merging stale context into main; it does not prevent the *in-worktree* session from being poisoned.
- The redirect stub is cheap (written once at worktree creation) and overrides the branch's own CLAUDE.md for the worktree's lifetime. It is the one-file antidote to the 783 MB poison vector.

**Caveat:** Sub-directory CLAUDE.md files (`apps/bingo/CLAUDE.md`, etc.) in the worktree are NOT overridden — those are branch-state and legitimately diverge. The stub explicitly notes this in its text: "sub-directory CLAUDE.md reflect branch state; cross-check against main for any architectural claim."

### H.5.5 — Recovery posture: **manifest + refuse-to-delete-with-uncommitted-work**

The audit script and any deletion path must:
1. Check `git -C <worktree> status --porcelain` — if non-empty, skip deletion, log `[UNCOMMITTED]`.
2. Check worktree's branch has been pushed (`git -C <worktree> log @{u}..` empty).
3. Only then propose deletion.

Quarterly audit never auto-deletes; it produces a labeled list. Deletion is always a human (or agent explicitly authorized) act.

Recovery for a truly abandoned worktree with uncommitted work: create a `rescue/<branch>` branch in main repo, cherry-pick or `git diff > patch`, delete. Documented in §1.5 of AGENT_DEVELOPMENT_CONVENTIONS.md.

### H.5.6 — Where documented: **AGENT_DEVELOPMENT_CONVENTIONS.md §1, one-line in root CLAUDE.md**

Root CLAUDE.md addition (single line replacing current worktree reference in MEMORY.md-derived conventions):

> **Worktrees:** Lifecycle in `docs/AGENT_DEVELOPMENT_CONVENTIONS.md §1`. Always run `pnpm worktree:audit` before declaring feature-complete.

Full text (6 subsections) lives in `AGENT_DEVELOPMENT_CONVENTIONS.md §1`.

---

## H.6 — Agent Context Hygiene Category

### H.6.1 — Category boundary: **read-at-session-or-tool-time, persistent across sessions**

**Definition:** "Agent context surface" = any file or data source that Claude Code or an agent-subprocess reads automatically (without explicit user request in the current turn) during session start, tool invocation, or directory traversal, AND which persists across sessions.

**Included (IN):**
| Surface | Why in | Ownership |
|---------|--------|-----------|
| Root `CLAUDE.md` | Read every session start | Human-authored, reviewed per-PR |
| `apps/*/CLAUDE.md`, `packages/*/CLAUDE.md` | Read at sub-directory context-load | Human-authored, reviewed per-PR |
| `.worktrees/*/CLAUDE.md` | Read when agent runs in worktree | Auto-generated (redirect stub, H.5.4) |
| User-scoped `/Users/j/.claude/projects/*/memory/MEMORY.md` | Read every session start | Human-authored, user-maintained |
| `<claude-mem-context>` stubs | Read at sub-directory context-load | TO BE DELETED per Iterator 4 — category member post-cleanup is "must-not-exist" |
| `.claude/skills/*/SKILL.md` | Read when skill invoked | Skill author (often same human) |
| `.claude/settings.json`, `.claude/settings.local.json` | Read at session start for hooks/MCP/allowlist | Human-maintained, cross-repo scope |
| `.claude/plugins/installed_plugins.json` (indirect) | Affects available tools | Plugin marketplace + human install decision |
| `scripts/setup-worktree-e2e.sh` (insofar as it writes CLAUDE.md) | Generates agent context | Convention-covered in H.5 |

**Excluded (OUT):**
| Surface | Why out |
|---------|---------|
| Slash-command prompts (e.g., `/commit`) | Invoked explicitly; drift is caught at invocation by user |
| Subagent-workflow custom prompts | Part of L3 skill; drift caught by skill invocation |
| MCP tool transcripts / tool output cache | Ephemeral, per-session |
| Context7 documentation fetches | External, live-fetched, not persistent |
| Vercel env-var listings | Handled by H.10 (separate recommendation) |
| Git commit messages / PR descriptions | Governed by H.7 (cleanup-sprint templates) |
| `docs/**/*.md` that are human-consumption docs | Not read by the agent automatically; governed by Theme 4 docs policy, not this category |

**Rationale for the boundary:** Persistent + auto-read = drift-prone. Ephemeral or explicitly-invoked surfaces are self-correcting at invocation time. This draws the category around exactly the surfaces where Theme 3's mechanism applies.

### H.6.2 — Ownership model: **by-surface, with one "hygiene auditor" role**

| Surface | Owner | Review cadence |
|---------|-------|----------------|
| Root CLAUDE.md | Human author of each PR touching it (pre-commit visibility) | Per-PR |
| `apps/*/CLAUDE.md`, `packages/*/CLAUDE.md` | Author of PR touching the package | Per-PR |
| Worktree CLAUDE.md | `setup-worktree-e2e.sh` (automated stub); audit script for staleness | Quarterly |
| User MEMORY.md | Human (solo maintainer) | On drift-audit or rebrand event |
| claude-mem stubs | N/A — DELETE per H.8, then MUST-NOT-EXIST | Post-cleanup: audit script fails if stubs reappear |
| `.claude/skills/*` | Skill author; solo maintainer for this repo | On skill change |
| `.claude/settings*.json` | Solo maintainer | Ad-hoc; scanned in audit |

**The "hygiene auditor" role:** A designated subagent invocation (`analysis-funnel` with scope "agent-context-hygiene") runs after each cleanup sprint that touches architecture. Not a human role — an invocation pattern. Documented in AGENT_DEVELOPMENT_CONVENTIONS.md §2.3.

### H.6.3 — Freshness signal: **YES for L2 docs + MEMORY.md; NO for CLAUDE.md (too noisy)**

**Chosen:** Freshness-stamp header on `docs/AGENT_DEVELOPMENT_CONVENTIONS.md`, `docs/MANUAL_TEST_PLAN.md`, `docs/E2E_TESTING_GUIDE.md`, `docs/ARCHITECTURE.md`, and `MEMORY.md`. NOT on CLAUDE.md (root or sub-directory).

**Stamp format:**
```markdown
<!-- last-verified: 2026-04-13 · verified-against: a7369f16 · next-audit-after: a7369f16+20-commits OR 2026-05-13 -->
```

**Why stamps:**
- The drift audit itself depends on knowing whether a doc was ever read-for-correctness against a recent HEAD. Without the stamp, every audit re-derives this from `git log` churn analysis (expensive).
- The stamp is advisory (a grep target for the quarterly audit), not enforced.

**Why NOT on CLAUDE.md:**
- CLAUDE.md is read every session. A stamp invites "I'll check the stamp" as a proxy for "I'll check the content," which is worse than no signal.
- CLAUDE.md drift is caught by the per-PR reflex (the file is so central that any material change to the repo should trigger reading it).

**Why on MEMORY.md:**
- Finding 3.4: MEMORY.md claimed "rebrand IN PROGRESS" after rebrand landed. Stamp header would have tagged this file as "last-verified: 2026-03-XX" vs. HEAD `a7369f16`, flagging it at the next session-start scan.

### H.6.4 — Detection mechanism: **ad-hoc event-driven + quarterly sweep**

**Events that trigger agent-context-hygiene sweep:**
1. **Mandatory:** Any cleanup sprint declared as `semantic-review` type (H.7) MUST include an agent-context sweep step in its PR checklist.
2. **Mandatory:** Any architectural concept removal (package deletion, major rename, auth system removal) triggers a sweep before the change merges.
3. **Mandatory:** A rebrand (as BEA-718/719) MUST trigger a `semantic-review` cleanup, which triggers the sweep.
4. **Recommended:** Major dep upgrade touching React / Next.js major versions triggers a sweep (version pins in CLAUDE.md).
5. **Baseline:** Quarterly via `pnpm worktree:audit` (which will grow into `pnpm drift:audit` as coverage expands).

**Not chosen:** Continuous CI gate. Deferred per analysis-report H.4 pending operating-cost measurement. Re-evaluate after 2 more audit cycles.

### H.6.5 — Documentation location: **AGENT_DEVELOPMENT_CONVENTIONS.md §2, with a skill cross-ref**

- Primary text: `docs/AGENT_DEVELOPMENT_CONVENTIONS.md §2 — Agent Context Hygiene`.
- Cross-ref from `.claude/skills/subagent-workflow/SKILL.md` (one sentence): "If your task removes an architectural concept, follow `docs/AGENT_DEVELOPMENT_CONVENTIONS.md §3` (cleanup-sprint) which triggers §2 (agent-context sweep)."
- Addendum to `superpowers:writing-skills` NOT added — keep that skill scoped to "how to write a skill." The trigger lives in subagent-workflow because that's where multi-step architectural changes originate.

---

## H.7 — Cleanup Sprint Methodology

### H.7.1 — Sprint types defined

**Type A: String-swap sprint.**
- Definition: Bulk replacement of a known, enumerable set of literal strings with new literal strings, where every instance can be found by `grep` / `rg` and no architectural concept is being introduced or removed.
- Examples: BEA-716 (e2e fixture vocabulary purge, because fixture names fail-fast at test time), BEA-718 (package scope `@joolie-boolie/*` → `@hosted-game-night/*`, because imports fail-fast at type-check), BEA-719 brand-string refresh (**the failure case** — slipped because the checks were grep-only but the semantic claims in templates were invisible to grep).
- Hallmark: success is measured by `rg '<old-string>' --hidden` returning zero.

**Type B: Semantic-review sprint.**
- Definition: Removal, rename, or replacement of an architectural concept where the concept is described in natural language by many unnamed or synonymous references, and where grep-based detection is insufficient.
- Examples: Architectural auth removal (BEA-688/694/686), platform-hub deletion (BEA-682), standalone conversion (the whole wave). **Retroactive example:** The "semantic variant" of BEA-719 would have included a PR description with a Concepts Table ("Supabase" / "OAuth" / "@joolie-boolie/database" / "platform hub" / "online session model") and a review step confirming each concept was either (a) not present in any doc or (b) intentionally retained with a historical-context note.
- Hallmark: success is measured by reviewer sign-off on a Concepts Table, not by grep silence.

### H.7.2 — When cleanup triggers a semantic pass: **concept-removal is mandatory trigger**

A semantic-review sprint is **mandatory** when ANY of:
1. An entire package / app / architectural module is being removed from the tree (e.g., `packages/auth`, `apps/platform-hub`).
2. A named architectural concept (auth, online sessions, OAuth flow, platform hub, Supabase integration, etc.) is being removed, even if the code removal itself is a small PR.
3. A rebrand affects user-facing identity (brand name, domain, scope prefix) — because brand changes propagate into prose descriptions that don't contain the brand string ("the hosted platform," "our multi-app service").
4. A major dependency upgrade removes a capability (e.g., Next.js API mode change, auth provider swap).

A semantic-review sprint is **optional but recommended** when:
- A feature flag is removed.
- A deprecation period ends.
- An API surface contracts.

A **string-swap sprint** is appropriate when ALL of:
- The replacement set is finite and enumerable at PR authoring time.
- Every instance produces a detectable failure at compile/test time if missed (unused import, unresolved module, undefined variable, failing fixture name).
- No architectural claim in natural-language prose is affected.

**The decision rule for sprint-type declaration:** Ask "what breaks if I miss an instance?" If the answer is "the build," it's Type A. If the answer is "an agent or human reads the doc and believes something false," it's Type B.

### H.7.3 — Checklist templates

**Type A (String-swap) PR description template:**

```markdown
## Cleanup Type: STRING-SWAP

**Replacement map:**
| Old | New | Scope |
| `foo` | `bar` | code + docs + env |

**Detection strategy:**
- [ ] `rg '<old-1>' --hidden` = 0 hits
- [ ] `rg '<old-2>' --hidden` = 0 hits
- [ ] [additional greps for each string]

**Fail-fast verification:** Every missed instance produces [specific failure: e.g., "TS2307 on import"].

**Out of scope (explicitly):**
- Natural-language prose describing removed/renamed concepts (NOT this sprint's job).
- Historical git-log / PR descriptions (accepted as archival).

**If you find a semantic claim during this sprint, STOP and file a follow-up semantic-review ticket.**
```

**Type B (Semantic-review) PR description template:**

```markdown
## Cleanup Type: SEMANTIC-REVIEW

**Concept(s) being removed/renamed:**
| Concept | Prior name(s) / synonyms | Replacement (or "none — deleted") |
| Auth system | "Supabase auth", "OAuth", "JWT middleware", "login" | none — deleted |
| (etc.) |

**Surfaces reviewed line-by-line (not just grepped):**
- [ ] Root `CLAUDE.md`
- [ ] `apps/*/CLAUDE.md`, `packages/*/CLAUDE.md`
- [ ] `docs/ARCHITECTURE.md`
- [ ] `docs/templates/*.md` ← **mandatory (BEA-719 failure lived here)**
- [ ] `docs/MANUAL_TEST_PLAN.md`
- [ ] `docs/E2E_TESTING_GUIDE.md`
- [ ] `apps/*/README.md`, `packages/*/README.md`
- [ ] User MEMORY.md (offer a diff to the user for review — it's their file)
- [ ] `.claude/skills/*/SKILL.md` for cross-refs
- [ ] Agent-context sweep per `AGENT_DEVELOPMENT_CONVENTIONS.md §2.3`

**Per-surface review evidence:**
(for each surface, either "no residue found" OR "residue found + fixed in this PR" OR "residue intentionally retained as historical with a HISTORICAL NOTE block")

**Proof-of-correctness artifacts:**
- [ ] A reviewer (human or a second-agent spec-review) confirmed the Concept Table.
- [ ] For each concept, reviewer confirmed at least one formerly-referencing surface now reads correctly without that concept.
- [ ] An independent `rg` pass using synonym list (e.g., "platform", "hub", "multi-app", "online session") produced no unintended hits.

**If this sprint is rejected as thorough:** go back to the Concept Table, expand synonyms, re-review surfaces. Do not merge with unresolved rows.
```

### H.7.4 — Integration with existing skills: **one-line addendum to subagent-workflow**

**Chosen:** Do NOT create a new `superpowers:cleanup-sprint-methodology` skill. Instead, add one step to the `subagent-workflow` initiation checklist:

> When the Linear ticket starts with "chore:" / "refactor:" / "cleanup" / "rebrand" / "rename" / contains "remove," classify the sprint as Type A or Type B per `docs/AGENT_DEVELOPMENT_CONVENTIONS.md §3`. Use the matching PR-description template.

**Why not a new skill:**
- Skills are invoked *during work*, not at *planning time*. Sprint-type classification happens at Linear-ticket-creation time, which is upstream of skill invocation.
- A cleanup sprint IS a subagent-workflow task; the classification is metadata, not methodology.
- Creating a skill file is additional context-hygiene surface (H.6) that itself drifts.

### H.7.5 — Proof-of-correctness: **Concept Table + independent-synonym grep + second-pass review**

Three artifacts, all required in a Type B PR:

1. **The Concept Table** (H.7.3 template). Authoring the table forces the author to name synonyms; the table serves as the review contract.
2. **Independent-synonym `rg` pass.** The author proposes synonyms; the reviewer adds 3-5 additional ones and re-runs grep. If any hit is found, the table was incomplete — go back.
3. **Second-pass review by a different agent.** Spec-review phase of `subagent-workflow` re-reads every surface in the table's checklist. This is the same mechanism that works for code PRs; applying it to cleanup PRs is the generalization.

**What prevents a Type B sprint from being a disguised Type A:**
- The PR template explicitly lists "Surfaces reviewed line-by-line (not just grepped)" as a separate checklist row. If the author only ran `rg`, that row is empty and the PR is rejectable.
- The "historical NOTE block" affordance — retention of old-concept references with an explicit `> **Historical note:** this doc refers to the pre-standalone auth system, deliberately preserved for provenance.` — gives the author a non-destructive alternative to deletion, which removes the incentive to quietly delete-without-review.
- The reviewer's independent synonym grep is the external signal; the author cannot both write and grade their own synonym list.

---

## Proposed File Tree Changes

### New files
- **`docs/AGENT_DEVELOPMENT_CONVENTIONS.md`** — L2 policy document. ≤300 lines. Sections: §1 Worktree Lifecycle, §2 Agent Context Hygiene, §3 Cleanup Sprint Methodology, §4 PR-Description Templates.
- **`scripts/worktree-audit.sh`** — detects orphans, uncommitted work, stale branches. Wired to `pnpm worktree:audit`.
- **`.worktrees/*/CLAUDE.md`** (auto-generated by `setup-worktree-e2e.sh`) — redirect stub. Not tracked.
- **`.worktrees/*/.worktree-manifest`** (auto-generated) — metadata for audit script. Not tracked.

### Modified files
- **Root `CLAUDE.md`** — add one-line reference under Instructions section: "**Agent conventions:** Worktree lifecycle, context hygiene, cleanup-sprint methodology in `docs/AGENT_DEVELOPMENT_CONVENTIONS.md`." One line, no duplicate content.
- **`scripts/setup-worktree-e2e.sh`** — emit `CLAUDE.md` redirect stub + `.worktree-manifest` on creation.
- **`.claude/skills/subagent-workflow/SKILL.md`** — one-line step added: "Classify sprint type per AGENT_DEVELOPMENT_CONVENTIONS §3 when ticket is a cleanup/refactor."
- **`docs/MANUAL_TEST_PLAN.md`, `docs/E2E_TESTING_GUIDE.md`, `docs/ARCHITECTURE.md`, `MEMORY.md`** — add freshness-stamp header (H.6.3).
- **`package.json`** (root) — add `"worktree:audit": "bash scripts/worktree-audit.sh"` script.

### Deleted files (per H.1, H.8 — not this decision's scope but referenced)
- 22 claude-mem stubs (Iterator 4 command list).
- Orphaned worktrees (already done this session per task context).

### Not created (deliberate)
- No `docs/WORKTREE_POLICY.md` (folded into AGENT_DEVELOPMENT_CONVENTIONS.md).
- No new `superpowers:cleanup-sprint-methodology` skill (folded into AGENT_DEVELOPMENT_CONVENTIONS.md §3 + subagent-workflow addendum).
- No git hooks (convention-only).
- No CI gate (deferred pending operating-cost measurement, analysis-report H.4).

---

## Enforcement Summary Table

| Policy | Mechanism | Teeth | Cost |
|--------|-----------|-------|------|
| H.5.1 Worktree lifecycle convention | Text in `AGENT_DEVELOPMENT_CONVENTIONS.md §1` | Low (advisory) | Near-zero |
| H.5.2 Delete-on-merge trigger | Step in `superpowers:finishing-a-development-branch` | Medium (agent-visible) | One skill edit |
| H.5.3 Naming + manifest | `setup-worktree-e2e.sh` writes manifest | High (deterministic) | ~20 LOC |
| H.5.4 Worktree CLAUDE.md redirect | `setup-worktree-e2e.sh` writes stub | High (overrides stale branch CLAUDE.md) | ~10 LOC |
| H.5.5 Quarterly audit | `scripts/worktree-audit.sh` + `pnpm worktree:audit` | Medium (detection only, no auto-delete) | ~100 LOC shell |
| H.5.6 Recovery posture | Convention + script refuses to delete uncommitted work | High (safety) | Built into audit script |
| H.6.1 Category boundary | Text in §2 | Low (definition only) | Near-zero |
| H.6.2 Ownership model | Text + table | Low (advisory) | Near-zero |
| H.6.3 Freshness stamps | Header in each listed doc + grep | Low (advisory; flagged by audit) | One header per file |
| H.6.4 Event-triggered sweep | PR-description template requirement | High (PR reviewer enforces) | Template text |
| H.6.5 Doc location | Text | N/A | N/A |
| H.7.1 Type A/B definitions | Text in §3 | Low (definition only) | Near-zero |
| H.7.2 Mandatory trigger conditions | Checklist in §3.2 | Medium (author self-classifies; reviewer challenges) | Near-zero |
| H.7.3 PR templates (Type A, Type B) | `.github/PULL_REQUEST_TEMPLATE.md` addition OR `docs/AGENT_DEVELOPMENT_CONVENTIONS.md §4` | High (PR body structure enforced by review) | Template text |
| H.7.4 Skill integration | One line in `subagent-workflow/SKILL.md` | Medium (agent-visible) | One line |
| H.7.5 Proof-of-correctness | Concept Table + independent grep + spec-review | High (independent reviewer challenges author's list) | Embedded in PR template |

**Teeth-vs-cost stance:** High teeth are reserved for the two highest-leverage moments: worktree creation (H.5.4 auto-stub) and PR review of a Type B sprint (H.7.5 independent synonym grep). Everywhere else, the policy is deliberately convention-only because the cost of high teeth (false positives, breakage, maintenance) exceeds the value in a solo-maintainer + AI-only repo.

---

## Rollout Order

Phase these so each step provides value independent of subsequent phases.

### Phase 1 — Doc scaffolding (Linear ticket: BEA-H-scaffolding)
1. Create `docs/AGENT_DEVELOPMENT_CONVENTIONS.md` with all four sections populated from this decision.
2. Add one-line reference in root `CLAUDE.md`.
3. Add freshness-stamp headers to MTP, E2E guide, ARCHITECTURE.md, MEMORY.md.
4. **Exit criteria:** Doc exists and is referenced from CLAUDE.md; no script changes yet.

### Phase 2 — Worktree automation (Linear ticket: BEA-H-worktree-auto)
5. Update `scripts/setup-worktree-e2e.sh` to emit CLAUDE.md redirect stub + `.worktree-manifest`.
6. Create `scripts/worktree-audit.sh` + wire `pnpm worktree:audit`.
7. Add worktree-audit step to `superpowers:finishing-a-development-branch` skill.
8. **Exit criteria:** `pnpm worktree:audit` runs clean (zero orphans, since they were just cleaned). Creating a new test worktree produces the redirect stub.

### Phase 3 — Cleanup-sprint enforcement (Linear ticket: BEA-H-cleanup-templates)
9. Add Type A + Type B PR templates to `.github/PULL_REQUEST_TEMPLATE.md` as optional sections (or `docs/AGENT_DEVELOPMENT_CONVENTIONS.md §4` referenced from the main template).
10. Add sprint-type classification line to `subagent-workflow` SKILL.md.
11. **Exit criteria:** A manually-authored Type B cleanup PR can be drafted using the template.

### Phase 4 — Validation (next cleanup sprint)
12. Use Type B template on the next semantic-review sprint (likely executing H.3, the Iterator 2 prose-doc rewrite, which IS a Type B cleanup).
13. Retrospective: did the Concept Table catch what BEA-719 missed? If yes, the policy is validated. If no, iterate on template.

### Phase 5 — Defer / blocked
- CI gate for doc staleness — blocks on operating-cost measurement (analysis-report H.4, I.2).
- Continuous agent-context sweep — blocks on B10 completion.
- Convert convention-only enforcement to git hooks — blocks on 2 more audit cycles' worth of data on whether convention-only drift rate is acceptable.

---

## Open Questions

1. **PR template format conflict.** The repo already has a `.github/PULL_REQUEST_TEMPLATE.md` with a mandatory Five-Level Explanation section. Can Type A/B templates be additive (prepended sections) or do they need to replace parts of the current template? **Proposal:** Additive. The cleanup-type declaration is 3-5 lines at the top; the Five-Level Explanation remains below it unchanged. Verify this doesn't violate any existing PR-check automation.

2. **Freshness stamp enforcement.** If the stamp is advisory, what stops it from itself drifting (i.e., the stamp says "verified against a7369f16" but the file has been edited since)? **Partial mitigation:** Stamps are grep targets for the audit script — if `git log <stamp-sha>..HEAD -- <file>` has entries, the file is stamp-stale. Run in `pnpm worktree:audit`.

3. **Is `.claude/settings.json` really in-boundary for H.6?** It's cross-repo and user-scoped, not repo-scoped. Arguably it belongs in the *user*'s agent-context hygiene responsibility, not this repo's. **Provisional:** Include it for inventory (H.6.1 table), exclude it from this repo's ownership model (H.6.2). Flagged for revisit at next audit.

4. **Second-agent spec review for Type B — who?** The existing `subagent-workflow` has a spec-review phase. Does the same agent role suffice for cleanup sprints, or does Type B warrant a dedicated "cleanup-reviewer" agent? **Provisional:** Same agent role, different prompt emphasis (pointed at the Concept Table + synonym expansion). Revisit if Phase 4 validation shows weakness.

5. **Does MEMORY.md get a freshness stamp even though it's user-scoped (outside repo)?** It's at `/Users/j/.claude/projects/...`, not in `docs/`. Whether a stamp added to it by an AI agent survives (user hand-edits may strip it) is unknown. **Provisional:** Add the stamp; if it gets stripped, file a follow-up noting the user's editing reflex conflicts with the policy and revisit.

6. **`setup-worktree-e2e.sh` currently has a narrow purpose (port offset for E2E).** Expanding it to write a CLAUDE.md redirect and manifest stretches its scope. **Alternative:** Create a separate `scripts/create-worktree.sh` that wraps both. **Provisional:** Extend `setup-worktree-e2e.sh`; revisit if the script gets unwieldy.

7. **What if an agent starts in an un-`setup-worktree-e2e`'d worktree?** (User `cd`s into a raw `git worktree add` directory without running the script.) **Provisional:** Document in AGENT_DEVELOPMENT_CONVENTIONS.md §1.4 that the script is mandatory for any worktree the agent will operate in; the audit script flags worktrees missing a manifest.

---

## Rationale Summary

**One sentence per major design choice:**

- **Single policy doc** because three separate docs compound drift-surface (Theme 4 mechanism applied recursively to the policy docs themselves).
- **Convention-only for worktree lifecycle** because automated deletion with uncommitted work is a catastrophic failure mode for a low-incidence problem in a solo-maintainer repo.
- **Auto-generated worktree CLAUDE.md redirect stub** because it is the single highest-leverage intervention against Finding 3.1 (wt-BEA-677 agent poisoning) and costs ≤10 LOC.
- **Freshness stamps on L2 docs but not CLAUDE.md** because stamps on high-read files become a check-the-stamp substitute for reading the content.
- **Event-triggered rather than continuous agent-context audits** because continuous audit cost exceeds demonstrated drift rate, and the events (cleanup sprints, concept removals, rebrands) ARE the known drift-producers.
- **Two cleanup-sprint types declared at Linear-ticket-planning time** because BEA-719 failed by being implicitly classified as Type A when it needed Type B; explicit declaration forces the author to face the question.
- **PR templates rather than CI gates as enforcement** because template compliance is reviewed by a human/agent reviewer (who applies judgment) whereas CI gates check literals; for semantic-review sprints the review is the point.
- **Skill-integration via one-line addendum to subagent-workflow** rather than a new skill because sprint-type is planning metadata, not invocation methodology, and every new skill file is another context-hygiene surface to maintain.
- **Proof-of-correctness = Concept Table + independent synonym grep + spec-review** because no single mechanism alone defeats the "disguised Type A" failure mode; three layers of independent checking match the mechanism Theme 1 recommends (multiple gatekeepers where the compiler is absent).
- **Rollout in 5 phases** because each phase delivers stand-alone value; if Phase 4 validation reveals the policy doesn't catch what BEA-719 missed, only Phase 3's templates need iteration, not the whole framework.
