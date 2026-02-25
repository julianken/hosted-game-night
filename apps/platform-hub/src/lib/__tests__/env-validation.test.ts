import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  validateSessionTokenSecret,
  validateEnvironment,
  validateSupabaseConfig,
  validateJwtSecret,
  validateE2eConfig,
  warnIfMissingCookieDomain,
} from '../env-validation';

// Valid test values
const VALID_HEX_SECRET =
  'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
const VALID_SUPABASE_URL = 'https://myproject.supabase.co';
const VALID_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key';
const VALID_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key';
const VALID_JWT_SECRET = 'super-secret-jwt-value';

/**
 * Sets all required environment variables to valid values.
 * Individual tests can then delete/modify the one they are testing.
 */
function setAllValidEnv(): void {
  process.env.SESSION_TOKEN_SECRET = VALID_HEX_SECRET;
  process.env.NEXT_PUBLIC_SUPABASE_URL = VALID_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE_ROLE_KEY;
  process.env.SUPABASE_JWT_SECRET = VALID_JWT_SECRET;
}

/**
 * Cleans up all environment variables touched by tests.
 */
function clearAllEnv(): void {
  delete process.env.SESSION_TOKEN_SECRET;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_JWT_SECRET;
  delete process.env.E2E_TESTING;
  delete process.env.E2E_JWT_SECRET;
  delete process.env.COOKIE_DOMAIN;
  delete process.env.VERCEL;
  // NODE_ENV is typed as read-only, use type assertion for test cleanup
  delete (process.env as Record<string, string | undefined>).NODE_ENV;
}

