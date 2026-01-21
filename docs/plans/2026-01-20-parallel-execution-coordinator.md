# Parallel Execution Coordinator - Simplified Room Creation Epic

> **For Claude:** This is an EXECUTIVE COORDINATION PLAN. You are the orchestrator managing multiple Sonnet agents working in parallel.

**Goal:** Coordinate parallel development of 10 GitHub issues using multiple background Sonnet agents, each in isolated worktrees

**Architecture:**
- Executive agent (this session) coordinates all work
- Background Sonnet agents execute individual tickets in isolated git worktrees
- Continuous PR review and merge as work completes
- Phase-based parallelization based on dependency graph

**Tech Stack:**
- Git worktrees for isolation
- GitHub CLI for issue/PR management
- Task tool with Sonnet agents in background mode
- Playwright for E2E verification

---

## Execution Strategy

### Phase-Based Parallelization

**Phase 1 (Immediate Start - 2 parallel agents):**
- Issue #110: Create Secure Generation Utilities (CRITICAL)
- Issue #115: Create Room Setup Modal Component (HIGH)

**Phase 2 (After #110 complete - 1 agent):**
- Issue #111: Update Play Page Session ID Strategy (CRITICAL)

**Phase 3 (After #111 complete - 3 parallel agents):**
- Issue #112: Fix Modal Timing and Recovery Error Handling (CRITICAL)
- Issue #113: Implement PIN Persistence (CRITICAL)
- Issue #114: Implement Offline Mode Support (HIGH)

**Phase 4 (After Phase 3 - 2 parallel agents):**
- Issue #116: Add PIN Display to Admin Panel (depends on #113)
- Issue #117: Add Create New Game Button (depends on #112, #114)

**Phase 5 (After Phase 3 & 4 complete - 1 agent):**
- Issue #118: Integrate Room Setup Modal (depends on #112, #113, #114, #115)

**Phase 6 (After all complete - 1 agent):**
- Issue #119: Testing and Documentation

---

## Worktree Management

### Naming Convention
```
worktree-<issue-number>-<slug>
```

Examples:
- `worktree-110-secure-generation`
- `worktree-115-room-modal`
- `worktree-111-session-id-strategy`

### Directory Structure
```
/Users/j/repos/beak-gaming-platform/           # Main repo
/Users/j/repos/beak-gaming-platform-worktrees/ # Worktree root
  ├── worktree-110-secure-generation/
  ├── worktree-115-room-modal/
  ├── worktree-111-session-id-strategy/
  └── ...
```

### Worktree Creation Command
```bash
git worktree add ../beak-gaming-platform-worktrees/worktree-<issue>-<slug> -b issue-<issue>-<slug>
```

### Cleanup Command
```bash
git worktree remove ../beak-gaming-platform-worktrees/worktree-<issue>-<slug>
git branch -D issue-<issue>-<slug>
```

---

## Agent Dispatch Protocol

### Step 1: Check Issue Status
```bash
gh issue view <issue_number> --json state,assignees
```

### Step 2: Assign Issue to Self
```bash
gh issue edit <issue_number> --add-assignee "@me"
```

### Step 3: Create Worktree
```bash
# From main repo directory
git worktree add ../beak-gaming-platform-worktrees/worktree-<issue>-<slug> -b issue-<issue>-<slug>
```

### Step 4: Dispatch Background Agent
```bash
# Use Task tool with run_in_background=true
Task(
  subagent_type="general-purpose",
  description="Implement issue #<number>",
  prompt="Navigate to /Users/j/repos/beak-gaming-platform-worktrees/worktree-<issue>-<slug>

Read the issue details from GitHub:
gh issue view <issue_number>

Implement the feature following TDD:
1. Write failing tests first
2. Implement minimal code to pass
3. Refactor as needed
4. Commit frequently with conventional commits

When complete:
1. Push branch to origin
2. Create PR using the template at .github/PULL_REQUEST_TEMPLATE.md
3. Link PR to issue #<issue_number>
4. Comment on issue that PR is ready for review

Use these files from the GitHub issue body as your implementation guide.",
  run_in_background=true
)
```

### Step 5: Track Agent Progress
- Monitor agent output file (returned by Task tool)
- Check for completion signal
- Verify PR creation

---

## PR Review Protocol

### Step 1: Detect PR Ready
Monitor for PR creation linked to our issues:
```bash
gh pr list --label "bingo" --state open --json number,title,headRefName
```

### Step 2: Assign Reviewer Agent
```bash
# Use Task tool with review agent
Task(
  subagent_type="general-purpose",
  description="Review PR #<number>",
  prompt="Review the pull request following these steps:

1. Check out the PR branch locally:
   gh pr checkout <pr_number>

2. Read the PR description and changes:
   gh pr view <pr_number>
   gh pr diff <pr_number>

3. Run all tests:
   cd apps/bingo
   pnpm test:run
   pnpm build

4. Run Playwright E2E tests to verify app functionality:
   pnpm playwright test

5. Review code quality:
   - Follows project conventions
   - Has proper tests
   - No security issues
   - Proper error handling

6. If issues found, request changes:
   gh pr review <pr_number> --request-changes --body '<feedback>'

7. If all checks pass, approve:
   gh pr review <pr_number> --approve --body 'LGTM! ✅ All tests pass, E2E tests pass, code quality looks good.'

Use the superpowers:receiving-code-review skill if this is a review of YOUR work.
Use the superpowers:code-reviewer skill proactively when reviewing.",
  run_in_background=true
)
```

### Step 3: Monitor Review Completion
- Check review status
- Verify all checks pass

### Step 4: Merge PR
```bash
# Only merge if:
# 1. Review approved
# 2. All CI checks pass
# 3. No merge conflicts

gh pr merge <pr_number> --squash --delete-branch
```

### Step 5: Update Issue
```bash
gh issue close <issue_number> --comment "Completed in PR #<pr_number>"
```

### Step 6: Cleanup Worktree
```bash
cd /Users/j/repos/beak-gaming-platform
git worktree remove ../beak-gaming-platform-worktrees/worktree-<issue>-<slug>
```

---

## State Tracking

### Active Work Tracker
Maintain in-memory state of:
```typescript
interface ActiveWork {
  issueNumber: number;
  agentTaskId: string;
  worktreePath: string;
  branchName: string;
  status: 'in_progress' | 'pr_created' | 'in_review' | 'approved' | 'merged';
  prNumber?: number;
  reviewerTaskId?: string;
  startedAt: string;
}
```

### Check Active Work Status
```bash
# For each active task ID, check output
Read tool on task output file
# Or use tail to see latest output
tail -n 50 <output_file>
```

---

## Coordination Loop (Main Executive Flow)

### Loop Structure
```
WHILE (incomplete issues exist):
  1. Check dependency graph for available issues
  2. For each available issue:
     - If capacity available AND dependencies met:
       * Create worktree
       * Dispatch background agent
       * Track in ActiveWork

  3. Check active agents for completion signals:
     - PR created → Dispatch reviewer
     - Review approved + checks pass → Merge PR → Close issue → Cleanup worktree
     - Review requested changes → Monitor for updates

  4. Update phase tracking
  5. Wait 30-60 seconds before next iteration
```

### Capacity Management
- **Max parallel developers:** 5 agents
- **Max parallel reviewers:** 2 agents
- **Total max agents:** 7 concurrent

---

## Implementation Execution Plan

### PHASE 1: Setup & Initialize (5 minutes)

**Task 1.1: Create worktree root directory**
```bash
mkdir -p /Users/j/repos/beak-gaming-platform-worktrees
```

**Task 1.2: Verify all issues exist**
```bash
for i in {110..119}; do
  gh issue view $i --json number,title,state | jq -r '"\(.number): \(.title) [\(.state)]"'
done
```

**Task 1.3: Check current branch and ensure clean state**
```bash
cd /Users/j/repos/beak-gaming-platform
git status
git pull origin main
```

### PHASE 2: Dispatch Phase 1 Agents (2 agents)

**Task 2.1: Dispatch Agent for Issue #110**

Create worktree:
```bash
git worktree add ../beak-gaming-platform-worktrees/worktree-110-secure-generation -b issue-110-secure-generation
```

Assign issue:
```bash
gh issue edit 110 --add-assignee "@me"
```

Dispatch agent:
```typescript
Task(
  subagent_type="general-purpose",
  description="Implement #110 secure generation",
  prompt="You are implementing Issue #110: Create Secure Generation Utilities

Working directory: /Users/j/repos/beak-gaming-platform-worktrees/worktree-110-secure-generation

Read the full issue:
gh issue view 110

Implementation requirements from issue:
1. Create file: apps/bingo/src/lib/session/secure-generation.ts
2. Implement generateSecurePin() using crypto.getRandomValues (4 digits)
3. Implement generateShortSessionId() (6 alphanumeric, no ambiguous chars)
4. Add localStorage helper functions
5. Write comprehensive tests

Follow TDD:
- Write tests in apps/bingo/src/lib/session/__tests__/secure-generation.test.ts
- Use vitest
- All tests must pass before pushing

When complete:
1. git push origin issue-110-secure-generation
2. Create PR: gh pr create --title 'feat(bingo): Create Secure Generation Utilities (#110)' --body-file <(cat <<'EOF'
[Use PR template at .github/PULL_REQUEST_TEMPLATE.md]

Closes #110

## Summary
- Implemented secure PIN and session ID generation
- Added localStorage helpers
- Full test coverage

## Five-Level Explanation
[Fill in all 5 levels as required by template]

## Testing
- [x] Unit tests pass
- [x] Type checking passes
- [ ] E2E tests (will be done by reviewer)

EOF
)
3. Link to issue: gh issue comment 110 --body 'PR ready for review: #<pr_number>'",
  run_in_background=true
)
```

**Task 2.2: Dispatch Agent for Issue #115**

Create worktree:
```bash
git worktree add ../beak-gaming-platform-worktrees/worktree-115-room-modal -b issue-115-room-modal
```

Assign issue:
```bash
gh issue edit 115 --add-assignee "@me"
```

Dispatch agent:
```typescript
Task(
  subagent_type="general-purpose",
  description="Implement #115 room modal",
  prompt="You are implementing Issue #115: Create Room Setup Modal Component

Working directory: /Users/j/repos/beak-gaming-platform-worktrees/worktree-115-room-modal

Read the full issue:
gh issue view 115

Implementation requirements:
1. Create: apps/bingo/src/components/presenter/RoomSetupModal.tsx
2. Three options: Create New Game, Join Existing, Play Offline
3. Senior-friendly UI (large text, high contrast, 44x44px touch targets)
4. Accessibility (keyboard nav, ARIA labels)
5. Write component tests

Follow TDD and test with vitest + testing-library.

When complete:
1. Push branch
2. Create PR using template
3. Comment on issue",
  run_in_background=true
)
```

### PHASE 3: Monitor Phase 1 & Dispatch Phase 2

**Task 3.1: Monitor agents for completion**

Check agent outputs periodically:
```bash
# Read output files returned by Task tool
# Look for signals: "PR created", "push complete"
```

**Task 3.2: When Issue #110 PR is created**

Dispatch reviewer:
```typescript
Task(
  subagent_type="general-purpose",
  description="Review PR for #110",
  prompt="Review the PR for Issue #110.

REQUIRED: Use superpowers:code-reviewer skill proactively before starting review.

Steps:
1. gh pr checkout <pr_number>
2. cd apps/bingo
3. pnpm test:run
4. pnpm build
5. Review code quality
6. If all pass: gh pr review <pr_number> --approve
7. Report back completion",
  run_in_background=true
)
```

**Task 3.3: When #110 is approved and checks pass**

Merge:
```bash
gh pr merge <pr_number> --squash --delete-branch
gh issue close 110 --comment "Completed in PR #<pr_number>"
cd /Users/j/repos/beak-gaming-platform
git worktree remove ../beak-gaming-platform-worktrees/worktree-110-secure-generation
git pull origin main
```

**Task 3.4: Dispatch Issue #111 (unblocked by #110)**

Same pattern as Phase 1 agents.

### PHASE 4: Continue Coordination Loop

Repeat monitoring and dispatching pattern for:
- Phase 3 issues (when #111 completes)
- Phase 4 issues (when Phase 3 completes)
- Phase 5 issue (when dependencies met)
- Phase 6 issue (when all complete)

---

## Error Handling

### Agent Fails Tests
1. Read agent output to understand failure
2. Dispatch debugging agent to fix
3. Or manually intervene if needed

### Merge Conflict
1. Dispatcher creates resolution worktree
2. Resolves conflict
3. Pushes update
4. Re-runs tests

### Review Requests Changes
1. Monitor for developer response
2. When updated, re-trigger review
3. Merge when approved

---

## Success Criteria

- [ ] All 10 issues (#110-#119) closed
- [ ] All PRs merged to main
- [ ] All worktrees cleaned up
- [ ] Main branch has all features
- [ ] All tests passing on main
- [ ] Bingo app functional (verified by E2E tests)

---

## Command Reference

### Quick Status Check
```bash
# Active issues
gh issue list --label "bingo" --assignee "@me" --state open

# Active PRs
gh pr list --label "bingo" --state open

# Worktrees
git worktree list
```

### Emergency Stop
```bash
# List all worktrees
git worktree list

# Remove all worktrees
for wt in $(git worktree list | grep worktree- | awk '{print $1}'); do
  git worktree remove $wt --force
done

# Unassign all issues
for i in {110..119}; do
  gh issue edit $i --remove-assignee "@me"
done
```

---

## Notes

- **DO NOT** wait for entire phases to complete - merge PRs as soon as approved
- **DO** run reviewers in background to not block coordination
- **DO** use Playwright tests in review to verify functionality
- **DO** ensure PR template is used for all PRs
- **DO** maintain main branch stability - only merge passing PRs
- **DO** track time estimates but don't block on them
- Use `Task(..., run_in_background=true)` for all agents
- Use `Read` tool or `tail` to monitor background agent progress
- Keep executive flow lightweight - delegate all work to agents
