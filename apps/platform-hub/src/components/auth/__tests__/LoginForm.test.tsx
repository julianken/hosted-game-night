import { describe, it, expect } from 'vitest';
import { buildRedirectUrl } from '../LoginForm';

// isValidRedirect tests moved to @joolie-boolie/auth (redirect-validation.test.ts)

describe('LoginForm Redirect Logic', () => {
  describe('buildRedirectUrl', () => {
    it('should build URL with authorization_id for OAuth flow', () => {
      const result = buildRedirectUrl('/oauth/consent', 'abc123');
      expect(result).toBe('/oauth/consent?authorization_id=abc123');
    });

    it('should default to /dashboard when redirect is missing', () => {
      const result = buildRedirectUrl(undefined, 'abc123');
      expect(result).toBe('/dashboard?authorization_id=abc123');
    });

    it('should return redirect without query params when authorization_id is missing', () => {
      const result = buildRedirectUrl('/dashboard', undefined);
      expect(result).toBe('/dashboard');
    });

    it('should URL encode special characters in authorization_id', () => {
      const result = buildRedirectUrl('/oauth/consent', 'abc+123/xyz=');
      expect(result).toBe('/oauth/consent?authorization_id=abc%2B123%2Fxyz%3D');
    });

    it('should handle spaces in authorization_id', () => {
      const result = buildRedirectUrl('/oauth/consent', 'abc 123');
      expect(result).toBe('/oauth/consent?authorization_id=abc%20123');
    });

    it('should reject invalid redirect paths and fall back to /dashboard', () => {
      // Invalid redirects fall back to /dashboard but preserve authorization_id
      // so the OAuth flow can continue from a safe path
      expect(buildRedirectUrl('http://evil.com', 'abc123')).toBe('/dashboard?authorization_id=abc123');
      expect(buildRedirectUrl('//evil.com', 'abc123')).toBe('/dashboard?authorization_id=abc123');
      expect(buildRedirectUrl('javascript:alert(1)', 'abc123')).toBe('/dashboard?authorization_id=abc123');
    });

    it('should reject invalid redirect paths without authorization_id', () => {
      expect(buildRedirectUrl('http://evil.com', undefined)).toBe('/dashboard');
      expect(buildRedirectUrl('//evil.com', undefined)).toBe('/dashboard');
      expect(buildRedirectUrl('javascript:alert(1)', undefined)).toBe('/dashboard');
    });

    it('should handle both redirect and authorization_id being undefined', () => {
      const result = buildRedirectUrl(undefined, undefined);
      expect(result).toBe('/dashboard');
    });

    it('should preserve path with multiple segments', () => {
      const result = buildRedirectUrl('/oauth/consent/step2', 'abc123');
      expect(result).toBe('/oauth/consent/step2?authorization_id=abc123');
    });

    it('should handle authorization_id with special OAuth characters', () => {
      const result = buildRedirectUrl('/oauth/consent', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
      expect(result).toBe('/oauth/consent?authorization_id=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer');
    });
  });
});
