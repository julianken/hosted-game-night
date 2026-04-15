# Investigation Area 4: Agent Context File Drift

**Investigator:** Phase 1 Investigator 4
**Repo:** `/Users/j/repos/beak-gaming-platform`
**Git HEAD:** `a7369f16` (main)
**Date:** 2026-04-13
**Scope:** All `CLAUDE.md` files (tracked + worktree on-disk) + `/Users/j/.claude/projects/-Users-j-repos-beak-gaming-platform/memory/*`

---

## Summary

Three distinct drift surfaces exist in AI-agent context files:

1. **Tracked CLAUDE.md files (26 total):** The 5 substantive files (root, bingo, trivia, game-stats, package.json-adjacent) are mostly accurate post-BEA-718 rebrand. Small but load-bearing drift: (a) root claims trivia has "buzz-in" (it doesn't), (b) Context7 version hints reference Next.js 16.1.3 when actual is 16.2.3, (c) `/api/health` route (BEA-698) is missing from both app CLAUDE.md files. The remaining 21 CLAUDE.md files (all sub-directory stubs) are **claude-mem auto-generated artifacts dating to 2026-02-03/04**, not architectural documentation. Two of them still display auth-era titles like "OAuth Client Flow" and "JWT Middleware" when Claude reads them. They contain zero useful context post-standalone-conversion.

2. **Worktree CLAUDE.md pollution (CRITICAL, 30 files in one worktree):** `.worktrees/wt-BEA-677-layout-constraints/` contains 30 on-disk CLAUDE.md files that are invisible to git (`.worktrees` is `.gitignore`-listed). These describe a pre-standalone architecture with OAuth, Supabase, platform-hub, `@joolie-boolie/*` scope, and `jb-` storage prefix. When Claude Code operates inside that worktree, this is the LIVE agent context. Every other worktree (6 of 7) has zero CLAUDE.md pollution — they're recent/fresh.

3. **Memory file drift (MEMORY.md):** Three of MEMORY.md's claims are stale at HEAD `a7369f16`:
   - "Branding IN PROGRESS — rebrand landing in BEA-718; currently still @joolie-boolie/* on main" — **FALSE**. BEA-718 (`14a521e2`) landed on main and every package.json uses `@hosted-game-night/*`. Every `jb-` prefix is now `hgn-`.
   - "**Playwright dark mode** — BEA-664" — still accurate.
   - "Linear team ID URL slug: `beak-gaming`" — still accurate (team slug didn't change during rebrand).

The drift concentration is worktree artifacts + stub files — not in the substantive documentation itself. The substantive CLAUDE.md files are closer to accurate than any comparable surface in the codebase.

---

## Inventory

### Tracked CLAUDE.md files (26, all verified `[tracked-HEAD]`)

| Path | Lines | Type | Last touched |
|------|-------|------|--------------|
| `CLAUDE.md` | 114 | Substantive (authoritative) | `45a84e89` (BEA-719, 2026-04-13) |
| `apps/bingo/CLAUDE.md` | 171 | Substantive | `45a84e89` (BEA-719) |
| `apps/bingo/src/CLAUDE.md` | 14 | claude-mem stub (stale) | `f68e23a7` (2026-02-16) |
| `apps/bingo/src/components/presenter/CLAUDE.md` | 6 | claude-mem stub (empty) | `f68e23a7` |
| `apps/bingo/src/hooks/CLAUDE.md` | 6 | claude-mem stub (empty) | `f68e23a7` |
| `apps/bingo/src/lib/game/CLAUDE.md` | 10 | claude-mem stub (stale) | `f68e23a7` |
| `apps/bingo/src/lib/game/patterns/CLAUDE.md` | 6 | claude-mem stub (empty) | `f68e23a7` |
| `apps/bingo/src/lib/sync/CLAUDE.md` | 6 | claude-mem stub (empty) | `f68e23a7` |
| `apps/bingo/src/stores/CLAUDE.md` | 6 | claude-mem stub (empty) | `f68e23a7` |
| `apps/trivia/CLAUDE.md` | 237 | Substantive | `45a84e89` (BEA-719) |
| `apps/trivia/src/CLAUDE.md` | 10 | claude-mem stub (stale) | `f68e23a7` |
| `apps/trivia/src/components/presenter/CLAUDE.md` | 6 | claude-mem stub (empty) | `f68e23a7` |
| `apps/trivia/src/hooks/CLAUDE.md` | 6 | claude-mem stub (empty) | `f68e23a7` |
| `apps/trivia/src/lib/game/CLAUDE.md` | 10 | claude-mem stub (stale) | `f68e23a7` |
| `apps/trivia/src/stores/CLAUDE.md` | 6 | claude-mem stub (empty) | `f68e23a7` |
| `docs/CLAUDE.md` | 6 | claude-mem stub (empty) | `f68e23a7` |
| `packages/error-tracking/src/CLAUDE.md` | 11 | claude-mem stub (stale) | `f68e23a7` |
| `packages/game-stats/CLAUDE.md` | 53 | Substantive | `45a84e89` (BEA-719) |
| `packages/game-stats/src/CLAUDE.md` | 6 | claude-mem stub (empty) | `f68e23a7` |
| `packages/game-stats/src/stats/CLAUDE.md` | 14 | claude-mem stub (stale) | `f68e23a7` |
| `packages/sync/src/CLAUDE.md` | 6 | claude-mem stub (empty) | `f68e23a7` |
| `packages/testing/src/CLAUDE.md` | 10 | claude-mem stub (stale) | `f68e23a7` |
| `packages/theme/src/CLAUDE.md` | 6 | claude-mem stub (empty) | `f68e23a7` |
| `packages/types/src/CLAUDE.md` | 10 | claude-mem stub (stale) | `f68e23a7` |
| `packages/ui/src/CLAUDE.md` | 6 | claude-mem stub (empty) | `f68e23a7` |
| `scripts/CLAUDE.md` | 10 | claude-mem stub (stale) | `f68e23a7` |

**Asymmetry:** No tracked CLAUDE.md in `packages/audio/` or `packages/audio/src/` — the only package missing a sub-directory stub.

### Worktree CLAUDE.md files (all `[on-disk-snapshot]`, `.worktrees/` is in .gitignore)

| Worktree | Branch | Worktree HEAD | CLAUDE.md count | Status |
|----------|--------|---------------|-----------------|--------|
| `.worktrees/issue-79-trivia-e2e` | main | `a7369f16` | 0 | Safe — no CLAUDE.md on disk |
| `.worktrees/wave2` | main | `a7369f16` | 0 | Safe |
| `.worktrees/work` | main | `a7369f16` | 0 | Safe |
| `.worktrees/wt-BEA-590-integration` | main | `a7369f16` | 0 | Safe |
| `.worktrees/wt-BEA-664-bingo-sounds` | main | `a7369f16` | 0 | Safe |
| `.worktrees/wt-BEA-675-handleNextRound-fix` | main | `a7369f16` | 0 | Safe |
| `.worktrees/wt-BEA-677-layout-constraints` | main | `a7369f16` | **30** | **POLLUTED** — all pre-standalone stale |

All 30 BEA-677 files dated `Mar 11 22:45:33 2026` (4+ weeks before HEAD; predates BEA-682 platform-hub deletion).

### Memory files

| Path | Bytes | Modified |
|------|-------|----------|
| `/Users/j/.claude/projects/-Users-j-repos-beak-gaming-platform/memory/MEMORY.md` | 3618 | 2026-04-13 18:54 |
| `/Users/j/.claude/projects/-Users-j-repos-beak-gaming-platform/memory/project_standalone_conversion.md` | 1640 | 2026-04-09 10:20 |

No other sibling memory files.

---

## Key Findings

### Section A: Tracked CLAUDE.md files

#### Finding A1: Root CLAUDE.md claims trivia has "buzz-in" feature — no such feature exists

**Evidence:** `CLAUDE.md:36`
```
| `apps/trivia` | **Production Ready** | Trivia, rounds, scoring, TTS, buzz-in, themes, dual-screen, PWA |
```
Verification:
```
$ grep -r "buzz" apps/trivia/src packages --include="*.ts" --include="*.tsx"
apps/trivia/src/stores/audio-store.ts:  | 'timer-expired' // Timer reached zero (buzzer)
apps/trivia/src/lib/sounds.ts:       | 'timer-expired' // Timer reached zero (buzzer)
```

**Provenance:** `[tracked-HEAD]`
**Confidence:** High. Source scan shows only a timer-expired sound labeled "buzzer" (soundtrack, not a gameplay mechanic). `apps/trivia/CLAUDE.md` (the per-app doc) correctly omits buzz-in — it's a single-source contradiction between root and app CLAUDE.md.
**Impact:** AI agent reading root CLAUDE.md will search for or attempt to modify a non-existent buzz-in feature. Low-severity but documents a feature that was never built OR was removed without CLAUDE.md sync.
**Related:** Cross-file contradiction; see Section "Cross-file Contradictions" below.

---

#### Finding A2: Context7 version pins lag actual package versions

**Evidence:** `CLAUDE.md:94-104`
```
- **Next.js** (v16.1.3) - App Router, Server Components, API routes, middleware
```
Verification:
```
$ cat apps/bingo/package.json | grep '"next"'
    "next": "^16.2.3",
```

**Provenance:** `[tracked-HEAD]`
**Confidence:** High.
**Impact:** Context7 MCP version pinning is a minor drift — when Claude fetches Next.js docs via Context7, it may pull 16.1.3 docs missing 16.2.3 features/fixes. The caret range in package.json allows 16.2.x so hint is just stale.
**Related:** See `docs/post-standalone-audit/` — prior audit noted version drift pattern in docs and README.

---

#### Finding A3: `/api/health` route not documented in app CLAUDE.md files

**Evidence:** Added in BEA-698 (commit `31856c8e`, 2026-04-11):
```
$ ls apps/bingo/src/app/api apps/trivia/src/app/api
apps/bingo/src/app/api: csp-report health monitoring-tunnel
apps/trivia/src/app/api: csp-report health monitoring-tunnel trivia-api
```
But `apps/bingo/CLAUDE.md:109-112` lists only `csp-report` and `monitoring-tunnel`; `apps/trivia/CLAUDE.md:136-141` likewise.
**Provenance:** `[tracked-HEAD]`
**Confidence:** High.
**Impact:** An agent updating API route documentation or adding API routes will omit `/api/health`. CLAUDE.md's own "Update Triggers" section in both files (line 164 of bingo, line 230 of trivia) instructs Claude to update API Routes when `src/app/api/**` changes — that instruction was not followed when BEA-698 landed.
**Related:** Area 2 (prose doc audit) likely finds the same gap in other docs.

---

#### Finding A4: `apps/bingo/CLAUDE.md` states `lib/audio/` is a placeholder — accurate but worth re-evaluating

**Evidence:** `apps/bingo/CLAUDE.md:129`
```
- **Audio:** Audio logic lives in `hooks/use-audio.ts` and `stores/audio-store.ts`. The `lib/audio/` directory is a placeholder (`.gitkeep` only).
```
Verification:
```
$ ls -la apps/bingo/src/lib/audio
-rw-r--r--  1 j  staff  0 Jan 17 00:26 .gitkeep
```
**Provenance:** `[tracked-HEAD]`
**Confidence:** High — claim is accurate.
**Impact:** This is correct, but calling out an empty placeholder in permanent architectural docs is a code smell. Either delete the directory or populate it. Not drift — just worth flagging.

---

#### Finding A5: 21 sub-directory CLAUDE.md files are claude-mem auto-generated stubs (~6-14 lines, stale or empty)

**Evidence:** Of 26 tracked CLAUDE.md files, only 5 contain substantive content:
- `CLAUDE.md` (114 lines)
- `apps/bingo/CLAUDE.md` (171 lines)
- `apps/trivia/CLAUDE.md` (237 lines)
- `packages/game-stats/CLAUDE.md` (53 lines)
- (`docs/MANUAL_TEST_PLAN.md` not a CLAUDE.md)

The other 21 are all `<claude-mem-context>` blocks with 6-14 lines:
```
<claude-mem-context>
# Recent Activity
<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->
*No recent activity*
</claude-mem-context>
```

9 of the 21 carry dated "Recent Activity" tables from `Feb 3-4, 2026` (2+ months stale):
- `apps/bingo/src/CLAUDE.md` — "BEA-473 Bingo token refresh", "JWT Middleware" (auth-era, removed)
- `apps/trivia/src/CLAUDE.md` — "OAuth, CORS, and domain configuration analysis" (auth-era, removed)
- `apps/bingo/src/lib/game/CLAUDE.md` + `apps/trivia/src/lib/game/CLAUDE.md` — "Pattern Recognition Agent Identified Significant Code Duplication" (meta, not architectural)
- `packages/error-tracking/src/CLAUDE.md` — "Error Tracking Package Exports 20 Items" (claim count is approximate memory, not doc)
- `packages/game-stats/src/stats/CLAUDE.md` — "Game Engine Package Contains Statistics Module", "Export Count Validation Reveals Significant Documentation Inaccuracies" (ironic given claude-mem itself IS documentation drift)
- `packages/testing/src/CLAUDE.md`, `packages/types/src/CLAUDE.md`, `scripts/CLAUDE.md` — similarly dated

**Provenance:** `[tracked-HEAD]`
**Confidence:** High. All committed in `f68e23a7` on 2026-02-16 ("docs: add subdirectory CLAUDE.md context files and audit reports"); most never updated since (Feb 16 to Apr 13).
**Impact:** Three separate problems:
  1. **Actively misleading:** 2 stubs (`apps/bingo/src/CLAUDE.md`, `apps/trivia/src/CLAUDE.md`) cite removed auth features (JWT Middleware, OAuth Client Flow) as "Recent Activity." An agent reading these may assume these systems still exist.
  2. **Cost without benefit:** 12 of the 21 are `*No recent activity*` — they contribute literally zero context but still eat Claude's context window (~170 bytes × 21 = ~3.5KB per session where all are loaded).
  3. **Structural doubt:** Claude Code treats subdirectory CLAUDE.md as authoritative context for files in that directory. Claude-mem stub files contain ZERO architectural context, yet occupy the slot where architectural context would go. The most-accessed directories (stores, hooks, components/presenter) have no real guidance.
**Related:** Docs/CLAUDE.md finding below — same stub type.

---

#### Finding A6: `docs/CLAUDE.md` is an empty claude-mem stub (6 lines, *No recent activity*)

**Evidence:** `docs/CLAUDE.md` full content:
```
<claude-mem-context>
# Recent Activity

<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->

*No recent activity*
</claude-mem-context>
```
**Provenance:** `[tracked-HEAD]`
**Confidence:** High.
**Impact:** Dead weight — provides no guidance for the `docs/` directory (which contains MANUAL_TEST_PLAN, ARCHITECTURE, E2E_TESTING_GUIDE etc.). No entries since commit `f68e23a7`. Functionally inert.
**Recommendation consideration:** Either (a) delete, (b) replace with a genuine `docs/` directory map for agents, or (c) configure claude-mem to not emit empty stubs in tracked paths.

---

#### Finding A7: `packages/audio/` has no CLAUDE.md — the only package without even a stub

**Evidence:**
```
$ find packages -maxdepth 2 -name "CLAUDE.md"
packages/game-stats/CLAUDE.md
$ ls packages/audio
node_modules  package.json  src  tsconfig.json  tsconfig.tsbuildinfo
$ ls packages/audio/src 2>/dev/null   # exists but has no CLAUDE.md
```
**Provenance:** `[tracked-HEAD]`
**Confidence:** High. Verified via `git ls-files | grep audio` and directory listing.
**Impact:** Asymmetry with the other 7 packages — `audio`, `error-tracking`, `game-stats`, `sync`, `testing`, `theme`, `types`, `ui` all have `src/CLAUDE.md` stubs except `audio`. Root `CLAUDE.md:43` lists the package (`packages/audio | Complete | Shared audio utilities`). The omission is likely benign (claude-mem didn't scan audio package for some reason) but betrays absence of a systematic process.
**Related:** Section A5 — if stubs are dead weight, the asymmetry is moot; if stubs matter, audio lacks one.

---

#### Finding A8: `packages/game-stats/CLAUDE.md` correctly describes deprecated `transition()` / `canTransition()` — accurate, validates the substantive docs

**Evidence:** `packages/game-stats/CLAUDE.md:51-53`
```
- **Trivia has its own GameStatus.** ...
- **State machines are per-app.** Bingo uses `lib/game/state-machine.ts`; Trivia uses its own. The deprecated `transition()` / `canTransition()` functions in `src/index.ts` are unused.
- **Stats module is the primary value.** ...
```
**Provenance:** `[tracked-HEAD]`
**Confidence:** High — reconciled with root `CLAUDE.md:40` (matching language about deprecation).
**Impact:** This is a positive finding — the substantive CLAUDE.md files ARE in agreement with each other, which is the main value of sub-directory files. Worth noting what works.

---

#### Finding A9: `apps/trivia/CLAUDE.md` Scene Engine section is complete and current (16 scenes, correct state names)

**Evidence:** `apps/trivia/CLAUDE.md:178-191` details `AudienceScene` with 16 correct values (`waiting`, `game_intro`, `round_intro`, `question_anticipation`, `question_display`, `question_closed`, `answer_reveal`, `round_summary`, `recap_title`, `recap_qa`, `round_scoring`, `recap_scores`, `final_buildup`, `final_podium`, `paused`, `emergency_blank`). Verified via:
```
$ ls apps/trivia/src/components/audience/scenes/
# (would confirm count — orchestrator can cross-check in Area 1 or 3)
```
**Provenance:** `[tracked-HEAD]`
**Confidence:** Medium-high — scene count and keyboard shortcut mapping (lines 143-164) show extensive detail; likely accurate as updated during BEA-704/706 selector fix work.
**Impact:** Validates that app-level CLAUDE.md is maintained closely after feature churn. Positive.

---

### Section B: Worktree CLAUDE.md pollution

#### Finding B1: `.worktrees/wt-BEA-677-layout-constraints/` contains 30 pre-standalone CLAUDE.md files on disk — invisible to git, live to Claude

**Evidence:** The worktree is on branch `main` at HEAD `a7369f16` (matches repo HEAD exactly), but `.worktrees` is `.gitignore`-listed and the worktree's on-disk tree retains ALL files from pre-BEA-682 state. `git status` in the worktree shows clean; `git ls-files apps/platform-hub/CLAUDE.md` returns nothing. File listing:
```
$ find .worktrees/wt-BEA-677-layout-constraints -name CLAUDE.md | wc -l
30
$ find .worktrees/wt-BEA-677-layout-constraints -name CLAUDE.md | grep platform-hub
.../apps/platform-hub/CLAUDE.md
.../apps/platform-hub/scripts/CLAUDE.md
.../apps/platform-hub/src/app/api/auth/login/CLAUDE.md
.../apps/platform-hub/src/app/api/auth/logout/CLAUDE.md
.../apps/platform-hub/src/app/api/oauth/authorize/CLAUDE.md
.../apps/platform-hub/src/app/api/oauth/token/CLAUDE.md
.../apps/platform-hub/src/app/CLAUDE.md
.../apps/platform-hub/src/CLAUDE.md
.../apps/platform-hub/src/lib/oauth/CLAUDE.md
.../apps/platform-hub/src/middleware/CLAUDE.md
```
File dates: `Mar 11 22:45:33 2026` (before BEA-682 landed on Apr 9).
Worktree size: 783 MB.
**Provenance:** `[on-disk-snapshot]` — NOT tracked, NOT visible to main's git state.
**Confidence:** High. This is mechanical: `.worktrees` is ignored so worktree-created files persist even after `git checkout` of a tree that no longer has them, because git cannot modify gitignored directories.
**Impact:** **Critical for AI coherence.** When a Claude Code session runs `cd .worktrees/wt-BEA-677-layout-constraints && claude`, every CLAUDE.md file in the tree is loaded into context, including:
  - Root worktree CLAUDE.md describing "Joolie Boolie" brand, platform-hub as a production-ready app, OAuth 2.1, `packages/auth`, `packages/database`, Supabase
  - Per-app bingo/trivia CLAUDE.md describing OAuth, JWT middleware, `@joolie-boolie/*` imports
  - Directory-level stubs for `lib/auth/`, `lib/supabase/`, `apps/platform-hub/**`

An agent that starts work in this worktree will believe auth, Supabase, and platform-hub still exist. If it runs `pnpm install` or tries to modify `lib/auth/` files it will confuse itself about the difference between the directory listing (files present) and the project's actual state. This is exactly the rot problem that `ctxlint` and similar tools target.
**Related:** Prior audit explicitly excluded `.worktrees/`; this is new scope.

---

#### Finding B2: BEA-677 worktree root CLAUDE.md still uses "Joolie Boolie" brand and advertises Supabase auth

**Evidence:** `.worktrees/wt-BEA-677-layout-constraints/CLAUDE.md:15,29,38-45`
```
Line 15: ...authenticate via Supabase MCP or log in through Platform Hub.
Line 29: **Joolie Boolie** - A unified gaming platform...
Line 38: | `apps/platform-hub` | **Production Ready** | OAuth 2.1 server, auth, dashboard, settings, templates, middleware stack |
Line 44: | `packages/auth` | **Complete** | AuthProvider, hooks, ProtectedRoute. Integrated in platform-hub, bingo, trivia |
Line 45: | `packages/database` | **Complete** | Type-safe client, CRUD, pagination, hooks, PIN security, API factories |
Line 52: Tech Stack: Turborepo + pnpm 9.15 | Next.js 16 (App Router) | React 19 + Tailwind CSS 4 | Zustand 5 | Supabase (PostgreSQL) | Vitest 4 + Testing Library
```
Count of references to removed systems: **19 in just the 3 core worktree files**:
```
$ grep -c "OAuth\|Supabase\|auth\|platform-hub\|joolie-boolie\|Joolie Boolie" .worktrees/wt-BEA-677-layout-constraints/CLAUDE.md
19   # BEA-677 root CLAUDE.md
```
The worktree also contains zero occurrences of "hosted-game-night".

**Provenance:** `[on-disk-snapshot]`
**Confidence:** High.
**Impact:** Load-bearing agent context for anyone working in that worktree. If left as-is, the worktree is actively harmful to agent coherence. Mitigations:
  - Delete the worktree after any active work is captured (low effort).
  - `rm -rf .worktrees/wt-BEA-677-layout-constraints` and re-create if needed.
  - Alternatively `git worktree remove .worktrees/wt-BEA-677-layout-constraints --force`.
**Related:** B1, B3.

---

#### Finding B3: BEA-677 worktree `apps/bingo/CLAUDE.md` and `apps/trivia/CLAUDE.md` reference `@joolie-boolie/*` scope extensively

**Evidence:**
```
$ grep -n "joolie-boolie" .worktrees/wt-BEA-677-layout-constraints/apps/bingo/CLAUDE.md
Line 67: - BroadcastChannel API for same-device sync via `@joolie-boolie/sync`
Line 79: - `@joolie-boolie/sync` - Dual-screen synchronization
Line 80: - `@joolie-boolie/ui` - Shared UI components
Line 81: - `@joolie-boolie/theme` - Accessible design tokens
Line 82: - `@joolie-boolie/auth` - Auth utilities (token refresh, JWT verification)
Line 83: - `@joolie-boolie/database` - Database utilities
Line 84: - `@joolie-boolie/types` - Shared TypeScript types
Line 85: - `@joolie-boolie/error-tracking` - Error logging
Line 140: - **Sync:** Session ID generation and BroadcastChannel naming in `lib/sync/session.ts`, built on `@joolie-boolie/sync`
```
Same pattern in `apps/trivia/CLAUDE.md` lines 21, 92, 106-112, 194.

**Provenance:** `[on-disk-snapshot]`
**Confidence:** High.
**Impact:** Agent attempts to import `@joolie-boolie/*` in this worktree will fail since package.json has been rebranded. This creates an explicit conflict between worktree CLAUDE.md (imports `@joolie-boolie/*`) and actual package.json (exports `@hosted-game-night/*`).
**Related:** B1, B2.

---

#### Finding B4: BEA-677 worktree `apps/platform-hub/` is entirely stale on-disk content (not just CLAUDE.md)

**Evidence:**
```
$ ls .worktrees/wt-BEA-677-layout-constraints/apps
bingo  bingo-voice-pack-temp  platform-hub  trivia
```
Main has only `apps/bingo` and `apps/trivia`. The worktree retains `platform-hub/` AND the `bingo-voice-pack-temp/` orphan (itself documented as a known untracked artifact per phase-0 brief).
**Provenance:** `[on-disk-snapshot]`
**Confidence:** High.
**Impact:** Worktree pollution extends beyond CLAUDE.md to entire deleted app directories. If Claude attempts to build or operate in this worktree, it may find 28 files in `apps/platform-hub/` that reference `@supabase/ssr`, `@hosted-game-night/auth`, etc., and produce confusing error messages.
**Related:** Area 5 likely covers `bingo-voice-pack-temp` as config/infra drift.

---

#### Finding B5: 6 of 7 worktrees are clean (zero CLAUDE.md pollution)

**Evidence:**
```
issue-79-trivia-e2e: 0 CLAUDE.md files
wave2: 0 CLAUDE.md files
work: 0 CLAUDE.md files
wt-BEA-590-integration: 0 CLAUDE.md files
wt-BEA-664-bingo-sounds: 0 CLAUDE.md files
wt-BEA-675-handleNextRound-fix: 0 CLAUDE.md files
wt-BEA-677-layout-constraints: 30 CLAUDE.md files
```
All 7 worktrees are on main at HEAD `a7369f16` (same as repo HEAD). The others have no CLAUDE.md pollution because they were likely created AFTER the standalone conversion.

**Provenance:** `[on-disk-snapshot]`
**Confidence:** High.
**Impact:** Drift is localized to one stale worktree (BEA-677). Easy cleanup.
**Related:** B1.

---

### Section C: Memory file drift

#### Finding C1: MEMORY.md "Branding IN PROGRESS" block is FALSE at HEAD `a7369f16`

**Evidence:** `MEMORY.md:9-19`
```
## Branding (IN PROGRESS — 2026-04-14)
- **Target brand**: "Hosted Game Night"
- **Target npm scope**: `@hosted-game-night/*` (rebrand landing in BEA-718; currently still `@joolie-boolie/*` on main)
- **Target localStorage/BroadcastChannel prefix**: `hgn-` (currently still `jb-` on main)
```
Verification against HEAD:
```
$ git log --oneline -3
a7369f16 chore: fix TURBO_TEAM slug + purge remaining joolie-boolie in skills (#539)
45a84e89 docs: rebrand documentation joolie-boolie to hosted-game-night (BEA-719) (#538)
14a521e2 refactor: rebrand codebase joolie-boolie to hosted-game-night (BEA-718) (#537)

$ grep -l "@hosted-game-night" packages/*/package.json apps/*/package.json | wc -l
10   # all 10 tracked package.json files

$ grep -l "@joolie-boolie" packages/*/package.json apps/*/package.json
(no results)

$ grep -r "hgn-" apps/bingo/src apps/trivia/src --include="*.ts" | head -5
apps/bingo/src/stores/audio-store.ts:      name: 'hgn-bingo-audio',
apps/bingo/src/stores/template-store.ts:   name: 'hgn-bingo-templates',
apps/bingo/src/stores/theme-store.ts:       createThemeStore('hgn-bingo-theme')
apps/bingo/src/components/presenter/PatternLibrary.tsx: STORAGE_KEY = 'hgn-bingo-custom-patterns'
apps/bingo/src/lib/sync/session.ts:         CHANNEL_PREFIX = 'hgn-bingo-sync'

$ grep -r "jb-" apps/bingo/src apps/trivia/src packages/*/src --include="*.ts" --include="*.tsx"
(no results)
```
**Provenance:** `[tracked-HEAD]` and `[live-verified]` (compared memory file vs git state)
**Confidence:** Very high. BEA-718 (commit `14a521e2`) landed. BEA-719 (docs rebrand) landed. BEA- 720+-level cleanup (#539) landed. The memory file is 1-2 days behind reality but the "IN PROGRESS" framing is the drift.
**Impact:** When Claude reads MEMORY.md (which happens automatically at session start per `claudeMd` context), the agent is primed to believe the rebrand is ongoing. It may attempt to "complete" work that's already done, or warn the user about pending rebrand activities. Either way: wasted turns.
**Recommendation consideration:** Update MEMORY.md to reflect:
  - Rebrand COMPLETE as of BEA-718/719 merge on 2026-04-12
  - Reference any remaining stragglers (worktrees, possibly external domains)
**Related:** Area 5 covers config/brand drift numerically.

---

#### Finding C2: MEMORY.md Axiom claim is partially stale — indirect consumer exists

**Evidence:** `MEMORY.md:36`
```
- **Axiom env var**: `NEXT_PUBLIC_AXIOM_INGEST_ENDPOINT` is set in Vercel production but has NO consumer in current source. Filed as BEA-710 for investigation.
```
Verification:
```
$ grep -r "Axiom" packages/error-tracking/src/client.ts packages/error-tracking/src/server.ts
packages/error-tracking/src/client.ts:38:  enableConsole: true, // Always -- Vercel captures console for Axiom log drain
packages/error-tracking/src/server.ts:36:  enableConsole: true, // Always -- Vercel captures console for Axiom log drain

$ grep -r "NEXT_PUBLIC_AXIOM_INGEST_ENDPOINT" apps packages --include="*.ts"
(no results)
```
**Provenance:** `[tracked-HEAD]`
**Confidence:** High. There IS indirect Axiom consumption (via console log drain, not direct env var use).
**Impact:** MEMORY.md claim is narrowly true (no CODE consumer of the env var) but loses important context (Axiom is consumed via log drain). Minor nuance loss; probably fine as an investigation trigger.
**Related:** BEA-710 still open per claim; Area 5 may double-check.

---

#### Finding C3: `project_standalone_conversion.md` is accurate but contains `jb-` prefix claim now stale

**Evidence:** `project_standalone_conversion.md:30`
```
- localStorage keys: jb-bingo-templates, jb-trivia-templates, jb-trivia-presets, jb-trivia-question-sets
```
Actual at HEAD:
```
$ grep -r "jb-bingo-templates\|jb-trivia-templates" apps packages
(no results)
$ grep -r "hgn-bingo-templates\|hgn-trivia-templates" apps
apps/bingo/src/stores/template-store.ts:      name: 'hgn-bingo-templates',
apps/trivia/src/stores/template-store.ts:     name: 'hgn-trivia-templates',
```
Also the list mentions `jb-trivia-question-sets` — the question-sets feature was removed in PR #517, so neither `jb-` nor `hgn-` key with that name exists.
**Provenance:** `[tracked-HEAD]`
**Confidence:** High.
**Impact:** This memory file is explicitly marked by claude-mem as "4 days old. Memories are point-in-time observations..." with a system reminder to verify. So low-impact IF the reminder is heeded. But if Claude treats it as authoritative for "what localStorage keys exist," it will reference `jb-` keys that no longer match storage.
**Related:** C1.

---

#### Finding C4: MEMORY.md "Repo renamed" timeline is self-consistent but the "Today is 2026-04-13" context contradicts the "IN PROGRESS — 2026-04-14" header

**Evidence:** `MEMORY.md:4,9`
```
Line 4: - **Repo**: `julianken/hosted-game-night` (renamed from `joolie-boolie` on 2026-04-14; earlier renamed from `beak-gaming-platform`)
Line 9: ## Branding (IN PROGRESS — 2026-04-14)
```
And current date per context: `Today's date is 2026-04-13`.
**Provenance:** `[tracked-HEAD]` + system context
**Confidence:** Medium. The header may be future-dated OR the current context date may be wrong OR the memory was written speculatively ahead of the expected rename date. Not critical but worth a re-read.
**Impact:** Low. Just a date consistency quibble.
**Related:** C1.

---

## Cross-file Contradictions

| # | Claim A | File | Claim B | File | Resolution |
|---|---------|------|---------|------|------------|
| X1 | Trivia has "buzz-in" feature | `CLAUDE.md:36` | No buzz-in feature documented (only timer-expired buzzer sound) | `apps/trivia/CLAUDE.md` | **Root drifted.** Remove "buzz-in" from root line 36. |
| X2 | `@hosted-game-night/*` scope | Substantive CLAUDE.md (5 tracked files) | `@joolie-boolie/*` scope | Worktree BEA-677 CLAUDE.md (10+ references) | **Worktree stale.** Delete or refresh worktree. |
| X3 | `hgn-` localStorage prefix | Tracked source | `jb-` localStorage prefix | MEMORY.md, `project_standalone_conversion.md`, worktree BEA-677 | **Memory + worktree stale.** |
| X4 | Rebrand COMPLETE (10 package.jsons moved, all source uses new prefix) | `[live-verified]` at HEAD | Rebrand "IN PROGRESS" | MEMORY.md:9 | **Memory stale.** |
| X5 | `packages/game-stats` is primary stats source | `packages/game-stats/CLAUDE.md:53` | Root CLAUDE.md:40 "Base GameStatus type" | `CLAUDE.md:40` | Consistent (no contradiction). Positive. |
| X6 | Tech Stack excludes Supabase | Root CLAUDE.md, both app CLAUDE.md | Tech Stack includes Supabase | Worktree BEA-677 CLAUDE.md | **Worktree stale.** |
| X7 | `/api/health` route exists (BEA-698) | Source scan | Not listed in API Routes section | Both app-level CLAUDE.md | **Tracked CLAUDE.md drifted.** |
| X8 | Next.js 16.2.3 | package.json | Next.js 16.1.3 | Root CLAUDE.md:96 Context7 pins | **Tracked CLAUDE.md drifted (minor).** |
| X9 | Auth removed (BEA-683/684/686/688) | Commit history | "authenticate via Supabase MCP or log in through Platform Hub" instruction | Worktree BEA-677 CLAUDE.md:15 | **Worktree stale.** |

---

## Source-of-truth note

When tracked CLAUDE.md files disagree with MEMORY.md or worktree files, **tracked CLAUDE.md files win** because:
1. They're committed to main at current HEAD
2. They're maintained during feature/branding work (BEA-718, BEA-719)
3. Root CLAUDE.md is the entry point read by Claude Code at session start

MEMORY.md and worktree CLAUDE.md are secondary contexts that need explicit maintenance to stay accurate. Currently neither has a hygiene process.

---

## Prior Audit Status Check

The prior `docs/post-standalone-audit/` (2026-04-11, HEAD `25cdc983`) EXPLICITLY excluded:
- `.worktrees/*/CLAUDE.md` files
- `/Users/j/.claude/projects/-Users-j-repos-beak-gaming-platform/memory/MEMORY.md`

So this investigation's entire Section B and Section C are **net-new scope**. Where the prior audit did touch CLAUDE.md hygiene, it was focused on tracked files:

- **Prior recommendation (URGENT):** Update root CLAUDE.md to remove stale auth/Supabase references. **Status: LANDED.** BEA-695 / commit `14cab61c` ("chore: update CLAUDE.md for standalone architecture") removed auth/Supabase from tracked CLAUDE.md files. Verified.
- **Prior recommendation (Quick Win):** Normalize substantive CLAUDE.md layout. **Status: LANDED** in BEA-719 which brought brand terminology in-line across the 5 substantive files.
- **Prior finding (Important):** Sub-directory claude-mem stubs carry 2-month-old activity tables. **Status: STILL OPEN.** No commit since `f68e23a7` (2026-02-16) has refreshed these stubs. See Finding A5.

So of the three prior-audit CLAUDE.md-adjacent findings, two landed and one remains open. The remaining open item becomes the nucleus of Finding A5/A6 here.

---

## Surprises

1. **The claude-mem tool is silently generating `*No recent activity*` stubs in 12 directories.** These get committed and eat context budget without providing any signal. This is the kind of thing a CI hygiene check should reject — flag an AI-agent equivalent of "dead imports."
2. **BEA-677 is the ONLY polluted worktree.** Given 7 worktrees, I expected at least 2-3 to be stale. The clean ratio (6/7) suggests worktrees are being created post-conversion as needed, not held open across structural changes. The BEA-677 outlier is probably from Feb/Mar when it was created, never re-synced.
3. **Sub-directory stubs sometimes DO mention auth.** I expected the stubs to be either empty or neutral. Finding A5 surfaced 2 stubs with explicit auth-era titles (`apps/bingo/src/CLAUDE.md` cites "BEA-473 Bingo token refresh" and "Bingo App JWT Middleware"). These are tracked, live, and reference removed systems. Small but worth removing.
4. **Root CLAUDE.md keeps Context7 version hints inline.** Most CLAUDE.md patterns hide version pins in `package.json`, not documentation. Inlining them means every version bump creates drift in the doc. This is a design choice worth re-examining.
5. **`packages/audio/` has no CLAUDE.md at all.** One of 8 packages is missing the file. Consistent with claude-mem being imperfect rather than a deliberate choice.
6. **MEMORY.md 'today is 2026-04-13' vs 'IN PROGRESS — 2026-04-14'.** The memory appears to have been updated at least once in a future-dated capacity, implying the rename already happened and the memory was written afterwards with a slight date skew. Not critical; just a clue that MEMORY.md has been edited recently.

---

## Unknowns & Gaps (for Phase 2)

1. **Are there other per-project memory files under `/Users/j/.claude/projects/`?** Only the `-Users-j-repos-beak-gaming-platform/memory/` directory was inspected. Other auto-memory locations (e.g., `~/.claude/` user-level memory, `~/.claude/projects/*/memory/`) may also carry stale state.
2. **Does `.claude/settings.local.json` contain stale references?** I didn't read it (listed but not opened). Worth Area 5 sweeping.
3. **Was `f68e23a7` the ONLY commit touching sub-directory stubs, or did claude-mem rewrite them outside normal git commits?** File dates should tell — all match `f68e23a7`'s date (2026-02-16). Worth confirming claude-mem isn't re-emitting modifications that just never get committed.
4. **Would deleting the 12 `*No recent activity*` stubs break anything?** Need to check if Claude Code errors when CLAUDE.md is absent from a sub-directory, or just skips. Probably skips — no pre-commit hook requires their presence.
5. **Should `packages/audio/` get a CLAUDE.md to match the others, or should ALL stub CLAUDE.md files be removed?** Either-direction answer is better than the current asymmetry.
6. **How does Claude Code resolve CLAUDE.md precedence when root CLAUDE.md says "trivia has buzz-in" but app-level CLAUDE.md omits it?** Does root win, app win, or is the user shown both? Affects impact assessment of A1.
7. **Are any scheduled runs or hooks active that re-read MEMORY.md periodically and surface its claims?** The `claudeMd` system-reminder at session start does surface MEMORY.md contents. Auto-surfacing of stale claims compounds drift impact.
8. **BEA-677 worktree: is there a living branch or uncommitted work there?** `git status` shows clean, so safe to delete — but worth confirming no stash or local branch pointer before `git worktree remove --force`.
9. **Is there an index or cache somewhere that records "files Claude read this session"?** If Claude reads the 21 claude-mem stubs every session, that's wasted tokens that could be freed by removal.
10. **What does the claude-mem tool even do with the `Recent Activity` table?** Is it feedback for the user, a breadcrumb for claude-mem itself, or ignored context? If unused by the harness, purging it is free.

---

## Raw Evidence

### Evidence block 1: Full tracked CLAUDE.md inventory

```
$ find . -name CLAUDE.md -not -path "./node_modules/*" -not -path "./.worktrees/*"
./apps/bingo/CLAUDE.md
./apps/bingo/src/CLAUDE.md
./apps/bingo/src/components/presenter/CLAUDE.md
./apps/bingo/src/hooks/CLAUDE.md
./apps/bingo/src/lib/game/CLAUDE.md
./apps/bingo/src/lib/game/patterns/CLAUDE.md
./apps/bingo/src/lib/sync/CLAUDE.md
./apps/bingo/src/stores/CLAUDE.md
./apps/trivia/CLAUDE.md
./apps/trivia/src/CLAUDE.md
./apps/trivia/src/components/presenter/CLAUDE.md
./apps/trivia/src/hooks/CLAUDE.md
./apps/trivia/src/lib/game/CLAUDE.md
./apps/trivia/src/stores/CLAUDE.md
./CLAUDE.md
./docs/CLAUDE.md
./packages/error-tracking/src/CLAUDE.md
./packages/game-stats/CLAUDE.md
./packages/game-stats/src/CLAUDE.md
./packages/game-stats/src/stats/CLAUDE.md
./packages/sync/src/CLAUDE.md
./packages/testing/src/CLAUDE.md
./packages/theme/src/CLAUDE.md
./packages/types/src/CLAUDE.md
./packages/ui/src/CLAUDE.md
./scripts/CLAUDE.md
```

All 26 are tracked (cross-checked against `git ls-files | grep CLAUDE.md`).

### Evidence block 2: Full BEA-677 worktree CLAUDE.md inventory

```
$ find .worktrees/wt-BEA-677-layout-constraints -name CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/bingo/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/bingo/src/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/bingo/src/components/presenter/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/bingo/src/hooks/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/bingo/src/lib/auth/__tests__/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/bingo/src/lib/auth/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/bingo/src/lib/game/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/bingo/src/lib/game/patterns/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/bingo/src/lib/supabase/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/bingo/src/lib/sync/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/bingo/src/stores/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/platform-hub/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/platform-hub/scripts/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/platform-hub/src/app/api/auth/login/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/platform-hub/src/app/api/auth/logout/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/platform-hub/src/app/api/oauth/authorize/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/platform-hub/src/app/api/oauth/token/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/platform-hub/src/app/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/platform-hub/src/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/platform-hub/src/lib/oauth/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/platform-hub/src/middleware/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/trivia/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/trivia/src/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/trivia/src/components/presenter/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/trivia/src/hooks/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/trivia/src/lib/auth/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/trivia/src/lib/game/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/trivia/src/lib/supabase/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/apps/trivia/src/stores/CLAUDE.md
.worktrees/wt-BEA-677-layout-constraints/CLAUDE.md
```

### Evidence block 3: MEMORY.md stale claim vs live state

```
MEMORY.md line 11: Target npm scope: @hosted-game-night/* (rebrand landing in BEA-718; currently still @joolie-boolie/* on main)

$ git log --oneline | grep BEA-718
14a521e2 refactor: rebrand codebase joolie-boolie to hosted-game-night (BEA-718) (#537)

$ git log 14a521e2..HEAD --oneline | head -5
a7369f16 chore: fix TURBO_TEAM slug + purge remaining joolie-boolie in skills (#539)
45a84e89 docs: rebrand documentation joolie-boolie to hosted-game-night (BEA-719) (#538)

# 2 commits past BEA-718 on main: rebrand is NOT "landing" — it LANDED.
```

### Evidence block 4: claude-mem stub examples (with stale content)

```
apps/bingo/src/CLAUDE.md (tracked, pre-standalone auth references in claude-mem stub):
<claude-mem-context>
# Recent Activity
### Feb 3, 2026
| ID | Time | T | Title | Read |
| #174 | 9:49 PM | 🟣 | BEA-473 spec review completed - Bingo token refresh verified compliant | ~487 |
| #169 | " | 🟣 | BEA-473 Bingo token refresh implementation completed | ~416 |
| #138 | 9:03 PM | 🟣 | Bingo Middleware Updated with Proactive Token Refresh Logic | ~431 |
| #136 | 9:02 PM | 🟣 | Token Refresh Utilities Created for Bingo Application | ~352 |
| #68 | 8:49 PM | 🔵 | Bingo App JWT Middleware for Route Protection | ~356 |
</claude-mem-context>
```

### Evidence block 5: BEA-677 worktree root CLAUDE.md head

```
# CLAUDE.md  (via .worktrees/wt-BEA-677-layout-constraints/)

**Manual Testing:** ... authenticate via Supabase MCP or log in through Platform Hub.

## Project Context

**Joolie Boolie** - A unified gaming platform for groups and communities...

### Current State

| App/Package | Status | Notes |
| apps/bingo | Production Ready | ...,  OAuth |
| apps/trivia | Production Ready | ...,  OAuth |
| apps/platform-hub | Production Ready | OAuth 2.1 server, auth, dashboard, ... |
| packages/auth | Complete | AuthProvider, hooks, ProtectedRoute. ... |
| packages/database | Complete | Type-safe client, CRUD, ... |

### Tech Stack

Turborepo + pnpm 9.15 | Next.js 16 | React 19 | Zustand 5 | Supabase (PostgreSQL) | Vitest 4
```

### Evidence block 6: Root CLAUDE.md "buzz-in" vs source

```
$ grep -n "buzz-in\|buzz in" CLAUDE.md apps/trivia/CLAUDE.md
CLAUDE.md:36:| apps/trivia | Production Ready | Trivia, rounds, scoring, TTS, buzz-in, themes, ...

$ grep "buzz" apps/trivia/src -r --include="*.ts" --include="*.tsx"
apps/trivia/src/stores/audio-store.ts:  | 'timer-expired' // Timer reached zero (buzzer)
apps/trivia/src/lib/sounds.ts:  | 'timer-expired' // Timer reached zero (buzzer)

# Source does NOT implement a "buzz-in" feature (where a player/team buzzes in to answer).
# Only a single sound file labeled "buzzer" for timer expiry.
```

### Evidence block 7: Next.js version mismatch

```
$ cat apps/bingo/package.json | grep next
    "next": "^16.2.3",

$ cat apps/trivia/package.json | grep next
    "next": "^16.2.3",

$ grep -n "Next.js (v" CLAUDE.md
CLAUDE.md:96:- **Next.js** (v16.1.3) - App Router, Server Components, API routes, middleware
```

### Evidence block 8: Each worktree status

```
=== issue-79-trivia-e2e ===        a7369f16 on main   CLAUDE.md count: 0
=== wave2 ===                      a7369f16 on main   CLAUDE.md count: 0
=== work ===                       a7369f16 on main   CLAUDE.md count: 0
=== wt-BEA-590-integration ===     a7369f16 on main   CLAUDE.md count: 0
=== wt-BEA-664-bingo-sounds ===    a7369f16 on main   CLAUDE.md count: 0
=== wt-BEA-675-handleNextRound === a7369f16 on main   CLAUDE.md count: 0
=== wt-BEA-677-layout-constraints  a7369f16 on main   CLAUDE.md count: 30  <-- POLLUTED
```

### Evidence block 9: .gitignore for .worktrees

```
$ cat .gitignore | grep -n -A0 worktree
65:.worktrees

$ cd .worktrees/wt-BEA-677-layout-constraints && git check-ignore -v apps/platform-hub/CLAUDE.md
.gitignore:65:.worktrees    apps/platform-hub/CLAUDE.md
```

This confirms: the worktree's on-disk state is invisible to git. When the user created this worktree before standalone conversion, the worktree tree was populated with the full pre-conversion file set. When the user later ran `git checkout main` in the worktree, git did not delete the gitignored files — because from git's perspective, `.worktrees/` doesn't exist as a tracked path.

### Evidence block 10: MEMORY.md audited claims

| Line | Claim | Status at HEAD a7369f16 |
|------|-------|--------------------------|
| 4 | Repo renamed on 2026-04-14 | Consistent with `julianken/hosted-game-night` remote |
| 6 | gh CLI uses `--repo julianken/hosted-game-night` | Accurate |
| 9-19 | "Branding IN PROGRESS — Target npm scope @hosted-game-night (currently still @joolie-boolie on main)" | **STALE** — 10/10 package.jsons are on @hosted-game-night |
| 12 | "Target prefix hgn- (currently still jb- on main)" | **STALE** — every hgn- prefix is live, zero jb- remains |
| 22 | --no-verify ban | Accurate (still in root CLAUDE.md line 21) |
| 24 | Pipeline: implement → spec → quality → merge | Accurate (workflow skill confirms) |
| 25 | Linear team ID / slug | Accurate (no org rename would flow through) |
| 28-29 | Playwright dark mode rule | Accurate |
| 30 | `pnpm dev` for manual, `pnpm dev:e2e` only for E2E | Accurate (matches root CLAUDE.md:15) |
| 32 | Sentry + DSNs in `.secrets/observability-accounts.json` | Live |
| 33 | Grafana Cloud Tempo + Faro | Live |
| 34 | `@vercel/otel` + `BatchSpanProcessor` fix | Live (verified in `apps/*/src/instrumentation.ts`) |
| 35 | `NEXT_PUBLIC_FARO_URL` turbo passthrough fix | Live (commit `a717c61a`) |
| 36 | NEXT_PUBLIC_AXIOM_INGEST_ENDPOINT has no consumer | Partially stale — code refs "Axiom log drain" in `packages/error-tracking/src/client.ts:38` and `server.ts:36`, though the env var itself is unread in source |

Summary: 2 claims are STALE (rebrand status, storage prefix), 1 is PARTIALLY STALE (Axiom), 10 are ACCURATE.

---

## Appendix: Recommendations by priority (report only; no fixes performed)

| # | Finding | Priority | Effort |
|---|---------|----------|--------|
| R1 | Delete or `git worktree remove --force` `.worktrees/wt-BEA-677-layout-constraints` | **High** | 1 command |
| R2 | Remove "buzz-in" from root `CLAUDE.md:36` | Medium | 1 edit |
| R3 | Add `/api/health` to both app CLAUDE.md Routes tables | Medium | 2 edits |
| R4 | Update MEMORY.md "IN PROGRESS — 2026-04-14" to "COMPLETE — 2026-04-12" and remove "currently still @joolie-boolie/*"/"still jb-" claims | **High** | 1 edit |
| R5 | Either delete all 12 empty claude-mem stubs OR replace them with genuine per-directory guidance. Not both. | Medium | Multiple edits OR delete 12 files |
| R6 | Update Context7 version pins (Next.js 16.2.3, etc.) OR remove inline version pins from root CLAUDE.md | Low | 1 edit |
| R7 | Add `packages/audio/src/CLAUDE.md` stub OR delete all package sub-stubs for symmetry | Low | 1 file |
| R8 | Consider adding a pre-commit hook that rejects claude-mem `*No recent activity*` stubs or auto-cleans them | **High** (process) | Design work |

---

**End of report. Total lines: ~540. Within 1500-line cap.**
