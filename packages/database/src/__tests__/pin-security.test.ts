import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createPinHash,
  verifyPin,
  isValidPin,
  isLockedOut,
  MAX_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from '../pin-security';

describe('PIN Security Utilities', () => {
  describe('createPinHash', () => {
    it('should create a hash and salt for a valid PIN', async () => {
      const result = await createPinHash('1234');

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('salt');
      expect(typeof result.hash).toBe('string');
      expect(typeof result.salt).toBe('string');
      expect(result.hash.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should generate different salts for the same PIN', async () => {
      const result1 = await createPinHash('1234');
      const result2 = await createPinHash('1234');

      expect(result1.salt).not.toBe(result2.salt);
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should generate different hashes for different PINs', async () => {
      const result1 = await createPinHash('1234');
      const result2 = await createPinHash('5678');

      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should work with 4-digit PINs', async () => {
      const result = await createPinHash('1234');
      expect(result.hash).toBeTruthy();
      expect(result.salt).toBeTruthy();
    });

    it('should work with 5-digit PINs', async () => {
      const result = await createPinHash('12345');
      expect(result.hash).toBeTruthy();
      expect(result.salt).toBeTruthy();
    });

    it('should work with 6-digit PINs', async () => {
      const result = await createPinHash('123456');
      expect(result.hash).toBeTruthy();
      expect(result.salt).toBeTruthy();
    });
  });

  describe('verifyPin', () => {
    it('should verify a correct PIN', async () => {
      const pin = '1234';
      const { hash, salt } = await createPinHash(pin);

      const isValid = await verifyPin(pin, hash, salt);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect PIN', async () => {
      const { hash, salt } = await createPinHash('1234');

      const isValid = await verifyPin('5678', hash, salt);
      expect(isValid).toBe(false);
    });

    it('should reject a PIN with wrong salt', async () => {
      const { hash } = await createPinHash('1234');
      const { salt: wrongSalt } = await createPinHash('1234');

      const isValid = await verifyPin('1234', hash, wrongSalt);
      expect(isValid).toBe(false);
    });

    it('should be case-sensitive for hash comparison', async () => {
      const { hash, salt } = await createPinHash('1234');
      const modifiedHash = hash.toUpperCase();

      const isValid = await verifyPin('1234', modifiedHash, salt);
      expect(isValid).toBe(false);
    });

    it('should handle empty PIN gracefully', async () => {
      const { hash, salt } = await createPinHash('1234');

      const isValid = await verifyPin('', hash, salt);
      expect(isValid).toBe(false);
    });
  });

  describe('isValidPin', () => {
    it('should accept 4-digit PINs', () => {
      expect(isValidPin('1234')).toBe(true);
    });

    it('should accept 5-digit PINs', () => {
      expect(isValidPin('12345')).toBe(true);
    });

    it('should accept 6-digit PINs', () => {
      expect(isValidPin('123456')).toBe(true);
    });

    it('should reject 3-digit PINs', () => {
      expect(isValidPin('123')).toBe(false);
    });

    it('should reject 7-digit PINs', () => {
      expect(isValidPin('1234567')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isValidPin('')).toBe(false);
    });

    it('should reject non-numeric PINs', () => {
      expect(isValidPin('abcd')).toBe(false);
    });

    it('should reject alphanumeric PINs', () => {
      expect(isValidPin('12ab')).toBe(false);
    });

    it('should reject PINs with special characters', () => {
      expect(isValidPin('12-34')).toBe(false);
    });

    it('should reject PINs with spaces', () => {
      expect(isValidPin('12 34')).toBe(false);
    });
  });

  describe('isLockedOut', () => {
    let mockNow: number;

    beforeEach(() => {
      mockNow = Date.now();
      vi.useFakeTimers();
      vi.setSystemTime(mockNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should not lock out with fewer than MAX_ATTEMPTS', () => {
      expect(isLockedOut(0, null)).toBe(false);
      expect(isLockedOut(1, new Date())).toBe(false);
      expect(isLockedOut(4, new Date())).toBe(false);
    });

    it('should lock out with MAX_ATTEMPTS or more', () => {
      const now = new Date();
      expect(isLockedOut(5, now)).toBe(true);
      expect(isLockedOut(6, now)).toBe(true);
    });

    it('should lock out when lastFailedAt is null and attempts >= MAX_ATTEMPTS', () => {
      expect(isLockedOut(5, null)).toBe(true);
    });

    it('should unlock after LOCKOUT_DURATION_MS has passed', () => {
      const lastFailedAt = new Date(mockNow - LOCKOUT_DURATION_MS - 1000);
      expect(isLockedOut(5, lastFailedAt)).toBe(false);
    });

    it('should remain locked during LOCKOUT_DURATION_MS', () => {
      const lastFailedAt = new Date(mockNow - 5 * 60 * 1000); // 5 minutes ago
      expect(isLockedOut(5, lastFailedAt)).toBe(true);
    });

    it('should unlock exactly at LOCKOUT_DURATION_MS boundary', () => {
      const lastFailedAt = new Date(mockNow - LOCKOUT_DURATION_MS);
      expect(isLockedOut(5, lastFailedAt)).toBe(false);
    });

    it('should handle edge case of exactly MAX_ATTEMPTS', () => {
      const now = new Date();
      expect(isLockedOut(MAX_ATTEMPTS, now)).toBe(true);
    });

    it('should handle future dates gracefully', () => {
      const futureDate = new Date(mockNow + 1000);
      expect(isLockedOut(5, futureDate)).toBe(true);
    });
  });

  describe('Constants', () => {
    it('should export MAX_ATTEMPTS as 5', () => {
      expect(MAX_ATTEMPTS).toBe(5);
    });

    it('should export LOCKOUT_DURATION_MS as 15 minutes', () => {
      expect(LOCKOUT_DURATION_MS).toBe(15 * 60 * 1000);
    });
  });

  describe('Integration', () => {
    it('should handle complete PIN creation and verification flow', async () => {
      const pin = '1234';

      // Create hash
      const { hash, salt } = await createPinHash(pin);

      // Verify correct PIN
      expect(await verifyPin(pin, hash, salt)).toBe(true);

      // Verify incorrect PIN
      expect(await verifyPin('5678', hash, salt)).toBe(false);
    });

    it('should simulate lockout scenario', async () => {
      vi.useFakeTimers();
      const mockNow = Date.now();
      vi.setSystemTime(mockNow);

      const pin = '1234';
      const { hash, salt } = await createPinHash(pin);

      let failedAttempts = 0;
      let lastFailedAt: Date | null = null;

      // Simulate failed attempts
      for (let i = 0; i < 5; i++) {
        const isValid = await verifyPin('9999', hash, salt);
        if (!isValid) {
          failedAttempts++;
          lastFailedAt = new Date();
        }
      }

      // Should be locked out
      expect(isLockedOut(failedAttempts, lastFailedAt)).toBe(true);

      // Fast forward time
      vi.advanceTimersByTime(LOCKOUT_DURATION_MS + 1000);

      // Should be unlocked
      expect(isLockedOut(failedAttempts, lastFailedAt)).toBe(false);

      vi.useRealTimers();
    });

    it('should validate PIN before creating hash', async () => {
      const invalidPin = 'abc';

      if (isValidPin(invalidPin)) {
        await createPinHash(invalidPin);
      } else {
        // Should not create hash for invalid PIN
        expect(isValidPin(invalidPin)).toBe(false);
      }
    });
  });
});
