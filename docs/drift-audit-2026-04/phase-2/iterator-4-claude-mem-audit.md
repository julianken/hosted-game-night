# Iteration 4: claude-mem Stub Audit

**Iterator:** Phase 2 Iterator 4
**Repo HEAD:** `a7369f16` (main)
**Date:** 2026-04-13
**Scope:** What `claude-mem` is, the 22 tracked `<claude-mem-context>` stubs, the 2 OAuth/JWT-citing ones, and per-file disposition.

---

## Assignment

Determine what claude-mem is, whether the 21 (actually 22 — see correction below) stubs are harmful, and propose disposition per stub plus a systemic recommendation.

**Correction to Phase 1 / Phase 0 count:** Area 4's report says "21 of 26 tracked CLAUDE.md are claude-mem auto-generated stubs." Actual count is **22 of 26**. The 4 substantive files are:
- `CLAUDE.md` (root, 114 lines) `[tracked-HEAD]`
- `apps/bingo/CLAUDE.md` (171 lines) `[tracked-HEAD]`
- `apps/trivia/CLAUDE.md` (237 lines) `[tracked-HEAD]`
- `packages/game-stats/CLAUDE.md` (53 lines) `[tracked-HEAD]`

26 − 4 = **22** stubs, not 21. Area 4 appears to have miscounted. Provenance for the 22: all verified against `git ls-files | grep CLAUDE.md$` and on-disk content.

---

## What Is claude-mem? (investigation findings)

**claude-mem is an installed Claude Code plugin.** Not an npm dep, not a shell script, not a VS Code extension. It ships via the Claude Code plugin marketplace `thedotmack/claude-mem`. `[live-verified]` via `/Users/j/.claude/plugins/installed_plugins.json`.

### Identity

- **Package:** `claude-mem@thedotmack` version **9.0.12**
- **Installed:** 2026-02-04T00:57:50.978Z
- **Scope:** `project` — scoped to `/Users/j/repos/beak-gaming-platform` (also installed in `/Users/j/repos/double-bind`)
- **Install root:** `/Users/j/.claude/plugins/cache/thedotmack/claude-mem/9.0.12/`
- **Allowlist reference:** `.claude/settings.local.json` allows `WebFetch(domain:docs.claude-mem.ai)` — documents the user treated it as a live/trusted tool
- **Stored on disk:** `/Users/j/.claude-mem/` — 187 MB SQLite database (`claude-mem.db`, 186957824 bytes), WAL file, vector-db/, 20 daily log files from 2026-02-17 through 2026-04-12

### What It Actually Does (disassembled from worker-service.cjs + hooks.json)

The plugin runs a background Bun HTTP worker (`worker-service.cjs`, daemon on `127.0.0.1:37777`). Hooks:

| Claude Code event | claude-mem hook command |
|-------------------|-------------------------|
| `SessionStart` (startup/clear/compact) | `smart-install.js`, `start`, `hook claude-code context`, `hook claude-code user-message` |
| `UserPromptSubmit` | `start`, `hook claude-code session-init` |
| `PostToolUse` (matcher `*`) | `start`, `hook claude-code observation` |
| `Stop` | `start`, `hook claude-code summarize` |

**The tool records observations, session summaries, and user prompts into a SQLite DB.** It serves those back to future sessions via:

1. **MCP tools** — `mcp__plugin_claude-mem_mcp-search__search`, `__timeline`, `__get_observations`, `____IMPORTANT` (registered in `/Users/j/.claude/settings.json`, `[live-verified]`).
2. **Cursor integration ONLY** — it writes a context file to `.cursor/rules/claude-mem-context.mdc` via `u$()` function in `worker-service.cjs` (lines ~760-780, `[live-verified]` by `rg` grep of the script). This is active for Cursor users; this repo has no `.cursor/` directory so this code path is dormant here.

