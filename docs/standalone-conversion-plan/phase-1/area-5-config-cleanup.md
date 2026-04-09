# Investigation: Config & Deployment Cleanup

## Definitive Checklist

### turbo.json
- REMOVE from globalEnv: NEXT_PUBLIC_PLATFORM_HUB_URL, NEXT_PUBLIC_OAUTH_CLIENT_ID
- REMOVE Supabase env vars in Batch 6: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET

### Root package.json
- REMOVE scripts: dev:hub, build:hub, analyze:hub, lighthouse:hub
- UPDATE vercel:link to remove platform-hub mention

### pnpm-workspace.yaml
- NO CHANGE (uses apps/* glob, platform-hub removed by directory deletion)

### .env.example files (root, bingo, trivia)
- REMOVE: NEXT_PUBLIC_PLATFORM_HUB_URL, NEXT_PUBLIC_OAUTH_CLIENT_ID, NEXT_PUBLIC_OAUTH_REDIRECT_URI, NEXT_PUBLIC_OAUTH_CONSENT_URL, COOKIE_DOMAIN, SESSION_TOKEN_SECRET, SUPABASE_JWT_SECRET
- REMOVE (Batch 6): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

### env-validation.ts (both apps)
- REMOVE imports: validateOAuthConfig, validateSupabaseConfig, validateJwtSecret, validateSessionTokenSecret from @joolie-boolie/auth/env-validation
- SIMPLIFY validateEnvironment() to only check remaining vars (or delete entirely if no vars needed)

### next.config.ts (both apps)
- REMOVE @joolie-boolie/auth from transpilePackages
- REMOVE @joolie-boolie/database from transpilePackages (Batch 6)

### Service Worker sw.ts (both apps)
- REMOVE /api/auth/ bypass code (dead code after auth routes deleted)

### Game app package.json (both apps)
- REMOVE: @joolie-boolie/auth, @joolie-boolie/database, @supabase/supabase-js, @supabase/ssr, jose
- KEEP: all other deps (zustand, react, next, etc.)

### Vercel projects
- DELETE platform-hub Vercel project
- KEEP bingo and trivia Vercel projects (remove Supabase env vars from Vercel dashboard)
- Root domain (joolie-boolie.com) needs redirect or static page

### Playwright config
- REMOVE projects: real-auth, platform-hub
- REMOVE webServer entries for platform-hub
- SIMPLIFY auth fixtures (remove loginViaPlatformHub)

### E2E config
- DELETE e2e/platform-hub/, e2e/real-auth/
- DELETE e2e/fixtures/real-auth.ts, e2e/global-setup-real-auth.ts
- SIMPLIFY e2e/fixtures/auth.ts (remove OAuth login flow)
