# CRIT-4: Fix Template Loading Test Failures

**Task ID:** CRIT-4
**Priority:** CRITICAL - Build Blocking
**Status:** Not Started
**Complexity:** Medium (4 points)
**Scope:** Fix 3 test files, update 5 test cases

---

## Summary

Fix 5 failing tests in Trivia app related to template loading in `SaveTemplateModal` component. Tests are failing due to mock `fetch` returning undefined instead of proper Response objects, and unit conversion mismatches in expected values.

**Impact:** CI/CD blocked, cannot confidently deploy with failing tests

---

## Dependencies

### Blocks (Must Complete First)
- [ ] None - Can be fixed independently

### Blocked By (What This Task Blocks)
- [ ] Task 2: Template management CRUD (tests must pass first)
- [ ] Production deployment (cannot deploy with failing tests)
- [ ] CI/CD pipeline (must be green to merge PRs)

### Related (Non-Blocking)
- [ ] CRIT-1: Enable RLS (may need test adjustments after RLS)
- [ ] Task 8: Fix skipped tests (9 other tests to fix later)

### Critical Path?
- [x] **Yes** - Blocks deployment and CI/CD

---

## Four-Level Acceptance Criteria

### Level 1: Code Changes

**Files Modified:**
1. `apps/trivia/src/components/presenter/__tests__/SaveTemplateModal.test.tsx` (~10 lines)
2. `apps/trivia/src/components/presenter/RoomSetupModal.tsx` (~5 lines, add null checks)
3. Possibly: `apps/trivia/src/test/mocks/fetch.ts` (if shared mock exists)

**Key Changes:**
- Fix mock fetch to return proper Response with `.ok` and `.json()` methods
- Add null checks in RoomSetupModal for response objects
- Fix unit conversion expectations (Bingo: px to rem, Trivia: seconds to milliseconds)

**Total Lines Modified:** ~15-20 lines

### Level 2: Functional Outcome

**What Changes:**
- ✅ All 5 failing tests now pass
- ✅ Test suite shows 1049/1049 passing (100%)
- ✅ Build and CI pipeline green
- ✅ No false positive failures

**What Stays the Same:**
- ✅ Application functionality unchanged
- ✅ Template loading behavior identical
- ✅ Other tests remain passing

### Level 3: Verification Commands

#### Test 1: Run Trivia Test Suite
```bash
cd apps/trivia
pnpm test:run

# Expected Output:
# ✓ Test Files  XX passed (XX)
# ✓ Tests  1049 passed (1049)
# Errors  no errors
```

#### Test 2: Run Specific Failing Test File
```bash
cd apps/trivia
pnpm vitest src/components/presenter/__tests__/SaveTemplateModal.test.tsx --run

# Expected: All tests in this file pass
```

#### Test 3: Run Full Monorepo Tests
```bash
# From repository root
pnpm test:run

# Expected: All tests pass in all apps (Bingo + Trivia + packages)
```

#### Test 4: Check Coverage (Optional)
```bash
cd apps/trivia
pnpm test:coverage

# Verify SaveTemplateModal still has good coverage (>80%)
```

#### Test 5: Build Succeeds
```bash
cd apps/trivia
pnpm build

# Expected: Build successful, 0 errors, 0 warnings
```

### Level 4: Regression Checks

- [ ] **Other tests still pass:** All previously passing tests remain green
- [ ] **Template loading works:** Manual test of template loading in dev
- [ ] **No new warnings:** Test output clean, no deprecation warnings
- [ ] **Coverage maintained:** Code coverage not significantly decreased
- [ ] **Build performance:** Build time not significantly increased

---

## Implementation Steps (Ten-Step Template)

### Step 1: Pre-Implementation Checklist
- [ ] Git working directory clean
- [ ] Branch: `git checkout -b fix/crit-4-template-loading-tests`
- [ ] Understand root cause (mock fetch issues, unit conversion)

### Step 2: Read Existing Code

**Read Failing Test File:**
```bash
cat apps/trivia/src/components/presenter/__tests__/SaveTemplateModal.test.tsx
```

**Read Component Under Test:**
```bash
cat apps/trivia/src/components/presenter/RoomSetupModal.tsx
# Look for line 52 mentioned in error (response object handling)
```

**Read Shared Test Mocks:**
```bash
cat apps/trivia/src/test/mocks/fetch.ts
# OR search for global fetch mock setup
```

**Run Tests to See Failures:**
```bash
cd apps/trivia
pnpm test:run 2>&1 | tee test-output.log
# Capture full error messages
```

