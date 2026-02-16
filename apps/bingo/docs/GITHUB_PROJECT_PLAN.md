# Simplified Room Creation - GitHub Project Plan

## Project Overview

Simplify the bingo room creation flow with auto-generated PINs, offline mode support, and improved UX.

**Goal**: Eliminate manual PIN entry, add offline-first gameplay, fix session ID collisions

**Key Features**:
- Auto-generate 4-digit PINs using crypto.getRandomValues
- Short, typable session IDs (6 chars) for offline mode
- Immediate room setup modal on /play load
- Session recovery with error handling
- Multi-window BroadcastChannel sync (online & offline)

---

## How to Use This Document

Each section below is a complete GitHub issue. To create an issue:

1. Copy the entire section (including title and all markdown)
2. Create new issue at https://github.com/users/julianken/projects/1
3. Paste content
4. Apply labels: `priority: critical/high/medium`, `bingo`, `enhancement`

---

## Issue #1: Create Secure Generation Utilities

**Labels**: `priority: critical`, `bingo`, `enhancement`
**Dependencies**: None

### Description

Create utility functions for cryptographically secure PIN and session ID generation. This is the foundation for the new room creation flow.

### Tasks

- [ ] Create file `apps/bingo/src/lib/session/secure-generation.ts`
- [ ] Implement `generateSecurePin()` using crypto.getRandomValues (4 digits)
- [ ] Implement `generateShortSessionId()` (6 alphanumeric chars, no ambiguous chars)
- [ ] Add localStorage helper functions for PIN storage
- [ ] Add localStorage helper functions for offline session ID storage
- [ ] Add comprehensive TSDoc comments to all functions

### Acceptance Criteria

- [ ] PIN generation produces 4-digit numbers (1000-9999)
- [ ] Session IDs are 6 characters, no 0/O/1/I characters
- [ ] All randomness uses crypto.getRandomValues (NOT Math.random)
- [ ] localStorage functions handle null/undefined gracefully
- [ ] All functions have TSDoc comments
- [ ] No external dependencies required

### Implementation Details

```typescript
// Use crypto.getRandomValues for cryptographic security
const randomValues = new Uint32Array(1);
crypto.getRandomValues(randomValues);
const pin = (1000 + (randomValues[0] % 9000)).toString();

// Session ID: 6 chars, exclude ambiguous characters
const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
```

**Key Functions**:
- `generateSecurePin(): string` - Returns 4-digit PIN
- `generateShortSessionId(): string` - Returns 6-char session ID
- `storePin(pin: string): void` - Save PIN to localStorage
- `getStoredPin(): string | null` - Retrieve stored PIN
- `clearStoredPin(): void` - Clear PIN from localStorage
- `storeOfflineSessionId(id: string): void` - Save offline session ID
- `getStoredOfflineSessionId(): string | null` - Retrieve offline session ID
- `clearStoredOfflineSessionId(): void` - Clear offline session ID

### Files to Create

- `apps/bingo/src/lib/session/secure-generation.ts`

---

## Issue #2: Update Play Page Session ID Strategy

**Labels**: `priority: critical`, `bingo`, `enhancement`
**Dependencies**: Issue #1

### Description

Update the `/play` page to use the new secure generation utilities and fix session ID calculation. This establishes the foundation for both online and offline room creation.

### Tasks

- [ ] Import utilities from `secure-generation.ts`
- [ ] Add state for offline session ID
- [ ] Update `sessionId` calculation to check localStorage first
- [ ] Add logic to generate session ID on page load if none exists
- [ ] Update session recovery to use stored PIN
- [ ] Add error handling for missing/invalid session IDs

### Acceptance Criteria

- [ ] Session ID is read from localStorage before generating new one
- [ ] Online rooms use Supabase-generated session ID
- [ ] Offline rooms use locally generated 6-char session ID
- [ ] Session recovery loads stored PIN if available
- [ ] No session ID collisions between multiple browser tabs
- [ ] Code handles both online and offline scenarios

### Implementation Details

Update `apps/bingo/src/app/play/page.tsx`:

