// Bird words for room codes
export const BIRD_WORDS = ['SWAN', 'HAWK', 'DUCK', 'DOVE', 'WREN',
                            'CROW', 'HERN', 'RAVEN', 'EGRET', 'FINCH',
                            'CRANE', 'ROBIN'] as const satisfies readonly string[];

// Generate SWAN-42 format
export function generateRoomCode(): string {
  const bird = BIRD_WORDS[Math.floor(Math.random() * BIRD_WORDS.length)];
  const number = Math.floor(Math.random() * 90) + 10; // 10-99
  return `${bird}-${number}`;
}

// Validate format
export function isValidRoomCode(code: string): boolean {
  const pattern = /^(SWAN|HAWK|DUCK|DOVE|WREN|CROW|HERN|RAVEN|EGRET|FINCH|CRANE|ROBIN)-\d{2}$/;
  return pattern.test(code);
}

// Parse components
export function parseRoomCode(code: string): { bird: string; number: number } | null {
  if (!isValidRoomCode(code)) return null;
  const [bird, numStr] = code.split('-');
  return { bird, number: parseInt(numStr, 10) };
}