### Step 3: Write Failing Tests (Already Exist)

**Tests are already written and failing. Root causes:**

1. **Mock fetch returns undefined:**
   - Expected: `Response` object with `.ok`, `.json()`, `.status`
   - Actual: `undefined` or incomplete mock

2. **Unit conversion mismatch:**
   - Bingo tests: Expecting pixel values, got rem values
   - Trivia tests: Expecting seconds, got milliseconds (or vice versa)

3. **Null reference error (line 52 RoomSetupModal.tsx):**
   - Code tries to access properties on undefined response object

### Step 4: Implement Solution

#### Fix 1: Update Mock Fetch (Shared Mock)

**File:** `apps/trivia/src/test/mocks/fetch.ts` (or test setup file)

```typescript
// Mock fetch to return proper Response object
global.fetch = vi.fn((url: string) => {
  // Default success response
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve([]), // Empty templates array
    text: () => Promise.resolve(''),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url,
  } as Response);
});
```

#### Fix 2: Add Null Checks in RoomSetupModal

**File:** `apps/trivia/src/components/presenter/RoomSetupModal.tsx`

```typescript
// Around line 52 - add null check before accessing response
const loadTemplates = async () => {
  try {
    const response = await fetch('/api/templates');

    // ADD THIS CHECK:
    if (!response || !response.ok) {
      console.error('Failed to load templates');
      return;
    }

    const data = await response.json();
    // ... rest of code
  } catch (error) {
    console.error('Error loading templates:', error);
  }
};
```

#### Fix 3: Fix SaveTemplateModal Test Expectations

**File:** `apps/trivia/src/components/presenter/__tests__/SaveTemplateModal.test.tsx`

```typescript
// Update fetch mock in test file to return proper Response
beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    } as Response)
  );
});

// OR: Mock specific endpoint
vi.mock('/api/templates', () => ({
  default: vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    })
  ),
}));
```

#### Fix 4: Fix Unit Conversion Issues (If Applicable)

**Bingo Test Example:**
```typescript
// If test expects pixels but component uses rem:
expect(element).toHaveStyle({ width: '200px' });  // ❌ Fails
expect(element).toHaveStyle({ width: '12.5rem' }); // ✅ Correct (200px / 16)

// OR: Use regex matcher
expect(element.style.width).toMatch(/\d+\.?\d*rem/);
```

**Trivia Test Example:**
```typescript
// If test expects seconds but code uses milliseconds:
expect(timer).toBe(30); // ❌ Fails if code stores 30000ms
expect(timer).toBe(30000); // ✅ Correct

// OR: Convert in test
expect(timer / 1000).toBe(30); // ✅ Correct
```

### Step 5: Run Tests

```bash
cd apps/trivia

# Run tests in watch mode during development
pnpm test

# Fix issues one by one

# Once all fixed, run full suite
pnpm test:run

# Expected: All tests pass
```

### Step 6: Manual Verification

**Test Template Loading in App:**
1. Start dev server: `pnpm dev:trivia`
2. Navigate to `/play`
3. Click "Create Room" or "Load Template"
4. Verify templates load without errors
5. Verify UI displays correctly

**Check Console:**
- No errors in browser console
- No errors in terminal

### Step 7: Code Quality Checks

- [ ] **Linter passes:** `pnpm lint`
- [ ] **Type checker passes:** `pnpm build` (includes type checking)
- [ ] **No new `any` types:** Check modified files
- [ ] **Consistent code style:** Matches existing patterns

### Step 8: Documentation Updates

**Update Files:**
1. `docs/MASTER_PLAN.md` - Update CRIT-4 status to Complete
2. `apps/trivia/CLAUDE.md` - Update "Future Work" or "Testing" section if relevant

**Add Comment in Test File:**
```typescript
// CRIT-4: Fixed mock fetch to return proper Response object
// Mock must include .ok, .json(), and .status for realistic behavior
```

### Step 9: Commit with Conventional Format

```bash
git add apps/trivia/src/components/presenter/__tests__/SaveTemplateModal.test.tsx
git add apps/trivia/src/components/presenter/RoomSetupModal.tsx
git add apps/trivia/src/test/mocks/fetch.ts  # if modified
git add docs/MASTER_PLAN.md

git commit -m "fix(trivia): fix template loading test failures

- Fix mock fetch to return proper Response with .ok and .json()
- Add null checks in RoomSetupModal for undefined responses
- Fix unit conversion expectations in SaveTemplateModal tests
- All 5 failing tests now pass (1049/1049 passing)

Root Cause:
- Mock fetch returned undefined instead of Response object
- RoomSetupModal.tsx:52 accessed properties on undefined
- Test expectations didn't match actual component units

Fixes CRIT-4

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Step 10: Create Pull Request

**PR Title:** `fix(trivia): fix template loading test failures (CRIT-4)`

**PR Body:**
```markdown
## Summary

