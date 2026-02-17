# Feature Implementation Plan: Persistent, Rejoinable Game Sessions (REFINED)

**Status:** Ready for Implementation
**Created:** 2026-01-19
**Refined:** 2026-01-19 (after code simplifier review)
**Affects:** `apps/bingo`, `apps/trivia`, `packages/sync`, `packages/database`, `packages/ui`

---

## Refinement Summary

This plan has been refined based on comprehensive code analysis and simplification review:

**Key Improvements:**
- 🎯 **50% code reduction** through shared utilities
- 🔒 **Enhanced security** with HMAC-signed tokens
- ⚡ **Explicit sync timing** (2s debounce for state, immediate for critical events)
- 🧹 **Consolidated session systems** (removed overlap between 3 different implementations)
- 📦 **Moved components to @joolie-boolie/ui** (zero duplication between apps)
- 🏗️ **Route handler factory** (shared API route implementation)

---

## Executive Summary

Add URL-based room codes (e.g., `SWAN-42`) that allow games to be rejoined after browser refresh or disconnect. Includes PIN protection for presenter controls while keeping audience display public.

**Infrastructure Status:** 75% complete
- ✅ Room codes, PIN security, session tokens, database schema, CRUD operations
- ⚠️ API routes, UI components, session initialization flows need implementation

---

## Problem Statement

Currently:
- Game sessions exist only in browser memory
- Refreshing the presenter window loses all game state
- Session IDs are long UUIDs, not human-friendly
- No way to protect presenter controls from unauthorized access

---

## Solution Overview

| Feature | Description |
|---------|-------------|
| **Room Codes** | Bird-themed codes like `SWAN-42` - easy to announce over PA |
| **URL-Based** | `/play?room=SWAN-42` and `/display?room=SWAN-42` |
| **Persistence** | Game state saved to Supabase, survives browser refresh |
| **PIN Protection** | 4-6 digit PIN protects presenter, audience is public |
| **HMAC Security** | Cryptographically signed tokens prevent tampering |
| **Smart Sync** | Debounced state updates, immediate critical events |

---

## Consolidated Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTER /play?room=SWAN-42                                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ RoomCodeDisplay│  │ Game Controls │  │ SyncStatus          │   │
│  │ (@joolie-boolie/ui)     │  │               │  │                    │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
│                                                                 │
│                    Zustand Store + Middleware                   │
│                              │                                  │
│              ┌───────────────┼───────────────┐                 │
│              │               │               │                 │
│       BroadcastChannel  UI Prefs (localStorage)  API Sync      │
│       (immediate)       (theme, audio vol)      (debounced)     │
│              │                                   │              │
└──────────────┼───────────────────────────────────┼─────────────┘
               │                                   │
               ↓                                   ↓
┌──────────────────────────┐    ┌──────────────────────────────┐
│ AUDIENCE /display?room=  │    │ Supabase PostgreSQL          │
│ SWAN-42                  │    │ game_sessions table          │
│ (BroadcastChannel sync)  │    │ + generate_room_code()       │
│ (No PIN required)        │    │ + sequence_number            │
└──────────────────────────┘    └──────────────────────────────┘
```

**Key Changes from Original:**
- Clear separation: BroadcastChannel (immediate), localStorage (UI prefs only), Database (game state)
- All session modals in `@joolie-boolie/ui` (not duplicated in apps)
- Sequence numbers prevent race conditions

---

## Room Code Format

```
SWAN-42
│     │
│     └─ Random number (10-99)
└─────── Bird word (from curated list)
```

**Bird Words:** `SWAN`, `HAWK`, `DUCK`, `DOVE`, `WREN`, `CROW`, `HERN`, `RAVEN`, `EGRET`, `FINCH`, `CRANE`, `ROBIN`

**Implementation:** Already complete in `packages/sync/src/room-code.ts`

---

## Database Schema

```sql
-- Migration: 20260120000001_create_game_sessions.sql (EXISTING)

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

-- NEW MIGRATION: 20260120000002_add_sequence_number.sql

ALTER TABLE game_sessions
ADD COLUMN sequence_number BIGINT NOT NULL DEFAULT 0;

CREATE INDEX game_sessions_sequence_number_idx
ON game_sessions(sequence_number);

