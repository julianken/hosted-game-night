import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BroadcastSync } from '../broadcast';
import { SyncHeartbeat } from '../heartbeat';
import { HeartbeatDivergence } from '../types';
import { mockBroadcastChannel, MockBroadcastChannel } from '@joolie-boolie/testing/mocks';

describe('SyncHeartbeat', () => {
  beforeEach(() => {
    mockBroadcastChannel();
    MockBroadcastChannel.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function createSyncPair<T>(channelName = 'test-heartbeat') {
    const presenter = new BroadcastSync<T>(channelName);
    const audience = new BroadcastSync<T>(channelName);
    presenter.initialize();
    audience.initialize();
    return { presenter, audience };
  }

  describe('constructor and lifecycle', () => {
    it('should create a heartbeat instance', () => {
      const { presenter } = createSyncPair();
      const getState = () => ({ count: 1 });
      const heartbeat = new SyncHeartbeat(presenter, getState, 'presenter', 'test-ch');
      expect(heartbeat).toBeDefined();
      expect(heartbeat.isRunning).toBe(false);
    });

    it('should start and stop', () => {
      const { presenter } = createSyncPair();
      const getState = () => ({ count: 1 });
      const heartbeat = new SyncHeartbeat(presenter, getState, 'presenter', 'test-ch');

      heartbeat.start();
      expect(heartbeat.isRunning).toBe(true);

      heartbeat.stop();
      expect(heartbeat.isRunning).toBe(false);
    });

    it('should be idempotent on start', () => {
      const { presenter } = createSyncPair();
      const getState = () => ({ count: 1 });
      const heartbeat = new SyncHeartbeat(presenter, getState, 'presenter', 'test-ch');

      heartbeat.start();
      heartbeat.start(); // second call should be no-op
      expect(heartbeat.isRunning).toBe(true);

      heartbeat.stop();
      expect(heartbeat.isRunning).toBe(false);
    });

    it('should be idempotent on stop', () => {
      const { presenter } = createSyncPair();
      const getState = () => ({ count: 1 });
      const heartbeat = new SyncHeartbeat(presenter, getState, 'presenter', 'test-ch');

      heartbeat.stop(); // should not throw when not running
      expect(heartbeat.isRunning).toBe(false);
    });
  });

  describe('divergence detection', () => {
    it('should not report divergence when states match', () => {
      const { presenter, audience } = createSyncPair<{ count: number }>('heartbeat-match');
      const sharedState = { count: 42 };
      const onDivergence = vi.fn();

      const presenterHb = new SyncHeartbeat(
        presenter,
        () => sharedState,
        'presenter',
        'heartbeat-match',
        { intervalMs: 1000, divergenceThresholdMs: 3000, onDivergence },
      );
      const audienceHb = new SyncHeartbeat(
        audience,
        () => sharedState,
        'audience',
        'heartbeat-match',
        { intervalMs: 1000, divergenceThresholdMs: 3000, onDivergence },
      );

      presenterHb.start();
      audienceHb.start();

      // Advance past several heartbeat intervals
      vi.advanceTimersByTime(10_000);

      expect(onDivergence).not.toHaveBeenCalled();

      presenterHb.stop();
      audienceHb.stop();
    });

    it('should report divergence after threshold when states differ', () => {
      const { presenter, audience } = createSyncPair<{ count: number }>('heartbeat-diverge');
      const onDivergence = vi.fn();

      // Presenter and audience have different states
      const presenterHb = new SyncHeartbeat(
        presenter,
        () => ({ count: 1 }),
        'presenter',
        'heartbeat-diverge',
        { intervalMs: 1000, divergenceThresholdMs: 3000, onDivergence },
      );
      const audienceHb = new SyncHeartbeat(
        audience,
        () => ({ count: 2 }), // different state!
        'audience',
        'heartbeat-diverge',
        { intervalMs: 1000, divergenceThresholdMs: 3000, onDivergence },
      );

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      presenterHb.start();
      audienceHb.start();

      // After 1 second: first heartbeat exchange detects divergence, starts timer
      vi.advanceTimersByTime(1000);

      // After 3 more seconds: divergence threshold exceeded
      vi.advanceTimersByTime(3000);

      // Divergence should be reported on at least one side
      expect(onDivergence).toHaveBeenCalled();
      const call = onDivergence.mock.calls[0][0] as HeartbeatDivergence;
      expect(call.channel).toBe('heartbeat-diverge');
      expect(call.divergedForMs).toBeGreaterThanOrEqual(3000);

      presenterHb.stop();
      audienceHb.stop();
      warnSpy.mockRestore();
    });

    it('should report convergence after divergence resolves', () => {
      const { presenter, audience } = createSyncPair<{ count: number }>('heartbeat-converge');
      const onDivergence = vi.fn();
      const onConvergence = vi.fn();

      let audienceState = { count: 2 };

      const presenterHb = new SyncHeartbeat(
        presenter,
        () => ({ count: 1 }),
        'presenter',
        'heartbeat-converge',
        { intervalMs: 1000, divergenceThresholdMs: 2000, onDivergence, onConvergence },
      );
      const audienceHb = new SyncHeartbeat(
        audience,
        () => audienceState,
        'audience',
        'heartbeat-converge',
        { intervalMs: 1000, divergenceThresholdMs: 2000, onDivergence, onConvergence },
      );

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      presenterHb.start();
      audienceHb.start();

      // Let divergence be detected and reported
      vi.advanceTimersByTime(4000);
      expect(onDivergence).toHaveBeenCalled();

      // Now fix the audience state to match presenter
      audienceState = { count: 1 };

      // Advance to let heartbeats exchange again
      vi.advanceTimersByTime(2000);

      // The audience side should report convergence since it was previously diverged
      // (presenter sends hash of {count:1}, audience now also has {count:1})
      expect(onConvergence).toHaveBeenCalled();

      presenterHb.stop();
      audienceHb.stop();
      warnSpy.mockRestore();
      debugSpy.mockRestore();
    });
  });

  describe('channel not connected', () => {
    it('should not throw or send when broadcastSync is not initialized', () => {
      const uninitializedSync = new BroadcastSync<{ v: number }>('not-init-channel');
      // Deliberately NOT calling initialize()
      const receiver = new BroadcastSync<{ v: number }>('not-init-channel');
      receiver.initialize();
      const handler = vi.fn();
      receiver.subscribe(handler);

      const heartbeat = new SyncHeartbeat(
        uninitializedSync,
        () => ({ v: 1 }),
        'presenter',
        'not-init-channel',
        { intervalMs: 1000 },
      );

      expect(() => heartbeat.start()).not.toThrow();
      expect(handler).not.toHaveBeenCalled();

      // Interval ticks should also be silent no-ops
      vi.advanceTimersByTime(3000);
      expect(handler).not.toHaveBeenCalled();

      heartbeat.stop();
      receiver.close();
    });

    it('should resume sending once channel becomes connected', () => {
      const sync = new BroadcastSync<{ v: number }>('late-init-channel');
      const receiver = new BroadcastSync<{ v: number }>('late-init-channel');
      receiver.initialize();
      const handler = vi.fn();
      receiver.subscribe(handler);

      const heartbeat = new SyncHeartbeat(
        sync,
        () => ({ v: 1 }),
        'presenter',
        'late-init-channel',
        { intervalMs: 1000 },
      );

      heartbeat.start();
      // No sends yet — channel not connected
      expect(handler).not.toHaveBeenCalled();

      // Now initialize the channel
      sync.initialize();

      // Next interval tick should send
      vi.advanceTimersByTime(1000);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].type).toBe('HEARTBEAT');

      heartbeat.stop();
      sync.close();
      receiver.close();
    });
  });

  describe('heartbeat interval', () => {
    it('should send heartbeats at the configured interval', () => {
      const { presenter, audience } = createSyncPair<{ v: number }>('heartbeat-interval');
      const handler = vi.fn();
      audience.subscribe(handler);

      const heartbeat = new SyncHeartbeat(
        presenter,
        () => ({ v: 1 }),
        'presenter',
        'heartbeat-interval',
        { intervalMs: 2000 },
      );

      heartbeat.start();

      // Initial heartbeat sent immediately
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].type).toBe('HEARTBEAT');

      // After 2 seconds: another heartbeat
      vi.advanceTimersByTime(2000);
      expect(handler).toHaveBeenCalledTimes(2);

      // After 2 more seconds: another heartbeat
      vi.advanceTimersByTime(2000);
      expect(handler).toHaveBeenCalledTimes(3);

      heartbeat.stop();
    });

    it('should stop sending heartbeats after stop()', () => {
      const { presenter, audience } = createSyncPair<{ v: number }>('heartbeat-stop');
      const handler = vi.fn();
      audience.subscribe(handler);

      const heartbeat = new SyncHeartbeat(
        presenter,
        () => ({ v: 1 }),
        'presenter',
        'heartbeat-stop',
        { intervalMs: 1000 },
      );

      heartbeat.start();
      expect(handler).toHaveBeenCalledTimes(1); // initial

      heartbeat.stop();

      vi.advanceTimersByTime(5000);
      // Should still be 1 since we stopped
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
