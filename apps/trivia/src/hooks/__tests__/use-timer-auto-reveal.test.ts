import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimerAutoReveal } from '../use-timer-auto-reveal';
import { useGameStore } from '@/stores/game-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Set the game store's timer state directly. This bypasses the engine's
 * pure-function pipeline so we can test the hook in isolation.
 */
function setTimerState(patch: {
  remaining?: number;
  duration?: number;
  isRunning?: boolean;
}) {
  const current = useGameStore.getState().timer;
  useGameStore.setState({
    timer: { ...current, ...patch },
  });
}

/** Mock for advanceScene that we inject into the store. */
let mockAdvanceScene: ReturnType<typeof vi.fn<(trigger: string) => void>>;

/** Default hook options for a "ready to auto-reveal" scenario. */
const defaultOptions = () => ({
  selectedQuestionIndex: 0,
  displayQuestionIndex: null as number | null,
  autoRevealEnabled: true,
  onAutoReveal: vi.fn(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTimerAutoReveal', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Create a fresh mock for advanceScene
    mockAdvanceScene = vi.fn<(trigger: string) => void>();

    // Reset store to a clean playing state with a running timer at 5 s.
    // Inject our mock advanceScene so the hook's
    // `useGameStore.getState().advanceScene('auto')` calls it.
    useGameStore.setState({
      status: 'playing',
      timer: { duration: 30, remaining: 5, isRunning: true },
      audienceScene: 'question_display',
      selectedQuestionIndex: 0,
      displayQuestionIndex: null,
      advanceScene: mockAdvanceScene,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // 1. Guard: autoRevealEnabled === false
  // -------------------------------------------------------------------------
  it('does not trigger when autoRevealEnabled is false', () => {
    const opts = { ...defaultOptions(), autoRevealEnabled: false };

    renderHook(() => useTimerAutoReveal(opts));

    // Simulate timer reaching 0
    act(() => setTimerState({ remaining: 0 }));

    expect(mockAdvanceScene).not.toHaveBeenCalled();
    expect(opts.onAutoReveal).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 2. Guard: timer is not running
  // -------------------------------------------------------------------------
  it('does not trigger when timer is not running', () => {
    // Start with timer stopped
    setTimerState({ isRunning: false, remaining: 5 });

    const opts = defaultOptions();

    renderHook(() => useTimerAutoReveal(opts));

    // Timer goes to 0 but isRunning is false
    act(() => setTimerState({ remaining: 0 }));

    expect(mockAdvanceScene).not.toHaveBeenCalled();
    expect(opts.onAutoReveal).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3. Core: timer transition from >0 to 0 triggers advanceScene('auto')
  // -------------------------------------------------------------------------
  it('calls advanceScene("auto") when timer transitions from >0 to 0', () => {
    const opts = defaultOptions();

    renderHook(() => useTimerAutoReveal(opts));

    // Transition remaining from 5 -> 0
    act(() => setTimerState({ remaining: 0 }));

    expect(mockAdvanceScene).toHaveBeenCalledWith('auto');
    expect(mockAdvanceScene).toHaveBeenCalledTimes(1);
    expect(opts.onAutoReveal).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // 4. Flash: isFlashing true on trigger, false after FLASH_DURATION_MS
  // -------------------------------------------------------------------------
  it('sets isFlashing to true on trigger and clears it after 2000 ms', () => {
    const opts = defaultOptions();

    const { result } = renderHook(() => useTimerAutoReveal(opts));

    // Before trigger
    expect(result.current.isFlashing).toBe(false);

    // Trigger auto-reveal
    act(() => setTimerState({ remaining: 0 }));

    expect(result.current.isFlashing).toBe(true);

    // Advance past flash duration (2000 ms)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.isFlashing).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 5. Duplicate prevention: same question does not re-trigger
  // -------------------------------------------------------------------------
  it('prevents duplicate auto-reveal for the same question', () => {
    const opts = defaultOptions();

    renderHook(() => useTimerAutoReveal(opts));

    // First trigger
    act(() => setTimerState({ remaining: 0 }));
    expect(mockAdvanceScene).toHaveBeenCalledTimes(1);

    // Reset timer as if a new countdown started for the same question
    act(() => setTimerState({ remaining: 10, isRunning: true }));

    // Second trigger for the same question index (0)
    act(() => setTimerState({ remaining: 0 }));

    // Should still be 1 call total -- no duplicate
    expect(mockAdvanceScene).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // 6. Guard: question already displayed
  // -------------------------------------------------------------------------
  it('does not trigger when the question is already displayed', () => {
    // displayQuestionIndex matches selectedQuestionIndex
    const opts = {
      ...defaultOptions(),
      displayQuestionIndex: 0,
      selectedQuestionIndex: 0,
    };

    renderHook(() => useTimerAutoReveal(opts));

    act(() => setTimerState({ remaining: 0 }));

    expect(mockAdvanceScene).not.toHaveBeenCalled();
    expect(opts.onAutoReveal).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 7. Reset tracking: changing question allows a new auto-reveal
  // -------------------------------------------------------------------------
  it('resets auto-reveal tracking when the question changes', () => {
    const opts = defaultOptions();

    const { rerender } = renderHook(
      (props: ReturnType<typeof defaultOptions>) => useTimerAutoReveal(props),
      { initialProps: opts },
    );

    // First question auto-reveal
    act(() => setTimerState({ remaining: 0 }));
    expect(mockAdvanceScene).toHaveBeenCalledTimes(1);

    // Move to a new question and restart timer
    act(() => setTimerState({ remaining: 10, isRunning: true }));

    const newOpts = {
      ...opts,
      selectedQuestionIndex: 1,
      displayQuestionIndex: null,
    };

    rerender(newOpts);

    // Timer expires for the new question
    act(() => setTimerState({ remaining: 0 }));

    expect(mockAdvanceScene).toHaveBeenCalledTimes(2);
    expect(opts.onAutoReveal).toHaveBeenCalledTimes(2);
  });
});
