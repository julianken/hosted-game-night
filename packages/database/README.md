# @beak-gaming/database

Database utilities package for the Beak Gaming Platform.

## Current Status

**Use Supabase directly** - This package is reserved for future utilities.

Apps should use `@supabase/supabase-js` and `@supabase/ssr` directly for database operations. See the BFF pattern in each app's API routes.

## Future Plans

This package may eventually include:

- Shared query helpers
- Type-safe database client wrappers
- Common data access patterns
- Migration utilities

## Installation

```json
{
  "dependencies": {
    "@beak-gaming/database": "workspace:*"
  }
}
```

## Current Exports

```typescript
// Placeholder exports only
export const DATABASE_PLACEHOLDER = true;

export interface DatabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}
```

## Using Supabase Directly

For now, use Supabase directly in your app:

```typescript
// In your app's lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// In your app's lib/supabase/server.ts
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
```