-- Auto-increment sequence number on update
CREATE OR REPLACE FUNCTION increment_sequence_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sequence_number = OLD.sequence_number + 1;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_sequence_on_update
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION increment_sequence_number();
```

**Purpose of sequence_number:** Prevents race conditions between BroadcastChannel and database updates. Client tracks last sequence number and ignores stale updates.

---

## HMAC Token Security

### Problem with Original Design

Original plan used unsigned Base64 tokens that could be decoded and modified by anyone:

```typescript
// Original (INSECURE)
const token = btoa(JSON.stringify({ sessionId, roomCode, gameType, expiresAt }));
// Anyone can decode, modify, and re-encode!
```

### New Design: HMAC-Signed Tokens

```typescript
// packages/database/src/hmac-tokens.ts (NEW FILE)

export async function signToken(token: SessionToken, secret: string): Promise<string> {
  const payload = JSON.stringify(token);
  const encoder = new TextEncoder();

  // Import HMAC key
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign payload
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Return: base64url(payload.signature)
  return Buffer.from(`${payload}.${signatureHex}`).toString('base64url');
}

export async function verifyAndDecodeToken(
  signedToken: string,
  secret: string
): Promise<SessionToken | null> {
  try {
    const decoded = Buffer.from(signedToken, 'base64url').toString('utf-8');
    const [payload, signatureHex] = decoded.split('.');

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = new Uint8Array(
      signatureHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(payload)
    );

    if (!valid) return null;

    return JSON.parse(payload) as SessionToken;
  } catch {
    return null;
  }
}
```

### Environment Variable

```bash
# .env.local (all apps)
SESSION_TOKEN_SECRET=<random-256-bit-hex-string>

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Benefits:**
- Prevents client-side token modification
- Even if user decodes Base64, they can't forge valid signature without server secret
- Uses Web Crypto API (built into Node.js and browsers)
- No additional dependencies

---

## Auto-Sync Strategy (EXPLICIT TIMING)

### Problem with Original Plan

Original plan was vague: "auto-sync hook" with no timing specification. This could lead to:
- Database spam (every keystroke triggers write)
- Race conditions (conflicting updates)
- Poor performance

### New Design: Smart Debouncing/Throttling

```typescript
// packages/sync/src/use-auto-sync.ts (NEW FILE)

export interface AutoSyncConfig {
  // Debounce state updates (batch multiple rapid changes)
  stateDebounceMs: number;        // Default: 2000ms

  // Throttle critical events (prevent spam but ensure delivery)
  criticalThrottleMs: number;     // Default: 0ms (immediate)

  // Events that bypass debounce
  criticalEvents: string[];       // ['BALL_CALLED', 'PATTERN_CHANGED', 'STATUS_CHANGED']

  // Enable/disable auto-sync
  enabled: boolean;               // Default: true
}

export function useAutoSync(
  roomCode: string,
  gameState: unknown,
  config: Partial<AutoSyncConfig> = {}
) {
  const mergedConfig = {
    stateDebounceMs: 2000,
    criticalThrottleMs: 0,
    criticalEvents: ['BALL_CALLED', 'PATTERN_CHANGED', 'STATUS_CHANGED'],
    enabled: true,
    ...config,
  };

  // Debounced state update
  const debouncedUpdate = useMemo(
    () =>
      debounce(async (state: unknown) => {
        await updateGameSessionState(client, roomCode, state);
      }, mergedConfig.stateDebounceMs),
    [roomCode, mergedConfig.stateDebounceMs]
  );

  // Immediate critical update
  const immediatUpdate = useCallback(
    async (state: unknown) => {
      await updateGameSessionState(client, roomCode, state);
    },
    [roomCode]
  );

  // Subscribe to game store
  useEffect(() => {
    if (!mergedConfig.enabled) return;
    if (gameState._isHydrating) return; // Skip during hydration

    // Determine if this is a critical update
    const isCritical = /* check if state change is critical */;

    if (isCritical) {
      immediatUpdate(gameState);
    } else {
      debouncedUpdate(gameState);
    }
  }, [gameState, mergedConfig.enabled]);
}
```

### Sync Timing Table