describe('env-validation', () => {
  afterEach(() => {
    clearAllEnv();
  });

  describe('validateSessionTokenSecret', () => {
    it('should pass with valid 64-character hex string', () => {
      process.env.SESSION_TOKEN_SECRET = VALID_HEX_SECRET;

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

  describe('validateSupabaseConfig', () => {
    it('should pass with valid Supabase config', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = VALID_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE_ROLE_KEY;

      expect(() => validateSupabaseConfig()).not.toThrow();
    });

    it('should throw if NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE_ROLE_KEY;

      expect(() => validateSupabaseConfig()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL/
      );
    });

    it('should throw if NEXT_PUBLIC_SUPABASE_URL is not a valid URL', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-url';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE_ROLE_KEY;

      expect(() => validateSupabaseConfig()).toThrow(
        /NEXT_PUBLIC_SUPABASE_URL must be a valid URL starting with http:\/\/ or https:\/\//
      );
    });

    it('should accept http:// URLs for local development', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE_ROLE_KEY;

      expect(() => validateSupabaseConfig()).not.toThrow();
    });

    it('should throw if NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = VALID_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE_ROLE_KEY;

      expect(() => validateSupabaseConfig()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY/
      );
    });

    it('should throw if NEXT_PUBLIC_SUPABASE_ANON_KEY is empty', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = VALID_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';
      process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE_ROLE_KEY;

      expect(() => validateSupabaseConfig()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY/
      );
    });

    it('should throw if SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = VALID_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => validateSupabaseConfig()).toThrow(
        /Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY/
      );
    });

    it('should throw if SUPABASE_SERVICE_ROLE_KEY is whitespace-only', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = VALID_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = '   ';

      expect(() => validateSupabaseConfig()).toThrow(
        /Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY/
      );
    });

    it('should include .env.local hint in error messages', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => validateSupabaseConfig()).toThrow(/\.env\.local/);
    });
  });

  describe('validateJwtSecret', () => {
    it('should pass with valid JWT secret', () => {
      process.env.SUPABASE_JWT_SECRET = VALID_JWT_SECRET;

      expect(() => validateJwtSecret()).not.toThrow();
    });

    it('should throw if SUPABASE_JWT_SECRET is missing', () => {
      delete process.env.SUPABASE_JWT_SECRET;

      expect(() => validateJwtSecret()).toThrow(
        /Missing required environment variable: SUPABASE_JWT_SECRET/
      );
    });

    it('should throw if SUPABASE_JWT_SECRET is empty', () => {
      process.env.SUPABASE_JWT_SECRET = '';

      expect(() => validateJwtSecret()).toThrow(
        /Missing required environment variable: SUPABASE_JWT_SECRET/
      );
    });

    it('should throw if SUPABASE_JWT_SECRET is whitespace-only', () => {
      process.env.SUPABASE_JWT_SECRET = '   ';

      expect(() => validateJwtSecret()).toThrow(
        /Missing required environment variable: SUPABASE_JWT_SECRET/
      );
    });
  });

  describe('validateE2eConfig', () => {
    it('should not throw when E2E_TESTING is not set', () => {
      delete process.env.E2E_TESTING;

      expect(() => validateE2eConfig()).not.toThrow();
    });

    it('should not throw when E2E_TESTING is false', () => {
      process.env.E2E_TESTING = 'false';

      expect(() => validateE2eConfig()).not.toThrow();
    });

    it('should not throw when E2E_TESTING is true and E2E_JWT_SECRET is set', () => {
      process.env.E2E_TESTING = 'true';
      process.env.E2E_JWT_SECRET = 'test-e2e-secret';

      expect(() => validateE2eConfig()).not.toThrow();
    });

    it('should throw when E2E_TESTING is true and E2E_JWT_SECRET is missing', () => {
      process.env.E2E_TESTING = 'true';
      delete process.env.E2E_JWT_SECRET;

      expect(() => validateE2eConfig()).toThrow(
        /Missing required environment variable: E2E_JWT_SECRET/
      );
    });

    it('should throw when E2E_TESTING is true and E2E_JWT_SECRET is empty', () => {
      process.env.E2E_TESTING = 'true';
      process.env.E2E_JWT_SECRET = '';

      expect(() => validateE2eConfig()).toThrow(
        /Missing required environment variable: E2E_JWT_SECRET/
      );
    });
  });

  describe('validateEnvironment', () => {
    it('should pass when all required env vars are valid', () => {
      setAllValidEnv();

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should throw when SESSION_TOKEN_SECRET is missing', () => {
      setAllValidEnv();
      delete process.env.SESSION_TOKEN_SECRET;

      expect(() => validateEnvironment()).toThrow(
        /SESSION_TOKEN_SECRET environment variable is not set/
      );
    });

    it('should throw when SESSION_TOKEN_SECRET is invalid', () => {
      setAllValidEnv();
      process.env.SESSION_TOKEN_SECRET = 'invalid';

      expect(() => validateEnvironment()).toThrow();
    });

    it('should throw when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      setAllValidEnv();
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => validateEnvironment()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL/
      );
    });

    it('should throw when NEXT_PUBLIC_SUPABASE_URL is not a URL', () => {
      setAllValidEnv();
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-url';

      expect(() => validateEnvironment()).toThrow(
        /must be a valid URL/
      );
    });

    it('should throw when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
      setAllValidEnv();
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      expect(() => validateEnvironment()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY/
      );
    });

    it('should throw when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      setAllValidEnv();
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => validateEnvironment()).toThrow(
        /Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY/
      );
    });

    it('should throw when SUPABASE_JWT_SECRET is missing', () => {
      setAllValidEnv();
      delete process.env.SUPABASE_JWT_SECRET;

      expect(() => validateEnvironment()).toThrow(
        /Missing required environment variable: SUPABASE_JWT_SECRET/
      );
    });

    it('should throw when E2E_TESTING is true and E2E_JWT_SECRET is missing', () => {
      setAllValidEnv();
      process.env.E2E_TESTING = 'true';
      delete process.env.E2E_JWT_SECRET;

      expect(() => validateEnvironment()).toThrow(
        /Missing required environment variable: E2E_JWT_SECRET/
      );
    });

    it('should pass when E2E_TESTING is true and E2E_JWT_SECRET is set', () => {
      setAllValidEnv();
      process.env.E2E_TESTING = 'true';
      process.env.E2E_JWT_SECRET = 'test-e2e-secret';

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should pass when E2E_TESTING is not set (no E2E_JWT_SECRET required)', () => {
      setAllValidEnv();
      delete process.env.E2E_TESTING;
      delete process.env.E2E_JWT_SECRET;

      expect(() => validateEnvironment()).not.toThrow();
    });
  });

  describe('warnIfMissingCookieDomain', () => {
    it('does not warn in development', () => {
      delete process.env.VERCEL;
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
      delete process.env.COOKIE_DOMAIN;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      warnIfMissingCookieDomain();

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns when COOKIE_DOMAIN is missing on Vercel', () => {
      process.env.VERCEL = '1';
      delete process.env.COOKIE_DOMAIN;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      warnIfMissingCookieDomain();

      expect(warnSpy).toHaveBeenCalledWith(
        '[env] COOKIE_DOMAIN is not set — cross-subdomain SSO cookies will not work'
      );
      warnSpy.mockRestore();
    });

    it('warns when COOKIE_DOMAIN is missing in production', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      delete process.env.COOKIE_DOMAIN;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      warnIfMissingCookieDomain();

      expect(warnSpy).toHaveBeenCalledWith(
        '[env] COOKIE_DOMAIN is not set — cross-subdomain SSO cookies will not work'
      );
      warnSpy.mockRestore();
    });

    it('does not warn when COOKIE_DOMAIN is set', () => {
      process.env.VERCEL = '1';
      process.env.COOKIE_DOMAIN = '.joolie-boolie.com';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      warnIfMissingCookieDomain();

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
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

  describe('error message quality', () => {
    it('should include FATAL prefix in all error messages', () => {
      setAllValidEnv();

      // Test each variable individually
      const vars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_JWT_SECRET',
      ] as const;

      for (const varName of vars) {
        setAllValidEnv();
        delete process.env[varName];

        expect(() => validateEnvironment()).toThrow(/FATAL/);
      }
    });

    it('should include .env.local in all error messages', () => {
      const vars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_JWT_SECRET',
      ] as const;

      for (const varName of vars) {
        setAllValidEnv();
        delete process.env[varName];

        expect(() => validateEnvironment()).toThrow(/\.env\.local/);
      }
    });

    it('should show current value in URL validation errors', () => {
      setAllValidEnv();
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'ftp://invalid.example.com';

      expect(() => validateEnvironment()).toThrow(
        /Current value: "ftp:\/\/invalid.example.com"/
      );
    });
  });
});
