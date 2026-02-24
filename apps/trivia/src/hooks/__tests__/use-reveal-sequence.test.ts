import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRevealSequence } from '../use-reveal-sequence';
import { useGameStore } from '@/stores/game-store';
import { resetGameStore } from '@/test/helpers/store';
import { REVEAL_TIMING } from '@/types/audience-scene';

// Mock uuid for predictable values
const mockUuidCounter = vi.hoisted(() => ({ value: 0 }));
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${++mockUuidCounter.value}`),
}));

describe('useRevealSequence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetGameStore();
    // Seed store with teams for score snapshot testing
    useGameStore.getState().addTeam('Alpha');
    useGameStore.getState().addTeam('Bravo');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // Initial state
  // ===========================================================================

  it('should start with null revealPhase and no reveal in progress', () => {
    const { result } = renderHook(() =>
      useRevealSequence({
        questionIndex: 0,
        revealedAnswer: 'Paris',
      }),
    );

    expect(result.current.revealPhase).toBeNull();
    expect(result.current.isRevealing).toBe(false);
    expect(result.current.canReveal).toBe(true);
    expect(result.current.previousScores).toBeNull();
  });

  // ===========================================================================
  // Phase transitions: null -> freeze -> dim_wrong -> illuminate -> null
  // ===========================================================================

  it('should transition to freeze phase immediately on triggerReveal', () => {
    const { result } = renderHook(() =>
      useRevealSequence({
        questionIndex: 0,
        revealedAnswer: 'Paris',
      }),
    );

    act(() => {
      result.current.triggerReveal();
    });

    expect(result.current.revealPhase).toBe('freeze');
    expect(result.current.isRevealing).toBe(true);
  });

  it('should transition to dim_wrong after DIM_WRONG_START_MS', () => {
    const { result } = renderHook(() =>
      useRevealSequence({
        questionIndex: 0,
        revealedAnswer: 'Paris',
      }),
    );

    act(() => {
      result.current.triggerReveal();
    });

    act(() => {
      vi.advanceTimersByTime(REVEAL_TIMING.DIM_WRONG_START_MS);
    });

    expect(result.current.revealPhase).toBe('dim_wrong');
    expect(result.current.isRevealing).toBe(true);
  });

  it('should transition to illuminate after ILLUMINATE_START_MS', () => {
    const { result } = renderHook(() =>
      useRevealSequence({
        questionIndex: 0,
        revealedAnswer: 'Paris',
      }),
    );

    act(() => {
      result.current.triggerReveal();
    });

    act(() => {
      vi.advanceTimersByTime(REVEAL_TIMING.ILLUMINATE_START_MS);
    });

    expect(result.current.revealPhase).toBe('illuminate');
    expect(result.current.isRevealing).toBe(true);
  });

  // ===========================================================================
  // POST_REVEAL_LOCK behavior
  // ===========================================================================

  it('should clear isRevealing after POST_REVEAL_LOCK_MS and call onRevealComplete', () => {
    const onRevealComplete = vi.fn();

    const { result } = renderHook(() =>
      useRevealSequence({
        questionIndex: 0,
        revealedAnswer: 'Paris',
        onRevealComplete,
      }),
    );

    act(() => {
      result.current.triggerReveal();
    });

    expect(result.current.isRevealing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(REVEAL_TIMING.POST_REVEAL_LOCK_MS);
    });

    expect(result.current.isRevealing).toBe(false);
    expect(onRevealComplete).toHaveBeenCalledTimes(1);
  });

  // ===========================================================================
  // onPhaseChange callback
  // ===========================================================================

  it('should call onPhaseChange for each phase transition', () => {
    const onPhaseChange = vi.fn();

    const { result } = renderHook(() =>
      useRevealSequence({
        questionIndex: 0,
        revealedAnswer: 'Paris',
        onPhaseChange,
      }),
    );

    act(() => {
      result.current.triggerReveal();
    });

    expect(onPhaseChange).toHaveBeenCalledWith('freeze');

    act(() => {
      vi.advanceTimersByTime(REVEAL_TIMING.DIM_WRONG_START_MS);
    });

    expect(onPhaseChange).toHaveBeenCalledWith('dim_wrong');

    act(() => {
      vi.advanceTimersByTime(
        REVEAL_TIMING.ILLUMINATE_START_MS - REVEAL_TIMING.DIM_WRONG_START_MS,
      );
    });

    expect(onPhaseChange).toHaveBeenCalledWith('illuminate');
    expect(onPhaseChange).toHaveBeenCalledTimes(3);
  });

  // ===========================================================================
  // Double-trigger prevention
  // ===========================================================================

  it('should prevent double-trigger while isRevealing is true', () => {
    const onPhaseChange = vi.fn();

    const { result } = renderHook(() =>
      useRevealSequence({
        questionIndex: 0,
        revealedAnswer: 'Paris',
        onPhaseChange,
      }),
    );

    act(() => {
      result.current.triggerReveal();
    });

    expect(result.current.canReveal).toBe(false);

    // Try triggering again during reveal -- should be a no-op
    act(() => {
      result.current.triggerReveal();
    });

    // onPhaseChange should only have been called once for 'freeze'
    expect(onPhaseChange).toHaveBeenCalledTimes(1);
  });

  it('should not trigger when revealedAnswer is null', () => {
    const onPhaseChange = vi.fn();

    const { result } = renderHook(() =>
      useRevealSequence({
        questionIndex: 0,
        revealedAnswer: null,
        onPhaseChange,
      }),
    );

    expect(result.current.canReveal).toBe(false);

    act(() => {
      result.current.triggerReveal();
    });

    expect(result.current.revealPhase).toBeNull();
    expect(onPhaseChange).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // Score snapshot
  // ===========================================================================

  it('should capture team scores as previousScores on triggerReveal', () => {
    const teams = useGameStore.getState().teams;
    // Set initial scores
    useGameStore.getState().adjustTeamScore(teams[0].id, 5);
    useGameStore.getState().adjustTeamScore(teams[1].id, 3);

    const { result } = renderHook(() =>
      useRevealSequence({
        questionIndex: 0,
        revealedAnswer: 'Paris',
      }),
    );

    act(() => {
      result.current.triggerReveal();
    });

    expect(result.current.previousScores).not.toBeNull();
    expect(result.current.previousScores![teams[0].id]).toBe(5);
    expect(result.current.previousScores![teams[1].id]).toBe(3);
  });

  // ===========================================================================
  // resetReveal
  // ===========================================================================

  it('should reset phase and isRevealing without firing callbacks', () => {
    const onPhaseChange = vi.fn();

    const { result } = renderHook(() =>
      useRevealSequence({
        questionIndex: 0,
        revealedAnswer: 'Paris',
        onPhaseChange,
      }),
    );

    act(() => {
      result.current.triggerReveal();
    });

    onPhaseChange.mockClear();

    act(() => {
      result.current.resetReveal();
    });

    expect(result.current.revealPhase).toBeNull();
    expect(result.current.isRevealing).toBe(false);
    // resetReveal should NOT fire onPhaseChange
    expect(onPhaseChange).not.toHaveBeenCalled();
  });
});