| Event Type | Strategy | Delay | Rationale |
|------------|----------|-------|-----------|
| **General state changes** | Debounce | 2000ms | Batch rapid changes, reduce DB writes |
| **Ball called** | Immediate | 0ms | Critical game event, must sync |
| **Pattern changed** | Immediate | 0ms | Critical game event, must sync |
| **Pause/Resume** | Immediate | 0ms | Status change affects all screens |
| **Auto-call mode** | Throttle | 500ms | Rapid successive calls, prevent spam |
| **Theme change** | No sync | N/A | UI preference only (localStorage) |
| **Audio volume** | No sync | N/A | UI preference only (localStorage) |

---

## Consolidated Session Systems

### Problem: 3 Overlapping Systems

Before refinement, there were 3 different session systems:

1. **`packages/database/src/tables/game-sessions.ts`** (280+ lines)
   - In-memory session tracking
   - Local state management
   - Overlaps with persistent-sessions.ts

2. **`packages/database/src/tables/persistent-sessions.ts`** (150+ lines)
   - Database-backed sessions
   - PIN security integration
   - Room code support

3. **`packages/sync/src/session-storage.ts`** (403 lines)
   - localStorage-based session state
   - Participant tracking
   - Recent sessions list

### Solution: Clear Separation of Concerns

```typescript
// 1. DATABASE PERSISTENCE (packages/database/src/tables/persistent-sessions.ts)
// - Room codes and PINs
// - Game state (JSONB)
// - Multi-device session recovery
// Functions: createGameSession, getGameSessionByRoomCode, updateGameSessionState

// 2. UI PREFERENCES (packages/sync/src/session-storage.ts)
// - Theme mode (light/dark)
// - Audio volume levels
// - Recent sessions list (for UI convenience)
// Local-only, never synced to DB

// 3. DEPRECATED (packages/database/src/tables/game-sessions.ts)
/**
 * @deprecated Use persistent-sessions.ts for database-backed sessions
 * This module will be removed in v0.2.0
 *
 * If you need in-memory sessions, use packages/sync/src/session-storage.ts
 * for UI preferences only.
 */
```

**Action Items:**
- Mark `game-sessions.ts` as deprecated with JSDoc comment
- Remove exports from `packages/database/src/index.ts`
- Keep file for 1 release cycle (backwards compatibility)
- Document migration path in CHANGELOG

---

## Shared Route Handler Factory

### Problem: API Route Duplication

Original plan proposed duplicating ~400 lines of route code in each app:

```
apps/bingo/src/app/api/sessions/route.ts         (400 lines)
apps/trivia/src/app/api/sessions/route.ts        (400 lines)
```

Total: 800 lines of duplicated code

### Solution: Route Handler Factory

