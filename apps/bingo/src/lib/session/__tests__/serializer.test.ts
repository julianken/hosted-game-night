import { describe, it, expect } from 'vitest';
import {
  serializeBingoState,
  deserializeBingoState,
  SerializationError,
  SerializedBingoState,
} from '../serializer';
import { GameState, BingoBall, BingoPattern } from '@/types';
import { DEFAULT_AUTO_CALL_SPEED } from '@/lib/game/engine';
import { patternRegistry } from '@/lib/game/patterns';

describe('serializer', () => {
  // Test data fixtures
  const mockBall1: BingoBall = {
    column: 'B',
    number: 5,
    label: 'B-5',
  };

  const mockBall2: BingoBall = {
    column: 'I',
    number: 20,
    label: 'I-20',
  };

  const mockBall3: BingoBall = {
    column: 'N',
    number: 35,
    label: 'N-35',
  };

  const mockPattern: BingoPattern = {
    id: 'horizontal-line',
    name: 'Horizontal Line',
    category: 'lines',
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
    ],
  };

  const createMockGameState = (overrides?: Partial<GameState>): GameState => ({
    status: 'idle',
    calledBalls: [],
    currentBall: null,
    previousBall: null,
    remainingBalls: [],
    pattern: null,
    autoCallEnabled: false,
    autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
    audioEnabled: true,
    ...overrides,
  });

  describe('serializeBingoState', () => {
    it('serializes idle state correctly', () => {
      const state = createMockGameState();
      const serialized = serializeBingoState(state);

      expect(serialized).toEqual({
        status: 'idle',
        patternId: null,
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        autoCallEnabled: false,
        autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
        audioEnabled: true,
      });
    });

    it('serializes playing state with pattern', () => {
      const state = createMockGameState({
        status: 'playing',
        pattern: mockPattern,
        currentBall: mockBall1,
        calledBalls: [mockBall1],
        remainingBalls: [mockBall2, mockBall3],
      });
      const serialized = serializeBingoState(state);

      expect(serialized).toEqual({
        status: 'playing',
        patternId: 'horizontal-line',
        calledBalls: [mockBall1],
        currentBall: mockBall1,
        previousBall: null,
        remainingBalls: [mockBall2, mockBall3],
        autoCallEnabled: false,
        autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
        audioEnabled: true,
      });
    });

    it('extracts pattern ID instead of full pattern object', () => {
      const state = createMockGameState({ pattern: mockPattern });
      const serialized = serializeBingoState(state);

      expect(serialized.patternId).toBe('horizontal-line');
      expect(serialized).not.toHaveProperty('pattern');
    });

    it('handles null pattern', () => {
      const state = createMockGameState({ pattern: null });
      const serialized = serializeBingoState(state);

      expect(serialized.patternId).toBeNull();
    });

    it('serializes paused state with previous ball', () => {
      const state = createMockGameState({
        status: 'paused',
        currentBall: mockBall2,
        previousBall: mockBall1,
        calledBalls: [mockBall1, mockBall2],
      });
      const serialized = serializeBingoState(state);

      expect(serialized.status).toBe('paused');
      expect(serialized.currentBall).toEqual(mockBall2);
      expect(serialized.previousBall).toEqual(mockBall1);
    });

    it('serializes ended state', () => {
      const state = createMockGameState({
        status: 'ended',
        calledBalls: [mockBall1, mockBall2],
        currentBall: mockBall2,
        previousBall: mockBall1,
      });
      const serialized = serializeBingoState(state);

      expect(serialized.status).toBe('ended');
    });

    it('preserves auto-call settings', () => {
      const state = createMockGameState({
        autoCallEnabled: true,
        autoCallSpeed: 10,
      });
      const serialized = serializeBingoState(state);

      expect(serialized.autoCallEnabled).toBe(true);
      expect(serialized.autoCallSpeed).toBe(10);
    });

    it('preserves audio enabled setting', () => {
      const state = createMockGameState({ audioEnabled: false });
      const serialized = serializeBingoState(state);

      expect(serialized.audioEnabled).toBe(false);
    });
  });

  describe('deserializeBingoState', () => {
    it('deserializes valid idle state', () => {
      const serialized: SerializedBingoState = {
        status: 'idle',
        patternId: null,
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        autoCallEnabled: false,
        autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
        audioEnabled: true,
      };

      const deserialized = deserializeBingoState(serialized);

      expect(deserialized.status).toBe('idle');
      expect(deserialized.calledBalls).toEqual([]);
      expect(deserialized.currentBall).toBeNull();
      expect(deserialized.previousBall).toBeNull();
      expect(deserialized.remainingBalls).toEqual([]);
      expect(deserialized.autoCallEnabled).toBe(false);
      expect(deserialized.autoCallSpeed).toBe(DEFAULT_AUTO_CALL_SPEED);
      expect(deserialized.audioEnabled).toBe(true);
    });

    it('deserializes playing state with balls', () => {
      const serialized: SerializedBingoState = {
        status: 'playing',
        patternId: 'horizontal-line',
        calledBalls: [mockBall1],
        currentBall: mockBall1,
        previousBall: null,
        remainingBalls: [mockBall2, mockBall3],
        autoCallEnabled: false,
        autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
        audioEnabled: true,
      };

      const deserialized = deserializeBingoState(serialized);

      expect(deserialized.status).toBe('playing');
      expect(deserialized.calledBalls).toEqual([mockBall1]);
      expect(deserialized.currentBall).toEqual(mockBall1);
      expect(deserialized.remainingBalls).toEqual([mockBall2, mockBall3]);
    });

    it('includes pattern when provided', () => {
      const serialized: SerializedBingoState = {
        status: 'idle',
        patternId: 'horizontal-line',
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        autoCallEnabled: false,
        autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
        audioEnabled: true,
      };

      const deserialized = deserializeBingoState(serialized, mockPattern);

      expect(deserialized.pattern).toEqual(mockPattern);
    });

    it('does not include pattern when patternId is not in registry and no pattern param', () => {
      const serialized: SerializedBingoState = {
        status: 'idle',
        patternId: 'nonexistent-pattern-id',
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        autoCallEnabled: false,
        autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
        audioEnabled: true,
      };

      const deserialized = deserializeBingoState(serialized);

      expect(deserialized.pattern).toBeUndefined();
    });

    it('handles null pattern correctly', () => {
      const serialized: SerializedBingoState = {
        status: 'idle',
        patternId: null,
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        autoCallEnabled: false,
        autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
        audioEnabled: true,
      };

      const deserialized = deserializeBingoState(serialized, null);

      expect(deserialized.pattern).toBeNull();
    });

    describe('pattern reconstruction from registry', () => {
      it('reconstructs pattern from patternId when no pattern param is provided', () => {
        // Use a real pattern ID that exists in the registry (auto-initialized on import)
        const realPattern = patternRegistry.getAll()[0];
        expect(realPattern).toBeDefined();

        const serialized: SerializedBingoState = {
          status: 'playing',
          patternId: realPattern.id,
          calledBalls: [],
          currentBall: null,
          previousBall: null,
          remainingBalls: [],
          autoCallEnabled: false,
          autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
          audioEnabled: true,
        };

        const deserialized = deserializeBingoState(serialized);

        expect(deserialized.pattern).toBeDefined();
        expect(deserialized.pattern?.id).toBe(realPattern.id);
        expect(deserialized.pattern?.name).toBe(realPattern.name);
        expect(deserialized.pattern?.cells).toEqual(realPattern.cells);
      });

      it('does not crash with an invalid patternId not in registry', () => {
        const serialized: SerializedBingoState = {
          status: 'idle',
          patternId: 'totally-fake-pattern-id',
          calledBalls: [],
          currentBall: null,
          previousBall: null,
          remainingBalls: [],
          autoCallEnabled: false,
          autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
          audioEnabled: true,
        };

        // Should not throw
        const deserialized = deserializeBingoState(serialized);

        // Pattern should be undefined (not found in registry)
        expect(deserialized.pattern).toBeUndefined();
      });

      it('does not reconstruct pattern when patternId is null', () => {
        const serialized: SerializedBingoState = {
          status: 'idle',
          patternId: null,
          calledBalls: [],
          currentBall: null,
          previousBall: null,
          remainingBalls: [],
          autoCallEnabled: false,
          autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
          audioEnabled: true,
        };

        const deserialized = deserializeBingoState(serialized);

        // pattern key should not be set at all
        expect('pattern' in deserialized).toBe(false);
      });

      it('prefers explicit pattern param over registry reconstruction', () => {
        const realPattern = patternRegistry.getAll()[0];
        expect(realPattern).toBeDefined();

        const serialized: SerializedBingoState = {
          status: 'idle',
          patternId: realPattern.id,
          calledBalls: [],
          currentBall: null,
          previousBall: null,
          remainingBalls: [],
          autoCallEnabled: false,
          autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
          audioEnabled: true,
        };

        // Pass a different pattern explicitly
        const deserialized = deserializeBingoState(serialized, mockPattern);

        // Should use the explicitly provided pattern, not the registry one
        expect(deserialized.pattern).toEqual(mockPattern);
      });
    });

    it('applies default for missing autoCallEnabled', () => {
      const serialized = {
        status: 'idle',
        patternId: null,
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
        audioEnabled: true,
      };

      const deserialized = deserializeBingoState(serialized);

      expect(deserialized.autoCallEnabled).toBe(false);
    });

    it('applies default for missing autoCallSpeed', () => {
      const serialized = {
        status: 'idle',
        patternId: null,
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        autoCallEnabled: false,
        audioEnabled: true,
      };

      const deserialized = deserializeBingoState(serialized);

      expect(deserialized.autoCallSpeed).toBe(DEFAULT_AUTO_CALL_SPEED);
    });

    it('applies default for invalid autoCallSpeed (negative)', () => {
      const serialized = {
        status: 'idle',
        patternId: null,
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        autoCallEnabled: false,
        autoCallSpeed: -5,
        audioEnabled: true,
      };

      const deserialized = deserializeBingoState(serialized);

      expect(deserialized.autoCallSpeed).toBe(DEFAULT_AUTO_CALL_SPEED);
    });

    it('applies default for missing audioEnabled', () => {
      const serialized = {
        status: 'idle',
        patternId: null,
        calledBalls: [],
        currentBall: null,
        previousBall: null,
        remainingBalls: [],
        autoCallEnabled: false,
        autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
      };

      const deserialized = deserializeBingoState(serialized);

      expect(deserialized.audioEnabled).toBe(true);
    });

    describe('error cases', () => {
      it('throws for null data', () => {
        expect(() => deserializeBingoState(null)).toThrow(SerializationError);
        expect(() => deserializeBingoState(null)).toThrow('expected object');
      });

      it('throws for undefined data', () => {
        expect(() => deserializeBingoState(undefined)).toThrow(SerializationError);
        expect(() => deserializeBingoState(undefined)).toThrow('expected object');
      });

      it('throws for non-object data', () => {
        expect(() => deserializeBingoState('invalid')).toThrow(SerializationError);
        expect(() => deserializeBingoState(123)).toThrow(SerializationError);
        expect(() => deserializeBingoState(true)).toThrow(SerializationError);
      });

      it('throws for missing status', () => {
        const serialized = {
          patternId: null,
          calledBalls: [],
          currentBall: null,
          previousBall: null,
          remainingBalls: [],
          autoCallEnabled: false,
          autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
          audioEnabled: true,
        };

        expect(() => deserializeBingoState(serialized)).toThrow(SerializationError);
        expect(() => deserializeBingoState(serialized)).toThrow('Invalid status');
      });

      it('throws for invalid status value', () => {
        const serialized = {
          status: 'invalid-status',
          patternId: null,
          calledBalls: [],
          currentBall: null,
          previousBall: null,
          remainingBalls: [],
          autoCallEnabled: false,
          autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
          audioEnabled: true,
        };

        expect(() => deserializeBingoState(serialized)).toThrow(SerializationError);
        expect(() => deserializeBingoState(serialized)).toThrow('Invalid status');
      });

      it('throws for invalid calledBalls (not array)', () => {
        const serialized = {
          status: 'idle',
          patternId: null,
          calledBalls: 'not-an-array',
          currentBall: null,
          previousBall: null,
          remainingBalls: [],
          autoCallEnabled: false,
          autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
          audioEnabled: true,
        };

        expect(() => deserializeBingoState(serialized)).toThrow(SerializationError);
        expect(() => deserializeBingoState(serialized)).toThrow('Invalid calledBalls');
      });

      it('throws for invalid calledBalls (invalid ball object)', () => {
        const serialized = {
          status: 'idle',
          patternId: null,
          calledBalls: [{ invalid: 'ball' }],
          currentBall: null,
          previousBall: null,
          remainingBalls: [],
          autoCallEnabled: false,
          autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
          audioEnabled: true,
        };

        expect(() => deserializeBingoState(serialized)).toThrow(SerializationError);
        expect(() => deserializeBingoState(serialized)).toThrow('Invalid calledBalls');
      });

      it('throws for invalid currentBall', () => {
        const serialized = {
          status: 'idle',
          patternId: null,
          calledBalls: [],
          currentBall: { invalid: 'ball' },
          previousBall: null,
          remainingBalls: [],
          autoCallEnabled: false,
          autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
          audioEnabled: true,
        };

        expect(() => deserializeBingoState(serialized)).toThrow(SerializationError);
        expect(() => deserializeBingoState(serialized)).toThrow('Invalid currentBall');
      });

      it('throws for invalid previousBall', () => {
        const serialized = {
          status: 'idle',
          patternId: null,
          calledBalls: [],
          currentBall: null,
          previousBall: { invalid: 'ball' },
          remainingBalls: [],
          autoCallEnabled: false,
          autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
          audioEnabled: true,
        };

        expect(() => deserializeBingoState(serialized)).toThrow(SerializationError);
        expect(() => deserializeBingoState(serialized)).toThrow('Invalid previousBall');
      });

      it('throws for invalid remainingBalls (not array)', () => {
        const serialized = {
          status: 'idle',
          patternId: null,
          calledBalls: [],
          currentBall: null,
          previousBall: null,
          remainingBalls: 'not-an-array',
          autoCallEnabled: false,
          autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
          audioEnabled: true,
        };

        expect(() => deserializeBingoState(serialized)).toThrow(SerializationError);
        expect(() => deserializeBingoState(serialized)).toThrow('Invalid remainingBalls');
      });

      it('throws for invalid ball column', () => {
        const invalidBall = {
          column: 'X', // Invalid column
          number: 5,
          label: 'X-5',
        };

        const serialized = {
          status: 'idle',
          patternId: null,
          calledBalls: [invalidBall],
          currentBall: null,
          previousBall: null,
          remainingBalls: [],
          autoCallEnabled: false,
          autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
          audioEnabled: true,
        };

        expect(() => deserializeBingoState(serialized)).toThrow(SerializationError);
      });

      it('throws for ball number out of range', () => {
        const invalidBall = {
          column: 'B',
          number: 100, // Out of range
          label: 'B-100',
        };

        const serialized = {
          status: 'idle',
          patternId: null,
          calledBalls: [invalidBall],
          currentBall: null,
          previousBall: null,
          remainingBalls: [],
          autoCallEnabled: false,
          autoCallSpeed: DEFAULT_AUTO_CALL_SPEED,
          audioEnabled: true,
        };

        expect(() => deserializeBingoState(serialized)).toThrow(SerializationError);
      });
    });
  });

  describe('round-trip serialization', () => {
    it('preserves state through serialize -> deserialize cycle', () => {
      const originalState = createMockGameState({
        status: 'playing',
        pattern: mockPattern,
        calledBalls: [mockBall1, mockBall2],
        currentBall: mockBall2,
        previousBall: mockBall1,
        remainingBalls: [mockBall3],
        autoCallEnabled: true,
        autoCallSpeed: 15,
        audioEnabled: false,
      });

      const serialized = serializeBingoState(originalState);
      const deserialized = deserializeBingoState(serialized, mockPattern);

      // Compare all serializable fields
      expect(deserialized.status).toBe(originalState.status);
      expect(deserialized.calledBalls).toEqual(originalState.calledBalls);
      expect(deserialized.currentBall).toEqual(originalState.currentBall);
      expect(deserialized.previousBall).toEqual(originalState.previousBall);
      expect(deserialized.remainingBalls).toEqual(originalState.remainingBalls);
      expect(deserialized.pattern).toEqual(originalState.pattern);
      expect(deserialized.autoCallEnabled).toBe(originalState.autoCallEnabled);
      expect(deserialized.autoCallSpeed).toBe(originalState.autoCallSpeed);
      expect(deserialized.audioEnabled).toBe(originalState.audioEnabled);
    });

    it('preserves pattern through serialize -> deserialize cycle without explicit pattern param', () => {
      // Use a real registered pattern so registry reconstruction works
      const realPattern = patternRegistry.getAll()[0];
      expect(realPattern).toBeDefined();

      const originalState = createMockGameState({
        status: 'playing',
        pattern: realPattern,
        calledBalls: [mockBall1],
        currentBall: mockBall1,
        remainingBalls: [mockBall2, mockBall3],
      });

      const serialized = serializeBingoState(originalState);
      // Deserialize WITHOUT passing the pattern param (simulates session recovery)
      const deserialized = deserializeBingoState(serialized);

      expect(deserialized.pattern).toBeDefined();
      expect(deserialized.pattern?.id).toBe(realPattern.id);
      expect(deserialized.pattern?.name).toBe(realPattern.name);
      expect(deserialized.pattern?.cells).toEqual(realPattern.cells);
      expect(deserialized.status).toBe(originalState.status);
      expect(deserialized.calledBalls).toEqual(originalState.calledBalls);
    });
  });
});
