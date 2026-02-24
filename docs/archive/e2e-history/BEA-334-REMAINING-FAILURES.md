# BEA-334: Room Setup Modal E2E Test Failures

## Status: 19/26 Tests Passing (73%)

**Last Run**: 2026-01-24 19:03 PM
**Environment**: All servers running, SESSION_TOKEN_SECRET fixed

---

## ✅ Fixed (19 tests passing)

The core issue was a React state batching bug in session recovery. When localStorage was empty, the recovery hook completed so fast that `isRecovering` went from `false → true → false` in a single render cycle. The tracking state (`hasRecoveryStarted`, `recoveryAttempted`) never updated, preventing the modal from showing.

**Solution**: Added ref-based tracking with a fallback timer to ensure recovery completion is always detected.

**File**: `apps/bingo/src/app/play/page.tsx`

---

## ❌ Remaining Failures (7 tests)

### Category 1: Test Selector Issues (2 tests) - **EASY FIX**

**Priority**: High (quick wins)
**Complexity**: Trivial
**Risk**: Low

#### Tests:
1. ✘ "should generate and display 6-character session ID"
2. ✘ "should recover offline session after page refresh"

#### Root Cause:
Playwright strict mode violation - selector `getByText(/offline session/i)` matches 2 elements:
1. `<div class="text-sm text-muted-foreground mb-1">Offline Session</div>`
2. `<h3 class="text-lg font-semibold text-foreground mb-2">Offline Session ID</h3>`

#### Error:
```
Error: strict mode violation: getByText(/offline session/i) resolved to 2 elements
```

#### Fix:
Make selectors more specific:

```typescript
// ❌ BEFORE (ambiguous)
await expect(page.getByText(/offline session/i)).toBeVisible();

// ✅ AFTER (specific)
await expect(page.getByText('Offline Session', { exact: true })).toBeVisible();
// OR
await expect(page.getByRole('heading', { name: /offline session id/i })).toBeVisible();
```

#### Files to Update:
- `e2e/bingo/room-setup.spec.ts:130` (line 130)
- `e2e/bingo/room-setup.spec.ts:183` (line 183)

#### Implementation Steps:
1. Open `e2e/bingo/room-setup.spec.ts`
2. Find line 130: `await expect(page.getByText(/offline session/i)).toBeVisible();`
3. Replace with: `await expect(page.getByRole('heading', { name: /offline session id/i })).toBeVisible();`
4. Find line 183: Same replacement
5. Run tests: `pnpm test:e2e -g "should generate and display 6-character"`

---

### Category 2: Offline localStorage Persistence (1 test) - **MEDIUM FIX**

**Priority**: Medium (offline mode edge case)
**Complexity**: Low
**Risk**: Medium (may require understanding session persistence logic)

#### Test:
✘ "should persist offline session in localStorage"

#### Root Cause:
After clicking "Play Offline", the offline session is not being saved to localStorage.

#### Error:
```typescript
const sessionData = await page.evaluate((key) => localStorage.getItem(key), sessionKey);
expect(sessionData).toBeTruthy(); // ❌ Fails: sessionData is null
```

#### Investigation Needed:
1. Check when offline session data is written to localStorage
2. Verify the `useEffect` that saves offline session is triggering
3. Confirm session key format: `bingo_offline_session_${sessionId}`

#### Files to Investigate:
- `apps/bingo/src/app/play/page.tsx` (lines 244-260) - Save offline session effect
- `apps/bingo/src/lib/session/serializer.ts` - Session serialization logic

#### Expected Behavior:
```typescript
// When user clicks "Play Offline"
localStorage.setItem('bingo_offline_session_A3B7K9', JSON.stringify({
  sessionId: 'A3B7K9',
  isOffline: true,
  gameState: { /* serialized state */ },
  createdAt: '2024-01-20T12:00:00.000Z',
  lastUpdated: '2024-01-20T12:30:00.000Z',
}));
```

#### Debugging Steps:
1. Run test with `--headed` mode: `pnpm test:e2e --headed -g "should persist offline session"`
2. Open browser console during test
3. Check localStorage after clicking "Play Offline"
4. Add console.log in the save effect to confirm it runs
5. Check if `isOfflineMode` and `offlineSessionId` are set correctly

---

### Category 3: PWA Service Worker for Offline Reload (2 tests) - **HARD FIX**

**Priority**: Low (requires service worker, not available in dev mode)
**Complexity**: High (or defer until PWA build testing)
**Risk**: High (fundamental architecture change)

