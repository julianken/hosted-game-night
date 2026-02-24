import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuickScore } from '../use-quick-score';
import { useGameStore } from '@/stores/game-store';
import { resetGameStore } from '@/test/helpers/store';

// Mock uuid for predictable values
const mockUuidCounter = vi.hoisted(() => ({ value: 0 }));
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${++mockUuidCounter.value}`),
}));

describe('useQuickScore', () => {
  let teamAId: string;
  let teamBId: string;

  beforeEach(() => {
    resetGameStore();
    // Seed store with teams
    useGameStore.getState().addTeam('Team A');
    useGameStore.getState().addTeam('Team B');
    const teams = useGameStore.getState().teams;
    teamAId = teams[0].id;
    teamBId = teams[1].id;
  });

  // ===========================================================================
  // Initial state
  // ===========================================================================

  it('should start with an empty scoredTeamIds set', () => {
    const { result } = renderHook(() => useQuickScore(0));

    expect(result.current.scoredTeamIds.size).toBe(0);
    expect(result.current.isTeamScored(teamAId)).toBe(false);
    expect(result.current.isTeamScored(teamBId)).toBe(false);
  });

  // ===========================================================================
  // toggleTeam: score increment
  // ===========================================================================

  it('should add a team to scoredTeamIds and increment score on first toggle', () => {
    const { result } = renderHook(() => useQuickScore(0));

    act(() => {
      result.current.toggleTeam(teamAId);
    });

    expect(result.current.isTeamScored(teamAId)).toBe(true);
    expect(result.current.scoredTeamIds.has(teamAId)).toBe(true);

    // Score should have been incremented by 1 in the store
    const team = useGameStore.getState().teams.find((t) => t.id === teamAId);
    expect(team?.score).toBe(1);
  });

  // ===========================================================================
  // toggleTeam: score decrement (toggle off)
  // ===========================================================================

  it('should remove a team from scoredTeamIds and decrement score on second toggle', () => {
    const { result } = renderHook(() => useQuickScore(0));

    // Toggle on
    act(() => {
      result.current.toggleTeam(teamAId);
    });

    // Toggle off
    act(() => {
      result.current.toggleTeam(teamAId);
    });

    expect(result.current.isTeamScored(teamAId)).toBe(false);
    expect(result.current.scoredTeamIds.has(teamAId)).toBe(false);

    // Score should be back to 0
    const team = useGameStore.getState().teams.find((t) => t.id === teamAId);
    expect(team?.score).toBe(0);
  });

  // ===========================================================================
  // Multiple teams
  // ===========================================================================

  it('should track scoring for multiple teams independently', () => {
    const { result } = renderHook(() => useQuickScore(0));

    act(() => {
      result.current.toggleTeam(teamAId);
    });

    act(() => {
      result.current.toggleTeam(teamBId);
    });

    expect(result.current.isTeamScored(teamAId)).toBe(true);
    expect(result.current.isTeamScored(teamBId)).toBe(true);
    expect(result.current.scoredTeamIds.size).toBe(2);

    const teams = useGameStore.getState().teams;
    expect(teams.find((t) => t.id === teamAId)?.score).toBe(1);
    expect(teams.find((t) => t.id === teamBId)?.score).toBe(1);
  });

  // ===========================================================================
  // Undo
  // ===========================================================================

  it('should undo the last toggle action (reverse add)', () => {
    const { result } = renderHook(() => useQuickScore(0));

    act(() => {
      result.current.toggleTeam(teamAId);
    });

    expect(result.current.isTeamScored(teamAId)).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.isTeamScored(teamAId)).toBe(false);
    const team = useGameStore.getState().teams.find((t) => t.id === teamAId);
    expect(team?.score).toBe(0);
  });

  it('should be a no-op when undo is called with empty history', () => {
    const { result } = renderHook(() => useQuickScore(0));

    // Calling undo with no history should not throw or change anything
    act(() => {
      result.current.undo();
    });

    expect(result.current.scoredTeamIds.size).toBe(0);
  });

  // ===========================================================================
  // Clear
  // ===========================================================================

  it('should clear scoredTeamIds and history without reversing scores', () => {
    const { result } = renderHook(() => useQuickScore(0));

    act(() => {
      result.current.toggleTeam(teamAId);
      result.current.toggleTeam(teamBId);
    });

    expect(result.current.scoredTeamIds.size).toBe(2);

    act(() => {
      result.current.clear();
    });

    expect(result.current.scoredTeamIds.size).toBe(0);
    expect(result.current.isTeamScored(teamAId)).toBe(false);
    expect(result.current.isTeamScored(teamBId)).toBe(false);

    // Scores should NOT be reversed by clear (only tracking state resets)
    const teams = useGameStore.getState().teams;
    expect(teams.find((t) => t.id === teamAId)?.score).toBe(1);
    expect(teams.find((t) => t.id === teamBId)?.score).toBe(1);
  });

  // ===========================================================================
  // Question change resets state
  // ===========================================================================

  it('should reset scoredTeamIds and history when selectedQuestionIndex changes', () => {
    const { result, rerender } = renderHook(
      ({ questionIndex }) => useQuickScore(questionIndex),
      { initialProps: { questionIndex: 0 } },
    );

    act(() => {
      result.current.toggleTeam(teamAId);
    });

    expect(result.current.isTeamScored(teamAId)).toBe(true);

    // Change question index
    rerender({ questionIndex: 1 });

    expect(result.current.scoredTeamIds.size).toBe(0);
    expect(result.current.isTeamScored(teamAId)).toBe(false);
  });
});
