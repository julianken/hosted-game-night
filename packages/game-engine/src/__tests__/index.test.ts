import { describe, it, expect } from 'vitest';
import { transition, canTransition, GameStatus, GameTransition } from '../index';

describe('game-engine', () => {
  describe('transition', () => {
    describe('START_GAME', () => {
      it('should transition from idle to playing', () => {
        expect(transition('idle', 'START_GAME')).toBe('playing');
      });

      it('should not transition from playing', () => {
        expect(transition('playing', 'START_GAME')).toBe('playing');
      });

      it('should not transition from paused', () => {
        expect(transition('paused', 'START_GAME')).toBe('paused');
      });

      it('should not transition from ended', () => {
        expect(transition('ended', 'START_GAME')).toBe('ended');
      });
    });

    describe('PAUSE_GAME', () => {
      it('should transition from playing to paused', () => {
        expect(transition('playing', 'PAUSE_GAME')).toBe('paused');
      });

      it('should not transition from idle', () => {
        expect(transition('idle', 'PAUSE_GAME')).toBe('idle');
      });

      it('should not transition from paused', () => {
        expect(transition('paused', 'PAUSE_GAME')).toBe('paused');
      });

      it('should not transition from ended', () => {
        expect(transition('ended', 'PAUSE_GAME')).toBe('ended');
      });
    });

    describe('RESUME_GAME', () => {
      it('should transition from paused to playing', () => {
        expect(transition('paused', 'RESUME_GAME')).toBe('playing');
      });

      it('should not transition from idle', () => {
        expect(transition('idle', 'RESUME_GAME')).toBe('idle');
      });

      it('should not transition from playing', () => {
        expect(transition('playing', 'RESUME_GAME')).toBe('playing');
      });

      it('should not transition from ended', () => {
        expect(transition('ended', 'RESUME_GAME')).toBe('ended');
      });
    });

    describe('END_GAME', () => {
      it('should transition from idle to ended', () => {
        expect(transition('idle', 'END_GAME')).toBe('ended');
      });

      it('should transition from playing to ended', () => {
        expect(transition('playing', 'END_GAME')).toBe('ended');
      });

      it('should transition from paused to ended', () => {
        expect(transition('paused', 'END_GAME')).toBe('ended');
      });

      it('should stay ended when already ended', () => {
        expect(transition('ended', 'END_GAME')).toBe('ended');
      });
    });

    describe('RESET_GAME', () => {
      it('should transition from idle to idle', () => {
        expect(transition('idle', 'RESET_GAME')).toBe('idle');
      });

      it('should transition from playing to idle', () => {
        expect(transition('playing', 'RESET_GAME')).toBe('idle');
      });

      it('should transition from paused to idle', () => {
        expect(transition('paused', 'RESET_GAME')).toBe('idle');
      });

      it('should transition from ended to idle', () => {
        expect(transition('ended', 'RESET_GAME')).toBe('idle');
      });
    });

    it('should return current state for unknown action', () => {
      expect(transition('playing', 'UNKNOWN_ACTION' as GameTransition)).toBe('playing');
    });
  });

  describe('canTransition', () => {
    describe('START_GAME', () => {
      it('should return true from idle', () => {
        expect(canTransition('idle', 'START_GAME')).toBe(true);
      });

      it('should return false from playing', () => {
        expect(canTransition('playing', 'START_GAME')).toBe(false);
      });

      it('should return false from paused', () => {
        expect(canTransition('paused', 'START_GAME')).toBe(false);
      });

      it('should return false from ended', () => {
        expect(canTransition('ended', 'START_GAME')).toBe(false);
      });
    });

    describe('PAUSE_GAME', () => {
      it('should return true from playing', () => {
        expect(canTransition('playing', 'PAUSE_GAME')).toBe(true);
      });

      it('should return false from idle', () => {
        expect(canTransition('idle', 'PAUSE_GAME')).toBe(false);
      });

      it('should return false from paused', () => {
        expect(canTransition('paused', 'PAUSE_GAME')).toBe(false);
      });

      it('should return false from ended', () => {
        expect(canTransition('ended', 'PAUSE_GAME')).toBe(false);
      });
    });

    describe('RESUME_GAME', () => {
      it('should return true from paused', () => {
        expect(canTransition('paused', 'RESUME_GAME')).toBe(true);
      });

      it('should return false from idle', () => {
        expect(canTransition('idle', 'RESUME_GAME')).toBe(false);
      });

      it('should return false from playing', () => {
        expect(canTransition('playing', 'RESUME_GAME')).toBe(false);
      });

      it('should return false from ended', () => {
        expect(canTransition('ended', 'RESUME_GAME')).toBe(false);
      });
    });

    describe('END_GAME', () => {
      it('should return false from idle', () => {
        expect(canTransition('idle', 'END_GAME')).toBe(false);
      });

      it('should return true from playing', () => {
        expect(canTransition('playing', 'END_GAME')).toBe(true);
      });

      it('should return true from paused', () => {
        expect(canTransition('paused', 'END_GAME')).toBe(true);
      });

      it('should return false from ended', () => {
        expect(canTransition('ended', 'END_GAME')).toBe(false);
      });
    });

    describe('RESET_GAME', () => {
      it('should return true from all states', () => {
        const states: GameStatus[] = ['idle', 'playing', 'paused', 'ended'];
        states.forEach((state) => {
          expect(canTransition(state, 'RESET_GAME')).toBe(true);
        });
      });
    });

    it('should return false for unknown action', () => {
      expect(canTransition('playing', 'UNKNOWN_ACTION' as GameTransition)).toBe(false);
    });
  });
});