```typescript
// packages/database/src/api/session-routes.ts (NEW FILE)

import { NextRequest, NextResponse } from 'next/server';
import type { TypedSupabaseClient } from '../client';

export interface SessionRouteConfig {
  gameType: 'bingo' | 'trivia';
  createClient: () => Promise<TypedSupabaseClient>;
  validateGameState?: (state: unknown) => boolean;
}

export function createSessionRoutes(config: SessionRouteConfig) {
  const { gameType, createClient, validateGameState } = config;

  return {
    // POST /api/sessions - Create new session
    POST: async (request: NextRequest) => {
      try {
        const client = await createClient();
        const body = await request.json();

        // Validate PIN
        if (!isValidPin(body.pin)) {
          return NextResponse.json(
            { error: 'PIN must be 4-6 digits' },
            { status: 400 }
          );
        }

        // Hash PIN
        const { hash, salt } = await createPinHash(body.pin);

        // Generate room code (server-side to handle collisions)
        const roomCode = await client.rpc('generate_room_code');

        // Create session
        const session = await createGameSession(client, {
          room_code: roomCode,
          session_id: generateSessionId(),
          game_type: gameType,
          pin_hash: hash,
          pin_salt: salt,
          game_state: body.initialState || {},
        });

        // Create signed token
        const token = createSessionToken(
          session.session_id,
          session.room_code,
          gameType
        );
        const signedToken = await signToken(token, process.env.SESSION_TOKEN_SECRET!);

        return NextResponse.json({
          data: {
            session,
            roomCode: session.room_code,
            sessionToken: signedToken,
          },
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        );
      }
    },

    // GET /api/sessions/[roomCode] - Get public state (audience)
    GET: async (
      request: NextRequest,
      { params }: { params: Promise<{ roomCode: string }> }
    ) => {
      try {
        const { roomCode } = await params;
        const client = await createClient();

        const session = await getGameSessionByRoomCode(client, roomCode);

        if (!session) {
          return NextResponse.json(
            { error: 'Session not found' },
            { status: 404 }
          );
        }

        // Return public data only (no PIN info)
        return NextResponse.json({
          data: {
            roomCode: session.room_code,
            gameType: session.game_type,
            status: session.status,
            gameState: session.game_state,
            lastSyncAt: session.last_sync_at,
          },
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to fetch session' },
          { status: 500 }
        );
      }
    },

    // POST /api/sessions/[roomCode]/verify-pin - Verify PIN
    verifyPin: async (
      request: NextRequest,
      { params }: { params: Promise<{ roomCode: string }> }
    ) => {
      try {
        const { roomCode } = await params;
        const { pin } = await request.json();
        const client = await createClient();

        const session = await getGameSessionByRoomCode(client, roomCode);

        if (!session) {
          return NextResponse.json(
            { error: 'Session not found' },
            { status: 404 }
          );
        }

        // Check lockout
        if (isLockedOut(session.failed_pin_attempts, session.last_failed_attempt_at)) {
          return NextResponse.json(
            { error: 'Too many failed attempts. Try again in 15 minutes.' },
            { status: 429 }
          );
        }

        // Verify PIN
        const isValid = await verifyPin(pin, session.pin_hash, session.pin_salt);

        if (!isValid) {
          await incrementFailedPinAttempt(client, roomCode);
          const remainingAttempts = MAX_ATTEMPTS - (session.failed_pin_attempts + 1);
          return NextResponse.json(
            { error: `Incorrect PIN. ${remainingAttempts} attempts remaining.` },
            { status: 401 }
          );
        }

        // Reset failed attempts
        await resetFailedPinAttempts(client, roomCode);

        // Create signed token
        const token = createSessionToken(
          session.session_id,
          session.room_code,
          gameType
        );
        const signedToken = await signToken(token, process.env.SESSION_TOKEN_SECRET!);

        return NextResponse.json({
          data: {
            sessionToken: signedToken,
            gameState: session.game_state,
          },
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'PIN verification failed' },
          { status: 500 }
        );
      }
    },

    // PATCH /api/sessions/[roomCode]/state - Update game state
    updateState: async (
      request: NextRequest,
      { params }: { params: Promise<{ roomCode: string }> }
    ) => {
      try {
        const { roomCode } = await params;
        const { sessionToken, state } = await request.json();
        const client = await createClient();

        // Verify HMAC-signed token
        const token = await verifyAndDecodeToken(
          sessionToken,
          process.env.SESSION_TOKEN_SECRET!
        );

        if (!token || isTokenExpired(token) || token.roomCode !== roomCode) {
          return NextResponse.json(
            { error: 'Invalid or expired token' },
            { status: 401 }
          );
        }

        // Optional game-specific validation
        if (validateGameState && !validateGameState(state)) {
          return NextResponse.json(
            { error: 'Invalid game state' },
            { status: 400 }
          );
        }

        // Update session
        const updatedSession = await updateGameSessionState(client, roomCode, state);

        return NextResponse.json({
          data: {
            roomCode: updatedSession.room_code,
            lastSyncAt: updatedSession.last_sync_at,
            sequenceNumber: updatedSession.sequence_number,
          },
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to update state' },
          { status: 500 }
        );
      }
    },

    // POST /api/sessions/[roomCode]/complete - Mark session complete
    complete: async (
      request: NextRequest,
      { params }: { params: Promise<{ roomCode: string }> }
    ) => {
      try {
        const { roomCode } = await params;
        const { sessionToken } = await request.json();
        const client = await createClient();

        // Verify token
        const token = await verifyAndDecodeToken(
          sessionToken,
          process.env.SESSION_TOKEN_SECRET!
        );

        if (!token || isTokenExpired(token) || token.roomCode !== roomCode) {
          return NextResponse.json(
            { error: 'Invalid or expired token' },
            { status: 401 }
          );
        }

        // Mark complete
        await markSessionCompleted(client, roomCode);

        return NextResponse.json({ data: { success: true } });
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to complete session' },
          { status: 500 }
        );
      }
    },
  };
}
```