#### Tests:
1. ✘ "should work offline with network disconnected"
2. ✘ "should hide offline banner when network reconnects"

#### Root Cause:
Tests call `context.setOffline(true)` then `page.reload()`, which fails because:
- Dev servers (`pnpm dev`) don't register service workers
- Without service worker, offline page reloads fail with `net::ERR_INTERNET_DISCONNECTED`
- Service workers only work in production builds

#### Error:
```
Error: page.reload: net::ERR_INTERNET_DISCONNECTED
```

#### Options:

**Option A: Test Against Production Build** (RECOMMENDED)
```bash
# Build all apps
pnpm build

# Start production servers
pnpm start

# Run E2E tests against production
pnpm test:e2e
```

**Option B: Mock Service Worker in Dev Mode** (COMPLEX)
- Register mock service worker in test setup
- Intercept network requests
- Serve cached responses
- High complexity, brittle

**Option C: Skip Offline Reload Tests** (DEFER)
- Mark tests as `test.skip` for now
- Add comment explaining they require production build
- Run separately in pre-release testing

**Recommended Approach**: Option C (skip for now), run in production build before releases

#### Files to Update:
```typescript
// e2e/bingo/room-setup.spec.ts
test.skip('should work offline with network disconnected', async ({ ... }) => {
  // TODO: Requires service worker (production build only)
  // Run with: pnpm build && pnpm start && pnpm test:e2e
});
```

---

### Category 4: Offline Display Window Sync (1 test) - **MEDIUM FIX**

**Priority**: Medium (offline mode edge case)
**Complexity**: Low
**Risk**: Medium (may be related to Category 2)

#### Test:
✘ "should sync display window in offline mode"

#### Root Cause:
Display page fails to load when opened in offline mode.

#### Error:
```
Error: expect(locator).toBeVisible failed
Locator: getByText(/joolie boolie bingo/i)
Expected: visible
Timeout: 10000ms
Error: element(s) not found
```

#### Investigation Needed:
1. Check if display page URL is constructed correctly with offline session ID
2. Verify BroadcastChannel sync works in offline mode
3. Confirm display page doesn't require network requests to load

#### Files to Investigate:
- `apps/bingo/src/app/display/page.tsx` - Display page implementation
- Session sync logic for offline mode

#### Expected Behavior:
```typescript
// Presenter clicks "Open Display"
// → Opens http://localhost:3000/display?session=A3B7K9
// → Display page loads via BroadcastChannel sync (no network needed)
// → Shows "Bingo" heading
```

#### Debugging Steps:
1. Run test with `--headed`: `pnpm test:e2e --headed -g "should sync display window in offline"`
2. Check display page URL when it opens
3. Check browser console for errors
4. Verify session ID is in URL query params
5. Check if BroadcastChannel messages are being sent/received

---

### Category 5: Keyboard Focus Order (1 test) - **EASY FIX**

**Priority**: Low (accessibility refinement)
**Complexity**: Trivial
**Risk**: Low

#### Test:
✘ "room setup modal should be keyboard accessible"

#### Root Cause:
First focusable element in modal is a `<select>` (template selector), but test expects a `<button>`.

#### Error:
```typescript
const focused = await page.evaluate(() => document.activeElement?.tagName);
expect(focused).toBe('BUTTON'); // ❌ Got 'SELECT'
```

#### Root Cause Analysis:
Modal opens with focus on TemplateSelector dropdown instead of "Create New Game" button.

#### Fix Options:

**Option A: Update Test Expectation** (EASIEST)
```typescript
// Test should accept SELECT as valid first focus
expect(focused).toMatch(/BUTTON|SELECT/);
```

**Option B: Change Focus Order** (BETTER UX)
```typescript
// In RoomSetupModal.tsx, set autoFocus on Create button
<Button
  autoFocus  // ← Add this
  variant="primary"
  onClick={onCreateRoom}
>
  Create New Game
</Button>
```

**Option C: Use FocusTrap** (BEST ACCESSIBILITY)
```typescript
// Wrap modal content in focus trap
import { FocusTrap } from '@joolie-boolie/ui';

<Modal>
  <FocusTrap>
    {/* Modal content */}
  </FocusTrap>
</Modal>
```

**Recommended**: Option B (quick fix with better UX)

#### Files to Update:
- `apps/bingo/src/components/presenter/RoomSetupModal.tsx:228` (add autoFocus)
- OR `e2e/bingo/room-setup.spec.ts:471` (update expectation)

---

