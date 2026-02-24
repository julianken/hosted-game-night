# Feature Proposal: Persistent, Rejoinable Game Sessions

**Status:** Proposed
**Created:** 2026-01-19
**Affects:** `apps/bingo`, `apps/trivia`, `packages/sync`, `packages/database`

---

## Executive Summary

Add URL-based room codes (e.g., `SWAN-42`) that allow games to be rejoined after browser refresh or disconnect. Includes PIN protection for presenter controls while keeping audience display public.

## Problem Statement

Currently:
- Game sessions exist only in browser memory
- Refreshing the presenter window loses all game state
- Session IDs are long UUIDs, not human-friendly
- No way to protect presenter controls from unauthorized access

## Solution Overview

| Feature | Description |
|---------|-------------|
| **Room Codes** | Bird-themed codes like `SWAN-42` - easy to announce over PA |
| **URL-Based** | `/play?room=SWAN-42` and `/display?room=SWAN-42` |
| **Persistence** | Game state saved to Supabase, survives browser refresh |
| **PIN Protection** | 4-6 digit PIN protects presenter, audience is public |

---

## User Stories

### As a Presenter
1. I want to create a game with a memorable room code so I can announce it over the PA system
2. I want to set a PIN so only I can control the game
3. I want to refresh my browser without losing the game state
4. I want to rejoin my game by entering the PIN if my session expires

### As Audience
1. I want to view the game display without needing any password
2. I want the display to reconnect automatically if I refresh the page

---

## Technical Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTER /play?room=SWAN-42                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ RoomCodeDisplay│  │ Game Controls │  │ SyncStatus: ✓ Saved │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
│                              │                                  │
│                    Zustand Store + Persist                      │
│                              │                                  │
│              ┌───────────────┼───────────────┐                 │
│              │               │               │                 │
│       BroadcastChannel  LocalStorage   API Sync                │
│       (same-device)     (fast backup)  (persistent)            │
│              │                               │                 │
└──────────────┼───────────────────────────────┼─────────────────┘
               │                               │
               ↓                               ↓
┌──────────────────────────┐    ┌──────────────────────────────┐
│ AUDIENCE /display?room=  │    │ Supabase PostgreSQL          │
│ SWAN-42                  │    │ game_sessions table          │
│ (No PIN required)        │    │ {room_code, game_state, ...} │
└──────────────────────────┘    └──────────────────────────────┘
```

### Room Code Format

```
SWAN-42
│     │
│     └─ Random number (10-99)
└─────── Bird word (from curated list)
```

**Bird Words:** `SWAN`, `HAWK`, `DUCK`, `DOVE`, `WREN`, `CROW`, `HERN`, `RAVEN`, `EGRET`, `FINCH`, `CRANE`, `ROBIN`

**Why this format:**
- Easy to announce over PA system
- Memorable for participants
- ~1,000 combinations per bird word
- Fits "Joolie Boolie" branding

### Database Schema

```sql
-- Migration: 20260120000001_create_game_sessions.sql

CREATE TABLE public.game_sessions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL UNIQUE,

  -- Game info
  game_type TEXT NOT NULL CHECK (game_type IN ('bingo', 'trivia')),
  template_id UUID,

  -- PIN Security
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  failed_pin_attempts INTEGER NOT NULL DEFAULT 0,
  last_failed_attempt_at TIMESTAMPTZ,

  -- Session state
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'expired')),
  game_state JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Ownership
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Lifecycle
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX game_sessions_room_code_idx ON game_sessions(room_code);
CREATE INDEX game_sessions_status_idx ON game_sessions(status);
CREATE INDEX game_sessions_expires_at_idx ON game_sessions(expires_at);

-- RLS: Public read (for audience), write requires token validation in app
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active sessions"
  ON game_sessions FOR SELECT
  USING (status IN ('active', 'paused') AND expires_at > now());

CREATE POLICY "Anyone can create sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "App validates token for updates"
  ON game_sessions FOR UPDATE
  USING (true);

