# Phase 1 Context Packet — Drift Audit 2026-04

**For Phase 2 iterators.** Compressed summary of all 5 Phase 1 reports. Do NOT read the raw Phase 1 reports unless your task points you at a specific one.

---

## The master shape of the drift (convergent finding across all 5 areas)

**Code and config are clean. Prose docs, manual test plan, and agent context files are stale.** This continues and intensifies the prior audit's finding ("what you run is correct, what you read is wrong"). The cleanup wave (BEA-697 → BEA-719) successfully purged removed systems from runnable surfaces but stopped at the boundary where the next doc was written.

## Per-area one-line summary

| Area | Drift level | Key finding |
|------|-------------|-------------|
| 1 Source code | **Clean** | All prior-audit source items fixed. Rebrand complete in source. Zero `jb-`, zero `@joolie-boolie/`. |
| 2 Prose docs | **Heavy** | 18 findings. Concentrated in `docs/E2E_TESTING_GUIDE.md`, `apps/trivia/README.md`, `docs/templates/APP_README_TEMPLATE.md`, `docs/adr/ADR-001`. Root README + ARCHITECTURE clean. |
| 3 Manual test plan | **Heavy** | 25 findings. Room/PIN/session-ID UI described but doesn't exist. Query param `?room=` should be `?session=`. Major coverage gaps. 6-week stale execution history. Brand itself is clean. |
| 4 CLAUDE.md + memory | **Mixed, with a sharp spike** | 5 substantive CLAUDE.md files mostly accurate. **21 of 26 tracked CLAUDE.md are claude-mem auto-generated stubs from Feb 16 (2 months stale)**, 2 still cite OAuth/JWT. `.worktrees/wt-BEA-677-layout-constraints/` has **30 stale CLAUDE.md files** citing platform-hub/supabase/auth — live agent-poison when Claude operates there. **MEMORY.md claims "rebrand IN PROGRESS" — FALSE** at HEAD. |
| 5 Config / brand | **Clean** | Rebrand 95%+ complete in configs. 0 `@joolie-boolie/` in tracked code. 1 stale `NEXT_PUBLIC_FEATURE_QUESTION_SETS` in trivia/.env.example. 5 low-pri items. |

## High-confidence drift hotspots (top priorities for Phase 2)

1. **`docs/E2E_TESTING_GUIDE.md`** — describes removed `authenticatedXyzPage` / `waitForRoomSetupModal` fixture API, ships `data-testid` table with 0 source matches, references deleted `e2e/bingo/room-setup.spec.ts`. Area 2 report has specifics.
2. **`docs/MANUAL_TEST_PLAN.md`** — dead test cases (Story 2.2, 3.2, 3.8 #1, 3.1 #1, 2.8 #5), 7 missing-coverage gaps, execution history stuck at 2026-03-02 (6 weeks old). Area 3 report has line-by-line inventory.
3. **`apps/trivia/README.md`** — still lists removed Question Sets feature + `/question-sets` route + `NEXT_PUBLIC_FEATURE_QUESTION_SETS` env var.
4. **`docs/templates/APP_README_TEMPLATE.md`** — BEA-719 mechanically rebranded but left Supabase in stack + `@hosted-game-night/database`/`auth` as prescribed packages + `SESSION_TOKEN_SECRET` env example. Poisonous template.
5. **`docs/adr/ADR-001`** tail Note — references non-existent `e2e/fixtures/auth.ts`.
6. **`.worktrees/wt-BEA-677-layout-constraints/`** — 30 stale CLAUDE.md files (783MB worth of outdated context) citing platform-hub/auth/supabase. Active agent-poisoning vector.
7. **21 auto-generated `docs/CLAUDE.md`-style stubs** — 2 months stale from claude-mem; 2 of them still mention OAuth/JWT.
8. **`/Users/j/.claude/projects/-Users-j-repos-beak-gaming-platform/memory/MEMORY.md`** — "rebrand IN PROGRESS" claim is false. Needs correction.

## Convergences across areas

- **Rebrand in code and config: complete.** Area 1 and Area 5 independently confirmed.
- **Human + AI documentation: stale.** Areas 2, 3, 4 all identified the same pattern at different layers.
- **BEA-719 was a mechanical string rebrand, not a semantic rewrite.** Area 2 (templates still prescribe Supabase) + Area 3 (brand clean but content stale) confirm.

## Contradictions (worth resolving in Phase 2)

- **Area 3 found brand-clean MTP; Area 2 found template still prescribes Supabase.** Implication: BEA-719's string-level rebrand worked, but it didn't catch semantic drift (architecture references embedded in sentences). A template saying "uses Supabase" passes a joolie-boolie grep. Worth formalizing as a methodology lesson.
- **Area 1 says playwright.config.ts comment about "local JWT generation, no Supabase" is fine (E2E_TESTING flag has no consumer).** Is the comment misleading future agents? Borderline-Area-2 drift. Phase 2 should resolve whether to delete the comment + flag.

## Surprises (not predicted in Phase 0)

- **Worktree context pollution is not a minor footnote — it's a 30-file, 783MB agent-poison.** Phase 0 flagged worktrees as in-scope for Area 4; the magnitude exceeded expectation.
- **`docs/CLAUDE.md`-style auto-generated stubs are systemic, not isolated.** 21 across the tree. Claude-mem is producing stale context silently.
- **The MEMORY.md drift is self-referential irony:** the memory file telling me "rebrand IN PROGRESS" was itself the drift. The agent-memory layer drifts just like docs.
- **Keyboard shortcut prereqs list in MTP:61 is wrong for BOTH apps.** (Area 3 F3.21.) Investigators checked against actual hooks; the plan's shortcut list is authoritative-looking but wrong.

## Open questions (for Phase 2 to address)

1. **Is claude-mem still configured to run?** If yes, why are stubs 2 months stale? If no, should the stubs be deleted entirely?
2. **Is there a worktree-hygiene policy?** 6 of 7 worktrees are clean. Why is `wt-BEA-677-layout-constraints` the outlier? Can it be deleted?
3. **Of the prior audit's open recommendations, what % landed?** Area 1 fully executed, Area 5 mostly executed, Area 2 reports ~85%, Area 3 reports MTP rewrite NOT executed. Need unified view.
4. **What's the velocity of doc updates vs code updates since 2026-04-11?** Predict where next drift wave will concentrate.
5. **Can we produce actionable rewrite specs for the top hotspots** (E2E guide, MTP, trivia README, template, ADR-001)?
6. **Should the playwright.config.ts E2E_TESTING flag + its orphan comment be deleted?**

## Artifacts (read only if your task points here)

- `phase-1/area-1-source-code.md` — clean; mostly status-check of prior audit items
- `phase-1/area-2-prose-docs.md` — 471 lines; 18 findings with file:line evidence
- `phase-1/area-3-manual-test-plan.md` — 290 lines; 25 findings with file:line, grouped Dead / Coverage / Inconsistency / Brand / Navigation
- `phase-1/area-4-claude-md-memory.md` — 774 lines; has full inventory of all CLAUDE.md files + worktree pollution + memory check
- `phase-1/area-5-config-brand.md` — 340 lines; mostly clean, quantitative brand metrics included
