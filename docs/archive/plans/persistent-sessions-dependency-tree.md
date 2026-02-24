# Persistent Sessions Feature - Dependency Tree & Issue Structure

**Feature Epic:** Persistent, Rejoinable Game Sessions
**GitHub Repo:** julianken/joolie-boolie-platform
**Plan Document:** [persistent-sessions-refined.md](./persistent-sessions-refined.md)

---

## Epic Overview

Add URL-based room codes (e.g., `SWAN-42`) that allow games to be rejoined after browser refresh or disconnect. Includes PIN protection for presenter controls while keeping audience display public.

**Infrastructure Status:** 75% complete
- ✅ Room codes, PIN security, session tokens, database schema, CRUD operations already built
- ⚠️ API routes, UI components, session initialization flows need implementation

**Key Improvements:**
- 50% code reduction through shared utilities
- HMAC-signed tokens for security
- Explicit sync timing (2s debounce for state, immediate for critical events)
- Consolidated session systems

---

## Dependency Tree Structure

```
Epic: Persistent Sessions Feature
│
├─ Phase 1: Foundation [6 tasks]
│  ├─ 1.1 Create session-routes factory [NO DEPS]
│  ├─ 1.2 Add HMAC token utilities [NO DEPS]
│  ├─ 1.3 Update database migration [NO DEPS]
│  ├─ 1.4 Mark game-sessions deprecated [NO DEPS]
│  ├─ 1.5 Write tests [DEPENDS: 1.1, 1.2]
│  └─ 1.6 Update package exports [DEPENDS: 1.1, 1.2, 1.3, 1.4, 1.5]
│
├─ Phase 2: Shared Components [6 tasks] [DEPENDS: Phase 1]
│  ├─ 2.1 Create CreateGameModal [DEPENDS: 1.6]
│  ├─ 2.2 Create JoinGameModal [DEPENDS: 1.6]
│  ├─ 2.3 Create RoomCodeDisplay [DEPENDS: 1.6]
│  ├─ 2.4 Create SyncStatusIndicator [DEPENDS: 1.6]
│  ├─ 2.5 Update package exports [DEPENDS: 2.1, 2.2, 2.3, 2.4]
│  └─ 2.6 Write component tests [DEPENDS: 2.1, 2.2, 2.3, 2.4]
│
├─ Phase 3: Auto-Sync Hooks [4 tasks] [DEPENDS: Phase 1]
│  ├─ 3.1 Create use-auto-sync hook [DEPENDS: 1.6]
│  ├─ 3.2 Create use-session-recovery hook [DEPENDS: 1.6]
│  ├─ 3.3 Update package exports [DEPENDS: 3.1, 3.2]
│  └─ 3.4 Write hook tests [DEPENDS: 3.1, 3.2]
│
├─ Phase 4: Bingo Integration [6 tasks] [DEPENDS: Phases 1, 2, 3]
│  ├─ 4.1 Implement Bingo API routes [DEPENDS: 1.1]
│  ├─ 4.2 Create Bingo state serializer [DEPENDS: 1.6]
│  ├─ 4.3 Update Bingo presenter page [DEPENDS: 2.5, 3.3]
│  ├─ 4.4 Update Bingo display page [DEPENDS: 2.5]
│  ├─ 4.5 Integrate auto-sync into Bingo store [DEPENDS: 3.3, 4.2]
│  └─ 4.6 Test Bingo full flow [DEPENDS: 4.1, 4.2, 4.3, 4.4, 4.5]
│
├─ Phase 5: Trivia Integration [6 tasks] [DEPENDS: Phases 1, 2, 3]
│  ├─ 5.1 Implement Trivia API routes [DEPENDS: 1.1]
│  ├─ 5.2 Create Trivia state serializer [DEPENDS: 1.6]
│  ├─ 5.3 Update Trivia presenter page [DEPENDS: 2.5, 3.3]
│  ├─ 5.4 Update Trivia display page [DEPENDS: 2.5]
│  ├─ 5.5 Integrate auto-sync into Trivia store [DEPENDS: 3.3, 5.2]
│  └─ 5.6 Test Trivia full flow [DEPENDS: 5.1, 5.2, 5.3, 5.4, 5.5]
│
└─ Phase 6: Polish & Testing [6 tasks] [DEPENDS: Phases 4, 5]
   ├─ 6.1 Error handling and edge cases [DEPENDS: 4.6, 5.6]
   ├─ 6.2 Loading states and transitions [DEPENDS: 4.6, 5.6]
   ├─ 6.3 Accessibility review [DEPENDS: 4.6, 5.6]
   ├─ 6.4 Manual testing checklist [DEPENDS: 6.1, 6.2, 6.3]
   ├─ 6.5 Update documentation [DEPENDS: 6.4]
   └─ 6.6 Add SESSION_TOKEN_SECRET to .env.example [DEPENDS: 1.2]
```

---

## Task Details

### Phase 1: Foundation

#### 1.1 Create session-routes factory
**File:** `packages/database/src/api/session-routes.ts`
**Priority:** High
**Complexity:** Large
**Status:** Todo
**Dependencies:** None

