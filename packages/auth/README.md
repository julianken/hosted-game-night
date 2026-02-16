# @joolie-boolie/auth

**Status:** ✅ Production Ready (95% Complete)

Comprehensive Supabase authentication wrappers for the Joolie Boolie. Provides React components, hooks, and utilities for implementing user authentication across all apps.

## Features

- ✅ React Context API integration with AuthProvider
- ✅ Authentication hooks (useAuth, useSession, useUser)
- ✅ Protected route components and HOCs
- ✅ Server-side and client-side Supabase client utilities
- ✅ TypeScript type definitions for auth states
- ✅ Session management utilities
- ✅ Guest-only route protection

## Installation

```json
{
  "dependencies": {
    "@joolie-boolie/auth": "workspace:*"
  }
}
```

## Quick Start

### 1. Wrap Your App with AuthProvider

```tsx
// app/layout.tsx
import { AuthProvider } from '@joolie-boolie/auth';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 2. Use Authentication Hooks

```tsx
// components/UserProfile.tsx
import { useAuth, useUser } from '@joolie-boolie/auth';

export function UserProfile() {
  const { signOut } = useAuth();
  const { user, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Not signed in</div>;

  return (
    <div>
      <p>Email: {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### 3. Protect Routes

```tsx
// app/dashboard/layout.tsx
import { ProtectedRoute } from '@joolie-boolie/auth';

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute redirectTo="/login">
      {children}
    </ProtectedRoute>
  );
}
```

## API Reference

### Components

#### `<AuthProvider>`
Root authentication provider component. Manages auth state and provides context to child components.

```tsx
import { AuthProvider } from '@joolie-boolie/auth';

<AuthProvider>
  <App />
</AuthProvider>
```

**Props:**
- `children: ReactNode` - Child components

#### `<ProtectedRoute>`
Wrapper component that redirects unauthenticated users.

```tsx
import { ProtectedRoute } from '@joolie-boolie/auth';

<ProtectedRoute redirectTo="/login">
  <Dashboard />
</ProtectedRoute>
```

**Props:**
- `children: ReactNode` - Protected content
- `redirectTo?: string` - Redirect path for unauthenticated users (default: `/login`)
- `fallback?: ReactNode` - Loading fallback

#### `<GuestOnly>`
Wrapper component that redirects authenticated users.

```tsx
import { GuestOnly } from '@joolie-boolie/auth';

<GuestOnly redirectTo="/dashboard">
  <LoginForm />
</GuestOnly>
```

**Props:**
- `children: ReactNode` - Guest-only content
- `redirectTo?: string` - Redirect path for authenticated users (default: `/`)

#### `withAuth(Component)`
Higher-order component for protecting components.

```tsx
import { withAuth } from '@joolie-boolie/auth';

const ProtectedComponent = withAuth(MyComponent, {
  redirectTo: '/login',
  fallback: <Loading />
});
```

### Hooks

#### `useAuth()`
Access authentication actions and state.

```tsx
import { useAuth } from '@joolie-boolie/auth';

function LoginForm() {
  const { signIn, signUp, signOut, isLoading, error } = useAuth();

  async function handleSignIn(email: string, password: string) {
    await signIn({ email, password });
  }

  return (
    // ... form JSX
  );
}
```

**Returns:**
- `signIn(credentials: SignInCredentials): Promise<void>`
- `signUp(credentials: SignUpCredentials): Promise<void>`
- `signOut(): Promise<void>`
- `isLoading: boolean`
- `error: AuthError | null`

#### `useSession()`
Access current session data.

```tsx
import { useSession } from '@joolie-boolie/auth';

function SessionInfo() {
  const { session, isLoading, error } = useSession();

  if (!session) return <div>No active session</div>;

  return <div>Session expires: {session.expiresAt}</div>;
}
```

**Returns:**
- `session: AuthSession | null`
- `isLoading: boolean`
- `error: AuthError | null`

#### `useUser()`
Access current user data.

```tsx
import { useUser } from '@joolie-boolie/auth';

function UserGreeting() {
  const { user, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return null;

  return <div>Hello, {user.email}!</div>;
}
```

**Returns:**
- `user: AuthUser | null`
- `isLoading: boolean`
- `error: AuthError | null`

### Client Utilities

#### `createClient()`
Create a browser-side Supabase client for client components.

```tsx
import { createClient } from '@joolie-boolie/auth';

const supabase = createClient();
```

#### `getClient()`
Get the singleton browser client instance.

```tsx
import { getClient } from '@joolie-boolie/auth';

const supabase = getClient();
```

#### `resetClient()`
Reset the singleton client instance (useful for testing).

```tsx
import { resetClient } from '@joolie-boolie/auth';

resetClient();
```

### TypeScript Types

```typescript
import type {
  AuthUser,          // User object shape
  AuthSession,       // Session object shape
  AuthError,         // Error object shape
  AuthErrorCode,     // Error code enum
  AuthState,         // Auth state shape
  SignInCredentials, // Sign-in parameters
  SignUpCredentials, // Sign-up parameters
  OAuthProvider,     // OAuth provider types
  AuthConfig,        // Configuration options
} from '@joolie-boolie/auth';
```

## Server-Side Usage

For server-side authentication (API routes, Server Components), use the Supabase SSR utilities directly:

```tsx
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// Usage in API route
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... handle authenticated request
}
```

## Environment Variables

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Integration Status

| App | Status | Notes |
|-----|--------|-------|
| Platform Hub | ❌ Not Integrated | UI exists, needs API routes |
| Bingo | ❌ Not Integrated | Functional without auth |
| Trivia | ❌ Not Integrated | Functional without auth |

## Remaining Work (5%)

- [ ] OAuth provider configuration helpers
- [ ] Email template customization utilities
- [ ] Role-based access control (RBAC) helpers
- [ ] Multi-factor authentication (MFA) support

## Architecture

This package provides **client-side authentication utilities only**. For server-side operations:
- Use `@supabase/ssr` directly in API routes
- Use middleware for route protection
- See [Supabase SSR documentation](https://supabase.com/docs/guides/auth/server-side/nextjs)

## Related Packages

- `@joolie-boolie/database` - Database utilities and hooks
- `@supabase/supabase-js` - Core Supabase client
- `@supabase/ssr` - Server-side rendering utilities
