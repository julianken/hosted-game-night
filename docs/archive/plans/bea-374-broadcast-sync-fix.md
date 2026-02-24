# BEA-374 Root Cause Analysis and Implementation Plan

## Executive Summary

After thorough investigation, the root cause of the 42 E2E test failures is **not a simple timeout issue**. The timeout increase from 1000ms to 5000ms was necessary but insufficient because the underlying problem is a **race condition in channel initialization timing** combined with **presenter state not being ready when the display requests sync**.

## Root Cause Analysis

### 1. The Actual Problem: Channel Readiness Race

The test failures show "element(s) not found" - meaning content **never appears**, not just "appears slowly". This indicates messages are either:
- Not being sent (presenter not ready)
- Not being received (channel mismatch)
- Received but not rendering (React not updating)

### 2. Critical Timing Sequence Analysis

Let me trace what happens when tests run:

```
Timeline (presenter opens display):
=======================================
T+0ms    Presenter: clicks "Open Display"
T+1ms    Presenter: window.open('/display?offline=ABC123')
T+50ms   Display: page starts loading
T+100ms  Display: React hydration begins
T+150ms  Display: useSync() called with sessionId='ABC123'
T+151ms  Display: BroadcastSync created for channel 'trivia-sync-ABC123'
T+152ms  Display: sync.initialize() called
T+153ms  Display: sync.requestSync() called (REQUEST_SYNC message sent)
T+154ms  Presenter: ???  <-- IS PRESENTER CHANNEL READY TO RECEIVE?
```

**The Bug**: When the display sends `REQUEST_SYNC`, the presenter's `useSync` hook may have already mounted but the **subscription handler** may not be wired up yet due to React's effect execution timing.

### 3. Three Failure Modes Identified

**Mode A: Channel Name Mismatch**
- Presenter uses channel: `trivia-sync-{roomCode}` or `trivia-sync-{offlineSessionId}`
- Display uses: `trivia-sync-{fromURLParam}`
- If they don't match, messages never arrive

**Mode B: Presenter Not Subscribed Yet**
- Display sends `REQUEST_SYNC` before presenter has subscribed to messages
- The `handleSyncRequest` callback is created but not yet attached to channel
- Message arrives but no handler processes it

**Mode C: State Not Broadcasting on Initial Load**
- Presenter's `useGameStore.subscribe()` only fires on **state changes**
- If state hasn't changed since mount, nothing is broadcast
- Display receives nothing even after REQUEST_SYNC

### 4. Evidence From Code

**From `use-sync.ts` (lines 177-198)**:
```typescript
if (role === 'audience') {
  requestSyncWithRetry();  // Sends REQUEST_SYNC
}
```

The retry logic was added in BEA-370 with exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms. Total: 3100ms. But this still assumes the presenter will **respond** to REQUEST_SYNC.

**From `handleSyncRequest` (lines 125-134)**:
```typescript
const handleSyncRequest = useCallback(() => {
  if (role !== 'presenter') return;
  if (!broadcastSyncRef.current) return;  // <-- Returns if channel not ready
  const state = getCurrentState();
  broadcastSyncRef.current.broadcastState(state);
}, [role, getCurrentState]);
```

**Problem**: The channel subscription happens in the **first** useEffect (lines 150-215), but the handler callbacks are created **before** the effect runs. If the display's REQUEST_SYNC arrives during a narrow window, it's lost.

### 5. The _isHydrating Flag Issue

From `game-store.ts` (lines 164-171):
```typescript
_hydrate: (newState: Partial<TriviaGameState>) => {
  set((state) => ({ ...state, _isHydrating: true }));
  set((state) => ({ ...state, ...newState }));
  setTimeout(() => {
    set((state) => ({ ...state, _isHydrating: false }));
  }, 0);  // <-- setTimeout(0) creates timing issues
}
```

The `_isHydrating` flag uses `setTimeout(0)` which can cause React to batch or delay re-renders, meaning the UI may not update synchronously.

## Proposed Solution

### Phase 1: Ensure Bi-directional Channel Readiness (High Impact)

**Fix the presenter-side initialization to proactively broadcast state**:

1. When presenter's `useSync` initializes, **immediately broadcast current state** after subscribing (not just on state changes)
2. Add a `CHANNEL_READY` message type that presenter sends when initialized
3. Display waits for `CHANNEL_READY` before considering sync "established"

**Implementation in `use-sync.ts`**:
```typescript
// After subscribing to messages, immediately broadcast current state
if (role === 'presenter') {
  // Send initial state so any already-connected displays get it
  const state = getCurrentState();
  sync.broadcastState(state);
}
```

### Phase 2: Fix the E2E Test Helper (Medium Impact)

