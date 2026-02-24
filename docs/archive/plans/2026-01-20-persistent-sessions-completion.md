# Persistent Sessions Completion - Multi-Agent Coordination Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete all remaining Persistent Sessions work (Phases 5-6) using coordinated Sonnet agents working in parallel worktrees with rolling PR reviews and merges.

**Architecture:** Executive coordinator dispatches background agents for parallel work, reviews PRs as they arrive, and merges approved PRs immediately. No waiting for phase completion.

**Tech Stack:** Turborepo monorepo, Next.js 16, React 19, Zustand, Supabase, Vitest, Playwright

---

## Current Status

**Completed (Phases 1-4)**: 24/28 tasks (86%)
- ✅ Phase 1: Foundation (session routes, HMAC tokens, migrations)
- ✅ Phase 2: Shared Components (modals, displays)
- ✅ Phase 3: Auto-Sync Hooks (useAutoSync, useSessionRecovery)
- ✅ Phase 4: Bingo Integration (full implementation)

**Remaining Work**: 12 tasks
- ⏳ Phase 5: Trivia Integration (5 tasks) - HIGH PRIORITY
- ❌ Phase 6: Polish & Testing (6 tasks) - MEDIUM PRIORITY
- 🐛 Cleanup: 2 bug fixes - LOW PRIORITY

---

## Coordination Strategy

