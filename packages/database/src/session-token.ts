export interface SessionToken {
  sessionId: string;
  roomCode: string;
  gameType: 'bingo' | 'trivia';
  expiresAt: number; // Unix timestamp
}

export const TOKEN_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function encodeSessionToken(token: SessionToken): string {
  const json = JSON.stringify(token);
  return Buffer.from(json).toString('base64url');
}

export function decodeSessionToken(encoded: string): SessionToken | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf-8');
    return JSON.parse(json) as SessionToken;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: SessionToken): boolean {
  return Date.now() > token.expiresAt;
}

export function createSessionToken(
  sessionId: string,
  roomCode: string,
  gameType: 'bingo' | 'trivia',
  durationMs: number = TOKEN_DURATION_MS
): SessionToken {
  return {
    sessionId,
    roomCode,
    gameType,
    expiresAt: Date.now() + durationMs,
  };
}
