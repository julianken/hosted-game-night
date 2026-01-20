// Use Web Crypto API (available in Node.js)
export async function createPinHash(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomUUID();
  const data = new TextEncoder().encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
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
  const data = new TextEncoder().encode(pin + storedSalt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
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
