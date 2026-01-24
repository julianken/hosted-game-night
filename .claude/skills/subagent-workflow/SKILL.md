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

## Overview: Two-Level Parallelization

```
LEVEL 1: PARALLEL TASKS (across tasks)
├─ Task A ────┬─ Step 1: Implementer
│             ├─ Step 2: Spec Reviewer
│             └─ Step 3: Quality Reviewer
│
├─ Task B ────┬─ Step 1: Implementer
│             ├─ Step 2: Spec Reviewer
│             └─ Step 3: Quality Reviewer
│
└─ Task C ────┬─ Step 1: Implementer
              ├─ Step 2: Spec Reviewer
              └─ Step 3: Quality Reviewer

LEVEL 2: SEQUENTIAL PER-TASK (within each task)
Each task goes through 3 steps IN ORDER
```

**Key Principle:** Tasks run in parallel, steps within each task run sequentially.

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

# Step 1: Plan Parallel Work

## Identify Independent Tasks

Review the Linear issue and break work into independent tasks that can run in parallel.

**Independent tasks have:**
- ✅ No shared file modifications
- ✅ No data dependencies
- ✅ Can be implemented separately
- ✅ Can be tested independently

**Example:**
```
Issue: "Add user authentication system"

Independent Tasks:
1. Implement login form UI
2. Create OAuth callback handler
3. Add session management middleware
4. Write authentication tests
```

## Create Task List

Use `TaskCreate` to track each independent task:

```javascript
TaskCreate({
  subject: "Implement login form UI",
  description: "Create login form component with email/password fields, validation, error handling",
  activeForm: "Implementing login form UI"
})
```

---

# Step 2: Create Git Worktrees (Isolation)

**🚨 MANDATORY: One worktree per parallel task**

Use the `Skill(superpowers:using-git-worktrees)` skill to create isolated workspaces.

## Why Worktrees?

- **Isolation:** Each agent works in separate directory
- **No conflicts:** No file contention between agents
- **Safety:** Changes don't interfere with each other
- **Rollback:** Easy to discard failed branches

## Worktree Naming Convention

```
../wt-<ISSUE-KEY>-<task-slug>

Examples:
../wt-BEA-330-login-form
../wt-BEA-330-oauth-callback
../wt-BEA-330-session-middleware
```

## Create Worktrees

For each independent task, create a worktree:

```bash
git worktree add ../wt-BEA-330-login-form -b feat/BEA-330-login-form
```

**Verification:**
```bash
git worktree list
# Should show all created worktrees
```

---

# Step 3: Dispatch Implementer Agents

**One agent per task, each in its own worktree.**

## Update Linear Status: Todo → In Progress

Before dispatching agents:

```
mcp__linear-server__update_issue {
  id: "issue-id",
  state: "In Progress"
}
```

**Comment format:**
```markdown
🤖 Starting implementation with N parallel agents.

**Tasks:**
1. Task A - Agent dispatched to `wt-BEA-###-task-a`
2. Task B - Agent dispatched to `wt-BEA-###-task-b`
3. Task C - Agent dispatched to `wt-BEA-###-task-c`

**Linear Status:** Todo → In Progress
```

## Dispatch Pattern

Use `Task` tool to spawn implementer agents in parallel:

```javascript
// Dispatch all implementers in SINGLE message (parallel execution)
Task({
  subagent_type: "general-purpose",
  name: "Implementer: Login Form",
  description: "Implement login form UI",
  prompt: `
    You are the IMPLEMENTER for Task 1: Login Form UI

    **Working directory:** ../wt-BEA-330-login-form

    **Linear Issue:** BEA-330
    **Task Description:** ${task1Description}

    **Your responsibilities:**
    1. Read Linear issue for full context
    2. Implement the feature
    3. Write tests
    4. Commit changes with Linear reference
    5. Self-review your code
    6. Push branch and create draft PR
    7. Update task status to completed when done

    **Commit message format:**
    feat(scope): description (BEA-330)

    **DO NOT:**
    - Skip tests
    - Create PR without self-review
    - Mark task complete without passing tests
  `
})

