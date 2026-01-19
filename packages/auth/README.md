# @beak-gaming/auth

Supabase authentication wrappers for the Beak Gaming Platform.

## Current Status

**Placeholder package** - Authentication utilities are planned but not yet implemented.

Apps should use `@supabase/supabase-js` and `@supabase/ssr` directly for authentication. See each app's `lib/supabase/` directory.

## Future Plans

This package will eventually provide:

- Shared authentication hooks
- Session management utilities
- Role-based access control helpers
- Server-side auth helpers for Next.js

## Installation

```json
{
  "dependencies": {
    "@beak-gaming/auth": "workspace:*"
  }
}
```

## Current Exports

```typescript
// Placeholder exports only
export const AUTH_PLACEHOLDER = true;

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  user: AuthUser | null;
  accessToken: string | null;
}
```

## Using Supabase Auth Directly

For now, implement authentication directly in your app:

### Client-Side Auth

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Usage in components
const supabase = createClient();

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Sign out
await supabase.auth.signOut();

// Get session
const { data: { session } } = await supabase.auth.getSession();
```

### Server-Side Auth

```typescript
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

// Usage in API routes
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... handle authenticated request
}
```

### Auth Middleware

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```
