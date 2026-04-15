# Iteration 3: Worktree Hygiene Cross-Cut Analysis

## Assignment

Scope worktree context pollution beyond wt-BEA-677 by investigating all 7 worktrees under `.worktrees/`. Inventory each worktree's branch state, CLAUDE.md pollution, stale content signature, uncommitted work, and merge status. Propose a worktree hygiene policy based on findings.

---

## Worktree Inventory Table

| Worktree | Branch | HEAD | CLAUDE.md Count | Stale References | Uncommitted Work | Status | Size | Recommended Action |
|----------|--------|------|-----------------|------------------|------------------|--------|------|-------------------|
| `issue-79-trivia-e2e` | main | `a7369f16` | 0 | None | Clean | Fresh | 680KB | **DELETE** (orphaned, minimal content) |
| `wave2` | main | `a7369f16` | 0 | None | Clean | Orphaned | 0B | **DELETE** (empty) |
| `work` | main | `a7369f16` | 0 | None | Clean | Orphaned | 0B | **DELETE** (empty) |
| `wt-BEA-590-integration` | main | `a7369f16` | 0 | None | Clean | Orphaned | 1.4MB | **DELETE** (orphaned) |
| `wt-BEA-664-bingo-sounds` | main | `a7369f16` | 0 | None | Clean | Orphaned | 1.8MB | **DELETE** (orphaned) |
| `wt-BEA-675-handleNextRound-fix` | main | `a7369f16` | 0 | None | Clean | Orphaned | 40KB | **DELETE** (orphaned) |
| `wt-BEA-677-layout-constraints` | main | `a7369f16` | 30 | 8/30 (26.7%) | Clean | **POLLUTED** | 783MB | **DELETE** (stale CLAUDE.md + full pre-standalone tree) |

---

## Per-Worktree Detail

### issue-79-trivia-e2e

- **Branch:** main (at HEAD `a7369f16`)
- **Status:** No .git worktree registry entry; not shown in `git worktree list`
- **CLAUDE.md count:** 0
- **Stale content:** None
- **Uncommitted work:** Clean
- **Size:** 680KB (test-results directory only)
- **Recommended disposition:** **DELETE** — Orphaned worktree created Jan 21, not registered with git, appears to be test artifact container.

---

### wave2

- **Branch:** main (at HEAD `a7369f16`)
- **Status:** No .git worktree registry entry; empty directory
- **CLAUDE.md count:** 0
- **Stale content:** None
- **Uncommitted work:** None (empty)
- **Size:** 0B
- **Recommended disposition:** **DELETE** — Empty stub, orphaned since Feb 25.

---

### work

- **Branch:** main (at HEAD `a7369f16`)
- **Status:** No .git worktree registry entry; empty directory
- **CLAUDE.md count:** 0
- **Stale content:** None
- **Uncommitted work:** None (empty)
- **Size:** 0B
- **Recommended disposition:** **DELETE** — Empty stub, orphaned since Jan 23.

---

### wt-BEA-590-integration

- **Branch:** main (at HEAD `a7369f16`)
- **Status:** No .git worktree registry entry; contains minimal files
- **CLAUDE.md count:** 0
- **Stale content:** None
- **Uncommitted work:** Clean (git status --porcelain: only untracked .claude/scheduled_tasks.lock + docs/drift-audit-2026-04)
- **Size:** 1.4MB
- **Recommended disposition:** **DELETE** — Orphaned since Feb 21; BEA-590 branch not found in `git branch`; worktree never registered in git.

---

### wt-BEA-664-bingo-sounds

- **Branch:** main (at HEAD `a7369f16`)
- **Status:** No .git worktree registry entry; contains minimal files
- **CLAUDE.md count:** 0
- **Stale content:** None
- **Uncommitted work:** Clean (git status --porcelain: only untracked .claude/scheduled_tasks.lock + docs/drift-audit-2026-04)
- **Size:** 1.8MB
- **Recommended disposition:** **DELETE** — Orphaned since Mar 5; BEA-664 branch exists in git (`chore/BEA-664-bingo-sounds`) and is merged into main; worktree no longer needed.

