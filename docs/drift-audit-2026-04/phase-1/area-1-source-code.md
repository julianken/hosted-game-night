# Investigation Area 1: Source Code Residual References

## Summary

Investigation of tracked source code (`apps/`, `packages/`, `e2e/`) at HEAD `a7369f16` reveals a **clean bill of health**. All critical findings from the prior audit (2026-04-11, HEAD `25cdc983`) have been successfully remediated. The rebrand (`joolie-boolie` → `hosted-game-night`, `jb-` → `hgn-` prefixes) is complete in source code. No residual imports, dead type references, commented-out auth/supabase code, or brand string artifacts remain in tracked source. Dead type exports from the prior audit (`packages/types/src/user.ts`, `packages/types/src/api.ts`, `apps/bingo/src/types/index.ts` auth block) have been deleted. E2E fixtures are correctly documented as auth-free and standalone-ready. The consolidation is thorough and appears to have caught all runtime vectors.

## Key Findings

### Finding 1.1: Prior audit's dead types have been deleted
- **Evidence:** `packages/types/src/user.ts` and `packages/types/src/api.ts` deleted — `git show HEAD:packages/types/src/user.ts` returns "fatal: path does not exist in HEAD"; `git ls-files packages/types/src/` shows only `branded.ts`, `game.ts`, `index.ts`, `sync.ts`, `CLAUDE.md`
- **Provenance:** `[tracked-HEAD]` — verified via `git show` and `git ls-files`
- **Confidence:** high — definitive absence in tracked file set
- **Impact:** Status note for orchestrator: cleanup from prior audit's Finding 1.1 has landed. No new action needed.
- **Related:** Prior audit Finding 1.1, Finding 1.2

### Finding 1.2: Error categorization cleaned of dead branches
- **Evidence:** `packages/error-tracking/src/server.ts:91-129` — `categorizeError()` function only references `econnrefused`, `timeout`, `enotfound`, `fetch` (network), `unauthorized`, `forbidden`, `authentication` (auth), `validation`, `database`, `query`. No branches for `jwt`, `supabase`, or `postgres`.
- **Provenance:** `[tracked-HEAD]` — file read at HEAD shows clean categorization
- **Confidence:** high
- **Impact:** Status note: prior audit Finding 1.4 cleanup has landed. No stale string-matching branches remain.
- **Related:** Prior audit Finding 1.4

### Finding 1.3: E2E workflow cleaned of removed project reference
- **Evidence:** `.github/workflows/e2e.yml:149-151` — `pnpm playwright test --project=bingo --project=trivia` (no `bingo-mobile` reference). Workflow syntax is current.
- **Provenance:** `[tracked-HEAD]` — file read at HEAD
- **Confidence:** high
- **Impact:** Status note: prior audit Finding 1.5 cleanup has landed. Workflow will not error on unknown project.
- **Related:** Prior audit Finding 1.5

### Finding 1.4: Rebrand to `hgn-` prefix is complete in source
- **Evidence:** 
  - `apps/bingo/src/lib/sync/session.ts:3` — `const CHANNEL_PREFIX = 'hgn-bingo-sync'`
  - `apps/bingo/src/stores/theme-store.ts:9` — `createThemeStore('hgn-bingo-theme')`
  - `apps/bingo/src/stores/audio-store.ts:434` — `name: 'hgn-bingo-audio'`
  - `apps/trivia/src/stores/theme-store.ts:9` — `createThemeStore('hgn-trivia-theme')`
  - `apps/trivia/src/stores/preset-store.ts:90` — `name: 'hgn-trivia-presets'`
  - `apps/trivia/src/stores/template-store.ts:92` — `name: 'hgn-trivia-templates'`
  - `packages/ui/src/skeleton.tsx:58,60,68,72,80` — CSS keyframes `hgn-skeleton-shimmer`, `hgn-shimmer` (animation)
  - `packages/ui/src/toast.tsx:250-251,255,259` — CSS keyframes `hgn-toast-in`, `hgn-toast-out`
  - `packages/ui/src/button.tsx:37,41,45,77` — CSS animation `hgn-dot-bounce`
  - Grep across all `apps/` + `packages/` for `jb-` pattern: **0 matches**
  - Grep across all `apps/` + `packages/` for `joolie-boolie`: **0 matches**
  - Grep across all `apps/` + `packages/` for `beak-gaming`: **0 matches**
