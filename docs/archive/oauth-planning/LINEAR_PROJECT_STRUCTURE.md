# Linear Project Structure - Joolie Boolie

**Document Version:** 1.0
**Created:** 2026-01-22
**Based On:** Comprehensive 6-Agent Platform Audit
**Purpose:** Organize all work in Linear to track progress to MVP

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Initiative Structure](#2-initiative-structure)
3. [Project Organization](#3-project-organization)
4. [Issue Hierarchy](#4-issue-hierarchy)
5. [Label System](#5-label-system)
6. [Milestone Strategy](#6-milestone-strategy)
7. [Priority Schema](#7-priority-schema)
8. [Concrete Issue Examples](#8-concrete-issue-examples)
9. [Team Workflow](#9-team-workflow)
10. [Linear API/GraphQL Reference](#10-linear-apigraphql-reference)
11. [Issue Templates](#11-issue-templates)
12. [Appendix: Full Issue Catalog](#appendix-full-issue-catalog)

---

## 1. Executive Summary

### Current Platform State

| Category | Status | Issues |
|----------|--------|--------|
| **Critical Blockers** | BLOCKING | 5 issues |
| **High Priority** | Pre-Beta | 6 issues |
| **Medium Priority** | Post-Beta | 8 issues |
| **Code Duplication** | Tech Debt | 4 issues |
| **Testing Gaps** | Quality | 5 issues |
| **Feature Incomplete** | MVP | 6 issues |
| **Total** | | ~34 issues |

### Key Principles

1. **No Time Estimates** - Focus on dependencies, complexity, and completion
2. **Clear Dependency Chains** - Every issue documents what it blocks and is blocked by
3. **Actionable Issues** - Each issue completable by a single AI agent session
4. **Trackable Progress** - Visual MVP progress through milestones
5. **Right-Sized Scope** - Issues are 2-8 complexity points (not too big, not too small)

### Linear Organization Model

```
Workspace: Joolie Boolie
├── Team: BEA (Joolie Boolie Engineering)
├── Initiative: MVP Launch (Strategic)
│   ├── Project: Security Remediation (Critical)
│   ├── Project: Test Fixes (Critical)
│   ├── Project: Infrastructure (High)
│   ├── Project: Code Consolidation (Medium)
│   └── Project: Feature Completion (Medium)
└── Cycles: Not used (focus on completion, not sprints)
```

---

## 2. Initiative Structure

### Initiative: MVP Launch

**Purpose:** Track all work required for internal beta release
**Scope:** Security fixes, test fixes, infrastructure, code consolidation, feature completion
**Status Tracking:** Progress bar showing project completion percentages

#### Initiative Hierarchy

```
INITIATIVE: MVP Launch
│
├── PROJECT: Security Remediation [BLOCKING]
│   ├── Epic: Database Security (CRIT-1, CRIT-2)
│   ├── Epic: Authentication Security (CRIT-3, CRIT-5)
│   └── Epic: Infrastructure Security (HIGH-1 through HIGH-5)
│
├── PROJECT: Test Fixes [BLOCKING]
│   ├── Epic: Bingo Test Failures (27 tests)
│   └── Epic: Trivia Test Failures (5 tests)
│
├── PROJECT: Infrastructure [HIGH]
│   ├── Epic: Environment Configuration
│   └── Epic: Health & Monitoring
│
├── PROJECT: Code Consolidation [MEDIUM]
│   ├── Epic: OAuth Deduplication
│   ├── Epic: UI Component Consolidation
│   └── Epic: Toast Consolidation
│
└── PROJECT: Feature Completion [MEDIUM]
    ├── Epic: Platform Hub Dashboard
    ├── Epic: Profile Management
    └── Epic: Logout Functionality
```

---

## 3. Project Organization

### Project 1: Security Remediation

**Type:** Critical/Blocking
**Priority:** Urgent
**Dependencies:** None (first in chain)
**Blocks:** All other projects

| Epic | Issues | Severity | Status |
|------|--------|----------|--------|
| Database Security | 2 | Critical | Not Started |
| Authentication Security | 2 | Critical | Not Started |
| Infrastructure Security | 6 | High | Not Started |

**Definition of Done:**
- [ ] All 5 CRITICAL issues resolved
- [ ] All 5 HIGH issues resolved
- [ ] Security audit re-run and passing
- [ ] No new vulnerabilities introduced

---

### Project 2: Test Fixes

**Type:** Critical/Blocking
**Priority:** Urgent
**Dependencies:** None (can run parallel with Security)
**Blocks:** Feature Completion

| Epic | Issues | Tests Affected | Status |
|------|--------|----------------|--------|
| Bingo Test Failures | 4 | 27 tests | Not Started |
| Trivia Test Failures | 1 | 5 tests | Not Started |

**Definition of Done:**
- [ ] All 32 failing tests passing
- [ ] 0 skipped tests remaining
- [ ] `pnpm test:run` exits with code 0
- [ ] Coverage meets targets (80%+ lines)

---

### Project 3: Infrastructure

**Type:** High Priority
**Priority:** High
**Dependencies:** Security Remediation (partial)
**Blocks:** Production deployment

| Epic | Issues | Impact | Status |
|------|--------|--------|--------|
| Environment Configuration | 2 | Production URLs | Not Started |
| Health & Monitoring | 2 | Observability | Not Started |

**Definition of Done:**
- [ ] No hardcoded localhost URLs
- [ ] Health endpoints on all apps
- [ ] Environment variables documented
- [ ] Deployment checklist complete

---

### Project 4: Code Consolidation

**Type:** Medium Priority (Tech Debt)
**Priority:** Medium
**Dependencies:** Test Fixes (to maintain coverage)
**Blocks:** None (quality improvement)

| Epic | Issues | Lines Saved | Status |
|------|--------|-------------|--------|
| OAuth Deduplication | 2 | ~800 lines | Not Started |
| UI Component Consolidation | 2 | ~500 lines | Not Started |
| Toast Consolidation | 1 | ~700 lines | Not Started |

**Definition of Done:**
- [ ] Zero duplicate OAuth implementations
- [ ] Single source for Button, Modal, Toast
- [ ] All tests still passing
- [ ] Bundle size unchanged or reduced

---

### Project 5: Feature Completion

**Type:** Medium Priority (MVP)
**Priority:** Medium
**Dependencies:** Security Remediation, Test Fixes
**Blocks:** Beta release

| Epic | Issues | Completion | Status |
|------|--------|------------|--------|
| Platform Hub Dashboard | 2 | 45% → 100% | Not Started |
| Profile Management | 2 | 0% → 100% | Not Started |
| Logout Functionality | 3 | 0% → 100% | Not Started |

**Definition of Done:**
- [ ] Dashboard shows real user data
- [ ] Profile edit/view working
- [ ] Logout clears all sessions
- [ ] All apps have working auth flow

---

## 4. Issue Hierarchy

### Parent/Child Structure

Linear supports three levels of issue hierarchy:

```
Epic (Parent Issue)
├── Task (Child Issue)
│   └── Sub-task (Sub-issue)
└── Task (Child Issue)
    └── Sub-task (Sub-issue)
```

### When to Use Each Level

| Level | Use Case | Example |
|-------|----------|---------|
| **Epic** | Major work stream, 5+ related tasks | "Fix Database Security" |
| **Task** | Single deliverable, 1-4 hour work | "Enable RLS on bingo_templates" |
| **Sub-task** | Atomic step within task | "Write RLS policy for SELECT" |

### Dependency Types

| Relationship | Meaning | Example |
|--------------|---------|---------|
| **Blocks** | Must complete before | CRIT-1 blocks CRIT-3 |
| **Blocked By** | Cannot start until | CRIT-3 blocked by CRIT-1 |
| **Related** | Contextually connected | CRIT-1 related to CRIT-2 |
| **Duplicate** | Same issue | Merge into one |

### Issue Dependency Graph

```
CRITICAL PATH (Sequential):
CRIT-1 ─→ CRIT-3 ─→ HIGH-1 ─→ Feature Completion
   │
   └── CRIT-2 (parallel)

PARALLEL WORK AVAILABLE:
├── CRIT-4 (test fixes) - can start immediately
├── CRIT-5 (Math.random) - can start immediately
└── HIGH-4 (CORS) - can start immediately

DEPENDENCY VISUALIZATION:
┌─────────────────────────────────────────────────────────┐
│                    MVP LAUNCH                            │
├─────────────────────────────────────────────────────────┤
│ CRITICAL (BLOCKING)                                      │
│ ┌─────┐     ┌─────┐     ┌─────┐                         │
│ │CRIT1│────▶│CRIT3│────▶│HIGH1│────▶ Feature Work      │
│ └─────┘     └─────┘     └─────┘                         │
│     │                                                    │
│     ▼                                                    │
│ ┌─────┐                                                  │
│ │CRIT2│ (parallel with CRIT-1)                          │
│ └─────┘                                                  │
│                                                          │
│ PARALLEL (no dependencies)                               │
│ ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                      │
│ │CRIT4│  │CRIT5│  │HIGH4│  │HIGH5│                      │
│ └─────┘  └─────┘  └─────┘  └─────┘                      │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Label System

### Label Categories

Labels are organized into groups with consistent prefixes:

#### Severity Labels (Required)

| Label | Color | Usage |
|-------|-------|-------|
| `severity:critical` | Red (#E11D48) | Production blocking, security vulnerability |
| `severity:high` | Orange (#F97316) | Should fix before beta |
| `severity:medium` | Yellow (#EAB308) | Fix before public launch |
| `severity:low` | Gray (#6B7280) | Nice to have |

#### Type Labels (Required)

| Label | Color | Usage |
|-------|-------|-------|
| `type:bug` | Red (#DC2626) | Something is broken |
| `type:security` | Purple (#7C3AED) | Security vulnerability |
| `type:tech-debt` | Blue (#2563EB) | Code quality improvement |
| `type:feature` | Green (#16A34A) | New functionality |
| `type:test` | Teal (#0D9488) | Test-related work |
| `type:docs` | Gray (#4B5563) | Documentation |
| `type:infra` | Indigo (#4F46E5) | Infrastructure/DevOps |

#### Component Labels (Required)

| Label | Color | Usage |
|-------|-------|-------|
| `app:bingo` | Blue (#3B82F6) | Bingo app |
| `app:trivia` | Green (#22C55E) | Trivia app |
| `app:platform-hub` | Purple (#A855F7) | Platform Hub |
| `pkg:auth` | Orange (#F97316) | @joolie-boolie/auth package |
| `pkg:database` | Yellow (#EAB308) | @joolie-boolie/database package |
| `pkg:ui` | Pink (#EC4899) | @joolie-boolie/ui package |
| `pkg:sync` | Cyan (#06B6D4) | @joolie-boolie/sync package |
| `db:supabase` | Emerald (#10B981) | Database-level changes |

#### Status Labels (Optional, workflow-based)

| Label | Color | Usage |
|-------|-------|-------|
| `status:blocked` | Red (#EF4444) | Waiting on dependency |
| `status:needs-review` | Yellow (#FBBF24) | Ready for review |
| `status:needs-info` | Gray (#9CA3AF) | Missing information |
| `status:ready` | Green (#4ADE80) | Ready to work |

#### Complexity Labels (Optional)

| Label | Color | Points | Description |
|-------|-------|--------|-------------|
| `effort:trivial` | Green (#86EFAC) | 1 | Single-line or config change |
| `effort:small` | Teal (#5EEAD4) | 2-3 | Isolated change, few files |
| `effort:medium` | Blue (#93C5FD) | 4-5 | Multiple files, moderate scope |
| `effort:large` | Purple (#C4B5FD) | 6-8 | Cross-package or significant scope |
| `effort:complex` | Red (#FCA5A5) | 9-10 | Multi-session, high dependencies |

### Label Application Rules

1. **Every issue MUST have:** severity + type + at least one component
2. **Complexity labels:** Apply after scope is understood
3. **Status labels:** Updated by workflow automations
4. **Multiple components:** Apply all relevant (e.g., `app:bingo` + `pkg:sync`)

### Creating Labels via Linear MCP

```bash
# Using Claude Code with Linear MCP
"Create a label 'severity:critical' with red color #E11D48 for the BEA team"
```

---

## 6. Milestone Strategy

### Pre-MVP Milestones

Milestones track progress toward major deliverables:

#### Milestone 1: Security Clean (Blocking)

**Target:** All CRITICAL issues resolved
**Projects:** Security Remediation
**Issues:** CRIT-1, CRIT-2, CRIT-3, CRIT-4, CRIT-5

**Acceptance Criteria:**
- [ ] RLS enabled on all tables
- [ ] FK constraints restored
- [ ] Test-login routes removed
- [ ] All tests passing
- [ ] Secure random generation everywhere

**Progress Tracking:**
- 0/5 issues complete = 0%
- 5/5 issues complete = 100%

---

#### Milestone 2: Beta Ready (High Priority)

**Target:** All HIGH issues resolved
**Projects:** Security Remediation, Infrastructure
**Issues:** HIGH-1 through HIGH-6

**Acceptance Criteria:**
- [ ] PBKDF2 for PIN hashing
- [ ] SESSION_TOKEN_SECRET enforced
- [ ] Redis rate limiting (or acceptable workaround)
- [ ] CORS configured
- [ ] Request size limits
- [ ] No hardcoded URLs

**Progress Tracking:**
- 0/6 issues complete = 0%
- 6/6 issues complete = 100%

---

#### Milestone 3: Quality Bar (Medium Priority)

**Target:** Code quality and test coverage
**Projects:** Test Fixes, Code Consolidation
**Issues:** All test fixes + deduplication

**Acceptance Criteria:**
- [ ] 0 failing tests
- [ ] 0 skipped tests
- [ ] Single OAuth implementation
- [ ] Single Toast implementation
- [ ] 80%+ code coverage

**Progress Tracking:**
- Based on issue completion ratio

---

#### Milestone 4: Feature Complete (Medium Priority)

**Target:** All MVP features working
**Projects:** Feature Completion
**Issues:** Dashboard, Profile, Logout

**Acceptance Criteria:**
- [ ] Dashboard shows real data
- [ ] Profile management working
- [ ] Logout functionality complete
- [ ] All OAuth flows working

**Progress Tracking:**
- Based on issue completion ratio

---

### Post-MVP Milestones (Future)

| Milestone | Focus | Projects |
|-----------|-------|----------|
| Performance Optimization | Bundle size, load times | New project |
| Accessibility Audit | WCAG compliance | New project |
| Analytics Integration | Usage tracking | New project |
| Admin Dashboard | RBAC, management | New project |

---

## 7. Priority Schema

### Priority Levels

Linear has 5 priority levels:

| Priority | Level | Meaning | Use For |
|----------|-------|---------|---------|
| Urgent | P0 | Do immediately | Security vulnerabilities, production down |
| High | P1 | Do this cycle | Blocking issues, beta requirements |
| Medium | P2 | Do soon | Quality improvements, tech debt |
| Low | P3 | Backlog | Nice to have, future features |
| No Priority | - | Unprioritized | New issues awaiting triage |

### Severity to Priority Mapping

| Severity | Default Priority | Can Escalate To |
|----------|------------------|-----------------|
| Critical | Urgent (P0) | N/A (already highest) |
| High | High (P1) | Urgent if blocking |
| Medium | Medium (P2) | High if dependency |
| Low | Low (P3) | Medium if grouped |

### Dependency-Based Prioritization

Issues that block multiple other issues get priority bumps:

```
Blocks 0 issues → Base priority
Blocks 1-2 issues → +1 priority level
Blocks 3+ issues → +2 priority levels (max Urgent)
```

**Example:**
- CRIT-1 (RLS) blocks CRIT-3, Task 1, Task 2 → Urgent (already critical)
- HIGH-4 (CORS) blocks nothing → High (standard)
- MED-2 (Toast IDs) blocks nothing → Medium (standard)

### Priority Queries in Linear

```
# Find all urgent/critical work
priority:urgent OR (label:severity:critical)

# Find blocking issues
has:blocks

# Find blocked issues
has:blockedBy state:!completed
```

---

## 8. Concrete Issue Examples

### Example 1: Critical Security Issue

```yaml
Issue ID: CRIT-1
Title: Enable Row Level Security on bingo_templates table
Project: Security Remediation
Type: Bug/Security
Severity: Critical
Priority: Urgent (P0)
Component: db:supabase, app:bingo
Complexity: Medium (3 points)

Description: |
  ## Problem
  Row Level Security (RLS) is disabled on the `bingo_templates` table,
  allowing any user to read, modify, or delete any template.

  ## Impact
  - Data exposure: Any user can read all templates
  - Data tampering: Any user can modify any template
  - Data loss: Any user can delete any template

  ## Root Cause
  RLS was disabled during development and never re-enabled.

  ## Solution
  1. Enable RLS on table
  2. Create 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)
  3. Verify with test queries

  ## Acceptance Criteria
  - [ ] `SELECT rowsecurity FROM pg_tables WHERE tablename = 'bingo_templates'` returns `true`
  - [ ] 4 policies exist in `pg_policies`
  - [ ] Unauthenticated users cannot read templates
  - [ ] Users can only access their own templates
  - [ ] Existing templates remain accessible to owners

  ## Verification Commands
  ```sql
  -- Test 1: RLS enabled
  SELECT rowsecurity FROM pg_tables WHERE tablename = 'bingo_templates';
  -- Expected: true

  -- Test 2: Unauthorized access denied
  SET ROLE anon;
  SELECT * FROM bingo_templates;
  -- Expected: 0 rows
  ```

  ## References
  - SECURITY_AUDIT.md Section 1.1
  - DATABASE_CLEANUP_NEEDED.md
  - docs/tasks/CRIT-1-enable-rls-bingo-templates.md

Blocks:
  - CRIT-3: Remove test-login routes
  - Task: Template management CRUD
  - Task: User authentication flow

Blocked By:
  - None

Related:
  - CRIT-2: Fix foreign key constraints
```

---

### Example 2: Test Failure Issue

```yaml
Issue ID: CRIT-4
Title: Fix 27 failing Bingo tests (create-new-game, TemplateSelector, page.test, offline-mode)
Project: Test Fixes
Type: Bug/Test
Severity: Critical
Priority: Urgent (P0)
Component: app:bingo
Complexity: Medium (4 points)

Description: |
  ## Problem
  27 tests are failing in the Bingo app, blocking merge and deployment.

  ## Failing Test Groups
  | Test File | Failures | Root Cause |
  |-----------|----------|------------|
  | create-new-game tests | 8 | Mock fetch returns undefined |
  | TemplateSelector tests | ~10 | Missing Response.ok mock |
  | page.test tests | ~5 | Async rendering issues |
  | offline-mode tests | ~4 | Storage mock incomplete |

  ## Root Cause Analysis
  Mock fetch implementations return `undefined` instead of proper
  `Response` objects with `.ok` and `.json()` methods.

  ## Solution
  1. Fix mock fetch to return proper Response objects
  2. Add null checks for response objects
  3. Ensure async operations complete before assertions
  4. Fix storage mock for offline mode tests

  ## Acceptance Criteria
  - [ ] `pnpm test:run` in apps/bingo passes
  - [ ] 0 failing tests
  - [ ] 0 skipped tests
  - [ ] Coverage unchanged or improved

  ## Verification Commands
  ```bash
  cd apps/bingo
  pnpm test:run
  # Expected: All tests pass

  pnpm test:coverage
  # Expected: 80%+ line coverage
  ```

Blocks:
  - Feature completion work
  - Deployment pipeline

Blocked By:
  - None

Related:
  - CRIT-4b: Fix 5 Trivia test failures
```

---

### Example 3: Code Duplication Issue

```yaml
Issue ID: MED-1
Title: Extract duplicate OAuth client code to @joolie-boolie/auth package
Project: Code Consolidation
Type: Tech Debt
Severity: Medium
Priority: Medium (P2)
Component: app:bingo, app:trivia, pkg:auth
Complexity: Medium (4 points)

Description: |
  ## Problem
  Bingo and Trivia apps have identical OAuth client implementations
  (802 lines of duplicate code across both apps).

  ## Duplicate Files
  | Bingo | Trivia | Lines |
  |-------|--------|-------|
  | src/lib/auth/oauth-client.ts | src/lib/auth/oauth-client.ts | ~60 |
  | src/lib/auth/pkce.ts | src/lib/auth/pkce.ts | ~40 |
  | src/lib/auth/token-storage.ts | src/lib/auth/token-storage.ts | ~80 |
  | src/app/auth/callback/page.tsx | src/app/auth/callback/page.tsx | ~120 |
  | src/middleware.ts (auth parts) | src/middleware.ts (auth parts) | ~100 |

  ## Solution
  1. Create `packages/auth/src/oauth-client.ts` with shared code
  2. Parameterize app-specific values (app name, storage keys)
  3. Export from `@joolie-boolie/auth` package
  4. Update Bingo to import from package
  5. Update Trivia to import from package
  6. Delete duplicate files from apps

  ## Acceptance Criteria
  - [ ] Single OAuth client implementation in @joolie-boolie/auth
  - [ ] Bingo imports from @joolie-boolie/auth
  - [ ] Trivia imports from @joolie-boolie/auth
  - [ ] No duplicate auth files in apps
  - [ ] All OAuth tests pass
  - [ ] OAuth flow works end-to-end in both apps

  ## Lines Removed
  ~400 lines removed (keeping one copy)

  ## Verification Commands
  ```bash
  # Verify no duplicate files
  find apps -name "oauth-client.ts" -o -name "pkce.ts"
  # Expected: No results

  # Verify package exports
  grep -r "startOAuthFlow" packages/auth/src/
  # Expected: Function defined in package

  # Verify apps use package
  grep -r "@joolie-boolie/auth" apps/bingo/src/
  grep -r "@joolie-boolie/auth" apps/trivia/src/
  # Expected: Import statements found
  ```

Blocks:
  - None

Blocked By:
  - Test fixes (to maintain coverage)

Related:
  - MED-2: Toast duplication
  - MED-3: Button/Modal consolidation
```

---

### Example 4: Feature Completion Issue

```yaml
Issue ID: FEAT-1
Title: Implement logout functionality in Bingo and Trivia apps
Project: Feature Completion
Type: Feature
Severity: Medium
Priority: Medium (P2)
Component: app:bingo, app:trivia, app:platform-hub
Complexity: Medium (4 points)

Description: |
  ## Problem
  No logout functionality exists in any app. Users cannot sign out.

  ## Current State
  - No logout buttons in UI
  - No /api/auth/logout routes
  - Sessions persist indefinitely

  ## Solution
  1. Add `/api/auth/logout` route to Bingo
  2. Add `/api/auth/logout` route to Trivia
  3. Add LogoutButton component to presenter UI
  4. Clear cookies (access_token, refresh_token, user_id)
  5. Revoke session on server if applicable
  6. Redirect to home after logout

  ## Acceptance Criteria
  - [ ] Logout button visible in presenter UI (both apps)
  - [ ] Clicking logout clears all auth cookies
  - [ ] User redirected to home page
  - [ ] Subsequent visits require re-authentication
  - [ ] Session revoked on server (if applicable)

  ## Files to Create/Modify
  - `apps/bingo/src/app/api/auth/logout/route.ts` (new)
  - `apps/trivia/src/app/api/auth/logout/route.ts` (new)
  - `apps/bingo/src/components/presenter/LogoutButton.tsx` (new)
  - `apps/trivia/src/components/presenter/LogoutButton.tsx` (new)
  - `apps/bingo/src/app/play/page.tsx` (add button)
  - `apps/trivia/src/app/play/page.tsx` (add button)

  ## Verification Commands
  ```bash
  # Test logout route
  curl -X POST http://localhost:3000/api/auth/logout
  # Expected: 200 OK, Set-Cookie headers clearing tokens

  # Verify cookies cleared
  # Check browser dev tools after logout
  # Expected: access_token, refresh_token cookies removed
  ```

Blocks:
  - None

Blocked By:
  - Security Remediation (ensure auth is secure first)

Related:
  - OAuth integration
  - Session management
```

---

### Example 5: Infrastructure Issue

```yaml
Issue ID: CRIT-5
Title: Replace Math.random() with crypto.getRandomValues() for session IDs
Project: Security Remediation
Type: Security
Severity: Critical
Priority: Urgent (P0)
Component: app:bingo
Complexity: Small (2 points)

Description: |
  ## Problem
  `Math.random()` is used to generate offline session IDs in
  `apps/bingo/src/lib/sync/offline-session.ts:34`. This is predictable
  and not suitable for security contexts.

  ## Impact
  - Predictable session IDs
  - Session hijacking possible
  - Higher collision risk

  ## Current Code
  ```typescript
  const char = chars[Math.floor(Math.random() * chars.length)];
  ```

  ## Solution
  ```typescript
  const randomValues = crypto.getRandomValues(new Uint32Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
  ```

  ## Note
  PIN generation in `lib/session/secure-generation.ts` correctly uses
  `crypto.getRandomValues()`. Apply same pattern here.

  ## Acceptance Criteria
  - [ ] No `Math.random()` in session/sync code
  - [ ] `crypto.getRandomValues()` used for all ID generation
  - [ ] Existing tests pass
  - [ ] New unit tests for secure generation

  ## Verification Commands
  ```bash
  # Search for Math.random in security-sensitive code
  grep -r "Math.random" apps/*/src/lib/session/
  grep -r "Math.random" apps/*/src/lib/sync/
  # Expected: No results

  # Verify crypto usage
  grep -r "crypto.getRandomValues" apps/*/src/lib/
  # Expected: Found in offline-session.ts
  ```

Blocks:
  - None (parallel work)

Blocked By:
  - None

Related:
  - MED-2: Toast ID generation (also uses Math.random)
```

---

## 9. Team Workflow

### How AI Agents Should Use Linear

#### Creating Issues

1. **Search first** - Check if similar issue exists
2. **Use templates** - Follow issue template structure
3. **Set all required labels** - severity, type, component
4. **Document dependencies** - blocks/blocked by
5. **Link to docs** - Reference relevant documentation

```
# Example Claude Code command
"Create a Linear issue for fixing RLS on bingo_templates.
It's a critical security bug that blocks test-login removal."
```

#### Updating Issues

1. **When starting work** - Update status to "In Progress"
2. **When blocked** - Add `status:blocked` label, document blocker
3. **When complete** - Update status to "Done", add completion notes
4. **When finding related issues** - Add relationships

```
# Example Claude Code command
"Update issue BEA-123 to In Progress status"
"Mark BEA-123 as blocked by BEA-120"
"Complete issue BEA-123 with note: RLS enabled and verified"
```

#### Tracking Blockers

For blocked issues, document:

1. **What is blocked** - The issue that cannot proceed
2. **Why it's blocked** - The dependency
3. **Resolution path** - What needs to happen
4. **Resolution status** - Progress toward unblocking

```yaml
# Blocked issue comment
Status: BLOCKED
Blocked By: BEA-120 (Enable RLS)
Reason: Cannot remove test-login routes until RLS ensures
        data is protected without them.
Resolution: Complete BEA-120 first, then unblock this issue.
```

#### Representing Code Duplication Work

For deduplication tasks, document:

1. **Duplicate locations** - All files with duplicate code
2. **Lines affected** - Quantify duplication
3. **Target location** - Where consolidated code will live
4. **Migration steps** - How to update consumers

```yaml
# Duplication issue structure
Duplicate Files:
- apps/bingo/src/lib/auth/oauth.ts (60 lines)
- apps/trivia/src/lib/auth/oauth.ts (60 lines)

Consolidation Target:
- packages/auth/src/oauth-client.ts

Migration Steps:
1. Create package export
2. Update Bingo imports
3. Update Trivia imports
4. Delete duplicate files
5. Verify tests pass
```

#### Tracking Testing Gaps

For test coverage issues, document:

1. **Test file** - Where tests should live
2. **Functions/components** - What needs testing
3. **Test scope** - What needs testing
4. **Current coverage** - Baseline measurement
5. **Target coverage** - Goal percentage

```yaml
# Test gap issue structure
Test File: apps/platform-hub/src/app/api/oauth/deny/__tests__/route.test.ts
Functions to Test:
- POST handler (deny authorization)
- Error handling (invalid ID, expired, already used)
- Audit logging

Current Coverage: 0%
Target Coverage: 80%
Test Scope: Comprehensive coverage of all handler paths
```

---

## 10. Linear API/GraphQL Reference

### Useful Queries

#### Get All Issues in Project

```graphql
query ProjectIssues($projectId: String!) {
  project(id: $projectId) {
    issues {
      nodes {
        id
        identifier
        title
        state { name }
        priority
        labels { nodes { name } }
        assignee { name }
      }
    }
  }
}
```

#### Get Blocking/Blocked Issues

```graphql
query BlockingRelations($issueId: String!) {
  issue(id: $issueId) {
    id
    title
    children { nodes { id title state { name } } }
    relations {
      nodes {
        type
        relatedIssue { id title state { name } }
      }
    }
  }
}
```

#### Create Issue with Labels

```graphql
mutation CreateIssue($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue {
      id
      identifier
      title
    }
  }
}

# Variables
{
  "input": {
    "title": "Enable RLS on bingo_templates",
    "teamId": "team-id",
    "projectId": "project-id",
    "priority": 1,
    "labelIds": ["label-severity-critical", "label-type-security", "label-app-bingo"]
  }
}
```

#### Update Issue Status

```graphql
mutation UpdateIssueStatus($id: String!, $stateId: String!) {
  issueUpdate(id: $id, input: { stateId: $stateId }) {
    success
    issue {
      id
      state { name }
    }
  }
}
```

### Linear MCP Commands

```bash
# List issues in project
"List all issues in the Security Remediation project"

# Create issue
"Create issue: Enable RLS on bingo_templates, critical security, urgent priority"

# Update issue
"Move BEA-123 to In Progress"

# Add dependency
"Make BEA-123 block BEA-124"

# Query blocked issues
"Show me all blocked issues in the MVP Launch initiative"
```

---

## 11. Issue Templates

### Security Issue Template

```markdown
## Problem
[What is the security vulnerability?]

## Impact
- [Data exposure risk]
- [Data tampering risk]
- [Service availability risk]

## Root Cause
[Why does this vulnerability exist?]

## Solution
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Acceptance Criteria
- [ ] [Verifiable outcome 1]
- [ ] [Verifiable outcome 2]
- [ ] [Verifiable outcome 3]

## Verification Commands
```bash
# Command to verify fix
```

## References
- [Link to security audit]
- [Link to relevant docs]
```

### Test Fix Template

```markdown
## Problem
[X] tests are failing in [location].

## Failing Tests
| Test File | Failures | Root Cause |
|-----------|----------|------------|
| [file] | [count] | [cause] |

## Root Cause Analysis
[Why are these tests failing?]

## Solution
1. [Fix step 1]
2. [Fix step 2]

## Acceptance Criteria
- [ ] `pnpm test:run` passes
- [ ] 0 failing tests
- [ ] 0 skipped tests
- [ ] Coverage unchanged or improved

## Verification Commands
```bash
pnpm test:run
# Expected: All tests pass
```
```

### Code Duplication Template

```markdown
## Problem
[X] lines of duplicate code exist across [locations].

## Duplicate Files
| Location A | Location B | Lines |
|------------|------------|-------|
| [path] | [path] | [count] |

## Consolidation Target
[Where will the single implementation live?]

## Solution
1. Create consolidated implementation
2. Update imports in [App A]
3. Update imports in [App B]
4. Delete duplicate files
5. Verify tests pass

## Acceptance Criteria
- [ ] Single implementation exists
- [ ] All consumers use consolidated code
- [ ] No duplicate files remain
- [ ] All tests pass

## Lines Removed
~[X] lines

## Verification Commands
```bash
# Verify no duplicates
find apps -name "[filename]"
# Expected: No results in apps
```
```

### Feature Template

```markdown
## Description
[What feature is being added?]

## Current State
[What exists today?]

## Target State
[What should exist after completion?]

## Solution
1. [Implementation step 1]
2. [Implementation step 2]
3. [Implementation step 3]

## Files to Create/Modify
- [path] (new/modify)
- [path] (new/modify)

## Acceptance Criteria
- [ ] [User-facing outcome 1]
- [ ] [User-facing outcome 2]
- [ ] [User-facing outcome 3]

## Verification Commands
```bash
# How to verify feature works
```
```

---

## Appendix: Full Issue Catalog

### Critical Issues (BLOCKING)

| ID | Title | Severity | Type | Component | Blocks |
|----|-------|----------|------|-----------|--------|
| CRIT-1 | Enable RLS on bingo_templates | Critical | Security | db:supabase | CRIT-3, features |
| CRIT-2 | Restore FK constraint on user_id | Critical | Security | db:supabase | features |
| CRIT-3 | Remove test-login routes | Critical | Security | app:bingo | features |
| CRIT-4 | Fix 32 failing tests | Critical | Test | app:bingo, app:trivia | deployment |
| CRIT-5 | Replace Math.random() for session IDs | Critical | Security | app:bingo | none |

### High Priority Issues (PRE-BETA)

| ID | Title | Severity | Type | Component | Blocks |
|----|-------|----------|------|-----------|--------|
| HIGH-1 | Implement PBKDF2 for PIN hashing | High | Security | pkg:database | none |
| HIGH-2 | Enforce SESSION_TOKEN_SECRET | High | Security | all apps | none |
| HIGH-3 | Implement Redis rate limiting | High | Security | app:platform-hub | none |
| HIGH-4 | Configure CORS middleware | High | Security | all apps | none |
| HIGH-5 | Add request size limits | High | Security | all apps | none |
| HIGH-6 | Fix hardcoded localhost URLs | High | Infra | app:platform-hub | deployment |

### Medium Priority Issues (POST-BETA)

| ID | Title | Severity | Type | Component | Blocks |
|----|-------|----------|------|-----------|--------|
| MED-1 | Extract OAuth to @joolie-boolie/auth | Medium | Tech Debt | pkg:auth | none |
| MED-2 | Consolidate Toast component | Medium | Tech Debt | pkg:ui | none |
| MED-3 | Consolidate Button/Modal | Medium | Tech Debt | pkg:ui | none |
| MED-4 | Complete Platform Hub dashboard | Medium | Feature | app:platform-hub | none |
| MED-5 | Implement profile management | Medium | Feature | app:platform-hub | none |
| MED-6 | Implement logout functionality | Medium | Feature | all apps | none |
| MED-7 | Add aria-busy to package Button | Medium | Accessibility | pkg:ui | none |
| MED-8 | Replace console.log with logger | Medium | Tech Debt | all apps | none |

### Test Coverage Issues

| ID | Title | Severity | Type | Component | Tests Needed |
|----|-------|----------|------|-----------|--------------|
| TEST-1 | OAuth deny route tests | High | Test | app:platform-hub | ~70 |
| TEST-2 | Session endpoint tests | High | Test | all apps | ~150 |
| TEST-3 | Trivia template [id] tests | Medium | Test | app:trivia | ~100 |
| TEST-4 | Error recovery tests | Medium | Test | all apps | ~50 |
| TEST-5 | E2E OAuth flow tests | Medium | Test | all apps | ~20 |

---

## Document Metadata

**Created:** 2026-01-22
**Author:** Comprehensive Platform Audit
**Status:** Draft - Ready for Implementation
**Next Review:** After milestone completion

**Related Documents:**
- `docs/MASTER_PLAN.md` - Overall architecture and status
- `docs/SECURITY_AUDIT.md` - Security issue details
- `docs/TEST_PLAN.md` - Testing strategy
- `docs/TACTICAL_EXECUTION_FRAMEWORK.md` - Task execution methodology
- `docs/tasks/*.md` - Individual task breakdowns

**Change Log:**
- 2026-01-22: Initial creation based on 6-agent audit results
