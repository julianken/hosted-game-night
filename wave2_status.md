# Wave 2 Execution Dashboard

**Last Updated**: 2026-01-23 02:02 UTC
**Coordinating Lead**: Main Session
**Target**: Complete all Wave 2 tickets for MVP readiness

---

## Summary

| Phase | Total | In Progress | In Review | Done | Blocked |
|-------|-------|-------------|-----------|------|---------|
| **2A: Critical** | 6 | 1 | 0 | 3 | 2 |
| **2B: Security** | 5 | 0 | 0 | 0 | 0 |
| **2C: Consolidation** | 3 | 0 | 0 | 0 | 0 |
| **2D: Infrastructure** | 3 | 0 | 0 | 0 | 0 |
| **TOTAL** | 17 | 1 | 0 | 3 | 2 |

---

## Wave 2A: Critical Path (ACTIVE)

### ✅ BEA-295: Enable RLS on bingo_templates
- **Status**: ✅ DONE
- **Completed**: 2026-01-23 00:25 UTC
- **Agent**: Main session (manual SQL)
- **Result**: RLS enabled, verified rowsecurity=true

### 🔄 BEA-300: Fix 32 Failing Tests (27 Bingo + 5 Trivia)
- **Status**: 🟢 IN PROGRESS (Agent-6: a706e86)
- **Priority**: CRITICAL - Blocks all PR merges (2 PRs waiting)
- **Branch**: wave2/BEA-300-fix-tests
- **PR**: https://github.com/julianken/beak-gaming-platform/pull/178
- **Linear**: https://linear.app/beak-gaming/issue/BEA-300
- **Progress**:
  - Agent-1 (ac537ea): Fixed 5/5 Trivia tests ✅ (TypeScript GameStore mocks)
  - Main session: Fixed Trivia TypeScript errors ✅ (01:48 UTC)
  - Agent-6 (a706e86): Fixed 20/25 Bingo ToastProvider tests ✅ (d75f40b @ 02:00 UTC)
  - Agent-7 (a61802d): Fixing 5 Bingo room-creation tests 🔄 (test logic issues)
- **Blocking**: PR #176 (BEA-298), PR #177 (BEA-305)

### ✅ BEA-297: Remove test-login routes
- **Status**: ✅ DONE (Main session - 00:36 UTC)
- **Priority**: CRITICAL - Security vulnerability
- **Unblocked By**: BEA-295 ✅
- **Result**: 201 lines deleted (test-login dirs removed)
- **Linear**: https://linear.app/beak-gaming/issue/BEA-297
- **Note**: Agent-2 hit permissions issue, completed by main session

### ✅ BEA-296: Restore FK constraint on bingo_templates.user_id
- **Status**: ✅ DONE (Main session - 00:42 UTC)
- **Priority**: CRITICAL - Data integrity
- **Result**: FK constraint restored, test data deleted
- **Linear**: https://linear.app/beak-gaming/issue/BEA-296
- **Note**: Agent-3 hit permissions, completed via Supabase MCP plugin

