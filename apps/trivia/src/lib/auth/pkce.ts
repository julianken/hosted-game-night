// @canonical - Trivia uses this local PKCE implementation
/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.1
 * Implements RFC 7636 with S256 challenge method
 */

/**
 * Generate PKCE code_verifier and code_challenge for OAuth 2.1 flow
 *
 * @returns Object containing base64url-encoded code_verifier and SHA-256 code_challenge
 */
export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  // Generate 48-byte random code_verifier (384 bits)
  // RFC 7636 requires 43-128 characters. 48 bytes → 64 chars base64url (industry best practice)
  const array = new Uint8Array(48);
  crypto.getRandomValues(array);
  const codeVerifier = base64URLEncode(array);

  // Generate SHA-256 code_challenge
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = base64URLEncode(new Uint8Array(hash));

  return { codeVerifier, codeChallenge };
}

/**
 * Base64url encode a Uint8Array
 *
 * @param buffer - The buffer to encode
 * @returns Base64url-encoded string (no padding, URL-safe characters)
 */
function base64URLEncode(buffer: Uint8Array): string {
  // Convert Uint8Array to binary string safely (avoids spread operator call stack limits)
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