- **Provenance:** `[tracked-HEAD]` — verified via `git show HEAD` reads and `git ls-files | xargs grep` searches
- **Confidence:** high — exhaustive pattern match shows zero legacy brand references
- **Impact:** Rebrand is complete at HEAD. No user-facing confusion from stale localStorage keys or BroadcastChannel prefixes in code; however, legacy localStorage keys from user clients running old code may still be `jb-*`, creating a migration edge case (out of scope for this audit; see "Unknowns").
- **Related:** BEA-718 (claimed completed); verified complete

### Finding 1.5: Package scope rebrand is complete
- **Evidence:**
  - `package.json` line: `"dev:bingo": "turbo dev --filter=@hosted-game-night/bingo"`
  - `apps/bingo/package.json:2` — `"name": "@hosted-game-night/bingo"`
  - `apps/bingo/package.json:3-11` — all internal deps use `@hosted-game-night/*` (e.g., `@hosted-game-night/audio`, `@hosted-game-night/sync`)
  - `apps/trivia/package.json` — same pattern
  - Grep across all `package.json` files for `@joolie-boolie`: **0 matches**
- **Provenance:** `[tracked-HEAD]` — verified via `git show HEAD` on both root and app-level package.json files
- **Confidence:** high
- **Impact:** Package scope rebrand complete; no stale imports will resolve to old namespace
- **Related:** BEA-718 (claimed completed); verified complete

### Finding 1.6: No residual imports from removed packages
- **Evidence:**
  - Grep across `apps/` + `packages/` for `import.*from.*auth`: **0 matches**
  - Grep across `apps/` + `packages/` for `import.*from.*supabase`: **0 matches**
  - Grep across `apps/` + `packages/` for `import.*from.*database`: **0 matches**
  - Grep across `apps/` + `packages/` for `import.*from.*platform-hub`: **0 matches**
- **Provenance:** `[tracked-HEAD]` — ripgrep across entire source tree
- **Confidence:** high
- **Impact:** No dead imports will break at runtime or confuse agents

### Finding 1.7: E2E fixtures clearly document standalone (auth-free) mode
- **Evidence:**
  - `e2e/fixtures/game.ts:23-28` — "Both apps run in standalone mode (no authentication, localStorage-only)."
  - `e2e/fixtures/game.ts:126` — "Navigates directly to Bingo /play (no auth needed in standalone mode)."
  - `e2e/fixtures/game.ts:39-49` — Fixture composition is layered and well-documented; no auth fixtures present
  - `e2e/global-setup.ts` — only validates server health; no auth setup
  - `playwright.config.ts:4` — "This signals to apps to use E2E bypass mode (local JWT generation, no Supabase)." [Note: This is a legitimate comment about past design — no current JWT generation code exists; E2E_TESTING flag is set but no consumer found in source]
- **Provenance:** `[tracked-HEAD]` — file reads
- **Confidence:** high
- **Impact:** Clear documentation prevents agents from adding auth assumptions to E2E tests; fixture model is clean

## Prior Audit Status Check

