import type { SessionToken } from './session-token.js';

/**
 * Sign a session token with HMAC-SHA256
 *
 * Uses Web Crypto API to create a cryptographic signature that prevents
 * client-side tampering. The signed token format is:
 * base64url(payload.signature)
 *
 * @param token - Session token to sign
 * @param secret - Secret key for HMAC (SESSION_TOKEN_SECRET env var)
 * @returns Signed token string
 */
export async function signToken(token: SessionToken, secret: string): Promise<string> {
  const payload = JSON.stringify(token);
  const encoder = new TextEncoder();

  // Import HMAC key
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign payload
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Return: base64url(payload.signature)
  return Buffer.from(`${payload}.${signatureHex}`).toString('base64url');
}

/**
 * Verify and decode a signed session token
 *
 * Verifies the HMAC signature and returns the decoded token if valid.
 * Returns null if the signature is invalid or token is malformed.
 *
 * @param signedToken - Signed token string from signToken()
 * @param secret - Secret key for HMAC (SESSION_TOKEN_SECRET env var)
 * @returns Decoded session token or null if invalid
 */
export async function verifyAndDecodeToken(
  signedToken: string,
  secret: string
): Promise<SessionToken | null> {
  try {
    const decoded = Buffer.from(signedToken, 'base64url').toString('utf-8');
    const [payload, signatureHex] = decoded.split('.');

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = new Uint8Array(
      signatureHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(payload)
    );

    if (!valid) return null;

    return JSON.parse(payload) as SessionToken;
  } catch {
    return null;
  }
}
