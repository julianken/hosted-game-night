import { describe, it, expect } from 'vitest';
import type { GameStatus, BaseGameState } from '../index';

describe('game-engine', () => {
  describe('GameStatus type', () => {
    it('should accept all valid status values', () => {
      const statuses: GameStatus[] = ['idle', 'playing', 'paused', 'ended'];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('BaseGameState type', () => {
    it('should accept a valid base game state', () => {
      const state: BaseGameState = {
        status: 'idle',
        audioEnabled: true,
      };
      expect(state.status).toBe('idle');
      expect(state.audioEnabled).toBe(true);
    });
  });
});
