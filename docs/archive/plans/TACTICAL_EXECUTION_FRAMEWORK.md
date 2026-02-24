# Tactical Execution Framework

**Purpose:** Raise tactical execution, dependency tracking, and acceptance criteria from 6/10 to 9-10/10 for AI agent-driven development.

**Version:** 1.0
**Created:** 2026-01-22
**AI Development Model:** No time estimates - focus on dependencies, complexity, and verification

---

## 1. Task Dependency Graph Template

Every task must explicitly document its dependencies using this format:

```
## Dependencies

### Blocks (Must Complete First)
- [ ] TASK-ID: Brief description (Status: Done/In Progress/Blocked)
- [ ] TASK-ID: Brief description (Status: Done/In Progress/Blocked)

### Blocked By (What This Task Blocks)
- [ ] TASK-ID: Brief description
- [ ] TASK-ID: Brief description

### Related (Non-Blocking)
- [ ] TASK-ID: Brief description
- [ ] TASK-ID: Brief description

### Critical Path?
- [x] Yes - Blocks multiple downstream tasks
- [ ] No - Can be done in parallel
```

**Example:**
```
## Dependencies (CRIT-1: Enable RLS on bingo_templates)

### Blocks (Must Complete First)
- [x] None - Database exists and is accessible

### Blocked By (What This Task Blocks)
- [ ] CRIT-3: Remove test-login routes (security must be enabled first)
- [ ] Task 1: User authentication flow (templates need security)
- [ ] Task 2: Template management CRUD (templates need security)

### Related (Non-Blocking)
- [ ] CRIT-2: Fix foreign key constraints (independent security fix)

### Critical Path?
- [x] Yes - Blocks 3 tasks and is a CRITICAL security vulnerability
```

---

## 2. Four-Level Acceptance Criteria

Every task must define success at **four levels**:

### Level 1: Code Changes (What changed?)
- Specific files modified/created/deleted
- Line counts or size estimates
- Key functions/components changed

**Example:**
```
### Code Changes
- Modified: `supabase/migrations/001_enable_rls.sql` (12 lines)
- Created: `supabase/migrations/002_add_rls_policies.sql` (45 lines)
- No application code changes required
```

### Level 2: Functional Outcome (What works differently?)
- Behavior changes from user perspective
- New capabilities enabled
- Bugs fixed

**Example:**
```
### Functional Outcome
- Unauthenticated users can no longer read bingo_templates table
- Template owners can only modify their own templates
- Admin users can modify all templates
- API returns 403 Forbidden for unauthorized access
```

### Level 3: Verification Commands (How to prove it works?)
- Exact commands to run
- Expected output (success criteria)
- Expected failures (negative tests)

**Example:**
```
### Verification Commands

**Test 1: RLS is enabled**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'bingo_templates';
-- Expected: rowsecurity = true
```

**Test 2: Unauthenticated access denied**
```bash
curl -X GET "https://your-project.supabase.co/rest/v1/bingo_templates" \
  -H "apikey: YOUR_ANON_KEY"
# Expected: 401 Unauthorized or empty results
```

