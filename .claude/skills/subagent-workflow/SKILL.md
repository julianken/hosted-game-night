---
name: subagent-workflow
description: MANDATORY for all multi-step tasks - parallel task execution with sequential per-task workflow (implementer → spec review → quality review) with Linear as source of truth
---

# 🚨 CRITICAL: Subagent-Driven Development Workflow 🚨

**THIS IS NOT OPTIONAL. THIS IS THE CORE WORKFLOW.**

## When to Use (ALWAYS for multi-step work)

✅ **ANY task with implementation plan**
✅ **ANY task with multiple steps**
✅ **ANY coding work beyond trivial single-line fixes**

## When NOT to Use

❌ Single-line typo fixes
❌ Pure research tasks (no code changes)
❌ Reading files to answer questions

---

# The Complete Workflow

## Overview: Parallelization at the Linear Issue Level

```
PARALLEL LINEAR ISSUES (work on multiple issues at once)
├─ BEA-330 ───┬─ Step 1: Implementer (entire issue)
│             ├─ Step 2: Spec Reviewer (1 PR)
│             └─ Step 3: Quality Reviewer (1 PR)
│
├─ BEA-331 ───┬─ Step 1: Implementer (entire issue)
│             ├─ Step 2: Spec Reviewer (1 PR)
│             └─ Step 3: Quality Reviewer (1 PR)
│
└─ BEA-332 ───┬─ Step 1: Implementer (entire issue)
              ├─ Step 2: Spec Reviewer (1 PR)
              └─ Step 3: Quality Reviewer (1 PR)

SEQUENTIAL PER-ISSUE (within each Linear issue)
Each Linear issue goes through 3 steps IN ORDER
One worktree, one PR per issue
```

**Key Principle:** Linear issues run in parallel, steps within each issue run sequentially.

---

# Step 0: GET WORK FROM LINEAR

**🚨 MANDATORY FIRST STEP - Do NOT skip this. 🚨**

Before starting ANY implementation work, you MUST query Linear for the issue you're working on.

## Query Linear for Work

1. **List issues in "Todo" or "Backlog"** state:
```
mcp__linear-server__list_issues
```

2. **Filter for issues that are NOT blocked** (check dependencies)

3. **Read FULL issue details** for selected issue:
```
mcp__linear-server__get_issue { id: "issue-id" }
```

**What to read:**
- Description (acceptance criteria, requirements)
- Comments (context, decisions, discussion)
- Linked PRs (read PR descriptions for patterns/context)
- Labels/priority
- Dependencies (blockedBy, blocks)
- Project (for broader context)

**ALSO read app-specific CLAUDE.md files for context:**
- `apps/bingo/CLAUDE.md` - 75-ball bingo, 29 patterns, keyboard shortcuts
- `apps/trivia/CLAUDE.md` - Team trivia, rounds, scoring, keyboard shortcuts
- `apps/platform-hub/CLAUDE.md` - Auth, game selector, dashboard
- `CLAUDE.md` (root) - Project-wide patterns, E2E testing requirements

These files contain critical patterns that MUST be followed.

## If You Can't Access Linear

❌ **STOP immediately**
❌ **Do NOT make up fake issue IDs**
❌ **Do NOT proceed without Linear context**

