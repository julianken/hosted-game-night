import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSessionToken,
  encodeSessionToken,
  decodeSessionToken,
  isTokenExpired,
  TOKEN_DURATION_MS,
  type SessionToken,
} from '../session-token';

describe('session-token', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createSessionToken', () => {
    it('should create a session token with default duration', () => {
      const token = createSessionToken('session-123', 'ABC123', 'bingo');

      expect(token).toEqual({
        sessionId: 'session-123',
        roomCode: 'ABC123',
        gameType: 'bingo',
        expiresAt: Date.now() + TOKEN_DURATION_MS,
      });
    });

    it('should create a session token with custom duration', () => {
      const customDuration = 60 * 60 * 1000; // 1 hour
      const token = createSessionToken('session-456', 'XYZ789', 'trivia', customDuration);

      expect(token).toEqual({
        sessionId: 'session-456',
        roomCode: 'XYZ789',
        gameType: 'trivia',
        expiresAt: Date.now() + customDuration,
      });
    });

    it('should handle bingo game type', () => {
      const token = createSessionToken('session-1', 'ROOM1', 'bingo');
      expect(token.gameType).toBe('bingo');
    });

    it('should handle trivia game type', () => {
      const token = createSessionToken('session-2', 'ROOM2', 'trivia');
      expect(token.gameType).toBe('trivia');
    });
  });

  describe('encodeSessionToken and decodeSessionToken', () => {
    it('should encode and decode a session token (roundtrip)', () => {
      const originalToken = createSessionToken('session-789', 'DEF456', 'bingo');
      const encoded = encodeSessionToken(originalToken);
      const decoded = decodeSessionToken(encoded);

      expect(decoded).toEqual(originalToken);
    });

    it('should encode to base64url format', () => {
      const token = createSessionToken('session-123', 'ABC123', 'trivia');
      const encoded = encodeSessionToken(token);

      // Base64url should not contain +, /, or = characters
      expect(encoded).not.toMatch(/[+/=]/);
      // Should be a valid base64url string
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should return null for malformed base64url input', () => {
      const decoded = decodeSessionToken('!!!invalid-base64!!!');
      expect(decoded).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const invalidJson = Buffer.from('not valid json').toString('base64url');
      const decoded = decodeSessionToken(invalidJson);
      expect(decoded).toBeNull();
    });

    it('should return null for empty string', () => {
      const decoded = decodeSessionToken('');
      expect(decoded).toBeNull();
    });

    it('should handle special characters in room codes', () => {
      const token = createSessionToken('session-special', 'ROOM-123_ABC', 'bingo');
      const encoded = encodeSessionToken(token);
      const decoded = decodeSessionToken(encoded);

      expect(decoded).toEqual(token);
    });

    it('should handle long session IDs', () => {
      const longSessionId = 'a'.repeat(1000);
      const token = createSessionToken(longSessionId, 'ROOM1', 'trivia');
      const encoded = encodeSessionToken(token);
      const decoded = decodeSessionToken(encoded);

      expect(decoded).toEqual(token);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for non-expired token', () => {
      const token = createSessionToken('session-123', 'ABC123', 'bingo');
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for expired token', () => {
      const token = createSessionToken('session-456', 'XYZ789', 'trivia', 1000);

      // Advance time by 2 seconds (token expires in 1 second)
      vi.advanceTimersByTime(2000);

      expect(isTokenExpired(token)).toBe(true);
    });

    it('should return false for token expiring exactly now', () => {
      const token: SessionToken = {
        sessionId: 'session-exact',
        roomCode: 'EXACT',
        gameType: 'bingo',
        expiresAt: Date.now(),
      };

      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for token that expired 1ms ago', () => {
      const token: SessionToken = {
        sessionId: 'session-past',
        roomCode: 'PAST',
        gameType: 'trivia',
        expiresAt: Date.now() - 1,
      };

      expect(isTokenExpired(token)).toBe(true);
    });

    it('should handle tokens with different durations', () => {
      const shortToken = createSessionToken('short', 'SHORT', 'bingo', 5000); // 5 seconds
      const longToken = createSessionToken('long', 'LONG', 'trivia', 60000); // 60 seconds

      expect(isTokenExpired(shortToken)).toBe(false);
      expect(isTokenExpired(longToken)).toBe(false);

      // Advance by 10 seconds
      vi.advanceTimersByTime(10000);

      expect(isTokenExpired(shortToken)).toBe(true);
      expect(isTokenExpired(longToken)).toBe(false);

      // Advance by another 55 seconds (total 65 seconds)
      vi.advanceTimersByTime(55000);

      expect(isTokenExpired(shortToken)).toBe(true);
      expect(isTokenExpired(longToken)).toBe(true);
    });
  });

  describe('TOKEN_DURATION_MS constant', () => {
    it('should be 24 hours in milliseconds', () => {
      const expectedMs = 24 * 60 * 60 * 1000;
      expect(TOKEN_DURATION_MS).toBe(expectedMs);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete token lifecycle', () => {
      // Create token
      const token = createSessionToken('lifecycle-test', 'LIFE123', 'bingo', 10000);

      // Verify not expired
      expect(isTokenExpired(token)).toBe(false);

      // Encode token
      const encoded = encodeSessionToken(token);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);

      // Decode token
      const decoded = decodeSessionToken(encoded);
      expect(decoded).toEqual(token);
      expect(decoded).not.toBeNull();

      // Verify still not expired
      if (decoded) {
        expect(isTokenExpired(decoded)).toBe(false);
      }

      // Advance time past expiration
      vi.advanceTimersByTime(11000);

      // Verify now expired
      if (decoded) {
        expect(isTokenExpired(decoded)).toBe(true);
      }
    });

    it('should handle multiple tokens with different game types', () => {
      const bingoToken = createSessionToken('bingo-1', 'BINGO1', 'bingo');
      const triviaToken = createSessionToken('trivia-1', 'TRIVIA1', 'trivia');

      const encodedBingo = encodeSessionToken(bingoToken);
      const encodedTrivia = encodeSessionToken(triviaToken);

      const decodedBingo = decodeSessionToken(encodedBingo);
      const decodedTrivia = decodeSessionToken(encodedTrivia);

      expect(decodedBingo?.gameType).toBe('bingo');
      expect(decodedTrivia?.gameType).toBe('trivia');
      expect(decodedBingo).toEqual(bingoToken);
      expect(decodedTrivia).toEqual(triviaToken);
    });
  });
});