## Summary by Priority

### 🔴 High Priority (Quick Wins) - DO FIRST
1. ✅ **Test Selector Issues** (2 tests) - 15 minutes
   - Fix: Make selectors more specific
   - Impact: +2 tests passing → 21/26 (81%)

### 🟡 Medium Priority (Worth Fixing) - DO SECOND
2. ⚠️ **Offline localStorage Persistence** (1 test) - low complexity
   - Fix: Debug why session data isn't saving
   - Impact: +1 test passing → 22/26 (85%)

3. ⚠️ **Offline Display Window Sync** (1 test) - low complexity
   - Fix: Debug display page loading in offline mode
   - Impact: +1 test passing → 23/26 (88%)

### 🟢 Low Priority (Can Defer) - DO LAST
4. 🔵 **Keyboard Focus Order** (1 test) - 30 minutes
   - Fix: Add autoFocus or update test expectation
   - Impact: +1 test passing → 24/26 (92%)

5. ⏸️ **PWA Service Worker Tests** (2 tests) - Skip for now
   - Fix: Requires production build
   - Recommendation: Run separately before releases
   - Impact if skipped: 24/24 passing in dev mode (100%)

---

## Recommended Action Plan

### Phase 1: Immediate Fixes (30 minutes)
```bash
# Fix test selectors
# Edit e2e/bingo/room-setup.spec.ts lines 130, 183
pnpm test:e2e -g "should generate and display 6-character"
pnpm test:e2e -g "should recover offline session after page refresh"

# Result: 21/26 passing (81%)
```

### Phase 2: Offline Mode Polish
```bash
# Fix localStorage persistence
# Investigate apps/bingo/src/app/play/page.tsx
pnpm test:e2e -g "should persist offline session"

# Fix display window sync
# Investigate apps/bingo/src/app/display/page.tsx
pnpm test:e2e -g "should sync display window in offline mode"

# Result: 23/26 passing (88%)
```

### Phase 3: Polish (30 minutes)
```bash
# Fix keyboard focus
# Add autoFocus to RoomSetupModal.tsx
pnpm test:e2e -g "keyboard accessible"

# Result: 24/26 passing (92%)
```

### Phase 4: Production Build Testing (Separate Task)
```bash
# Skip PWA tests in dev mode
# Run full E2E suite against production build before releases
pnpm build && pnpm start && pnpm test:e2e

# Result: All tests passing in appropriate environments
```

---

## Integration with Parallel Workflow

### For Each Implementer Agent

```markdown
## E2E Test Checklist

Before marking task complete:

1. [ ] Start dev servers: `pnpm dev`
2. [ ] Run relevant E2E tests: `pnpm test:e2e e2e/<feature>.spec.ts`
3. [ ] All tests pass (0 failures)
4. [ ] Screenshots reviewed (no unexpected states)
5. [ ] If failures: Fix code, not tests (unless test is wrong)

**DO NOT** mark task complete if E2E tests fail.
**DO NOT** commit code with failing tests.
```

### For Spec Reviewers

```markdown
## Spec Review Checklist

1. [ ] Implementation matches requirements
2. [ ] E2E tests pass: `pnpm test:e2e e2e/<feature>.spec.ts`
3. [ ] Test coverage is adequate
4. [ ] No regressions in other tests

**REJECT** if E2E tests fail.
```

### For Quality Reviewers

```markdown
## Quality Review Checklist

1. [ ] Code quality acceptable
2. [ ] ALL E2E tests pass: `pnpm test:e2e`
3. [ ] No test warnings or flaky tests
4. [ ] Screenshots show correct UI states

**REJECT** if any E2E test fails.
```

---

## Files Reference

### Test Files
- `e2e/bingo/room-setup.spec.ts` - Room setup modal tests (26 tests)
- `e2e/fixtures/auth.ts` - Authentication fixture (SSO login)
- `e2e/utils/helpers.ts` - Test helper functions

### Source Files
- `apps/bingo/src/app/play/page.tsx` - Presenter view (session recovery logic)
- `apps/bingo/src/app/display/page.tsx` - Audience view
- `apps/bingo/src/components/presenter/RoomSetupModal.tsx` - Modal component
- `apps/bingo/src/lib/session/serializer.ts` - Session persistence

### Config Files
- `playwright.config.ts` - Playwright configuration
- `e2e/global-setup.ts` - Global test setup (env validation)
- `.env` - Environment variables for Playwright
- `apps/*/.env.local` - Environment variables for Next.js apps