**Modify `waitForSyncedContent` to also verify channel is connected**:

1. Add a check for sync indicator **before** checking for content
2. Increase outer timeout to 15000ms for slow CI environments
3. Add better error messages for debugging

**Implementation in `e2e/utils/helpers.ts`**:
```typescript
export async function waitForSyncedContent(
  displayPage: Page,
  pattern: string | RegExp,
  timeout = 15000
): Promise<void> {
  // First wait for sync to be established
  await waitForDualScreenSync(displayPage, 10000);

  // Then wait for content with retry
  await expect(async () => {
    const content = displayPage.getByText(pattern);
    await expect(content.first()).toBeVisible({ timeout: 5000 });
  }).toPass({ timeout });
}
```

### Phase 3: Add Synchronous Hydration (Low Impact, Safety)

**Remove the setTimeout(0) from `_hydrate`**:

The `setTimeout(0)` in `_hydrate` can cause timing issues. Instead, use a single atomic set:

```typescript
_hydrate: (newState: Partial<TriviaGameState>) => {
  set((state) => ({
    ...state,
    ...newState,
    _isHydrating: false  // Already merged, no loop risk
  }));
}
```

### Phase 4: Add E2E Debug Mode (Testing Infrastructure)

**Add console logging to BroadcastSync for E2E debugging**:

Enable `debug: true` in E2E test environment to see message flow:
```typescript
const sync = createTriviaBroadcastSync(sessionId, {
  debug: process.env.NODE_ENV === 'test'
});
```

## Implementation Tasks

### Task 1: Fix Presenter Initial Broadcast
**File**: `apps/trivia/src/hooks/use-sync.ts`
**Changes**:
- After `sync.subscribe()`, if role is presenter, call `sync.broadcastState(getCurrentState())`
- Add this at line ~175, after the subscription is set up

### Task 2: Add CHANNEL_READY Message
**File**: `apps/trivia/src/hooks/use-sync.ts`
**Changes**:
- Add new message type `CHANNEL_READY`
- Presenter sends this after initialization
- Display waits for this before considering sync established

### Task 3: Update E2E Helper
**File**: `e2e/utils/helpers.ts`
**Changes**:
- Modify `waitForSyncedContent` to first verify sync connection
- Increase timeout to 15000ms
- Add better error context

### Task 4: Fix Hydration Timing
**File**: `apps/trivia/src/stores/game-store.ts`
**Changes**:
- Remove `setTimeout(0)` from `_hydrate`
- Use single atomic state update

### Task 5: Add Test Infrastructure
**Files**:
- `packages/sync/src/broadcast.ts`
- `apps/trivia/src/hooks/use-sync.ts`
**Changes**:
- Enable debug logging when `PLAYWRIGHT_DEBUG=1` or `NODE_ENV=test`
- Log message send/receive for troubleshooting

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Initial broadcast causes extra messages | Low | Low | Dedup logic already exists in BroadcastSync |
| Removing setTimeout breaks sync loop protection | Medium | High | Verify _isHydrating flag check in presenter subscription |
| Increased timeout masks real performance issues | Low | Medium | Keep inner timeout reasonable (5000ms), only outer is 15000ms |
| Changes affect production behavior | Low | High | All changes are additive; existing logic unchanged |

## Success Criteria

1. **Primary**: All 42 failing tests pass locally with `pnpm test:e2e`
2. **No Regressions**: Other E2E tests maintain current pass rate
3. **Consistent**: Tests pass 5 consecutive runs without flakes
4. **Performance**: Tests complete in similar time (no excessive waits)

## Verification Steps

```bash
# 1. Start dev servers
pnpm dev

# 2. Run specific failing tests
pnpm test:e2e e2e/trivia/dual-screen.spec.ts

# 3. Run session flow tests
pnpm test:e2e e2e/trivia/session-flow.spec.ts

# 4. Run display tests
pnpm test:e2e e2e/trivia/display.spec.ts

# 5. Run full E2E suite
pnpm test:e2e

# 6. Check summary
pnpm test:e2e:summary
```

## Critical Files for Implementation

1. **`apps/trivia/src/hooks/use-sync.ts`** - Primary fix location: add initial state broadcast on presenter mount, add CHANNEL_READY message handling

2. **`e2e/utils/helpers.ts`** - Secondary fix: update `waitForSyncedContent` to verify sync connection before content check

3. **`apps/trivia/src/stores/game-store.ts`** - Tertiary fix: remove setTimeout(0) from `_hydrate` method for synchronous state updates

4. **`packages/sync/src/broadcast.ts`** - Pattern reference and potential debug logging enhancement

5. **`e2e/trivia/dual-screen.spec.ts`** - Test file to verify fixes; reference for test patterns and expected behavior
