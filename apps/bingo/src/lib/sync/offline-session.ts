/**
 * Offline session utilities
 *
 * Generates short, memorable session IDs for offline play that don't require
 * network connectivity. These IDs are used for:
 * - LocalStorage keys for session persistence
 * - BroadcastChannel names for sync between windows
 * - Display in the UI for user reference
 */

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SESSION_ID_LENGTH = 6;
const SESSION_ID_PATTERN = /^[A-Z0-9]{6}$/;
const STORAGE_KEY_PREFIX = 'bingo_offline_session';

/**
 * Generate a random 6-character alphanumeric session ID for offline play.
 * Format: ABC123 (uppercase letters and digits only)
 *
 * Provides 36^6 = ~2.1 billion possible combinations, which is sufficient
 * for preventing collisions in a single-device, short-lived session context.
 *
 * @returns A 6-character uppercase alphanumeric string
 *
 * @example
 * ```ts
 * const sessionId = generateOfflineSessionId();
 * // => "XYZ789"
 * ```
 */
export function generateOfflineSessionId(): string {
  let result = '';
  for (let i = 0; i < SESSION_ID_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * ALPHANUMERIC.length);
    result += ALPHANUMERIC[randomIndex];
  }
  return result;
}

/**
 * Validate that a session ID matches the expected format.
 *
 * @param sessionId - The session ID to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```ts
 * isValidOfflineSessionId('ABC123') // => true
 * isValidOfflineSessionId('abc123') // => false (lowercase)
 * isValidOfflineSessionId('ABC12')  // => false (too short)
 * ```
 */
export function isValidOfflineSessionId(sessionId: unknown): sessionId is string {
  return typeof sessionId === 'string' && SESSION_ID_PATTERN.test(sessionId);
}

/**
 * Get the localStorage key for storing offline session state.
 *
 * @param sessionId - The offline session ID
 * @returns The localStorage key
 *
 * @example
 * ```ts
 * const key = getOfflineSessionKey('ABC123');
 * // => "bingo_offline_session_ABC123"
 * ```
 */
export function getOfflineSessionKey(sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}_${sessionId}`;
}
