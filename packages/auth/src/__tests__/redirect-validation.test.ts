import { describe, it, expect } from 'vitest';
import { isValidRedirect, sanitizeRedirect } from '../redirect-validation';

describe('isValidRedirect', () => {
  it('accepts root path', () => {
    expect(isValidRedirect('/')).toBe(true);
  });

  it('accepts relative paths', () => {
    expect(isValidRedirect('/play')).toBe(true);
    expect(isValidRedirect('/dashboard/settings')).toBe(true);
  });

  it('accepts paths with query strings', () => {
    expect(isValidRedirect('/oauth/consent?authorization_id=abc')).toBe(true);
  });

  it('accepts paths with fragments', () => {
    expect(isValidRedirect('/dashboard#section')).toBe(true);
  });

  it('rejects absolute URLs', () => {
    expect(isValidRedirect('https://evil.com')).toBe(false);
    expect(isValidRedirect('http://evil.com')).toBe(false);
    expect(isValidRedirect('ftp://evil.com')).toBe(false);
  });

  it('rejects protocol-relative URLs', () => {
    expect(isValidRedirect('//evil.com')).toBe(false);
    expect(isValidRedirect('//evil.com/path')).toBe(false);
  });

  it('rejects javascript: URIs', () => {
    expect(isValidRedirect('javascript:alert(1)')).toBe(false);
  });

  it('rejects data: URIs', () => {
    expect(isValidRedirect('data:text/html,<script>alert(1)</script>')).toBe(
      false,
    );
  });

  it('rejects paths not starting with /', () => {
    expect(isValidRedirect('evil.com')).toBe(false);
    expect(isValidRedirect('evil.com/path')).toBe(false);
  });

  it('rejects empty and null', () => {
    expect(isValidRedirect('')).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isValidRedirect(null as any)).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isValidRedirect(undefined as any)).toBe(false);
  });
});

describe('sanitizeRedirect', () => {
  it('returns valid paths unchanged', () => {
    expect(sanitizeRedirect('/play')).toBe('/play');
    expect(sanitizeRedirect('/')).toBe('/');
  });

  it('returns valid paths with query strings', () => {
    expect(sanitizeRedirect('/dashboard?tab=settings')).toBe(
      '/dashboard?tab=settings',
    );
  });

  it('returns fallback for absolute URLs', () => {
    expect(sanitizeRedirect('https://evil.com')).toBe('/');
  });

  it('returns fallback for protocol-relative URLs', () => {
    expect(sanitizeRedirect('//evil.com')).toBe('/');
  });

  it('returns fallback for null/undefined', () => {
    expect(sanitizeRedirect(null)).toBe('/');
    expect(sanitizeRedirect(undefined)).toBe('/');
  });

  it('returns fallback for empty string', () => {
    expect(sanitizeRedirect('')).toBe('/');
  });

  it('uses custom fallback', () => {
    expect(sanitizeRedirect('https://evil.com', '/home')).toBe('/home');
  });

  it('catches single-encoded attacks', () => {
    // %2F%2F decodes to //
    expect(sanitizeRedirect('%2F%2Fevil.com')).toBe('/');
  });

  it('catches double-encoded attacks', () => {
    // %252F%252F decodes to %2F%2F, then to //
    expect(sanitizeRedirect('%252F%252Fevil.com')).toBe('/');
  });

  it('handles invalid encoding gracefully', () => {
    expect(sanitizeRedirect('%ZZ')).toBe('/');
  });

  it('catches triple-encoded attacks', () => {
    // %25252F%25252F -> %252F%252F -> %2F%2F -> //
    expect(sanitizeRedirect('%25252F%25252Fevil.com')).toBe('/');
  });

  it('catches encoded javascript: URI', () => {
    // javascript: in URL encoding
    expect(sanitizeRedirect('javascript%3Aalert(1)')).toBe('/');
  });
});
