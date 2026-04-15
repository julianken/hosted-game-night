# Decision 2: Doc Rewrite Execution Strategy (H.2 + H.3)

## TL;DR (3 sentences)

Execute H.2 and H.3 as **three PRs** sequenced narrow-to-wide: PR1 lands the ADR-001 tail Note + MEMORY.md fix + 22 claude-mem stub deletions as a single small cleanup; PR2 lands the MTP rewrite alone because its surface and review model are orthogonal to prose; PR3 lands the four Iterator-2 prose files **plus two newly-discovered Supabase-bearing app docs** (`apps/bingo/documentation/mvp_specification.md`, `apps/bingo/docs/GITHUB_PROJECT_PLAN.md`) and `PACKAGE_README_TEMPLATE.md` after a broader semantic-drift grep confirms the scope. Run pre-execution source probes for keyboard shortcuts, helpers.ts exports, and file existence before each PR; wipe MTP execution history (confirming Iterator 1); positively replace `APP_README_TEMPLATE.md` Supabase prose with the concrete Next.js 16 / localStorage / no-auth stack so scaffolded apps inherit correct architecture.

## Scope Confirmation (H.3 4 files vs. broader)

**Decision: Run a broader semantic-drift grep BEFORE PR3 and expand scope to include the confirmed hits.**

The "string ≠ semantic" drift pattern is present in at least two live app docs Iterator 2 did not inventory. The decision agent ran the Open Question B4 probe during this decision pass:

```bash
rg 'Supabase|SESSION_TOKEN_SECRET|@joolie-boolie/(auth|database)' apps/ \
  --glob '!node_modules' --glob '!dist' --glob '!.next'
```

Confirmed hits outside Iterator 2's 4-file scope:
- `apps/bingo/documentation/mvp_specification.md` — 8 Supabase references in live spec (tech stack table rows 25-27 name Supabase DB + Auth; body at :47, :54, :160, :234, :237, :444 describes the full Supabase-backed architecture). **High severity** — this is the canonical product spec.
- `apps/bingo/docs/GITHUB_PROJECT_PLAN.md` — 2 Supabase references (line 105 "Online rooms use Supabase-generated session ID", line 878 "Supabase session ID (online)"). **Medium severity** — appears to be a pre-standalone plan document.

**Execution probe to run at PR3 start:**

```bash
# 1. Full semantic-drift inventory (broader than B4 in the audit)
rg -l '(Supabase|SESSION_TOKEN_SECRET|@joolie-boolie/(auth|database)|platform-hub|OAuth|online (room|session))' \
  docs/ apps/*/README.md apps/*/docs/ apps/*/documentation/ \
  --glob '!docs/archive/**' --glob '!docs/*-audit*/**' --glob '!docs/*-analysis/**' \
  --glob '!docs/standalone-*/**' --glob '!docs/question-sets-feature-flag/**' \
  --glob '!docs/trivia-round-*/**' --glob '!docs/post-standalone-audit/**' \
  --glob '!docs/drift-audit-*/**' --glob '!docs/superpowers/**'

# 2. For each hit, decide: DELETE (if archive-eligible) or REWRITE (if live)
# 3. Verify apps/*/package.json has no residual @joolie-boolie references
rg '@joolie-boolie' apps/*/package.json packages/*/package.json package.json
```

The `apps/bingo/documentation/` and `apps/bingo/docs/` folders are **live in the app tree but are pre-standalone artifacts**. The decision for each:
- `apps/bingo/documentation/mvp_specification.md`: **Archive** (move to `docs/archive/`) rather than rewrite. It describes a removed architecture with no current readership; a surgical rewrite produces a truncated spec of questionable value. Archiving preserves history.
- `apps/bingo/docs/GITHUB_PROJECT_PLAN.md`: **Archive** for the same reason.
- `apps/bingo/documentation/game_show_mania_bingo/*` (4 files): **KEEP** — competitive analysis, no architecture claims.
- `apps/bingo/documentation/original_chat_gpt_response_bingo.md` + `apps/trivia/documentation/chat_gpt_output_project_idea.md`: **Archive** if Supabase-bearing; leave otherwise.

