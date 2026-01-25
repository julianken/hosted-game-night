# Linear Issues Proposal: E2E Test Fixes (BEA-334 Follow-up)

## Context

BEA-334 fixed the core issue (modal not showing). Now **19/26 tests pass (73%)**.

The remaining **7 failures** can be parallelized across multiple agents. Each issue below is independent and can be worked on simultaneously in separate worktrees.

---

## Issue 1: Fix E2E Test Selector Ambiguity (Offline Session)

**Priority**: Urgent (Quick Win)
**Effort**: 15 minutes
**Complexity**: Simple
**Blockers**: None

**Team**: E2E Testing
**Labels**: `e2e`, `testing`, `quick-win`, `bingo`

### Description

Two E2E tests fail due to strict mode selector violations. The selector `getByText(/offline session/i)` matches multiple elements on the page.

### Acceptance Criteria

- [ ] Test "should generate and display 6-character session ID" passes
- [ ] Test "should recover offline session after page refresh" passes
- [ ] No other tests regress
- [ ] E2E tests run locally and pass: `pnpm exec playwright test -g "offline session"`

### Technical Details

**Root Cause**: Ambiguous selector matches 2 elements:
1. `<div class="text-sm text-muted-foreground mb-1">Offline Session</div>`
2. `<h3 class="text-lg font-semibold text-foreground mb-2">Offline Session ID</h3>`

**Fix**:
```typescript
// File: e2e/bingo/room-setup.spec.ts

// Line 130 - Change from:
await expect(page.getByText(/offline session/i)).toBeVisible();

// To:
await expect(page.getByRole('heading', { name: /offline session id/i })).toBeVisible();

// Line 183 - Same change
await expect(page.getByRole('heading', { name: /offline session id/i })).toBeVisible();
```

**Files to Modify**:
- `e2e/bingo/room-setup.spec.ts` (lines 130, 183)

**Testing Commands**:
```bash
# Start dev servers
pnpm dev

# Run affected tests
pnpm exec playwright test -g "should generate and display 6-character session ID"
pnpm exec playwright test -g "should recover offline session after page refresh"

# Verify no regressions
pnpm exec playwright test e2e/bingo/room-setup.spec.ts
```

**Expected Result**: 21/26 tests passing (81%)

**Reference**: `docs/BEA-334-REMAINING-FAILURES.md` - Category 1

---

## Issue 2: Fix Offline Session localStorage Persistence

**Priority**: High
**Effort**: 1-2 hours
**Complexity**: Medium
**Blockers**: None (independent of other issues)

**Team**: E2E Testing
**Labels**: `e2e`, `testing`, `offline-mode`, `bingo`, `persistence`

### Description

When user clicks "Play Offline", the offline session is created but not persisted to localStorage. After clicking "Play Offline", `localStorage.getItem('bingo_offline_session_${sessionId}')` returns `null`.

### Acceptance Criteria

- [ ] Test "should persist offline session in localStorage" passes
- [ ] Offline session data is saved after clicking "Play Offline"
- [ ] Session data includes: `sessionId`, `isOffline`, `gameState`, `createdAt`, `lastUpdated`
- [ ] Session recovers after page refresh
- [ ] E2E tests run locally and pass: `pnpm exec playwright test -g "persist offline session"`

### Technical Details

**Root Cause**: The `useEffect` that saves offline session to localStorage may not be triggering correctly.

**Investigation Steps**:
1. Check if `isOfflineMode` and `offlineSessionId` states are set when "Play Offline" is clicked
2. Verify the save effect at `apps/bingo/src/app/play/page.tsx:244-260` is running
3. Add console.log to confirm effect runs and data is written
4. Check session key format: `bingo_offline_session_${sessionId}`

**Expected localStorage Data**:
```json
{
  "sessionId": "A3B7K9",
  "isOffline": true,
  "gameState": {
    "calledBalls": [],
    "status": "idle",
    "pattern": null
  },
  "createdAt": "2024-01-20T12:00:00.000Z",
  "lastUpdated": "2024-01-20T12:00:00.000Z"
}
```