**Test 3: Owner can access own templates**
```bash
curl -X GET "https://your-project.supabase.co/rest/v1/bingo_templates" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer USER_TOKEN"
# Expected: 200 OK with user's templates only
```
```

### Level 4: Regression Checks (What must still work?)
- Existing features that must not break
- Performance requirements maintained
- Backward compatibility verified

**Example:**
```
### Regression Checks
- [ ] Existing templates remain accessible to their owners
- [ ] Template CRUD operations work for authenticated users
- [ ] API response times remain under 200ms
- [ ] No changes to application code required (pure DB change)
```

---

## 3. Ten-Step Implementation Template

Every task execution follows this ten-step template:

### Step 1: Pre-Implementation Checklist
- [ ] All blocking dependencies completed
- [ ] Environment variables verified
- [ ] Database backup created (if DB changes)
- [ ] Git working directory clean
- [ ] Branch created from latest main

### Step 2: Read Existing Code
- [ ] Read all files that will be modified
- [ ] Understand current behavior
- [ ] Identify integration points
- [ ] Check for existing tests

### Step 3: Write Failing Tests (If Applicable)
- [ ] Write unit tests that fail
- [ ] Write integration tests that fail
- [ ] Document expected behavior

### Step 4: Implement Solution
- [ ] Create/modify files per acceptance criteria
- [ ] Follow existing code patterns
- [ ] Add inline comments for complex logic
- [ ] Keep changes minimal and focused

### Step 5: Run Tests
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Run full test suite (regression check)

### Step 6: Manual Verification
- [ ] Execute verification commands from acceptance criteria
- [ ] Test positive cases (should work)
- [ ] Test negative cases (should fail correctly)
- [ ] Test edge cases

### Step 7: Code Quality Checks
- [ ] Run linter (`pnpm lint`)
- [ ] Run type checker (`pnpm type-check` or build)
- [ ] Check for console warnings
- [ ] Review diff for unintended changes

### Step 8: Documentation Updates
- [ ] Update relevant README files
- [ ] Update CLAUDE.md if architecture changed
- [ ] Add inline code comments
- [ ] Update API documentation if needed

### Step 9: Commit with Conventional Format
- [ ] Write descriptive commit message
- [ ] Reference issue number
- [ ] Include Co-Authored-By: Claude Sonnet 4.5

**Commit Format:**
```
<type>(<scope>): <description>

<body>

Fixes #<issue-number>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Step 10: Create Pull Request
- [ ] Use PR template (.github/PULL_REQUEST_TEMPLATE.md)
- [ ] Fill in all required sections
- [ ] Add Five-Level Explanation
- [ ] Link related issues
- [ ] Request review

---

## 4. Definition of Done (DoD) Checklist

Before marking any task complete, verify ALL items:

### Code Quality
- [ ] All code changes committed
- [ ] No debug code or console.logs (unless intentional)
- [ ] No commented-out code
- [ ] Follows project code style
- [ ] TypeScript: No `any` types (unless justified)

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Manual verification completed
- [ ] Regression tests passing
- [ ] Coverage meets requirements (if applicable)

### Documentation
- [ ] Code comments added for complex logic
- [ ] README updated if needed
- [ ] API documentation updated if needed
- [ ] Migration guide written (if breaking changes)

### Integration
- [ ] Linter passes
- [ ] Type checker passes
- [ ] Build succeeds
- [ ] No new warnings introduced

### Security
- [ ] No secrets in code
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Authentication/authorization checked
- [ ] Input validation implemented

### Acceptance Criteria
- [ ] All Level 1 (Code Changes) items completed
- [ ] All Level 2 (Functional Outcome) verified
- [ ] All Level 3 (Verification Commands) executed successfully
- [ ] All Level 4 (Regression Checks) passing

---

## 5. Risk Mitigation Matrix

Every task must include a risk assessment using this matrix:

| Risk Type | Likelihood | Impact | Mitigation Strategy | Rollback Plan |
|-----------|------------|--------|---------------------|---------------|
| Example | Low/Med/High | Low/Med/High | What you'll do to prevent | What you'll do if it happens |

**Risk Types:**
- **Data Loss:** Could this task cause data to be deleted or corrupted?
- **Service Downtime:** Could this task cause the app to become unavailable?
- **Security Vulnerability:** Could this task introduce a security hole?
- **Breaking Change:** Could this task break existing functionality?
- **Performance Degradation:** Could this task slow down the app?
- **Integration Failure:** Could this task break connections to external services?

**Example:**
```markdown
| Risk Type | Likelihood | Impact | Mitigation Strategy | Rollback Plan |
|-----------|------------|--------|---------------------|---------------|
| Data Loss | Low | High | Test on dev DB first, backup prod before migration | Restore from backup, revert migration |
| Service Downtime | Low | Medium | Apply during low-traffic hours, test in staging | Revert migration immediately |
| Breaking Change | Low | High | Full regression test suite, manual QA | Revert migration, deploy previous version |
| Security Vulnerability | Medium | Critical | Security review before deploy, enable RLS immediately | Emergency hotfix, revoke exposed credentials |
```

