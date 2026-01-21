/**
 * Secure generation utilities for PINs and session IDs
 *
 * This module provides cryptographically secure random generation for:
 * - 4-digit PINs for room access
 * - 6-character session IDs for offline mode
 *
 * All randomness uses crypto.getRandomValues for security.
 * @module secure-generation
 */

/**
 * Characters allowed in session IDs.
 * Excludes ambiguous characters: 0, O, 1, I
 */
const SESSION_ID_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * localStorage key for storing the room PIN
 */
const STORAGE_KEY_PIN = 'bingo_pin';

/**
 * localStorage key for storing the offline session ID
 */
const STORAGE_KEY_OFFLINE_SESSION_ID = 'bingo_offline_session_id';

/**
 * Generates a cryptographically secure 4-digit PIN.
 *
 * Uses crypto.getRandomValues to ensure unpredictability.
 * The PIN is guaranteed to be in the range 1000-9999.
 *
 * @returns A 4-digit PIN as a string (e.g., "1234", "5678")
 *
 * @example
 * ```typescript
 * const pin = generateSecurePin();
 * console.log(pin); // "4729"
 * ```
 */
export function generateSecurePin(): string {
  // Use a Uint32Array to get a random 32-bit unsigned integer
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);

  // Map the random value to the range 1000-9999
  // There are 9000 possible values (9999 - 1000 + 1)
  const pin = 1000 + (randomValues[0] % 9000);

  return pin.toString();
}

/**
 * Generates a cryptographically secure 6-character session ID.
 *
 * Uses crypto.getRandomValues to ensure unpredictability.
 * The session ID contains only uppercase letters and digits,
 * excluding ambiguous characters (0, O, 1, I) for easier reading.
 *
 * Character set: 2-9, A-Z (excluding O and I)
 * Total possibilities: 32^6 = 1,073,741,824
 *
 * @returns A 6-character session ID (e.g., "A3B7K9", "Q2W4E5")
 *
 * @example
 * ```typescript
 * const sessionId = generateShortSessionId();
 * console.log(sessionId); // "K3M7N9"
 * ```
 */
export function generateShortSessionId(): string {
  // Generate 6 random values
  const randomValues = new Uint32Array(6);
  crypto.getRandomValues(randomValues);

  // Map each random value to a character in our allowed set
  let sessionId = '';
  for (let i = 0; i < 6; i++) {
    const index = randomValues[i] % SESSION_ID_CHARS.length;
    sessionId += SESSION_ID_CHARS[index];
  }

  return sessionId;
}

/**
 * Stores a PIN in localStorage for later retrieval.
 *
 * This allows the PIN to persist across page refreshes,
 * which is useful for maintaining room access during a session.
 *
 * @param pin - The 4-digit PIN to store
 *
 * @example
 * ```typescript
 * const pin = generateSecurePin();
 * storePin(pin);
 * ```
 */
export function storePin(pin: string): void {
  localStorage.setItem(STORAGE_KEY_PIN, pin);
}

/**
 * Retrieves a previously stored PIN from localStorage.
 *
 * @returns The stored PIN, or null if no PIN is stored
 *
 * @example
 * ```typescript
 * const pin = getStoredPin();
 * if (pin) {
 *   console.log('Stored PIN:', pin);
 * } else {
 *   console.log('No PIN stored');
 * }
 * ```
 */
export function getStoredPin(): string | null {
  return localStorage.getItem(STORAGE_KEY_PIN);
}

/**
 * Clears the stored PIN from localStorage.
 *
 * This should be called when leaving a room or logging out
 * to ensure the PIN is not accessible later.
 *
 * @example
 * ```typescript
 * clearStoredPin();
 * ```
 */
export function clearStoredPin(): void {
  localStorage.removeItem(STORAGE_KEY_PIN);
}

/**
 * Stores an offline session ID in localStorage for later retrieval.
 *
 * This allows the offline session ID to persist across page refreshes,
 * which is useful for maintaining session continuity in offline mode.
 *
 * @param id - The 6-character session ID to store
 *
 * @example
 * ```typescript
 * const sessionId = generateShortSessionId();
 * storeOfflineSessionId(sessionId);
 * ```
 */
export function storeOfflineSessionId(id: string): void {
  localStorage.setItem(STORAGE_KEY_OFFLINE_SESSION_ID, id);
}

/**
 * Retrieves a previously stored offline session ID from localStorage.
 *
 * @returns The stored offline session ID, or null if no ID is stored
 *
 * @example
 * ```typescript
 * const sessionId = getStoredOfflineSessionId();
 * if (sessionId) {
 *   console.log('Stored session ID:', sessionId);
 * } else {
 *   console.log('No session ID stored');
 * }
 * ```
 */
export function getStoredOfflineSessionId(): string | null {
  return localStorage.getItem(STORAGE_KEY_OFFLINE_SESSION_ID);
}

/**
 * Clears the stored offline session ID from localStorage.
 *
 * This should be called when exiting offline mode or starting a new session
 * to ensure old session data is not reused.
 *
 * @example
 * ```typescript
 * clearStoredOfflineSessionId();
 * ```
 */
export function clearStoredOfflineSessionId(): void {
  localStorage.removeItem(STORAGE_KEY_OFFLINE_SESSION_ID);
}
