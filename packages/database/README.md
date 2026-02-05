# @beak-gaming/database

**Status:** ✅ Production Ready (98% Complete)

Comprehensive type-safe database utilities for the Beak Gaming Platform. Provides Supabase client wrappers, CRUD helpers, React hooks, pagination, filtering, and table-specific utilities.

## Features

- ✅ Type-safe Supabase client wrappers (browser & server)
- ✅ Generic CRUD operations with full TypeScript support
- ✅ Pagination (offset-based & cursor-based)
- ✅ Filtering and sorting utilities
- ✅ React hooks for queries and mutations
- ✅ Table-specific helpers (profiles, templates, sessions)
- ✅ Session token management (HMAC-signed JWT)
- ✅ PIN security with lockout protection
- ✅ API route factories for Next.js
- ✅ Comprehensive error handling
- ✅ 268 exports

## Installation

```json
{
  "dependencies": {
    "@beak-gaming/database": "workspace:*"
  }
}
```

## Quick Start

### 1. Create Supabase Client

```tsx
// Client component
import { createBrowserClient } from '@beak-gaming/database';

const supabase = createBrowserClient();

// Server component / API route
import { createClient } from '@beak-gaming/database';

const supabase = await createClient();
```

### 2. Use CRUD Helpers

```tsx
import { getById, create, update, remove } from '@beak-gaming/database';

// Get by ID
const profile = await getById(supabase, 'profiles', userId);

// Create
const newTemplate = await create(supabase, 'bingo_templates', {
  user_id: userId,
  name: 'My Template',
  patterns: ['horizontal', 'vertical'],
});

// Update
await update(supabase, 'profiles', userId, {
  facility_name: 'Sunny Acres',
});

// Delete
await remove(supabase, 'bingo_templates', templateId);
```

### 3. Use React Hooks

```tsx
import { useQuery, useMutation } from '@beak-gaming/database';

function ProfileEditor() {
  // Query
  const { data: profile, isLoading, error } = useQuery(
    ['profile', userId],
    async () => getProfile(supabase, userId)
  );

  // Mutation
  const updateMutation = useMutation(
    async (updates) => updateProfile(supabase, userId, updates),
    {
      onSuccess: () => {
        console.log('Profile updated!');
      },
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      updateMutation.mutate({ facility_name: e.target.facilityName.value });
    }}>
      <input name="facilityName" defaultValue={profile.facility_name} />
      <button disabled={updateMutation.isLoading}>Save</button>
    </form>
  );
}
```

### 4. Use Table-Specific Helpers

```tsx
import {
  getCurrentProfile,
  listBingoTemplates,
  createGameSession,
  verifyPin,
} from '@beak-gaming/database';

// Get current user's profile
const profile = await getCurrentProfile(supabase);

// List templates with pagination
const { data: templates, pagination } = await listBingoTemplates(
  supabase,
  userId,
  { page: 1, pageSize: 10 }
);

// Create game session
const session = await createGameSession(supabase, {
  room_code: 'ROBIN-15',
  pin_hash: await createPinHash('1234'),
  game_type: 'trivia',
});

// Verify PIN
const isValid = await verifyPin('1234', session.pin_hash);
```

## API Reference

### Client

```typescript
import {
  createClient,           // Create server-side client
  createBrowserClient,    // Create browser client
  getBrowserClient,       // Get singleton browser client
  resetClient,            // Reset singleton (testing)
  getCurrentUser,         // Get current authenticated user
  getSession,            // Get current session
  isAuthenticated,       // Check if user is authenticated
} from '@beak-gaming/database';
```

### Types

Full TypeScript support for all database tables:

```typescript
import type {
  Database,              // Full schema type
  TableName,             // Union of table names
  TableRow,              // Row type for any table
  TableInsert,           // Insert type for any table
  TableUpdate,           // Update type for any table
  Profile,               // Profile row type
  BingoTemplate,         // Bingo template row type
  TriviaTemplate,        // Trivia template row type
  GameSession,           // Game session row type
} from '@beak-gaming/database';
```

### CRUD Operations

Generic CRUD helpers that work with any table:

```typescript
import {
  getById,      // Get single record by ID
  getOne,       // Get single record with filters
  list,         // List records with pagination
  listAll,      // List all records (no pagination)
  create,       // Create single record
  createMany,   // Create multiple records
  update,       // Update single record
  updateMany,   // Update multiple records
  remove,       // Delete single record
  removeMany,   // Delete multiple records
  count,        // Count records
  exists,       // Check if record exists
  upsert,       // Insert or update
} from '@beak-gaming/database';
```

**Example:**
```typescript
// List with pagination and filters
const { data, pagination, error } = await list(
  supabase,
  'bingo_templates',
  {
    page: 1,
    pageSize: 10,
    filters: [{ field: 'user_id', operator: 'eq', value: userId }],
    sorts: [{ field: 'created_at', direction: 'desc' }],
  }
);
```