---

## 6. Rollback Procedure Template

Every task must include a detailed rollback plan:

```markdown
## Rollback Procedure

### When to Rollback
- [ ] Critical bug discovered in production
- [ ] Performance degradation > 50%
- [ ] Data corruption detected
- [ ] Security vulnerability introduced
- [ ] User-facing feature broken

### Rollback Steps

#### Database Changes
1. **Revert migration:**
   ```bash
   supabase migration down <migration-name>
   ```
2. **Verify rollback:**
   ```sql
   SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;
   ```

#### Code Changes
1. **Revert commit:**
   ```bash
   git revert <commit-sha> --no-commit
   git commit -m "Revert: <original commit message>"
   git push origin main
   ```
2. **Redeploy:**
   ```bash
   git push vercel main --force
   ```

#### Environment Variables
1. **Restore previous values** in Vercel dashboard
2. **Trigger redeployment**

### Verification After Rollback
- [ ] Run verification commands (expecting old behavior)
- [ ] Check error logs for new issues
- [ ] Monitor performance metrics for 1 hour
- [ ] Notify stakeholders of rollback

### Post-Rollback Actions
1. Document what went wrong in GitHub issue
2. Create new task to fix root cause
3. Update test suite to catch this issue
4. Review why issue wasn't caught before deploy
```

---

## 7. Complexity Assessment Scale

Use this scale to assess task complexity (NOT time estimates):

### Simple (1-2 points)
- Single file change
- Pure function addition
- Documentation update
- Configuration change
- No new dependencies

**Example:** Add a utility function, update README, change env var

### Medium (3-5 points)
- Multiple file changes
- New component creation
- Database migration (non-breaking)
- API route addition
- Integration test required

**Example:** Create login form, add API endpoint, create DB table

### Complex (6-8 points)
- Cross-package changes
- State management changes
- Breaking database changes
- Authentication/authorization logic
- Multiple integration points

**Example:** Implement OAuth flow, redesign state management, refactor auth system

### Critical (9-10 points)
- Core architecture change
- Security-critical implementation
- Data migration with transformation
- Multiple teams affected
- High risk of breaking changes

**Example:** Migrate database provider, implement RLS across all tables, redesign auth architecture

---

## 8. Agent Handoff Protocol

When multiple agents work on related tasks, use this protocol:

### Handoff Document Template

```markdown
# Agent Handoff: <Task Name>

**From Agent:** <Previous agent ID or name>
**To Agent:** <Next agent ID or name>
**Date:** YYYY-MM-DD
**Task:** <Brief description>

## What Was Completed
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

## What's Left
- [ ] Item 1 (Blocking: <reason>)
- [ ] Item 2
- [ ] Item 3

## Known Issues
1. **Issue description:** Workaround or status
2. **Issue description:** Workaround or status

## Key Files Modified
- `path/to/file1.ts` - Brief description of changes
- `path/to/file2.tsx` - Brief description of changes

## Environment State
- **Branch:** `branch-name`
- **Last Commit:** `commit-sha`
- **Database:** Up to date / Needs migration
- **Tests:** Passing / Failing (list failures)

## Context for Next Agent
Critical information the next agent needs to know:
- Important decision made and why
- Tricky bug encountered and how solved
- Pattern to follow for consistency
- Security considerations
```

---

## 9. Dependency Chain Visualization

For complex features with multiple tasks, create a visual dependency chain:

```
CRIT-1: Enable RLS (0 dependencies)
   ↓
   ├─→ Task 1: User auth flow (1 dependency)
   ├─→ Task 2: Template CRUD (1 dependency)
   └─→ CRIT-3: Remove test-login (1 dependency)
         ↓
         Task 4: OAuth refresh (1 dependency)
            ↓
            Task 5: Extract OAuth client (1 dependency)
               ↓
               Task 6: Logout functionality (1 dependency)

CRIT-2: Fix FK constraints (0 dependencies, parallel)
   ↓
   Task 2: Template CRUD (2 dependencies)

CRIT-4: Fix template tests (0 dependencies, parallel)
   ↓
   Task 2: Template CRUD (3 dependencies)
```

