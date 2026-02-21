/**
 * E2E Testing In-Memory Storage for OAuth
 *
 * This module provides in-memory storage for OAuth data during E2E tests.
 * Used when Supabase database isn't available or when foreign key constraints
 * prevent storing E2E test user data.
 *
 * WARNING: This is NOT for production use. Data is lost on server restart.
 */

// E2E Testing constants (must match across all OAuth endpoints)
export const E2E_TEST_EMAIL = 'e2e-test@joolie-boolie.test';
export const E2E_TEST_USER_ID = '00000000-0000-4000-a000-000000000e2e';

// E2E Mock OAuth clients (matches migration data)
// Includes localhost (dev), Vercel preview (staging), and custom domain (production) URLs
export const E2E_MOCK_CLIENTS: Record<string, { id: string; name: string; redirect_uris: string[]; is_first_party: boolean }> = {
  '0d87a03a-d90a-4ccc-a46b-85fdd8d53c21': {
    id: '0d87a03a-d90a-4ccc-a46b-85fdd8d53c21',
    name: 'Bingo',
    redirect_uris: [
      'http://localhost:3000/auth/callback',
      'https://bingo.joolie-boolie.com/auth/callback',
    ],
    is_first_party: true,
  },
  '0cd92ba6-459b-4c07-ab9d-b9bf9dbb1936': {
    id: '0cd92ba6-459b-4c07-ab9d-b9bf9dbb1936',
    name: 'Trivia',
    redirect_uris: [
      'http://localhost:3001/auth/callback',
      'https://trivia.joolie-boolie.com/auth/callback',
    ],
    is_first_party: true,
  },
};

// E2E Authorization interface
export interface E2EAuthorization {
  id: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  scope: string;
  state: string;
  code_challenge: string;
  code_challenge_method: string;
  code?: string;
  code_expires_at?: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  created_at: string;
  expires_at: string;
}

// Global in-memory store for E2E authorizations
// This allows the OAuth flow to work in E2E tests without database
const e2eAuthorizationStore = new Map<string, E2EAuthorization>();

// Clean up expired E2E authorizations
export function cleanupE2EAuthorizations(): void {
  const now = new Date().toISOString();
  for (const [id, auth] of e2eAuthorizationStore) {
    if (auth.expires_at < now) {
      e2eAuthorizationStore.delete(id);
    }
  }
}

// Get an E2E authorization by ID
export function getE2EAuthorization(id: string): E2EAuthorization | undefined {
  cleanupE2EAuthorizations();
  return e2eAuthorizationStore.get(id);
}

// Get an E2E authorization by code
export function getE2EAuthorizationByCode(code: string): E2EAuthorization | undefined {
  cleanupE2EAuthorizations();
  for (const auth of e2eAuthorizationStore.values()) {
    if (auth.code === code && auth.status === 'approved') {
      return auth;
    }
  }
  return undefined;
}

// Create a new E2E authorization
export function createE2EAuthorization(auth: E2EAuthorization): void {
  cleanupE2EAuthorizations();
  e2eAuthorizationStore.set(auth.id, auth);
}

// Update an E2E authorization
export function updateE2EAuthorization(id: string, updates: Partial<E2EAuthorization>): boolean {
  const auth = e2eAuthorizationStore.get(id);
  if (!auth) return false;

  e2eAuthorizationStore.set(id, { ...auth, ...updates });
  return true;
}

// Delete an E2E authorization
export function deleteE2EAuthorization(id: string): boolean {
  return e2eAuthorizationStore.delete(id);
}

/**
 * Check if running in E2E mode
 * Returns true only if E2E_TESTING is explicitly set to 'true'
 */
export function isE2EMode(): boolean {
  return process.env.E2E_TESTING === 'true';
}

/**
 * Check if a user ID is the E2E test user
 */
export function isE2ETestUser(userId: string): boolean {
  return userId === E2E_TEST_USER_ID;
}

/**
 * Get E2E client by ID
 */
export function getE2EClient(clientId: string): { id: string; name: string; redirect_uris: string[]; is_first_party: boolean } | undefined {
  return E2E_MOCK_CLIENTS[clientId];
}
