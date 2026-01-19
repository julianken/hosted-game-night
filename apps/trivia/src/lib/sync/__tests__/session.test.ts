import { describe, it, expect, vi } from 'vitest';
import {
  generateSessionId,
  isValidSessionId,
  getChannelName,
} from '../session';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-1234-5678-9abc-def012345678'),
}));

describe('session utilities', () => {
  describe('generateSessionId', () => {
    it('should generate a session ID', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toBe('mock-uuid-1234-5678-9abc-def012345678');
    });
  });

  describe('isValidSessionId', () => {
    it('should return true for valid UUID v4', () => {
      expect(isValidSessionId('550e8400-e29b-41d4-a716-446655440000')).toBe(
        true
      );
      expect(isValidSessionId('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(
        true
      );
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidSessionId('not-a-uuid')).toBe(false);
      expect(isValidSessionId('12345')).toBe(false);
      expect(isValidSessionId('')).toBe(false);
      // Wrong version (not v4)
      expect(isValidSessionId('550e8400-e29b-11d4-a716-446655440000')).toBe(
        false
      );
    });
  });

  describe('getChannelName', () => {
    it('should generate prefixed channel name', () => {
      const channelName = getChannelName('session-123');
      expect(channelName).toBe('beak-trivia-sync-session-123');
    });

    it('should generate different names for different sessions', () => {
      const channel1 = getChannelName('session-1');
      const channel2 = getChannelName('session-2');
      expect(channel1).not.toBe(channel2);
    });
  });
});