**Files to Investigate**:
- `apps/bingo/src/app/play/page.tsx` (lines 244-260) - Save offline session effect
- `apps/bingo/src/lib/session/serializer.ts` - Session serialization logic
- `e2e/bingo/room-setup.spec.ts` (test at line 142)

**Testing Commands**:
```bash
# Start dev servers
pnpm dev

# Run affected test
pnpm exec playwright test -g "should persist offline session in localStorage"

# Debug with headed mode
pnpm exec playwright test --headed -g "should persist offline session"

# Verify no regressions
pnpm exec playwright test e2e/bingo/room-setup.spec.ts
```

**Expected Result**: 22/26 tests passing (85%)

**Reference**: `docs/BEA-334-REMAINING-FAILURES.md` - Category 2

---

## Issue 3: Fix Offline Display Window Sync

**Priority**: High
**Effort**: 1-2 hours
**Complexity**: Medium
**Blockers**: None (independent of other issues)

**Team**: E2E Testing
**Labels**: `e2e`, `testing`, `offline-mode`, `bingo`, `sync`, `dual-screen`

### Description

When in offline mode, clicking "Open Display" should open the audience display window synchronized via BroadcastChannel. Currently, the display page fails to load - the "Beak Bingo" heading is not found.

### Acceptance Criteria

- [ ] Test "should sync display window in offline mode" passes
- [ ] Display window opens when "Open Display" clicked in offline mode
- [ ] Display page shows "Beak Bingo" heading
- [ ] Display URL contains offline session ID: `http://localhost:3000/display?session=A3B7K9`
- [ ] BroadcastChannel sync works in offline mode
- [ ] E2E tests run locally and pass: `pnpm exec playwright test -g "sync display window in offline"`

### Technical Details

**Root Cause**: Display page may be failing to load in offline mode, possibly due to:
- Missing session ID in URL query params
- BroadcastChannel not initialized in offline mode
- Display page making network requests that fail

**Investigation Steps**:
1. Check display page URL when opened in offline mode
2. Verify session ID is passed as query param: `?session=${offlineSessionId}`
3. Check browser console for errors when display opens
4. Verify BroadcastChannel messages are sent from presenter to display
5. Confirm display page doesn't require network requests to load

**Expected Behavior**:
```
1. User clicks "Play Offline" on presenter page
2. Offline session created with ID "A3B7K9"
3. User clicks "Open Display"
4. New window opens: http://localhost:3000/display?session=A3B7K9
5. Display page syncs via BroadcastChannel (no network needed)
6. Display shows "Beak Bingo" heading
```

**Files to Investigate**:
- `apps/bingo/src/app/display/page.tsx` - Display page implementation
- `apps/bingo/src/app/play/page.tsx` - Where "Open Display" button opens window
- `packages/sync/src/use-sync.ts` - BroadcastChannel sync hook
- `e2e/bingo/room-setup.spec.ts` (test at line 354)

**Testing Commands**:
```bash
# Start dev servers
pnpm dev

# Run affected test
pnpm exec playwright test -g "should sync display window in offline mode"

# Debug with headed mode
pnpm exec playwright test --headed -g "sync display window in offline"

# Verify no regressions
pnpm exec playwright test e2e/bingo/room-setup.spec.ts
```

**Expected Result**: 23/26 tests passing (88%)

**Reference**: `docs/BEA-334-REMAINING-FAILURES.md` - Category 4

---

## Issue 4: Fix Room Setup Modal Keyboard Focus Order

**Priority**: Medium (Accessibility Polish)
**Effort**: 30 minutes
**Complexity**: Simple
**Blockers**: None (independent of other issues)

**Team**: E2E Testing
**Labels**: `e2e`, `testing`, `a11y`, `accessibility`, `bingo`, `quick-win`

### Description

When room setup modal opens, the first focused element is a `<select>` (template selector) instead of a `<button>` as the test expects. This is a minor accessibility issue - primary actions (buttons) should receive focus before secondary controls (dropdowns).

### Acceptance Criteria