**Critical Path:** CRIT-1 → Task 1 → CRIT-3 → Task 4 → Task 5 → Task 6 (6 sequential tasks)

**Parallel Work Available:**
- CRIT-2 (fix FK constraints)
- CRIT-4 (fix template tests)

---

## 10. Task Execution Report Template

After completing a task, generate this report:

```markdown
# Task Execution Report: <Task Name>

**Task ID:** <Issue number>
**Completed:** YYYY-MM-DD
**Complexity:** Simple/Medium/Complex/Critical
**Agent:** <Agent ID>

## Summary
Brief 2-3 sentence summary of what was accomplished.

## Acceptance Criteria Status

### Level 1: Code Changes
- [x] Modified: `file1.ts` (25 lines)
- [x] Created: `file2.tsx` (150 lines)

### Level 2: Functional Outcome
- [x] Feature X now works as expected
- [x] Bug Y is fixed

### Level 3: Verification Commands
```bash
# Command 1
✅ Output matched expected result

# Command 2
✅ Output matched expected result
```

### Level 4: Regression Checks
- [x] Existing feature A still works
- [x] Existing feature B still works

## Challenges Encountered
1. **Challenge:** Description
   **Solution:** How it was resolved

## Lessons Learned
- Key insight 1
- Key insight 2

## Commits
- `commit-sha`: commit message

## Pull Request
- **URL:** https://github.com/.../pull/123
- **Status:** Open/Merged/Closed

## Next Steps
- [ ] Task that depends on this one
- [ ] Follow-up improvement identified
```

---

## Framework Validation Checklist

Before executing any task, validate it against this checklist:

### Planning Validation
- [ ] Task has explicit dependency graph
- [ ] Task has four-level acceptance criteria
- [ ] Task has complexity assessment
- [ ] Task has risk mitigation matrix
- [ ] Task has rollback procedure

### Execution Validation
- [ ] Following ten-step implementation template
- [ ] Verification commands prepared in advance
- [ ] Tests written before implementation (if applicable)
- [ ] Documentation updates identified

### Completion Validation
- [ ] All items in Definition of Done checklist met
- [ ] Task execution report generated
- [ ] Handoff document created (if needed)
- [ ] Dependencies updated for downstream tasks

---

## Example: Applying Framework to CRIT-1

Here's how to apply this framework to "Enable RLS on bingo_templates":

### 1. Dependency Graph
```
## Dependencies (CRIT-1: Enable RLS on bingo_templates)

### Blocks (Must Complete First)
- [x] None - Database exists and is accessible

### Blocked By (What This Task Blocks)
- [ ] CRIT-3: Remove test-login routes (security must be enabled first)
- [ ] Task 1: User authentication flow (templates need security)
- [ ] Task 2: Template management CRUD (templates need security)

### Critical Path?
- [x] Yes - Blocks 3 tasks and is a CRITICAL security vulnerability
```

### 2. Four-Level Acceptance Criteria

**Level 1: Code Changes**
- Created: `supabase/migrations/20260122_enable_bingo_templates_rls.sql` (60 lines)
- No application code changes required

**Level 2: Functional Outcome**
- Row-level security enabled on bingo_templates table
- Users can only access templates they own
- Unauthenticated users cannot read templates
- Database returns proper error codes for unauthorized access

**Level 3: Verification Commands**
```sql
-- Test 1: Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'bingo_templates';
-- Expected: rowsecurity = true

-- Test 2: Verify policies exist
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'bingo_templates';
-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE)

-- Test 3: Verify unauthorized access denied
SET ROLE anon;
SELECT * FROM bingo_templates;
-- Expected: 0 rows (or error)
```

