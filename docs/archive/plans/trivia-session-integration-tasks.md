# Trivia Session Integration - Remaining Tasks

## Status Summary

**Frontend Integration:** ✅ Complete (via PRs #131, #132, #133, #139)
**Backend API Routes:** ❌ Missing (0/5 essential routes implemented)

## What's Already Done

The merged PRs successfully implemented:

1. ✅ State serializer (`apps/trivia/src/lib/state/serializer.ts`)
2. ✅ Secure generation utilities (`apps/trivia/src/lib/session/secure-generation.ts`)
3. ✅ RoomSetupModal component (`apps/trivia/src/components/presenter/RoomSetupModal.tsx`)
4. ✅ Presenter page session integration (imports, hooks, handlers)
5. ✅ Display page room code parsing
6. ✅ Session recovery logic (using `useSessionRecovery` hook)
7. ✅ Auto-sync logic (using `useAutoSync` hook)
8. ✅ Offline mode with localStorage persistence

## Known Issues

### UI Issues
- **RoomSetupModal not centered:** The modal is not properly centered on the screen. Needs CSS/layout fix and Playwright test to verify.

## Critical Missing Components

### API Routes (Priority: HIGH)

The presenter page code expects these API routes that don't exist yet:

#### 1. Create Session: `POST /api/sessions`
**Expected by:** Line 374 in `apps/trivia/src/app/play/page.tsx`
**Request:**
```json
{
  "pin": "1234",
  "initialState": { /* serialized game state */ }
}
```
**Response:**
```json
{
  "data": {
    "session": { "roomCode": "SWAN-42" },
    "sessionToken": "jwt-token-here"
  }
}
```
**Reference:** `apps/bingo/src/app/api/sessions/route.ts`

#### 2. Get Session State: `GET /api/sessions/[roomCode]`
**Expected by:** Line 109 in `apps/trivia/src/app/play/page.tsx` (useSessionRecovery)
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "gameState": { /* deserialized game state */ }
}
```
**Reference:** `apps/bingo/src/app/api/sessions/[roomCode]/route.ts`

#### 3. Update Session State: `PATCH /api/sessions/[roomCode]/state`
**Expected by:** Line 151 in `apps/trivia/src/app/play/page.tsx` (useAutoSync)
**Request:**
```json
{
  "sessionToken": "jwt-token",
  "state": { /* serialized game state */ }
}
```
**Response:**
```json
{
  "success": true
}
```
**Reference:** `apps/bingo/src/app/api/sessions/[roomCode]/state/route.ts`

#### 4. Verify PIN: `POST /api/sessions/[roomCode]/verify-pin`
**Expected by:** Line 404 in `apps/trivia/src/app/play/page.tsx`
**Request:**
```json
{
  "pin": "1234"
}
```
**Response:**
```json
{
  "token": "jwt-token-here"
}
```
**Reference:** `apps/bingo/src/app/api/sessions/[roomCode]/verify-pin/route.ts`

#### 5. Complete Session: `POST /api/sessions/[roomCode]/complete` (Optional)
**Reference:** `apps/bingo/src/app/api/sessions/[roomCode]/complete/route.ts`
**Notes:** Marks session as complete when game ends. Not critical for MVP.

## Implementation Approach

### Option 1: Copy and Adapt Bingo API Routes (RECOMMENDED)
**Pros:**
- Fast implementation
- Known working patterns
- Consistent with Bingo

**Steps:**
1. Copy `apps/bingo/src/app/api/sessions/` directory to `apps/trivia/src/app/api/sessions/`
2. Update imports to use Trivia's serializer:
   - Change: `import { serializeBingoState, deserializeBingoState } from '@/lib/state/serializer';`
   - To: `import { serializeTriviaState, deserializeTriviaState } from '@/lib/state/serializer';`
3. Update game_type in all routes:
   - Change: `game_type: 'bingo'`
   - To: `game_type: 'trivia'`
4. Copy tests from `apps/bingo/src/app/api/**/__tests__/` and adapt
5. Test all routes with Playwright/Postman

### Option 2: Build from Scratch Using Shared Utilities
**Pros:**
- Learn the patterns deeply
- Customize for Trivia-specific needs

**Steps:**
1. Use `@joolie-boolie/database` package functions:
   - `createGameSession(supabase, { ... })`
   - `getGameSession(supabase, sessionId)`
   - `updateGameSession(supabase, sessionId, { ... })`
   - `verifySessionPin(supabase, roomCode, pin)`
2. Implement JWT token generation/verification (see Bingo's implementation)
3. Add proper error handling and validation
4. Write comprehensive tests

## Testing Requirements

After implementing API routes:

### Unit Tests
- [ ] Test each API route with valid inputs
- [ ] Test authentication/authorization
- [ ] Test PIN verification (correct and incorrect)
- [ ] Test error cases (missing session, invalid token, etc.)

### Integration Tests
- [ ] Test full session creation flow
- [ ] Test session recovery after page refresh
- [ ] Test auto-sync updates state correctly
- [ ] Test offline mode localStorage persistence
- [ ] Test concurrent updates from multiple devices

### E2E Tests (Playwright)
- [ ] **RoomSetupModal appearance and centering:**
  - Modal shows on first load when no session exists
  - Modal is properly centered on viewport
  - Modal is responsive on mobile/tablet/desktop
  - All three options visible: Create Room, Join Room, Play Offline
- [ ] **Create session flow:**
  - Click "Create Room" button
  - PIN is auto-generated and displayed
  - Session created successfully
  - Room code displayed on presenter page
  - Display window opens with correct URL
  - Game state syncs between presenter and display
- [ ] **Join existing session with PIN:**
  - Enter valid room code and PIN
  - Session joined successfully
  - Game state loads from database
  - Display syncs with presenter
- [ ] **Session recovery after browser restart:**
  - Create session
  - Refresh page
  - Session recovers automatically
  - Game state persists
- [ ] **Offline mode:**
  - Click "Play Offline"
  - 6-character session ID generated
  - Game works without network
  - State persists in localStorage
  - Display window syncs via BroadcastChannel

## Verification Checklist

Once API routes are implemented, verify:

- [ ] Create new game shows RoomSetupModal
- [ ] RoomSetupModal is properly centered on screen
- [ ] Can create online session with generated PIN
- [ ] Can create offline session with 6-char ID
- [ ] Can join session with room code + PIN
- [ ] Room code and PIN display on presenter page
- [ ] Session recovers after page refresh (online mode)
- [ ] Offline session recovers from localStorage
- [ ] Display window opens with room code in URL
- [ ] Game state syncs to database (online mode)
- [ ] Auto-sync debounces correctly (2s delay)
- [ ] Critical changes sync immediately
- [ ] "Create New Game" button works with confirmation
- [ ] All keyboard shortcuts still work

## Environment Variables

Ensure these are set in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For server-side operations
SESSION_TOKEN_SECRET=your-jwt-secret  # For session token signing
```

## Database Schema

The `game_sessions` table already supports Trivia (via migration `20260120000001_create_game_sessions.sql`):

```sql
CREATE TABLE public.game_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('bingo', 'trivia')),  -- ✅ Trivia supported
  game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  sequence_number BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);
```

No schema changes needed.

## References

- Bingo API Routes: `apps/bingo/src/app/api/sessions/`
- Trivia Serializer: `apps/trivia/src/lib/state/serializer.ts`
- Database Package: `packages/database/src/tables/game-sessions.ts`
- Sync Package: `packages/sync/src/`
- Database Schema: `supabase/migrations/20260120000001_create_game_sessions.sql`