```typescript
// At top of component
const [offlineSessionId, setOfflineSessionId] = useState<string | null>(null);

// Session ID calculation (replace existing logic)
const sessionId = session?.id || offlineSessionId;

// On mount, check for stored offline session
useEffect(() => {
  const storedOffline = getStoredOfflineSessionId();
  if (storedOffline) {
    setOfflineSessionId(storedOffline);
  }
}, []);
```

**Key Changes**:
- Import all utilities from `secure-generation.ts`
- Add `offlineSessionId` state variable
- Update `sessionId` calculation logic
- Check localStorage on component mount
- Use stored PIN in session recovery

### Files to Modify

- `apps/bingo/src/app/play/page.tsx`

---

## Issue #3: Fix Modal Timing and Recovery Error Handling

**Labels**: `priority: critical`, `bingo`, `enhancement`
**Dependencies**: Issue #2

### Description

Fix the room setup modal timing to appear immediately on `/play` load and when session recovery fails. This ensures users always have a way to create or join a room.

### Tasks

- [ ] Update modal show condition to trigger on mount when no session exists
- [ ] Add modal trigger when session recovery fails
- [ ] Ensure modal doesn't flash on successful recovery
- [ ] Add state to track recovery attempt status
- [ ] Test modal behavior in all scenarios (new visit, refresh, error)

### Acceptance Criteria

- [ ] Modal shows immediately on first visit to /play (no session)
- [ ] Modal shows when session recovery returns error
- [ ] Modal does NOT show when session recovery succeeds
- [ ] Modal does NOT flash briefly then hide
- [ ] Recovery error messages are displayed to user
- [ ] Modal can be dismissed and re-opened

### Implementation Details

Update modal show logic in `apps/bingo/src/app/play/page.tsx`:

```typescript
// Add recovery status state
const [recoveryAttempted, setRecoveryAttempted] = useState(false);
const [recoveryError, setRecoveryError] = useState<string | null>(null);

// Show modal conditions
const shouldShowModal =
  showModal ||
  (!sessionId && recoveryAttempted) ||
  (recoveryError !== null);

// In recovery useEffect
try {
  // ... recovery logic
  setRecoveryError(null);
} catch (error) {
  setRecoveryError(error.message);
} finally {
  setRecoveryAttempted(true);
}
```

**Key Changes**:
- Add `recoveryAttempted` and `recoveryError` state
- Update modal show condition
- Set recovery status in useEffect
- Display error messages to user

### Files to Modify

- `apps/bingo/src/app/play/page.tsx`

---

## Issue #4: Implement PIN Persistence

**Labels**: `priority: critical`, `bingo`, `enhancement`
**Dependencies**: Issue #2

### Description

Implement PIN persistence across page refreshes using localStorage. PINs are auto-generated and stored before API calls, eliminating manual entry.

### Tasks

- [ ] Load stored PIN on component mount
- [ ] Generate PIN before room creation API call
- [ ] Store PIN in localStorage after generation
- [ ] Clear PIN on room creation error
- [ ] Display stored PIN in UI
- [ ] Add PIN regeneration option

### Acceptance Criteria

- [ ] PIN is auto-generated (4 digits) before room creation
- [ ] PIN persists across page refreshes
- [ ] PIN is cleared when room creation fails
- [ ] Stored PIN is used for session recovery
- [ ] Users can see their current PIN
- [ ] No manual PIN entry required

### Implementation Details

Update `apps/bingo/src/app/play/page.tsx`:

```typescript
// On mount, load stored PIN
useEffect(() => {
  const storedPin = getStoredPin();
  if (storedPin) {
    // Use for recovery or display
  }
}, []);

// In createRoom handler
const handleCreateRoom = async () => {
  const pin = generateSecurePin();
  storePin(pin);

  try {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    // ... handle response
  } catch (error) {
    clearStoredPin(); // Clear on error
    // ... handle error
  }
};
```