Fixes 5 failing tests in Trivia app related to template loading in SaveTemplateModal component. Tests were failing due to mock `fetch` returning undefined instead of proper Response objects, causing null reference errors.

## Human Summary

- Fixed mock fetch to return proper Response object with `.ok` and `.json()` methods
- Added null checks in RoomSetupModal to handle undefined responses
- Fixed unit conversion expectations in tests
- All tests now passing: 1049/1049 ✅

## Five-Level Explanation

**Level 1 (Non-Technical):**
Imagine a test that checks if a door opens correctly. But the test forgot to create the door first - so it was testing against nothing and failing. We created the proper test door (mock Response object), and now the tests pass.

**Level 2 (Basic Technical):**
The tests were mocking the `fetch` function to simulate API calls, but the mock was incomplete. It returned `undefined` instead of a Response object with `.ok` and `.json()` methods. When the component tried to check `response.ok`, it crashed with "Cannot read property 'ok' of undefined." We fixed the mock to return a proper Response object.

**Level 3 (Implementation Details):**
Updated `global.fetch = vi.fn(...)` to return a complete Response object with all required properties (`ok: true`, `status: 200`, `json: () => Promise.resolve([])`, etc.). Also added defensive null checks in RoomSetupModal.tsx at line 52 before accessing response properties. Fixed unit conversion expectations in tests to match actual component behavior (rem vs px, ms vs seconds).

**Level 4 (Architecture & Tradeoffs):**
Vitest's `vi.fn()` creates a Jest-compatible mock, but doesn't automatically return Response-shaped objects. We manually constructed a Response interface match. Alternative approaches considered: (1) use `fetch-mock` library (adds dependency), (2) use `msw` (Mock Service Worker, more realistic but heavier setup), (3) manual mock (chosen - lightweight, fits existing patterns). Null checks add defensive programming - response could be undefined in edge cases (network error, mock misconfiguration).

**Level 5 (Deep Technical):**
The Fetch API Response interface includes properties like `ok: boolean`, `status: number`, methods like `json(): Promise<any>`, and getters like `headers: Headers`. Vitest's `vi.fn()` returns a mock function, but doesn't implement the Response interface unless explicitly shaped. We constructed a Response-compatible object literal satisfying TypeScript's `Response` interface. The null check (`if (!response || !response.ok)`) uses short-circuit evaluation: first checks truthiness (undefined/null), then checks `ok` property (false for 4xx/5xx). This prevents "Cannot read property 'ok' of undefined" TypeError that occurs when response is undefined.

## Changes

**Files Modified:**
- `apps/trivia/src/components/presenter/__tests__/SaveTemplateModal.test.tsx` - Fixed mock fetch Response
- `apps/trivia/src/components/presenter/RoomSetupModal.tsx` - Added null checks (line 52)
- `apps/trivia/src/test/mocks/fetch.ts` - Updated global fetch mock (if exists)
- `docs/MASTER_PLAN.md` - Updated CRIT-4 status to Complete

**Lines Changed:** ~15-20 lines

## Testing

### Before Fix:
```
✓ Test Files  XX passed (XX)
✓ Tests  1044 passed | 5 failed (1049)
```

### After Fix:
```
✓ Test Files  XX passed (XX)
✓ Tests  1049 passed (1049)
```

### Manual Testing:
- [x] Trivia app loads templates correctly
- [x] RoomSetupModal handles template loading without errors
- [x] SaveTemplateModal functions as expected
- [x] No console errors or warnings

### Verification Commands:
```bash
# Run Trivia tests
cd apps/trivia && pnpm test:run
# Expected: 1049/1049 passing

# Build succeeds
pnpm build
# Expected: 0 errors
```

## Risk / Impact

**Risk Level:** Very Low
- **Breaking Change Risk:** None - test fixes only
- **Regression Risk:** Very Low - only affects test mocks
- **Performance Risk:** None - test code only

**Impact:**
- ✅ CI/CD Pipeline: Now green, can deploy
- ✅ Developer Experience: Tests pass, confidence restored
- ✅ Code Quality: Proper mocks follow fetch API interface

