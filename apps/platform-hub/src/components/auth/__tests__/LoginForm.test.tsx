import { describe, it, expect } from 'vitest';
import { isValidRedirect, buildRedirectUrl } from '../LoginForm';

describe('LoginForm Redirect Logic', () => {
  describe('isValidRedirect', () => {
    it('should accept valid internal paths', () => {
      expect(isValidRedirect('/dashboard')).toBe(true);
      expect(isValidRedirect('/oauth/consent')).toBe(true);
      expect(isValidRedirect('/settings/profile')).toBe(true);
    });

    it('should reject absolute URLs', () => {
      expect(isValidRedirect('http://evil.com')).toBe(false);
      expect(isValidRedirect('https://evil.com')).toBe(false);
      expect(isValidRedirect('ftp://evil.com')).toBe(false);
    });

    it('should reject protocol-relative URLs', () => {
      expect(isValidRedirect('//evil.com')).toBe(false);
      expect(isValidRedirect('//evil.com/path')).toBe(false);
    });

    it('should reject paths not starting with /', () => {
      expect(isValidRedirect('evil.com')).toBe(false);
      expect(isValidRedirect('javascript:alert(1)')).toBe(false);
      expect(isValidRedirect('data:text/html,<script>alert(1)</script>')).toBe(false);
    });
  });

  describe('buildRedirectUrl', () => {
    it('should build URL with authorization_id for OAuth flow', () => {
      const result = buildRedirectUrl('/oauth/consent', 'abc123');
      expect(result).toBe('/oauth/consent?authorization_id=abc123');
    });

    it('should default to /dashboard when redirect is missing', () => {
      const result = buildRedirectUrl(undefined, 'abc123');
      expect(result).toBe('/dashboard');
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
      expect(buildRedirectUrl('http://evil.com', 'abc123')).toBe('/dashboard');
      expect(buildRedirectUrl('//evil.com', 'abc123')).toBe('/dashboard');
      expect(buildRedirectUrl('javascript:alert(1)', 'abc123')).toBe('/dashboard');
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