### Pagination

```typescript
import {
  normalizePaginationParams,
  calculatePagination,
  createPaginatedResult,
  DEFAULT_PAGE_SIZE,  // 20
  MAX_PAGE_SIZE,      // 100
  type PaginationParams,
  type PaginatedResult,
} from '@beak-gaming/database';
```

### Filtering & Sorting

```typescript
import {
  applyFilter,
  applyFilters,
  applySort,
  applySorts,
  filters,   // Helper object: filters.eq('field', value)
  sorts,     // Helper object: sorts.desc('field')
  type FilterOperator,  // 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in'
  type FilterCondition,
  type SortCondition,
} from '@beak-gaming/database';
```

**Example:**
```typescript
let query = supabase.from('bingo_templates').select('*');

query = applyFilters(query, [
  { field: 'user_id', operator: 'eq', value: userId },
  { field: 'is_default', operator: 'eq', value: true },
]);

query = applySorts(query, [
  { field: 'updated_at', direction: 'desc' }
]);
```

### React Hooks

```typescript
import {
  // Query hooks
  useQuery,              // Basic query with caching
  useParamQuery,         // Query with URL params
  useListQuery,          // List query with pagination

  // Mutation hooks
  useMutation,           // Basic mutation
  useCreateMutation,     // Create operation
  useUpdateMutation,     // Update operation
  useDeleteMutation,     // Delete operation
  useOptimisticMutation, // Optimistic UI updates

  // Game session hooks
  useGameSession,                // Get game session
  useCreateGameSession,          // Create game session
  useUpdateGameSessionState,     // Update session state
  useMarkSessionCompleted,       // Mark session complete
  useVerifyPin,                  // Verify PIN
} from '@beak-gaming/database';
```

### Profile Utilities

```typescript
import {
  getCurrentProfile,       // Get current user's profile
  getProfile,              // Get profile by ID
  getProfileWithStats,     // Get profile with game stats
  updateCurrentProfile,    // Update current user's profile
  updateProfile,           // Update profile by ID
  updateFacilityName,      // Update facility name
  updateDefaultGameTitle,  // Update default game title
  updateLogoUrl,           // Update logo URL
  hasProfile,              // Check if user has profile
} from '@beak-gaming/database';
```

### Bingo Template Utilities

```typescript
import {
  getBingoTemplate,
  listBingoTemplates,
  listAllBingoTemplates,
  getDefaultBingoTemplate,
  createBingoTemplate,
  updateBingoTemplate,
  deleteBingoTemplate,
  setDefaultBingoTemplate,
  duplicateBingoTemplate,
  userOwnsBingoTemplate,
  countBingoTemplates,
  // Constants
  AUTO_CALL_INTERVAL_MIN,  // 5 seconds
  AUTO_CALL_INTERVAL_MAX,  // 30 seconds
} from '@beak-gaming/database';
```

### Trivia Template Utilities

```typescript
import {
  getTriviaTemplate,
  listTriviaTemplates,
  listAllTriviaTemplates,
  getDefaultTriviaTemplate,
  createTriviaTemplate,
  updateTriviaTemplate,
  deleteTriviaTemplate,
  setDefaultTriviaTemplate,
  duplicateTriviaTemplate,
  addQuestions,
  removeQuestion,
  updateQuestion,
  reorderQuestions,
  userOwnsTriviaTemplate,
  countTriviaTemplates,
  getTotalQuestionCount,
  // Constants
  ROUNDS_COUNT_MIN,             // 2
  ROUNDS_COUNT_MAX,             // 6
  QUESTIONS_PER_ROUND_MIN,      // 3
  QUESTIONS_PER_ROUND_MAX,      // 10
  TIMER_DURATION_MIN,           // 10 seconds
  TIMER_DURATION_MAX,           // 120 seconds
} from '@beak-gaming/database';
```

### Game Session Utilities

**Local Sessions (In-Memory):**
```typescript
import {
  generateSessionId,
  createLocalSession,
  getLocalSession,
  updateLocalSession,
  deleteLocalSession,
  getLocalSessionsByUser,
  getActiveLocalSessions,
  clearLocalSessions,
  type GameType,           // 'bingo' | 'trivia'
  type SessionStatus,      // 'active' | 'paused' | 'completed' | 'cancelled'
} from '@beak-gaming/database';
```

**Persistent Sessions (Database):**
```typescript
import {
  createGameSession,
  getGameSessionByRoomCode,
  getGameSessionBySessionId,
  updateGameSessionState,
  incrementFailedPinAttempt,
  resetFailedPinAttempts,
  markSessionCompleted,
  cleanupExpiredSessions,
} from '@beak-gaming/database';
```

