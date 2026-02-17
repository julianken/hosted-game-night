import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSetupState,
  usePlayingState,
  useBetweenRoundsState,
  usePausedState,
  useEndedState,
  useActiveGameState,
  useGameStatus,
} from '../use-status-state';
import { useGameStore } from '@/stores/game-store';
import { resetGameStore } from '@/test/helpers/store';

// Mock uuid for predictable values
const mockUuidCounter = vi.hoisted(() => ({ value: 0 }));
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${++mockUuidCounter.value}`),
}));

describe('use-status-state hooks', () => {
  beforeEach(() => {
    resetGameStore();
  });

  // ===========================================================================
  // useSetupState
  // ===========================================================================
  describe('useSetupState', () => {
    it('returns state when in setup', () => {
      const { result } = renderHook(() => useSetupState());
      expect(result.current).not.toBeNull();
      expect(result.current?.status).toBe('setup');
    });

    it('returns null when game is playing', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();

      const { result } = renderHook(() => useSetupState());
      expect(result.current).toBeNull();
    });

    it('updates when status changes', () => {
      const { result, rerender } = renderHook(() => useSetupState());
      expect(result.current).not.toBeNull();

      act(() => {
        useGameStore.getState().addTeam('Team A');
        useGameStore.getState().startGame();
      });
      rerender();

      expect(result.current).toBeNull();
    });
  });

  // ===========================================================================
  // usePlayingState
  // ===========================================================================
  describe('usePlayingState', () => {
    it('returns null when in setup', () => {
      const { result } = renderHook(() => usePlayingState());
      expect(result.current).toBeNull();
    });

    it('returns state when game is playing', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();

      const { result } = renderHook(() => usePlayingState());
      expect(result.current).not.toBeNull();
      expect(result.current?.status).toBe('playing');
    });
  });

  // ===========================================================================
  // useBetweenRoundsState
  // ===========================================================================
  describe('useBetweenRoundsState', () => {
    it('returns null when in setup', () => {
      const { result } = renderHook(() => useBetweenRoundsState());
      expect(result.current).toBeNull();
    });

    it('returns state when between rounds', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().completeRound();

      const { result } = renderHook(() => useBetweenRoundsState());
      expect(result.current).not.toBeNull();
      expect(result.current?.status).toBe('between_rounds');
    });
  });

  // ===========================================================================
  // usePausedState
  // ===========================================================================
  describe('usePausedState', () => {
    it('returns null when not paused', () => {
      const { result } = renderHook(() => usePausedState());
      expect(result.current).toBeNull();
    });

    it('returns state when paused', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().pauseGame();

      const { result } = renderHook(() => usePausedState());
      expect(result.current).not.toBeNull();
      expect(result.current?.status).toBe('paused');
      expect(result.current?.statusBeforePause).toBe('playing');
    });
  });

  // ===========================================================================
  // useEndedState
  // ===========================================================================
  describe('useEndedState', () => {
    it('returns null when not ended', () => {
      const { result } = renderHook(() => useEndedState());
      expect(result.current).toBeNull();
    });

    it('returns state when ended', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().endGame();

      const { result } = renderHook(() => useEndedState());
      expect(result.current).not.toBeNull();
      expect(result.current?.status).toBe('ended');
    });
  });

  // ===========================================================================
  // useActiveGameState
  // ===========================================================================
  describe('useActiveGameState', () => {
    it('returns null during setup', () => {
      const { result } = renderHook(() => useActiveGameState());
      expect(result.current).toBeNull();
    });

    it('returns state during playing', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();

      const { result } = renderHook(() => useActiveGameState());
      expect(result.current).not.toBeNull();
    });

    it('returns state during between_rounds', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().completeRound();

      const { result } = renderHook(() => useActiveGameState());
      expect(result.current).not.toBeNull();
    });

    it('returns state during paused', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().pauseGame();

      const { result } = renderHook(() => useActiveGameState());
      expect(result.current).not.toBeNull();
    });

    it('returns null after game ends', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().endGame();

      const { result } = renderHook(() => useActiveGameState());
      expect(result.current).toBeNull();
    });
  });

  // ===========================================================================
  // useGameStatus
  // ===========================================================================
  describe('useGameStatus', () => {
    it('returns correct values during setup', () => {
      const { result } = renderHook(() => useGameStatus());

      expect(result.current.status).toBe('setup');
      expect(result.current.isSetup).toBe(true);
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.isBetweenRounds).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.isEnded).toBe(false);
      expect(result.current.isActive).toBe(false);
      expect(result.current.isEmergencyPause).toBe(false);
      expect(result.current.resumeTarget).toBeNull();
    });

    it('returns correct values during playing', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();

      const { result } = renderHook(() => useGameStatus());

      expect(result.current.status).toBe('playing');
      expect(result.current.isSetup).toBe(false);
      expect(result.current.isPlaying).toBe(true);
      expect(result.current.isActive).toBe(true);
      expect(result.current.resumeTarget).toBeNull();
    });

    it('returns correct values during pause from playing', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().pauseGame();

      const { result } = renderHook(() => useGameStatus());

      expect(result.current.status).toBe('paused');
      expect(result.current.isPaused).toBe(true);
      expect(result.current.isActive).toBe(true);
      expect(result.current.isEmergencyPause).toBe(false);
      expect(result.current.resumeTarget).toBe('playing');
    });

    it('returns correct values during emergency pause', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().emergencyPause();

      const { result } = renderHook(() => useGameStatus());

      expect(result.current.status).toBe('paused');
      expect(result.current.isPaused).toBe(true);
      expect(result.current.isEmergencyPause).toBe(true);
      expect(result.current.resumeTarget).toBe('playing');
    });

    it('returns correct values during between_rounds', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().completeRound();

      const { result } = renderHook(() => useGameStatus());

      expect(result.current.status).toBe('between_rounds');
      expect(result.current.isBetweenRounds).toBe(true);
      expect(result.current.isActive).toBe(true);
    });

    it('returns correct values after game ends', () => {
      useGameStore.getState().addTeam('Team A');
      useGameStore.getState().startGame();
      useGameStore.getState().endGame();

      const { result } = renderHook(() => useGameStatus());

      expect(result.current.status).toBe('ended');
      expect(result.current.isEnded).toBe(true);
      expect(result.current.isActive).toBe(false);
      expect(result.current.resumeTarget).toBeNull();
    });

    it('updates when status transitions', () => {
      const { result, rerender } = renderHook(() => useGameStatus());
      expect(result.current.isSetup).toBe(true);

      act(() => {
        useGameStore.getState().addTeam('Team A');
        useGameStore.getState().startGame();
      });
      rerender();

      expect(result.current.isSetup).toBe(false);
      expect(result.current.isPlaying).toBe(true);
    });
  });
});