**Description:**
Create a shared route handler factory that generates Next.js API route handlers for session management. This factory will be used by both Bingo and Trivia apps to eliminate code duplication.

**Acceptance Criteria:**
- [ ] Factory function `createSessionRoutes(config)` implemented
- [ ] Returns handlers for: POST (create), GET (get session), verifyPin, updateState, complete
- [ ] Accepts config: `gameType`, `createClient`, optional `validateGameState`
- [ ] All handlers use HMAC token validation
- [ ] Server-side room code generation via database function
- [ ] PIN validation and lockout logic integrated
- [ ] Proper error handling with appropriate HTTP status codes

**ELI5:**
Like a cookie cutter that makes the same shape cookies (API routes) for both games, so we don't have to write the same code twice.

**Files:**
- Create: `packages/database/src/api/session-routes.ts` (~200 lines)
- Reference: [Refined Plan - Shared Route Handler Factory](../features/persistent-sessions-refined.md#shared-route-handler-factory)

---

#### 1.2 Add HMAC token utilities
**File:** `packages/database/src/hmac-tokens.ts`
**Priority:** High
**Complexity:** Medium
**Status:** Todo
**Dependencies:** None

**Description:**
Implement HMAC-SHA256 token signing and verification using Web Crypto API. This prevents client-side token tampering by cryptographically signing session tokens.

**Acceptance Criteria:**
- [ ] Function `signToken(token, secret)` creates HMAC signature
- [ ] Function `verifyAndDecodeToken(signedToken, secret)` verifies and decodes
- [ ] Uses Web Crypto API (built into Node.js)
- [ ] Format: base64url(payload.signature)
- [ ] Returns null on verification failure
- [ ] No external dependencies required

**ELI5:**
Like putting a special seal on a letter that only you can create. If someone tries to change what's inside and reseal it, you'll know because the seal won't match.

**Files:**
- Create: `packages/database/src/hmac-tokens.ts` (~80 lines)
- Reference: [Refined Plan - HMAC Token Security](../features/persistent-sessions-refined.md#hmac-token-security)

---

#### 1.3 Update database migration
**File:** `supabase/migrations/20260120000002_add_sequence_number.sql`
**Priority:** High
**Complexity:** Small
**Status:** Todo
**Dependencies:** None

**Description:**
Add sequence_number column to game_sessions table with auto-increment trigger. This prevents race conditions between BroadcastChannel and database updates.

**Acceptance Criteria:**
- [ ] Add `sequence_number BIGINT NOT NULL DEFAULT 0` column
- [ ] Create index on sequence_number
- [ ] Create `increment_sequence_number()` trigger function
- [ ] Trigger fires on UPDATE to increment counter
- [ ] Trigger also updates `updated_at` timestamp

**ELI5:**
Like adding a version number to every save, so if two people try to update at the same time, we know which one is newer.

**Files:**
- Create: `supabase/migrations/20260120000002_add_sequence_number.sql` (~30 lines)
- Modifies: `game_sessions` table
- Reference: [Refined Plan - Database Schema](../features/persistent-sessions-refined.md#database-schema)

---

#### 1.4 Mark game-sessions deprecated
**File:** `packages/database/src/tables/game-sessions.ts`
**Priority:** Low
**Complexity:** Small
**Status:** Todo
**Dependencies:** None

**Description:**
Add JSDoc deprecation notice to the in-memory game-sessions module, guiding developers to use persistent-sessions instead.

**Acceptance Criteria:**
- [ ] Add `@deprecated` JSDoc comment at top of file
- [ ] Explain migration path to persistent-sessions.ts
- [ ] Note removal planned for v0.2.0
- [ ] Remove exports from `packages/database/src/index.ts`
- [ ] Keep file for backwards compatibility (1 release cycle)

**ELI5:**
Like putting a "This road is closed, use the new highway instead" sign on an old path.

**Files:**
- Modify: `packages/database/src/tables/game-sessions.ts` (add comment)
- Modify: `packages/database/src/index.ts` (remove exports)
- Reference: [Refined Plan - Consolidated Session Systems](../features/persistent-sessions-refined.md#consolidated-session-systems)

---

#### 1.5 Write factory and token tests
**Files:**
- `packages/database/src/api/__tests__/session-routes.test.ts`
- `packages/database/src/__tests__/hmac-tokens.test.ts`
**Priority:** High
**Complexity:** Medium
**Status:** Todo
**Dependencies:** 1.1, 1.2

**Description:**
Write comprehensive unit tests for the session routes factory and HMAC token utilities.

**Acceptance Criteria:**
- [ ] Route factory tests with mock Next.js requests/responses
- [ ] Test all 5 route handlers (create, get, verifyPin, updateState, complete)
- [ ] Test PIN validation and lockout logic
- [ ] Test HMAC signing and verification
- [ ] Test token tampering detection
- [ ] Test expired token handling
- [ ] Achieve >90% code coverage

**ELI5:**
Like testing every button and switch in a car before selling it, to make sure everything works correctly.

**Files:**
- Create: `packages/database/src/api/__tests__/session-routes.test.ts` (~150 lines)
- Create: `packages/database/src/__tests__/hmac-tokens.test.ts` (~100 lines)

---

#### 1.6 Update package exports
**Files:** `packages/database/src/index.ts`, `packages/database/src/api/index.ts`
**Priority:** Medium
**Complexity:** Small
**Status:** Todo
**Dependencies:** 1.1, 1.2, 1.3, 1.4, 1.5

**Description:**
Export new session routes factory and HMAC utilities from database package.

**Acceptance Criteria:**
- [ ] Export `createSessionRoutes` from `packages/database/src/api/index.ts`
- [ ] Export `signToken`, `verifyAndDecodeToken` from `packages/database/src/index.ts`
- [ ] Export types: `SessionRouteConfig`, `SessionToken`
- [ ] Remove deprecated game-sessions exports
- [ ] Update package version

**ELI5:**
Like adding new tools to a toolbox and removing old broken ones, so other people can use the new tools.

**Files:**
- Modify: `packages/database/src/index.ts`
- Create: `packages/database/src/api/index.ts`

---

### Phase 2: Shared Components

#### 2.1 Create CreateGameModal
**File:** `packages/ui/src/create-game-modal.tsx`
**Priority:** High
**Complexity:** Medium
**Status:** Todo
**Dependencies:** 1.6

**Description:**
Create a reusable modal component for creating new game sessions with PIN entry and confirmation.

**Acceptance Criteria:**
- [ ] Modal with title, close button, form fields
- [ ] PIN input (4-6 digits, password type)
- [ ] Confirm PIN input
- [ ] Client-side validation (format, match)
- [ ] Submit handler with loading state
- [ ] Error display
- [ ] Help text: "Choose a PIN you'll remember for rejoining"
- [ ] Accessible (ARIA labels, focus management)

**ELI5:**
A popup window where the game host enters a secret code to protect their game controls.

**Files:**
- Create: `packages/ui/src/create-game-modal.tsx` (~150 lines)
- Reference: [Refined Plan - CreateGameModal](../features/persistent-sessions-refined.md#creategamemodal)

---

#### 2.2 Create JoinGameModal
**File:** `packages/ui/src/join-game-modal.tsx`
**Priority:** High
**Complexity:** Medium
**Status:** Todo
**Dependencies:** 1.6

**Description:**
Create a reusable modal component for joining existing game sessions with PIN verification.

**Acceptance Criteria:**
- [ ] Modal with room code in title
- [ ] PIN input (password type, autofocus)
- [ ] Submit handler with loading state
- [ ] Error display with remaining attempts
- [ ] Warning when attempts < 5
- [ ] Accessible (ARIA labels, focus management)

**ELI5:**
A popup window where someone enters the secret code to take control of an existing game.

**Files:**
- Create: `packages/ui/src/join-game-modal.tsx` (~150 lines)
- Reference: [Refined Plan - JoinGameModal](../features/persistent-sessions-refined.md#joingamemodal)

---

#### 2.3 Create RoomCodeDisplay
**File:** `packages/ui/src/room-code-display.tsx`
**Priority:** High
**Complexity:** Small
**Status:** Todo
**Dependencies:** 1.6

**Description:**
Create a component to prominently display the room code with copy-to-clipboard functionality.

**Acceptance Criteria:**
- [ ] Large, bold room code display (5xl font)
- [ ] "Copy Link" button with clipboard API
- [ ] "Copied!" feedback (2 second timeout)
- [ ] Optional "Show QR Code" button
- [ ] Sync status indicator (saving, last saved time)
- [ ] Responsive design

**ELI5:**
A big sign showing the game's room code so everyone knows how to join.

**Files:**
- Create: `packages/ui/src/room-code-display.tsx` (~100 lines)
- Reference: [Refined Plan - RoomCodeDisplay](../features/persistent-sessions-refined.md#roomcodedisplay)

---

#### 2.4 Create SyncStatusIndicator
**File:** `packages/ui/src/sync-status-indicator.tsx`
**Priority:** Medium
**Complexity:** Small
**Status:** Todo
**Dependencies:** 1.6

**Description:**
Create a component to show sync status (saving, saved, error) with visual feedback.

**Acceptance Criteria:**
- [ ] "Saving..." state with spinner
- [ ] "Saved X ago" state with checkmark
- [ ] Error state with icon and message
- [ ] Uses `formatDistanceToNow` for timestamps
- [ ] Small, unobtrusive design

**ELI5:**
A little indicator that shows whether your game changes are being saved, like a "saving..." message in a video game.

**Files:**
- Create: `packages/ui/src/sync-status-indicator.tsx` (~80 lines)

---

#### 2.5 Update package exports
**File:** `packages/ui/src/index.ts`
**Priority:** Medium
**Complexity:** Small
**Status:** Todo
**Dependencies:** 2.1, 2.2, 2.3, 2.4

**Description:**
Export all new session-related components from the UI package.

**Acceptance Criteria:**
- [ ] Export `CreateGameModal` with types
- [ ] Export `JoinGameModal` with types
- [ ] Export `RoomCodeDisplay` with types
- [ ] Export `SyncStatusIndicator` with types
- [ ] Update package version

**ELI5:**
Making the new components available for the games to use.

**Files:**
- Modify: `packages/ui/src/index.ts`

---

#### 2.6 Write component tests
**Files:** `packages/ui/src/__tests__/*.test.tsx` (4 files)
**Priority:** High
**Complexity:** Medium
**Status:** Todo
**Dependencies:** 2.1, 2.2, 2.3, 2.4

**Description:**
Write comprehensive tests for all session-related UI components.

**Acceptance Criteria:**
- [ ] CreateGameModal: PIN validation, confirmation matching, submit flow
- [ ] JoinGameModal: PIN entry, error display, remaining attempts
- [ ] RoomCodeDisplay: Copy functionality, QR code, sync status
- [ ] SyncStatusIndicator: All states (saving, saved, error)
- [ ] Accessibility tests (ARIA labels, keyboard nav)
- [ ] Achieve >85% code coverage

**ELI5:**
Testing all the popup windows and displays to make sure they work correctly.

**Files:**
- Create: `packages/ui/src/__tests__/create-game-modal.test.tsx`
- Create: `packages/ui/src/__tests__/join-game-modal.test.tsx`
- Create: `packages/ui/src/__tests__/room-code-display.test.tsx`
- Create: `packages/ui/src/__tests__/sync-status-indicator.test.tsx`

---

### Phase 3: Auto-Sync Hooks

#### 3.1 Create use-auto-sync hook
**File:** `packages/sync/src/use-auto-sync.ts`
**Priority:** High
**Complexity:** Large
**Status:** Todo
**Dependencies:** 1.6

**Description:**
Create a React hook that automatically syncs game state to the database with smart debouncing and throttling.

**Acceptance Criteria:**
- [ ] Debounces general state changes (2000ms default)
- [ ] Immediate sync for critical events (ball called, pattern changed, status changed)
- [ ] Throttles rapid events (500ms for auto-call)
- [ ] Skips sync during hydration (`_isHydrating` flag)
- [ ] Configurable via `AutoSyncConfig` interface
- [ ] Cleanup on unmount
- [ ] Returns sync status and error state

**ELI5:**
A smart helper that saves your game automatically, waiting a bit for normal changes but saving immediately for important events like calling a new bingo ball.

**Files:**
- Create: `packages/sync/src/use-auto-sync.ts` (~120 lines)
- Reference: [Refined Plan - Auto-Sync Strategy](../features/persistent-sessions-refined.md#auto-sync-strategy-explicit-timing)

---

#### 3.2 Create use-session-recovery hook
**File:** `packages/sync/src/use-session-recovery.ts`
**Priority:** High
**Complexity:** Medium
**Status:** Todo
**Dependencies:** 1.6

**Description:**
Create a React hook that handles session restoration on page load, checking for stored tokens and loading game state.

**Acceptance Criteria:**
- [ ] Checks localStorage for session token on mount
- [ ] Validates token (not expired, correct format)
- [ ] Fetches game state from API if token valid
- [ ] Calls store's `_hydrate()` method to restore state
- [ ] Handles token expiry gracefully
- [ ] Prompts for PIN if token invalid but room code in URL
- [ ] Returns loading state and error state

**ELI5:**
A helper that checks if you were playing a game before and brings you back to where you left off.

**Files:**
- Create: `packages/sync/src/use-session-recovery.ts` (~100 lines)

---

#### 3.3 Update package exports
**File:** `packages/sync/src/index.ts`
**Priority:** Medium
**Complexity:** Small
**Status:** Todo
**Dependencies:** 3.1, 3.2

**Description:**
Export new sync hooks and related types from the sync package.

**Acceptance Criteria:**
- [ ] Export `useAutoSync` with `AutoSyncConfig` type
- [ ] Export `useSessionRecovery` with return types
- [ ] Update package version

**ELI5:**
Making the new sync helpers available for the games to use.

**Files:**
- Modify: `packages/sync/src/index.ts`

---

#### 3.4 Write hook tests
**Files:** `packages/sync/src/__tests__/*.test.ts` (2 files)
**Priority:** High
**Complexity:** Medium
**Status:** Todo
**Dependencies:** 3.1, 3.2

**Description:**
Write comprehensive tests for auto-sync and session recovery hooks.

**Acceptance Criteria:**
- [ ] useAutoSync: Debounce timing, throttle timing, critical events
- [ ] useAutoSync: Skips during hydration, cleanup on unmount
- [ ] useSessionRecovery: Token validation, state restoration
- [ ] useSessionRecovery: Expired token handling, missing token
- [ ] Mock timers for debounce/throttle tests
- [ ] Mock fetch/API calls
- [ ] Achieve >90% code coverage

**ELI5:**
Testing the automatic save and restore features to make sure they work correctly.

**Files:**
- Create: `packages/sync/src/__tests__/use-auto-sync.test.ts`
- Create: `packages/sync/src/__tests__/use-session-recovery.test.ts`

---

### Phase 4: Bingo Integration

#### 4.1 Implement Bingo API routes
**Files:** `apps/bingo/src/app/api/sessions/**/*.ts` (5 files)
**Priority:** High
**Complexity:** Small
**Status:** Todo
**Dependencies:** 1.1

**Description:**
Create Next.js API routes for Bingo using the shared session-routes factory.

**Acceptance Criteria:**
- [ ] `/api/sessions/route.ts` - POST (create), GET (list)
- [ ] `/api/sessions/[roomCode]/route.ts` - GET (get session)
- [ ] `/api/sessions/[roomCode]/verify-pin/route.ts` - POST
- [ ] `/api/sessions/[roomCode]/state/route.ts` - PATCH
- [ ] `/api/sessions/[roomCode]/complete/route.ts` - POST
- [ ] All routes use shared factory with `gameType: 'bingo'`
- [ ] Optional Bingo state validation function

**ELI5:**
Creating the connection points where the Bingo game can save and load its data.

**Files:**
- Create: `apps/bingo/src/app/api/sessions/route.ts` (~10 lines)
- Create: `apps/bingo/src/app/api/sessions/[roomCode]/route.ts` (~10 lines)
- Create: `apps/bingo/src/app/api/sessions/[roomCode]/verify-pin/route.ts` (~10 lines)
- Create: `apps/bingo/src/app/api/sessions/[roomCode]/state/route.ts` (~10 lines)
- Create: `apps/bingo/src/app/api/sessions/[roomCode]/complete/route.ts` (~10 lines)
- Reference: [Refined Plan - Usage in Apps](../features/persistent-sessions-refined.md#usage-in-apps-3-lines-per-route)

---

#### 4.2 Create Bingo state serializer
**File:** `apps/bingo/src/lib/session/serializer.ts`
**Priority:** High
**Complexity:** Medium
**Status:** Todo
**Dependencies:** 1.6

**Description:**
Create functions to serialize and deserialize Bingo game state for database storage.

**Acceptance Criteria:**
- [ ] `serialize(state: GameState): Record<string, unknown>`
- [ ] `deserialize(data: Record<string, unknown>): Partial<GameState>`
- [ ] Includes: status, pattern, calledBalls, currentBall, previousBall, deck
- [ ] Includes: autoCallEnabled, autoCallSpeed, audioEnabled
- [ ] Handles missing/invalid data gracefully
- [ ] Type-safe with GameState interface

**ELI5:**
Translating the Bingo game state into a format that can be saved in the database and back again.

**Files:**
- Create: `apps/bingo/src/lib/session/serializer.ts` (~80 lines)

---

#### 4.3 Update Bingo presenter page
**File:** `apps/bingo/src/app/play/page.tsx`
**Priority:** High
**Complexity:** Medium
**Status:** Todo
**Dependencies:** 2.5, 3.3

**Description:**
Integrate session management UI and hooks into the Bingo presenter page.

**Acceptance Criteria:**
- [ ] Add state for: roomCode, showCreateModal, showJoinModal
- [ ] Import CreateGameModal, JoinGameModal, RoomCodeDisplay
- [ ] Use useSessionRecovery hook on mount
- [ ] Use useAutoSync hook for persistence
- [ ] Create session on "New Game" button
- [ ] Show room code prominently when session active
- [ ] Handle session creation and join flows
- [ ] Maintain existing game controls

**ELI5:**
Adding the ability to create and join games with room codes to the Bingo host screen.

**Files:**
- Modify: `apps/bingo/src/app/play/page.tsx` (~30 lines added)

---

#### 4.4 Update Bingo display page
**File:** `apps/bingo/src/app/display/page.tsx`
**Priority:** High
**Complexity:** Small
**Status:** Todo
**Dependencies:** 2.5

**Description:**
Update Bingo audience display to use room code from URL and show room code display.

**Acceptance Criteria:**
- [ ] Parse room code from URL query param: `?room=SWAN-42`
- [ ] Validate room code format
- [ ] Show error if invalid room code
- [ ] Display RoomCodeDisplay component (read-only)
- [ ] Maintain existing audience view functionality
- [ ] Auto-reconnect on page refresh

**ELI5:**
Making the audience screen able to join a game using the room code in the web address.

**Files:**
- Modify: `apps/bingo/src/app/display/page.tsx` (~20 lines added)

---

#### 4.5 Integrate auto-sync into Bingo store
**File:** `apps/bingo/src/stores/game-store.ts`
**Priority:** High
**Complexity:** Small
**Status:** Todo
**Dependencies:** 3.3, 4.2

**Description:**
Wire up auto-sync hook in the Bingo game store to persist state changes.

**Acceptance Criteria:**
- [ ] Import bingoStateSerializer
- [ ] Call useAutoSync in play page (presenter only)
- [ ] Configure critical events: BALL_CALLED, PATTERN_CHANGED, STATUS_CHANGED
- [ ] Skip auto-sync for theme/audio changes (localStorage only)
- [ ] Test state persistence during active gameplay

**ELI5:**
Connecting the automatic save feature to the Bingo game so changes get saved to the database.

**Files:**
- Modify: `apps/bingo/src/stores/game-store.ts` (no changes to store itself)
- Modify: `apps/bingo/src/app/play/page.tsx` (add useAutoSync call)

---

#### 4.6 Test Bingo full flow
**Type:** Manual Testing
**Priority:** High
**Complexity:** Medium
**Status:** Todo
**Dependencies:** 4.1, 4.2, 4.3, 4.4, 4.5

**Description:**
Perform end-to-end testing of the complete Bingo session flow.

**Acceptance Criteria:**
- [ ] Create game with 4-6 digit PIN
- [ ] Room code displays prominently
- [ ] Call several bingo balls (auto-sync triggers)
- [ ] Copy audience display link
- [ ] Open audience display in new window (no PIN required)
- [ ] Refresh presenter page
- [ ] Rejoin with correct PIN
- [ ] Game state fully restored (balls called, pattern, etc.)
- [ ] Audience display updates in real-time via BroadcastChannel
- [ ] Test wrong PIN (shows remaining attempts)
- [ ] Test PIN lockout (5 failed attempts)

**ELI5:**
Playing through a complete Bingo game to make sure everything works together correctly.

**Files:**
- No code changes, testing only

---

### Phase 5: Trivia Integration

#### 5.1 Implement Trivia API routes
**Files:** `apps/trivia/src/app/api/sessions/**/*.ts` (5 files)
**Priority:** High
**Complexity:** Small
**Status:** Todo
**Dependencies:** 1.1

**Description:**
Create Next.js API routes for Trivia using the shared session-routes factory (identical to Bingo pattern).

**Acceptance Criteria:**
- [ ] Same 5 route files as Bingo
- [ ] Use shared factory with `gameType: 'trivia'`
- [ ] Optional Trivia state validation function

**ELI5:**
Creating the connection points where the Trivia game can save and load its data (same as Bingo).

**Files:**
- Create: `apps/trivia/src/app/api/sessions/route.ts` (~10 lines)
- Create: `apps/trivia/src/app/api/sessions/[roomCode]/route.ts` (~10 lines)
- Create: `apps/trivia/src/app/api/sessions/[roomCode]/verify-pin/route.ts` (~10 lines)
- Create: `apps/trivia/src/app/api/sessions/[roomCode]/state/route.ts` (~10 lines)
- Create: `apps/trivia/src/app/api/sessions/[roomCode]/complete/route.ts` (~10 lines)

---

#### 5.2 Create Trivia state serializer
**File:** `apps/trivia/src/lib/session/serializer.ts`
**Priority:** High
**Complexity:** Medium
**Status:** Todo
**Dependencies:** 1.6

**Description:**
Create functions to serialize and deserialize Trivia game state for database storage.

**Acceptance Criteria:**
- [ ] `serialize(state: TriviaGameState): Record<string, unknown>`
- [ ] `deserialize(data: Record<string, unknown>): Partial<TriviaGameState>`
- [ ] Includes: status, currentRound, totalRounds, teams, questions
- [ ] Includes: selectedQuestionIndex, teamAnswers, settings
- [ ] Handles missing/invalid data gracefully
- [ ] Type-safe with TriviaGameState interface

**ELI5:**
Translating the Trivia game state into a format that can be saved in the database and back again.

**Files:**
- Create: `apps/trivia/src/lib/session/serializer.ts` (~80 lines)

---

#### 5.3 Update Trivia presenter page
**File:** `apps/trivia/src/app/play/page.tsx`
**Priority:** High
**Complexity:** Medium
**Status:** Todo
**Dependencies:** 2.5, 3.3

**Description:**
Integrate session management UI and hooks into the Trivia presenter page (same pattern as Bingo).

**Acceptance Criteria:**
- [ ] Same integration as Bingo 4.3
- [ ] Create/join modals
- [ ] Room code display
- [ ] Session recovery on mount
- [ ] Auto-sync hook

**ELI5:**
Adding the ability to create and join games with room codes to the Trivia host screen.

**Files:**
- Modify: `apps/trivia/src/app/play/page.tsx` (~30 lines added)

---

#### 5.4 Update Trivia display page
**File:** `apps/trivia/src/app/display/page.tsx`
**Priority:** High
**Complexity:** Small
**Status:** Todo
**Dependencies:** 2.5

**Description:**
Update Trivia audience display to use room code from URL (same pattern as Bingo).

**Acceptance Criteria:**
- [ ] Same integration as Bingo 4.4
- [ ] Parse room code from URL
- [ ] Show room code display
- [ ] Auto-reconnect on refresh

**ELI5:**
Making the audience screen able to join a game using the room code in the web address.

**Files:**
- Modify: `apps/trivia/src/app/display/page.tsx` (~20 lines added)

---

#### 5.5 Integrate auto-sync into Trivia store
**File:** `apps/trivia/src/stores/game-store.ts`
**Priority:** High
**Complexity:** Small
**Status:** Todo
**Dependencies:** 3.3, 5.2

**Description:**
Wire up auto-sync hook in the Trivia game store to persist state changes.

**Acceptance Criteria:**
- [ ] Import triviaStateSerializer
- [ ] Call useAutoSync in play page (presenter only)
- [ ] Configure critical events: QUESTION_REVEALED, ANSWER_REVEALED, STATUS_CHANGED
- [ ] Skip auto-sync for theme/audio changes (localStorage only)

**ELI5:**
Connecting the automatic save feature to the Trivia game so changes get saved to the database.

**Files:**
- Modify: `apps/trivia/src/app/play/page.tsx` (add useAutoSync call)

---

#### 5.6 Test Trivia full flow
**Type:** Manual Testing
**Priority:** High
**Complexity:** Medium
**Status:** Todo
**Dependencies:** 5.1, 5.2, 5.3, 5.4, 5.5

**Description:**
Perform end-to-end testing of the complete Trivia session flow (same as Bingo).

**Acceptance Criteria:**
- [ ] Create game with PIN
- [ ] Reveal questions (auto-sync triggers)
- [ ] Open audience display
- [ ] Refresh presenter page
- [ ] Rejoin and verify state restored (teams, scores, current question)
- [ ] Test audience real-time updates
- [ ] Test PIN lockout

**ELI5:**
Playing through a complete Trivia game to make sure everything works together correctly.

**Files:**
- No code changes, testing only

---

### Phase 6: Polish & Testing

#### 6.1 Error handling and edge cases
**Priority:** Medium
**Complexity:** Medium
**Status:** Todo
**Dependencies:** 4.6, 5.6

**Description:**
Improve error handling throughout the session management flow.

**Acceptance Criteria:**
- [ ] Graceful handling of network failures
- [ ] Retry logic for failed API calls
- [ ] Clear error messages for users
- [ ] Expired session handling
- [ ] Invalid room code handling
- [ ] Database connection errors
- [ ] Concurrent update conflicts

**ELI5:**
Making sure the game handles problems gracefully instead of breaking.

**Files:**
- Modify: Various files across packages/ui, packages/sync, app integrations

---

#### 6.2 Loading states and transitions
**Priority:** Medium
**Complexity:** Small
**Status:** Todo
**Dependencies:** 4.6, 5.6

**Description:**
Add proper loading indicators and smooth transitions for all async operations.

**Acceptance Criteria:**
- [ ] Loading spinner during session creation
- [ ] Loading state during PIN verification
- [ ] Loading state during session restore
- [ ] Skeleton loaders for game state
- [ ] Smooth transitions between states
- [ ] No layout shift during loading

**ELI5:**
Adding spinners and smooth animations so users know when things are loading.

**Files:**
- Modify: UI components, page components

---

#### 6.3 Accessibility review
**Priority:** Medium
**Complexity:** Small
**Status:** Todo
**Dependencies:** 4.6, 5.6

**Description:**
Audit and improve accessibility of all session-related UI.

**Acceptance Criteria:**
- [ ] All modals have proper ARIA labels
- [ ] Focus management (trapped in modals, restored on close)
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announcements for state changes
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets ≥44x44px (accessible)
- [ ] Error messages associated with form fields

**ELI5:**
Making sure everyone can use the game, including people who use screen readers or keyboards instead of a mouse.

**Files:**
- Modify: All UI components

---

#### 6.4 Manual testing checklist
**Type:** Manual Testing
**Priority:** High
**Complexity:** Medium
**Status:** Todo
**Dependencies:** 6.1, 6.2, 6.3

**Description:**
Complete comprehensive manual testing checklist covering all scenarios.

**Acceptance Criteria:**
- [ ] All session creation scenarios (4-digit, 6-digit, validation errors)
- [ ] All session rejoin scenarios (correct PIN, wrong PIN, lockout)
- [ ] All audience view scenarios (join, refresh, reconnect)
- [ ] All sync behavior scenarios (debounce, immediate, sequence numbers)
- [ ] All security scenarios (token tampering, expiry, rate limiting)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing (iOS Safari, Android Chrome)

**ELI5:**
Testing every possible way someone might use the game to find any remaining bugs.

**Files:**
- No code changes, testing only
- Reference: [Refined Plan - Manual Testing Checklist](../features/persistent-sessions-refined.md#manual-testing-checklist)

---

#### 6.5 Update documentation
**Priority:** Medium
**Complexity:** Small
**Status:** Todo
**Dependencies:** 6.4

**Description:**
Update all documentation to reflect the new persistent sessions feature.

**Acceptance Criteria:**
- [ ] Update main README with session features
- [ ] Update CLAUDE.md files for both apps
- [ ] Add usage examples to package READMEs
- [ ] Document API routes
- [ ] Add troubleshooting guide
- [ ] Update CHANGELOG

**ELI5:**
Writing instructions so other people know how to use the new session features.

**Files:**
- Modify: `README.md`, `apps/bingo/CLAUDE.md`, `apps/trivia/CLAUDE.md`
- Modify: `packages/database/README.md`, `packages/ui/README.md`, `packages/sync/README.md`
- Create: `docs/features/persistent-sessions-usage.md`

---

#### 6.6 Add SESSION_TOKEN_SECRET to .env.example
**Priority:** Low
**Complexity:** Small
**Status:** Todo
**Dependencies:** 1.2

**Description:**
Add SESSION_TOKEN_SECRET environment variable to example env files.

**Acceptance Criteria:**
- [ ] Add to `apps/bingo/.env.example`
- [ ] Add to `apps/trivia/.env.example`
- [ ] Include comment with generation command
- [ ] Add to deployment documentation

**ELI5:**
Adding a placeholder for the secret key needed to sign session tokens.

**Files:**
- Modify: `apps/bingo/.env.example`
- Modify: `apps/trivia/.env.example`
- Modify: `docs/deployment.md`

---

## Parallelization Opportunities

**Can run in parallel (no blocking dependencies):**

**Phase 1:**
- 1.1, 1.2, 1.3, 1.4 can all run in parallel
- 1.5 waits for 1.1, 1.2
- 1.6 waits for all Phase 1

**Phase 2:** (after Phase 1 complete)
- 2.1, 2.2, 2.3, 2.4 can all run in parallel
- 2.5, 2.6 wait for components

**Phase 3:** (after Phase 1 complete, parallel to Phase 2)
- 3.1, 3.2 can run in parallel
- 3.3, 3.4 wait for hooks

**Phase 4 & 5:** (after Phases 1, 2, 3 complete)
- **All of Phase 4 and Phase 5 can run in parallel** (Bingo and Trivia independent)
- Within Phase 4: 4.1, 4.2 can start immediately; 4.3, 4.4 wait for 2.5; 4.5 waits for 3.3, 4.2
- Within Phase 5: Same pattern as Phase 4

**Phase 6:** (after Phases 4, 5 complete)
- 6.1, 6.2, 6.3 can run in parallel
- 6.4 waits for 6.1, 6.2, 6.3
- 6.5 waits for 6.4
- 6.6 is independent, can run anytime after 1.2

**Maximum Parallelism:**
- **Phase 1:** Up to 4 agents simultaneously (1.1, 1.2, 1.3, 1.4)
- **Phase 2 & 3:** Up to 6 agents simultaneously (4 components + 2 hooks)
- **Phase 4 & 5:** Up to 12 agents simultaneously (6 Bingo + 6 Trivia)
- **Phase 6:** Up to 3 agents simultaneously (6.1, 6.2, 6.3)

---

## Summary Statistics

- **Total Issues:** 38 (1 epic + 6 phase parents + 31 tasks)
- **High Priority:** 18 tasks
- **Medium Priority:** 11 tasks
- **Low Priority:** 2 tasks
- **Large Complexity:** 2 tasks
- **Medium Complexity:** 16 tasks
- **Small Complexity:** 13 tasks
- **Approximate LOC:** ~1,500 lines of new code
- **Code Reduction:** 44% vs. duplicated approach

---

## GitHub Projects Custom Fields

**Required Custom Fields:**

1. **Status** (Single Select)
   - Options: Todo, In Progress, Done
   - Default: Todo

2. **Phase** (Single Select)
   - Options: Foundation, Shared Components, Auto-Sync Hooks, Bingo Integration, Trivia Integration, Polish & Testing
   - Grouping field for project views

3. **Priority** (Single Select)
   - Options: High, Medium, Low
   - Used for task ordering

4. **Complexity** (Single Select)
   - Options: Small, Medium, Large
   - Assessment of implementation complexity

5. **Description** (Text)
   - Markdown description of the task (auto-populated from issue body)

6. **Acceptance Criteria** (Text)
   - Checklist of requirements (auto-populated from issue body)

7. **ELI5** (Text)
   - Simple explanation (auto-populated from issue body)

**Built-in Fields:**
- Assignees (always you)
- Labels (will add: `feature`, `persistent-sessions`, `phase-N`)
- Linked Pull Requests (for tracking)

---

## Next Steps

1. ✅ Research GitHub API structure (COMPLETE)
2. ✅ Create dependency tree (COMPLETE)
3. ⏭️ Create parent epic issue
4. ⏭️ Create 6 phase sub-issues under epic
5. ⏭️ Create 31 task issues with dependencies
6. ⏭️ Link all issues to relevant codebase files
7. ⏭️ Set up GitHub Project board with custom fields
8. ⏭️ Add all issues to project
9. ⏭️ Configure project views (Board, Roadmap, Dependency Graph)

---

**References:**
- [Persistent Sessions Refined Plan](./persistent-sessions-refined.md)
- [GitHub Projects API Documentation](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects)
- [GitHub Sub-issues Documentation](https://docs.github.com/en/issues/managing-your-tasks-with-tasklists/using-projects-and-tasklists)
- [GitHub Issue Dependencies](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies)