| Prior Finding | Status | Evidence |
|---|---|---|
| 1.1: `packages/types/src/user.ts` + `api.ts` dead | **CLOSED** | Files deleted from tracked set; `git show HEAD` returns "does not exist" |
| 1.2: `apps/bingo/src/types/index.ts:212-307` dead block | **CLOSED** | File now has 210 lines total; auth types block removed |
| 1.3: `.github/workflows/nightly.yml:81-89` dead env vars | **CLOSED** | File read shows clean build step with no auth/supabase env injection |
| 1.4: `packages/error-tracking/src/server.ts` dead branches | **CLOSED** | `categorizeError()` branches cleaned; only valid patterns remain |
| 1.5: `.github/workflows/e2e.yml:152` `bingo-mobile` ref | **CLOSED** | Workflow uses `--project=bingo --project=trivia` only |

**Note:** All source-code-related cleanup items from the prior audit have been successfully implemented. No regression detected.

## Surprises

**None.** The source code cleanup from BEA-697 through BEA-719 (rebrand + dead-code pass) was thorough and complete. This is the expected outcome given the deliberate cleanup commits in that wave.

## Unknowns & Gaps (for Phase 2)

1. **localStorage migration edge case:** Users with browsers holding old `jb-*` localStorage keys will not auto-migrate to `hgn-*` keys. Is there a client-side migration strategy in place, or is this intentional (new-session-only migration)? This does not appear in source code but may be an app-level concern for phases 2-4.

2. **E2E_TESTING flag utility:** `playwright.config.ts:4-5` sets `E2E_TESTING='true'` and references "local JWT generation, no Supabase." No code in `apps/` or `packages/` consumes `E2E_TESTING` or generates JWTs. Is this flag dead, or does it control something outside the tracked source (build-time, runtime config)?

3. **Faro observability URL corruption:** Prior audit Finding 4.6 (Vercel env `NEXT_PUBLIC_FARO_URL` has literal `\n` appended) was marked URGENT in the prior audit but is outside the scope of source-code drift. **Is this still broken at HEAD?** Check requires `vercel env ls` live probe (out of scope here).

4. **GitHub Actions enabled?** Prior audit Finding 3.2 notes `.github/workflows/` files are present but live status (whether Actions is enabled at repo level) is unknown. Affects whether workflows are actually firing.

## Raw Evidence

```bash
# Brand rebrand verification (joolie-boolie → hosted-game-night)
git show HEAD:apps/bingo/package.json | grep -E '"name"|"@hosted'
# Output: "@hosted-game-night/bingo" and all internal deps use @hosted-game-night/*

git show HEAD:package.json | grep -E 'dev:bingo|dev:trivia'
# Output: both use --filter=@hosted-game-night/*

# localStorage/BroadcastChannel prefix (jb- → hgn-)
git ls-files apps/ packages/ | xargs grep -h "hgn-" 2>/dev/null | sort -u | head -20
# Output: 20+ matches across stores, sync, UI components — all hgn-* pattern

git ls-files apps/ packages/ | xargs grep -h "jb-" 2>/dev/null | wc -l
# Output: 0 (no matches)

# Dead imports verification
git ls-files apps/ packages/ | xargs grep "import.*from.*auth" 2>/dev/null | wc -l
# Output: 0
git ls-files apps/ packages/ | xargs grep "import.*from.*supabase" 2>/dev/null | wc -l
# Output: 0

# Error categorization cleanup
git show HEAD:packages/error-tracking/src/server.ts | sed -n '90,130p' | grep -E "jwt|supabase|postgres"
# Output: (empty — no matches)

# E2E workflow projects
git show HEAD:.github/workflows/e2e.yml | grep -E "project="
# Output: --project=bingo (line 150), --project=trivia (line 151)

# Prior audit Finding 1.1 — types deletion
git show HEAD:packages/types/src/user.ts 2>&1
# Output: fatal: path 'packages/types/src/user.ts' does not exist in 'HEAD'

# Current packages/types files
git ls-files packages/types/src/ | sort
# Output: branded.ts, CLAUDE.md, game.ts, index.ts, sync.ts
```

---

**Investigation completed:** 2026-04-13 by Phase 1 Investigator 1
**Tracked at:** HEAD `a7369f16` on branch `main`
