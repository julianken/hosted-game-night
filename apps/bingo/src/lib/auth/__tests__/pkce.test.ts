import { describe, it, expect } from 'vitest';
import { generatePKCE } from '@joolie-boolie/auth';

describe('generatePKCE', () => {
  it('should generate code_verifier with valid length', async () => {
    const { codeVerifier } = await generatePKCE();
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(codeVerifier.length).toBeLessThanOrEqual(128);
  });

  it('should generate base64url encoded strings', async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    // base64url should not contain +, /, or =
    expect(codeVerifier).not.toMatch(/[+/=]/);
    expect(codeChallenge).not.toMatch(/[+/=]/);
  });

  it('should generate different values on each call', async () => {
    const result1 = await generatePKCE();
    const result2 = await generatePKCE();
    expect(result1.codeVerifier).not.toBe(result2.codeVerifier);
    expect(result1.codeChallenge).not.toBe(result2.codeChallenge);
  });

  it('should generate valid SHA-256 challenge from verifier', async () => {
    const { codeChallenge } = await generatePKCE();
    // SHA-256 hash encoded as base64url should be 43 characters
    expect(codeChallenge.length).toBe(43);
  });

  it('should generate correct SHA-256 hash of code_verifier', async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();

    // Independently compute the expected challenge
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hash = await crypto.subtle.digest('SHA-256', data);

    // Convert hash to base64url manually
    const hashArray = new Uint8Array(hash);
    let binary = '';
    for (let i = 0; i < hashArray.length; i++) {
      binary += String.fromCharCode(hashArray[i]);
    }
    const expectedChallenge = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Verify the generated challenge matches the expected value
    expect(codeChallenge).toBe(expectedChallenge);
  });

  it('should generate 64-character code_verifier (48 bytes base64url)', async () => {
    const { codeVerifier } = await generatePKCE();
    // 48 bytes encoded as base64url = 64 characters
    expect(codeVerifier.length).toBe(64);
  });
});
