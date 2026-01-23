// PBKDF2 configuration
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 256; // bits
const PBKDF2_HASH = 'SHA-256';

// Use Web Crypto API (edge-compatible)
export async function createPinHash(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomUUID();

  // Import the PIN as a key for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive key using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH
  );

  // Convert to hex string
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return { hash, salt };
}

export async function verifyPin(
  pin: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  // Import the PIN as a key for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive key using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(storedSalt),
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH
  );

  // Convert to hex string
  const computedHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedHash === storedHash;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export function isLockedOut(failedAttempts: number, lastFailedAt: Date | null): boolean {
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

  if (failedAttempts < MAX_ATTEMPTS) return false;
  if (!lastFailedAt) return true;
  return Date.now() - lastFailedAt.getTime() < LOCKOUT_DURATION_MS;
}

export const MAX_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