**Critical finding:** Searching `worker-service.cjs` for writes to `CLAUDE.md` yields zero hits. The claude-mem worker **does not rewrite or refresh tracked `CLAUDE.md` files in this repo**. It ONLY writes to:
- `~/.claude-mem/claude-mem.db` (its own SQLite)
- `~/.claude-mem/logs/*.log`
- `.cursor/rules/claude-mem-context.mdc` (only if Cursor hooks are installed; they're not here)

**Live status:** Worker PID 33371, started 2026-04-09T14:50:37Z, still running per `ps -p 33371` (Bun daemon). `[live-verified]`. Last log entry: `2026-04-12 06:53:57.078 [INFO] [SYSTEM] Worker already running and healthy`.

### Where the Tracked Stubs Came From

**The 22 tracked `<claude-mem-context>` CLAUDE.md files are NOT auto-written by the running claude-mem tool.** They were committed ONCE, by hand, in commit `f68e23a7` on 2026-02-16:

```
commit f68e23a7780e46f4e685080c67f3ab4b6d089798
Author: Julian Kennon <julian.kennon.d@gmail.com>
Date:   Mon Feb 16 12:35:15 2026 -0700
    docs: add subdirectory CLAUDE.md context files and audit reports
    Adds 34 CLAUDE.md files across apps and packages for AI agent context...
```

The commit added 34 CLAUDE.md files (12 of which were then removed during auth/platform-hub/database deletion waves in BEA-682/688/694, leaving 22 tracked today). The `<claude-mem-context>` tags were pasted in as a snapshot of what claude-mem would later inject via Cursor — but only once. Since `f68e23a7` (Feb 16), no commit has touched the stubs' content.

**`[tracked-HEAD]` verification:**
```
$ git log --follow --format="%h %ad %s" -- apps/bingo/src/CLAUDE.md
f68e23a7 Mon Feb 16 12:35:15 2026 -0700 docs: add subdirectory CLAUDE.md context files and audit reports
52b357bc Wed Feb 4 10:32:22 2026 -0700  fix(oauth): use database for token exchange instead of Supabase auth
```

The `52b357bc` "fix(oauth)" touch on `apps/bingo/src/CLAUDE.md` is from a different file (path overlap in follow mode); the live stub content entered the repo at `f68e23a7`.

### Conclusion on "what it is"

claude-mem is a **live, running** Claude Code plugin whose useful contribution to *this* session is the MCP search tools over the 187 MB SQLite observation history. **The 22 tracked stubs are orphaned artifacts of a one-time Feb 16 export**; the running tool neither maintains them nor refreshes them. They are dead weight with no re-generation path active for tracked files.

---

## Inventory: All `<claude-mem-context>` Files

All 22 files verified `[tracked-HEAD]` via `git ls-files`. Content dump performed 2026-04-13. Sizes in bytes.

### Legend
- **empty** — contains only `*No recent activity*` placeholder (169 bytes typical)
- **substantive-stale** — contains Feb 3-4 Recent Activity table that is still current about historical events
- **misleading** — contains Feb 3-4 entries that cite removed systems (auth/OAuth/JWT/platform-hub) as "Recent Activity" in a way an agent could interpret as current

| # | Path | Lines | Size | Content Type | Feb Date | Disposition |
|---|------|-------|------|--------------|----------|-------------|
| 1 | `apps/bingo/src/CLAUDE.md` | 14 | 683 | **MISLEADING** — cites BEA-473 token refresh, JWT Middleware (5 items) | Feb 3, 2026 | **DELETE** |
| 2 | `apps/trivia/src/CLAUDE.md` | 10 | 351 | **MISLEADING** — cites "OAuth, CORS, and domain configuration analysis" | Feb 4, 2026 | **DELETE** |
| 3 | `apps/bingo/src/components/presenter/CLAUDE.md` | 6 | 169 | empty | — | **DELETE** |
| 4 | `apps/bingo/src/hooks/CLAUDE.md` | 6 | 169 | empty | — | **DELETE** |
| 5 | `apps/bingo/src/lib/game/CLAUDE.md` | 10 | 333 | substantive-stale (pattern dedup meta-observation) | Feb 4, 2026 | **DELETE** |
| 6 | `apps/bingo/src/lib/game/patterns/CLAUDE.md` | 6 | 169 | empty | — | **DELETE** |
| 7 | `apps/bingo/src/lib/sync/CLAUDE.md` | 6 | 169 | empty | — | **DELETE** |
| 8 | `apps/bingo/src/stores/CLAUDE.md` | 6 | 169 | empty | — | **DELETE** |
| 9 | `apps/trivia/src/components/presenter/CLAUDE.md` | 6 | 169 | empty | — | **DELETE** |
| 10 | `apps/trivia/src/hooks/CLAUDE.md` | 6 | 169 | empty | — | **DELETE** |
| 11 | `apps/trivia/src/lib/game/CLAUDE.md` | 10 | 333 | substantive-stale (same meta-observation as #5) | Feb 4, 2026 | **DELETE** |
| 12 | `apps/trivia/src/stores/CLAUDE.md` | 6 | 169 | empty | — | **DELETE** |
| 13 | `docs/CLAUDE.md` | 6 | 169 | empty | — | **DELETE** or **REWRITE** (see below) |
| 14 | `packages/error-tracking/src/CLAUDE.md` | 11 | 447 | substantive-stale (export count observations) | Feb 4, 2026 | **DELETE** |
| 15 | `packages/game-stats/src/CLAUDE.md` | 6 | 169 | empty | — | **DELETE** |
| 16 | `packages/game-stats/src/stats/CLAUDE.md` | 14 | 725 | substantive-stale (export count + module discovery) | Feb 4, 2026 | **DELETE** |
| 17 | `packages/sync/src/CLAUDE.md` | 6 | 169 | empty | — | **DELETE** |
| 18 | `packages/testing/src/CLAUDE.md` | 10 | 355 | substantive-stale (audit report meta) | Feb 4, 2026 | **DELETE** |
| 19 | `packages/theme/src/CLAUDE.md` | 6 | 169 | empty | — | **DELETE** |
| 20 | `packages/types/src/CLAUDE.md` | 10 | 332 | substantive-stale (export count verification) | Feb 4, 2026 | **DELETE** |
| 21 | `packages/ui/src/CLAUDE.md` | 6 | 169 | empty | — | **DELETE** |
| 22 | `scripts/CLAUDE.md` | 10 | 330 | substantive-stale (Serena MCP perms script creation) | Feb 3, 2026 | **DELETE** |

**Totals:**
- 22 files, 5884 bytes combined, 175 lines total tracked
- 13 are **empty** (`*No recent activity*`)
- 7 are **substantive-stale** (historical, not misleading — refer to real events like "pattern dedup" or "export count verification")
- 2 are **misleading** (cite removed systems with language that reads as current status)

---

## The 2 OAuth/JWT-Citing Stubs (deep dive)

Confirmed via `Grep` on `**/CLAUDE.md`:

### `apps/bingo/src/CLAUDE.md` — 5 entries, all auth-era

Full content `[tracked-HEAD]`:

```
<claude-mem-context>
# Recent Activity

<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->

### Feb 3, 2026

| ID | Time | T | Title | Read |
|----|------|---|-------|------|
| #174 | 9:49 PM | 🟣 | BEA-473 spec review completed - Bingo token refresh verified compliant | ~487 |
| #169 | "     | 🟣 | BEA-473 Bingo token refresh implementation completed | ~416 |
| #138 | 9:03 PM | 🟣 | Bingo Middleware Updated with Proactive Token Refresh Logic | ~431 |
| #136 | 9:02 PM | 🟣 | Token Refresh Utilities Created for Bingo Application | ~352 |
| #68  | 8:49 PM | 🔵 | Bingo App JWT Middleware for Route Protection | ~356 |
</claude-mem-context>
```

**Poison potential (high):**
- BEA-473 was closed during the auth removal wave. **Verified** `git log --all --format="%h %s" | grep BEA-473` shows the Linear ID is historical.
- "Bingo App JWT Middleware for Route Protection" — `apps/bingo/src/middleware.ts` does not exist at HEAD. `[live-verified]` by `ls apps/bingo/src/ | grep -i middleware` returning nothing.
- "Proactive Token Refresh Logic" — `packages/auth` is deleted (BEA-688). `[live-verified]` by `ls packages/ | grep auth` returning nothing.

**What an agent would do:** An agent opening a file under `apps/bingo/src/` (e.g., `stores/audio-store.ts`) would receive this CLAUDE.md at context-load time. The "Recent Activity" framing — especially the 🟣 purple-circle icons suggesting completion/verification — primes the agent to assume JWT middleware and token refresh logic are part of the current bingo app. If asked "does bingo have auth?", the agent could confidently answer "yes, JWT middleware" and waste turns hallucinating code references.

### `apps/trivia/src/CLAUDE.md` — 1 entry, OAuth + CORS + multi-app

Full content:

```
<claude-mem-context>
# Recent Activity

<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->

### Feb 4, 2026

| ID | Time | T | Title | Read |
|----|------|---|-------|------|
| #221 | 10:48 AM | 🔵 | Comprehensive OAuth, CORS, and domain configuration analysis for multi-app platform | ~896 |
</claude-mem-context>
```

**Poison potential (medium-high):**
- "Multi-app platform" was `apps/platform-hub`, deleted in BEA-682. `[live-verified]` by `ls apps/` showing only `bingo` and `trivia`.
- "OAuth" flows are gone (BEA-686). LoginButton and OAuth redirect targets are deleted.
- The 🔵 blue-circle icon is softer than purple (likely indicates "discovery" / "observation" rather than "completed") — so slightly less definitive than bingo's — but it still plants "OAuth" in the trivia app's directory-level context.

**What an agent would do:** An agent touching `apps/trivia/src/**` would see this. If they interpret "Recent Activity" loosely, they might search `apps/trivia/src/lib/auth/` (which exists only in the worktree — see Phase 2 Iterator 3) or try to import `@hosted-game-night/auth`. These would fail at type-check but burn agent turns.

### Combined Impact

These 2 misleading stubs are the **only** actively harmful content among the 22 claude-mem stubs. The other 20 are either empty or historically accurate (if stale). Removing these 2 alone resolves the "agent poison" surface; the rest are just noise-cost.

---

## Freshness Validation — why did claude-mem stop updating?

### Git history

`git log --follow` for each stub shows **only one content-producing commit**: `f68e23a7` (2026-02-16). Zero subsequent modifications across 22 files over ~8 weeks.

### Why stopped

Tracing worker-service.cjs:
1. The running claude-mem writes to `.cursor/rules/claude-mem-context.mdc` — not tracked CLAUDE.md.
2. This repo has no `.cursor/` directory (`[live-verified]` via `ls -la` at root).
3. So the running daemon has no output target in this repo's tracked files.
4. The stubs are a **one-time snapshot** the user pasted in Feb 16 hoping for integration — but claude-mem v9.0.12 does not update them. (Possibly v7 or v8 did; v9 is Cursor-focused.)

### What the `<claude-mem-context>` tags are generated from

Per claude-mem's hook design:
- `PostToolUse` → observation into SQLite
- `Stop` → session summary into SQLite
- `SessionStart` / `UserPromptSubmit` → context injection via MCP + Cursor rules file

The "Recent Activity" rows with `| #47 | 8:15 PM | 🟣 | Title | ~426 |` format match claude-mem's observation table format. The tags were emitted at some earlier version of the tool that wrote to CLAUDE.md — but that code path no longer exists in v9.0.12.

**Provenance:** `[live-verified]` by disassembling `worker-service.cjs` for write targets (only `.cursor/rules/` and `.claude-mem/` paths).

---

## Systemic Disposition Recommendation

### Option picked: **Delete all 22 stubs + remove claude-mem CLAUDE.md export entirely.**

**Rationale:**

1. **The running tool does not refresh them.** They are provably orphaned. Keeping them is betting on a code path that no longer exists in claude-mem v9.0.12.
2. **The empty-stub majority (13/22) provides zero signal.** They cost tokens at directory context-load time and give an agent nothing in return.
3. **The 2 misleading stubs (`apps/bingo/src/CLAUDE.md`, `apps/trivia/src/CLAUDE.md`) are active agent poison.** They cite JWT/OAuth in present-tense "Recent Activity" tables. Fixing 2 while leaving 20 orphaned is less clean than one sweeping deletion.
4. **The 7 substantive-stale stubs (export count tables, code dedup observations) are meta-observations about the codebase at a Feb 4 snapshot.** They're not incorrect per se — "the types package has ~30 exports" is plausibly still roughly true — but they're not actionable architectural guidance. They read like audit artifacts, not agent context.
5. **claude-mem's actual value delivery is the MCP search tools** (`mcp__plugin_claude-mem_mcp-search__*`). Those work over the SQLite DB directly, independently of the tracked CLAUDE.md stubs. Deleting the stubs does not degrade claude-mem's function at all.
6. **Symmetry fix for free:** Phase 1 Area 4 Finding A7 noted `packages/audio/` has no stub while every other package does. Deleting all stubs resolves the asymmetry in the direction that doesn't require writing a new file.

### What to KEEP

- **`CLAUDE.md` (root)**, **`apps/bingo/CLAUDE.md`**, **`apps/trivia/CLAUDE.md`**, **`packages/game-stats/CLAUDE.md`** — these are substantive, hand-maintained, and accurate (modulo minor drift logged by Phase 1 Area 4).
- **claude-mem plugin itself** — uninstalling would kill the MCP search tools over 187 MB of historical observations. Keep the plugin; just don't let it own tracked files.

### What's preserved by deletion

Nothing load-bearing. The 22 stubs don't contain unique knowledge not available via (a) the 4 substantive CLAUDE.md files, (b) the claude-mem MCP tools, or (c) git log.

### Cleanup command (for future executor)

```
git rm \
  apps/bingo/src/CLAUDE.md \
  apps/bingo/src/components/presenter/CLAUDE.md \
  apps/bingo/src/hooks/CLAUDE.md \
  apps/bingo/src/lib/game/CLAUDE.md \
  apps/bingo/src/lib/game/patterns/CLAUDE.md \
  apps/bingo/src/lib/sync/CLAUDE.md \
  apps/bingo/src/stores/CLAUDE.md \
  apps/trivia/src/CLAUDE.md \
  apps/trivia/src/components/presenter/CLAUDE.md \
  apps/trivia/src/hooks/CLAUDE.md \
  apps/trivia/src/lib/game/CLAUDE.md \
  apps/trivia/src/stores/CLAUDE.md \
  docs/CLAUDE.md \
  packages/error-tracking/src/CLAUDE.md \
  packages/game-stats/src/CLAUDE.md \
  packages/game-stats/src/stats/CLAUDE.md \
  packages/sync/src/CLAUDE.md \
  packages/testing/src/CLAUDE.md \
  packages/theme/src/CLAUDE.md \
  packages/types/src/CLAUDE.md \
  packages/ui/src/CLAUDE.md \
  scripts/CLAUDE.md
```

Commit message suggestion: `chore: remove 22 orphaned claude-mem stub CLAUDE.md files`. Body should note (a) they are no longer maintained by claude-mem v9.0.12 (which writes to Cursor, not CLAUDE.md), (b) 2 contained auth-era references (bingo/trivia/src), (c) 13 were empty placeholders.

### Alternative (rejected): **Keep + configure claude-mem to refresh**

Would require:
- Finding a claude-mem version that writes to CLAUDE.md tagged blocks (pre-v9?), OR patching v9 to add CLAUDE.md output
- Adding a pre-commit / post-merge hook to refresh
- Getting the user to maintain the integration long-term

**Not recommended** because:
- The tool's own direction is Cursor, not Claude Code CLAUDE.md
- The integration would be a maintenance burden for a low-value signal ("Recent Activity" tables rarely tell an agent something actionable)
- Even refreshed, these files would often be duplicated effort vs. the substantive CLAUDE.md

### Alternative (rejected): **Delete empty + misleading only, keep substantive-stale**

Would preserve 7 of 22. But:
- The 7 substantive-stale stubs still occupy directory slots that could host real architectural guidance
- Splitting disposition creates confusion about policy ("some directories have stubs, others don't, why?")
- Clean sweep is simpler and no worse

### Process follow-up (systemic)

1. **Document policy in root CLAUDE.md:** Add a one-line note like "Sub-directory CLAUDE.md files are maintained by hand. claude-mem writes to its own SQLite DB, not here." This prevents the next paste-in temptation.
2. **Pre-commit check (optional):** A lint rule that flags committing `<claude-mem-context>*No recent activity*</claude-mem-context>` stubs. Low priority; manual vigilance is probably enough post-cleanup.
3. **Leave claude-mem installed** — MCP search is valuable.
4. **Consider**: `docs/CLAUDE.md` might warrant a **REWRITE** into genuine hand-authored guidance for the `docs/` directory (ARCHITECTURE.md, MANUAL_TEST_PLAN.md, E2E_TESTING_GUIDE.md, etc.) rather than just deletion. Rated low priority — the root CLAUDE.md already points agents at key docs.

---

## Resolved Questions

1. **What is claude-mem?** Installed Claude Code plugin `thedotmack/claude-mem@9.0.12` (Feb 2026). Runs a Bun daemon capturing observations into a 187 MB SQLite DB. Exposes `mcp__plugin_claude-mem_mcp-search__*` tools. Writes context files to `.cursor/rules/` (not present here) — **does NOT write to tracked CLAUDE.md in this repo**.
2. **Is it still configured to run?** Yes. Worker PID 33371, started 2026-04-09, still active (`ps -p 33371` `[live-verified]`). Hook installation is per-session via `SessionStart` / `UserPromptSubmit` / `PostToolUse` / `Stop`.
3. **Why are the stubs 2 months stale?** Because claude-mem v9.0.12's write path targets `.cursor/rules/claude-mem-context.mdc`, not tracked CLAUDE.md. The stubs in this repo were committed manually ONCE in commit `f68e23a7` (2026-02-16) and have never been refreshed by anything.
4. **Which stubs cite OAuth/JWT?** Exactly 2: `apps/bingo/src/CLAUDE.md` (5 entries: JWT middleware, token refresh x4) and `apps/trivia/src/CLAUDE.md` (1 entry: OAuth/CORS/multi-app analysis).
5. **Harmless vs. actively misleading?** 13 empty + 7 substantive-stale = harmless-but-noise (20 files, 3.9 KB of dead weight). 2 actively misleading (683 + 351 = 1,034 bytes of agent poison).
6. **Disposition per stub?** All 22 → DELETE.
7. **Systemic recommendation?** Remove all stubs. Keep claude-mem plugin. Document policy.

## Remaining Unknowns

1. **Does claude-mem have an older version that wrote to CLAUDE.md?** The user's shell history (`/Users/j/.claude/history.jsonl`) shows `/plugin install claude-mem` in October 2025 and a troubleshooting session at `docs.claude-mem.ai/installation`. Earlier versions may have had a CLAUDE.md write path. Not actionable — v9 is what's installed now.
2. **Are there any claude-mem session summaries that mention the 2 misleading stubs?** Would require querying the SQLite DB. Not necessary for this disposition.
3. **Does Claude Code currently read tracked sub-directory CLAUDE.md files?** The system-reminder machinery definitely reads `CLAUDE.md` (root) and `claudeMd` context, but per-directory CLAUDE.md injection in subagents is less certain. A quick test: when this iterator was started, the harness surfaced `/Users/j/repos/beak-gaming-platform/docs/CLAUDE.md` contents as a system-reminder — **[live-verified]** empirically. So yes, sub-directory stubs ARE loaded as context under at least some conditions. That confirms the impact assessment.
4. **Does `packages/audio/` need a stub for symmetry?** No — under the delete-all recommendation, asymmetry is resolved downward.
5. **Do we need to notify the user that claude-mem v9 is Cursor-focused, not Claude Code CLAUDE.md-focused?** User already knows (`docs.claude-mem.ai` is in the allowlist) but the drift caught them anyway. Worth mentioning in Phase 3.

## Revised Understanding

- **Area 4's count was off by 1.** Actual tracked claude-mem stubs: **22**, not 21.
- **The stubs are not a claude-mem integration problem — they are a one-time manual commit problem.** The tool itself is functioning correctly (logs healthy, DB up-to-date as of 2026-04-10); the 22 files are simply orphaned artifacts from an early integration experiment that the tool no longer participates in.
- **The "agent poison" risk is concentrated in 2 files totaling 1 KB.** The remaining 20 are cost-only, not risk.
- **Claude Code DOES load sub-directory CLAUDE.md files at some contexts** (confirmed empirically via the `docs/CLAUDE.md` system-reminder injection visible in this iterator's prompt). So empty stubs consume real (though tiny) token budget across sessions that walk into those directories.
- **Deletion is safe.** No code, no tool, no workflow depends on the stubs' presence.
- **Prior audit status:** Phase 1 Area 4 Finding A5 stays open; this disposition closes it.

---

**End of report. Cap respected (~300 lines).**
