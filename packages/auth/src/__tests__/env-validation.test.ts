/**
 * Shared Environment Validation Tests
 *
 * Tests for the shared env-validation functions exported from
 * @joolie-boolie/auth/env-validation.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  validateRequired,
  validateUrl,
  validateSessionTokenSecret,
  validateSupabaseConfig,
  validateJwtSecret,
  validateOAuthConfig,
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
const VALID_PLATFORM_HUB_URL = 'http://localhost:3002';
const VALID_OAUTH_CLIENT_ID = 'test-oauth-client-id';

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
  delete process.env.COOKIE_DOMAIN;
  delete process.env.VERCEL;
  delete (process.env as Record<string, string | undefined>).NODE_ENV;
}

describe('shared env-validation', () => {
  afterEach(() => {
    clearAllEnv();
  });

  describe('validateRequired', () => {
    it('should pass when variable is set', () => {
      process.env.TEST_VAR = 'some-value';
      expect(() => validateRequired('TEST_VAR', 'A test variable')).not.toThrow();
      delete process.env.TEST_VAR;
    });

    it('should throw when variable is missing', () => {
      delete process.env.TEST_VAR;
      expect(() => validateRequired('TEST_VAR', 'A test variable')).toThrow(
        /Missing required environment variable: TEST_VAR/
      );
    });

    it('should throw when variable is empty', () => {
      process.env.TEST_VAR = '';
      expect(() => validateRequired('TEST_VAR', 'A test variable')).toThrow(
        /Missing required environment variable: TEST_VAR/
      );
      delete process.env.TEST_VAR;
    });

    it('should throw when variable is whitespace-only', () => {
      process.env.TEST_VAR = '   ';
      expect(() => validateRequired('TEST_VAR', 'A test variable')).toThrow(
        /Missing required environment variable: TEST_VAR/
      );
      delete process.env.TEST_VAR;
    });

    it('should include description in error message', () => {
      expect(() => validateRequired('TEST_VAR', 'My custom description')).toThrow(
        /My custom description/
      );
    });

    it('should include .env.local hint', () => {
      expect(() => validateRequired('TEST_VAR', 'desc')).toThrow(/\.env\.local/);
    });
  });

  describe('validateUrl', () => {
    it('should pass for https URL', () => {
      process.env.TEST_URL = 'https://example.com';
      expect(() => validateUrl('TEST_URL', 'A URL')).not.toThrow();
      delete process.env.TEST_URL;
    });

    it('should pass for http URL', () => {
      process.env.TEST_URL = 'http://localhost:3000';
      expect(() => validateUrl('TEST_URL', 'A URL')).not.toThrow();
      delete process.env.TEST_URL;
    });

    it('should throw for non-URL value', () => {
      process.env.TEST_URL = 'not-a-url';
      expect(() => validateUrl('TEST_URL', 'A URL')).toThrow(
        /must be a valid URL starting with http:\/\/ or https:\/\//
      );
      delete process.env.TEST_URL;
    });

    it('should throw for missing variable', () => {
      delete process.env.TEST_URL;
      expect(() => validateUrl('TEST_URL', 'A URL')).toThrow(
        /Missing required environment variable: TEST_URL/
      );
    });

    it('should show current value in error', () => {
      process.env.TEST_URL = 'ftp://bad';
      expect(() => validateUrl('TEST_URL', 'A URL')).toThrow(/Current value: "ftp:\/\/bad"/);
      delete process.env.TEST_URL;
    });
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

    it('should throw if not set', () => {
      delete process.env.SESSION_TOKEN_SECRET;
      expect(() => validateSessionTokenSecret()).toThrow(
        /SESSION_TOKEN_SECRET environment variable is not set/
      );
    });

    it('should throw if empty', () => {
      process.env.SESSION_TOKEN_SECRET = '';
      expect(() => validateSessionTokenSecret()).toThrow(
        /SESSION_TOKEN_SECRET environment variable is not set/
      );
    });

    it('should throw if only whitespace', () => {
      process.env.SESSION_TOKEN_SECRET = '   ';
      expect(() => validateSessionTokenSecret()).toThrow(
        /SESSION_TOKEN_SECRET environment variable is empty/
      );
    });

    it('should throw if wrong length', () => {
      process.env.SESSION_TOKEN_SECRET = 'a1b2c3';
      expect(() => validateSessionTokenSecret()).toThrow(/must be exactly 64 characters/);
    });

    it('should show current length in error', () => {
      process.env.SESSION_TOKEN_SECRET = 'abc123';
      expect(() => validateSessionTokenSecret()).toThrow(/Current length: 6 characters/);
    });

    it('should throw if non-hex characters', () => {
      process.env.SESSION_TOKEN_SECRET =
        'g1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
      expect(() => validateSessionTokenSecret()).toThrow(
        /must contain only hexadecimal characters/
      );
    });

    it('should include generation instructions', () => {
      delete process.env.SESSION_TOKEN_SECRET;
      expect(() => validateSessionTokenSecret()).toThrow(/openssl rand -hex 32/);
    });
  });

  describe('validateSupabaseConfig', () => {
    it('should pass with valid config', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = VALID_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE_ROLE_KEY;
      expect(() => validateSupabaseConfig()).not.toThrow();
    });

    it('should throw if URL is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE_ROLE_KEY;
      expect(() => validateSupabaseConfig()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL/
      );
    });

    it('should throw if URL is not valid', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-url';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE_ROLE_KEY;
      expect(() => validateSupabaseConfig()).toThrow(
        /must be a valid URL starting with http:\/\/ or https:\/\//
      );
    });

    it('should throw if anon key is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = VALID_SUPABASE_URL;
      process.env.SUPABASE_SERVICE_ROLE_KEY = VALID_SERVICE_ROLE_KEY;
      expect(() => validateSupabaseConfig()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY/
      );
    });

    it('should throw if service role key is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = VALID_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON_KEY;
      expect(() => validateSupabaseConfig()).toThrow(
        /Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY/
      );
    });

    it('should skip service role key check in E2E mode', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = VALID_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = VALID_ANON_KEY;
      process.env.E2E_TESTING = 'true';
      expect(() => validateSupabaseConfig()).not.toThrow();
    });
  });

  describe('validateJwtSecret', () => {
    it('should pass with valid JWT secret', () => {
      process.env.SUPABASE_JWT_SECRET = VALID_JWT_SECRET;
      expect(() => validateJwtSecret()).not.toThrow();
    });

    it('should throw if missing', () => {
      expect(() => validateJwtSecret()).toThrow(
        /Missing required environment variable: SUPABASE_JWT_SECRET/
      );
    });

    it('should throw if empty', () => {
      process.env.SUPABASE_JWT_SECRET = '';
      expect(() => validateJwtSecret()).toThrow(
        /Missing required environment variable: SUPABASE_JWT_SECRET/
      );
    });

    it('should skip check in E2E mode', () => {
      process.env.E2E_TESTING = 'true';
      expect(() => validateJwtSecret()).not.toThrow();
    });
  });

  describe('validateOAuthConfig', () => {
    it('should pass with valid OAuth config', () => {
      process.env.NEXT_PUBLIC_PLATFORM_HUB_URL = VALID_PLATFORM_HUB_URL;
      process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID = VALID_OAUTH_CLIENT_ID;
      expect(() => validateOAuthConfig()).not.toThrow();
    });

    it('should throw if platform hub URL is missing', () => {
      process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID = VALID_OAUTH_CLIENT_ID;
      expect(() => validateOAuthConfig()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_PLATFORM_HUB_URL/
      );
    });

    it('should throw if platform hub URL is not a valid URL', () => {
      process.env.NEXT_PUBLIC_PLATFORM_HUB_URL = 'not-a-url';
      process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID = VALID_OAUTH_CLIENT_ID;
      expect(() => validateOAuthConfig()).toThrow(
        /must be a valid URL starting with http:\/\/ or https:\/\//
      );
    });

    it('should throw if OAuth client ID is missing', () => {
      process.env.NEXT_PUBLIC_PLATFORM_HUB_URL = VALID_PLATFORM_HUB_URL;
      expect(() => validateOAuthConfig()).toThrow(
        /Missing required environment variable: NEXT_PUBLIC_OAUTH_CLIENT_ID/
      );
    });

    it('should throw if OAuth client ID is empty', () => {
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

    it('should throw when E2E_TESTING is true and E2E_JWT_SECRET is empty', () => {
      process.env.E2E_TESTING = 'true';
      process.env.E2E_JWT_SECRET = '';
      expect(() => validateE2eConfig()).toThrow(
        /Missing required environment variable: E2E_JWT_SECRET/
      );
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

  describe('error message quality', () => {
    it('should include FATAL prefix', () => {
      expect(() => validateRequired('MISSING_VAR', 'desc')).toThrow(/FATAL/);
    });

    it('should include .env.local hint', () => {
      expect(() => validateRequired('MISSING_VAR', 'desc')).toThrow(/\.env\.local/);
    });

    it('should show current value in URL validation errors', () => {
      process.env.BAD_URL = 'ftp://bad-url';
      expect(() => validateUrl('BAD_URL', 'desc')).toThrow(/Current value: "ftp:\/\/bad-url"/);
      delete process.env.BAD_URL;
    });
  });
});
