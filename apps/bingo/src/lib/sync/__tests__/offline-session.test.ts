import { describe, it, expect } from 'vitest';
import { generateOfflineSessionId, isValidOfflineSessionId, getOfflineSessionKey } from '../offline-session';

describe('offline-session', () => {
  describe('generateOfflineSessionId', () => {
    it('generates a 6-character session ID', () => {
      const sessionId = generateOfflineSessionId();
      expect(sessionId).toHaveLength(6);
    });

    it('generates alphanumeric characters only', () => {
      const sessionId = generateOfflineSessionId();
      expect(sessionId).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('generates unique IDs', () => {
      const id1 = generateOfflineSessionId();
      const id2 = generateOfflineSessionId();
      const id3 = generateOfflineSessionId();

      // With 36^6 possibilities, collisions should be extremely rare
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('generates multiple unique IDs in bulk', () => {
      const ids = new Set<string>();
      const count = 100;

      for (let i = 0; i < count; i++) {
        ids.add(generateOfflineSessionId());
      }

      // All IDs should be unique
      expect(ids.size).toBe(count);
    });
  });

  describe('isValidOfflineSessionId', () => {
    it('validates correct 6-character alphanumeric IDs', () => {
      expect(isValidOfflineSessionId('ABC123')).toBe(true);
      expect(isValidOfflineSessionId('XYZ789')).toBe(true);
      expect(isValidOfflineSessionId('000000')).toBe(true);
      expect(isValidOfflineSessionId('ZZZZZZ')).toBe(true);
    });

    it('rejects IDs with wrong length', () => {
      expect(isValidOfflineSessionId('')).toBe(false);
      expect(isValidOfflineSessionId('ABC12')).toBe(false);
      expect(isValidOfflineSessionId('ABC1234')).toBe(false);
      expect(isValidOfflineSessionId('A')).toBe(false);
    });

    it('rejects IDs with invalid characters', () => {
      expect(isValidOfflineSessionId('abc123')).toBe(false); // lowercase
      expect(isValidOfflineSessionId('ABC-23')).toBe(false); // hyphen
      expect(isValidOfflineSessionId('ABC 23')).toBe(false); // space
      expect(isValidOfflineSessionId('ABC@23')).toBe(false); // special char
    });

    it('rejects non-string values', () => {
      expect(isValidOfflineSessionId(null as unknown as string)).toBe(false);
      expect(isValidOfflineSessionId(undefined as unknown as string)).toBe(false);
      expect(isValidOfflineSessionId(123456 as unknown as string)).toBe(false);
      expect(isValidOfflineSessionId({} as unknown as string)).toBe(false);
    });
  });

  describe('getOfflineSessionKey', () => {
    it('returns localStorage key for offline session', () => {
      const key = getOfflineSessionKey('ABC123');
      expect(key).toBe('bingo_offline_session_ABC123');
    });

    it('uses session ID in key', () => {
      const key1 = getOfflineSessionKey('XYZ789');
      const key2 = getOfflineSessionKey('ABC123');

      expect(key1).toContain('XYZ789');
      expect(key2).toContain('ABC123');
      expect(key1).not.toBe(key2);
    });
  });
});