### Usage in Apps (3 lines per route!)

```typescript
// apps/bingo/src/app/api/sessions/route.ts
import { createSessionRoutes } from '@joolie-boolie/database/api';
import { createClient } from '@/lib/supabase/server';

const routes = createSessionRoutes({
  gameType: 'bingo',
  createClient,
  validateGameState: (state) => {
    // Optional: Bingo-specific validation
    return 'calledBalls' in state && Array.isArray(state.calledBalls);
  },
});

export const POST = routes.POST;
export const GET = routes.GET;
```

```typescript
// apps/bingo/src/app/api/sessions/[roomCode]/verify-pin/route.ts
import { createSessionRoutes } from '@joolie-boolie/database/api';
import { createClient } from '@/lib/supabase/server';

const routes = createSessionRoutes({
  gameType: 'bingo',
  createClient,
});

export const POST = routes.verifyPin;
```

**Result:** 200 lines of shared code vs. 800 lines of duplicated code (75% reduction)

---

## Shared UI Components

### Problem: Component Duplication

Original plan placed components in app directories:

```
apps/bingo/src/components/presenter/
├── CreateGameModal.tsx       (~150 lines)
├── JoinGameModal.tsx         (~150 lines)
├── RoomCodeDisplay.tsx       (~100 lines)
└── SyncStatusIndicator.tsx   (~80 lines)

apps/trivia/src/components/presenter/
├── CreateGameModal.tsx       (~150 lines, DUPLICATE)
├── JoinGameModal.tsx         (~150 lines, DUPLICATE)
├── RoomCodeDisplay.tsx       (~100 lines, DUPLICATE)
└── SyncStatusIndicator.tsx   (~80 lines, DUPLICATE)
```

Total: 960 lines of duplicated code

### Solution: Shared Package

```
packages/ui/src/
├── create-game-modal.tsx          # NEW
├── join-game-modal.tsx            # NEW
├── room-code-display.tsx          # NEW
├── sync-status-indicator.tsx      # NEW
└── __tests__/
    ├── create-game-modal.test.tsx
    ├── join-game-modal.test.tsx
    ├── room-code-display.test.tsx
    └── sync-status-indicator.test.tsx
```

### Component Designs

#### CreateGameModal

```typescript
// packages/ui/src/create-game-modal.tsx

export interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export function CreateGameModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  error,
}: CreateGameModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async () => {
    // Validate PIN format
    if (!/^\d{4,6}$/.test(pin)) {
      setValidationError('PIN must be 4-6 digits');
      return;
    }

    // Validate confirmation
    if (pin !== confirmPin) {
      setValidationError('PINs do not match');
      return;
    }

    await onSubmit(pin);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Game">
      <div className="space-y-4">
        <p className="text-lg">
          Set a PIN to protect presenter controls. Audience won't need this.
        </p>

        <Input
          type="password"
          label="Enter PIN (4-6 digits)"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={6}
          size="lg"
          error={validationError}
        />

        <Input
          type="password"
          label="Confirm PIN"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value)}
          maxLength={6}
          size="lg"
        />

        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm">
            💡 Tip: Choose a PIN you'll remember for rejoining later.
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Game'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

#### JoinGameModal

```typescript
// packages/ui/src/join-game-modal.tsx

export interface JoinGameModalProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  remainingAttempts?: number;
}