- [ ] Test "room setup modal should be keyboard accessible" passes
- [ ] Modal opens with focus on "Create New Game" button (primary action)
- [ ] Tab order is logical: Create → Join → Play Offline
- [ ] E2E tests run locally and pass: `pnpm exec playwright test -g "keyboard accessible"`

### Technical Details

**Root Cause**: Modal doesn't set explicit focus on the primary action button when it opens.

**Fix Option A** (Recommended - Better UX):
```typescript
// File: apps/bingo/src/components/presenter/RoomSetupModal.tsx
// Line 228

<Button
  autoFocus  // ← Add this
  variant="primary"
  size="lg"
  onClick={onCreateRoom}
  className="w-full"
  aria-label="Create a new game room"
  disabled={isLoading}
>
  Create New Game
</Button>
```

**Fix Option B** (Alternative - Update Test):
```typescript
// File: e2e/bingo/room-setup.spec.ts
// Line 471

// Change from:
expect(focused).toBe('BUTTON');

// To:
expect(focused).toMatch(/BUTTON|SELECT/);
```

**Recommended**: Option A (better accessibility and UX)

**Files to Modify**:
- `apps/bingo/src/components/presenter/RoomSetupModal.tsx` (line 228)
- OR `e2e/bingo/room-setup.spec.ts` (line 471)

**Testing Commands**:
```bash
# Start dev servers
pnpm dev

# Run affected test
pnpm exec playwright test -g "room setup modal should be keyboard accessible"

# Verify focus order manually in headed mode
pnpm exec playwright test --headed -g "keyboard accessible"

# Verify no regressions
pnpm exec playwright test e2e/bingo/room-setup.spec.ts
```

**Expected Result**: 24/26 tests passing (92%)

**Reference**: `docs/BEA-334-REMAINING-FAILURES.md` - Category 5

---

## Issue 5: PWA Service Worker E2E Tests (Production Build)

**Priority**: Low (Defer to Pre-Release Testing)
**Effort**: 4-8 hours OR mark as skip
**Complexity**: High
**Blockers**: Requires production build environment

**Team**: E2E Testing
**Labels**: `e2e`, `testing`, `pwa`, `service-worker`, `bingo`, `deferred`

### Description

Two E2E tests fail because they require service worker functionality, which only works in production builds (not dev mode with `pnpm dev`). Tests call `context.setOffline(true)` then `page.reload()`, which fails with `net::ERR_INTERNET_DISCONNECTED` because the page can't load without the service worker cache.

### Acceptance Criteria

**Option A: Skip in Dev Mode (RECOMMENDED)**
- [ ] Tests marked with `test.skip` for dev mode
- [ ] Tests include TODO comments explaining they need production build
- [ ] Separate script created for production E2E testing: `pnpm test:e2e:prod`
- [ ] Documentation updated in E2E guide

**Option B: Production Build Testing**
- [ ] Production build E2E testing workflow documented
- [ ] Tests pass against production build: `pnpm build && pnpm start && playwright test`
- [ ] CI/CD alternative solution (if needed)

### Technical Details

