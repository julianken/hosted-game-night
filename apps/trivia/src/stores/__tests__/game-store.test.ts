import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore, useGameSelectors } from '../game-store';
import { createInitialState } from '@/lib/game/engine';
import { renderHook, act } from '@testing-library/react';
import { resetGameStore } from '@/test/helpers/store';
import { DEFAULT_ROUNDS } from '@/types';

// Mock uuid for predictable but unique values
const mockUuidCounter = vi.hoisted(() => ({ value: 0 }));
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${++mockUuidCounter.value}`),
}));

describe('useGameStore', () => {
  beforeEach(() => {
    resetGameStore();
  });

  describe('initial state', () => {
    it('should match createInitialState()', () => {
      const state = useGameStore.getState();

      // sessionId is generated at module load, not at test time
      expect(state.sessionId).toMatch(/^mock-uuid-\d+$/);
      expect(state.status).toBe('setup');
      expect(state.selectedQuestionIndex).toBe(0);
      expect(state.displayQuestionIndex).toBeNull();
      expect(state.currentRound).toBe(0);
      expect(state.totalRounds).toBe(3);
      expect(state.teams).toEqual([]);
    });
  });

  describe('startGame', () => {
    it('should call engine and update state', () => {
      const store = useGameStore.getState();
      store.addTeam('Test Team');
      store.startGame();

      const newState = useGameStore.getState();
      expect(newState.status).toBe('playing');
    });
  });

  describe('endGame', () => {
    it('should call engine and update state', () => {
      const store = useGameStore.getState();
      store.addTeam('Test Team');
      store.startGame();
      store.endGame();

      const newState = useGameStore.getState();
      expect(newState.status).toBe('ended');
    });
  });

  describe('resetGame', () => {
    it('should call engine and update state', () => {
      const store = useGameStore.getState();
      store.addTeam('Test Team');
      store.startGame();
      store.adjustTeamScore(useGameStore.getState().teams[0].id, 100);
      store.resetGame();

      const newState = useGameStore.getState();
      expect(newState.status).toBe('setup');
      expect(newState.teams[0].score).toBe(0);
    });
  });

  describe('selectQuestion', () => {
    it('should update selectedQuestionIndex', () => {
      useGameStore.getState().selectQuestion(5);
      expect(useGameStore.getState().selectedQuestionIndex).toBe(5);
    });
  });

  describe('setDisplayQuestion', () => {
    it('should update displayQuestionIndex', () => {
      useGameStore.getState().setDisplayQuestion(3);
      expect(useGameStore.getState().displayQuestionIndex).toBe(3);
    });

    it('should accept null', () => {
      useGameStore.getState().setDisplayQuestion(3);
      useGameStore.getState().setDisplayQuestion(null);
      expect(useGameStore.getState().displayQuestionIndex).toBeNull();
    });
  });

  describe('addTeam', () => {
    it('should add team to state', () => {
      useGameStore.getState().addTeam('New Team');
      expect(useGameStore.getState().teams).toHaveLength(1);
      expect(useGameStore.getState().teams[0].name).toBe('New Team');
    });

    it('should use default name if not provided', () => {
      useGameStore.getState().addTeam();
      expect(useGameStore.getState().teams[0].name).toBe('Table 1');
    });
  });

  describe('removeTeam', () => {
    it('should remove team from state', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().addTeam('Team B');
      const teamId = useGameStore.getState().teams[0].id;
      useGameStore.getState().removeTeam(teamId);

      expect(useGameStore.getState().teams).toHaveLength(1);
      expect(useGameStore.getState().teams[0].name).toBe('Team B');
    });
  });

  describe('renameTeam', () => {
    it('should update team name', () => {
      useGameStore.getState().addTeam('Old Name');
      const teamId = useGameStore.getState().teams[0].id;
      useGameStore.getState().renameTeam(teamId, 'New Name');

      expect(useGameStore.getState().teams[0].name).toBe('New Name');
    });
  });

  describe('adjustTeamScore', () => {
    it('should adjust team score', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      const teamId = useGameStore.getState().teams[0].id;
      useGameStore.getState().adjustTeamScore(teamId, 10);

      expect(useGameStore.getState().teams[0].score).toBe(10);
    });
  });

  describe('setTeamScore', () => {
    it('should set team score directly', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      const teamId = useGameStore.getState().teams[0].id;
      useGameStore.getState().setTeamScore(teamId, 50);

      expect(useGameStore.getState().teams[0].score).toBe(50);
    });
  });

  describe('completeRound', () => {
    it('should transition to between_rounds', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().completeRound();

      expect(useGameStore.getState().status).toBe('between_rounds');
    });
  });

  describe('nextRound', () => {
    it('should advance to next round', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().completeRound();
      useGameStore.getState().nextRound();

      expect(useGameStore.getState().currentRound).toBe(1);
      expect(useGameStore.getState().status).toBe('playing');
    });
  });

  describe('_hydrate', () => {
    it('should merge partial state', () => {
      const originalState = useGameStore.getState();
      useGameStore.getState()._hydrate({
        status: 'playing',
        currentRound: 2,
      });

      const newState = useGameStore.getState();
      expect(newState.status).toBe('playing');
      expect(newState.currentRound).toBe(2);
      expect(newState.sessionId).toBe(originalState.sessionId);
    });
  });

  describe('subscribers', () => {
    it('should notify on changes', () => {
      const callback = vi.fn();
      const unsubscribe = useGameStore.subscribe(callback);

      useGameStore.getState().addTeam('Test');

      expect(callback).toHaveBeenCalled();
      unsubscribe();
    });
  });
});

describe('useGameSelectors', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('should return derived values', () => {
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().startGame();

    const { result } = renderHook(() => useGameSelectors());

    expect(result.current.selectedQuestion).toBeDefined();
    expect(result.current.progress).toContain('Question');
    expect(result.current.canStart).toBe(false); // Already started
    expect(result.current.isGameOver).toBe(false);
    expect(result.current.roundProgress).toBe('Round 1 of 3');
  });

  it('should update when store changes', () => {
    useGameStore.getState().addTeam('Team A');

    const { result, rerender } = renderHook(() => useGameSelectors());
    expect(result.current.canStart).toBe(true);

    act(() => {
      useGameStore.getState().startGame();
    });
    rerender();

    expect(result.current.canStart).toBe(false);
    expect(result.current.isGameOver).toBe(false);
  });
});