---

### wt-BEA-675-handleNextRound-fix

- **Branch:** main (at HEAD `a7369f16`)
- **Status:** No .git worktree registry entry; contains minimal files
- **CLAUDE.md count:** 0
- **Stale content:** None
- **Uncommitted work:** Clean (git status --porcelain: only untracked .claude/scheduled_tasks.lock + docs/drift-audit-2026-04)
- **Size:** 40KB (only apps/ subdir)
- **Recommended disposition:** **DELETE** — Orphaned since Mar 11; BEA-675 branch not found in `git branch`; worktree never registered in git.

---

### wt-BEA-677-layout-constraints

- **Branch:** main (at HEAD `a7369f16`)
- **Status:** No .git worktree registry entry; but CONTAINS FULL PRE-STANDALONE TREE
- **CLAUDE.md count:** 30 files
- **Stale content signature:** **8 of 30 contain removed-system references** (verified via grep for "platform-hub", "Platform Hub", "packages/auth", "packages/database", "lib/supabase", "@joolie-boolie", "joolie-boolie")
  - `CLAUDE.md`: 10 references to Supabase, Platform Hub, OAuth
  - `apps/bingo/CLAUDE.md`: 12 references to @joolie-boolie scope
  - `apps/trivia/CLAUDE.md`: 12 references to @joolie-boolie scope
  - 5 other CLAUDE.md files in `apps/platform-hub/*/`, `lib/oauth/`, `lib/supabase/` (all deleted directories)
- **Uncommitted work:** Clean (git status --porcelain: only untracked .claude/scheduled_tasks.lock + docs/drift-audit-2026-04)
- **Size:** 783MB (includes full `apps/platform-hub/` tree, `bingo-voice-pack-temp/`, node_modules, and all pre-standalone source)
- **File dates:** All CLAUDE.md files dated Mar 11 22:45:33 2026 (before BEA-682 platform-hub deletion on Apr 9)
- **Recommended disposition:** **DELETE** — CRITICAL. This worktree is a complete pre-standalone-conversion snapshot frozen at Mar 11. When Claude Code operates here, it reads 30 CLAUDE.md files describing OAuth, Supabase, and platform-hub as active systems. This is the highest-fidelity agent-poison vector in the repo.

---

## Agent-Poison Risk Quantification

### Risk Matrix

