# @beak-gaming/types

**Status:** ✅ Production Ready (100% Complete)

Comprehensive type-safe TypeScript definitions for the Beak Gaming Platform. Provides shared types for games, users, APIs, and dual-screen synchronization to ensure consistency across the monorepo and prevent type drift.

## Features

- ✅ Game session interfaces and enums
- ✅ User and authentication types
- ✅ Standardized API request/response wrappers
- ✅ Generic sync message types for dual-screen system
- ✅ Timestamp and metadata utilities
- ✅ Comprehensive JSDoc documentation
- ✅ 40+ exported types and interfaces
- ✅ Zero runtime dependencies

## Installation

```json
{
  "dependencies": {
    "@beak-gaming/types": "workspace:*"
  }
}
```

## Quick Start

### 1. Game Types

```typescript
import type { GameSession, GameStatus, GameType } from '@beak-gaming/types';

// Create a game session
const session: GameSession = {
  id: 'abc123',
  name: 'Bingo Night',
  status: 'playing',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Check game type
const gameType: GameType = 'bingo'; // 'bingo' | 'trivia'
const displayName = GAME_TYPE_NAMES[gameType]; // 'Beak Bingo'
```

### 2. API Response Wrappers

```typescript
import type { ApiResponse, PaginatedResponse } from '@beak-gaming/types';

// Standard API response
async function getProfile(userId: string): Promise<ApiResponse<UserProfile>> {
  try {
    const profile = await fetchProfile(userId);
    return { data: profile, error: null };
  } catch (err) {
    return { data: null, error: 'Profile not found' };
  }
}

// Paginated list response
async function listTemplates(
  page: number
): Promise<PaginatedResponse<BingoTemplate>> {
  const templates = await fetchTemplates(page);
  return {
    data: templates,
    total: 100,
    page: 1,
    pageSize: 20,
    error: null,
  };
}
```

### 3. Generic Sync Messages

```typescript
import type { SyncMessage } from '@beak-gaming/types';

// Define custom message types
type BingoSyncMessage =
  | SyncMessage<'BALL_CALLED', { number: number }>
  | SyncMessage<'PATTERN_CHANGED', { patternId: string }>
  | SyncMessage<'GAME_RESET', null>;

// Send sync message
function sendBallCalled(number: number) {
  const message: SyncMessage<'BALL_CALLED', { number: number }> = {
    type: 'BALL_CALLED',
    payload: { number },
    timestamp: Date.now(),
    originId: 'presenter-1',
  };
  broadcastChannel.postMessage(message);
}

// Handle incoming messages
function handleMessage(message: BingoSyncMessage) {
  switch (message.type) {
    case 'BALL_CALLED':
      console.log(`Ball ${message.payload.number} was called`);
      break;
    case 'PATTERN_CHANGED':
      console.log(`Pattern changed to ${message.payload.patternId}`);
      break;
    case 'GAME_RESET':
      console.log('Game reset');
      break;
  }
}
```

### 4. User and Session Types

```typescript
import type { User, UserProfile, Session } from '@beak-gaming/types';

// Basic user
const user: User = {
  id: 'uuid-123',
  email: 'director@sunnyacres.com',
  displayName: 'Jane Smith',
  createdAt: new Date().toISOString(),
};

// Extended profile
const profile: UserProfile = {
  ...user,
  facilityName: 'Sunny Acres Retirement Community',
  logoUrl: 'https://example.com/logo.png',
  defaultGameTitle: 'Game Night',
  updatedAt: new Date().toISOString(),
};
```

### 5. Extending Base Types

```typescript
import type { GameSession, GameStatus, Timestamps } from '@beak-gaming/types';

// Extend base GameSession with game-specific fields
interface BingoSession extends GameSession {
  ballsCalled: number[];
  patternId: string;
  autoCallEnabled: boolean;
}

// Extend GameStatus for game-specific states
type TriviaGameStatus = GameStatus | 'setup' | 'between_rounds';

// Use Timestamps mixin
interface BingoTemplate extends Timestamps {
  id: string;
  name: string;
  patternId: string;
  // createdAt and updatedAt inherited from Timestamps
}
```

