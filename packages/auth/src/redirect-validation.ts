/**
 * Redirect URL validation utilities
 * Prevents open redirect attacks (CWE-601) by ensuring redirects
 * only go to same-origin paths.
 */

/**
 * Check if a redirect path is safe (same-origin relative path).
 * Returns true only for paths starting with "/" that aren't protocol-relative.
 */
export function isValidRedirect(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  // Must start with / but not // (protocol-relative URL)
  return path.startsWith('/') && !path.startsWith('//');
}

/**
 * Sanitize a redirect path, returning the fallback if the path is unsafe.
 * Iteratively URL-decodes to prevent double-encoding bypass attacks.
 */
export function sanitizeRedirect(
  path: string | null | undefined,
  fallback = '/',
): string {
  if (!path) return fallback;

  // Iteratively decode to prevent double-encoding bypass (%2F%2Fevil.com)
  let decoded = path;
  let prev = '';
  // Max 5 iterations to prevent infinite loops
  for (let i = 0; i < 5 && decoded !== prev; i++) {
    prev = decoded;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // Invalid encoding - reject
      return fallback;
    }
  }

  return isValidRedirect(decoded) ? decoded : fallback;
}
