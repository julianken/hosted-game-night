import { describe, it, expect } from 'vitest';
import { BIRD_WORDS, generateRoomCode, isValidRoomCode, parseRoomCode } from '../room-code';

describe('room-code', () => {
  describe('BIRD_WORDS', () => {
    it('should contain 12 bird names', () => {
      expect(BIRD_WORDS).toHaveLength(12);
    });

    it('should contain expected bird names', () => {
      const expectedBirds = ['SWAN', 'HAWK', 'DUCK', 'DOVE', 'WREN',
                             'CROW', 'HERN', 'RAVEN', 'EGRET', 'FINCH',
                             'CRANE', 'ROBIN'];
      expect(BIRD_WORDS).toEqual(expectedBirds);
    });
  });

  describe('generateRoomCode', () => {
    it('should generate code in BIRD-NN format', () => {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-Z]+-\d{2}$/);
    });

    it('should use valid bird word', () => {
      const code = generateRoomCode();
      const [bird] = code.split('-');
      expect(BIRD_WORDS).toContain(bird as typeof BIRD_WORDS[number]);
    });

    it('should generate number between 10-99', () => {
      const code = generateRoomCode();
      const [, numStr] = code.split('-');
      const num = parseInt(numStr, 10);
      expect(num).toBeGreaterThanOrEqual(10);
      expect(num).toBeLessThanOrEqual(99);
    });

    it('should generate different codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateRoomCode());
      }
      // With 12 birds and 90 numbers, we should get variety
      expect(codes.size).toBeGreaterThan(50);
    });

    it('should eventually generate all bird words', () => {
      const seenBirds = new Set<string>();
      // Generate enough codes to likely see all birds
      for (let i = 0; i < 500; i++) {
        const code = generateRoomCode();
        const [bird] = code.split('-');
        seenBirds.add(bird);
      }
      expect(seenBirds.size).toBe(12);
      BIRD_WORDS.forEach(bird => {
        expect(seenBirds).toContain(bird);
      });
    });
  });

  describe('isValidRoomCode', () => {
    it('should accept valid codes', () => {
      expect(isValidRoomCode('SWAN-42')).toBe(true);
      expect(isValidRoomCode('HAWK-10')).toBe(true);
      expect(isValidRoomCode('DUCK-99')).toBe(true);
      expect(isValidRoomCode('DOVE-50')).toBe(true);
      expect(isValidRoomCode('WREN-33')).toBe(true);
      expect(isValidRoomCode('CROW-77')).toBe(true);
      expect(isValidRoomCode('HERN-88')).toBe(true);
      expect(isValidRoomCode('RAVEN-25')).toBe(true);
      expect(isValidRoomCode('EGRET-15')).toBe(true);
      expect(isValidRoomCode('FINCH-60')).toBe(true);
      expect(isValidRoomCode('CRANE-91')).toBe(true);
      expect(isValidRoomCode('ROBIN-12')).toBe(true);
    });

    it('should reject invalid bird words', () => {
      expect(isValidRoomCode('PIGEON-42')).toBe(false);
      expect(isValidRoomCode('EAGLE-42')).toBe(false);
      expect(isValidRoomCode('OWL-42')).toBe(false);
    });

    it('should reject invalid number formats', () => {
      expect(isValidRoomCode('SWAN-1')).toBe(false); // Single digit
      expect(isValidRoomCode('SWAN-001')).toBe(false); // Three digits
      expect(isValidRoomCode('SWAN-9')).toBe(false);
      expect(isValidRoomCode('SWAN-100')).toBe(false);
    });

    it('should reject missing delimiter', () => {
      expect(isValidRoomCode('SWAN42')).toBe(false);
      expect(isValidRoomCode('SWAN 42')).toBe(false);
    });

    it('should reject wrong delimiter', () => {
      expect(isValidRoomCode('SWAN_42')).toBe(false);
      expect(isValidRoomCode('SWAN:42')).toBe(false);
    });

    it('should reject lowercase', () => {
      expect(isValidRoomCode('swan-42')).toBe(false);
      expect(isValidRoomCode('Swan-42')).toBe(false);
    });

    it('should reject empty or malformed strings', () => {
      expect(isValidRoomCode('')).toBe(false);
      expect(isValidRoomCode('-42')).toBe(false);
      expect(isValidRoomCode('SWAN-')).toBe(false);
      expect(isValidRoomCode('-')).toBe(false);
    });
  });

  describe('parseRoomCode', () => {
    it('should parse valid codes', () => {
      expect(parseRoomCode('SWAN-42')).toEqual({ bird: 'SWAN', number: 42 });
      expect(parseRoomCode('HAWK-10')).toEqual({ bird: 'HAWK', number: 10 });
      expect(parseRoomCode('DUCK-99')).toEqual({ bird: 'DUCK', number: 99 });
    });

    it('should parse all valid bird words', () => {
      BIRD_WORDS.forEach(bird => {
        const result = parseRoomCode(`${bird}-42`);
        expect(result).toEqual({ bird, number: 42 });
      });
    });

    it('should return null for invalid codes', () => {
      expect(parseRoomCode('PIGEON-42')).toBeNull();
      expect(parseRoomCode('SWAN-1')).toBeNull();
      expect(parseRoomCode('SWAN42')).toBeNull();
      expect(parseRoomCode('swan-42')).toBeNull();
      expect(parseRoomCode('')).toBeNull();
    });

    it('should handle edge case numbers', () => {
      expect(parseRoomCode('SWAN-10')).toEqual({ bird: 'SWAN', number: 10 });
      expect(parseRoomCode('SWAN-99')).toEqual({ bird: 'SWAN', number: 99 });
    });
  });
});
