/**
 * COOKIE_DOMAIN Validation Tests (Bingo)
 *
 * Tests for warnIfMissingCookieDomain() in bingo env-validation.
 * Ensures proper warnings in production/Vercel environments.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { warnIfMissingCookieDomain } from '../env-validation';

describe('warnIfMissingCookieDomain', () => {
  afterEach(() => {
    delete process.env.VERCEL;
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
    delete process.env.COOKIE_DOMAIN;
  });

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