**Root Cause**: Service workers don't register in dev mode. Without service worker:
- Offline page reloads fail (can't fetch HTML/JS/CSS)
- PWA caching doesn't work
- Offline-first features unavailable

**Affected Tests**:
1. "should work offline with network disconnected" (line 186)
2. "should hide offline banner when network reconnects" (line 426)

**Recommended Solution**: Option A (skip in dev mode)

```typescript
// File: e2e/bingo/room-setup.spec.ts

test.skip('should work offline with network disconnected', async ({ authenticatedBingoPage: page, context }) => {
  // TODO: Requires service worker (production build only)
  // Run with: pnpm build && pnpm start && pnpm exec playwright test

  await waitForRoomSetupModal(page);
  await page.getByText('Play Offline').click();
  await expect(page.getByText(/offline session/i)).toBeVisible();

  // Disconnect network
  await context.setOffline(true);

  // This reload will fail without service worker
  await page.reload();
  await waitForHydration(page);

  // Should still work offline
  await expect(page.getByText('Play Offline')).toBeVisible();
});

test.skip('should hide offline banner when network reconnects', async ({ authenticatedBingoPage: page, context }) => {
  // TODO: Requires service worker (production build only)
  // Run with: pnpm build && pnpm start && pnpm exec playwright test

  // ... test implementation
});
```

**Alternative: Production Build Script**
```json
// package.json
{
  "scripts": {
    "test:e2e:prod": "pnpm build && pnpm start & sleep 10 && pnpm exec playwright test; kill %1"
  }
}
```

**Files to Modify**:
- `e2e/bingo/room-setup.spec.ts` (lines 186, 426)
- `package.json` (optional: add prod E2E script)
- `docs/E2E_TESTING_GUIDE.md` (document production testing)

**Testing Commands**:
```bash
# Dev mode (tests skipped)
pnpm dev
pnpm exec playwright test e2e/bingo/room-setup.spec.ts
# Result: 24/24 passing (100% - skipped tests don't count)

# Production mode (all tests run)
pnpm build
pnpm start
pnpm exec playwright test e2e/bingo/room-setup.spec.ts
# Result: 26/26 passing (100%)
```

**Expected Result**:
- Dev mode: 24/24 passing (100% - 2 tests skipped)
- Prod mode: 26/26 passing (100%)

**Reference**: `docs/BEA-334-REMAINING-FAILURES.md` - Category 3

---

## Parallelization Strategy

These issues can be worked on simultaneously in separate git worktrees:

```bash
# Worktree 1: Quick win - test selectors
git worktree add .worktrees/fix-e2e-selectors -b fix/e2e-test-selectors
# Assign to Agent A

# Worktree 2: Offline localStorage
git worktree add .worktrees/fix-offline-storage -b fix/offline-localstorage-persistence
# Assign to Agent B

# Worktree 3: Offline display sync
git worktree add .worktrees/fix-offline-display -b fix/offline-display-sync
# Assign to Agent C

# Worktree 4: Keyboard focus
git worktree add .worktrees/fix-keyboard-focus -b fix/modal-keyboard-focus
# Assign to Agent D

# Issue 5: PWA tests - can be done by any agent, low priority
```

**Coordination**:
- Each agent runs E2E tests in their own worktree
- Only ONE set of dev servers can run at a time (shared ports)
- Agents run tests sequentially OR coordinate server usage

**Merge Order**:
- Issues 1-4 are independent - merge in any order
- Issue 5 can be merged last or deferred

---

## Success Metrics

| After Issue | Tests Passing | Percentage | Incremental Gain |
|-------------|---------------|------------|------------------|
| Current (BEA-334) | 19/26 | 73% | Baseline |
| Issue 1 (Selectors) | 21/26 | 81% | +2 tests |
| Issue 2 (localStorage) | 22/26 | 85% | +1 test |
| Issue 3 (Display Sync) | 23/26 | 88% | +1 test |
| Issue 4 (Keyboard) | 24/26 | 92% | +1 test |
| Issue 5 (PWA) - skipped | 24/24 | 100% (dev) | 0 failures in dev |
| Issue 5 (PWA) - prod | 26/26 | 100% (prod) | All tests pass |

---

## Recommended Linear Project Structure

**Project**: "E2E Testing"

**Milestones**:
1. "Room Setup Modal E2E Tests" (BEA-334 + follow-ups)
2. "Game Flow E2E Tests" (future)
3. "Cross-App SSO E2E Tests" (future)

**Issue Organization**:
- All 5 issues above in "Room Setup Modal E2E Tests" milestone
- Issues 1-4: Active status (can start immediately)
- Issue 5: Backlog status (defer to production testing workflow)

**Dependencies**:
- None - all issues are independent
- Can be worked on in parallel
- Can be merged in any order

---

## References

- **Failure Analysis**: `docs/BEA-334-REMAINING-FAILURES.md`
- **E2E Testing Guide**: `docs/E2E_TESTING_GUIDE.md`
- **Main Issue**: BEA-334 (room setup modal not showing)