**Key Changes**:
- Load PIN from localStorage on mount
- Generate and store PIN before API call
- Clear PIN on error
- Use stored PIN for recovery
- Display PIN in admin panel (see Issue #7)

### Files to Modify

- `apps/bingo/src/app/play/page.tsx`

---

## Issue #5: Implement Offline Mode Support

**Labels**: `priority: high`, `bingo`, `enhancement`
**Dependencies**: Issue #2

### Description

Add complete offline mode support with local session management. Offline mode allows gameplay without internet connectivity using BroadcastChannel for multi-window sync.

### Tasks

- [ ] Create `handlePlayOffline` function
- [ ] Generate and store offline session ID
- [ ] Skip all API calls in offline mode
- [ ] Initialize game state locally
- [ ] Add offline session recovery logic
- [ ] Test BroadcastChannel sync in offline mode

### Acceptance Criteria

- [ ] Offline mode generates 6-char session ID
- [ ] No network requests made in offline mode
- [ ] Game state initializes with default values
- [ ] BroadcastChannel sync works between windows
- [ ] Offline session recovers after page refresh
- [ ] Display view syncs with presenter in offline mode

### Implementation Details

Add to `apps/bingo/src/app/play/page.tsx`:

```typescript
const handlePlayOffline = async () => {
  const offlineId = generateShortSessionId();
  storeOfflineSessionId(offlineId);
  setOfflineSessionId(offlineId);
  setShowModal(false);

  // Initialize game state locally (no API calls)
  // BroadcastChannel will sync to display view
};

// Offline session recovery
useEffect(() => {
  const storedOffline = getStoredOfflineSessionId();
  if (storedOffline && !session) {
    setOfflineSessionId(storedOffline);
    // Restore game state from localStorage if available
  }
}, []);
```

**Key Features**:
- No network dependency
- Local session ID generation
- BroadcastChannel for window sync
- Session recovery from localStorage
- Full game functionality offline

### Files to Modify

- `apps/bingo/src/app/play/page.tsx`

---

## Issue #6: Create Room Setup Modal Component

**Labels**: `priority: high`, `bingo`, `enhancement`
**Dependencies**: None (can be done in parallel)

### Description

Create a new modal component for room setup with three options: Create New Game, Join Existing Game, and Play Offline. This provides a clear entry point for all room creation flows.

### Tasks

- [ ] Create `RoomSetupModal.tsx` component
- [ ] Design three-option layout (Create/Join/Offline)
- [ ] Add form for joining existing room (PIN input)
- [ ] Add close/dismiss functionality
- [ ] Style for accessible UI (large text, high contrast)
- [ ] Add accessibility features (keyboard navigation, ARIA labels)
- [ ] Add visual icons for each option

### Acceptance Criteria

- [ ] Modal shows three clear options
- [ ] "Create New Game" button prominent and clear
- [ ] "Join Existing Game" shows PIN input form
- [ ] "Play Offline" option clearly labeled
- [ ] Modal is accessible (keyboard navigation works)
- [ ] Text is large and high contrast
- [ ] Modal can be dismissed with X button or Escape key
- [ ] All buttons have min 44x44px touch targets

### Implementation Details

Create `apps/bingo/src/components/presenter/RoomSetupModal.tsx`:

```typescript
interface RoomSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (pin: string) => void;
  onPlayOffline: () => void;
}

export function RoomSetupModal({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
  onPlayOffline
}: RoomSetupModalProps) {
  const [joinPin, setJoinPin] = useState('');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Three options layout */}
      <Button onClick={onCreateRoom}>Create New Game</Button>
      <form onSubmit={() => onJoinRoom(joinPin)}>
        <input value={joinPin} onChange={(e) => setJoinPin(e.target.value)} />
        <Button type="submit">Join Game</Button>
      </form>
      <Button onClick={onPlayOffline}>Play Offline</Button>
    </Dialog>
  );
}
```

**Design Requirements**:
- Large, readable fonts (min 18px)
- High contrast colors
- Clear visual separation between options
- Icons for visual clarity
- Responsive layout

### Files to Create

- `apps/bingo/src/components/presenter/RoomSetupModal.tsx`

---

## Issue #7: Add PIN Display to Admin Panel ✅

**Labels**: `priority: high`, `bingo`, `enhancement`
**Dependencies**: Issue #4
**Status**: COMPLETE (Issue #116)

### Description

Add PIN display to the admin panel so hosts can share the room PIN with players. Include a copy-to-clipboard button for easy sharing.

### Tasks

- [x] Create PIN info card component
- [x] Add current PIN display
- [x] Add copy-to-clipboard button
- [x] Show visual feedback on copy (toast/checkmark)
- [x] Handle offline mode (show session ID instead)
- [x] Style for visibility and senior-friendliness

### Acceptance Criteria

- [x] PIN is clearly visible in admin panel
- [x] Copy button works and shows feedback
- [x] Offline mode shows session ID instead of PIN
- [x] Text is large and high contrast (min 24px for PIN)
- [x] PIN is always accessible during gameplay
- [x] Component handles missing PIN gracefully

### Implementation Details

Add to `apps/bingo/src/app/play/page.tsx`:

```typescript
// In admin panel section
{session && (
  <div className="pin-display-card">
    <h3>Room PIN</h3>
    <div className="pin-value">{storedPin || 'N/A'}</div>
    <button onClick={() => {
      navigator.clipboard.writeText(storedPin || '');
      // Show toast notification
    }}>
      Copy PIN
    </button>
  </div>
)}

{offlineSessionId && (
  <div className="session-id-display">
    <h3>Offline Session ID</h3>
    <div className="session-value">{offlineSessionId}</div>
  </div>
)}
```

**Visual Design**:
- Large PIN display (36-48px font)
- Clear "Room PIN" label
- Copy button with icon
- Success feedback (checkmark or toast)
- Distinct styling from other UI elements

### Files to Modify

- `apps/bingo/src/app/play/page.tsx`

---

## Issue #8: Add Create New Game Button

**Labels**: `priority: medium`, `bingo`, `enhancement`
**Dependencies**: Issue #3, Issue #5

### Description

Add a "Create New Game" button to the admin panel that clears the current session and shows the room setup modal. This allows hosts to start a fresh game without manually clearing storage.

### Tasks

- [ ] Add "Create New Game" button to admin panel
- [ ] Implement handler that clears all session data
- [ ] Clear localStorage (PIN, offline session ID)
- [ ] Reset component state
- [ ] Show room setup modal
- [ ] Add confirmation dialog for active games

### Acceptance Criteria

- [ ] Button is visible in admin panel
- [ ] Clicking button clears all session data
- [ ] PIN is cleared from localStorage
- [ ] Offline session ID is cleared
- [ ] Room setup modal appears after clearing
- [ ] Confirmation prompt shown if game is active
- [ ] Button has clear label and large touch target

### Implementation Details

Add to `apps/bingo/src/app/play/page.tsx`:

```typescript
const handleCreateNewGame = () => {
  // Show confirmation if game is active
  if (gameStatus !== 'lobby' && gameStatus !== 'ended') {
    if (!confirm('End current game and create new one?')) {
      return;
    }
  }

  // Clear all session data
  clearStoredPin();
  clearStoredOfflineSessionId();
  setSession(null);
  setOfflineSessionId(null);

  // Show modal for new room setup
  setShowModal(true);
};

// In admin panel
<button onClick={handleCreateNewGame}>
  Create New Game
</button>
```

**Key Features**:
- Confirmation for active games
- Complete state reset
- Immediate modal display
- Clear user feedback

### Files to Modify

- `apps/bingo/src/app/play/page.tsx`

---

## Issue #9: Integrate Room Setup Modal

**Labels**: `priority: high`, `bingo`, `enhancement`
**Dependencies**: Issue #3, Issue #4, Issue #5, Issue #6

### Description

Wire up the RoomSetupModal component to all handler functions and test all room creation flows end-to-end. This is the integration ticket that brings everything together.

### Tasks

- [ ] Import RoomSetupModal into `/play` page
- [ ] Connect `onCreateRoom` to room creation handler
- [ ] Connect `onJoinRoom` to join room handler
- [ ] Connect `onPlayOffline` to offline mode handler
- [ ] Test online room creation flow
- [ ] Test join existing room flow
- [ ] Test offline mode flow
- [ ] Verify modal timing in all scenarios

### Acceptance Criteria

- [ ] All three modal options work correctly
- [ ] Create New Game flow completes successfully
- [ ] Join Existing Game validates PIN and joins room
- [ ] Play Offline mode works without network
- [ ] Modal appears at correct times
- [ ] Error states are handled gracefully
- [ ] All flows tested with BroadcastChannel sync

### Implementation Details

Update `apps/bingo/src/app/play/page.tsx`:

```typescript
import { RoomSetupModal } from '@/components/presenter/RoomSetupModal';

// In component
<RoomSetupModal
  isOpen={shouldShowModal}
  onClose={() => setShowModal(false)}
  onCreateRoom={handleCreateRoom}
  onJoinRoom={handleJoinRoom}
  onPlayOffline={handlePlayOffline}
/>

// Handlers already implemented in previous issues
```

**Integration Tests**:
- Modal shows on first /play visit
- Create flow generates PIN and creates room
- Join flow validates PIN format
- Offline flow works without network
- BroadcastChannel syncs in all modes
- Display view updates correctly

### Files to Modify

- `apps/bingo/src/app/play/page.tsx`

---

## Issue #10: Testing and Documentation

**Labels**: `priority: medium`, `bingo`, `testing`, `documentation`
**Dependencies**: All previous issues (#1-#9)

### Description

Create comprehensive tests for all new functionality and update documentation. This ensures the feature is robust and maintainable.

### Tasks

- [ ] Write unit tests for secure generation utilities
- [ ] Write integration tests for room creation flows
- [ ] Write E2E tests for multi-window sync
- [ ] Test offline mode thoroughly
- [ ] Update `apps/bingo/CLAUDE.md` with new features
- [ ] Update main `CLAUDE.md` if needed
- [ ] Create migration guide for existing deployments
- [ ] Document localStorage schema

### Acceptance Criteria

- [ ] All unit tests pass
- [ ] Integration tests cover all flows
- [ ] E2E tests verify multi-window sync
- [ ] Test coverage >80% for new code
- [ ] Documentation is up-to-date
- [ ] Migration guide is clear
- [ ] No regressions in existing functionality

### Test Coverage Required

**Unit Tests** (`apps/bingo/src/lib/session/__tests__/secure-generation.test.ts`):
- [ ] `generateSecurePin()` produces 4-digit numbers
- [ ] `generateShortSessionId()` produces 6-char codes
- [ ] No Math.random() usage detected
- [ ] localStorage helpers handle edge cases
- [ ] All functions are deterministic (except randomness)

**Integration Tests** (`apps/bingo/src/app/play/__tests__/room-creation.test.tsx`):
- [ ] Online room creation flow (modal → API → PIN display)
- [ ] Offline mode flow (modal → local session → no API calls)
- [ ] Join existing room flow with valid PIN
- [ ] Join existing room flow with invalid PIN
- [ ] Session recovery (online rooms)
- [ ] Offline session recovery
- [ ] Create New Game button clears all state

**E2E Tests** (Playwright):
- [ ] Multi-window sync (online mode)
- [ ] Multi-window sync (offline mode)
- [ ] Display view sync with presenter
- [ ] Network offline during online session (graceful degradation)
- [ ] Page refresh during API call (PIN preserved)
- [ ] BroadcastChannel messages received by all windows

**Manual Testing Checklist**:
- [ ] Modal appears on first visit to /play
- [ ] Modal shows on recovery error
- [ ] PIN auto-generates (4 digits)
- [ ] PIN displays in admin panel
- [ ] PIN copy button works
- [ ] Offline session ID generates (6 chars)
- [ ] Offline mode has no network requests
- [ ] Create New Game resets everything
- [ ] BroadcastChannel sync works (both modes)
- [ ] Session recovery works after refresh

### Documentation Updates

Update `apps/bingo/CLAUDE.md`:
- [ ] Add section on room creation flow
- [ ] Document PIN generation and storage
- [ ] Document offline mode feature
- [ ] Add localStorage schema
- [ ] Update environment variables if needed

Update main `CLAUDE.md`:
- [ ] Update Bingo status/features
- [ ] Add offline mode capability
- [ ] Update any architecture notes

### Files to Create/Modify

- Create: `apps/bingo/src/lib/session/__tests__/secure-generation.test.ts`
- Create: `apps/bingo/src/app/play/__tests__/room-creation.test.tsx`
- Create: `apps/bingo/e2e/room-setup.spec.ts`
- Modify: `apps/bingo/CLAUDE.md`
- Modify: `CLAUDE.md` (root)

---

## Dependency Graph

```
Phase 1 (Parallel - No Dependencies):
┌──────────────────────────────────────────┐
│ #1: Secure Generation Utilities         │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ #6: Room Setup Modal Component          │
└──────────────────────────────────────────┘

Phase 2 (Depends on #1):
#1 ──> ┌──────────────────────────────────────────┐
       │ #2: Update Play Page Session ID         │
       └──────────────────────────────────────────┘

Phase 3 (Depends on #2 - can be parallel):
#2 ──> ┌──────────────────────────────────────────┐
       │ #3: Fix Modal Timing                    │
       └──────────────────────────────────────────┘
#2 ──> ┌──────────────────────────────────────────┐
       │ #4: Implement PIN Persistence           │
       └──────────────────────────────────────────┘
#2 ──> ┌──────────────────────────────────────────┐
       │ #5: Implement Offline Mode              │
       └──────────────────────────────────────────┘

Phase 4 (Depends on Phase 3 - can be parallel):
#4 ──> ┌──────────────────────────────────────────┐
       │ #7: Add PIN Display                     │
       └──────────────────────────────────────────┘
#3,#5 ──> ┌──────────────────────────────────────┐
          │ #8: Create New Game Button          │
          └──────────────────────────────────────┘

Phase 5 (Integration - Depends on #3,#4,#5,#6):
#3,#4,#5,#6 ──> ┌──────────────────────────────────┐
                │ #9: Integrate Modal             │
                └──────────────────────────────────┘

Phase 6 (Final - Depends on All):
#1-#9 ──> ┌──────────────────────────────────────────┐
          │ #10: Testing and Documentation          │
          └──────────────────────────────────────────┘

Critical Path: #1 → #2 → #3 → #9 → #10
Parallel Work Opportunities: Issues can be worked in parallel within each phase
```

---

## Complete Testing Checklist

### Unit Tests
- [ ] `generateSecurePin()` produces 4-digit numbers (1000-9999)
- [ ] `generateShortSessionId()` produces 6-character codes
- [ ] Session IDs exclude ambiguous characters (0, O, 1, I)
- [ ] All randomness uses crypto.getRandomValues
- [ ] No Math.random() usage anywhere in codebase
- [ ] PIN localStorage functions work correctly
- [ ] Offline session localStorage functions work correctly
- [ ] localStorage helpers handle null/undefined gracefully
- [ ] localStorage helpers handle quota exceeded errors

### Integration Tests
- [ ] Online room creation flow (modal → API → PIN display)
- [ ] Offline mode flow (modal → local session → no API calls)
- [ ] Join existing room flow with valid PIN
- [ ] Join existing room flow with invalid PIN
- [ ] Join existing room flow with non-existent PIN
- [ ] Session recovery (online rooms)
- [ ] Offline session recovery
- [ ] Create New Game button clears all state
- [ ] Modal appears at correct times
- [ ] Modal dismissal works correctly
- [ ] Error states display properly

### E2E Tests (Playwright)
- [ ] Multi-window sync (online mode)
- [ ] Multi-window sync (offline mode)
- [ ] Display view sync with presenter view
- [ ] Network offline during online session (graceful degradation)
- [ ] Page refresh during API call (PIN preserved)
- [ ] Page refresh during game (session restored)
- [ ] BroadcastChannel messages received by all windows
- [ ] Closing one window doesn't affect others
- [ ] Multiple presenter windows prevented

### Security Tests
- [ ] PIN generation is cryptographically secure
- [ ] No PIN leakage in URLs or logs
- [ ] Session IDs are sufficiently random
- [ ] localStorage is scoped correctly
- [ ] XSS prevention in PIN display
- [ ] CSRF protection on API endpoints

### Accessibility Tests
- [ ] Modal keyboard navigation works
- [ ] All buttons have proper ARIA labels
- [ ] Focus management in modal
- [ ] Screen reader announcements
- [ ] Touch targets min 44x44px
- [ ] High contrast mode compatibility

### Performance Tests
- [ ] localStorage read/write performance
- [ ] BroadcastChannel latency
- [ ] Modal render time <100ms
- [ ] No memory leaks in long sessions
- [ ] Efficient re-renders (React DevTools)

### Manual Testing Checklist
- [ ] Modal appears on first visit to /play
- [ ] Modal shows on recovery error
- [ ] Modal does NOT show on successful recovery
- [ ] PIN auto-generates (4 digits, 1000-9999 range)
- [ ] PIN displays correctly in admin panel
- [ ] PIN copy button works and shows feedback
- [ ] Offline session ID generates (6 chars)
- [ ] Offline mode has no network requests (check Network tab)
- [ ] Create New Game clears PIN from localStorage
- [ ] Create New Game clears offline session ID
- [ ] Create New Game shows confirmation if game active
- [ ] BroadcastChannel sync works in online mode
- [ ] BroadcastChannel sync works in offline mode
- [ ] Session recovery works after page refresh (online)
- [ ] Session recovery works after page refresh (offline)
- [ ] Display view receives all game state updates
- [ ] Multiple browser tabs sync correctly
- [ ] Error messages are user-friendly
- [ ] Loading states are clear

### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)
- [ ] crypto.getRandomValues supported
- [ ] BroadcastChannel API supported
- [ ] localStorage available

### Regression Tests
- [ ] Existing bingo gameplay still works
- [ ] Pattern selection still works
- [ ] Audio playback still works
- [ ] Theme switching still works
- [ ] Keyboard shortcuts still work
- [ ] Display view still syncs
- [ ] Game reset still works
- [ ] Undo ball call still works

---

## Implementation Notes

### localStorage Schema

```typescript
// Keys used in localStorage
{
  "bingo:room:pin": "1234",                    // 4-digit room PIN
  "bingo:offline:sessionId": "A3K9M2",         // 6-char offline session ID
  "bingo:session:id": "550e8400-...",          // Supabase session ID (online)
  "bingo:gameState": { /* full game state */ } // Game state backup
}
```

### API Changes

**POST /api/rooms**
```typescript
// Request
{
  "pin": "1234"  // Now required, auto-generated by client
}

// Response
{
  "id": "550e8400-...",
  "pin": "1234",
  "createdAt": "2024-01-20T..."
}
```

**GET /api/rooms/recovery**
```typescript
// Query params: ?pin=1234

// Response
{
  "session": {
    "id": "550e8400-...",
    "pin": "1234",
    "gameState": { /* current state */ }
  }
}
```

### Migration Guide

For existing deployments:

1. **Database**: No schema changes required
2. **API**: Backward compatible (PIN is optional for now)
3. **Client**: Clear localStorage for clean start
4. **Feature Flag**: Can be enabled gradually

### Rollout Strategy

1. Deploy backend changes (API accepts PIN)
2. Deploy frontend changes (auto-generate PIN)
3. Monitor for session ID collisions (should be zero)
4. After 1 week, make PIN required on backend
5. Clean up old code paths

---

## Success Criteria

The implementation is complete when:

- [ ] All 10 tickets are closed
- [ ] All tests pass (unit, integration, E2E)
- [ ] Test coverage >80% for new code
- [ ] Documentation is updated
- [ ] No regressions in existing features
- [ ] Manual testing checklist is 100% complete
- [ ] Code review is approved
- [ ] Feature deployed to production
- [ ] No session ID collisions reported
- [ ] User feedback is positive

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Session ID collisions | High | Use crypto.getRandomValues, monitor production |
| localStorage quota exceeded | Medium | Add error handling, clear old data |
| BroadcastChannel not supported | Medium | Graceful degradation, show warning |
| PIN security concerns | Medium | Use cryptographic random, don't log PINs |
| Offline mode sync issues | Medium | Comprehensive E2E tests, fallback to manual |
| API breaking changes | Low | Backward compatible, feature flag |

---

## Questions for Product/Design

- [ ] Should offline mode be prominently featured or "hidden" option?
- [ ] What should happen if user tries to join non-existent PIN?
- [ ] Should we limit PIN regeneration to prevent abuse?
- [ ] Do we need analytics for online vs offline usage?
- [ ] Should display view show PIN for late joiners?
- [ ] Maximum number of offline sessions to keep in localStorage?

---

## Future Enhancements (Out of Scope)

- PIN expiration after 24 hours
- Room password protection (in addition to PIN)
- QR code for room joining
- PIN sharing via email/SMS
- Analytics dashboard for room usage
- Multi-game support in single room
- Cross-device sync (different browsers)

---

*Project: Joolie Boolie - Bingo*
*Epic: Simplified Room Creation Flow*
