/**
 * Playwright route handlers for mocking Supabase Auth API in E2E tests.
 *
 * These handlers intercept Supabase Auth API calls at the browser level
 * using Playwright's page.route() API, allowing E2E tests to run without
 * a real Supabase instance.
 *
 * Supported endpoints:
 * - POST /auth/v1/signup - User registration
 * - POST /auth/v1/token?grant_type=password - Email/password login
 * - POST /auth/v1/token?grant_type=refresh_token - Token refresh
 * - GET /auth/v1/user - Get current user
 * - POST /auth/v1/logout - Logout
 * - POST /auth/v1/recover - Password reset request
 */

import type { Page, Route, Request } from '@playwright/test';

// Mock user storage (shared across all pages in a test)
interface MockUser {
  id: string;
  email: string;
  password: string;
  email_confirmed_at: string | null;
  user_metadata: Record<string, unknown>;
  created_at: string;
}

interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  user: MockUser;
}

// In-memory storage for test session
let mockUsers = new Map<string, MockUser>();
let mockSessions = new Map<string, MockSession>();

/**
 * Generate a mock UUID
 */
function generateMockId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a mock JWT-like token
 */
function generateMockToken(): string {
  // Create a realistic-looking token (base64url encoded)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: generateMockId(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: 'authenticated',
      role: 'authenticated',
    })
  ).toString('base64url');
  const signature = Buffer.from('mock-signature-' + Math.random().toString(36)).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

/**
 * Create a full user object for API responses
 */
function createUserResponse(user: MockUser) {
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    email_confirmed_at: user.email_confirmed_at,
    phone: '',
    confirmed_at: user.email_confirmed_at,
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
    user_metadata: user.user_metadata,
    identities: [
      {
        id: user.id,
        user_id: user.id,
        identity_data: {
          email: user.email,
          sub: user.id,
        },
        provider: 'email',
        last_sign_in_at: new Date().toISOString(),
        created_at: user.created_at,
        updated_at: new Date().toISOString(),
      },
    ],
    created_at: user.created_at,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Create a mock session for a user
 */
function createMockSession(user: MockUser): MockSession {
  const accessToken = generateMockToken();
  const refreshToken = generateMockToken();
  const expiresIn = 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  const session: MockSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    expires_at: expiresAt,
    user,
  };

  mockSessions.set(accessToken, session);
  return session;
}

/**
 * Handle POST /auth/v1/signup
 */
async function handleSignup(route: Route, request: Request): Promise<void> {
  const body = request.postDataJSON() as {
    email: string;
    password: string;
    data?: { full_name?: string };
  };
  const { email, password, data } = body;

  // Check if user already exists
  if (mockUsers.has(email)) {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'user_already_exists',
        error_description: 'User already registered',
        message: 'User already registered',
      }),
    });
    return;
  }

  // Create new mock user
  const userId = generateMockId();
  const now = new Date().toISOString();

  // For E2E tests, auto-confirm email so tests can login immediately
  const user: MockUser = {
    id: userId,
    email,
    password,
    email_confirmed_at: now,
    user_metadata: data || {},
    created_at: now,
  };

  mockUsers.set(email, user);

  // Create session
  const session = createMockSession(user);

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      user: createUserResponse(user),
      session: {
        access_token: session.access_token,
        token_type: 'bearer',
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        refresh_token: session.refresh_token,
        user: createUserResponse(user),
      },
    }),
  });
}

/**
 * Handle POST /auth/v1/token
 */
async function handleToken(route: Route, request: Request): Promise<void> {
  const url = new URL(request.url());
  const grantType = url.searchParams.get('grant_type');
  const body = request.postDataJSON();

  if (grantType === 'password') {
    const { email, password } = body as { email: string; password: string };

    // Find user
    const user = mockUsers.get(email);

    if (!user || user.password !== password) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
          message: 'Invalid login credentials',
        }),
      });
      return;
    }

    // Check email confirmation
    if (!user.email_confirmed_at) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'email_not_confirmed',
          error_description: 'Email not confirmed',
          message: 'Email not confirmed',
        }),
      });
      return;
    }

    // Create new session
    const session = createMockSession(user);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: session.access_token,
        token_type: 'bearer',
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        refresh_token: session.refresh_token,
        user: createUserResponse(user),
      }),
    });
    return;
  }

  if (grantType === 'refresh_token') {
    const { refresh_token } = body as { refresh_token: string };

    // Find session by refresh token
    let existingSession: MockSession | null = null;
    for (const session of mockSessions.values()) {
      if (session.refresh_token === refresh_token) {
        existingSession = session;
        break;
      }
    }

    if (!existingSession) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid refresh token',
          message: 'Invalid refresh token',
        }),
      });
      return;
    }

    const user = mockUsers.get(existingSession.user.email);
    if (!user) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'user_not_found',
          error_description: 'User not found',
          message: 'User not found',
        }),
      });
      return;
    }

    // Remove old session
    mockSessions.delete(existingSession.access_token);

    // Create new session
    const newSession = createMockSession(user);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: newSession.access_token,
        token_type: 'bearer',
        expires_in: newSession.expires_in,
        expires_at: newSession.expires_at,
        refresh_token: newSession.refresh_token,
        user: createUserResponse(user),
      }),
    });
    return;
  }

  await route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({
      error: 'unsupported_grant_type',
      error_description: 'Unsupported grant type',
      message: 'Unsupported grant type',
    }),
  });
}

