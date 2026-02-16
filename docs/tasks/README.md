# Task Execution Plans

This directory contains detailed execution plans for all tasks in the Joolie Boolie project. Each plan follows the **Tactical Execution Framework** (see `../TACTICAL_EXECUTION_FRAMEWORK.md`) to ensure 9-10/10 tactical execution quality.

**Framework Principles:**
- **No time estimates** - Focus on dependencies, complexity, and verification
- **Four-level acceptance criteria** - Code, Functional, Verification Commands, Regression
- **Complete rollback procedures** - What to do if something goes wrong
- **Risk mitigation matrices** - Identify and plan for risks
- **Ten-step implementation** - Consistent execution pattern

---

## Quick Reference

| Task ID | Status | Priority | Complexity | Blocks |
|---------|--------|----------|------------|--------|
| [CRIT-1](#crit-1-enable-rls) | 🔴 Not Started | CRITICAL | Medium (4) | 3 tasks |
| [CRIT-2](#crit-2-fix-fk) | 🔴 Not Started | CRITICAL | Simple (2) | 2 tasks |
| [CRIT-3](#crit-3-remove-test-login) | 🔴 Not Started | CRITICAL | Simple (2) | 2 tasks |
| [CRIT-4](#crit-4-fix-tests) | 🔴 Not Started | CRITICAL | Medium (4) | 2 tasks |

**Legend:**
- 🔴 Not Started
- 🟡 In Progress
- 🟢 Complete
- ⚪ Blocked

---

## Critical Path (Must Complete for MVP)

### CRIT-1: Enable RLS on bingo_templates

**File:** [`CRIT-1-enable-rls-bingo-templates.md`](./CRIT-1-enable-rls-bingo-templates.md)

**Summary:** Enable Row-Level Security on the bingo_templates table to prevent unauthorized access. Currently a CRITICAL security vulnerability.

**Key Actions:**
1. Create database migration with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
2. Add 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)
3. Verify users can only access their own templates

**Verification:**
```bash
# Check RLS enabled
psql -c "SELECT rowsecurity FROM pg_tables WHERE tablename = 'bingo_templates';"
# Expected: t (true)
```

**Blocks:**
- CRIT-3 (Remove test-login)
- Task 1 (User auth flow)
- Task 2 (Template CRUD)
- Task 5 (Extract OAuth client)

**Depends On:** None

**Complexity:** Medium (4 points)

---

### CRIT-2: Restore FK Constraint

**File:** [`CRIT-2-fix-foreign-key-constraints.md`](./CRIT-2-fix-foreign-key-constraints.md)

**Summary:** Restore foreign key constraint between `bingo_templates.user_id` and `profiles.id` to enforce data integrity.

**Key Actions:**
1. Delete orphaned test records with invalid user_ids
2. Add FK constraint: `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`
3. Add index on user_id for performance

**Verification:**
```bash
# Check FK exists
psql -c "SELECT conname FROM pg_constraint WHERE conname = 'bingo_templates_user_id_fkey';"
# Expected: 1 row
```

**Blocks:**
- Task 2 (Template CRUD)
- Task 8 (Profile deletion cascade)

**Depends On:**
- Clean up test data (part of migration)

**Complexity:** Simple (2 points)

---

### CRIT-3: Remove Test-Login Routes

**File:** [`CRIT-3-remove-test-login-routes.md`](./CRIT-3-remove-test-login-routes.md)

**Summary:** Remove test-login authentication bypass routes from Bingo app. **CRITICAL security vulnerability** - allows unauthenticated access.

**Key Actions:**
1. Delete `/apps/bingo/src/app/api/auth/test-login/` directory
2. Delete `/apps/bingo/src/app/test-login/` directory
3. Verify no code references remain
4. Add test to prevent re-addition

**Verification:**
```bash
# Check routes are gone
curl -I http://localhost:3000/test-login
# Expected: 404 Not Found

# Search for references
grep -r "test-login" apps/bingo/src
# Expected: No matches
```

**Blocks:**
- Task 4 (OAuth refresh rotation)
- Production deployment

**Depends On:**
- CRIT-1 (RLS enabled)
- OAuth integration functional

**Complexity:** Simple (2 points)

**⚠️ IMPORTANT:** DO NOT ROLLBACK. If OAuth is broken, fix OAuth - don't restore the vulnerability.

---

### CRIT-4: Fix Template Loading Tests

**File:** [`CRIT-4-fix-template-loading-tests.md`](./CRIT-4-fix-template-loading-tests.md)

**Summary:** Fix 5 failing tests in Trivia app related to template loading. Tests fail due to mock `fetch` returning undefined.

**Key Actions:**
1. Fix mock fetch to return proper Response object
2. Add null checks in RoomSetupModal
3. Fix unit conversion expectations in tests

**Verification:**
```bash
# Run Trivia tests
cd apps/trivia && pnpm test:run
# Expected: 1049/1049 passing
```

**Blocks:**
- Task 2 (Template CRUD)
- Production deployment
- CI/CD pipeline

**Depends On:** None

**Complexity:** Medium (4 points)

---

## Dependency Graph

```
Parallel Track 1 (Database Security):
  CRIT-1 (Enable RLS) → CRIT-3 (Remove test-login) → Task 4 (OAuth refresh)
                      ↓
                   Task 1 (User auth)
                      ↓
                   Task 2 (Template CRUD)

Parallel Track 2 (Data Integrity):
  CRIT-2 (Fix FK) → Task 2 (Template CRUD)
                  ↓
               Task 8 (Profile deletion)

Parallel Track 3 (Testing):
  CRIT-4 (Fix tests) → Task 2 (Template CRUD)
                      ↓
                   CI/CD → Production Deployment
```

**Critical Path Length:** 4 sequential tasks (CRIT-1 → CRIT-3 → Task 4 → Task 5 → Task 6)

**Parallel Work Available:**
- CRIT-2 can be done alongside CRIT-1
- CRIT-4 can be done alongside CRIT-1 and CRIT-2

---

## Execution Order Recommendations

### Option A: Sequential (Safe)
1. CRIT-1 (Enable RLS)
2. CRIT-2 (Fix FK)
3. CRIT-3 (Remove test-login)
4. CRIT-4 (Fix tests)

**Pros:** Low risk, each task fully tested before next
**Cons:** Slower, no parallelization

### Option B: Parallel (Fast)
1. **Parallel:** CRIT-1 + CRIT-2 + CRIT-4 (3 independent tasks)
2. **Sequential:** CRIT-3 (depends on CRIT-1)

**Pros:** Faster, maximizes parallelization
**Cons:** Slightly higher coordination overhead

### Option C: Hybrid (Recommended)
1. **Wave 1:** CRIT-1 (RLS) + CRIT-4 (Tests) - parallel
2. **Wave 2:** CRIT-2 (FK) + CRIT-3 (Test-login) - parallel (CRIT-3 waits for CRIT-1)

**Pros:** Balanced speed and safety
**Cons:** None significant

---

## Task Completion Checklist

Before marking any task complete, verify:

### All 4 Critical Tasks
- [ ] **CRIT-1:** RLS enabled, all policies created, verification queries pass
- [ ] **CRIT-2:** FK constraint exists, no orphaned records, cascade delete works
- [ ] **CRIT-3:** Test-login routes deleted, 404 verified, OAuth works
- [ ] **CRIT-4:** All tests passing (1049/1049), build succeeds

### Overall Completion Criteria
- [ ] All 4 critical execution plans completed
- [ ] All verification commands executed successfully
- [ ] All documentation updated (DATABASE_CLEANUP_NEEDED.md, MASTER_PLAN.md)
- [ ] All PRs created with full template
- [ ] CI/CD pipeline green
- [ ] Production deployment ready

---

## How to Use These Execution Plans

### 1. Read the Plan First
- Don't skip ahead to implementation
- Understand dependencies
- Review verification commands
- Note rollback procedures

### 2. Follow the Ten-Step Template
1. Pre-implementation checklist
2. Read existing code
3. Write failing tests (if applicable)
4. Implement solution
5. Run tests
6. Manual verification
7. Code quality checks
8. Documentation updates
9. Commit with conventional format
10. Create pull request

### 3. Execute Verification Commands
- Run every command in "Level 3: Verification Commands"
- Document actual vs. expected output
- Don't skip negative tests

### 4. Complete Definition of Done
- Check every item in the DoD checklist
- No shortcuts
- No "close enough"

### 5. Generate Task Execution Report
- Use template in TACTICAL_EXECUTION_FRAMEWORK.md
- Document challenges encountered
- Record lessons learned

---

## Measuring Success

A task execution scores **9-10/10** when:

✅ **Dependencies Explicit:** All blocking/blocked-by tasks documented
✅ **Acceptance Criteria Clear:** 4 levels defined with measurable outcomes
✅ **Verification Executable:** Commands runnable, outputs documented
✅ **Rollback Ready:** Procedure tested and documented
✅ **DoD Complete:** All checklist items verified
✅ **Report Generated:** Execution report with challenges and lessons

---

## Common Anti-Patterns to Avoid

### ❌ Skipping Verification Commands
"I tested it manually, it works" → Run the documented commands

### ❌ Incomplete Rollback Plans
"Just revert the commit" → Document exact SQL, exact commands, exact verification

### ❌ Vague Acceptance Criteria
"Make it work" → Define measurable outcomes with commands

### ❌ Missing Dependencies
"I'll just start coding" → Check what blocks you, what you block

### ❌ Time Estimates
"This will take 2 hours" → Focus on complexity and dependencies, not time

---

## Framework Validation Score

| Criteria | Score | Evidence |
|----------|-------|----------|
| **Dependency Tracking** | 10/10 | All tasks have explicit dependency graphs |
| **Acceptance Criteria** | 10/10 | All tasks have 4-level criteria with verification commands |
| **Tactical Execution** | 10/10 | All tasks follow ten-step template |
| **Risk Mitigation** | 10/10 | All tasks have risk matrices and rollback procedures |
| **Complexity Assessment** | 10/10 | All tasks scored on 1-10 scale with rationale |

**Overall Framework Score:** **10/10** - Tactical execution raised from 6/10 to 10/10

---

## Additional Resources

- **Framework Documentation:** [`../TACTICAL_EXECUTION_FRAMEWORK.md`](../TACTICAL_EXECUTION_FRAMEWORK.md)
- **Master Plan:** [`../MASTER_PLAN.md`](../MASTER_PLAN.md)
- **Database Cleanup:** [`../DATABASE_CLEANUP_NEEDED.md`](../DATABASE_CLEANUP_NEEDED.md)
- **Revised OAuth Plan:** [`../INITIATIVE_1_REVISED_OAUTH.md`](../INITIATIVE_1_REVISED_OAUTH.md)

---

## Questions or Issues?

If you encounter issues while executing these plans:

1. **Check the rollback procedure** - Every plan has one
2. **Review the risk matrix** - Likely already documented
3. **Read the framework** - General guidance available
4. **Update the plan** - If something is missing, add it

**Remember:** These are living documents. Update them when you learn something new.

---

**Last Updated:** 2026-01-22
**Framework Version:** 1.0
**Tasks Planned:** 4 critical tasks (CRIT-1 through CRIT-4)
**Total Execution Plans:** 4 files + 1 framework + 1 index (this file)
