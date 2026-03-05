import { describe, it, expect } from 'vitest';
import { generateSessionId, isValidSessionId, getChannelName } from '../session';

describe('session', () => {
  describe('generateSessionId', () => {
    it('returns a valid UUID v4 string', () => {
      const sessionId = generateSessionId();
      expect(isValidSessionId(sessionId)).toBe(true);
    });

    it('generates unique IDs on each call', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      const id3 = generateSessionId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('returns 36 character string (standard UUID format)', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toHaveLength(36);
    });
  });

  describe('isValidSessionId', () => {
    it('returns true for valid UUID v4 strings', () => {
      expect(isValidSessionId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidSessionId('6ba7b810-9dad-41d4-80b4-00c04fd430c8')).toBe(true);
      expect(isValidSessionId('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    });

    it('returns true for uppercase UUID strings', () => {
      expect(isValidSessionId('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });

    it('returns true for mixed case UUID strings', () => {
      expect(isValidSessionId('550e8400-E29B-41d4-a716-446655440000')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isValidSessionId('')).toBe(false);
    });

    it('returns false for random strings', () => {
      expect(isValidSessionId('not-a-uuid')).toBe(false);
      expect(isValidSessionId('hello-world')).toBe(false);
      expect(isValidSessionId('12345')).toBe(false);
    });

    it('returns false for malformed UUIDs', () => {
      // Too short
      expect(isValidSessionId('550e8400-e29b-41d4-a716')).toBe(false);
      // Wrong format
      expect(isValidSessionId('550e8400e29b41d4a716446655440000')).toBe(false);
      // Wrong version (not v4)
      expect(isValidSessionId('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
      // Wrong variant
      expect(isValidSessionId('550e8400-e29b-41d4-0716-446655440000')).toBe(false);
    });

    it('returns false for offline-style session IDs (no longer valid)', () => {
      expect(isValidSessionId('ABC234')).toBe(false);
      expect(isValidSessionId('TEST12')).toBe(false);
      expect(isValidSessionId('ZYXWVU')).toBe(false);
    });

    it('validates generated session IDs', () => {
      for (let i = 0; i < 100; i++) {
        const sessionId = generateSessionId();
        expect(isValidSessionId(sessionId)).toBe(true);
      }
    });
  });

  describe('getChannelName', () => {
    it('returns prefixed channel name', () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      expect(getChannelName(sessionId)).toBe('jb-bingo-sync-550e8400-e29b-41d4-a716-446655440000');
    });

    it('creates different channel names for different sessions', () => {
      const sessionId1 = generateSessionId();
      const sessionId2 = generateSessionId();

      const channel1 = getChannelName(sessionId1);
      const channel2 = getChannelName(sessionId2);

      expect(channel1).not.toBe(channel2);
    });

    it('always starts with the prefix', () => {
      const sessionId = generateSessionId();
      const channelName = getChannelName(sessionId);
      expect(channelName.startsWith('jb-bingo-sync-')).toBe(true);
    });

    it('includes the full session ID', () => {
      const sessionId = generateSessionId();
      const channelName = getChannelName(sessionId);
      expect(channelName.endsWith(sessionId)).toBe(true);
    });
  });
});
