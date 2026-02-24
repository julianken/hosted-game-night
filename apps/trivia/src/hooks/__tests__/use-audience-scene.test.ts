import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudienceScene } from '../use-audience-scene';
import { useGameStore } from '@/stores/game-store';
import { resetGameStore } from '@/test/helpers/store';
import { SCENE_TIMING } from '@/types/audience-scene';

// Mock uuid for predictable values
const mockUuidCounter = vi.hoisted(() => ({ value: 0 }));
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${++mockUuidCounter.value}`),
}));

describe('useAudienceScene', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetGameStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // Scene derivation from store
  // ===========================================================================

  it('should return the current audienceScene from the store', () => {
    const { result } = renderHook(() =>
      useAudienceScene({ role: 'presenter' }),
    );

    expect(result.current.scene).toBe('waiting');
  });

  it('should reflect audienceScene changes from the store', () => {
    const { result } = renderHook(() =>
      useAudienceScene({ role: 'presenter' }),
    );

    act(() => {
      useGameStore.setState({ audienceScene: 'game_intro' });
    });

    expect(result.current.scene).toBe('game_intro');
  });

  // ===========================================================================
  // Audience role
  // ===========================================================================

  it('should return null timeRemaining for audience role', () => {
    useGameStore.setState({ audienceScene: 'game_intro' });

    const { result } = renderHook(() =>
      useAudienceScene({ role: 'audience' }),
    );

    expect(result.current.scene).toBe('game_intro');
    expect(result.current.timeRemaining).toBeNull();
  });

  // ===========================================================================
  // Timer integration (presenter role)
  // ===========================================================================

  it('should set timeRemaining for timed scenes in presenter role', () => {
    const { result } = renderHook(() =>
      useAudienceScene({ role: 'presenter' }),
    );

    act(() => {
      useGameStore.setState({ audienceScene: 'game_intro' });
    });

    expect(result.current.timeRemaining).toBe(SCENE_TIMING.GAME_INTRO_MS);
  });

  it('should count down timeRemaining on 100ms intervals', () => {
    const { result } = renderHook(() =>
      useAudienceScene({ role: 'presenter' }),
    );

    act(() => {
      useGameStore.setState({ audienceScene: 'game_intro' });
    });

    expect(result.current.timeRemaining).toBe(SCENE_TIMING.GAME_INTRO_MS);

    // Advance by 500ms (5 intervals of 100ms)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // timeRemaining should have decreased (allowing for timer imprecision)
    expect(result.current.timeRemaining).toBeLessThanOrEqual(
      SCENE_TIMING.GAME_INTRO_MS - 400,
    );
    expect(result.current.timeRemaining).toBeGreaterThanOrEqual(0);
  });

  it('should set timeRemaining to 0 when the timed scene duration expires', () => {
    const { result } = renderHook(() =>
      useAudienceScene({ role: 'presenter' }),
    );

    act(() => {
      useGameStore.setState({ audienceScene: 'question_anticipation' });
    });

    expect(result.current.timeRemaining).toBe(
      SCENE_TIMING.QUESTION_ANTICIPATION_MS,
    );

    act(() => {
      vi.advanceTimersByTime(SCENE_TIMING.QUESTION_ANTICIPATION_MS + 100);
    });

    expect(result.current.timeRemaining).toBe(0);
  });

  it('should return null timeRemaining for non-timed scenes', () => {
    const { result } = renderHook(() =>
      useAudienceScene({ role: 'presenter' }),
    );

    act(() => {
      useGameStore.setState({ audienceScene: 'question_display' });
    });

    expect(result.current.timeRemaining).toBeNull();
  });

  // ===========================================================================
  // Final round: extended round_intro duration
  // ===========================================================================

  it('should use extended duration for round_intro on the final round', () => {
    useGameStore.setState({
      currentRound: 2,
      totalRounds: 3,
    });

    const { result } = renderHook(() =>
      useAudienceScene({ role: 'presenter' }),
    );

    act(() => {
      useGameStore.setState({ audienceScene: 'round_intro' });
    });

    // Final round (currentRound >= totalRounds - 1) uses 5000ms
    expect(result.current.timeRemaining).toBe(
      SCENE_TIMING.ROUND_INTRO_FINAL_MS,
    );
  });

  it('should use standard duration for round_intro on non-final rounds', () => {
    useGameStore.setState({
      currentRound: 0,
      totalRounds: 3,
    });

    const { result } = renderHook(() =>
      useAudienceScene({ role: 'presenter' }),
    );

    act(() => {
      useGameStore.setState({ audienceScene: 'round_intro' });
    });

    // Non-final round uses 4000ms
    expect(result.current.timeRemaining).toBe(SCENE_TIMING.ROUND_INTRO_MS);
  });
});
