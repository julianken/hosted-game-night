import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from '../use-game';
import { resetAllStores } from '@/test/helpers/store';

// Mock uuid for predictable but unique values
const mockUuidCounter = vi.hoisted(() => ({ value: 0 }));
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${++mockUuidCounter.value}`),
}));

describe('useGame', () => {
  beforeEach(() => {
    resetAllStores();
  });

  describe('state properties', () => {
    it('should return all game state properties', () => {
      const { result } = renderHook(() => useGame());

      expect(result.current.sessionId).toBeDefined();
      expect(result.current.status).toBe('setup');
      expect(Array.isArray(result.current.questions)).toBe(true);
      expect(result.current.selectedQuestionIndex).toBe(0);
      expect(result.current.displayQuestionIndex).toBeNull();
      expect(result.current.currentRound).toBe(0);
      expect(result.current.totalRounds).toBe(3);
      expect(result.current.teams).toEqual([]);
      expect(result.current.showScoreboard).toBe(true);
      expect(result.current.ttsEnabled).toBe(false);
    });
  });

  describe('computed values', () => {
    it('should return derived values correctly', () => {
      const { result } = renderHook(() => useGame());

      expect(result.current.selectedQuestion).toBeDefined();
      expect(result.current.displayQuestion).toBeNull();
      expect(result.current.progress).toContain('Question');
      expect(result.current.canStart).toBe(false); // No teams
      expect(result.current.isGameOver).toBe(false);
      expect(result.current.roundProgress).toBe('Round 1 of 3');
    });

    it('should update canStart when teams added', () => {
      const { result } = renderHook(() => useGame());

      expect(result.current.canStart).toBe(false);

      act(() => {
        result.current.addTeam('Team A');
      });

      expect(result.current.canStart).toBe(true);
    });
  });

  describe('action functions', () => {
    it('should return all game action functions', () => {
      const { result } = renderHook(() => useGame());

      expect(typeof result.current.startGame).toBe('function');
      expect(typeof result.current.endGame).toBe('function');
      expect(typeof result.current.resetGame).toBe('function');
      expect(typeof result.current.selectQuestion).toBe('function');
      expect(typeof result.current.setDisplayQuestion).toBe('function');
      expect(typeof result.current.addTeam).toBe('function');
      expect(typeof result.current.removeTeam).toBe('function');
      expect(typeof result.current.renameTeam).toBe('function');
      expect(typeof result.current.adjustTeamScore).toBe('function');
      expect(typeof result.current.setTeamScore).toBe('function');
      expect(typeof result.current.completeRound).toBe('function');
      expect(typeof result.current.nextRound).toBe('function');
    });
  });

  describe('startGame', () => {
    it('should transition to playing', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.addTeam('Team A');
      });

      act(() => {
        result.current.startGame();
      });

      expect(result.current.status).toBe('playing');
    });
  });

  describe('endGame', () => {
    it('should transition to ended', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.addTeam('Team A');
        result.current.startGame();
      });

      act(() => {
        result.current.endGame();
      });

      expect(result.current.status).toBe('ended');
      expect(result.current.isGameOver).toBe(true);
    });
  });

  describe('resetGame', () => {
    it('should reset to setup state', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.addTeam('Team A');
      });

      act(() => {
        result.current.startGame();
      });

      const teamId = result.current.teams[0].id;

      act(() => {
        result.current.adjustTeamScore(teamId, 50);
      });

      act(() => {
        result.current.resetGame();
      });

      expect(result.current.status).toBe('setup');
      expect(result.current.teams[0].score).toBe(0);
    });
  });

  describe('selectQuestion', () => {
    it('should update selectedQuestionIndex', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.selectQuestion(5);
      });

      expect(result.current.selectedQuestionIndex).toBe(5);
    });
  });

  describe('setDisplayQuestion', () => {
    it('should update displayQuestionIndex', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.setDisplayQuestion(3);
      });

      expect(result.current.displayQuestionIndex).toBe(3);
      expect(result.current.displayQuestion).toBe(result.current.questions[3]);
    });

    it('should accept null to hide', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.setDisplayQuestion(3);
        result.current.setDisplayQuestion(null);
      });

      expect(result.current.displayQuestionIndex).toBeNull();
      expect(result.current.displayQuestion).toBeNull();
    });
  });

  describe('addTeam', () => {
    it('should add team to state', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.addTeam('New Team');
      });

      expect(result.current.teams).toHaveLength(1);
      expect(result.current.teams[0].name).toBe('New Team');
    });
  });

  describe('removeTeam', () => {
    it('should remove team from state', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.addTeam('Team A');
        result.current.addTeam('Team B');
      });

      const teamId = result.current.teams[0].id;

      act(() => {
        result.current.removeTeam(teamId);
      });

      expect(result.current.teams).toHaveLength(1);
      expect(result.current.teams[0].name).toBe('Team B');
    });
  });

  describe('renameTeam', () => {
    it('should update team name', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.addTeam('Old Name');
      });

      const teamId = result.current.teams[0].id;

      act(() => {
        result.current.renameTeam(teamId, 'New Name');
      });

      expect(result.current.teams[0].name).toBe('New Name');
    });
  });

  describe('adjustTeamScore', () => {
    it('should adjust team score', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.addTeam('Team A');
        result.current.startGame();
      });

      const teamId = result.current.teams[0].id;

      act(() => {
        result.current.adjustTeamScore(teamId, 10);
      });

      expect(result.current.teams[0].score).toBe(10);
    });
  });

  describe('setTeamScore', () => {
    it('should set team score directly', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.addTeam('Team A');
        result.current.startGame();
      });

      const teamId = result.current.teams[0].id;

      act(() => {
        result.current.setTeamScore(teamId, 50);
      });

      expect(result.current.teams[0].score).toBe(50);
    });
  });

  describe('round management', () => {
    it('should complete round', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.addTeam('Team A');
        result.current.startGame();
      });

      act(() => {
        result.current.completeRound();
      });

      expect(result.current.status).toBe('between_rounds');
    });

    it('should advance to next round', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.addTeam('Team A');
        result.current.startGame();
        result.current.completeRound();
      });

      act(() => {
        result.current.nextRound();
      });

      expect(result.current.currentRound).toBe(1);
      expect(result.current.status).toBe('playing');
    });
  });

  describe('re-renders', () => {
    it('should re-render when game state changes', () => {
      const { result, rerender } = renderHook(() => useGame());

      expect(result.current.teams).toHaveLength(0);

      act(() => {
        result.current.addTeam('Team A');
      });

      rerender();
      expect(result.current.teams).toHaveLength(1);
    });
  });
});