### Session Tokens (JWT)

```typescript
import {
  createSessionToken,    // Create token with room_code and session_id
  encodeSessionToken,    // Encode token to JWT string
  decodeSessionToken,    // Decode JWT string to token object
  isTokenExpired,        // Check if token is expired
  TOKEN_DURATION_MS,     // 24 hours
} from '@beak-gaming/database';
```

**Example:**
```typescript
// Create and encode token
const token = createSessionToken('ROBIN-15', 'abc123');
const jwt = encodeSessionToken(token, process.env.SESSION_TOKEN_SECRET!);

// Decode and verify
const decoded = decodeSessionToken(jwt, process.env.SESSION_TOKEN_SECRET!);
if (!decoded || isTokenExpired(decoded)) {
  throw new Error('Invalid or expired token');
}
```

### PIN Security

```typescript
import {
  createPinHash,         // Hash PIN with bcrypt
  verifyPin,             // Verify PIN against hash
  isValidPin,            // Validate PIN format (4 digits)
  isLockedOut,           // Check if session is locked out
  MAX_ATTEMPTS,          // 5 attempts
  LOCKOUT_DURATION_MS,   // 15 minutes
} from '@beak-gaming/database';
```

**Example:**
```typescript
// Create hash
const pinHash = await createPinHash('1234');

// Verify
const isValid = await verifyPin('1234', pinHash);

// Check lockout
if (isLockedOut(failedAttempts, lastFailedAt)) {
  throw new Error('Too many attempts. Try again later.');
}
```

### API Route Factories

Generate Next.js API routes for game sessions:

```typescript
import { createSessionRoutes } from '@beak-gaming/database';

// In app/api/sessions/route.ts
const routes = createSessionRoutes({
  gameType: 'trivia',
  createClient,  // Your createClient function
});

export const POST = routes.POST;  // Create session

// In app/api/sessions/[roomCode]/verify-pin/route.ts
export const POST = routes.verifyPin;  // Verify PIN

// In app/api/sessions/[roomCode]/state/route.ts
export const PATCH = routes.updateState;  // Update session state
```

### Error Handling

Comprehensive error classes:

```typescript
import {
  DatabaseError,            // Base error class
  NotFoundError,            // Record not found
  DuplicateError,           // Unique constraint violation
  ValidationError,          // Invalid data
  UnauthorizedError,        // Not authenticated
  ForbiddenError,           // Not authorized
  ConnectionError,          // Network/connection issues
  TimeoutError,             // Query timeout
  RateLimitError,           // Rate limit exceeded
  ConstraintViolationError, // Database constraint violation
  isDatabaseError,          // Type guard
  mapSupabaseError,         // Convert Supabase errors
  withErrorHandling,        // Wrap function with error handling
} from '@beak-gaming/database';
```

## Environment Variables

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # API routes only
SESSION_TOKEN_SECRET=your-64-char-hex-string      # Generate with: openssl rand -hex 32
```

## Usage in Apps

### Client Components

```tsx
import { createBrowserClient, useQuery, listBingoTemplates } from '@beak-gaming/database';

function TemplateList() {
  const supabase = createBrowserClient();
  const userId = 'user-id';

  const { data: templates, isLoading } = useQuery(
    ['bingo-templates', userId],
    () => listBingoTemplates(supabase, userId, { page: 1, pageSize: 10 })
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {templates?.data.map(template => (
        <li key={template.id}>{template.name}</li>
      ))}
    </ul>
  );
}
```

### Server Components

```tsx
import { createClient, getCurrentProfile } from '@beak-gaming/database';

async function ProfileCard() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) return <div>No profile found</div>;

  return (
    <div>
      <h1>{profile.facility_name || 'Welcome'}</h1>
      <p>Member since {new Date(profile.created_at).toLocaleDateString()}</p>
    </div>
  );
}
```

### API Routes

```tsx
// app/api/profiles/route.ts
import { createClient, getCurrentProfile, updateProfile } from '@beak-gaming/database';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const updates = await request.json();

  const profile = await updateCurrentProfile(supabase, updates);

  return NextResponse.json({ profile });
}
```

## Integration Status

| App | Status | Notes |
|-----|--------|-------|
| Bingo | ✅ Integrated | Session management working |
| Trivia | ✅ Integrated | Session management working |
| Platform Hub | ❌ Not Integrated | No API routes yet |

## Remaining Work (2%)

- [ ] Migration tooling documentation
- [ ] Seed data utilities
- [ ] Backup/restore helpers

## Related Packages

- `@beak-gaming/auth` - Authentication utilities and hooks
- `@supabase/supabase-js` - Core Supabase client
- `@supabase/ssr` - Server-side rendering utilities
