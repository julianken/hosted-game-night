# Synthesis 3: Linear Issues, Agent Orchestration, and Branch Strategy

## Linear Issue Drafts

### Issue 1: BEA-??? "Fix handleNextRound + Add ended-state center panel"
- **Labels:** bug, enhancement, trivia
- **Priority:** Urgent
- **Description:** Split handleNextRound into guarded handlers. Add auto-show effect for ended state. Add re-open button in center panel. Prerequisite for sidebar removal.
- **Acceptance criteria:** (from Synthesis 1 PR-A)

### Issue 2: BEA-??? "Remove right sidebar from presenter view"
- **Labels:** enhancement, trivia
- **Priority:** High
- **Blocked by:** Issue 1
- **Description:** Delete sidebar JSX (lines 496-563), QuickScoreGrid.tsx, dead imports, Instance 2 useQuickScore, isScoringScene. Structurally eliminates dual-useQuickScore and divergent-reset bugs.
- **Acceptance criteria:** (from Synthesis 1 PR-B)

### Issue 3: BEA-??? "Center panel layout constraints post-sidebar"
- **Labels:** enhancement, trivia
- **Priority:** Normal
- **Blocked by:** Issue 2
- **Description:** Add max-w-3xl wrapper to prevent content stretching after sidebar removal. Visual verification required.
- **Acceptance criteria:** (from Synthesis 1 PR-C)

### Issue 4: BEA-??? "Fix skip link a11y target"
- **Labels:** bug, accessibility, trivia
- **Priority:** Normal
- **Description:** Skip link targets `#main` instead of `#main-content`. 2-line fix.

### Issue 5: BEA-??? "File SHOULD RELOCATE Linear issues"
- **Labels:** chore, trivia
- **Priority:** Low
- **Description:** Create follow-up issues for mid-game team rename and score override relocation.

## Agent Orchestration Plan

### Wave 1 (parallel dispatch — single message with 3 Task calls)

| Work Unit | Agent Type | Worktree | Branch |
|-----------|-----------|----------|--------|
| PR-A (Issues 1+2) | `frontend-excellence:react-specialist` | `wt-BEA-???-handleNextRound-fix` | `feat/BEA-???-handleNextRound-fix` |
| PR-D (Issue 4) | `frontend-excellence:react-specialist` | `wt-BEA-???-skip-link-fix` | `fix/BEA-???-skip-link-a11y` |
| PR-E (Issue 5) | n/a (orchestrator does directly) | n/a | n/a |

**Rationale:** PR-A is on the critical path, so start immediately. PR-D is independent and tiny. PR-E is just Linear issue creation, no code needed.

### Wave 2 (after PR-A merges)

| Work Unit | Agent Type | Worktree | Branch |
|-----------|-----------|----------|--------|
| PR-B (Issue 2) | `frontend-excellence:react-specialist` | `wt-BEA-???-remove-sidebar` | `feat/BEA-???-remove-sidebar` |

**Rationale:** PR-B depends on PR-A. Cannot parallelize.

### Wave 3 (after PR-B merges)

| Work Unit | Agent Type | Worktree | Branch |
|-----------|-----------|----------|--------|
| PR-C (Issue 3) | `frontend-excellence:css-expert` | `wt-BEA-???-layout-constraints` | `feat/BEA-???-layout-constraints` |

**Rationale:** PR-C depends on PR-B. Visual verification requires actual post-deletion layout.

## Branch and Merge Strategy

- **Base:** `main`
- **Branch naming:** `feat/BEA-???-slug` or `fix/BEA-???-slug`
- **Commit convention:** `feat(trivia): description (BEA-###)` or `fix(trivia): description (BEA-###)`
- **PR creation:** `gh pr create --repo julianken/joolie-boolie`
- **Merge order:** PR-D (any time) → PR-A → PR-B → PR-C
- **Each PR:** Must pass `pnpm test:e2e` with "0 failed" before merge
- **No `--no-verify`** on any commit

## Context Per Agent

Each implementer agent receives ONLY:
1. The Linear issue description + acceptance criteria
2. The specific code changes from the relevant iterator artifact (iterator-2 for PR-A, iterator-4 for PR-B)
3. File paths to read (not file contents)
4. The app's CLAUDE.md

Do NOT send full phase artifacts or context packets to implementer agents.