Task({
  subagent_type: "general-purpose",
  name: "Implementer: OAuth Callback",
  description: "Implement OAuth callback handler",
  prompt: `...similar prompt for Task 2...`
})

Task({
  subagent_type: "general-purpose",
  name: "Implementer: Session Middleware",
  description: "Implement session management",
  prompt: `...similar prompt for Task 3...`
})
```

## Implementer Responsibilities

Each implementer MUST:

1. ✅ **Read Linear issue** - Full context including comments/PRs
2. ✅ **Implement feature** - Follow acceptance criteria
3. ✅ **Write tests** - Unit tests with >80% coverage
4. ✅ **Commit with Linear reference** - `feat(scope): description (BEA-###)`
5. ✅ **Self-review code** - Check for issues before PR
6. ✅ **Create draft PR** - Use PR template
7. ✅ **Update task status** - Mark as completed when done

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

```
mcp__linear-server__create_comment {
  issueId: "issue-id",
  body: `
🔍 **Spec Compliance Review Starting**

All implementer agents completed. Now reviewing against acceptance criteria.

**PRs under review:**
- PR #123 - Login Form UI
- PR #124 - OAuth Callback Handler
- PR #125 - Session Middleware
  `
}
```

## Dispatch Spec Reviewers

Use `Task` tool to spawn reviewer agents in parallel:

```javascript
Task({
  subagent_type: "general-purpose",
  name: "Spec Reviewer: Login Form",
  description: "Review login form against spec",
  prompt: `
    You are the SPEC COMPLIANCE REVIEWER for Task 1: Login Form

    **Your ONLY job:** Verify implementation matches Linear issue requirements

    **Linear Issue:** BEA-330
    **PR to review:** PR #123
    **Working directory:** ../wt-BEA-330-login-form

    **Review checklist:**
    1. Read Linear issue acceptance criteria
    2. Review PR diff and code
    3. Verify each acceptance criterion is met
    4. Check for missing features
    5. Verify tests cover acceptance criteria

    **Approval criteria:**
    - ✅ ALL acceptance criteria implemented
    - ✅ Tests validate acceptance criteria
    - ✅ No missing features from spec

    **If issues found:**
    1. Document SPECIFIC gaps vs. acceptance criteria
    2. Request implementer to fix
    3. Re-review after fixes

    **Output format:**
    - If APPROVED: "✅ SPEC COMPLIANT - All acceptance criteria met"
    - If ISSUES: "❌ SPEC GAPS FOUND" + list of specific issues

    DO NOT review code quality, patterns, or style - that's the next step.
  `
})

// ... dispatch reviewers for other tasks in same message
```

## Spec Review Outcomes

### ✅ SPEC COMPLIANT

If reviewer approves, move to Step 5 (Quality Review).

**Update Linear:**
```
mcp__linear-server__create_comment {
  issueId: "issue-id",
  body: "✅ **Spec Review PASSED** for Task 1: Login Form\n\nAll acceptance criteria verified. Proceeding to code quality review."
}
```

### ❌ SPEC GAPS FOUND

If reviewer finds issues:

1. **Document issues** in PR review comments
2. **Dispatch implementer** to fix issues
3. **Wait for fixes** to complete
4. **Re-run spec reviewer** to verify fixes
5. **Repeat** until SPEC COMPLIANT

**DO NOT proceed to quality review until spec review passes.**

---

# Step 5: Review Stage - Code Quality

**🚨 MANDATORY: Do NOT skip quality review**

Only after spec review PASSES, dispatch code quality reviewers.

## Update Linear: Comment on Quality Review Start

```
mcp__linear-server__create_comment {
  issueId: "issue-id",
  body: `
🎨 **Code Quality Review Starting**

Spec compliance verified. Now reviewing code quality, patterns, and best practices.
  `
}
```

## Dispatch Quality Reviewers

```javascript
Task({
  subagent_type: "general-purpose",
  name: "Quality Reviewer: Login Form",
  description: "Review login form code quality",
  prompt: `
    You are the CODE QUALITY REVIEWER for Task 1: Login Form

    **Your ONLY job:** Review code quality, patterns, and best practices

    **PR to review:** PR #123
    **Working directory:** ../wt-BEA-330-login-form

    **Review checklist:**
    1. Code follows project conventions
    2. No security vulnerabilities (XSS, injection, etc.)
    3. Proper error handling
    4. Performance considerations
    5. Accessibility (WCAG 2.1 AA)
    6. Test quality and coverage
    7. Documentation/comments where needed
    8. No code duplication

    **Approval criteria:**
    - ✅ Code follows established patterns
    - ✅ No security issues
    - ✅ Proper error handling
    - ✅ Tests are thorough
    - ✅ No major tech debt

    **If issues found:**
    1. Document SPECIFIC quality issues
    2. Request implementer to fix
    3. Re-review after fixes

    **Output format:**
    - If APPROVED: "✅ QUALITY APPROVED - Code meets standards"
    - If ISSUES: "❌ QUALITY ISSUES FOUND" + list of specific issues

    Focus on HIGH-IMPACT issues only. Don't nitpick.
  `
})
```

## Quality Review Outcomes

### ✅ QUALITY APPROVED

If reviewer approves, move to Step 6 (Merge).

**Update Linear:**
```
mcp__linear-server__create_comment {
  issueId: "issue-id",
  body: "✅ **Quality Review PASSED** for Task 1: Login Form\n\nCode quality verified. Ready to merge."
}
```

### ❌ QUALITY ISSUES FOUND

If reviewer finds issues:

1. **Document issues** in PR review comments
2. **Dispatch implementer** to fix issues
3. **Wait for fixes** to complete
4. **Re-run quality reviewer** to verify fixes
5. **Repeat** until QUALITY APPROVED

**DO NOT merge until quality review passes.**

---

# Step 6: Merge and Integrate

Once BOTH reviews pass for ALL tasks, merge PRs and integrate.

## Merge Order

Merge PRs in dependency order:

1. Foundation changes first (shared utilities, types)
2. Core features next (business logic)
3. UI/UX changes last (components, pages)

## Update Linear Status: In Progress → In Review

Before merging:

```
mcp__linear-server__update_issue {
  id: "issue-id",
  state: "In Review"
}
```

**Comment format:**
```markdown
🎉 **All Reviews Passed - Ready to Merge**

**Status:**
- ✅ Task A - Spec ✅ Quality ✅
- ✅ Task B - Spec ✅ Quality ✅
- ✅ Task C - Spec ✅ Quality ✅

**Linear Status:** In Progress → In Review

Merging PRs in dependency order...
```

## Merge PRs

Use GitHub MCP to merge:

```
mcp__plugin_github_github__merge_pull_request {
  owner: "owner",
  repo: "repo",
  pullNumber: 123,
  merge_method: "squash"
}
```

## Update Linear Status: In Review → Done

After ALL PRs merged:

```
mcp__linear-server__update_issue {
  id: "issue-id",
  state: "Done"
}
```

**Comment format:**
```markdown
✅ **Issue Completed**

All PRs merged successfully:
- PR #123 - Login Form UI
- PR #124 - OAuth Callback Handler
- PR #125 - Session Middleware

**Linear Status:** In Review → Done
**Commits:** feat(auth): add login form (BEA-330), feat(auth): add OAuth callback (BEA-330), feat(auth): add session middleware (BEA-330)
```

## Cleanup Worktrees

After merging, clean up worktrees:

```bash
git worktree remove ../wt-BEA-330-login-form
git worktree remove ../wt-BEA-330-oauth-callback
git worktree remove ../wt-BEA-330-session-middleware
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
4. ❌ Skip spec compliance review
5. ❌ Skip code quality review
6. ❌ Mark task complete without both reviews passing
7. ❌ Move to next task before current task reviews complete
8. ❌ Try to fix issues yourself instead of dispatching implementer
9. ❌ Accept "close enough" on spec compliance
10. ❌ Proceed with unresolved review issues
11. ❌ Review code quality BEFORE spec compliance passes
12. ❌ Dispatch parallel agents without creating worktrees
13. ❌ Forget to update Linear status at transitions

---

# 🚩 Red Flags You're Violating This

If you think ANY of these thoughts, STOP:

- "I'll just quickly fix this myself" → ❌ NO, dispatch implementer
- "The code looks good, I'll skip the review" → ❌ NO, reviews are mandatory
- "Spec compliance passed, that's good enough" → ❌ NO, quality review is also required
- "I'll review this while moving to next task" → ❌ NO, complete current task first
- "This is a small change, doesn't need reviews" → ❌ NO, ALL changes need reviews
- "I don't need to check Linear, I know what to do" → ❌ NO, Linear is source of truth
- "I can work in the main directory, no need for worktrees" → ❌ NO, isolation is mandatory
- "Let me just update code without dispatching agent" → ❌ NO, agents do implementation

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

## Example 1: Feature with 3 Independent Tasks

**Linear Issue:** BEA-330 "Add user authentication"

**Tasks:**
1. Login form UI (no dependencies)
2. OAuth callback API (no dependencies)
3. Session middleware (no dependencies)

**Execution:**
```
Step 0: Query Linear for BEA-330, read full context
Step 1: Identify 3 independent tasks, create task list
Step 2: Create 3 worktrees (wt-BEA-330-login, wt-BEA-330-oauth, wt-BEA-330-session)
Step 3: Dispatch 3 implementers in parallel (one message, 3 Task calls)
Step 4: Dispatch 3 spec reviewers in parallel after implementers complete
Step 5: Dispatch 3 quality reviewers in parallel after spec reviews pass
Step 6: Merge 3 PRs, update Linear to Done, cleanup worktrees
```

## Example 2: Feature with Sequential Dependencies

**Linear Issue:** BEA-331 "Add payment processing"

**Tasks:**
1. Payment API client (foundation)
2. Payment form UI (depends on API client)
3. Payment confirmation page (depends on form)

**Execution:**
```
Step 0: Query Linear for BEA-331
Step 1: Identify 3 tasks with sequential dependencies
Step 2: Create 1 worktree for Task 1 only
Step 3: Dispatch implementer for Task 1
Step 4: Spec review Task 1
Step 5: Quality review Task 1
Step 6: Merge Task 1 PR

THEN repeat Steps 2-6 for Task 2
THEN repeat Steps 2-6 for Task 3

Update Linear to Done after all tasks complete
```

**Note:** Sequential dependencies mean tasks run one-at-a-time, but each task still gets implementer → spec review → quality review workflow.

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

Use this checklist for every multi-step task:

- [ ] Step 0: Query Linear for issue, read full context
- [ ] Step 0: Update Linear status: Backlog → Todo
- [ ] Step 1: Identify independent tasks, create task list
- [ ] Step 2: Create git worktrees (one per task)
- [ ] Step 3: Update Linear: Todo → In Progress
- [ ] Step 3: Dispatch implementer agents (all in one message)
- [ ] Step 3: Monitor implementer progress
- [ ] Step 4: Dispatch spec reviewer agents (all in one message)
- [ ] Step 4: Verify all spec reviews pass (re-review if needed)
- [ ] Step 5: Dispatch quality reviewer agents (all in one message)
- [ ] Step 5: Verify all quality reviews pass (re-review if needed)
- [ ] Step 6: Update Linear: In Progress → In Review
- [ ] Step 6: Merge PRs in dependency order
- [ ] Step 6: Update Linear: In Review → Done
- [ ] Step 6: Cleanup worktrees

**If you skip ANY step, you're violating the workflow.**