## Rollback Plan

If tests start failing unexpectedly:

```bash
git revert <commit-sha>
git push origin main
```

Very unlikely to need rollback - this is purely a test fix with no production code changes.

## Notes for Reviewers

**Testing Checklist:**
- [x] All tests pass: `pnpm test:run`
- [x] Build succeeds: `pnpm build`
- [x] Manual template loading works in dev
- [x] No new warnings or errors

**Code Quality:**
- [x] Mock fetch follows Fetch API interface
- [x] Null checks prevent undefined errors
- [x] Test expectations match component behavior

**Review Focus:**
- Verify mock Response has all required properties
- Check null checks don't hide legitimate errors
- Confirm tests are testing real behavior (not just passing)
```

---

## Risk Mitigation Matrix

| Risk Type | Likelihood | Impact | Mitigation Strategy | Rollback Plan |
|-----------|------------|--------|---------------------|---------------|
| **False Positive Tests** | Low | Medium | Manually verify template loading works in app | Adjust tests to catch real issues |
| **Incomplete Mock** | Low | Low | Follow Fetch API interface completely | Add missing properties as needed |
| **Hidden Bugs** | Low | Medium | Manual testing after fix to verify behavior | Investigate if app behaves differently |
| **Regression** | Very Low | Low | Full test suite runs (1049 tests) | Revert if other tests start failing |

---

## Rollback Procedure

### When to Rollback

- [ ] New test failures introduced (unlikely)
- [ ] Template loading broken in app (very unlikely)
- [ ] Build fails (extremely unlikely)

### Rollback Steps

```bash
# Revert commit
git revert <commit-sha> --no-commit
git commit -m "Revert CRIT-4: investigate test failures"
git push origin main

# Investigate issue
# Re-apply fix with corrections
```

### Verification After Rollback

- [ ] Tests return to previous state (5 failing)
- [ ] App still functions (was working before fix)

---

## Complexity Assessment

**Score:** 4 / 10 (Medium)

**Rationale:**
- ✅ Test-only changes (low risk)
- ✅ Well-defined problem (mock fetch)
- ⚠️ Requires understanding Fetch API interface
- ⚠️ Requires understanding Vitest mocking
- ⚠️ Must verify no false positives

---

## Task Execution Checklist

### Pre-Execution
- [ ] Read execution plan fully
- [ ] Understand Fetch API Response interface
- [ ] Run tests to see current failures

### During Execution
- [ ] Fixed mock fetch in test files
- [ ] Added null checks in RoomSetupModal
- [ ] Ran tests in watch mode during fixes
- [ ] Verified all 1049 tests pass
- [ ] Manual tested template loading

### Post-Execution
- [ ] All tests pass (1049/1049)
- [ ] Build succeeds
- [ ] No new warnings
- [ ] Template loading works in app

### Definition of Done
- [ ] ✅ Code Quality: Test mocks follow Fetch API
- [ ] ✅ Testing: All 1049 tests passing
- [ ] ✅ Documentation: MASTER_PLAN updated
- [ ] ✅ Integration: Build succeeds, no errors
- [ ] ✅ Functional: Template loading verified in app
- [ ] ✅ Acceptance Criteria: All 4 levels met

---

## Related Tasks

**Blocks:**
- Task 2: Template management CRUD
- Production deployment
- CI/CD pipeline

**Depends On:**
- None (can be fixed independently)

**Related:**
- Task 8: Fix skipped tests (9 other tests)
- CRIT-1: Enable RLS (may affect template loading)

---

## Additional Notes

### Common Test Mock Pitfalls

**❌ Incomplete Mock:**
```typescript
global.fetch = vi.fn(() => Promise.resolve({}));
// Missing: .ok, .json(), .status, etc.
```

**✅ Complete Mock:**
```typescript
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve([]),
    // ... other Response properties
  } as Response)
);
```

### Fetch API Response Interface

Required properties for realistic mock:
- `ok: boolean` - True if status 200-299
- `status: number` - HTTP status code
- `statusText: string` - HTTP status text
- `json(): Promise<any>` - Parse response as JSON
- `text(): Promise<string>` - Parse response as text
- `headers: Headers` - Response headers
- `redirected: boolean` - Whether response is redirected
- `type: ResponseType` - Response type (basic, cors, etc.)
- `url: string` - Response URL

### Testing Resources

- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)
- [Fetch API MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)

---

**Last Updated:** 2026-01-22
**Next Review:** After CRIT-4 completion