-- Room code generator function
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  birds TEXT[] := ARRAY['SWAN', 'HAWK', 'DUCK', 'DOVE', 'WREN',
                        'CROW', 'HERN', 'RAVEN', 'EGRET', 'FINCH'];
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := birds[floor(random() * array_length(birds, 1) + 1)]
            || '-'
            || floor(random() * 90 + 10)::TEXT;
    SELECT EXISTS(SELECT 1 FROM game_sessions WHERE room_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$;
```

### API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/sessions` | POST | None | Create session with PIN |
| `/api/sessions/:roomCode` | GET | None | Get public state (audience) |
| `/api/sessions/:roomCode/verify-pin` | POST | PIN | Verify PIN, get token |
| `/api/sessions/:roomCode/state` | PATCH | Token | Update game state |
| `/api/sessions/:roomCode/complete` | POST | Token | Mark game completed |

#### Create Session

```typescript
// POST /api/sessions
// Request
{
  "gameType": "bingo",
  "pin": "1234",
  "state": { /* initial game state */ }
}

// Response
{
  "data": {
    "sessionId": "abc123...",
    "roomCode": "SWAN-42",
    "token": "eyJ..."
  }
}
```

#### Verify PIN

```typescript
// POST /api/sessions/SWAN-42/verify-pin
// Request
{ "pin": "1234" }

// Success Response
{
  "data": {
    "sessionId": "abc123...",
    "token": "eyJ..."
  }
}

// Error Response (wrong PIN)
{
  "error": "Incorrect PIN. 4 attempts remaining."
}

// Error Response (locked out)
{
  "error": "Too many failed attempts. Try again in 12 minutes."
}
```

#### Update State

```typescript
// PATCH /api/sessions/SWAN-42/state
// Request
{
  "token": "eyJ...",
  "state": { /* updated game state */ }
}

// Response
{
  "data": {
    "roomCode": "SWAN-42",
    "lastSyncAt": "2026-01-19T15:30:00Z"
  }
}
```

---

## PIN Security

### Design Principles
- Simple like a Zoom meeting password
- Protects presenter controls only
- Audience display remains public

### Implementation

| Aspect | Implementation |
|--------|----------------|
| **Format** | 4-6 digits only |
| **Storage** | SHA-256 hash + random salt |
| **Rate Limiting** | 5 attempts → 15 minute lockout |
| **Session Token** | Base64-encoded JSON, 24-hour expiry |
| **Storage Location** | localStorage (cleared on logout) |

### Hashing

```typescript
// packages/database/src/pin-security.ts

export async function createPinHash(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomUUID();
  const data = new TextEncoder().encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return { hash, salt };
}

export async function verifyPin(
  pin: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  const { hash } = await createPinHash(pin);
  // Note: createPinHash needs to accept salt for verification
  const data = new TextEncoder().encode(pin + storedSalt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const computedHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return computedHash === storedHash;
}
```

### Session Tokens

```typescript
interface SessionToken {
  sessionId: string;
  roomCode: string;
  gameType: 'bingo' | 'trivia';
  expiresAt: number; // Unix timestamp
}

// Encoded as Base64URL JSON
// Stored in localStorage after successful PIN entry
// Sent with every state update request
// Validated server-side before allowing updates
```

### Lockout Logic

```typescript
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function isLockedOut(failedAttempts: number, lastFailedAt: Date | null): boolean {
  if (failedAttempts < MAX_ATTEMPTS) return false;
  if (!lastFailedAt) return true;
  return Date.now() - lastFailedAt.getTime() < LOCKOUT_DURATION_MS;
}
```

---

## User Flows

### Flow 1: Create New Game

```
┌─────────────────────────────────────────┐
│ Presenter clicks "New Game"             │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ CreateGameModal opens                   │
│ - Enter PIN (4-6 digits)                │
│ - Confirm PIN                           │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ POST /api/sessions                      │
│ - Hash PIN                              │
│ - Generate room code                    │
│ - Save to database                      │
│ - Return session token                  │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ Save token to localStorage              │
│ Redirect to /play?room=SWAN-42          │
│ Display room code prominently           │
└─────────────────────────────────────────┘
```

### Flow 2: Rejoin as Presenter

```
┌─────────────────────────────────────────┐
│ Navigate to /play?room=SWAN-42          │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ Check localStorage for session token    │
└────────────────┬────────────────────────┘
                 ↓
        ┌────────┴────────┐
        │                 │
   Token Valid       Token Missing/Expired
        │                 │
        ↓                 ↓
┌───────────────┐  ┌─────────────────────┐
│ Load game     │  │ JoinGameModal opens │
│ state from    │  │ - Enter PIN         │
│ API           │  │ - Verify via API    │
└───────────────┘  └──────────┬──────────┘
                              ↓
                   ┌──────────────────────┐
                   │ On success:          │
                   │ - Save new token     │
                   │ - Load game state    │
                   └──────────────────────┘
```

### Flow 3: Join as Audience (No PIN)

```
┌─────────────────────────────────────────┐
│ Navigate to /display?room=SWAN-42       │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ GET /api/sessions/SWAN-42               │
│ (No authentication required)            │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ Load public game state                  │
│ Connect to BroadcastChannel for sync    │
│ Display audience view                   │
└─────────────────────────────────────────┘
```

---

## UI Components

### CreateGameModal

```
┌─────────────────────────────────────────┐
│           Create New Game               │
├─────────────────────────────────────────┤
│                                         │
│  Set a PIN to protect presenter         │
│  controls. Audience won't need this.    │
│                                         │
│  Enter PIN (4-6 digits)                 │
│  ┌─────────────────────────────────┐   │
│  │          1 2 3 4                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Confirm PIN                            │
│  ┌─────────────────────────────────┐   │
│  │          1 2 3 4                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ Tip: Choose a PIN you'll        │  │
│  │ remember for rejoining.         │  │
│  └──────────────────────────────────┘  │
│                                         │
│          [Cancel]  [Create Game]        │
└─────────────────────────────────────────┘
```

### JoinGameModal

```
┌─────────────────────────────────────────┐
│         Join Game SWAN-42               │
├─────────────────────────────────────────┤
│                                         │
│  Enter the presenter PIN to control     │
│  this game.                             │
│                                         │
│  Presenter PIN                          │
│  ┌─────────────────────────────────┐   │
│  │          _ _ _ _                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Error message appears here if any]    │
│                                         │
│          [Cancel]  [Join as Presenter]  │
└─────────────────────────────────────────┘
```

### RoomCodeDisplay

```
┌─────────────────────────────────────────┐
│                                         │
│      Room Code                          │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │         SWAN-42                  │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                         │
│  [Copy Link]  [Show QR Code]            │
│                                         │
│  ✓ Saved 5 seconds ago                  │
│                                         │
└─────────────────────────────────────────┘
```

---

## File Structure

### New Files

```
packages/
├── sync/src/
│   ├── room-code.ts                    # Room code generator
│   ├── use-session-recovery.ts         # Session recovery hook
│   └── use-auto-sync.ts                # Auto-sync hook
└── database/src/
    └── pin-security.ts                 # PIN hashing utilities

supabase/migrations/
└── 20260120000001_create_game_sessions.sql

apps/bingo/src/
├── app/api/sessions/
│   ├── route.ts                        # POST create
│   └── [roomCode]/
│       ├── route.ts                    # GET public state
│       ├── verify-pin/route.ts         # POST verify PIN
│       └── state/route.ts              # PATCH update state
├── components/presenter/
│   ├── CreateGameModal.tsx
│   ├── JoinGameModal.tsx
│   ├── RoomCodeDisplay.tsx
│   └── SyncStatusIndicator.tsx
└── hooks/
    └── use-session.ts                  # Session token management

apps/trivia/src/
└── [Same structure as bingo]
```

### Modified Files

```
packages/database/src/
├── tables/game-sessions.ts             # Add CRUD functions
└── index.ts                            # Export new functions

apps/bingo/src/
├── app/play/page.tsx                   # Integrate session management
├── app/display/page.tsx                # Parse room code from URL
└── stores/game-store.ts                # Add persistence integration

apps/trivia/src/
└── [Same modifications as bingo]
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Create room code generator utility
- [ ] Write database migration
- [ ] Create PIN security utilities
- [ ] Export from packages

### Phase 2: API Routes
- [ ] Implement session CRUD endpoints for Bingo
- [ ] Implement PIN verification endpoint
- [ ] Implement state update endpoint
- [ ] Write API route tests
- [ ] Duplicate for Trivia

### Phase 3: UI Components
- [ ] Create CreateGameModal
- [ ] Create JoinGameModal
- [ ] Create RoomCodeDisplay
- [ ] Create SyncStatusIndicator
- [ ] Write component tests

### Phase 4: Integration
- [ ] Update presenter pages to use session management
- [ ] Update display pages to parse room codes
- [ ] Add auto-sync to game stores
- [ ] Test full flows

### Phase 5: Polish
- [ ] Error handling and edge cases
- [ ] Loading states
- [ ] Accessibility review
- [ ] Manual testing checklist

**Total Scope:** 5 phases, high complexity

---

## Testing Strategy

### Unit Tests
- Room code generation/validation
- PIN hashing and verification
- Session token encode/decode
- Lockout logic

### API Tests
- Create session with valid/invalid PIN
- Verify PIN success/failure/lockout
- Update state with valid/invalid token
- Get public session state

### Integration Tests
- Full flow: Create → Play → Refresh → Rejoin
- Audience join without PIN
- PIN lockout and recovery
- Session expiration

### Manual Testing Checklist
- [ ] Create game with 4-digit PIN
- [ ] Create game with 6-digit PIN
- [ ] Reject 3-digit PIN
- [ ] Reject non-numeric PIN
- [ ] Reject mismatched confirmation
- [ ] Rejoin with correct PIN
- [ ] Show error for wrong PIN
- [ ] Lock out after 5 failed attempts
- [ ] Unlock after 15 minutes
- [ ] Session persists across refresh
- [ ] Audience view loads without PIN
- [ ] Room code displays prominently
- [ ] Copy link functionality works

---

## Security Considerations

| Aspect | Mitigation |
|--------|------------|
| **PIN brute force** | 5 attempts → 15 min lockout |
| **Session hijacking** | 24-hour token expiry |
| **State tampering** | Token required for all writes |
| **XSS** | Tokens in localStorage (use CSP) |
| **HTTPS** | Enforced by Vercel |

### Threat Model

**In Scope:**
- Prevent casual unauthorized access to presenter controls
- Allow audience to view without friction

**Out of Scope:**
- Sophisticated attacks (we're not handling sensitive data)
- Cross-device session theft (tokens are device-bound)

---

## Future Enhancements

| Feature | Complexity | Notes |
|---------|------------|-------|
| **Remote players (phones)** | Medium | Add Supabase Realtime |
| **Session history** | Low | Query completed sessions |
| **QR code for joining** | Low | Generate QR from room URL |
| **Multiple presenters** | Medium | Share PIN or add co-host |
| **Host migration** | High | Not recommended |

---

## Dependencies

### Required Before Implementation
- Supabase project configured
- Database migrations system working
- `@joolie-boolie/database` package functional

### No External Dependencies
- Uses Web Crypto API (built into Node.js)
- Uses existing Modal component
- Uses existing Zustand patterns

---

## Success Criteria

1. **Presenter can create game** with memorable room code and PIN
2. **Presenter can rejoin** after browser refresh by entering PIN
3. **Audience can view** without any authentication
4. **Game state persists** across sessions
5. **PIN attempts are rate-limited** to prevent brute force
6. **Existing BroadcastChannel sync** continues to work

---

## References

- [Jackbox Games - How to Play](https://www.jackboxgames.com/how-to-play)
- [Kahoot - Game PIN](https://support.kahoot.com/hc/en-us/articles/360000109048)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