Ask user to:
- Configure Linear MCP server
- Provide specific Linear issue ID (BEA-###)
- Confirm which issue to work on

## Update Linear Status: Backlog → Todo

Once you've selected an issue, move it to "Todo":

```
mcp__linear-server__update_issue {
  id: "issue-id",
  state: "Todo"
}
```

**Comment format:**
```markdown
🤖 Agent queued this issue for implementation.

**Next steps:**
1. Create git worktrees for parallel tasks
2. Dispatch implementer agents
3. Begin execution
```

---

# Step 1: Identify Parallel Linear Issues

## Work at the Linear Issue Level

**CRITICAL:** Do NOT break a single Linear issue into multiple tasks/PRs.

**The unit of work is the LINEAR ISSUE:**
- ✅ One Linear issue = One worktree = One PR
- ✅ Implementer handles the ENTIRE issue in one worktree
- ✅ Spec reviewer reviews the ENTIRE issue implementation
- ✅ Quality reviewer reviews the ENTIRE issue code

**Parallelism happens across MULTIPLE LINEAR ISSUES:**
```
Linear Issue BEA-330 ──► Worktree 1 ──► PR #123
Linear Issue BEA-331 ──► Worktree 2 ──► PR #124
Linear Issue BEA-332 ──► Worktree 3 ──► PR #125
```

**NOT like this (WRONG):**
```
❌ Linear Issue BEA-330
   ├─ Task A ──► Worktree 1 ──► PR #123
   ├─ Task B ──► Worktree 2 ──► PR #124
   └─ Task C ──► Worktree 3 ──► PR #125
```

## Identify Independent Linear Issues

Look for LINEAR ISSUES that:
- ✅ Modify different files/areas of codebase
- ✅ Have no dependencies on each other
- ✅ Can be implemented independently
- ✅ Can be reviewed and merged separately

**Example:**
```
✅ GOOD (parallel issues):
- BEA-330: Add login form UI
- BEA-331: Fix trivia scoring bug
- BEA-332: Update theme colors

Each is a separate Linear issue, gets own worktree, own PR.
```

**Example:**
```
❌ BAD (don't split one issue):
Linear Issue BEA-330: "Add user authentication"
- Don't split into: login form, OAuth callback, session middleware
- Implementer does ALL of BEA-330 in one worktree, one PR
```

## Create Task List

Use `TaskCreate` to track each LINEAR ISSUE:

```javascript
TaskCreate({
  subject: "BEA-330: Add login form UI",
  description: "Implement complete login form per Linear issue BEA-330",
  activeForm: "Implementing BEA-330"
})

TaskCreate({
  subject: "BEA-331: Fix trivia scoring bug",
  description: "Fix scoring calculation per Linear issue BEA-331",
  activeForm: "Implementing BEA-331"
})
```

---

# Step 2: Create Git Worktrees (Isolation)

**🚨 MANDATORY: One worktree per Linear issue**

Use the `Skill(superpowers:using-git-worktrees)` skill to create isolated workspaces.

## Why Worktrees?

- **Isolation:** Each issue implementation works in separate directory
- **No conflicts:** No file contention between parallel issues
- **Safety:** Changes don't interfere with each other
- **Rollback:** Easy to discard failed branches

## Worktree Naming Convention

```
../wt-<ISSUE-KEY>-<brief-description>

Examples:
../wt-BEA-330-login-form
../wt-BEA-331-trivia-scoring-fix
../wt-BEA-332-theme-colors
```

## Create Worktrees

For each independent LINEAR ISSUE, create a worktree AND set up E2E port isolation:

```bash
# Create worktree for BEA-330
git worktree add ../wt-BEA-330-login-form -b feat/BEA-330-login-form

# IMMEDIATELY set up E2E port isolation
cd ../wt-BEA-330-login-form
./scripts/setup-worktree-e2e.sh
cd -

# Create worktree for BEA-331
git worktree add ../wt-BEA-331-trivia-fix -b fix/BEA-331-trivia-scoring

# Set up E2E port isolation
cd ../wt-BEA-331-trivia-fix
./scripts/setup-worktree-e2e.sh
cd -

# Create worktree for BEA-332
git worktree add ../wt-BEA-332-theme-colors -b feat/BEA-332-theme-colors

# Set up E2E port isolation
cd ../wt-BEA-332-theme-colors
./scripts/setup-worktree-e2e.sh
cd -
```

**CRITICAL:** Run `./scripts/setup-worktree-e2e.sh` in EACH worktree to prevent port conflicts.

**Verification:**
```bash
git worktree list
# Should show one worktree per Linear issue
```

---

# Step 3: Dispatch Implementer Agents

**One agent per Linear issue, each in its own worktree.**

## Update Linear Status: Todo → In Progress

Before dispatching agents, update EACH Linear issue:

```
mcp__linear-server__update_issue {
  id: "BEA-330-id",
  state: "In Progress"
}

mcp__linear-server__update_issue {
  id: "BEA-331-id",
  state: "In Progress"
}
```

**Comment format (per issue):**
```markdown
🤖 Starting implementation.

**Working directory:** `wt-BEA-330-login-form`
**Implementer agent:** Dispatched

**Linear Status:** Todo → In Progress
```

## Dispatch Pattern

Use `Task` tool to spawn implementer agents in parallel:

```javascript
// Dispatch all implementers in SINGLE message (parallel execution)
// One implementer per Linear issue

Task({
  subagent_type: "general-purpose",
  name: "Implementer: BEA-330",
  description: "Implement BEA-330: Add login form",
  prompt: `
    You are the IMPLEMENTER for Linear issue BEA-330.

    **Working directory:** ../wt-BEA-330-login-form

    **Linear Issue:** BEA-330 "Add login form UI"

    **Your responsibilities:**
    1. Read Linear issue BEA-330 for FULL context (description, comments, linked PRs)
    2. Read app-specific CLAUDE.md for patterns (apps/bingo/CLAUDE.md, apps/trivia/CLAUDE.md, etc.)
    3. Implement the ENTIRE issue in this worktree
    4. Write tests for all functionality
    5. **RUN E2E TESTS LOCALLY** (MANDATORY - GitHub Actions disabled):
       ```bash
       # WORKTREE SETUP (run once per worktree) - MANDATORY
       ./scripts/setup-worktree-e2e.sh

       # Start servers with isolated ports
       ./start-e2e-servers.sh
       # OR: source .env.e2e && pnpm dev

       # Run E2E tests (Playwright auto-detects ports)
       pnpm test:e2e e2e/<feature>.spec.ts

       # Run FULL E2E suite before PR
       pnpm test:e2e
       ```
       **CRITICAL:** In a worktree, you MUST run `./scripts/setup-worktree-e2e.sh` first.
       This prevents port conflicts with other worktrees and the main repo.
       See `docs/E2E_TESTING_GUIDE.md` section "Parallel Task Execution with Port Isolation".

       **BLOCKING:** DO NOT create PR if ANY E2E tests fail. Fix failures first.
    6. **CLEANUP DEBUG ARTIFACTS**:
       - Remove any debug-*.spec.ts files you created
       - Remove any *.bak files
       - Remove any console.log debugging
       - Run: `git status` and verify no unintended files
    7. Commit changes with Linear reference: feat(auth): add login form (BEA-330)
    8. Self-review your code
    9. Push branch and create draft PR (one PR for entire issue)
       - Use PR template at .github/PULL_REQUEST_TEMPLATE.md
       - **CHECK the E2E test checkbox** ONLY if tests actually pass
    10. Update Linear issue with comment including E2E test results
    11. Mark task status as completed

    **Commit message format:**
    feat(scope): description (BEA-330)

    **CRITICAL:**
    - This is ONE PR for the ENTIRE Linear issue
    - Do NOT split into multiple PRs
    - Handle ALL acceptance criteria in BEA-330
    - E2E tests MUST pass before marking complete
  `
})

Task({
  subagent_type: "general-purpose",
  name: "Implementer: BEA-331",
  description: "Implement BEA-331: Fix trivia scoring",
  prompt: `
    You are the IMPLEMENTER for Linear issue BEA-331.

    **Working directory:** ../wt-BEA-331-trivia-fix

    **Linear Issue:** BEA-331 "Fix trivia scoring bug"

    [Similar responsibilities as above, but for BEA-331]
  `
})
```

## Implementer Responsibilities

Each implementer MUST:

1. ✅ **Read Linear issue** - Full context including comments/PRs, dependencies
2. ✅ **Implement ENTIRE issue** - All acceptance criteria in Linear issue
3. ✅ **Write tests** - Unit tests with >80% coverage
4. ✅ **Run E2E tests** - See CLAUDE.md "E2E Testing" section for commands - MUST pass
5. ✅ **Commit with Linear reference** - `feat(scope): description (BEA-###)`
6. ✅ **Self-review code** - Check for issues before PR
7. ✅ **Create ONE draft PR** - Entire issue in one PR, use PR template
8. ✅ **Update Linear issue** - Comment when implementation complete
9. ✅ **Update task status** - Mark as completed when done

## Pre-PR Gate (BLOCKING)

Before creating a PR, the implementer MUST verify:

```bash
# 1. All tests pass
pnpm test:run
pnpm test:e2e

# 2. No lint errors
pnpm lint

# 3. Types check
pnpm typecheck

# 4. No debug artifacts
git status --porcelain | grep -E "debug-|\.bak$" && echo "FAIL: Debug artifacts found" && exit 1

# 5. Verify port isolation (for worktrees only)
if [ -f .git ]; then
  # .git is a file = worktree (not a directory = main repo)
  if [ ! -f .env.e2e ]; then
    echo "FAIL: Worktree detected but .env.e2e missing"
    echo "Run: ./scripts/setup-worktree-e2e.sh"
    exit 1
  fi
  echo "✅ Port isolation configured (.env.e2e exists)"
fi

# 6. E2E tests pass - MANDATORY TWO-STEP VERIFICATION
pnpm test:e2e                # Step 1: Run tests (generates JSON)
pnpm test:e2e:summary        # Step 2: View results - MUST show "0 failed"
```

**CRITICAL:** If `pnpm test:e2e:summary` shows ANY failures, DO NOT PROCEED.

**If ANY check fails:**
1. DO NOT create PR
2. Fix the issues first
3. Re-run all checks
4. Only proceed when ALL pass

**Evidence requirement:** Include ACTUAL test output in Linear comment:
```markdown
🤖 Implementation complete.

**Pre-PR Verification:**
- ✅ `pnpm test:run` - 156 tests passed
- ✅ `pnpm lint` - No errors
- ✅ `pnpm typecheck` - No errors
- ✅ `pnpm test:e2e:summary` output:
  ```
  Test Results Summary:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    0 failed       ← MUST BE ZERO
    4 skipped
    334 passed
    338 total
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ```
- ✅ `git status --porcelain` - No debug artifacts

Ready for spec review.
```

**IMPORTANT:** Copy-paste ACTUAL `pnpm test:e2e:summary` output, not placeholders.


## Monitoring Progress

While agents work, periodically check:

```bash
# Check task list
TaskList

# Check worktree status
git worktree list

# Check Linear issue comments
mcp__linear-server__get_issue { id: "issue-id" }
```

---

# Step 4: Review Stage - Spec Compliance

**🚨 MANDATORY: Do NOT skip spec review**

Once ALL implementers complete, dispatch spec reviewer agents.

## Update Linear: Comment on Review Start

For EACH Linear issue entering review:

```
mcp__linear-server__create_comment {
  issueId: "BEA-330-id",
  body: `
🔍 **Spec Compliance Review Starting**

Implementer completed. Now reviewing against acceptance criteria.

**PR:** #123
  `
}
```

## Dispatch Spec Reviewers

Use `Task` tool to spawn reviewer agents in parallel (one per Linear issue):

```javascript
// One spec reviewer per Linear issue/PR

Task({
  subagent_type: "general-purpose",
  name: "Spec Reviewer: BEA-330",
  description: "Review BEA-330 against spec",
  prompt: `
    You are the SPEC COMPLIANCE REVIEWER for Linear issue BEA-330.

    **Your ONLY job:** Verify implementation matches Linear issue requirements

    **Linear Issue:** BEA-330 "Add login form UI"
    **PR to review:** PR #123
    **Working directory:** ../wt-BEA-330-login-form

    **Review checklist:**
    1. Read Linear issue BEA-330 acceptance criteria
    2. Review PR #123 diff and code
    3. Verify EACH acceptance criterion is met
    4. Check for missing features
    5. Verify tests cover acceptance criteria
    6. Verify E2E tests pass (see CLAUDE.md "E2E Testing" section)

    **Approval criteria:**
    - ✅ ALL acceptance criteria from BEA-330 implemented
    - ✅ Tests validate acceptance criteria
    - ✅ E2E tests pass for the feature
    - ✅ No missing features from spec

    **If issues found:**
    1. Document SPECIFIC gaps vs. acceptance criteria
    2. Add review comments to PR #123
    3. Request implementer to fix in SAME worktree/PR
    4. Re-review after fixes

    **Output format:**
    - If APPROVED: "✅ SPEC COMPLIANT - BEA-330 acceptance criteria met"
    - If ISSUES: "❌ SPEC GAPS FOUND" + list of specific issues

    DO NOT review code quality, patterns, or style - that's the next step.
  `
})

Task({
  subagent_type: "general-purpose",
  name: "Spec Reviewer: BEA-331",
  description: "Review BEA-331 against spec",
  prompt: `[Similar for BEA-331]`
})

// ... one reviewer per Linear issue in parallel
```

## Spec Review Outcomes

### ✅ SPEC COMPLIANT

If reviewer approves, move to Step 5 (Quality Review).

**Update Linear (per issue):**
```
mcp__linear-server__create_comment {
  issueId: "BEA-330-id",
  body: "✅ **Spec Review PASSED**\n\nAll acceptance criteria verified. Proceeding to code quality review."
}
```

### ❌ SPEC GAPS FOUND

If reviewer finds issues:

1. **Document issues** in PR review comments
2. **Dispatch same implementer** to fix issues in SAME worktree/PR
3. **Wait for fixes** to complete
4. **Re-run spec reviewer** to verify fixes
5. **Repeat** until SPEC COMPLIANT

**DO NOT proceed to quality review until spec review passes.**

**CRITICAL:** Fixes happen in the SAME worktree/PR, not a new one.

---

# Step 5: Review Stage - Code Quality

**🚨 MANDATORY: Do NOT skip quality review**

Only after spec review PASSES, dispatch code quality reviewers.

## Update Linear: Comment on Quality Review Start

For EACH Linear issue entering quality review:

```
mcp__linear-server__create_comment {
  issueId: "BEA-330-id",
  body: `
🎨 **Code Quality Review Starting**

Spec compliance verified. Now reviewing code quality, patterns, and best practices.
  `
}
```

## Dispatch Quality Reviewers

One quality reviewer per Linear issue/PR:

```javascript
Task({
  subagent_type: "general-purpose",
  name: "Quality Reviewer: BEA-330",
  description: "Review BEA-330 code quality",
  prompt: `
    You are the CODE QUALITY REVIEWER for Linear issue BEA-330.

    **Your ONLY job:** Review code quality, patterns, and best practices

    **Linear Issue:** BEA-330 "Add login form UI"
    **PR to review:** PR #123
    **Working directory:** ../wt-BEA-330-login-form

    **Review checklist:**
    1. Code follows project conventions
    2. No security vulnerabilities (XSS, injection, etc.)
    3. Proper error handling
    4. Performance considerations
    5. Accessibility (WCAG 2.1 AA, 44x44px touch targets)
    6. Test quality and coverage
    7. **E2E tests pass** - Run: `pnpm test:e2e`
    8. Documentation/comments where needed
    9. No code duplication
    10. **NO DEBUG ARTIFACTS**:
        - No debug-*.spec.ts files
        - No *.bak files
        - No console.log debugging left in code
        - No TODO comments for completed work
        - Run: `git status --porcelain` and verify clean

    **Approval criteria:**
    - ✅ Code follows established patterns
    - ✅ No security issues
    - ✅ Proper error handling
    - ✅ Tests are thorough
    - ✅ E2E tests pass
    - ✅ No major tech debt

    **If issues found:**
    1. Document SPECIFIC quality issues
    2. Add review comments to PR #123
    3. Request implementer to fix in SAME worktree/PR
    4. Re-review after fixes

    **Output format:**
    - If APPROVED: "✅ QUALITY APPROVED - BEA-330 code meets standards"
    - If ISSUES: "❌ QUALITY ISSUES FOUND" + list of specific issues

    Focus on HIGH-IMPACT issues only. Don't nitpick.
  `
})

Task({
  subagent_type: "general-purpose",
  name: "Quality Reviewer: BEA-331",
  description: "Review BEA-331 code quality",
  prompt: `[Similar for BEA-331]`
})
```

## Quality Review Outcomes

### ✅ QUALITY APPROVED

If reviewer approves, move to Step 6 (Merge).

**Update Linear (per issue):**
```
mcp__linear-server__create_comment {
  issueId: "BEA-330-id",
  body: "✅ **Quality Review PASSED**\n\nCode quality verified. Ready to merge."
}
```

### ❌ QUALITY ISSUES FOUND

If reviewer finds issues:

1. **Document issues** in PR review comments
2. **Dispatch same implementer** to fix issues in SAME worktree/PR
3. **Wait for fixes** to complete
4. **Re-run quality reviewer** to verify fixes
5. **Repeat** until QUALITY APPROVED

**DO NOT merge until quality review passes.**

**CRITICAL:** Fixes happen in the SAME worktree/PR, not a new one.

---

# Step 6: Merge and Integrate

Once BOTH reviews pass for each Linear issue, merge PRs.

## Merge Order

Merge PRs in dependency order:

1. Foundation changes first (shared utilities, types)
2. Core features next (business logic)
3. UI/UX changes last (components, pages)

**If issues have no dependencies, merge in parallel.**

## Update Linear Status: In Progress → In Review

Before merging, update EACH Linear issue:

```
mcp__linear-server__update_issue {
  id: "BEA-330-id",
  state: "In Review"
}
```

**Comment format (per issue):**
```markdown
🎉 **All Reviews Passed - Ready to Merge**

**PR:** #123
**Reviews:**
- ✅ Spec Compliance
- ✅ Code Quality

**Linear Status:** In Progress → In Review

Merging PR...
```

## Pre-Merge Verification

Before merging, verify PR template is complete:

1. **Check PR Testing section:**
   - ALL checkboxes should be `[x]` checked
   - Especially: `[x] pnpm test:e2e` (E2E tests)

2. **If E2E checkbox is unchecked:**
   - DO NOT merge
   - Dispatch implementer to run E2E tests
   - Update PR with passing results
   - Only merge when checkbox is checked with evidence

3. **Verify Five-Level Explanation:**
   - All 5 levels completed (not just placeholders)
   - Technical levels (4-5) have implementation details

**Merge blockers:**
- ❌ Unchecked E2E test checkbox
- ❌ Missing Five-Level Explanation
- ❌ "N/A" in Testing section without justification

## Merge PRs

Use GitHub MCP to merge (one PR per Linear issue):

```
mcp__plugin_github_github__merge_pull_request {
  owner: "owner",
  repo: "repo",
  pullNumber: 123,
  merge_method: "squash"
}
```

## Update Linear Status: In Review → Done

After PR merged, update Linear issue:

```
mcp__linear-server__update_issue {
  id: "BEA-330-id",
  state: "Done"
}
```

**Comment format (per issue):**
```markdown
✅ **Issue Completed**

**PR merged:** #123
**Linear Status:** In Review → Done
**Commit:** feat(auth): add login form (BEA-330)
```

## Cleanup Worktrees

After merging, clean up worktree for that issue:

```bash
git worktree remove ../wt-BEA-330-login-form
```

**If multiple Linear issues in parallel:**
```bash
git worktree remove ../wt-BEA-330-login-form
git worktree remove ../wt-BEA-331-trivia-fix
git worktree remove ../wt-BEA-332-theme-colors
```

---

# 📊 Linear Status Workflow Summary

Issues move through these states as work progresses:

```
Backlog → Todo → In Progress → In Review → Done
```

**Status transitions:**

| Transition | When | Who Updates |
|------------|------|-------------|
| **Backlog → Todo** | Work is queued for execution | Lead agent (Step 0) |
| **Todo → In Progress** | Implementers are dispatched | Lead agent (Step 3) |
| **In Progress → In Review** | All reviews passed, ready to merge | Lead agent (Step 6) |
| **In Review → Done** | All PRs merged | Lead agent (Step 6) |

**Comment on each transition** to provide audit trail.

---

# ❌ NEVER DO THESE THINGS ❌

**YOU WILL VIOLATE THIS PROCESS IF YOU:**

1. ❌ Skip Linear query (Step 0)
2. ❌ Make up fake Linear issue IDs
3. ❌ Proceed without reading full issue context
4. ❌ **Split one Linear issue into multiple PRs**
5. ❌ **Create multiple worktrees for one Linear issue**
6. ❌ Skip spec compliance review
7. ❌ Skip code quality review
8. ❌ Mark task complete without both reviews passing
9. ❌ Move to next issue before current issue reviews complete
10. ❌ Try to fix issues yourself instead of dispatching implementer
11. ❌ Accept "close enough" on spec compliance
12. ❌ Proceed with unresolved review issues
13. ❌ Review code quality BEFORE spec compliance passes
14. ❌ Dispatch parallel agents without creating worktrees
15. ❌ Forget to update Linear status at transitions
16. ❌ Skip E2E tests before marking implementation complete
17. ❌ Approve reviews without verifying E2E tests pass
18. ❌ Create PR with unchecked E2E test checkbox in template
19. ❌ Leave debug-*.spec.ts files in codebase
20. ❌ Leave *.bak files in codebase
21. ❌ Skip reading app-specific CLAUDE.md files
22. ❌ Reference "see CLAUDE.md" without embedding the actual commands
23. ❌ Merge without verifying ALL PR template checkboxes are checked

---

# 🚩 Red Flags You're Violating This

If you think ANY of these thoughts, STOP:

- "I'll split this Linear issue into 3 PRs" → ❌ NO, one issue = one PR
- "I'll create separate worktrees for each part of BEA-330" → ❌ NO, one worktree per issue
- "I'll just quickly fix this myself" → ❌ NO, dispatch implementer
- "The code looks good, I'll skip the review" → ❌ NO, reviews are mandatory
- "Spec compliance passed, that's good enough" → ❌ NO, quality review is also required
- "I'll review this while moving to next issue" → ❌ NO, complete current issue first
- "This is a small change, doesn't need reviews" → ❌ NO, ALL changes need reviews
- "I don't need to check Linear, I know what to do" → ❌ NO, Linear is source of truth
- "I can work in the main directory, no need for worktrees" → ❌ NO, isolation is mandatory
- "Let me just update code without dispatching agent" → ❌ NO, agents do implementation
- "This issue has 3 features, I'll make 3 PRs" → ❌ NO, all features in one PR for the issue
- "E2E tests are slow, I'll skip them" → ❌ NO, E2E tests are mandatory (no GitHub Actions)
- "Unit tests pass, that's good enough" → ❌ NO, E2E tests validate the full system
- "I'll leave this debug file, someone else will clean it up" → ❌ NO, clean up YOUR artifacts
- "The PR checkbox says E2E but I didn't run them" → ❌ NO, only check boxes for tests you actually ran
- "I'll fix the E2E tests in a follow-up PR" → ❌ NO, fix them BEFORE this PR merges
- "This is just a test file change, doesn't need E2E" → ❌ NO, E2E tests validate test files too

---

# Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Step 0: GET WORK FROM LINEAR (MANDATORY)                    │
│ - Query Linear for issue                                    │
│ - Read FULL context (description, comments, PRs)            │
│ - Update status: Backlog → Todo                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Plan Parallel Work                                  │
│ - Break issue into independent tasks                        │
│ - Create task list (TaskCreate)                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Create Git Worktrees                                │
│ - One worktree per independent task                         │
│ - Naming: ../wt-BEA-###-task-slug                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Dispatch Implementer Agents (PARALLEL)              │
│ - Update Linear: Todo → In Progress                         │
│ - Spawn all implementers in SINGLE message                  │
│ - Each agent: implement, test, commit, self-review, PR      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Dispatch Spec Reviewers (PARALLEL)                  │
│ - Verify against Linear acceptance criteria                 │
│ - If ❌ issues: implementer fixes → re-review               │
│ - Must get ✅ SPEC COMPLIANT before proceeding              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Dispatch Quality Reviewers (PARALLEL)               │
│ - Review code quality, patterns, security                   │
│ - If ❌ issues: implementer fixes → re-review               │
│ - Must get ✅ QUALITY APPROVED before proceeding            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Merge and Integrate                                 │
│ - Update Linear: In Progress → In Review                    │
│ - Merge PRs in dependency order                             │
│ - Update Linear: In Review → Done                           │
│ - Cleanup worktrees                                         │
└─────────────────────────────────────────────────────────────┘
```

---

# Why This Matters

- **Quality:** Two-stage review catches issues early
- **Consistency:** Ensures spec compliance and code quality
- **Efficiency:** Fixes are cheaper when caught in review
- **Context:** Fresh subagents prevent context pollution
- **Discipline:** Prevents rushed, incomplete work
- **Traceability:** Linear integration provides full audit trail
- **Isolation:** Worktrees prevent conflicts and enable true parallelism
- **Speed:** Parallel execution is faster than sequential

---

# Examples

## Example 1: Multiple Independent Linear Issues

**Scenario:** You have 3 independent Linear issues ready to implement.

**Linear Issues:**
- BEA-330: "Add login form UI"
- BEA-331: "Fix trivia scoring bug"
- BEA-332: "Update theme colors"

**Execution:**
```
Step 0: Query Linear for all 3 issues, read full context
Step 1: Identify 3 independent Linear issues, create task list
Step 2: Create 3 worktrees (wt-BEA-330-login, wt-BEA-331-trivia, wt-BEA-332-theme)
Step 3: Dispatch 3 implementers in parallel (one message, 3 Task calls)
        - Each implements ENTIRE Linear issue in one worktree, one PR
Step 4: Dispatch 3 spec reviewers in parallel after implementers complete
        - Each reviews one PR against one Linear issue
Step 5: Dispatch 3 quality reviewers in parallel after spec reviews pass
        - Each reviews one PR
Step 6: Merge 3 PRs, update 3 Linear issues to Done, cleanup 3 worktrees
```

**Result:** 3 Linear issues → 3 worktrees → 3 PRs

## Example 2: Single Linear Issue (No Parallelism)

**Scenario:** You have one Linear issue to implement.

**Linear Issue:** BEA-330 "Add user authentication system"

**Acceptance Criteria in BEA-330:**
- Login form UI
- OAuth callback handler
- Session middleware
- Tests for all components

**Execution:**
```
Step 0: Query Linear for BEA-330, read full context
Step 1: Identify 1 Linear issue (no parallelism needed)
Step 2: Create 1 worktree (wt-BEA-330-auth-system)
Step 3: Dispatch 1 implementer
        - Implements ALL acceptance criteria in BEA-330
        - Creates ONE PR with login form + OAuth + middleware + tests
Step 4: Dispatch 1 spec reviewer
        - Reviews entire PR against BEA-330 acceptance criteria
Step 5: Dispatch 1 quality reviewer
        - Reviews entire PR for code quality
Step 6: Merge 1 PR, update BEA-330 to Done, cleanup 1 worktree
```

**Result:** 1 Linear issue → 1 worktree → 1 PR

## Example 3: Linear Issues with Dependencies

**Scenario:** Two Linear issues where BEA-331 depends on BEA-330.

**Linear Issues:**
- BEA-330: "Create payment API client" (foundation)
- BEA-331: "Add payment form UI" (depends on BEA-330)

**Execution:**
```
Step 0: Query Linear for BEA-330
Step 1: Identify BEA-330 has no dependencies
Step 2: Create 1 worktree for BEA-330
Step 3: Dispatch implementer for BEA-330
Step 4: Spec review BEA-330
Step 5: Quality review BEA-330
Step 6: Merge BEA-330 PR, update BEA-330 to Done, cleanup worktree

THEN repeat Steps 0-6 for BEA-331

Update both Linear issues to Done after completion
```

**Result:** 2 Linear issues → 2 worktrees (sequential) → 2 PRs (sequential)

---

# Troubleshooting

## "I can't access Linear"

**Solution:**
1. Check if Linear MCP server is configured: `/mcp`
2. Authenticate if needed
3. If still failing, ask user for issue ID
4. NEVER make up fake issue IDs

## "Implementer agent failed"

**Solution:**
1. Read agent output to understand failure
2. Check worktree status: `git worktree list`
3. Fix blocking issue (dependencies, environment, etc.)
4. Re-dispatch implementer with fixed context

## "Spec reviewer keeps finding issues"

**Solution:**
1. Verify acceptance criteria are clear in Linear issue
2. Ensure implementer read full Linear context
3. Check if acceptance criteria changed mid-implementation
4. If criteria unclear, ask user for clarification
5. Update Linear issue with clarified criteria

## "Quality reviewer too strict"

**Solution:**
1. Focus on HIGH-IMPACT issues only
2. Ignore nitpicks and style preferences
3. Security, performance, accessibility are non-negotiable
4. Code style is negotiable if consistent with codebase

## "Worktree conflicts during merge"

**Solution:**
1. This shouldn't happen if tasks were truly independent
2. Identify conflicting files
3. Determine which task takes precedence
4. Manually resolve conflicts
5. Re-run affected reviews
6. Consider: were tasks actually independent?

---

# Summary Checklist

Use this checklist for every Linear issue:

- [ ] Step 0: Query Linear for issue(s), read full context
- [ ] Step 0: Update Linear status: Backlog → Todo
- [ ] Step 1: Identify independent Linear issues, create task list
- [ ] Step 2: Create git worktrees (one per Linear issue)
- [ ] Step 3: Update Linear issues: Todo → In Progress
- [ ] Step 3: Dispatch implementer agents (all in one message, one per issue)
- [ ] Step 3: Each implementer handles ENTIRE issue, creates ONE PR
- [ ] Step 3: Run E2E tests before marking implementation complete
- [ ] Step 3: Monitor implementer progress
- [ ] Step 4: Dispatch spec reviewer agents (all in one message, one per issue/PR)
- [ ] Step 4: Verify E2E tests pass during spec review
- [ ] Step 4: Verify all spec reviews pass (re-review if needed)
- [ ] Step 5: Dispatch quality reviewer agents (all in one message, one per issue/PR)
- [ ] Step 5: Run full E2E suite during quality review
- [ ] Step 5: Verify all quality reviews pass (re-review if needed)
- [ ] Step 6: Update Linear issues: In Progress → In Review
- [ ] Step 6: Merge PRs in dependency order (one PR per issue)
- [ ] Step 6: Update Linear issues: In Review → Done
- [ ] Step 6: Cleanup worktrees (one per issue)

**If you skip ANY step, you're violating the workflow.**

**Remember:** One Linear issue = One worktree = One PR