### ⚠️ BEA-298: Replace Math.random() with crypto.randomUUID()
- **Status**: ⚠️ BLOCKED (PR #176 - CI failing)
- **Priority**: CRITICAL - Security
- **PR**: https://github.com/julianken/beak-gaming-platform/pull/176
- **Branch**: wave2/BEA-298-crypto-random-main
- **Agent**: Agent-4 (completed 00:40 UTC)
- **Linear**: https://linear.app/beak-gaming/issue/BEA-298
- **Changes**: 7 additions, 1 deletion (1 file)
- **Blocker**: ❌ Build and Test failing (Trivia TypeScript errors)
- **Blocked By**: BEA-300 (must fix TypeScript errors first)

### ⚠️ BEA-305: Fix hardcoded localhost URLs
- **Status**: ⚠️ BLOCKED (PR #177 - CI failing)
- **Priority**: HIGH - Blocks deployment
- **PR**: https://github.com/julianken/beak-gaming-platform/pull/177
- **Branch**: wave2/BEA-305-fix-urls
- **Agent**: Agent-5 (completed 00:43 UTC)
- **Linear**: https://linear.app/beak-gaming/issue/BEA-305
- **Changes**: 18 additions, 16 deletions (3 files)
- **Files**: page.tsx, dashboard/page.tsx, not-found.tsx
- **Blocker**: ❌ Build and Test failing (Trivia TypeScript errors)
- **Blocked By**: BEA-300 (must fix TypeScript errors first)

---

## Wave 2B: Security Hardening (QUEUED)

### BEA-299: Implement PBKDF2 for PIN hashing
- **Status**: ⏸️ Queued - Waiting for Wave 2A completion
- **Priority**: HIGH
- **Linear**: https://linear.app/beak-gaming/issue/BEA-299

### BEA-301: Enforce SESSION_TOKEN_SECRET requirement
- **Status**: ⏸️ Queued
- **Priority**: HIGH
- **Linear**: https://linear.app/beak-gaming/issue/BEA-301

### BEA-302: Implement Redis rate limiting
- **Status**: ⏸️ Queued
- **Priority**: HIGH
- **Linear**: https://linear.app/beak-gaming/issue/BEA-302

### BEA-303: Configure CORS properly
- **Status**: ⏸️ Queued
- **Priority**: HIGH
- **Linear**: https://linear.app/beak-gaming/issue/BEA-303

### BEA-304: Add request size limits
- **Status**: ⏸️ Queued
- **Priority**: HIGH
- **Linear**: https://linear.app/beak-gaming/issue/BEA-304

---

## Wave 2C: Code Consolidation (QUEUED)

### BEA-306: Consolidate OAuth clients (-802 lines)
- **Status**: ⏸️ Queued
- **Linear**: https://linear.app/beak-gaming/issue/BEA-306

### BEA-307: Consolidate Toast components (-702 lines)
- **Status**: ⏸️ Queued
- **Linear**: https://linear.app/beak-gaming/issue/BEA-307

### BEA-308: Consolidate Button/Modal components (-500 lines)
- **Status**: ⏸️ Queued
- **Linear**: https://linear.app/beak-gaming/issue/BEA-308

---

## Wave 2D: Infrastructure (QUEUED)

### BEA-309: Set up Turborepo remote caching
- **Status**: ⏸️ Queued
- **Linear**: https://linear.app/beak-gaming/issue/BEA-309

### BEA-310: Complete Platform Hub user dashboard
- **Status**: ⏸️ Queued
- **Linear**: https://linear.app/beak-gaming/issue/BEA-310

### BEA-311: Migrate @packages/ui components
- **Status**: ⏸️ Queued
- **Linear**: https://linear.app/beak-gaming/issue/BEA-311

---

## Active Pull Requests

### PR #178: test: fix 32 failing tests (BEA-300)
- **URL**: https://github.com/julianken/beak-gaming-platform/pull/178
- **Status**: 🔄 **IN PROGRESS** - Agent-6 fixing Bingo tests
- **Changes**: Multiple commits
  - 8664ba7: Fix Trivia TypeScript errors (5 tests) ✅
  - Next: Fix Bingo ToastProvider errors (25 tests) 🔄
- **Checks**: CI failed on Bingo test failures (expected, being fixed)
- **Agent**: Agent-6 (a706e86) dispatched 01:52 UTC
- **Note**: Must merge before PRs #176 and #177 can pass CI

### PR #176: security: replace Math.random() with crypto.randomUUID() (BEA-298)
- **URL**: https://github.com/julianken/beak-gaming-platform/pull/176
- **Status**: ⚠️ **BLOCKED - CI FAILING**
- **Changes**: 7 additions, 1 deletion (1 file)
- **Checks**:
  - ❌ Build and Test: **FAILURE** (TypeScript errors in Trivia tests)
  - ✅ Vercel – bingo: Deployment completed
  - ✅ Vercel – trivia: Deployment completed
- **Error**: Trivia test TypeScript errors (pre-existing on main)
- **Blocked By**: BEA-300 (fixing test suite)
- **Agent**: Agent-4 (a33a0b2)

### PR #177: fix: replace hardcoded localhost URLs with env vars (BEA-305)
- **URL**: https://github.com/julianken/beak-gaming-platform/pull/177
- **Status**: ⚠️ **BLOCKED - CI FAILING**
- **Changes**: 18 additions, 16 deletions (3 files)
- **Checks**:
  - ❌ Build and Test: **FAILURE** (TypeScript errors in Trivia tests)
  - ✅ Vercel – bingo: Deployment completed
  - ✅ Vercel – trivia: Deployment completed
- **Error**: Same TypeScript errors as PR #176 (pre-existing on main)
- **Blocked By**: BEA-300 (fixing test suite)
- **Agent**: Agent-5 (afe3043)

---

## Blockers & Risks

### Active Blockers
- **BEA-300**: TypeScript errors in Trivia tests blocking 2 PRs (#176, #177)
  - `SaveTemplateModal.test.tsx:243` - GameStore mock incomplete
  - `TemplateSelector.test.tsx:217` - GameStore mock incomplete
  - Agent-1 actively working on fix (73.6K tokens, 24 tools used)

### Risk Mitigation
- All Wave 2A tasks are independent except BEA-297 (unblocked by BEA-295 ✅)
- Test fixes (BEA-300) prioritized first to unblock PR workflow
- Worktrees prevent branch conflicts during parallel work

---

## Coordination Notes

- **Permission Model**: Each worktree gets .claude/settings.local.json with git/pnpm permissions
- **Branch Naming**: wave2/<issueKey>-<slug>
- **Merge Policy**: Squash merge with Linear issue key in commit message
- **Review Policy**: Different agent reviews each PR + runs relevant tests
- **PR Readiness Check**: PRs must have all checks passing (Vercel builds, tests) before review request

### Execution Timeline

- **00:25 UTC**: BEA-295 completed manually (RLS enabled)
- **00:30 UTC**: Wave 2A dispatched (5 parallel agents)
  - Agent-1 (BEA-300): Fix 32 failing tests
  - Agent-2 (BEA-297): Remove test-login routes
  - Agent-3 (BEA-296): Restore FK constraint
  - Agent-4 (BEA-298): Replace Math.random()
  - Agent-5 (BEA-305): Fix hardcoded URLs
- **00:32 UTC**: All agents confirmed in progress, Linear updated

### Next Actions

1. **Wait for BEA-300 completion** - Agent-1 fixing TypeScript errors
2. **Once BEA-300 completes**:
   - Re-run CI for PR #176 and PR #177 (should pass after test fixes merge)
   - Dispatch reviewer agents for both PRs
   - Merge PRs sequentially
3. **After all Wave 2A PRs merge**: Dispatch Wave 2B (Security Hardening)
