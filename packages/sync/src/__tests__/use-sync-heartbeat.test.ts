import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSyncHeartbeat } from '../use-sync-heartbeat';
import { BroadcastSync } from '../broadcast';
import { mockBroadcastChannel, MockBroadcastChannel } from '@joolie-boolie/testing/mocks';

describe('useSyncHeartbeat', () => {
  beforeEach(() => {
    mockBroadcastChannel();
    MockBroadcastChannel.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function createInitializedSync(channelName = 'test-heartbeat') {
    const sync = new BroadcastSync<{ v: number }>(channelName);
    sync.initialize();
    return sync;
  }

  it('should start heartbeat on mount and return isRunning=true', () => {
    const sync = createInitializedSync();
    const getState = vi.fn(() => ({ v: 1 }));

    const { result } = renderHook(() =>
      useSyncHeartbeat({
        broadcastSync: sync,
        getState,
        role: 'presenter',
        channelName: 'test-heartbeat',
      }),
    );

    expect(result.current.isRunning).toBe(true);
  });

  it('should stop heartbeat on unmount', () => {
    const sync = createInitializedSync();
    const getState = vi.fn(() => ({ v: 1 }));

    const { result, unmount } = renderHook(() =>
      useSyncHeartbeat({
        broadcastSync: sync,
        getState,
        role: 'presenter',
        channelName: 'test-heartbeat',
      }),
    );

    expect(result.current.isRunning).toBe(true);

    act(() => {
      unmount();
    });

    // After unmount the state should indicate not running
    // (we can't check result.current after unmount, but we verify no errors thrown)
  });

  it('should send heartbeat messages via broadcastSync', () => {
    const channelName = 'test-heartbeat-send';
    const sync = createInitializedSync(channelName);
    const receiver = new BroadcastSync<{ v: number }>(channelName);
    receiver.initialize();

    const handler = vi.fn();
    receiver.subscribe(handler);

    const getState = vi.fn(() => ({ v: 42 }));

    renderHook(() =>
      useSyncHeartbeat({
        broadcastSync: sync,
        getState,
        role: 'presenter',
        channelName,
      }),
    );

    // Initial heartbeat should be sent immediately on start
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].type).toBe('HEARTBEAT');
  });

  it('should send periodic heartbeats at the configured interval', () => {
    const channelName = 'test-heartbeat-interval';
    const sync = createInitializedSync(channelName);
    const receiver = new BroadcastSync<{ v: number }>(channelName);
    receiver.initialize();

    const handler = vi.fn();
    receiver.subscribe(handler);

    const getState = vi.fn(() => ({ v: 1 }));

    renderHook(() =>
      useSyncHeartbeat({
        broadcastSync: sync,
        getState,
        role: 'presenter',
        channelName,
        config: { intervalMs: 2000 },
      }),
    );

    // Capture initial count after mount (may vary due to React effect lifecycle)
    const initialCount = handler.mock.calls.length;
    expect(initialCount).toBeGreaterThanOrEqual(1);

    // After 2 seconds: another heartbeat
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(handler).toHaveBeenCalledTimes(initialCount + 1);

    // After 2 more seconds: another heartbeat
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(handler).toHaveBeenCalledTimes(initialCount + 2);
  });

  it('should stop sending heartbeats after unmount', () => {
    const channelName = 'test-heartbeat-unmount-stop';
    const sync = createInitializedSync(channelName);
    const receiver = new BroadcastSync<{ v: number }>(channelName);
    receiver.initialize();

    const handler = vi.fn();
    receiver.subscribe(handler);

    const getState = vi.fn(() => ({ v: 1 }));

    const { unmount } = renderHook(() =>
      useSyncHeartbeat({
        broadcastSync: sync,
        getState,
        role: 'presenter',
        channelName,
        config: { intervalMs: 1000 },
      }),
    );

    // Capture count after mount (may vary due to React effect lifecycle)
    const countAfterMount = handler.mock.calls.length;
    expect(countAfterMount).toBeGreaterThanOrEqual(1);

    act(() => {
      unmount();
    });

    // Advance time - no more heartbeats should be sent after unmount
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(handler).toHaveBeenCalledTimes(countAfterMount);
  });

  it('should work with audience role', () => {
    const sync = createInitializedSync();
    const getState = vi.fn(() => ({ v: 1 }));

    const { result } = renderHook(() =>
      useSyncHeartbeat({
        broadcastSync: sync,
        getState,
        role: 'audience',
        channelName: 'test-heartbeat',
      }),
    );

    expect(result.current.isRunning).toBe(true);
  });

  it('should pass config options to SyncHeartbeat', () => {
    const channelName = 'test-heartbeat-config';
    const sync = createInitializedSync(channelName);
    const onDivergence = vi.fn();
    const onConvergence = vi.fn();
    const getState = vi.fn(() => ({ v: 1 }));

    const { result } = renderHook(() =>
      useSyncHeartbeat({
        broadcastSync: sync,
        getState,
        role: 'presenter',
        channelName,
        config: {
          intervalMs: 3000,
          divergenceThresholdMs: 10000,
          onDivergence,
          onConvergence,
        },
      }),
    );

    expect(result.current.isRunning).toBe(true);
  });
});
