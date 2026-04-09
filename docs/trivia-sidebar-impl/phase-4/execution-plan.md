# Trivia Sidebar Removal — Final Execution Plan

**Phase 4 Synthesis | Generated:** 2026-03-11
**Output of:** Decision Funnel (4 phases, 8 iterators, 3 synthesis reports)

---

## Table of Contents

| Section | Summary |
|---------|---------|
| [A. ELI5 Explanation](#a-eli5-explanation) | Plain-language summary of what is being done and why. |
| [B. 5-Sentence Technical Summary](#b-5-sentence-technical-summary) | Engineering overview covering scope, approach, and risk profile. |
| [D.1 Architecture / Approach Summary](#d1-architecture--approach-summary) | Key patterns, structural decisions, and rationale. |
| [D.2 Step-by-Step Implementation Sequence](#d2-step-by-step-implementation-sequence) | Ordered dependency graph for all 5 PRs. |
| [D.3 Work Unit Specs](#d3-work-unit-specs) | Per-PR objective, files, implementation notes, acceptance criteria, tests, risks, and agent type. |
| [D.3.x Ticket Breakdown](#d3x-recommended-ticket-breakdown) | Linear issue drafts and parallelization wave mapping. |
| [D.4 Agent / Task Orchestration Plan](#d4-agent--task-orchestration-plan) | 3-wave parallel dispatch strategy with full agent prompts. |
| [D.5 Checkpoints Between Milestones](#d5-checkpoints-between-milestones) | Verification gates and stop conditions after each PR. |
| [D.6 Branch and Merge Strategy](#d6-branch-and-merge-strategy) | Naming conventions, commit format, merge order, and gates. |

---

## A. ELI5 Explanation

The trivia game has a right-side panel (the "sidebar") that shows score controls during a live game. We decided to remove it because its features either already work better through keyboard shortcuts, or belong somewhere else in the app. Before we can safely delete it, we need to fix a bug where the game's "End of Game" screen sometimes gets scrambled, and move the "View Final Results" button into the main center panel so presenters still have access to it. Then we delete the sidebar and clean up the layout so the center panel doesn't stretch too wide on large screens. Finally, we file a couple of follow-up tickets for features (team renaming, direct score editing) that need to be relocated to a better home later.

---

## B. 5-Sentence Technical Summary

The work is scoped entirely to `apps/trivia/src/` and produces five PRs across a three-wave sequential-then-parallel structure. PR-A (Wave 1) fixes a latent `handleNextRound` bug that unconditionally sets `audienceScene` to `round_intro` during the `ended` status, and adds an auto-show `useEffect` plus a re-open button in the center panel so the ended-state UI has a home before the sidebar disappears. PR-B (Wave 2) atomically deletes the right `<aside id="game-controls">` block (~77 net lines from `page.tsx`), the `QuickScoreGrid.tsx` component file, four unused imports, Instance 2 of `useQuickScore`, and the dead `isScoringScene` variable — structurally eliminating the dual-`useQuickScore` bug and the divergent-reset bug in the same changeset. PR-C (Wave 3) adds `max-w-3xl mx-auto w-full` constraints to prevent the center panel from stretching into unreadable widths after gaining ~320px of freed space. PR-D (Wave 1, independent) is a 2-line accessibility fix for the skip link target, and PR-E (Wave 1, orchestrator-only) creates two Linear follow-up issues for features that are removed from the sidebar but not yet relocated.

---

## D.1 Architecture / Approach Summary

### Structural pattern: Foundation → Deletion → Polish

The plan follows a strict three-phase structural pattern: lay the replacement foundation before removing what it replaces, then clean up the visible side effects.

- **PR-A is additive only.** It introduces the ended-state replacement UI without touching any deletion. This guarantees that even if PR-B is delayed, no UI vacuum exists.
- **PR-B is a pure deletion.** Every line removed is either directly the sidebar JSX or exclusively supports it. TypeScript compilation serves as the primary safety net for dangling references. No new UI is introduced in this PR.
- **PR-C is a CSS-only polish PR.** It intentionally comes after PR-B so the implementer can verify the actual post-deletion layout rather than estimating it.

### Why Items 2 and 3 stay in separate PRs

The intermediate state after PR-A (both the sidebar and the center panel show "View Final Results") is redundant but not harmful. The auto-show effect fires immediately on `status === 'ended'`, so the overlay is already open before a user can interact with either button. Keeping the PRs separate produces cleaner review boundaries and a narrower rollback surface if PR-B regresses.

### Why bugs are absorbed into PR-B rather than standalone PRs

Both the dual-`useQuickScore` bug (Instance 2 fires independently from Instance 1) and the divergent-reset bug (Instance 2's `useRef` accumulates state across resets) live entirely within the code being deleted. They require zero code changes to "fix" — the deletion eliminates them structurally. Creating separate bug-fix PRs for code that is about to be deleted would add complexity with no benefit.

### Key invariants to preserve

- `isRoundScoringScene` (line 182) is NOT deleted — it is used at lines 380 and 385 in the center panel.
- `TeamManager.tsx`, `TeamScoreInput.tsx`, and `use-quick-score.ts` are NOT deleted — they have consumers outside the sidebar.
- Instance 1 of `useQuickScore` (in `use-game-keyboard.ts`) is NOT touched — keyboard shortcuts 1-9 must continue to work.
- `audienceScene` must remain on `final_podium` (not `round_intro`) after the game ends.

---

## D.2 Step-by-Step Implementation Sequence

```
PREREQUISITE: Create 5 Linear issues (BEA-### IDs assigned by Linear)
       │
       ├── Wave 1 (parallel dispatch) ──────────────────────────────────────────
       │   ├── PR-A  feat/BEA-???-handleNextRound-fix
       │   │         Items 1+2: Fix handleNextRound + Add ended-state center panel
       │   │         [agent: frontend-excellence:react-specialist]
       │   │
       │   ├── PR-D  fix/BEA-???-skip-link-a11y
       │   │         Item 7: Fix skip link a11y target (2 lines)
       │   │         [agent: frontend-excellence:react-specialist]
       │   │
       │   └── PR-E  (orchestrator — no code, no worktree)
       │             Item 8: Create 2 Linear follow-up issues
       │
       ↓  (wait for PR-A to merge)
       │
       ├── Wave 2 ──────────────────────────────────────────────────────────────
       │   └── PR-B  feat/BEA-???-remove-sidebar
       │             Items 3+4+5: Delete sidebar + structural bug elimination
       │             [agent: frontend-excellence:react-specialist]
       │
       ↓  (wait for PR-B to merge)
       │
       └── Wave 3 ──────────────────────────────────────────────────────────────
           └── PR-C  feat/BEA-???-layout-constraints
                     Item 6: Center panel max-width constraints
                     [agent: frontend-excellence:css-expert]
```

**Critical path:** PR-A → PR-B → PR-C (3 sequential work units)
**Parallel tracks:** PR-D and PR-E can be dispatched simultaneously with PR-A in Wave 1, and merged in any order independently of the critical path.

---

## D.3 Work Unit Specs

---

### PR-A — Fix handleNextRound + Add ended-state center panel

**Linear issue:** BEA-??? "Fix handleNextRound + Add ended-state center panel"
**Priority:** Urgent | **Labels:** bug, enhancement, trivia

**Objective:** Fix the latent `handleNextRound` bug that corrupts `audienceScene` during `ended` state, and provide a complete ended-state UI in the center panel so that sidebar removal (PR-B) leaves no UI vacuum.

**Files touched:**
- `apps/trivia/src/app/play/page.tsx` — sole change target
- `apps/trivia/src/stores/__tests__/game-store.test.ts` — 1 new unit test
- `e2e/trivia/presenter.spec.ts` — 5 new E2E tests

**Implementation notes:**

1. **Split `handleNextRound` into two handlers** (replace lines 89–93):
   ```tsx
   // between_rounds only: advance to next round and reset scene.
   const handleNextRound = () => {
     if (game.status !== 'between_rounds') return;
     game.nextRound();
     setShowRoundSummary(false);
     useGameStore.getState().setAudienceScene('round_intro');
   };

   // ended only: dismiss the final results overlay.
   // Does NOT touch audienceScene — final_podium must remain stable.
   const handleEndGameDismiss = () => {
     setShowRoundSummary(false);
   };
   ```

2. **Add auto-show effect** (insert after line 82, before `const openDisplay`):
   ```tsx
   useEffect(() => {
     if (game.status === 'ended') {
       setShowRoundSummary(true);
     }
   }, [game.status]);
   ```

3. **Add re-open button** (insert after line 472, before the `{showRoundSummary && ...}` block):
   ```tsx
   {!showRoundSummary && game.status === 'ended' && (
     <div className="mt-4">
       <button
         onClick={() => setShowRoundSummary(true)}
         className="w-full px-4 py-3 rounded-xl text-sm font-medium
           bg-surface-elevated hover:bg-surface-hover text-foreground
           border border-border transition-colors min-h-[44px]"
       >
         View Final Results
       </button>
     </div>
   )}
   ```

4. **Update `onNextRound` prop wiring** (change line 483):
   ```tsx
   onNextRound={game.status === 'ended' ? handleEndGameDismiss : handleNextRound}
   ```

**Acceptance criteria:**
- [ ] `handleNextRound` no longer sets `audienceScene` to `round_intro` during `ended` status
- [ ] `RoundSummary` auto-shows immediately when `game.status` transitions to `'ended'`
- [ ] Dismissing `RoundSummary` during `ended` reveals the "View Final Results" button in the center panel
- [ ] Clicking "View Final Results" re-opens the `RoundSummary` overlay
- [ ] `onNextRound` prop uses `handleEndGameDismiss` during `ended` and `handleNextRound` during `between_rounds`
- [ ] Between-rounds flow (N key, round advancement) is completely unchanged
- [ ] R key reset works correctly from `ended` state
- [ ] `audienceScene` remains `final_podium` (not `round_intro`) after game ends and overlay is dismissed

**Tests:**

Unit (1 new test in `apps/trivia/src/stores/__tests__/game-store.test.ts`):
- `nextRound ended-state guard`: verify `audienceScene` is not set to `round_intro` when status is `ended`

E2E (5 new tests in `describe('Ended State')` block in `e2e/trivia/presenter.spec.ts`):
- **E1 (P0):** `'auto-shows Final Results overlay when game ends @critical'`
- **E2 (P0):** `'can dismiss and re-open Final Results overlay @critical'`
- **E3 (P1):** `'Final Results overlay shows overall winners @high'`
- **E4 (P1):** `'can start new game from ended state @high'`
- **E5 (P1):** `'End Game button in Final Results does not corrupt audience scene @high'`

**Risks:** Low. All changes are additive — no deletions, no existing behavior altered except the `onNextRound` prop wiring.

**Rollback:** Revert `page.tsx` to the state before this PR. The 1 unit test and 5 E2E tests are deleted alongside.

**Dependencies:** None. This is the first PR in the critical path.

**Recommended agent type:** `frontend-excellence:react-specialist`

---

### PR-B — Remove right sidebar

**Linear issue:** BEA-??? "Remove right sidebar from presenter view"
**Priority:** High | **Labels:** enhancement, trivia | **Blocked by:** PR-A

**Objective:** Atomically delete the right sidebar and all code exclusively supporting it. Structurally eliminates the dual-`useQuickScore` bug and the divergent-reset bug.

**Files touched:**
- `apps/trivia/src/app/play/page.tsx` — ~77 net lines removed
- `apps/trivia/src/components/presenter/QuickScoreGrid.tsx` — deleted entirely
- `e2e/trivia/presenter.spec.ts` — delete 5 tests (lines 237–328)

**Implementation notes — exact deletion manifest:**

Imports to delete (4 lines in `page.tsx`):
| Line | Import |
|------|--------|
| 13 | `TeamScoreInput` |
| 14 | `TeamManager` |
| 15 | `QuickScoreGrid` |
| 19 | `useQuickScore` |

Hooks/constants to delete (9 lines in `page.tsx`):
| Lines | Content |
|-------|---------|
| 171 | Quick score hook comment |
| 172 | `const quickScore = useQuickScore(...)` (Instance 2) |
| 173 | blank line |
| 174 | Scoring-phase scenes comment |
| 175–179 | `const isScoringScene = (...)` — confirmed dead, only used inside sidebar at lines 516/526 |

JSX to delete (68 lines in `page.tsx`):
| Lines | Content |
|-------|---------|
| 496 | Sidebar comment |
| 497 | `{!isRoundScoringScene && (` |
| 498–562 | Entire `<aside id="game-controls">` block |
| 563 | `)}` closing bracket |

Layout comment update:
- Lines 238–244: Update comment from "3-column" to "2-column"

File deletion:
- `apps/trivia/src/components/presenter/QuickScoreGrid.tsx` — zero consumers, zero tests after sidebar removal

E2E test deletion:
- Delete `test.describe('Score Adjustment', ...)` block (lines 237–328 in `e2e/trivia/presenter.spec.ts`)

**Variables to KEEP (critical — do not delete):**
- `isRoundScoringScene` at line 182 — used at lines 380 and 385 in the center panel

**Files NOT to delete:**
- `TeamManager.tsx` — still used by `WizardStepTeams.tsx`
- `TeamScoreInput.tsx` — dormant; marked SHOULD RELOCATE
- `use-quick-score.ts` — Instance 1 is alive in `use-game-keyboard.ts`

**Acceptance criteria:**
- [ ] No `<aside id="game-controls">` element in the DOM at any point during game play
- [ ] `QuickScoreGrid.tsx` file is deleted
- [ ] `isScoringScene` variable is removed from `page.tsx`
- [ ] `isRoundScoringScene` variable is RETAINED in `page.tsx`
- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm lint` passes with zero errors
- [ ] All surviving unit tests pass (`pnpm test:run`)
- [ ] `pnpm test:e2e:summary` shows "0 failed"
- [ ] Keyboard scoring (1–9 keys) still awards points (Instance 1 in `use-game-keyboard.ts` untouched)
- [ ] Round scoring panel (`isRoundScoringScene` guard) is unaffected
- [ ] The ended-state UI from PR-A works correctly post-deletion

**Tests:**
- Delete 5 E2E tests in `test.describe('Score Adjustment', ...)` block
- Verify retained unit tests still pass: 17 `TeamManager.test.tsx`, 18 `TeamScoreInput.test.tsx`, 8 `use-quick-score.test.ts`
- New E2E: `'keyboard scoring still works after sidebar removal @critical'`

**Risks:** Medium — largest deletion. CRITICAL: only delete `isScoringScene` (lines 174–179), do NOT delete `isRoundScoringScene` (line 182).

**Rollback:** Revert `page.tsx`, restore `QuickScoreGrid.tsx` from git history, restore 5 deleted E2E tests.

**Dependencies:** PR-A must be merged first.

**Recommended agent type:** `frontend-excellence:react-specialist`

---

### PR-C — Center panel layout constraints

**Linear issue:** BEA-??? "Center panel layout constraints post-sidebar"
**Priority:** Normal | **Labels:** enhancement, trivia | **Blocked by:** PR-B

**Objective:** Add `max-w-3xl mx-auto w-full` constraint to prevent the center panel from stretching to unreadable widths after sidebar removal.

**Files touched:**
- `apps/trivia/src/app/play/page.tsx` — wrapper div change only

**Implementation notes:**
1. Wrap non-round-scoring content block with `<div className="max-w-3xl mx-auto w-full">`
2. Round scoring panel must remain full-width — do NOT apply `max-w` inside the round-scoring conditional
3. Update layout comment

**Acceptance criteria:**
- [ ] Content does not stretch beyond readable width at 1920×1080
- [ ] Layout looks correct at 1280×800, 1366×768, and 1920×1080 (Playwright MCP visual checks)
- [ ] Round scoring panel remains full-width
- [ ] No horizontal scrollbar at any viewport
- [ ] `pnpm test:e2e:summary` shows "0 failed"

**Tests:**
- Visual verification at 3 viewports via Playwright MCP (dark mode)
- All existing E2E tests pass unmodified

**Risks:** Low — CSS only. If `max-w-3xl` is too narrow, adjust to `max-w-4xl` or `max-w-5xl`.

**Dependencies:** PR-B must be merged first.

**Recommended agent type:** `frontend-excellence:css-expert`

---

### PR-D — Fix skip link a11y target

**Linear issue:** BEA-??? "Fix skip link a11y target"
**Priority:** Normal | **Labels:** bug, accessibility, trivia

**Objective:** Fix pre-existing accessibility bug where skip link targets wrong element.

**Files touched:** `apps/trivia/src/app/play/page.tsx` — 2-line change

**Implementation:** Change skip link `href` from `#main` to `#main-content`.

**Acceptance criteria:**
- [ ] Skip link navigates to correct element
- [ ] Tab → Enter on skip link moves focus to main content

**Risks:** Minimal. 2-line fix.

**Dependencies:** None — independent, merge any time.

**Recommended agent type:** `frontend-excellence:react-specialist`

---

### PR-E — File SHOULD RELOCATE Linear issues

**Linear issue:** BEA-??? "File SHOULD RELOCATE Linear issues"
**Priority:** Low | **Labels:** chore, trivia

**No code changes.** Orchestrator creates 2 Linear follow-up issues:

1. "Relocate mid-game team rename to setup wizard or persistent team panel"
2. "Relocate direct score override (setTeamScore) to accessible UI"

**Dependencies:** None — file any time.

**Recommended agent type:** Orchestrator (no code agent needed)

---

## D.3.x Recommended Ticket Breakdown

### Linear Issues to Create (Prerequisite Step)

| # | Title | Priority | Blocked By |
|---|-------|----------|------------|
| 1 | Fix handleNextRound + Add ended-state center panel | Urgent | — |
| 2 | Remove right sidebar from presenter view | High | Issue 1 |
| 3 | Center panel layout constraints post-sidebar | Normal | Issue 2 |
| 4 | Fix skip link a11y target | Normal | — |
| 5 | File SHOULD RELOCATE Linear issues | Low | — |

**Team ID:** `4deac7af-714d-4231-8910-e97c8cb1cd34`

### Wave Mapping

| Wave | Issues | PRs | Parallel? |
|------|--------|-----|-----------|
| 1 | 1, 4, 5 | PR-A, PR-D, PR-E | Yes — all three |
| 2 | 2 | PR-B | No — depends on PR-A |
| 3 | 3 | PR-C | No — depends on PR-B |

---

## D.4 Agent / Task Orchestration Plan

### Prerequisite: Create Linear Issues

Before dispatching Wave 1, the orchestrator must:
1. Use `mcp__linear-server__save_issue` to create all 5 issues (team ID: `4deac7af-714d-4231-8910-e97c8cb1cd34`)
2. Record the 5 BEA-### IDs
3. Substitute real IDs into worktree names, branch names, and agent prompts

---

### Wave 1 — Parallel Dispatch (3 simultaneous agents/actions)

#### Agent 1: PR-A

**Agent type:** `frontend-excellence:react-specialist`
**Worktree:** `.worktrees/wt-BEA-{N1}-handleNextRound-fix`
**Branch:** `feat/BEA-{N1}-handleNextRound-fix`

**Context to provide:**
- Linear issue description and acceptance criteria (from D.3 PR-A above)
- Exact code changes from `docs/trivia-sidebar-impl/phase-2/iterator-2-ended-state-code.md`
- File paths: `apps/trivia/src/app/play/page.tsx`, `apps/trivia/src/stores/__tests__/game-store.test.ts`, `e2e/trivia/presenter.spec.ts`
- `apps/trivia/CLAUDE.md`
- Constraints: `--repo julianken/joolie-boolie`, no `--no-verify`, `pnpm test:e2e` must show "0 failed"

**Setup:**
```bash
git worktree add .worktrees/wt-BEA-{N1}-handleNextRound-fix -b feat/BEA-{N1}-handleNextRound-fix
cd .worktrees/wt-BEA-{N1}-handleNextRound-fix && ./scripts/setup-worktree-e2e.sh
```

#### Agent 2: PR-D

**Agent type:** `frontend-excellence:react-specialist`
**Worktree:** `.worktrees/wt-BEA-{N4}-skip-link-fix`
**Branch:** `fix/BEA-{N4}-skip-link-a11y`

**Context to provide:**
- Linear issue description and acceptance criteria (from D.3 PR-D above)
- File path: `apps/trivia/src/app/play/page.tsx`
- Same constraints

#### Orchestrator Action: PR-E

Create 2 Linear follow-up issues directly (no agent needed), then mark BEA-{N5} as Done.

---

### Wave 2 — After PR-A Merges

**Gate:** Verify Checkpoint 2 (D.5) before dispatching.

#### Agent 1: PR-B

**Agent type:** `frontend-excellence:react-specialist`
**Worktree:** `.worktrees/wt-BEA-{N2}-remove-sidebar`
**Branch:** `feat/BEA-{N2}-remove-sidebar`

**Context to provide:**
- Linear issue description and acceptance criteria (from D.3 PR-B above)
- Deletion manifest from `docs/trivia-sidebar-impl/phase-2/iterator-4-deletion-spec.md`
- CRITICAL warning: "Only delete `isScoringScene` (lines 174–179). Do NOT delete `isRoundScoringScene` (line 182)."
- Same constraints

---

### Wave 3 — After PR-B Merges

**Gate:** Verify Checkpoint 3 (D.5) before dispatching.

#### Agent 1: PR-C

**Agent type:** `frontend-excellence:css-expert`
**Worktree:** `.worktrees/wt-BEA-{N3}-layout-constraints`
**Branch:** `feat/BEA-{N3}-layout-constraints`

**Context to provide:**
- Linear issue description and acceptance criteria (from D.3 PR-C above)
- File path: `apps/trivia/src/app/play/page.tsx`
- Visual verification: Playwright MCP at 1280×800, 1366×768, 1920×1080 (dark mode)
- Same constraints

---

## D.5 Checkpoints Between Milestones

### Checkpoint 0: Before Wave 1 Dispatch

- [ ] All 5 Linear issues created; BEA-### IDs recorded
- [ ] `pnpm lint && pnpm typecheck` passes on `main`
- [ ] `pnpm test:run` baseline passes
- [ ] `pnpm test:e2e:trivia` baseline passes
- **Stop condition:** If baseline fails, fix before dispatching.

### Checkpoint 1: After PR-D Merges (independent)

- [ ] `pnpm typecheck` passes
- [ ] Manual keyboard test: Tab → Enter on skip link moves focus
- **Stop condition:** If skip link fix breaks focus flow, revert.

### Checkpoint 2: After PR-A Merges (gate for Wave 2)

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test:run` passes (+1 new unit test)
- [ ] `pnpm test:e2e:summary` shows "0 failed" (5 new Ended State tests pass)
- [ ] Manual: game ends → auto-show → dismiss → re-open button → re-opens
- [ ] Confirm `audienceScene` stays on `final_podium` (not `round_intro`)
- [ ] Between-rounds flow unchanged
- **Stop condition:** Any Ended State E2E failure or between-rounds regression.

### Checkpoint 3: After PR-B Merges (gate for Wave 3)

- [ ] `pnpm typecheck` passes with zero errors (no dangling references)
- [ ] `pnpm lint` passes (no unused imports)
- [ ] `pnpm test:run` passes
- [ ] `pnpm test:e2e:summary` shows "0 failed"
- [ ] Manual: no `<aside id="game-controls">` in DOM
- [ ] Manual: keyboard scoring (1 key) still works
- [ ] Manual: round scoring panel full-width and unaffected
- [ ] `QuickScoreGrid.tsx` file no longer exists
- **Stop condition:** TypeScript errors or keyboard scoring broken.

### Checkpoint 4: After PR-C Merges (final)

- [ ] `pnpm test:e2e:summary` shows "0 failed"
- [ ] Visual verification at 1280×800, 1366×768, 1920×1080
- [ ] No horizontal scrollbar
- [ ] Round scoring panel full-width
- **Stop condition:** Content unreadable — adjust `max-w` value.

---

## D.6 Branch and Merge Strategy

### Branch Naming

| PR | Branch |
|----|--------|
| PR-A | `feat/BEA-{N1}-handleNextRound-fix` |
| PR-B | `feat/BEA-{N2}-remove-sidebar` |
| PR-C | `feat/BEA-{N3}-layout-constraints` |
| PR-D | `fix/BEA-{N4}-skip-link-a11y` |
| PR-E | n/a (no branch) |

### Commit Convention

```
feat(trivia): description (BEA-{N})
fix(trivia): description (BEA-{N})
```

### PR Creation

```bash
gh pr create --repo julianken/joolie-boolie --base main
```

All PRs must use `.github/PULL_REQUEST_TEMPLATE.md`.

### Merge Order

```
PR-D  (any time — independent)
PR-E  (orchestrator action, Wave 1)
PR-A  (Wave 1 critical path → merge before Wave 2)
PR-B  (Wave 2 → merge before Wave 3)
PR-C  (Wave 3 — final)
```

### Pre-Merge Gates (every PR)

1. `pnpm test:run` — all tests pass
2. `pnpm lint` — zero errors
3. `pnpm typecheck` — zero errors
4. `pnpm test:e2e` then `pnpm test:e2e:summary` — "0 failed"
5. Pre-commit hooks pass — NEVER use `--no-verify`
6. PR body uses `.github/PULL_REQUEST_TEMPLATE.md`

### One Linear Issue = One Worktree = One PR

Hard constraint. No exceptions.

---

## Appendix: Key File References

| File | Relevance |
|------|-----------|
| `apps/trivia/src/app/play/page.tsx` | Primary target for PR-A, PR-B, PR-C, PR-D |
| `apps/trivia/src/components/presenter/QuickScoreGrid.tsx` | Deleted in PR-B |
| `apps/trivia/src/stores/__tests__/game-store.test.ts` | +1 unit test in PR-A |
| `e2e/trivia/presenter.spec.ts` | +5 E2E in PR-A, -5 E2E in PR-B |
| `apps/trivia/src/hooks/use-game-keyboard.ts` | Instance 1 of useQuickScore (line 100) — do NOT touch |
| `apps/trivia/src/components/presenter/RoundSummary.tsx` | No changes required |
| `apps/trivia/src/components/presenter/TeamManager.tsx` | Keep — used by WizardStepTeams.tsx |
| `apps/trivia/src/components/presenter/TeamScoreInput.tsx` | Keep — SHOULD RELOCATE |
| `apps/trivia/src/hooks/use-quick-score.ts` | Keep — Instance 1 alive |
| `docs/trivia-sidebar-impl/phase-2/iterator-2-ended-state-code.md` | Exact code for PR-A |
| `docs/trivia-sidebar-impl/phase-2/iterator-4-deletion-spec.md` | Deletion manifest for PR-B |
| `docs/trivia-sidebar-impl/phase-2/iterator-5-test-plan.md` | Full test matrix |