| Scenario | Worktree | Risk Level | Impact |
|----------|----------|-----------|--------|
| Agent reads root CLAUDE.md from wt-BEA-677 | wt-BEA-677 | **CRITICAL** | Agent believes Platform Hub is active, Supabase auth exists, OAuth flows exist. Will attempt to reference deleted systems. |
| Agent attempts feature work (e.g., adding socket endpoint) from wt-BEA-677 | wt-BEA-677 | **CRITICAL** | Agent sees `packages/auth/` and `packages/database/` on disk (present in worktree), attempts to import from them, or writes code assuming they're real. Confusion between worktree state and main state. |
| Agent reads apps/bingo/CLAUDE.md from wt-BEA-677 | wt-BEA-677 | **HIGH** | Agent believes `@joolie-boolie/sync`, `@joolie-boolie/ui`, etc. are active packages. Will write import statements that fail (main uses `@hosted-game-night/*`). |
| Agent reads apps/platform-hub/* CLAUDE.md from wt-BEA-677 | wt-BEA-677 | **CRITICAL** | Entire app documentation describes non-existent system. Total context misalignment. |
| Agent in other worktrees | All others except BEA-677 | **NONE** | No CLAUDE.md pollution in other 6 worktrees. No stale context. No risk. |

### Absorption Chain

If a Claude Code session runs `cd .worktrees/wt-BEA-677-layout-constraints && claude`, the session loads:

1. Root `CLAUDE.md` → describes Supabase, Platform Hub, OAuth, joolie-boolie brand
2. `apps/bingo/CLAUDE.md` → imports @joolie-boolie/*, describes JWT middleware
3. `apps/trivia/CLAUDE.md` → imports @joolie-boolie/*, describes OAuth flows
4. 27 sub-directory CLAUDE.md files → describe deleted systems (platform-hub, auth, database, supabase, oauth)
5. `apps/platform-hub/CLAUDE.md` → describes entire deleted app as if active

Result: **Agent believes it's working in pre-standalone-conversion codebase.** Every import statement, every feature addition, every bug fix is framed against a 2-month-old architecture that no longer exists.

**Drift magnitude:** 783MB on disk, 30 CLAUDE.md files, 8 containing active agent-poison content (27% of total, 100% of substantive files). Only worktree created before standalone conversion (Mar 11); all others are fresh.

---

## Recommended Hygiene Policy

### 1. **Immediate Cleanup (One-time)**
   - Delete all 7 worktrees under `.worktrees/` via `git worktree prune && rm -rf .worktrees/*` (or manual `git worktree remove` if they're still registered).
   - These are orphaned: not shown in `git worktree list`, not tied to active feature branches, accumulating disk waste (783MB alone for wt-BEA-677).
   - Note: wt-BEA-677 was created pre-standalone-conversion (Mar 11) and never cleaned up. Others are benign empty stubs, but should be removed for hygiene.

### 2. **Prevent Future Orphans: Lifecycle Management**
   - **Create worktree:** Follow existing pattern in `scripts/setup-worktree-e2e.sh`. Worktrees are created for parallel E2E testing.
   - **Delete worktree:** When the feature branch merges into main, the creator MUST run `git worktree remove .worktrees/<name>` to deregister.
   - **Enforce:** Add a pre-push hook or PR checklist reminder: "If you created a worktree, you must delete it before merging."
   - **Audit quarterly:** Run `git worktree list` + compare against `.worktrees/` directory. If a directory exists but isn't in git worktree list, it's orphaned and should be removed.

### 3. **Prevent CLAUDE.md Pollution in New Worktrees**
   - `.worktrees` is already in `.gitignore` — good.
   - Worktrees inherit the repo's HEAD state (main's files). When you create a worktree, it gets main's current CLAUDE.md files, not pre-conversion artifacts.
   - **Risk:** If a feature branch modifies CLAUDE.md and lands in main, worktrees created later will have fresh CLAUDE.md. But if a worktree is left orphaned for months (like wt-BEA-677), it accumulates stale CLAUDE.md files from its creation date.
   - **Mitigation:** Delete worktrees promptly after feature work. Set a 2-week expiration policy: if a worktree hasn't been accessed in 2 weeks, it's a candidate for deletion.

### 4. **Document Worktree Usage**
   - Update `CLAUDE.md` with a "Worktree Workflow" section:
     ```
     **Worktrees:** Use `scripts/setup-worktree-e2e.sh` to create worktrees for parallel E2E testing.
     Always delete the worktree after the feature branch merges: `git worktree remove .worktrees/<name>`.
     Do not leave worktrees orphaned — they accumulate stale context and disk waste.
     ```
   - Update `scripts/setup-worktree-e2e.sh` with a shutdown/cleanup section at the end (or create a companion `cleanup-worktree.sh`).

### 5. **Redirect CLAUDE.md for Unavoidable Worktrees**
   - **If a worktree must be left alive for extended periods** (e.g., long-running investigation branch), create a `CLAUDE.md` redirect:
     ```markdown
     # CLAUDE.md — WORKTREE REDIRECT
     
     This worktree is on branch `<branch-name>` and may have stale context.
     For the authoritative repo context, see the main repo's CLAUDE.md.
     
     To verify freshness: `git log --oneline -5` (if you see commits older than 2 weeks, consider deleting and re-creating).
     ```
   - This is a last resort, not a first-line mitigation.

---

## Resolved Questions

1. **Is there an existing worktree hygiene process?**
   - No formal process found. `scripts/setup-worktree-e2e.sh` creates worktrees but does not delete them. No cleanup script exists.

2. **Should worktrees be deleted after branch merge?**
   - **Yes.** This is standard git practice. Worktrees are ephemeral, created for parallel work, and should be torn down after the feature lands.

3. **Is `.worktrees/` .gitignored?**
   - **Yes.** Confirmed in `.gitignore:65`.

4. **Do all worktrees live under `.worktrees/`?**
   - **Yes.** All 7 are under `.worktrees/`.

5. **Is there a script like `scripts/setup-worktree-e2e.sh` that manages worktrees?**
   - **Yes.** `scripts/setup-worktree-e2e.sh` creates worktrees and sets up E2E port configuration. **No cleanup counterpart exists.**

6. **What's the risk surface when Claude operates in a stale worktree?**
   - **Critical.** Stale CLAUDE.md files describe removed systems (OAuth, Supabase, platform-hub). Agent reads them as authoritative context and writes code against a ghost architecture.

---

## Remaining Unknowns

1. **Why are 6 of 7 worktrees orphaned (not registered in `git worktree list`)?**
   - Possibly: old `git worktree remove` calls failed or were incomplete, or `git gc` / `git worktree prune` didn't clean them up.
   - The directories persist but git doesn't recognize them.

2. **When was wt-BEA-677 last accessed?**
   - Last file mtime: Mar 11 22:45. No way to verify actual access without audit logs.

3. **Are there other orphaned worktree directories on the user's machine (outside `.worktrees/`)?**
   - Not in scope for this audit. But the `.worktrees/` directory is the canonical location per phase-0 brief.

4. **Should the "E2E_TESTING flag" in `scripts/setup-worktree-e2e.sh` be documented in CLAUDE.md?**
   - Possibly. Currently mentioned in main `CLAUDE.md` only for main repo usage; worktree-specific E2E guidance is in `scripts/setup-worktree-e2e.sh` itself.

---

## Revised Understanding

### Before This Analysis

- Phase 1 found wt-BEA-677 had 30 stale CLAUDE.md files and flagged it as a critical agent-poison vector.
- Assumption: other worktrees might have similar pollution.

### After This Analysis

- **All 7 worktrees are problematic, but for different reasons:**
  - **wt-BEA-677:** Actively poisonous (30 stale CLAUDE.md, full pre-standalone tree, 783MB).
  - **6 others:** Orphaned stubs (empty or minimal content, no CLAUDE.md pollution, but wasting disk and cluttering the worktree directory).
- **The real systemic issue:** No worktree lifecycle management. Worktrees are created but never deleted, accumulating on disk and remaining in `.worktrees/` forever.
- **The agent-poison issue is isolated:** Only wt-BEA-677 is a real context threat. The others are benign in terms of agent coherence; they're just disk waste and directory pollution.
- **The fix is straightforward:** Delete all 7 now, establish a cleanup policy, and document it in CLAUDE.md.

### Key Insight: Worktree Decay vs. Tracked CLAUDE.md Decay

- **Tracked CLAUDE.md decay** (from Phase 1, Area 4): 21 of 26 tracked files are auto-generated stubs, 2 months stale. These affect every agent session because they're checked into git. Requires active maintenance or deletion.
- **Worktree CLAUDE.md decay** (this analysis): Isolated to one worktree (wt-BEA-677), but that one is **catastrophically stale** (783MB, 30 files, 2 months old). Affects only agents who happen to cd into that specific directory. Fix: Delete the worktree.

---

## Summary (≤150 words)

**All 7 worktrees under `.worktrees/` should be deleted.** Six are orphaned stubs (not registered in `git worktree list`, minimal or zero content, created months ago). One (wt-BEA-677) is actively poisonous: 783MB, 30 stale CLAUDE.md files describing removed systems (Supabase, OAuth, platform-hub), last modified Mar 11 before standalone conversion. An agent operating in wt-BEA-677 absorbs ghost-architecture context and will write code against deleted systems.

**Root cause:** No worktree lifecycle management. Worktrees are created via `scripts/setup-worktree-e2e.sh` but never deleted after feature branches merge, accumulating as orphaned directories.

**Recommendation:** (1) Delete all 7 worktrees immediately. (2) Add lifecycle policy to CLAUDE.md: "Delete worktrees after branch merge via `git worktree remove`." (3) Add quarterly audit: compare `git worktree list` to `.worktrees/` directory contents.