**Level 4: Regression Checks**
- [ ] Existing templates remain in database
- [ ] Template API routes work with authentication
- [ ] No changes to application logic required

### 3. Complexity Assessment
**Complex (7 points)** - Security-critical, requires testing all CRUD operations, affects authentication flow

### 4. Risk Mitigation
| Risk Type | Likelihood | Impact | Mitigation | Rollback |
|-----------|------------|--------|------------|----------|
| Data Loss | Low | High | Test on dev first, no data deletion | Restore from backup |
| Breaking Change | Medium | High | Full test suite, manual API testing | Revert migration |
| Security Gap | Low | Critical | Peer review policies, test all access patterns | Emergency hotfix |

### 5. Rollback Procedure
```bash
# Revert migration
supabase migration down 20260122_enable_bingo_templates_rls

# Verify rollback
psql -c "SELECT rowsecurity FROM pg_tables WHERE tablename = 'bingo_templates';"
# Expected: rowsecurity = false
```

### 6. Ten-Step Implementation
1. ✅ Pre-implementation: Backup database, create branch
2. ✅ Read: Review existing table schema, check for existing policies
3. ✅ Write tests: SQL queries to verify RLS behavior
4. ✅ Implement: Write migration with ENABLE ROW LEVEL SECURITY + 4 policies
5. ✅ Run tests: Execute verification queries
6. ✅ Manual verification: Test API with/without auth
7. ✅ Quality checks: Review SQL syntax, check for typos
8. ✅ Documentation: Update DATABASE_CLEANUP_NEEDED.md
9. ✅ Commit: `feat(database): enable RLS on bingo_templates table (CRIT-1)`
10. ✅ Pull request: Link to issue, add security review checklist

---

## Usage Guidelines

### When to Use This Framework
- **Always** for Critical and Complex tasks
- **Recommended** for Medium tasks
- **Optional** (simplified version) for Simple tasks

### Framework Flexibility
- **Rigid sections:** Dependency Graph, Four-Level Acceptance Criteria, Definition of Done
- **Flexible sections:** Risk Mitigation (adjust based on actual risks), Rollback Procedure (match complexity)
- **Optional sections:** Agent Handoff (only when multiple agents), Dependency Chain Visualization (only for multi-task features)

### Measuring Success
A task execution scores 9-10/10 when:
- All dependencies explicitly documented
- Four-level acceptance criteria clearly defined
- Verification commands executable and documented
- Rollback procedure tested and ready
- Definition of Done checklist completed
- Task execution report generated

---

## Appendix: Common Pitfalls

### Pitfall 1: Vague Acceptance Criteria
**Bad:** "Make login work"
**Good:** "User can submit email/password, receive auth token, redirect to dashboard. Verified by: `curl -X POST /api/auth/login -d {...}` returns 200 with token."

### Pitfall 2: Missing Dependencies
**Bad:** "Create template CRUD API"
**Good:** "Create template CRUD API (Depends on: CRIT-1 RLS enabled, Task 1 User auth flow)"

### Pitfall 3: No Verification Commands
**Bad:** "Test that it works"
**Good:** "Run `pnpm test src/api/templates/__tests__`, expect 15/15 passing. Run `curl ...`, expect 200 OK."

### Pitfall 4: Unclear Rollback
**Bad:** "Revert if broken"
**Good:** "Run `supabase migration down <name>`, verify with `SELECT rowsecurity...`, redeploy app with `git revert`."

### Pitfall 5: Time Estimates
**Bad:** "This will take 2-3 hours"
**Good:** "Complexity: Medium (3-5 points). Depends on CRIT-1. Blocks Task 4 and Task 5."

---

## Document Maintenance

This framework is a living document. Update it when:
- A task reveals a missing framework element
- A rollback procedure fails (add safeguards)
- A risk wasn't anticipated (add to risk types)
- An acceptance criteria level proves insufficient (refine levels)

**Last Updated:** 2026-01-22
**Next Review:** After completing first 5 tasks using this framework