## API Reference

### Game Types

#### `GameStatus`
```typescript
type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';
```
Base game status shared across all games. Individual games may extend with additional statuses.

#### `TriviaGameStatus`
```typescript
type TriviaGameStatus = GameStatus | 'setup' | 'between_rounds';
```
Extended game status for trivia that includes additional states beyond the base statuses.

#### `GameType`
```typescript
type GameType = 'bingo' | 'trivia';
```
Available game types in the Beak Gaming Platform.

#### `GAME_TYPE_NAMES`
```typescript
const GAME_TYPE_NAMES: Record<GameType, string> = {
  bingo: 'Beak Bingo',
  trivia: 'Trivia Night',
};
```
Map of game types to their display names.

#### `GameSession`
```typescript
interface GameSession {
  id: string;
  name: string;
  status: GameStatus;
  createdAt: string;  // ISO 8601 timestamp
  updatedAt: string;  // ISO 8601 timestamp
}
```
Base interface for a game session. Individual games should extend this with game-specific fields.

**Example:**
```typescript
const session: GameSession = {
  id: crypto.randomUUID(),
  name: 'Friday Night Bingo',
  status: 'idle',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

#### `ThemeMode`
```typescript
type ThemeMode = 'light' | 'dark' | 'system';
```
Theme mode for the application.

#### `ColorTheme`
```typescript
type ColorTheme =
  | 'blue' | 'green' | 'purple' | 'orange' | 'red'
  | 'teal' | 'pink' | 'amber' | 'indigo' | 'cyan';
```
Available color themes in the platform.

#### `Timestamps`
```typescript
interface Timestamps {
  createdAt: string;  // ISO 8601 timestamp
  updatedAt: string;  // ISO 8601 timestamp
}
```
Standard timestamp fields for database entities. Use as a mixin interface.

**Example:**
```typescript
interface MyEntity extends Timestamps {
  id: string;
  name: string;
  // createdAt and updatedAt inherited
}
```

### User Types

#### `User`
```typescript
interface User {
  id: string;              // UUID from Supabase Auth
  email: string;
  displayName: string | null;
  createdAt: string;       // ISO 8601 timestamp
}
```
Core user type representing an authenticated user.

#### `UserProfile`
```typescript
interface UserProfile extends User, Timestamps {
  facilityName: string | null;     // e.g., 'Sunny Acres Retirement Community'
  logoUrl: string | null;
  defaultGameTitle: string;
}
```
Extended user profile with additional platform-specific fields.

#### `LoginRequest`
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```
Request payload for user login.

#### `RegisterRequest`
```typescript
interface RegisterRequest {
  email: string;
  password: string;
  facilityName?: string;
  displayName?: string;
}
```
Request payload for user registration.

#### `AuthResponse`
```typescript
interface AuthResponse {
  user: User | null;
  error: string | null;
}
```
Response from authentication endpoints.

#### `UpdateProfileRequest`
```typescript
interface UpdateProfileRequest {
  displayName?: string;
  facilityName?: string;
  defaultGameTitle?: string;
}
```
Request payload for updating user profile.

#### `Session`
```typescript
interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;      // Unix milliseconds
  user: User;
}
```
Represents an authenticated session.

### API Types

#### `ApiResponse<T>`
```typescript
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
```
Standard API response wrapper. All API endpoints should return data in this format.

**Example:**
```typescript
// Success
const success: ApiResponse<User> = {
  data: { id: '123', email: 'user@example.com', ... },
  error: null
};

// Error
const error: ApiResponse<User> = {
  data: null,
  error: 'User not found'
};
```

#### `PaginatedResponse<T>`
```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;          // Total items across all pages
  page: number;           // Current page (1-indexed)
  pageSize: number;       // Items per page
  error: string | null;
}
```
Paginated API response wrapper for list endpoints.

**Example:**
```typescript
const response: PaginatedResponse<GameSession> = {
  data: [{ id: '1', ... }, { id: '2', ... }],
  total: 100,
  page: 1,
  pageSize: 20,
  error: null
};
```