**Trade-off accepted:** Broader grep + triage adds roughly 30-60 minutes to PR3 preparation but closes the "is the 4-file scope complete?" uncertainty permanently. Given two hits already surfaced in the 30-second probe, the broader scan is high-ROI.

## PACKAGE_README_TEMPLATE.md inclusion decision

**Decision: ADD to H.3 scope as PR3.**

Finding 2.2 in the analysis report flagged `PACKAGE_README_TEMPLATE.md` as having "the same class of drift" but Iterator 2 did not produce a rewrite spec for it. Verified at HEAD: the file contains a prescriptive Supabase example at line 52-54 in the DESCRIPTION INSTRUCTIONS comment, and the instruction header at line 5 names `packages/database` as the canonical example.

This is a genuine Iterator 2 scope gap, not a deliberate exclusion. The fix is small — two comment-block edits — and bundling it into PR3 costs nothing while closing the gap.

- Line 52-54: Replace the Supabase example with a concrete example drawn from an existing package (e.g., `@hosted-game-night/sync`: "BroadcastChannel-based dual-screen synchronization for Hosted Game Night. Provides a Zustand store, React hook, and typed message protocol.").
- Line 5: Replace `packages/database, packages/ui` with `packages/sync, packages/ui` (database is deleted).

## Batching Strategy (PR structure)

**Decision: Three PRs, sequenced by scope and review model.**

