import { describe, it, expect, afterEach } from 'vitest';
import {
  validateSessionTokenSecret,
  validateEnvironment,
} from '../env-validation';

describe('env-validation', () => {
  // Store original env
  const originalEnv = process.env.SESSION_TOKEN_SECRET;

  afterEach(() => {
    // Restore original env after each test
    if (originalEnv !== undefined) {
      process.env.SESSION_TOKEN_SECRET = originalEnv;
    } else {
      delete process.env.SESSION_TOKEN_SECRET;
    }
  });

  describe('validateSessionTokenSecret', () => {
    it('should pass with valid 64-character hex string', () => {
      // Valid hex string (64 characters)
      process.env.SESSION_TOKEN_SECRET =
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

      expect(() => validateSessionTokenSecret()).not.toThrow();
    });

    it('should pass with uppercase hex characters', () => {
      process.env.SESSION_TOKEN_SECRET =
        'A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2';

      expect(() => validateSessionTokenSecret()).not.toThrow();
    });

    it('should pass with mixed case hex characters', () => {
      process.env.SESSION_TOKEN_SECRET =
        'aAbBcCdDeEfF0123456789aAbBcCdDeEfF0123456789aAbBcCdDeEfF01234567';

      expect(() => validateSessionTokenSecret()).not.toThrow();
    });

    it('should throw if SESSION_TOKEN_SECRET is not set', () => {
      delete process.env.SESSION_TOKEN_SECRET;

      expect(() => validateSessionTokenSecret()).toThrow(
        /SESSION_TOKEN_SECRET environment variable is not set/
      );
    });

    it('should throw if SESSION_TOKEN_SECRET is empty string', () => {
      process.env.SESSION_TOKEN_SECRET = '';

      expect(() => validateSessionTokenSecret()).toThrow(
        /SESSION_TOKEN_SECRET environment variable is not set/
      );
    });

    it('should throw if SESSION_TOKEN_SECRET is only whitespace', () => {
      process.env.SESSION_TOKEN_SECRET = '   ';

      expect(() => validateSessionTokenSecret()).toThrow(
        /SESSION_TOKEN_SECRET environment variable is empty/
      );
    });

    it('should throw if SESSION_TOKEN_SECRET is too short', () => {
      process.env.SESSION_TOKEN_SECRET = 'a1b2c3d4e5f6'; // Only 12 characters

      expect(() => validateSessionTokenSecret()).toThrow(
        /must be exactly 64 characters/
      );
    });

    it('should throw if SESSION_TOKEN_SECRET is too long', () => {
      process.env.SESSION_TOKEN_SECRET =
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2extra'; // 69 characters

      expect(() => validateSessionTokenSecret()).toThrow(
        /must be exactly 64 characters/
      );
    });

    it('should throw if SESSION_TOKEN_SECRET contains non-hex characters', () => {
      // Contains 'g' which is not a valid hex character
      process.env.SESSION_TOKEN_SECRET =
        'g1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

      expect(() => validateSessionTokenSecret()).toThrow(
        /must contain only hexadecimal characters/
      );
    });

    it('should throw if SESSION_TOKEN_SECRET contains spaces', () => {
      process.env.SESSION_TOKEN_SECRET =
        'a1b2c3d4e5f6 1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

      expect(() => validateSessionTokenSecret()).toThrow(
        /must contain only hexadecimal characters/
      );
    });

    it('should throw if SESSION_TOKEN_SECRET contains special characters', () => {
      process.env.SESSION_TOKEN_SECRET =
        'a1b2c3d4e5f6-1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

      expect(() => validateSessionTokenSecret()).toThrow(
        /must contain only hexadecimal characters/
      );
    });

    it('should include generation instructions in error messages', () => {
      delete process.env.SESSION_TOKEN_SECRET;

      expect(() => validateSessionTokenSecret()).toThrow(/openssl rand -hex 32/);
    });

    it('should show current length in length error', () => {
      process.env.SESSION_TOKEN_SECRET = 'abc123'; // 6 characters

      expect(() => validateSessionTokenSecret()).toThrow(/Current length: 6 characters/);
    });
  });

  describe('validateEnvironment', () => {
    it('should pass when all required env vars are valid', () => {
      process.env.SESSION_TOKEN_SECRET =
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should throw when SESSION_TOKEN_SECRET is invalid', () => {
      delete process.env.SESSION_TOKEN_SECRET;

      expect(() => validateEnvironment()).toThrow(
        /SESSION_TOKEN_SECRET environment variable is not set/
      );
    });

    it('should call validateSessionTokenSecret', () => {
      // Set valid secret
      process.env.SESSION_TOKEN_SECRET =
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

      // Should not throw
      expect(() => validateEnvironment()).not.toThrow();

      // Set invalid secret
      process.env.SESSION_TOKEN_SECRET = 'invalid';

      // Should throw
      expect(() => validateEnvironment()).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle exactly 64 characters of zeros', () => {
      process.env.SESSION_TOKEN_SECRET =
        '0000000000000000000000000000000000000000000000000000000000000000';

      expect(() => validateSessionTokenSecret()).not.toThrow();
    });

    it('should handle exactly 64 characters of fs', () => {
      process.env.SESSION_TOKEN_SECRET =
        'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

      expect(() => validateSessionTokenSecret()).not.toThrow();
    });

    it('should handle mixed case hex at boundaries', () => {
      process.env.SESSION_TOKEN_SECRET =
        'FfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFf';

      expect(() => validateSessionTokenSecret()).not.toThrow();
    });

    it('should reject 63 characters', () => {
      process.env.SESSION_TOKEN_SECRET =
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b';

      expect(() => validateSessionTokenSecret()).toThrow(/must be exactly 64 characters/);
    });

    it('should reject 65 characters', () => {
      process.env.SESSION_TOKEN_SECRET =
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2a';

      expect(() => validateSessionTokenSecret()).toThrow(/must be exactly 64 characters/);
    });
  });

  describe('security best practices', () => {
    it('should enforce proper entropy (64 hex chars = 256 bits)', () => {
      // Valid 256-bit secret (64 hex chars)
      process.env.SESSION_TOKEN_SECRET =
        'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

      expect(() => validateSessionTokenSecret()).not.toThrow();
    });

    it('should reject weak secrets (too short)', () => {
      // Weak secret (only 128 bits)
      process.env.SESSION_TOKEN_SECRET = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

      expect(() => validateSessionTokenSecret()).toThrow(/must be exactly 64 characters/);
    });

    it('should provide clear error message with generation command', () => {
      delete process.env.SESSION_TOKEN_SECRET;

      let errorMessage = '';
      try {
        validateSessionTokenSecret();
      } catch (error) {
        errorMessage = (error as Error).message;
      }

      // Error should be helpful and actionable
      expect(errorMessage).toContain('FATAL');
      expect(errorMessage).toContain('openssl rand -hex 32');
      expect(errorMessage).toContain('.env.local');
    });
  });
});
