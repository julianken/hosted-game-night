# E2E Docker Isolation Architecture Analysis

**Date:** 2026-01-26
**Status:** Analysis Complete
**Author:** Claude Agent (Investigation)

---

## Executive Summary

**Critical Finding:** The current E2E testing setup has a fundamental isolation problem when used with the parallel worktree workflow. All worktrees share the same hardcoded ports (3000, 3001, 3002), meaning only ONE set of dev servers can run at a time. Tests in parallel worktrees either:

1. **Share a single dev server** (if one is running) - causing state interference
2. **Fail to connect** (if no server is running) - causing test timeouts
3. **Compete for ports** (if each tries to start servers) - causing startup failures

This document analyzes the current architecture, identifies the specific problems, and proposes solutions ranging from Docker-based full isolation to simpler sequential approaches.

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Identified Issues](#2-identified-issues)
3. [Docker-Based Solution Design](#3-docker-based-solution-design)
4. [Implementation Plan](#4-implementation-plan)
5. [Alternative Approaches](#5-alternative-approaches)
6. [Recommendation](#6-recommendation)

---

## 1. Current Architecture Analysis

### 1.1 Port Allocation (Hardcoded)

| App | Dev Port | Prod Port | Configuration Location |
|-----|----------|-----------|------------------------|
| Bingo | 3000 | 3000 | `apps/bingo/package.json` (implicit Next.js default) |
| Trivia | 3001 | 3001 | `apps/trivia/package.json` (`--port 3001`) |
| Platform Hub | 3002 | 3002 | `apps/platform-hub/package.json` (`--port 3002`) |

**Evidence from `apps/bingo/package.json`:**
```json
{
  "scripts": {
    "dev": "next dev",
    "start": "next start --port 3000"
  }
}
```

**Evidence from `apps/trivia/package.json`:**
```json
{
  "scripts": {
    "dev": "next dev --port 3001",
    "start": "next start --port 3001"
  }
}
```

**Evidence from `apps/platform-hub/package.json`:**
```json
{
  "scripts": {
    "dev": "next dev --port 3002",
    "start": "next start --port 3002"
  }
}
```

### 1.2 Playwright Configuration

**From `playwright.config.ts`:**

```typescript
projects: [
  {
    name: 'bingo',
    testDir: './e2e/bingo',
    use: {
      ...devices['Desktop Chrome'],
      baseURL: 'http://localhost:3000',  // HARDCODED
    },
  },
  {
    name: 'trivia',
    testDir: './e2e/trivia',
    use: {
      ...devices['Desktop Chrome'],
      baseURL: 'http://localhost:3001',  // HARDCODED
    },
  },
  {
    name: 'platform-hub',
    testDir: './e2e/platform-hub',
    use: {
      ...devices['Desktop Chrome'],
      baseURL: 'http://localhost:3002',  // HARDCODED
    },
  },
]
```

**Key observations:**
- `fullyParallel: true` - Tests run in parallel WITHIN a single Playwright run
- `workers: isCI ? 4 : undefined` - Multiple workers on CI
- `webServer` - Only configured for CI (production build); locally, servers must be manually started
- All URLs are hardcoded to localhost with fixed ports

### 1.3 Auth Fixtures

**From `e2e/fixtures/auth.ts`:**

```typescript
// URL Constants - HARDCODED
const HUB_URL = 'http://localhost:3002';
const BINGO_URL = 'http://localhost:3000';
const TRIVIA_URL = 'http://localhost:3001';
```

The auth fixtures perform OAuth login via Platform Hub, then navigate to Bingo/Trivia with SSO cookies. This flow depends on:
1. Platform Hub responding on port 3002
2. Cookie domain sharing (all on localhost)
3. Supabase connection for auth (or E2E bypass mode)

### 1.4 Database Connection

**From `e2e/global-setup.ts`:**

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

All E2E tests share:
- A single Supabase project
- A single test user (`e2e-test@joolie-boolie.test`)
- No per-worktree database isolation

### 1.5 Worktree Usage (from SKILL.md)

The `subagent-workflow` skill creates worktrees like:
```bash
git worktree add ../wt-BEA-330-login-form -b feat/BEA-330-login-form
```

Each worktree is a complete copy of the codebase, intended for parallel development. However, the E2E testing documentation acknowledges the port conflict issue:

**From `docs/E2E_TESTING_GUIDE.md`:**
```markdown
**Port conflicts**: Each worktree shares the same ports (3000, 3001, 3002).
Only ONE set of dev servers can run at a time.

**Solution**: Run E2E tests sequentially, or use different ports per worktree
(requires config changes).
```

---

## 2. Identified Issues

### 2.1 Issue #1: Port Conflicts Between Worktrees

**Severity:** CRITICAL
**Impact:** E2E tests cannot run in parallel across worktrees

**Scenario:**
```
Main Repo (~/repos/joolie-boolie-platform)
├── pnpm dev → Starts servers on 3000, 3001, 3002
├── pnpm test:e2e → Tests against 3000, 3001, 3002 ✓

Worktree 1 (~/repos/wt-BEA-330-login-form)
├── pnpm dev → FAILS: Port 3000 already in use ✗
├── pnpm test:e2e → Connects to MAIN REPO'S servers ✗ (wrong code!)

Worktree 2 (~/repos/wt-BEA-331-trivia-fix)
├── pnpm dev → FAILS: Port 3000 already in use ✗
├── pnpm test:e2e → Connects to MAIN REPO'S servers ✗ (wrong code!)
```

**Result:** Tests in worktrees either fail to start or test the WRONG codebase.

### 2.2 Issue #2: Shared Database State

**Severity:** HIGH
**Impact:** Test data interference when running tests in parallel

**Scenario:**
- Test A in worktree 1: Creates session with ID `session-123`
- Test B in worktree 2: Also tries to create `session-123`
- Both tests use the same Supabase project
- Race conditions, unique constraint violations, or data corruption

**Current state:** Tests rely on:
- `localStorage` (browser-isolated, not a problem)
- `sessionStorage` (browser-isolated, not a problem)
- Supabase database (SHARED across all test runs)

### 2.3 Issue #3: Single Test User Contention

**Severity:** MEDIUM
**Impact:** Authentication rate limits and session conflicts

**From `e2e/fixtures/auth.ts`:**
```typescript
testUser: async ({}, use) => {
  await use({
    email: process.env.TEST_USER_EMAIL || 'e2e-test@joolie-boolie.test',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
  });
},
```

All tests log in as the same user. When parallel tests attempt simultaneous logins:
- Supabase rate limits kick in (~30 req/hour per email)
- Session tokens may conflict
- The `E2E_TESTING=true` bypass helps but doesn't fully solve it

### 2.4 Issue #4: BroadcastChannel Isolation

**Severity:** LOW
**Impact:** Potential cross-test interference in dual-screen sync tests

`BroadcastChannel` is scoped by origin (`http://localhost:3000`). If multiple tests run on the same origin simultaneously:
- Test A calls ball B-12
- Test B receives B-12 broadcast (wrong test!)

Currently mitigated by:
- Playwright's browser context isolation (each test gets fresh context)
- Different browser contexts have separate `BroadcastChannel` instances

**Not a problem** as long as each test uses a separate browser context.

---

## 3. Docker-Based Solution Design

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HOST MACHINE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  WORKTREE 1: ~/repos/wt-BEA-330-login-form                  │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │  docker-compose.yml                                  │    │   │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │    │   │
│  │  │  │ Bingo       │ │ Trivia      │ │ Hub         │   │    │   │
│  │  │  │ Port: 3100  │ │ Port: 3101  │ │ Port: 3102  │   │    │   │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘   │    │   │
│  │  │  ┌─────────────────────────────────────────────┐   │    │   │
│  │  │  │ PostgreSQL (or Supabase local)              │   │    │   │
│  │  │  │ Port: 5400                                   │   │    │   │
│  │  │  └─────────────────────────────────────────────┘   │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │  playwright.config.ts: baseURL=http://localhost:3100        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  WORKTREE 2: ~/repos/wt-BEA-331-trivia-fix                  │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │  docker-compose.yml                                  │    │   │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │    │   │
│  │  │  │ Bingo       │ │ Trivia      │ │ Hub         │   │    │   │
│  │  │  │ Port: 3200  │ │ Port: 3201  │ │ Port: 3202  │   │    │   │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘   │    │   │
│  │  │  ┌─────────────────────────────────────────────┐   │    │   │
│  │  │  │ PostgreSQL (or Supabase local)              │   │    │   │
│  │  │  │ Port: 5401                                   │   │    │   │
│  │  │  └─────────────────────────────────────────────┘   │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │  playwright.config.ts: baseURL=http://localhost:3200        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  MAIN REPO: ~/repos/joolie-boolie-platform                    │   │
│  │  (Regular dev setup, ports 3000-3002, shared Supabase)      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Port Allocation Scheme

| Worktree Index | Bingo Port | Trivia Port | Hub Port | Postgres Port | Base |
|----------------|------------|-------------|----------|---------------|------|
| Main (0) | 3000 | 3001 | 3002 | 5432 | 3000 |
| Worktree 1 | 3100 | 3101 | 3102 | 5400 | 3100 |
| Worktree 2 | 3200 | 3201 | 3202 | 5401 | 3200 |
| Worktree 3 | 3300 | 3301 | 3302 | 5402 | 3300 |
| Worktree 4 | 3400 | 3401 | 3402 | 5403 | 3400 |
| Worktree N | 3N00 | 3N01 | 3N02 | 54N0 | 3N00 |

**Formula:**
```
BINGO_PORT = 3000 + (worktree_index * 100)
TRIVIA_PORT = 3001 + (worktree_index * 100)
HUB_PORT = 3002 + (worktree_index * 100)
POSTGRES_PORT = 5432 + (worktree_index - 1) * 1  # Main uses 5432, worktrees start at 5400
```

### 3.3 Docker Compose Template

**File: `docker-compose.e2e.yml`**

```yaml
version: '3.8'

services:
  postgres:
    image: supabase/postgres:15.1.0.117
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  supabase-auth:
    image: supabase/gotrue:v2.132.3
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      GOTRUE_API_HOST: "0.0.0.0"
      GOTRUE_API_PORT: "9999"
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: "postgres://postgres:postgres@postgres:5432/postgres?search_path=auth"
      GOTRUE_SITE_URL: "http://localhost:${HUB_PORT:-3002}"
      GOTRUE_JWT_SECRET: "${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}"
      GOTRUE_JWT_EXP: "3600"
      GOTRUE_DISABLE_SIGNUP: "false"
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
      GOTRUE_MAILER_AUTOCONFIRM: "true"
    ports:
      - "${AUTH_PORT:-9999}:9999"

  bingo:
    build:
      context: .
      dockerfile: Dockerfile.dev
      args:
        APP: bingo
    environment:
      - PORT=${BINGO_PORT:-3000}
      - NEXT_PUBLIC_SUPABASE_URL=http://localhost:${AUTH_PORT:-9999}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SESSION_TOKEN_SECRET=${SESSION_TOKEN_SECRET}
      - E2E_TESTING=true
    ports:
      - "${BINGO_PORT:-3000}:${BINGO_PORT:-3000}"
    depends_on:
      - supabase-auth
    volumes:
      - ./apps/bingo:/app/apps/bingo
      - ./packages:/app/packages
      - /app/node_modules
      - /app/apps/bingo/node_modules

  trivia:
    build:
      context: .
      dockerfile: Dockerfile.dev
      args:
        APP: trivia
    environment:
      - PORT=${TRIVIA_PORT:-3001}
      - NEXT_PUBLIC_SUPABASE_URL=http://localhost:${AUTH_PORT:-9999}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SESSION_TOKEN_SECRET=${SESSION_TOKEN_SECRET}
      - E2E_TESTING=true
    ports:
      - "${TRIVIA_PORT:-3001}:${TRIVIA_PORT:-3001}"
    depends_on:
      - supabase-auth
    volumes:
      - ./apps/trivia:/app/apps/trivia
      - ./packages:/app/packages
      - /app/node_modules
      - /app/apps/trivia/node_modules

  hub:
    build:
      context: .
      dockerfile: Dockerfile.dev
      args:
        APP: platform-hub
    environment:
      - PORT=${HUB_PORT:-3002}
      - NEXT_PUBLIC_SUPABASE_URL=http://localhost:${AUTH_PORT:-9999}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SESSION_TOKEN_SECRET=${SESSION_TOKEN_SECRET}
      - E2E_TESTING=true
    ports:
      - "${HUB_PORT:-3002}:${HUB_PORT:-3002}"
    depends_on:
      - supabase-auth
    volumes:
      - ./apps/platform-hub:/app/apps/platform-hub
      - ./packages:/app/packages
      - /app/node_modules
      - /app/apps/platform-hub/node_modules

networks:
  default:
    name: jb-e2e-${WORKTREE_ID:-main}
```

### 3.4 Dockerfile for Development

**File: `Dockerfile.dev`**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/bingo/package.json ./apps/bingo/
COPY apps/trivia/package.json ./apps/trivia/
COPY apps/platform-hub/package.json ./apps/platform-hub/
COPY packages/*/package.json ./packages/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source (will be overridden by volumes in dev)
COPY . .

# Build arg to select which app to run
ARG APP
ENV APP=${APP}

# Run the specified app in dev mode
CMD ["sh", "-c", "pnpm --filter @joolie-boolie/${APP} dev"]
```

### 3.5 Dynamic Playwright Configuration

**Modified `playwright.config.ts`:**

```typescript
import { defineConfig, devices } from '@playwright/test';

// Get port base from environment or default to 3000
const PORT_BASE = parseInt(process.env.E2E_PORT_BASE || '3000', 10);
const BINGO_PORT = PORT_BASE;
const TRIVIA_PORT = PORT_BASE + 1;
const HUB_PORT = PORT_BASE + 2;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,

  projects: [
    {
      name: 'bingo',
      testDir: './e2e/bingo',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${BINGO_PORT}`,
      },
    },
    {
      name: 'trivia',
      testDir: './e2e/trivia',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${TRIVIA_PORT}`,
      },
    },
    {
      name: 'platform-hub',
      testDir: './e2e/platform-hub',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${HUB_PORT}`,
      },
    },
  ],
});
```

**Modified `e2e/fixtures/auth.ts`:**

```typescript
// Dynamic URL Constants
const PORT_BASE = parseInt(process.env.E2E_PORT_BASE || '3000', 10);
const HUB_URL = `http://localhost:${PORT_BASE + 2}`;
const BINGO_URL = `http://localhost:${PORT_BASE}`;
const TRIVIA_URL = `http://localhost:${PORT_BASE + 1}`;
```

### 3.6 Worktree Setup Script

**File: `scripts/setup-worktree-e2e.sh`**

```bash
#!/bin/bash

# Usage: ./scripts/setup-worktree-e2e.sh <worktree-index>
# Example: ./scripts/setup-worktree-e2e.sh 1

WORKTREE_INDEX=${1:-1}
PORT_BASE=$((3000 + WORKTREE_INDEX * 100))

echo "Setting up E2E environment for worktree ${WORKTREE_INDEX}"
echo "Port base: ${PORT_BASE}"

# Create .env.e2e file
cat > .env.e2e << EOF
# E2E Testing Configuration (Worktree ${WORKTREE_INDEX})
E2E_PORT_BASE=${PORT_BASE}
BINGO_PORT=${PORT_BASE}
TRIVIA_PORT=$((PORT_BASE + 1))
HUB_PORT=$((PORT_BASE + 2))
POSTGRES_PORT=$((5400 + WORKTREE_INDEX - 1))
AUTH_PORT=$((9999 + WORKTREE_INDEX * 100))
WORKTREE_ID=${WORKTREE_INDEX}

# Copy from your main .env
SESSION_TOKEN_SECRET=$(grep SESSION_TOKEN_SECRET .env.local | cut -d= -f2)
EOF

echo "Created .env.e2e with port base ${PORT_BASE}"
echo ""
echo "To start E2E environment:"
echo "  docker-compose -f docker-compose.e2e.yml --env-file .env.e2e up -d"
echo ""
echo "To run tests:"
echo "  E2E_PORT_BASE=${PORT_BASE} pnpm test:e2e"
```

---

## 4. Implementation Plan

### Phase 1: Dynamic Port Configuration (Low Complexity)

**Complexity:** Low (config changes only)
**Changes required:**
1. Modify `playwright.config.ts` to use `E2E_PORT_BASE` environment variable
2. Modify `e2e/fixtures/auth.ts` to use dynamic URLs
3. Update `e2e/utils/helpers.ts` if needed
4. Document the port allocation scheme

**Commands after change:**
```bash
# Main repo (default ports)
pnpm dev
pnpm test:e2e

# Worktree 1 (ports 3100-3102)
E2E_PORT_BASE=3100 pnpm dev  # Need to also modify dev scripts
E2E_PORT_BASE=3100 pnpm test:e2e
```

**Problem:** This still requires modifying how dev servers start, which is more complex.

### Phase 2: Dockerized Development Environment (Medium Complexity)

**Complexity:** Medium (new Docker infrastructure)
**Changes required:**
1. Create `Dockerfile.dev`
2. Create `docker-compose.e2e.yml`
3. Create `scripts/setup-worktree-e2e.sh`
4. Create documentation for Docker-based workflow
5. Test the full stack in containers

**New workflow:**
```bash
# In worktree 1
./scripts/setup-worktree-e2e.sh 1
docker-compose -f docker-compose.e2e.yml --env-file .env.e2e up -d
E2E_PORT_BASE=3100 pnpm test:e2e
docker-compose -f docker-compose.e2e.yml down
```

### Phase 3: Full Database Isolation (High Complexity)

**Complexity:** High (full Supabase local stack)
**Changes required:**
1. Integrate Supabase local development stack (supabase/supabase-local)
2. Database migrations run per container
3. Seed data for test users
4. Auth bypass in local Supabase

**Note:** This is complex because Supabase local requires:
- `supabase/gotrue` (auth)
- `supabase/postgres` (database)
- `supabase/storage-api` (if using storage)
- `supabase/realtime` (if using realtime)

---

## 5. Alternative Approaches

### 5.1 Sequential E2E Testing (Simplest)

**Approach:** Only one worktree runs E2E tests at a time.

**Implementation:**
1. Keep current setup unchanged
2. Document that E2E tests are sequential
3. Use a lock file or semaphore to prevent concurrent runs

**Pros:**
- Zero implementation effort
- No Docker complexity
- No port management

**Cons:**
- Slower parallel workflow (only code changes are parallel, tests are sequential)
- Agents must wait for dev server availability

**Recommended workflow:**
```bash
# Worktree 1: Implement feature (no E2E yet)
cd ~/repos/wt-BEA-330
# Make code changes, unit tests only
pnpm test:run

# Worktree 2: Implement feature (no E2E yet)
cd ~/repos/wt-BEA-331
# Make code changes, unit tests only
pnpm test:run

# Back to main: Run E2E for worktree 1 code
cd ~/repos/joolie-boolie-platform
git checkout wt-BEA-330-branch
pnpm dev
pnpm test:e2e

# Repeat for worktree 2
git checkout wt-BEA-331-branch
# (servers still running with old code? need restart)
pnpm dev
pnpm test:e2e
```

### 5.2 Port-per-Worktree (No Docker)

**Approach:** Dynamically assign ports when starting dev servers.

**Implementation:**
1. Modify `apps/*/package.json` scripts to accept `PORT` environment variable
2. Modify Playwright config to read `E2E_PORT_BASE`
3. Create worktree setup script that allocates ports

**Example modified `apps/bingo/package.json`:**
```json
{
  "scripts": {
    "dev": "next dev --port ${PORT:-3000}",
    "start": "next start --port ${PORT:-3000}"
  }
}
```

**Workflow:**
```bash
# Worktree 1
cd ~/repos/wt-BEA-330
export E2E_PORT_BASE=3100
PORT=3100 pnpm --filter @joolie-boolie/bingo dev &
PORT=3101 pnpm --filter @joolie-boolie/trivia dev &
PORT=3102 pnpm --filter @joolie-boolie/platform-hub dev &
pnpm test:e2e

# Worktree 2 (different terminal)
cd ~/repos/wt-BEA-331
export E2E_PORT_BASE=3200
PORT=3200 pnpm --filter @joolie-boolie/bingo dev &
PORT=3201 pnpm --filter @joolie-boolie/trivia dev &
PORT=3202 pnpm --filter @joolie-boolie/platform-hub dev &
pnpm test:e2e
```

**Pros:**
- No Docker required
- Relatively simple changes
- True parallel execution

**Cons:**
- Manual port management
- Still shares Supabase database (potential conflicts)
- Resource intensive (3 dev servers per worktree)

### 5.3 Namespace-Based Database Isolation

**Approach:** Use unique prefixes for test data to avoid conflicts.

**Implementation:**
1. Generate unique session ID prefix per worktree
2. All test data (sessions, rooms, etc.) prefixed with this ID
3. Cleanup: Delete all data with prefix after test run

**Example:**
```typescript
// In e2e/fixtures/auth.ts
const WORKTREE_ID = process.env.WORKTREE_ID || 'main';
const testSessionPrefix = `e2e_${WORKTREE_ID}_`;

// All sessions created with prefix
const sessionId = `${testSessionPrefix}${uuid()}`;
```

**Pros:**
- Works with shared Supabase
- No infrastructure changes
- Cleanup is straightforward

**Cons:**
- Requires code changes in test fixtures
- Doesn't solve port conflicts
- May not work for all scenarios

### 5.4 Playwright Sharding (Built-in)

**Approach:** Use Playwright's built-in sharding to split tests across workers.

**Current config already supports this:**
```typescript
shard: isCI && process.env.SHARD
  ? { total: 4, current: parseInt(process.env.SHARD, 10) }
  : undefined,
```

**This is for CI parallelization, not worktree isolation.**

Within a single Playwright run, tests are already parallel (`fullyParallel: true`). Browser contexts are isolated. This doesn't help with the worktree problem.

---

## 6. Recommendation

### Short-Term (Immediate): Sequential E2E Testing

**Rationale:**
- Zero implementation effort
- The current worktree workflow is primarily for code isolation during development
- E2E testing at the end of implementation (before PR) is acceptable

**Process:**
1. Implementer agents make code changes in worktrees
2. Unit tests run in worktrees (no server needed)
3. E2E tests run sequentially in main repo after merging to feature branch

**Update to `SKILL.md`:**
```markdown
**E2E Testing in Worktrees:**
- Run unit tests in worktree: `pnpm test:run`
- E2E tests require the main dev servers (ports 3000-3002)
- To run E2E: Push branch, checkout in main repo, start servers, run tests
- Only ONE E2E test run at a time across all worktrees
```

### Medium-Term: Port-per-Worktree Without Docker

**Rationale:**
- Enables true parallel E2E testing
- No Docker dependency (keeps developer experience simple)
- Acceptable resource usage if limited to 2-3 concurrent worktrees

**Implementation:**
1. Update package.json scripts to accept `PORT` env var
2. Update Playwright config for dynamic ports
3. Update auth fixtures for dynamic URLs
4. Create `scripts/setup-worktree-e2e.sh` for port allocation
5. Document the workflow

### Long-Term (If Needed): Docker-Based Full Isolation

**Rationale:**
- Only if database conflicts become a real problem
- Only if local Supabase testing is required
- Significant operational complexity

**When to consider:**
- Multiple developers running E2E tests simultaneously
- Need for database-level test isolation
- CI/CD pipeline requires containerized testing

### Not Recommended: Full Supabase Local per Worktree

**Rationale:**
- Extremely resource-intensive (full Supabase stack per worktree)
- Complex setup and maintenance
- Overkill for current AI-only development model
- The `E2E_TESTING=true` bypass already avoids most Supabase rate limits

---

## Appendix A: Cost Analysis

### Resource Usage Per Worktree

| Configuration | RAM | CPU | Disk |
|--------------|-----|-----|------|
| Dev servers only (3 Next.js) | ~1.5GB | ~20% idle | ~500MB |
| + PostgreSQL | +512MB | +5% | +1GB |
| + Full Supabase stack | +2GB | +15% | +3GB |
| Docker overhead | +200MB | +2% | +500MB |

**Recommendation:** Limit to 3 concurrent worktrees with E2E capability on a 16GB machine.

### Time Overhead

| Operation | Time |
|-----------|------|
| Start 3 dev servers (native) | ~30 seconds |
| Start 3 dev servers (Docker) | ~60-90 seconds |
| Start full Supabase local | ~2-3 minutes |
| Docker image build (first time) | ~5-10 minutes |

---

## Appendix B: Questions Answered

### Q1: Do worktree E2E tests actually run in isolation today?

**Answer: NO.** All worktrees share the same hardcoded ports (3000, 3001, 3002). Tests either hit the same server (testing wrong code) or fail to connect.

### Q2: Is Docker-based per-worktree isolation technically feasible?

**Answer: YES.** The architecture is straightforward. Each worktree gets its own port range and optionally its own database container.

### Q3: How would ports be allocated to avoid conflicts?

**Answer:** Use a port base formula: `PORT_BASE = 3000 + (worktree_index * 100)`. This gives each worktree 100 ports (e.g., 3100-3199 for worktree 1).

### Q4: How do we isolate database state across parallel test runs?

**Answer:** Options in order of complexity:
1. **Sequential testing** (no isolation needed)
2. **Namespace prefixes** (shared DB, prefixed data)
3. **Separate PostgreSQL containers** (Docker-based)
4. **Full Supabase local** (complete isolation, high overhead)

### Q5: What's the overhead of spinning up Docker environments per worktree?

**Answer:**
- First run: 5-10 minutes for image build
- Subsequent runs: 60-90 seconds for container startup
- Resource: ~2GB RAM per worktree minimum

### Q6: Is the implementation complexity worth the isolation benefit?

**Answer:**
- **For current AI-only development:** Probably not. Sequential E2E is simpler.
- **For scaling to multiple developers:** Yes, the port-per-worktree approach is valuable.
- **For CI/CD:** Docker-based is the right approach.

---

## Appendix C: Files to Modify for Port-per-Worktree

1. `apps/bingo/package.json` - Add PORT support
2. `apps/trivia/package.json` - Already has --port, parameterize
3. `apps/platform-hub/package.json` - Already has --port, parameterize
4. `playwright.config.ts` - Read E2E_PORT_BASE
5. `e2e/fixtures/auth.ts` - Dynamic URL construction
6. `e2e/utils/helpers.ts` - (no changes needed, uses relative URLs)
7. `docs/E2E_TESTING_GUIDE.md` - Document new workflow
8. `.claude/skills/subagent-workflow/SKILL.md` - Update E2E instructions

---

## Appendix D: Immediate Action Items

### To Enable Parallel E2E Today (Quick Fix)

1. **Document the limitation** in `docs/E2E_TESTING_GUIDE.md`:
   ```markdown
   ## CRITICAL: E2E Test Isolation

   E2E tests CANNOT run in parallel across worktrees. All tests share
   the same dev servers on ports 3000, 3001, 3002.

   **Workflow:**
   1. Complete implementation in worktree (unit tests only)
   2. Push branch to remote
   3. Checkout branch in main repo directory
   4. Start dev servers: `pnpm dev:e2e`
   5. Run E2E tests: `pnpm test:e2e`
   6. Kill servers before testing another branch
   ```

2. **Update SKILL.md** to reflect sequential E2E requirement

3. **Add locking mechanism** (optional):
   ```bash
   # In scripts/run-e2e.sh
   LOCKFILE="/tmp/jb-e2e.lock"
   if [ -f "$LOCKFILE" ]; then
     echo "E2E tests already running. Waiting..."
     while [ -f "$LOCKFILE" ]; do sleep 5; done
   fi
   touch "$LOCKFILE"
   trap "rm -f $LOCKFILE" EXIT
   pnpm test:e2e "$@"
   ```

---

*This document represents a thorough analysis of the E2E test isolation challenge. The recommended approach balances implementation complexity with practical benefit for the current AI-agent-only development model.*