| PR | Scope | Size | Review focus |
|----|-------|------|--------------|
| **PR1: Doc Hygiene Batch (BEA-###-A)** | ADR-001 tail Note + MEMORY.md three stale claim fix + 22 claude-mem stub deletions (invokes H.1 + H.8 + H.9) | ~30 lines changed, 22 files touched (mostly deletions) | Verify deletions are safe; ADR-001 path correctness |
| **PR2: MTP Rewrite (BEA-###-B / H.2)** | Full Iterator-1 disposition: 17 KEEP, 24 REWRITE, 18 DELETE, 18 ADD + execution history wipe + status count reset | ~350 lines doc change, 1 file | Test-by-test correctness against source truth tables |
| **PR3: Prose Docs Semantic Pass (BEA-###-C / H.3)** | Iterator-2 files (E2E guide, trivia README, APP_README_TEMPLATE, ADR-001 body adjacent cleanup) + PACKAGE_README_TEMPLATE + broader-grep results (archive mvp_specification.md, GITHUB_PROJECT_PLAN.md) | ~150 lines across ~7 files + 2 archive moves | Semantic correctness, template scaffolding safety |

**Rationale for rejecting alternatives:**

- *One big PR (MTP + all prose):* ~500+ lines doc change across 8 files; different review models (MTP needs source-truth traceability; prose needs stack-correctness judgment) would slow review by forcing context-switching.
- *Five PRs (MTP + 4 individual prose):* Excessive ceremony. The 4 Iterator-2 files share a common semantic review lens — reviewing them together is cheaper than in isolation.
- *Phased: ADR-001 trivial fix first, then big PR:* This is PR1 + a conflated PR2/3. Splitting further lets MTP ship independently if prose discovers a blocker during broader grep triage.

**Ordering rationale:**
1. **PR1 first** clears the three Q3 hygiene items cheaply and removes noise before reviewers open PR2/3.
2. **PR2 before PR3** because the MTP's execution-history wipe is a clean data delete (no semantic judgment), whereas PR3 hinges on broader-grep triage that may discover additional files.
3. **PR3 last** gives time for PR2 review to surface any "MTP expected this doc to say X" cross-file coupling.

## MTP Review Strategy

**Decision: Iterator-1 spec is the review guide. Reviewer verifies correctness via a three-artifact PR contract, not by re-running Phase 1 Area 3.**

The PR description must include:

1. **Disposition table summary** — copied verbatim from Iterator 1 §1 (test ID → disposition → source citation). The reviewer checks that every table row in the final MTP matches a disposition row.

2. **Source-truth pointer list** — the canonical sources Iterator 1 relied on, re-cited at current HEAD in the PR body. Reviewer spot-checks by opening one source file per section and confirming the MTP text matches:
   - Bingo `/play` controls: `apps/bingo/src/hooks/use-game.ts:354-378`
   - Bingo `/display` controls: `apps/bingo/src/app/display/page.tsx:261-282`
   - Trivia full keyboard table: `apps/trivia/src/hooks/use-game-keyboard.ts:140-305`
   - Trivia SetupGate derived settings: `apps/trivia/src/components/presenter/SetupGate.tsx:57-74`
   - Session ID format: `apps/bingo/src/lib/sync/session.ts:10-12` (UUID v4, not 6-char)

3. **Pre-merge probe log** — the output of the probes in the next section, pasted into the PR description as a fold-out block. If any probe returns a different result than Iterator 1 recorded, the PR must explain the delta or be rebased.

4. **Delta count verification** — a single-line summary: `85 baseline → -18 DELETE + 18 ADD → 85 post-rewrite, all NOT TESTED`. Reviewer verifies by counting rows in the new MTP.

**What the reviewer does NOT do:**
- Re-run Iterator 1's full investigation.
- Re-execute 85 test cases against HEAD.
- Re-derive the keyboard shortcut truth table from source.

This is a doc-review PR, not a QA pass. The source-truth invariant is enforced by the probe log + spot checks; full re-verification belongs to the first post-merge MTP execution run.

## Pre-Execution Verification Probes

**Decision: Run probes at the start of each PR's implementation session. Abort and re-spec if any probe returns a delta.**

### PR1 probes

```bash
# 1. Confirm the 22 claude-mem stub inventory is still 22
rg -l '<claude-mem-context>' --glob '*.md' --glob '!docs/drift-audit-*' \
  --glob '!docs/post-standalone-audit/**' --glob '!docs/*-analysis/**' \
  --glob '!docs/question-sets-feature-flag/**' --glob '!docs/standalone-*/**' \
  --glob '!docs/trivia-round-*/**'
# Expected: 22 files. If >22, re-inventory. If <22, someone deleted some; use current list.

# 2. Confirm ADR-001 tail still at line 53
sed -n '53p' docs/adr/ADR-001-e2e-hash-port-isolation.md

# 3. Confirm MEMORY.md "Branding IN PROGRESS" claim still present (may have been fixed live)
grep -c "IN PROGRESS" /Users/j/.claude/projects/-Users-j-repos-beak-gaming-platform/memory/MEMORY.md

# 4. Confirm @hosted-game-night/* scope is live
grep '"name"' package.json apps/*/package.json packages/*/package.json | head -5
```

### PR2 probes (MTP-critical)

```bash
# 1. Keyboard shortcut truth table still matches source
rg -n "case 'Space'|case 'KeyP'|case 'KeyR'|case 'KeyU'|case 'KeyM'" apps/bingo/src/hooks/use-game.ts
rg -n "'f'|'F'|'?'" apps/bingo/src/app/display/page.tsx | head -10
rg -n "case '(Space|KeyP|KeyE|KeyR|KeyN|KeyM|KeyT|KeyS|KeyF|Enter|Arrow(Up|Down|Left|Right))'" \
  apps/trivia/src/hooks/use-game-keyboard.ts
rg -n "DIGIT_TO_TEAM_INDEX|SCORING_PHASE_SCENES" apps/trivia/src/hooks/use-game-keyboard.ts
rg -n "KeyZ" apps/trivia/src/hooks/use-game-keyboard.ts

# 2. SetupGate derived-settings
rg -n "canUseByCategory|effectiveRoundsCount" apps/trivia/src/components/presenter/SetupGate.tsx

# 3. Session ID format
rg -n "uuid|generateSessionId|isValidSessionId" apps/bingo/src/lib/sync/session.ts apps/trivia/src/lib/sync/session.ts

# 4. /api/health exists
ls apps/bingo/src/app/api/health/route.ts apps/trivia/src/app/api/health/route.ts

# 5. /question-sets route absent
ls apps/trivia/src/app/question-sets 2>&1 | grep -q "No such" && echo "confirmed-absent"

# 6. localStorage prefix is hgn-
rg -n "'hgn-(bingo|trivia)-" apps/*/src/stores/ | head -10
```

### PR3 probes (prose-critical)

```bash
# 1. helpers.ts export list
grep '^export' e2e/utils/helpers.ts | wc -l

# 2. Referenced spec files exist
ls e2e/bingo/home.spec.ts e2e/trivia/setup-overlay.spec.ts

# 3. packages/database and packages/auth absent
ls packages/database packages/auth 2>&1 | grep -q "No such" && echo "confirmed-absent"

# 4. Current 8-package inventory
ls -d packages/*/ | wc -l  # expect 8

# 5. Broader semantic-drift grep
rg -l '(Supabase|SESSION_TOKEN_SECRET|@joolie-boolie|OAuth|online (room|session))' \
  docs/ apps/*/README.md apps/*/docs/ apps/*/documentation/ \
  --glob '!docs/archive/**' --glob '!docs/*-audit*/**' \
  --glob '!docs/*-analysis/**' --glob '!docs/drift-audit-*/**' \
  --glob '!docs/standalone-*/**' --glob '!docs/question-sets-feature-flag/**' \
  --glob '!docs/trivia-round-*/**' --glob '!docs/post-standalone-audit/**' \
  --glob '!docs/superpowers/**'

# 6. SESSION_TOKEN_SECRET example value only in template
rg 'vGOwoWTO69KP5QXIcNYjyHGonXJZh3nFH3oq3XOCSwY'

# 7. Playwright project names
grep -E 'project.*bingo|project.*trivia' playwright.config.ts | head -5
```

**If any probe returns an unexpected delta:** STOP. Record the delta in the PR body, re-verify the relevant iterator spec against the new HEAD, and either rebase the spec or narrow the PR scope to the unaffected portions.

## MTP Execution-History Disposition

**Decision: Wipe-and-reset, confirming Iterator 1.**

The execution-history table at MTP:75-91 holds 9 runs dated 2026-02-14 through 2026-03-02. Every one of those runs pre-dates:
- BEA-682 → BEA-696 (standalone conversion)
- BEA-698 (`/api/health` endpoint)
- BEA-704 / BEA-706 (selector-drift fixes)
- BEA-713 (SetupGate derived settings)
- BEA-714 (e2e fixture vocabulary purge)
- BEA-716 (auth-era vocabulary purge)
- BEA-718 / BEA-719 (`@hosted-game-night/*` rebrand)

The rows claim PASS counts against a UI that no longer exists. Freshness-stamp-and-preserve was considered and rejected because a future agent reads `168 PASS, 0 BUGS, 16 NOT TESTED` and assumes recent verification.

**What "wipe" means precisely:**

1. **Delete rows 1-9 entirely.** Line range: MTP:79-89.
2. **Delete the BEA-702 footnote** at :91.
3. **Replace with a single rebase-marker row** per Iterator 1 §2:
   ```
   | 2026-04-13 (rebase marker) | Standalone rebuild + rebrand (BEA-697 → BEA-719). Prior execution history (2026-02 through 2026-03) preserved in git history at HEAD `a7369f16`; not reproducible against current UI. | — (rebaseline pending) |
   ```
4. **Strip all inline `**PASS** — description (run N)` annotations** from the Result column.
5. **Bugs Found table** at :95-99 — wipe rows, add "Linear canonical for bugs going forward" note.
6. **Update status line** at MTP:20 to:
   ```
   **Current status:** 0 PASS, 0 BUGS, 85 NOT TESTED (rebaselined 2026-04-13; post BEA-697 → BEA-719 standalone rebuild)
   ```

**Why not freshness-stamp-and-preserve:**

- The runs mix test IDs from deleted sections with IDs from kept sections. A freshness stamp cannot express "this row's 168-PASS claim is 40% reliable and 60% fiction."
- Git preserves the history for free. Deletion is not destruction.
- Rebaseline at zero is the only honest count.

## APP_README_TEMPLATE.md Positive Replacement

**Decision: The template describes the current Next.js 16 / localStorage / no-auth stack explicitly, with an empty Required env var table and instruction comments that forbid re-adding Supabase/auth rows.**

Three alternatives considered:

1. **Minimal (placeholder-only):** Rejected — leaves vacuum that the next scaffolder fills with remembered patterns (including reintroduced Supabase env vars).
2. **Instructive (describe architecture, add "do not add" list):** **CHOSEN** — prevents re-introduction.
3. **Per-app specialization:** Rejected — template exists to enforce consistency.

**Specific content per Iterator 2 Rewrites 3.A-3.F:**

- **Tech Stack table (3.C):** Explicit current stack rows (Next.js 16 App Router, React 19, Tailwind 4, Zustand 5 with localStorage persistence, `@hosted-game-night/sync` for BroadcastChannel dual-screen, Serwist PWA, Vitest 4, `@sentry/nextjs` + `@vercel/otel` + Grafana Faro optional). Instruction comment above the table states: *"This project has no database and no auth infrastructure — apps run standalone with localStorage-only persistence. Do NOT add Database or Auth rows unless the app introduces one."*
- **Env var table (3.D):** Empty Required table with `[VARIABLE_NAME]` placeholder row only. Common Optional vars populated with the four observability env vars. Explicit "Do not add" list naming dead auth/DB vars.
- **Shared Packages (3.E):** The 8 real packages with one-sentence descriptions. Instruction to pick the ones actually consumed.
- **Integration Status (3.F):** Dual-Screen Sync, PWA/Offline, Theme System as the three example rows, plus two generic placeholder rows.
- **Prerequisites (3.B):** Drop Supabase line.
- **Description example (3.A):** Replace "cloud-based, web-accessible Bingo system" with standalone PWA + localStorage + BroadcastChannel framing.

**Key principle:** The template is the scaffolding surface. Its job is to prevent new apps from re-introducing the architecture this monorepo deliberately removed.

## Relation to H.1 Remaining Items

**Status of H.1 (agent context cleanup) from the analysis report:**

H.1 bundled four items (3.1, 3.2, 3.3, 3.4):
- **3.1 — wt-BEA-677 worktree pollution:** RESOLVED (worktrees deleted this session).
- **3.2 — 6 of 7 worktrees orphaned:** RESOLVED (all 7 deleted).
- **3.3 — 22 claude-mem stubs:** **NOT YET DONE.** Bundle into PR1.
- **3.4 — MEMORY.md stale branding claim:** RESOLVED live; probe in PR1 confirms.

**What remains of H.1 after this session's live cleanup:**

| Item | Status | Action |
|------|--------|--------|
| Worktree deletions | Done live | Verify with `git worktree list` in PR1 body |
| 22 claude-mem stubs | Open | **Include in PR1** |
| MEMORY.md fix | Done live | Probe confirms |
| Context7 version pins (3.5) | Open | **Defer to CLAUDE.md hygiene PR** |
| packages/audio missing CLAUDE.md (3.6) | Open | Defer; low-impact |

**Context7 version pin update rationale for defer:** Fix is trivial but uncorrelated with doc-rewrite work; better to roll into a dedicated "CLAUDE.md freshness stamp" pass when H.6 "agent context hygiene" is formalized.

## Per-file Definition of Done

### PR1 — Hygiene Batch

- **ADR-001 tail Note:** Line 53 replaced with Iterator 2 Rewrite 4.A Option B text. `rg 'auth.ts' docs/adr/ADR-001-e2e-hash-port-isolation.md` returns exactly one hit in the body, zero implying current existence.
- **22 claude-mem stubs:** Files in Iterator 4's inventory deleted. `rg '<claude-mem-context>' --glob '*.md' --glob '!docs/drift-audit-*' --glob '!docs/*-audit*' --glob '!docs/*-analysis/**' --glob '!docs/superpowers/**' --glob '!docs/standalone-*/**' --glob '!docs/question-sets-feature-flag/**' --glob '!docs/trivia-round-*/**' --glob '!docs/post-standalone-audit/**'` returns 0 hits.
  - Files: `docs/CLAUDE.md`; `apps/bingo/src/CLAUDE.md`, `apps/bingo/src/components/presenter/CLAUDE.md`, `apps/bingo/src/hooks/CLAUDE.md`, `apps/bingo/src/lib/game/CLAUDE.md`, `apps/bingo/src/lib/game/patterns/CLAUDE.md`, `apps/bingo/src/lib/sync/CLAUDE.md`, `apps/bingo/src/stores/CLAUDE.md`; `apps/trivia/src/CLAUDE.md`, `apps/trivia/src/components/presenter/CLAUDE.md`, `apps/trivia/src/hooks/CLAUDE.md`, `apps/trivia/src/lib/game/CLAUDE.md`, `apps/trivia/src/stores/CLAUDE.md`; `packages/error-tracking/src/CLAUDE.md`, `packages/game-stats/src/CLAUDE.md`, `packages/game-stats/src/stats/CLAUDE.md`, `packages/sync/src/CLAUDE.md`, `packages/testing/src/CLAUDE.md`, `packages/theme/src/CLAUDE.md`, `packages/types/src/CLAUDE.md`, `packages/ui/src/CLAUDE.md`, `scripts/CLAUDE.md`.
- **MEMORY.md:** Already fixed live; probe confirms.
- **Worktree verification:** `git worktree list` output pasted into PR description showing only main repo.
- **Tests:** `pnpm typecheck && pnpm lint && pnpm test:run` green.
- **Review gate:** 1 LGTM; merge.

### PR2 — MTP Rewrite (H.2)

- **Disposition coverage:** Every test case matches Iterator 1 disposition. Delta: 85 baseline, 18 DELETE, 18 ADD, net 85.
- **Status line:** `**Current status:** 0 PASS, 0 BUGS, 85 NOT TESTED (rebaselined 2026-04-13; post BEA-697 → BEA-719 standalone rebuild)`.
- **Execution History:** Single rebase-marker row.
- **Bugs Found:** Empty table with Linear-pointer note.
- **Inline PASS annotations:** `grep -c "\*\*PASS\*\*" docs/MANUAL_TEST_PLAN.md` returns 0.
- **Keyboard shortcut references:** MTP:61 updated to reference Story 2.3, 2.8, 3.13 + app CLAUDE.mds.
- **Source citations:** Every REWRITE and ADD row includes a `source: file:line` pointer.
- **Deleted stories:** Story 2.2, 3.2, 3.8.1 fully gone.
- **New stories present:** Story 2.6.5/6, 3.11.8/9/10, 3.13.5/8/9/10/11/12/13, 6.3, 3.17, template/preset/layout stories.
- **Probe log:** PR2 probes run, outputs pasted into PR description.
- **Review gate:** Spec-review focus; 1-2 LGTMs.

### PR3 — Prose Semantic Pass (H.3)

#### docs/E2E_TESTING_GUIDE.md
- Rewrite 1.A-E per Iterator 2 spec. `rg 'waitForRoomSetupModal|room-setup.spec|offline-session-id|online-room-code' docs/E2E_TESTING_GUIDE.md` returns 0.

#### apps/trivia/README.md
- Rewrite 2.A-E per Iterator 2 spec. `rg 'question-sets|NEXT_PUBLIC_APP_URL|NEXT_PUBLIC_FEATURE_QUESTION_SETS|Pattern editor' apps/trivia/README.md` returns 0.

#### docs/templates/APP_README_TEMPLATE.md
- Rewrites 3.A-3.F per §APP_README_TEMPLATE.md Positive Replacement above.
- `rg 'Supabase|SESSION_TOKEN_SECRET|@hosted-game-night/(database|auth)' docs/templates/APP_README_TEMPLATE.md` returns 0.

#### docs/templates/PACKAGE_README_TEMPLATE.md
- Line 5 + 52-54 updated. `rg 'Supabase|packages/database|packages/auth' docs/templates/PACKAGE_README_TEMPLATE.md` returns 0.

#### docs/adr/ADR-001-e2e-hash-port-isolation.md
- Body lines 17, 47-48: `port-isolation.ts` → `port-config.ts`. `rg 'port-isolation.ts' docs/adr/ADR-001-e2e-hash-port-isolation.md` returns 0.

#### Archive moves (broader-grep results)
- `apps/bingo/documentation/mvp_specification.md` → `docs/archive/bingo-mvp-specification.md`.
- `apps/bingo/docs/GITHUB_PROJECT_PLAN.md` → `docs/archive/bingo-github-project-plan.md`.
- Additional broader-grep hits triaged; each hit gets archive-moved OR rewrite OR left-with-rationale.
- `rg '(Supabase|SESSION_TOKEN_SECRET)' apps/*/documentation/ apps/*/docs/ apps/*/README.md` returns 0 (or limited to explicit-kept files).

#### PR3 overall gates
- All 7 PR3 probes run, outputs in PR description.
- `pnpm typecheck && pnpm lint && pnpm test:run` green.
- `rg 'apps/bingo/documentation/mvp_specification|apps/bingo/docs/GITHUB_PROJECT_PLAN' docs/ apps/ packages/` returns hits only if updated to archive paths.
- 1-2 LGTMs; merge.

## Open Questions

1. **Playwright `--project=bingo` / `--project=trivia` naming** — verify with `grep -E 'name:\s*.(bingo|trivia)' playwright.config.ts` at PR3 start.
2. **`NEXT_PUBLIC_FARO_URL` Faro consumer path** — verify with `rg 'FARO_URL' packages/error-tracking/src/` before PR3.
3. **`scripts/e2e-with-build.sh` latent env validation** — `grep -E "throw|process.exit" scripts/e2e-with-build.sh` before deleting troubleshooting block in Rewrite 1.C.
4. **Session instrumentation for H.4 measurement** — Separate decision on whether to start the 20-session drift-cost instrumentation before H.4. Not gating H.2/H.3.
5. **MTP:61 cascade effects** — Out of scope; noted for H.4 measurement.
6. **Broader-grep triage classification policy** — Recommend archive-with-redirect as default for pre-standalone content.

## Rationale Summary

Three principles drove these decisions:

**(1) Narrow PRs over wide ones when review models differ.** MTP review is source-truth traceability. Prose review is stack-correctness judgment. Combining them forces context-switching. Three PRs of 30, 350, and 150 lines beat one PR of 530 lines because each reviewer can apply a single lens.

**(2) Probe before edit, because HEAD drifts between spec and execution.** Iterator specs are grounded against HEAD `a7369f16`. Implementation PRs will land later. Every source-truth claim is a probe candidate; specifying which probes to run at PR-start and what counts as abort-level delta is how the spec survives the gap.

**(3) Positive replacement beats deletion for scaffolding surfaces.** APP_README_TEMPLATE.md drift has blast radius = future scaffolds. Deleting Supabase rows without replacing leaves a vacuum. Replacing with explicit current-stack rows + "do not add" list makes the template an active guardrail.

The broader-grep discovery (`mvp_specification.md`, `GITHUB_PROJECT_PLAN.md`) validates Theme 2's prediction: string-swap cleanup misses semantic drift exactly where it does the most damage — in prescriptive docs that name removed systems. Running this grep at Phase 2 time would have caught them; running it now costs nothing and closes the scope uncertainty.
