/**
 * In-memory profile store for E2E testing
 *
 * This provides a simple in-memory storage for profile data during E2E tests,
 * allowing persistence across requests without needing a real database.
 */

interface E2EProfile {
  facility_name: string;
  email: string;
}

// In-memory store (server-side only, persists across requests during dev server lifetime)
const e2eProfileStore = new Map<string, E2EProfile>();

// Default profile for E2E tests
const DEFAULT_E2E_PROFILE: E2EProfile = {
  facility_name: 'E2E Test Facility',
  email: 'e2e-test@beak-gaming.test',
};

export function getE2EProfile(userId: string): E2EProfile {
  if (!e2eProfileStore.has(userId)) {
    e2eProfileStore.set(userId, { ...DEFAULT_E2E_PROFILE });
  }
  return e2eProfileStore.get(userId)!;
}

export function updateE2EProfile(
  userId: string,
  updates: Partial<E2EProfile>
): E2EProfile {
  const current = getE2EProfile(userId);
  const updated = { ...current, ...updates };
  e2eProfileStore.set(userId, updated);
  return updated;
}

export function resetE2EProfile(userId: string): void {
  e2eProfileStore.delete(userId);
}

export function clearAllE2EProfiles(): void {
  e2eProfileStore.clear();
}
