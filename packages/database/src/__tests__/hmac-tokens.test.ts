import { describe, it, expect } from 'vitest';
import { signToken, verifyAndDecodeToken } from '../hmac-tokens';
import { createSessionToken } from '../session-token';

describe('HMAC Token Security', () => {
  const SECRET = 'test-secret-key-minimum-32-characters-long!';
  const ALT_SECRET = 'different-secret-key-also-32-chars!!';

  describe('signToken', () => {
    it('should sign a session token successfully', async () => {
      const token = createSessionToken('sess-123', 'ABC123', 'bingo');
      const signed = await signToken(token, SECRET);

      expect(signed).toBeDefined();
      expect(typeof signed).toBe('string');
      expect(signed.length).toBeGreaterThan(0);
    });

    it('should produce different signatures for different tokens', async () => {
      const token1 = createSessionToken('sess-123', 'ABC123', 'bingo');
      const token2 = createSessionToken('sess-456', 'XYZ789', 'trivia');

      const signed1 = await signToken(token1, SECRET);
      const signed2 = await signToken(token2, SECRET);

      expect(signed1).not.toBe(signed2);
    });

    it('should produce different signatures with different secrets', async () => {
      const token = createSessionToken('sess-123', 'ABC123', 'bingo');

      const signed1 = await signToken(token, SECRET);
      const signed2 = await signToken(token, ALT_SECRET);

      expect(signed1).not.toBe(signed2);
    });

    it('should produce base64url encoded output', async () => {
      const token = createSessionToken('sess-123', 'ABC123', 'bingo');
      const signed = await signToken(token, SECRET);

      // Base64url should only contain A-Z, a-z, 0-9, -, _
      expect(signed).toMatch(/^[A-Za-z0-9_-]+$/);
      // Should not contain +, /, or = (standard base64 chars)
      expect(signed).not.toContain('+');
      expect(signed).not.toContain('/');
      expect(signed).not.toContain('=');
    });

    it('should include payload and signature in format payload.signature', async () => {
      const token = createSessionToken('sess-123', 'ABC123', 'bingo');
      const signed = await signToken(token, SECRET);

      const decoded = Buffer.from(signed, 'base64url').toString('utf-8');
      const parts = decoded.split('.');

      expect(parts).toHaveLength(2);
      expect(parts[0]).toBeDefined(); // payload
      expect(parts[1]).toBeDefined(); // signature
      expect(parts[1].length).toBe(64); // SHA-256 hex signature is 64 chars
    });
  });

  describe('verifyAndDecodeToken', () => {
    it('should verify and decode a valid signed token', async () => {
      const original = createSessionToken('sess-123', 'ABC123', 'bingo');
      const signed = await signToken(original, SECRET);

      const result = await verifyAndDecodeToken(signed, SECRET);

      expect(result).toEqual(original);
    });

    it('should return null for tampered payload', async () => {
      const token = createSessionToken('sess-123', 'ABC123', 'bingo');
      const signed = await signToken(token, SECRET);

      // Tamper with the payload
      const decoded = Buffer.from(signed, 'base64url').toString('utf-8');
      const [payload, signature] = decoded.split('.');
      const tamperedPayload = JSON.parse(payload);
      tamperedPayload.roomCode = 'HACKED';
      const tamperedEncoded = Buffer.from(
        `${JSON.stringify(tamperedPayload)}.${signature}`
      ).toString('base64url');

      const result = await verifyAndDecodeToken(tamperedEncoded, SECRET);

      expect(result).toBeNull();
    });

    it('should return null for tampered signature', async () => {
      const token = createSessionToken('sess-123', 'ABC123', 'bingo');
      const signed = await signToken(token, SECRET);

      // Tamper with the signature
      const decoded = Buffer.from(signed, 'base64url').toString('utf-8');
      const [payload] = decoded.split('.');
      const tamperedSignature = '0'.repeat(64); // Invalid signature
      const tamperedEncoded = Buffer.from(
        `${payload}.${tamperedSignature}`
      ).toString('base64url');

      const result = await verifyAndDecodeToken(tamperedEncoded, SECRET);

      expect(result).toBeNull();
    });

    it('should return null when using wrong secret', async () => {
      const token = createSessionToken('sess-123', 'ABC123', 'bingo');
      const signed = await signToken(token, SECRET);

      const result = await verifyAndDecodeToken(signed, ALT_SECRET);

      expect(result).toBeNull();
    });

    it('should return null for malformed token (not base64url)', async () => {
      const result = await verifyAndDecodeToken('not-a-valid-token!@#', SECRET);

      expect(result).toBeNull();
    });

    it('should return null for token without signature', async () => {
      const token = createSessionToken('sess-123', 'ABC123', 'bingo');
      const payload = JSON.stringify(token);
      const noSignature = Buffer.from(payload).toString('base64url');

      const result = await verifyAndDecodeToken(noSignature, SECRET);

      expect(result).toBeNull();
    });

    it('should return null for token with invalid JSON payload', async () => {
      const invalidPayload = 'not-json-data';
      const signature = '0'.repeat(64);
      const encoded = Buffer.from(`${invalidPayload}.${signature}`).toString('base64url');

      const result = await verifyAndDecodeToken(encoded, SECRET);

      expect(result).toBeNull();
    });

    it('should return null for empty string', async () => {
      const result = await verifyAndDecodeToken('', SECRET);

      expect(result).toBeNull();
    });

    it('should return null for token with non-hex signature', async () => {
      const token = createSessionToken('sess-123', 'ABC123', 'bingo');
      const payload = JSON.stringify(token);
      const invalidSignature = 'zzzzzzzz'; // Not hex
      const encoded = Buffer.from(`${payload}.${invalidSignature}`).toString('base64url');

      const result = await verifyAndDecodeToken(encoded, SECRET);

      expect(result).toBeNull();
    });
  });

  describe('End-to-end security scenarios', () => {
    it('should prevent session ID tampering', async () => {
      const token = createSessionToken('sess-user-123', 'ABC123', 'bingo');
      const signed = await signToken(token, SECRET);

      // Attacker tries to change session ID to another user
      const decoded = Buffer.from(signed, 'base64url').toString('utf-8');
      const [payload, signature] = decoded.split('.');
      const tamperedPayload = JSON.parse(payload);
      tamperedPayload.sessionId = 'sess-admin-999'; // Privilege escalation attempt
      const tamperedEncoded = Buffer.from(
        `${JSON.stringify(tamperedPayload)}.${signature}`
      ).toString('base64url');

      const result = await verifyAndDecodeToken(tamperedEncoded, SECRET);

      expect(result).toBeNull();
    });

    it('should prevent expiration extension', async () => {
      const token = createSessionToken('sess-123', 'ABC123', 'bingo', 1000); // 1 second
      const signed = await signToken(token, SECRET);

      // Attacker tries to extend expiration
      const decoded = Buffer.from(signed, 'base64url').toString('utf-8');
      const [payload, signature] = decoded.split('.');
      const tamperedPayload = JSON.parse(payload);
      tamperedPayload.expiresAt = Date.now() + 1000 * 60 * 60 * 24; // 24 hours
      const tamperedEncoded = Buffer.from(
        `${JSON.stringify(tamperedPayload)}.${signature}`
      ).toString('base64url');

      const result = await verifyAndDecodeToken(tamperedEncoded, SECRET);

      expect(result).toBeNull();
    });

    it('should prevent room code tampering', async () => {
      const token = createSessionToken('sess-123', 'ABC123', 'bingo');
      const signed = await signToken(token, SECRET);

      // Attacker tries to access different room
      const decoded = Buffer.from(signed, 'base64url').toString('utf-8');
      const [payload, signature] = decoded.split('.');
      const tamperedPayload = JSON.parse(payload);
      tamperedPayload.roomCode = 'XYZ999'; // Different room
      const tamperedEncoded = Buffer.from(
        `${JSON.stringify(tamperedPayload)}.${signature}`
      ).toString('base64url');

      const result = await verifyAndDecodeToken(tamperedEncoded, SECRET);

      expect(result).toBeNull();
    });

    it('should prevent game type switching', async () => {
      const token = createSessionToken('sess-123', 'ABC123', 'bingo');
      const signed = await signToken(token, SECRET);

      // Attacker tries to switch game type
      const decoded = Buffer.from(signed, 'base64url').toString('utf-8');
      const [payload, signature] = decoded.split('.');
      const tamperedPayload = JSON.parse(payload);
      tamperedPayload.gameType = 'trivia'; // Switch game type
      const tamperedEncoded = Buffer.from(
        `${JSON.stringify(tamperedPayload)}.${signature}`
      ).toString('base64url');

      const result = await verifyAndDecodeToken(tamperedEncoded, SECRET);

      expect(result).toBeNull();
    });

    it('should work with different token contents', async () => {
      const tokens = [
        createSessionToken('sess-1', 'A', 'bingo'),
        createSessionToken('sess-2', 'BB', 'trivia'),
        createSessionToken('sess-3', 'CCC', 'bingo', 5000),
        createSessionToken('very-long-session-id-' + 'x'.repeat(100), 'DDDDD', 'trivia'),
      ];

      for (const token of tokens) {
        const signed = await signToken(token, SECRET);
        const result = await verifyAndDecodeToken(signed, SECRET);
        expect(result).toEqual(token);
      }
    });
  });

  describe('Timing-safe verification', () => {
    it('should take similar time for valid and invalid signatures', async () => {
      const token = createSessionToken('sess-123', 'ABC123', 'bingo');
      const validSigned = await signToken(token, SECRET);

      // Create invalid token with same structure
      const decoded = Buffer.from(validSigned, 'base64url').toString('utf-8');
      const [payload] = decoded.split('.');
      const invalidSignature = '0'.repeat(64);
      const invalidSigned = Buffer.from(`${payload}.${invalidSignature}`).toString('base64url');

      // Both should complete without throwing
      const validResult = await verifyAndDecodeToken(validSigned, SECRET);
      const invalidResult = await verifyAndDecodeToken(invalidSigned, SECRET);

      expect(validResult).not.toBeNull();
      expect(invalidResult).toBeNull();
    });
  });
});
