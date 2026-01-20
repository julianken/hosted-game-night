import { signToken, verifyAndDecodeToken } from './packages/database/src/hmac-tokens.ts';
import { createSessionToken } from './packages/database/src/session-token.ts';

console.log('=== HMAC Token Security Test ===\n');

const SECRET = 'test-secret-key-minimum-32-characters-long!';
const SHORT_SECRET = 'short';

// Test 1: Basic sign and verify
console.log('Test 1: Basic sign and verify');
const token1 = createSessionToken('sess-123', 'ABC123', 'bingo');
const signed1 = await signToken(token1, SECRET);
console.log('Signed token:', signed1);
const verified1 = await verifyAndDecodeToken(signed1, SECRET);
console.log('Verified:', verified1);
console.log('Match:', JSON.stringify(token1) === JSON.stringify(verified1));
console.log('');

// Test 2: Tamper detection - modify payload
console.log('Test 2: Tamper detection - modify payload');
const token2 = createSessionToken('sess-456', 'XYZ789', 'trivia');
const signed2 = await signToken(token2, SECRET);
const decoded = Buffer.from(signed2, 'base64url').toString('utf-8');
const [payload, signature] = decoded.split('.');
const tamperedPayload = JSON.parse(payload);
tamperedPayload.roomCode = 'HACKED';
const tamperedEncoded = Buffer.from(`${JSON.stringify(tamperedPayload)}.${signature}`).toString('base64url');
const verified2 = await verifyAndDecodeToken(tamperedEncoded, SECRET);
console.log('Tampered token verification result (should be null):', verified2);
console.log('');

// Test 3: Wrong secret
console.log('Test 3: Wrong secret');
const token3 = createSessionToken('sess-789', 'DEF456', 'bingo');
const signed3 = await signToken(token3, SECRET);
const verified3 = await verifyAndDecodeToken(signed3, 'wrong-secret');
console.log('Wrong secret verification result (should be null):', verified3);
console.log('');

// Test 4: Malformed token
console.log('Test 4: Malformed token');
const malformed = 'not-a-valid-token';
const verified4 = await verifyAndDecodeToken(malformed, SECRET);
console.log('Malformed token verification result (should be null):', verified4);
console.log('');

// Test 5: Empty signature
console.log('Test 5: Empty/missing signature');
const token5 = createSessionToken('sess-999', 'GHI789', 'trivia');
const payload5 = JSON.stringify(token5);
const noSig = Buffer.from(payload5).toString('base64url');
const verified5 = await verifyAndDecodeToken(noSig, SECRET);
console.log('No signature verification result (should be null):', verified5);
console.log('');

// Test 6: Short secret key
console.log('Test 6: Short secret key (still works but less secure)');
const token6 = createSessionToken('sess-111', 'JKL012', 'bingo');
const signed6 = await signToken(token6, SHORT_SECRET);
const verified6 = await verifyAndDecodeToken(signed6, SHORT_SECRET);
console.log('Short secret verification:', verified6 !== null ? 'PASSED' : 'FAILED');
console.log('');

// Test 7: Signature length check
console.log('Test 7: Signature format check');
const token7 = createSessionToken('sess-222', 'MNO345', 'trivia');
const signed7 = await signToken(token7, SECRET);
const decoded7 = Buffer.from(signed7, 'base64url').toString('utf-8');
const [, sig7] = decoded7.split('.');
console.log('Signature length (should be 64 hex chars for SHA-256):', sig7.length);
console.log('Signature is hex:', /^[0-9a-f]+$/.test(sig7));
console.log('');

// Test 8: Different tokens produce different signatures
console.log('Test 8: Different tokens produce different signatures');
const tokenA = createSessionToken('sess-aaa', 'AAA111', 'bingo');
const tokenB = createSessionToken('sess-bbb', 'BBB222', 'trivia');
const signedA = await signToken(tokenA, SECRET);
const signedB = await signToken(tokenB, SECRET);
console.log('SignedA !== SignedB:', signedA !== signedB);
console.log('');

console.log('=== All Tests Complete ===');