/**
 * Handle GET /auth/v1/user
 */
async function handleGetUser(route: Route, request: Request): Promise<void> {
  const authHeader = request.headers()['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'unauthorized',
        error_description: 'Missing or invalid authorization header',
        message: 'Missing or invalid authorization header',
      }),
    });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  const session = mockSessions.get(token);

  if (!session) {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'unauthorized',
        error_description: 'Invalid token',
        message: 'Invalid token',
      }),
    });
    return;
  }

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(createUserResponse(session.user)),
  });
}

/**
 * Handle POST /auth/v1/logout
 */
async function handleLogout(route: Route, request: Request): Promise<void> {
  const authHeader = request.headers()['authorization'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    mockSessions.delete(token);
  }

  // Supabase logout returns 204 No Content
  await route.fulfill({
    status: 204,
    body: '',
  });
}

/**
 * Handle POST /auth/v1/recover
 */
async function handleRecover(route: Route): Promise<void> {
  // Always return success for security (don't reveal if email exists)
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({}),
  });
}

/**
 * Handle PUT /auth/v1/user (update user)
 */
async function handleUpdateUser(route: Route, request: Request): Promise<void> {
  const authHeader = request.headers()['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'unauthorized',
        error_description: 'Missing or invalid authorization header',
        message: 'Missing or invalid authorization header',
      }),
    });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  const session = mockSessions.get(token);

  if (!session) {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'unauthorized',
        error_description: 'Invalid token',
        message: 'Invalid token',
      }),
    });
    return;
  }

  const body = request.postDataJSON() as {
    password?: string;
    email?: string;
    data?: Record<string, unknown>;
  };

  const user = mockUsers.get(session.user.email);
  if (!user) {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'user_not_found',
        error_description: 'User not found',
        message: 'User not found',
      }),
    });
    return;
  }

  // Update password if provided
  if (body.password) {
    user.password = body.password;
  }

  // Update metadata if provided
  if (body.data) {
    user.user_metadata = { ...user.user_metadata, ...body.data };
  }

  mockUsers.set(user.email, user);

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(createUserResponse(user)),
  });
}

/**
 * Setup Supabase Auth mock routes on a Playwright page.
 *
 * This intercepts all requests to Supabase Auth API endpoints and returns
 * mock responses, allowing E2E tests to run without a real Supabase instance.
 *
 * @param page - Playwright page instance
 *
 * @example
 * ```typescript
 * import { test } from '@playwright/test';
 * import { setupSupabaseAuthMocks } from '../mocks/supabase-auth-handlers';
 *
 * test.beforeEach(async ({ page }) => {
 *   await setupSupabaseAuthMocks(page);
 * });
 * ```
 */
export async function setupSupabaseAuthMocks(page: Page): Promise<void> {
  // Match any Supabase URL (handles placeholder.supabase.co and real URLs)
  const supabasePattern = /https:\/\/[^/]+\.supabase\.co\/auth\/v1\//;

  await page.route(supabasePattern, async (route, request) => {
    const url = request.url();
    const method = request.method();

    // POST /auth/v1/signup
    if (method === 'POST' && url.includes('/auth/v1/signup')) {
      await handleSignup(route, request);
      return;
    }

    // POST /auth/v1/token
    if (method === 'POST' && url.includes('/auth/v1/token')) {
      await handleToken(route, request);
      return;
    }

    // GET /auth/v1/user
    if (method === 'GET' && url.includes('/auth/v1/user')) {
      await handleGetUser(route, request);
      return;
    }

    // POST /auth/v1/logout
    if (method === 'POST' && url.includes('/auth/v1/logout')) {
      await handleLogout(route, request);
      return;
    }

    // POST /auth/v1/recover
    if (method === 'POST' && url.includes('/auth/v1/recover')) {
      await handleRecover(route);
      return;
    }

    // PUT /auth/v1/user
    if (method === 'PUT' && url.includes('/auth/v1/user')) {
      await handleUpdateUser(route, request);
      return;
    }

    // Unhandled auth endpoint - continue to network (will fail with placeholder)
    // This helps identify missing mock handlers
    console.warn(`[Mock] Unhandled Supabase Auth request: ${method} ${url}`);
    await route.continue();
  });
}

/**
 * Reset all mock data (call between tests for isolation)
 */
export function resetMockAuthState(): void {
  mockUsers.clear();
  mockSessions.clear();
}

/**
 * Add a pre-existing mock user (useful for test setup)
 */
export function addMockUser(
  email: string,
  password: string,
  options?: {
    emailConfirmed?: boolean;
    metadata?: Record<string, unknown>;
  }
): void {
  const userId = generateMockId();
  const now = new Date().toISOString();

  mockUsers.set(email, {
    id: userId,
    email,
    password,
    email_confirmed_at: options?.emailConfirmed !== false ? now : null,
    user_metadata: options?.metadata || {},
    created_at: now,
  });
}

/**
 * Check if a user exists in mock storage
 */
export function hasMockUser(email: string): boolean {
  return mockUsers.has(email);
}

/**
 * Get count of active sessions (for debugging)
 */
export function getMockSessionCount(): number {
  return mockSessions.size;
}
