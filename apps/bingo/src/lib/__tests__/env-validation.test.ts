import { describe, it, expect, afterEach } from 'vitest';
import {
  validateSessionTokenSecret,
  validateEnvironment,
  validateSupabaseConfig,
  validateJwtSecret,
  validateOAuthConfig,
  validateE2eConfig,
} from '../env-validation';

// Valid test values
const VALID_HEX_SECRET =
  'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
const VALID_SUPABASE_URL = 'https://myproject.supabase.co';
const VALID_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key';
const VALID_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key';
const VALID_JWT_SECRET = 'super-secret-jwt-value';
const VALID_PLATFORM_HUB_URL = 'http://localhost:3002';
const VALID_OAUTH_CLIENT_ID = 'test-oauth-client-id';

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
  process.env.NEXT_PUBLIC_PLATFORM_HUB_URL = VALID_PLATFORM_HUB_URL;
  process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID = VALID_OAUTH_CLIENT_ID;
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
  delete process.env.NEXT_PUBLIC_PLATFORM_HUB_URL;
  delete process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID;
  delete process.env.E2E_TESTING;
  delete process.env.E2E_JWT_SECRET;
}

describe('env-validation (bingo)', () => {
  afterEach(() => {
    clearAllEnv();
  });

  describe('validateSessionTokenSecret', () => {
    it('should pass with valid 64-character hex string', () => {
      process.env.SESSION_TOKEN_SECRET = VALID_HEX_SECRET;
      expect(() => validateSessionTokenSecret()).not.toThrow();
    });

    it('should throw if SESSION_TOKEN_SECRET is not set', () => {
      delete process.env.SESSION_TOKEN_SECRET;
      expect(() => validateSessionTokenSecret()).toThrow(
        /SESSION_TOKEN_SECRET environment variable is not set/
      );
    });

    it('should throw if SESSION_TOKEN_SECRET is empty', () => {
      process.env.SESSION_TOKEN_SECRET = '';
      expect(() => validateSessionTokenSecret()).toThrow(
        /SESSION_TOKEN_SECRET environment variable is not set/
      );
    });

    it('should throw if SESSION_TOKEN_SECRET is wrong length', () => {
      process.env.SESSION_TOKEN_SECRET = 'a1b2c3';
      expect(() => validateSessionTokenSecret()).toThrow(/must be exactly 64 characters/);
    });

    it('should throw if SESSION_TOKEN_SECRET has non-hex chars', () => {
      process.env.SESSION_TOKEN_SECRET =
        'g1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
      expect(() => validateSessionTokenSecret()).toThrow(
        /must contain only hexadecimal characters/
      );
    });

    it('should include generation instructions in error', () => {
      delete process.env.SESSION_TOKEN_SECRET;
      expect(() => validateSessionTokenSecret()).toThrow(/openssl rand -hex 32/);
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
        /must be a valid URL starting with http:\/\/ or https:\/\//
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
      process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE_ROLE_KEY;

      expect(() => validateSupabaseConfig()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY/
      );
    });

    it('should throw if SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = VALID_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON_KEY;

      expect(() => validateSupabaseConfig()).toThrow(
        /Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY/
      );
    });
  });

  describe('validateJwtSecret', () => {
    it('should pass with valid JWT secret', () => {
      process.env.SUPABASE_JWT_SECRET = VALID_JWT_SECRET;
      expect(() => validateJwtSecret()).not.toThrow();
    });

    it('should throw if SUPABASE_JWT_SECRET is missing', () => {
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
  });

  describe('validateOAuthConfig', () => {
    it('should pass with valid OAuth config', () => {
      process.env.NEXT_PUBLIC_PLATFORM_HUB_URL = VALID_PLATFORM_HUB_URL;
      process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID = VALID_OAUTH_CLIENT_ID;

      expect(() => validateOAuthConfig()).not.toThrow();
    });

    it('should throw if NEXT_PUBLIC_PLATFORM_HUB_URL is missing', () => {
      process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID = VALID_OAUTH_CLIENT_ID;

      expect(() => validateOAuthConfig()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_PLATFORM_HUB_URL/
      );
    });

    it('should throw if NEXT_PUBLIC_PLATFORM_HUB_URL is not a valid URL', () => {
      process.env.NEXT_PUBLIC_PLATFORM_HUB_URL = 'not-a-url';
      process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID = VALID_OAUTH_CLIENT_ID;

      expect(() => validateOAuthConfig()).toThrow(
        /must be a valid URL starting with http:\/\/ or https:\/\//
      );
    });

    it('should accept https:// URLs for production', () => {
      process.env.NEXT_PUBLIC_PLATFORM_HUB_URL = 'https://joolie-boolie.com';
      process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID = VALID_OAUTH_CLIENT_ID;

      expect(() => validateOAuthConfig()).not.toThrow();
    });

    it('should throw if NEXT_PUBLIC_OAUTH_CLIENT_ID is missing', () => {
      process.env.NEXT_PUBLIC_PLATFORM_HUB_URL = VALID_PLATFORM_HUB_URL;

      expect(() => validateOAuthConfig()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_OAUTH_CLIENT_ID/
      );
    });

    it('should throw if NEXT_PUBLIC_OAUTH_CLIENT_ID is empty', () => {
      process.env.NEXT_PUBLIC_PLATFORM_HUB_URL = VALID_PLATFORM_HUB_URL;
      process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID = '';

      expect(() => validateOAuthConfig()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_OAUTH_CLIENT_ID/
      );
    });
  });

  describe('validateE2eConfig', () => {
    it('should not throw when E2E_TESTING is not set', () => {
      expect(() => validateE2eConfig()).not.toThrow();
    });

    it('should not throw when E2E_TESTING is false', () => {
      process.env.E2E_TESTING = 'false';
      expect(() => validateE2eConfig()).not.toThrow();
    });

    it('should not throw when E2E_TESTING is true and E2E_JWT_SECRET is set', () => {
      process.env.E2E_TESTING = 'true';
      process.env.E2E_JWT_SECRET = 'test-secret';
      expect(() => validateE2eConfig()).not.toThrow();
    });

    it('should throw when E2E_TESTING is true and E2E_JWT_SECRET is missing', () => {
      process.env.E2E_TESTING = 'true';
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

    it('should throw when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      setAllValidEnv();
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => validateEnvironment()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL/
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

    it('should throw when NEXT_PUBLIC_PLATFORM_HUB_URL is missing', () => {
      setAllValidEnv();
      delete process.env.NEXT_PUBLIC_PLATFORM_HUB_URL;

      expect(() => validateEnvironment()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_PLATFORM_HUB_URL/
      );
    });

    it('should throw when NEXT_PUBLIC_PLATFORM_HUB_URL is not a URL', () => {
      setAllValidEnv();
      process.env.NEXT_PUBLIC_PLATFORM_HUB_URL = 'not-a-url';

      expect(() => validateEnvironment()).toThrow(/must be a valid URL/);
    });

    it('should throw when NEXT_PUBLIC_OAUTH_CLIENT_ID is missing', () => {
      setAllValidEnv();
      delete process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID;

      expect(() => validateEnvironment()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_OAUTH_CLIENT_ID/
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
      process.env.E2E_JWT_SECRET = 'test-secret';

      expect(() => validateEnvironment()).not.toThrow();
    });
  });

  describe('error message quality', () => {
    it('should include FATAL prefix in error messages', () => {
      setAllValidEnv();
      delete process.env.SUPABASE_JWT_SECRET;

      expect(() => validateEnvironment()).toThrow(/FATAL/);
    });

    it('should include .env.local hint in error messages', () => {
      setAllValidEnv();
      delete process.env.SUPABASE_JWT_SECRET;

      expect(() => validateEnvironment()).toThrow(/\.env\.local/);
    });

    it('should show current value in URL validation errors', () => {
      setAllValidEnv();
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'ftp://bad-url';

      expect(() => validateEnvironment()).toThrow(/Current value: "ftp:\/\/bad-url"/);
    });
  });
});