#### `PaginationParams`
```typescript
interface PaginationParams {
  page?: number;          // 1-indexed, defaults to 1
  pageSize?: number;      // Defaults to 20
}
```
Standard pagination parameters for list requests.

#### `SortDirection`
```typescript
type SortDirection = 'asc' | 'desc';
```
Sort direction for list requests.

#### `SortParams<T>`
```typescript
interface SortParams<T extends string = string> {
  sortBy?: T;
  sortDirection?: SortDirection;
}
```
Standard sort parameters for list requests.

#### `ListParams<T>`
```typescript
interface ListParams<T extends string = string>
  extends PaginationParams, SortParams<T> {}
```
Combined list request parameters with pagination and sorting.

**Example:**
```typescript
interface TemplateListParams extends ListParams<'name' | 'created_at'> {}

const params: TemplateListParams = {
  page: 1,
  pageSize: 10,
  sortBy: 'created_at',
  sortDirection: 'desc'
};
```

#### `ApiError`
```typescript
interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}
```
Structured API error with additional context.

#### `ApiErrorCode`
```typescript
type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE';
```
Common API error codes used across the platform.

#### `RequestMetadata`
```typescript
interface RequestMetadata {
  requestId?: string;     // Client request ID for tracing
  timestamp?: number;     // Unix milliseconds
}
```
Metadata that can be included with API requests.

### Sync Types

#### `SyncRole`
```typescript
type SyncRole = 'presenter' | 'audience';
```
Sync role in the dual-screen system:
- **presenter**: Controls the game, broadcasts state changes
- **audience**: Receives and displays state from presenter

#### `ConnectionState`
```typescript
type ConnectionState = 'disconnected' | 'connected' | 'error';
```
Connection state for the broadcast channel.

#### `BaseSyncMessageType`
```typescript
type BaseSyncMessageType =
  | 'STATE_UPDATE'
  | 'REQUEST_SYNC'
  | 'DISPLAY_THEME_CHANGED';
```
Base sync message types shared across all games. Games can extend with their own message types.

#### `SyncMessage<TType, TPayload>`
```typescript
interface SyncMessage<TType extends string = string, TPayload = unknown> {
  type: TType;
  payload: TPayload | null;
  timestamp: number;      // Unix milliseconds
  originId?: string;      // Unique identifier to prevent echo
}
```
Generic sync message wrapper for the dual-screen system.

**Example:**
```typescript
// Define game-specific messages
type TriviaSyncMessage =
  | SyncMessage<'QUESTION_REVEALED', { questionId: string }>
  | SyncMessage<'ANSWER_SHOWN', { questionId: string; answer: string }>
  | SyncMessage<'ROUND_STARTED', { roundNumber: number }>;

// Create a message
const message: SyncMessage<'QUESTION_REVEALED', { questionId: string }> = {
  type: 'QUESTION_REVEALED',
  payload: { questionId: 'q1' },
  timestamp: Date.now(),
  originId: 'presenter-window',
};
```

#### `ThemeSyncPayload`
```typescript
interface ThemeSyncPayload {
  theme: 'light' | 'dark' | 'system';
}
```
Payload for theme change sync messages.

#### `BaseSyncState`
```typescript
interface BaseSyncState {
  role: SyncRole | null;
  isConnected: boolean;
  lastSyncTimestamp: number | null;
  connectionError: string | null;
}
```
Base sync state shared across all games. Extend this for game-specific sync state.

**Example:**
```typescript
interface BingoSyncState extends BaseSyncState {
  currentPattern: string;
  ballsCalled: number[];
  lastBallNumber: number | null;
}
```

## Type Guards

While this package primarily exports type definitions, you can create type guards for runtime checks:

```typescript
import type { GameType, GameStatus, ApiResponse } from '@beak-gaming/types';

// Game type guard
function isValidGameType(value: unknown): value is GameType {
  return typeof value === 'string' && ['bingo', 'trivia'].includes(value);
}

// Game status guard
function isValidGameStatus(value: unknown): value is GameStatus {
  return typeof value === 'string' &&
    ['idle', 'playing', 'paused', 'ended'].includes(value);
}

// API response guard
function isApiError<T>(response: ApiResponse<T>): response is ApiResponse<T> & { error: string } {
  return response.error !== null;
}

// Usage
const gameType: unknown = 'bingo';
if (isValidGameType(gameType)) {
  console.log(`Valid game: ${GAME_TYPE_NAMES[gameType]}`);
}

const response = await fetchProfile(userId);
if (isApiError(response)) {
  console.error(response.error);
} else {
  console.log(response.data);
}
```

## Integration Status

| App/Package | Status | Usage |
|-------------|--------|-------|
| `apps/bingo` | ✅ Active | Uses SyncMessage for dual-screen sync, GameSession via database package |
| `apps/trivia` | ✅ Active | Uses TriviaGameStatus, SyncMessage for dual-screen sync |
| `apps/platform-hub` | ⚠️ Partial | Will use User, AuthResponse when auth is integrated |
| `packages/sync` | ✅ Active | Re-exports SyncRole, ConnectionState, SyncMessage types |
| `packages/database` | ✅ Active | Defines GameType, SessionStatus based on these types |
| `packages/auth` | ✅ Active | Uses User, Session, AuthResponse types |
| `packages/ui` | ❌ N/A | UI components don't need game types |
| `packages/theme` | ❌ N/A | Uses ThemeMode, ColorTheme indirectly |

## Design Philosophy

### 1. Type Safety First
All types use strict TypeScript with no `any` types. Union types and enums are preferred over string literals for better IDE autocomplete.

### 2. Consistency Across Apps
Types are defined once and shared across all apps to prevent drift. For example, `GameType` is used consistently in database schemas, API routes, and UI components.

### 3. Generic Types for Flexibility
The `SyncMessage<TType, TPayload>` and `ApiResponse<T>` types are generic, allowing each game to extend them with specific payloads while maintaining a consistent structure.

### 4. ISO 8601 Timestamps
All timestamp fields use ISO 8601 string format (`YYYY-MM-DDTHH:mm:ss.sssZ`) for consistency with Supabase and JavaScript Date APIs.

### 5. Nullable vs Optional
- Use `null` for fields that may not have a value at runtime (e.g., `displayName: string | null`)
- Use `?` for fields that may be omitted entirely (e.g., `facilityName?: string`)

### 6. Extensibility
Base types like `GameSession`, `GameStatus`, and `BaseSyncState` are designed to be extended by individual games:

```typescript
// Trivia extends base GameStatus
type TriviaGameStatus = GameStatus | 'setup' | 'between_rounds';

// Bingo extends base GameSession
interface BingoSession extends GameSession {
  ballsCalled: number[];
  patternId: string;
}
```

### 7. Documentation as Code
Every exported type includes comprehensive JSDoc comments with descriptions, examples, and usage notes.

## Related Documentation

- **Database Package**: `/Users/j/repos/beak-gaming-platform/packages/database/README.md` - Uses GameType, SessionStatus
- **Sync Package**: `/Users/j/repos/beak-gaming-platform/packages/sync/README.md` - Re-exports and extends SyncMessage types
- **Auth Package**: `/Users/j/repos/beak-gaming-platform/packages/auth/README.md` - Uses User, Session, AuthResponse
- **Main CLAUDE.md**: `/Users/j/repos/beak-gaming-platform/CLAUDE.md` - Project overview and architecture

## Development

### Adding New Types

1. Add the type definition to the appropriate file:
   - `src/game.ts` - Game-related types
   - `src/user.ts` - User and auth types
   - `src/api.ts` - API request/response types
   - `src/sync.ts` - Sync and dual-screen types

2. Export from `src/index.ts`:
```typescript
export type { MyNewType } from './game';
```

3. Add JSDoc documentation:
```typescript
/**
 * Description of what this type represents.
 *
 * @example
 * const example: MyNewType = { ... };
 */
export interface MyNewType {
  // ...
}
```

4. Update this README with the new type in the API Reference section.

### Testing Type Exports

```bash
# Type check
pnpm typecheck

# Verify exports compile
pnpm build

# Test in a dependent package
cd ../database
pnpm typecheck
```