**Executive Role (You):**
1. Analyze dependencies and determine parallelization opportunities
2. Dispatch background agents with specific task assignments
3. Monitor PR creation notifications
4. Dispatch code reviewer agents for each PR
5. Merge approved PRs immediately (don't wait for phase completion)
6. Coordinate conflict resolution if needed
7. Update GitHub issue status as work progresses

**Agent Workflow:**
```
Coordinator → Create Worktree → Dispatch Agent (background)
                                      ↓
                              Agent Works on Task
                                      ↓
                              Agent Creates PR
                                      ↓
Coordinator → Dispatch Reviewer Agent (background)
                                      ↓
                              Reviewer Runs Tests
                                      ↓
                              Reviewer Uses Playwright
                                      ↓
Coordinator → Review Approval → Merge PR → Close Issue → Cleanup Worktree
                                      ↓
                              Update Remaining Agents (if conflicts)
```

---

## Phase 5: Trivia Integration

### Tasks Overview

| Issue | Title | Complexity | Dependencies |
|-------|-------|------------|--------------|
| #52 | Create Trivia state serializer | MEDIUM | None (can start immediately) |
| #57 | Update Trivia presenter page | MEDIUM | Depends on #52 |
| #73 | Update Trivia display page | SMALL | Depends on #52 |
| #78 | Integrate auto-sync into Trivia store | SMALL | Depends on #52 |
| #79 | Test Trivia full flow | MEDIUM | Depends on #57, #73, #78 |

### Dependency Analysis

**COMPLETE - Analysis by agent a229aa0**

**Critical Path:** #52 → #57 → #79

**Dependency Graph:**
```
#52 (Serializer) - FOUNDATION TASK
  ├─→ #57 (Presenter + auto-sync)
  │     └─→ #79 (Testing)
  ├─→ #73 (Display)
  │     └─→ #79 (Testing)
  └─→ #78 (Auto-sync verification - done within #57)
        └─→ #79 (Testing)
```

**Key Finding:** Task #78 is NOT a separate implementation - it's verification that auto-sync is properly integrated in #57. The actual auto-sync code goes in the presenter page's `useAutoSync` call.

### Execution Strategy

**Wave 1 (Immediate Start):**
- Agent 1: Issue #52 (serializer) - BLOCKING TASK

**Wave 2 (After #52 merged):**
- Agent 2: Issue #57 (presenter page + auto-sync integration - includes work from #78)
- Agent 3: Issue #73 (display page)

**Wave 3 (After Wave 2 merged):**
- Agent 5: Issue #79 (end-to-end testing)

---

## Phase 6: Polish & Testing

### Tasks Overview

| Issue | Title | Complexity | Priority |
|-------|-------|------------|----------|
| #27 | Error handling and edge cases | MEDIUM | MEDIUM |
| #28 | Loading states and transitions | SMALL | MEDIUM |
| #30 | Accessibility review | SMALL | MEDIUM |
| #38 | Manual testing checklist | MEDIUM | HIGH |
| #47 | Update documentation | SMALL | MEDIUM |
| #56 | Add SESSION_TOKEN_SECRET to .env.example | SMALL | LOW |

### Dependency Analysis

**COMPLETE - Analysis by agent a79895f**

**Parallel Tasks (Phase 6A):**
- #27: Error handling (Medium complexity)
- #28: Loading states (Small complexity)
- #30: Accessibility review (Small complexity)
- #56: .env.example (Small complexity - completely independent)

**Sequential Tasks (Phase 6B):**
1. Complete #27, #28, #30
2. Then #38: Manual testing checklist (**HIGH PRIORITY** - 34 test scenarios)
3. Finally #47: Documentation

**Critical Finding:** #38 MUST wait for #27, #28, #30 to complete before testing can begin.

### Execution Strategy

**Preliminary (3 parallel agents):**
- Agent A: #27 + #28 (error handling + loading states)
- Agent B: #30 + #38 (accessibility + testing)
- Agent C: #47 + #56 (documentation + env)

---

## Cleanup Tasks

### Bug Fixes

| Issue | Title | Priority |
|-------|-------|----------|
| #98 | Fix userEvent + fake timers timeout issues | LOW |
| #99 | Fix PR #90: Update description and bump version | LOW |

**Execution:** Single agent after Phase 5-6 complete

---

## Worktree Management

### Directory Structure

All worktrees created in `.worktrees/` (project-local, gitignored)

```
.worktrees/
├── issue-52-trivia-serializer/
├── issue-57-trivia-presenter/
├── issue-73-trivia-display/
├── issue-78-trivia-autosync/
├── issue-79-trivia-testing/
├── issue-27-error-handling/
├── issue-28-loading-states/
├── issue-30-accessibility/
├── issue-38-testing-checklist/
├── issue-47-documentation/
└── issue-56-env-example/
```

### Worktree Creation Commands

**Template:**
```bash
git worktree add .worktrees/issue-<NUM>-<slug> -b feature/issue-<NUM>-<slug>
cd .worktrees/issue-<NUM>-<slug>
pnpm install
pnpm test:run  # Verify clean baseline
```

### Worktree Cleanup Commands

**After PR merged:**
```bash
git worktree remove .worktrees/issue-<NUM>-<slug>
git branch -d feature/issue-<NUM>-<slug>
```

---

## PR Review Process

### Review Agent Instructions

**For each PR, dispatch a code reviewer agent with:**

```markdown
Review PR #<NUM> for Issue #<ISSUE> using the superpowers:receiving-code-review skill.

**Review Checklist:**
1. Read all changed files
2. Verify code follows project conventions
3. Check for bugs, logic errors, security issues
4. Run full test suite: `pnpm test:run`
5. Run Playwright E2E tests: `pnpm test:e2e` (in relevant app directory)
6. Verify TypeScript compilation: `pnpm build`
7. Test manually in dev server if UI changes
8. Check PR uses default template (.github/PULL_REQUEST_TEMPLATE.md)

**Report:**
- List of issues found (if any)
- Test results (must be passing)
- Playwright results (must be passing)
- Build results (must succeed)
- Recommendation: APPROVE / REQUEST CHANGES
```

### Merge Criteria

**All must pass:**
- [ ] Code reviewer agent approves
- [ ] All tests passing (1194+ tests)
- [ ] TypeScript compiles with no errors
- [ ] Playwright E2E tests passing
- [ ] No merge conflicts
- [ ] PR uses default template

### Merge Commands

```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
gh issue close <ISSUE_NUMBER> --comment "Completed in PR #<PR_NUMBER>"
```

---

## Communication Protocol

### GitHub Issue Updates

**When agent starts work:**
```bash
gh issue comment <NUM> --body "🚀 Agent dispatched - working in worktree .worktrees/issue-<NUM>-<slug>"
```

**When PR created:**
```bash
gh issue comment <NUM> --body "📋 PR #<PR_NUM> created - dispatching code reviewer"
```

**When PR approved:**
```bash
gh issue comment <NUM> --body "✅ PR #<PR_NUM> approved - merging now"
```

**When issue complete:**
```bash
gh issue close <NUM> --comment "✅ Completed in PR #<PR_NUM> - merged to main"
```

---

## Conflict Resolution

### If merge creates conflicts in active worktrees:

1. **Identify affected worktrees** (check which files changed)
2. **Dispatch fact-finding agent** to analyze conflict scope
3. **Update affected worktrees:**
   ```bash
   cd .worktrees/issue-<NUM>-<slug>
   git fetch origin
   git rebase origin/main
   # Resolve conflicts if any
   pnpm test:run  # Verify still passing
   ```
4. **Update PR** if needed

---

## Progress Tracking

### Todo List Structure

```markdown
- [ ] Phase 5: Wave 1 (#52)
- [ ] Phase 5: Wave 2 (#57, #73, #78)
- [ ] Phase 5: Wave 3 (#79)
- [ ] Phase 6: Parallel execution (#27, #28, #30, #38, #47, #56)
- [ ] Cleanup: Bug fixes (#98, #99)
```

### GitHub Project Updates

Update project board after each merge:
```bash
gh issue list --label "persistent-sessions" --state open
```

---

## Critical Files Reference

### Trivia App Structure
- `apps/trivia/src/app/play/page.tsx` - Presenter page (needs update)
- `apps/trivia/src/app/display/page.tsx` - Display page (needs update)
- `apps/trivia/src/stores/triviaStore.ts` - Zustand store (needs auto-sync)
- `apps/trivia/src/lib/state/serializer.ts` - State serializer (needs creation)

### Bingo Reference (Working Implementation)
- `apps/bingo/src/app/play/page.tsx` - Example of auto-sync integration
- `apps/bingo/src/lib/state/serializer.ts` - Example serializer pattern

### Shared Packages
- `packages/sync/` - Auto-sync hooks (useAutoSync, useSessionRecovery)
- `packages/ui/` - Shared UI components
- `packages/theme/` - Design tokens

### Testing
- `.github/PULL_REQUEST_TEMPLATE.md` - REQUIRED for all PRs
- `apps/trivia/vitest.config.ts` - Test configuration
- `apps/trivia/playwright.config.ts` - E2E test configuration

---

## Success Criteria

**Phase 5 Complete:**
- [ ] All 5 Trivia integration tasks closed
- [ ] Epic #21 closed
- [ ] Trivia app has same persistence as Bingo
- [ ] All tests passing
- [ ] E2E Playwright tests confirm functionality

**Phase 6 Complete:**
- [ ] All 6 polish/testing tasks closed
- [ ] Epic #24 closed
- [ ] Error handling comprehensive
- [ ] Loading states smooth
- [ ] Accessibility verified
- [ ] Documentation updated

**Project Complete:**
- [ ] Epic #20 (Persistent Sessions) closed
- [ ] All 119 issues resolved
- [ ] Both apps (Bingo + Trivia) have persistent sessions
- [ ] No regressions in existing functionality
- [ ] 100% test coverage maintained

---

## Next Steps

1. **Wait for dependency analysis agents to complete** (a229aa0, a79895f)
2. **Update this plan** with detailed parallelization strategy
3. **Create all worktrees** for identified parallel tasks
4. **Dispatch first wave of implementation agents**
5. **Monitor PR pipeline** and coordinate reviews/merges
6. **Dispatch subsequent waves** as dependencies clear
7. **Complete cleanup tasks**
8. **Close parent epic #20**

---

_Plan created: 2026-01-20_
_Coordinator: Executive Claude Sonnet_
_Execution model: Parallel multi-agent with rolling PR review_