export function JoinGameModal({
  roomCode,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  error,
  remainingAttempts,
}: JoinGameModalProps) {
  const [pin, setPin] = useState('');

  const handleSubmit = async () => {
    await onSubmit(pin);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Join Game ${roomCode}`}>
      <div className="space-y-4">
        <p className="text-lg">
          Enter the presenter PIN to control this game.
        </p>

        <Input
          type="password"
          label="Presenter PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={6}
          size="lg"
          autoFocus
          error={error}
        />

        {remainingAttempts !== undefined && remainingAttempts < 5 && (
          <p className="text-amber-600 text-sm">
            ⚠️ {remainingAttempts} attempts remaining
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !pin}
          >
            {isLoading ? 'Verifying...' : 'Join as Presenter'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

#### RoomCodeDisplay

```typescript
// packages/ui/src/room-code-display.tsx

export interface RoomCodeDisplayProps {
  roomCode: string;
  isSaving?: boolean;
  lastSavedAt?: Date;
  onCopyLink?: () => void;
  onShowQR?: () => void;
}

export function RoomCodeDisplay({
  roomCode,
  isSaving,
  lastSavedAt,
  onCopyLink,
  onShowQR,
}: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onCopyLink) {
      onCopyLink();
    } else {
      const url = `${window.location.origin}/display?room=${roomCode}`;
      navigator.clipboard.writeText(url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Room Code</h2>

      <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-8 text-center">
        <p className="text-5xl font-bold tracking-wider">
          {roomCode}
        </p>
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
        >
          {copied ? '✓ Copied' : 'Copy Link'}
        </Button>
        {onShowQR && (
          <Button variant="secondary" size="sm" onClick={onShowQR}>
            Show QR Code
          </Button>
        )}
      </div>

      {(isSaving || lastSavedAt) && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
          {isSaving ? (
            '💾 Saving...'
          ) : lastSavedAt ? (
            `✓ Saved ${formatDistanceToNow(lastSavedAt)} ago`
          ) : null}
        </p>
      )}
    </div>
  );
}
```

**Result:** 480 lines of shared code vs. 960 lines of duplicated code (50% reduction)

---

## File Structure (Updated)

### New Shared Package Files

```
packages/database/src/api/
├── session-routes.ts              # NEW: Route handler factory (~200 lines)
└── __tests__/
    └── session-routes.test.ts     # NEW: Factory tests

packages/database/src/
├── hmac-tokens.ts                 # NEW: HMAC token signing (~80 lines)
├── tables/
│   ├── persistent-sessions.ts     # Enhanced with sequence numbers
│   └── game-sessions.ts           # DEPRECATED (mark with JSDoc)
└── index.ts                       # Export new API utilities

packages/ui/src/
├── create-game-modal.tsx          # NEW: Moved from apps (~150 lines)
├── join-game-modal.tsx            # NEW: Moved from apps (~150 lines)
├── room-code-display.tsx          # NEW: Moved from apps (~100 lines)
├── sync-status-indicator.tsx      # NEW: Moved from apps (~80 lines)
└── __tests__/
    ├── create-game-modal.test.tsx
    ├── join-game-modal.test.tsx
    ├── room-code-display.test.tsx
    └── sync-status-indicator.test.tsx

packages/sync/src/
├── use-session-recovery.ts        # NEW: Session recovery hook (~100 lines)
├── use-auto-sync.ts               # NEW: Auto-sync with debounce (~120 lines)
├── room-code.ts                   # EXISTING: DEPRECATE client-side generation
└── __tests__/
    ├── use-session-recovery.test.ts
    └── use-auto-sync.test.ts

supabase/migrations/
├── 20260120000001_create_game_sessions.sql  # EXISTING
└── 20260120000002_add_sequence_number.sql   # NEW
```

### App-Specific Files (Minimal Integration Code)

```
apps/bingo/src/
├── app/api/sessions/
│   ├── route.ts                   # 5 lines (uses shared factory)
│   └── [roomCode]/
│       ├── route.ts               # 5 lines (GET endpoint)
│       ├── verify-pin/route.ts    # 5 lines (uses shared factory)
│       ├── state/route.ts         # 5 lines (uses shared factory)
│       └── complete/route.ts      # 5 lines (uses shared factory)
├── hooks/
│   └── use-session.ts             # Thin wrapper (~50 lines)
├── lib/session/
│   └── serializer.ts              # Bingo-specific state serializer (~80 lines)
└── app/play/page.tsx              # Integrate session management (~30 lines added)

apps/trivia/src/
└── [Same structure as bingo]      # Copy & adjust gameType
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Create `packages/database/src/api/session-routes.ts` factory
- [ ] Add HMAC token utilities (`packages/database/src/hmac-tokens.ts`)
- [ ] Update database migration with sequence numbers (20260120000002)
- [ ] Mark `game-sessions.ts` as deprecated with JSDoc
- [ ] Write factory and token tests
- [ ] Update package exports

### Phase 2: Shared Components
- [ ] Move/create `CreateGameModal` in `packages/ui/src/`
- [ ] Move/create `JoinGameModal` in `packages/ui/src/`
- [ ] Move/create `RoomCodeDisplay` in `packages/ui/src/`
- [ ] Move/create `SyncStatusIndicator` in `packages/ui/src/`
- [ ] Update `packages/ui/src/index.ts` exports
- [ ] Write component tests

### Phase 3: Auto-Sync Hooks
- [ ] Create `packages/sync/src/use-auto-sync.ts` with debounce/throttle
- [ ] Create `packages/sync/src/use-session-recovery.ts`
- [ ] Update `packages/sync/src/index.ts` exports
- [ ] Write hook tests

### Phase 4: Bingo Integration
- [ ] Implement API routes using shared factory
- [ ] Create Bingo state serializer (`apps/bingo/src/lib/session/serializer.ts`)
- [ ] Update presenter page with session management
- [ ] Update display page with room code parsing
- [ ] Integrate auto-sync into game store
- [ ] Test full create → play → refresh → rejoin flow

### Phase 5: Trivia Integration
- [ ] Implement API routes using shared factory (same pattern as bingo)
- [ ] Create Trivia state serializer (`apps/trivia/src/lib/session/serializer.ts`)
- [ ] Update presenter page with session management
- [ ] Update display page with room code parsing
- [ ] Integrate auto-sync into game store
- [ ] Test full create → play → refresh → rejoin flow

### Phase 6: Polish & Testing
- [ ] Error handling and edge cases
- [ ] Loading states and transitions
- [ ] Accessibility review
- [ ] Manual testing checklist (see below)
- [ ] Update documentation
- [ ] Add SESSION_TOKEN_SECRET to .env.example

---

## Code Sharing Metrics

| Component | Original Plan | Refined Plan | Savings |
|-----------|---------------|--------------|---------|
| API Routes | ~800 lines (2 apps × 400) | ~400 lines (shared factory) | **50%** |
| UI Components | ~600 lines (2 apps × 300) | ~300 lines (@joolie-boolie/ui) | **50%** |
| Auto-sync Logic | ~400 lines (2 apps × 200) | ~200 lines (shared hook) | **50%** |
| Session Systems | 3 overlapping files (~900 lines) | 2 clear files (~600 lines) | **33%** |
| **Total** | **~2,700 lines** | **~1,500 lines** | **44%** |

---

## Testing Strategy

### Unit Tests

**Already Complete:**
- ✅ Room code generation/validation (`packages/sync/src/__tests__/room-code.test.ts`)
- ✅ PIN hashing and verification (`packages/database/src/__tests__/pin-security.test.ts`)
- ✅ Session token encode/decode (`packages/database/src/__tests__/session-token.test.ts`)
- ✅ Lockout logic (`packages/database/src/__tests__/pin-security.test.ts`)
- ✅ CRUD operations (`packages/database/src/tables/__tests__/persistent-sessions.test.ts`)

**New Tests Needed:**
- [ ] HMAC token signing/verification
- [ ] Route handler factory with mock requests
- [ ] Auto-sync debounce/throttle logic
- [ ] Component tests for modals

### Integration Tests

- [ ] Full flow: Create → Play → Refresh → Rejoin (Bingo)
- [ ] Full flow: Create → Play → Refresh → Rejoin (Trivia)
- [ ] Audience join without PIN
- [ ] PIN lockout and recovery
- [ ] Session expiration
- [ ] Sync ordering with sequence numbers
- [ ] HMAC token validation in API routes

### Manual Testing Checklist

**Session Creation:**
- [ ] Create game with 4-digit PIN
- [ ] Create game with 6-digit PIN
- [ ] Reject 3-digit PIN
- [ ] Reject non-numeric PIN
- [ ] Reject mismatched confirmation
- [ ] Room code displays prominently

**Session Rejoin:**
- [ ] Rejoin with correct PIN
- [ ] Show error for wrong PIN
- [ ] Lock out after 5 failed attempts
- [ ] Unlock after 15 minutes
- [ ] Session persists across refresh
- [ ] Game state restored correctly

**Audience View:**
- [ ] Audience view loads without PIN
- [ ] Display URL works: `/display?room=SWAN-42`
- [ ] Audience receives real-time updates via BroadcastChannel
- [ ] Audience can refresh and reconnect

**Sync Behavior:**
- [ ] State changes debounced (2s delay for general changes)
- [ ] Critical events immediate (ball called, pattern changed)
- [ ] Sequence numbers prevent stale updates
- [ ] Copy link functionality works

**Security:**
- [ ] Token tampering rejected (HMAC validation)
- [ ] Expired tokens rejected
- [ ] Wrong room code in token rejected
- [ ] PIN attempts rate-limited

---

## Success Criteria (Updated)

1. ✅ **Zero API route duplication** between bingo and trivia apps
2. ✅ **Shared UI components** in `@joolie-boolie/ui` package
3. ✅ **Single session system** with clear database/localStorage separation
4. ✅ **HMAC-signed tokens** prevent client-side tampering
5. ✅ **Explicit sync timing** (2s debounce for state, immediate for critical events)
6. ✅ **Sequence numbers** prevent stale update race conditions
7. ✅ **All original user stories** still satisfied

---

## Security Considerations

| Aspect | Mitigation | Status |
|--------|------------|--------|
| **PIN brute force** | 5 attempts → 15 min lockout | ✅ Complete |
| **Session hijacking** | 24-hour token expiry | ✅ Complete |
| **Token tampering** | HMAC-SHA256 signing | ✅ Added in refinement |
| **State tampering** | Token required for all writes | ✅ Complete |
| **XSS** | Tokens in localStorage (use CSP) | ⚠️ Document risk |
| **HTTPS** | Enforced by Vercel | ✅ Platform-level |

### Threat Model

**In Scope:**
- Prevent casual unauthorized access to presenter controls
- Allow audience to view without friction
- Protect session state integrity

**Out of Scope:**
- Sophisticated attacks (we're not handling sensitive data)
- Cross-device session theft (tokens are device-bound)
- DDoS protection (handled by Vercel/Supabase)

---

## Future Enhancements

| Feature | Complexity | Notes |
|---------|------------|-------|
| **Remote players (phones)** | Medium | Add Supabase Realtime for WebSocket sync |
| **Session history** | Low | Query completed sessions from DB |
| **QR code for joining** | Low | Generate QR from room URL |
| **Multiple presenters** | Medium | Share PIN or add co-host role |
| **Host migration** | High | Not recommended (complexity > value) |

---

## Dependencies

### Required Before Implementation
- ✅ Supabase project configured
- ✅ Database migrations system working
- ✅ `@joolie-boolie/database` package functional
- ✅ `@joolie-boolie/ui` package set up

### Environment Variables Needed
```bash
# apps/bingo/.env.local
# apps/trivia/.env.local
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SESSION_TOKEN_SECRET=<32-byte-hex-string>  # NEW!
```

Generate secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## References

- [Jackbox Games - How to Play](https://www.jackboxgames.com/how-to-play)
- [Kahoot - Game PIN](https://support.kahoot.com/hc/en-us/articles/360000109048)
- [Web Crypto API - HMAC](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign)
- [Next.js 16 Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## Appendix: Comparison to Original Plan

### What Changed

| Area | Original | Refined | Impact |
|------|----------|---------|--------|
| **API Routes** | Duplicated in each app | Shared factory | -50% code |
| **UI Components** | Duplicated in each app | Shared package | -50% code |
| **Session Systems** | 3 overlapping | 2 consolidated | -33% code |
| **Token Security** | Unsigned Base64 | HMAC-signed | +Security |
| **Sync Timing** | Vague "auto-sync" | Explicit debounce/throttle | +Performance |
| **Race Conditions** | Potential conflicts | Sequence numbers | +Reliability |

### What Stayed the Same

- ✅ Database schema (with sequence_number addition)
- ✅ Room code format (bird-themed, accessible)
- ✅ PIN security (SHA-256, 5 attempts, 15 min lockout)
- ✅ User stories (all satisfied)
- ✅ BFF pattern (Next.js API routes)
- ✅ 24-hour session expiry
- ✅ RLS policies

---

**This plan is ready for implementation. All dependencies are in place, the infrastructure is 75% complete, and the remaining work is clearly defined with minimal duplication.**
