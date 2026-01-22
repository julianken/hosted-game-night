/**
 * CSRF Token Generation and Validation
 *
 * Provides cryptographically secure CSRF protection for OAuth flows.
 * Tokens are stored in httpOnly cookies and validated on form submission.
 *
 * Security features:
 * - Cryptographically random tokens (32 bytes)
 * - HttpOnly cookies (prevents XSS)
 * - SameSite=Lax (prevents CSRF)
 * - Token rotation after each use
 * - Short expiration (15 minutes)
 */

import { cookies } from 'next/headers';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'oauth_csrf_token';
const CSRF_TOKEN_BYTES = 32;
const CSRF_TOKEN_MAX_AGE = 15 * 60; // 15 minutes in seconds

/**
 * Generate a cryptographically secure CSRF token
 *
 * @returns Base64-encoded random token (44 characters)
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_BYTES).toString('base64');
}

/**
 * Store CSRF token in secure httpOnly cookie
 *
 * @param token - CSRF token to store
 */
export async function setCsrfToken(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CSRF_TOKEN_MAX_AGE,
    path: '/',
  });
}

/**
 * Retrieve CSRF token from cookie
 *
 * @returns CSRF token or null if not found
 */
export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(CSRF_COOKIE_NAME);

  return cookie?.value || null;
}

/**
 * Validate CSRF token against stored cookie
 *
 * @param token - Token from form submission
 * @returns true if token is valid, false otherwise
 */
export async function validateCsrfToken(token: string | null | undefined): Promise<boolean> {
  if (!token) {
    return false;
  }

  const storedToken = await getCsrfToken();

  if (!storedToken) {
    return false;
  }

  try {
    // Create buffers from base64 tokens
    const tokenBuffer = Buffer.from(token, 'base64');
    const storedBuffer = Buffer.from(storedToken, 'base64');

    // SECURITY: Validate buffer lengths before timingSafeEqual
    // crypto.timingSafeEqual() throws RangeError if lengths don't match
    // This prevents timing leaks and unexpected exceptions
    if (tokenBuffer.length !== storedBuffer.length) {
      return false;
    }

    // Timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(tokenBuffer, storedBuffer);
  } catch (error) {
    // Handle malformed base64 or other buffer creation errors
    console.error('CSRF validation error:', error);
    return false;
  }
}

/**
 * Clear CSRF token cookie (used after validation)
 */
export async function clearCsrfToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CSRF_COOKIE_NAME);
}
