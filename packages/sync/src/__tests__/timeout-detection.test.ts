import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BroadcastSync } from '../broadcast';
import { mockBroadcastChannel, MockBroadcastChannel } from '@joolie-boolie/testing/mocks';

describe('BroadcastSync timeout detection', () => {
  beforeEach(() => {
    mockBroadcastChannel();
    MockBroadcastChannel.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('should not trigger timeout when messageTimeoutMs is 0 (disabled)', () => {
    const onTimeout = vi.fn();
    const sync = new BroadcastSync('test-timeout', { messageTimeoutMs: 0, onTimeout });
    sync.initialize();

    vi.advanceTimersByTime(60_000);
    expect(onTimeout).not.toHaveBeenCalled();

    sync.close();
  });

  it('should not trigger timeout when no timeout is configured', () => {
    const onTimeout = vi.fn();
    const sync = new BroadcastSync('test-timeout', { onTimeout });
    sync.initialize();

    vi.advanceTimersByTime(60_000);
    expect(onTimeout).not.toHaveBeenCalled();

    sync.close();
  });

  it('should trigger timeout when no messages received within threshold', () => {
    const onTimeout = vi.fn();
    const onError = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const sender = new BroadcastSync('test-timeout');
    const receiver = new BroadcastSync('test-timeout', {
      messageTimeoutMs: 5000,
      onTimeout,
      onError,
    });

    sender.initialize();
    receiver.initialize();

    // Send a message so lastMessageReceivedAt gets set
    sender.send('PING', null);

    // Wait for timeout threshold to be exceeded
    vi.advanceTimersByTime(6000);

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledWith(expect.any(Number));
    const elapsed = onTimeout.mock.calls[0][0];
    expect(elapsed).toBeGreaterThanOrEqual(5000);

    // Verify the error callback was also invoked
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      code: 'MESSAGE_TIMEOUT',
    }));

    sender.close();
    receiver.close();
    warnSpy.mockRestore();
  });

  it('should not trigger timeout if messages keep arriving', () => {
    const onTimeout = vi.fn();

    const sender = new BroadcastSync('test-timeout-active');
    const receiver = new BroadcastSync('test-timeout-active', {
      messageTimeoutMs: 5000,
      onTimeout,
    });

    sender.initialize();
    receiver.initialize();

    // Send messages periodically (every 2 seconds, within the 5s threshold)
    sender.send('PING', null);
    vi.advanceTimersByTime(2000);
    sender.send('PING', null);
    vi.advanceTimersByTime(2000);
    sender.send('PING', null);
    vi.advanceTimersByTime(2000);
    sender.send('PING', null);

    expect(onTimeout).not.toHaveBeenCalled();

    sender.close();
    receiver.close();
  });

  it('should reset timeout timer after firing', () => {
    const onTimeout = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const sender = new BroadcastSync('test-timeout-reset');
    const receiver = new BroadcastSync('test-timeout-reset', {
      messageTimeoutMs: 3000,
      onTimeout,
    });

    sender.initialize();
    receiver.initialize();

    // Trigger first message
    sender.send('PING', null);

    // Wait for first timeout
    vi.advanceTimersByTime(4000);
    expect(onTimeout).toHaveBeenCalledTimes(1);

    // After the timeout fires, it resets lastMessageReceivedAt.
    // Wait for another timeout cycle
    vi.advanceTimersByTime(4000);
    expect(onTimeout).toHaveBeenCalledTimes(2);

    sender.close();
    receiver.close();
    warnSpy.mockRestore();
  });

  it('should stop timeout detection on close', () => {
    const onTimeout = vi.fn();

    const sender = new BroadcastSync('test-timeout-close');
    const receiver = new BroadcastSync('test-timeout-close', {
      messageTimeoutMs: 3000,
      onTimeout,
    });

    sender.initialize();
    receiver.initialize();

    sender.send('PING', null);

    // Close before timeout fires
    receiver.close();

    vi.advanceTimersByTime(10_000);
    expect(onTimeout).not.toHaveBeenCalled();

    sender.close();
  });

  it('should log structured warning on timeout', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const sender = new BroadcastSync('test-timeout-log');
    const receiver = new BroadcastSync('test-timeout-log', {
      messageTimeoutMs: 3000,
    });

    sender.initialize();
    receiver.initialize();

    sender.send('PING', null);
    vi.advanceTimersByTime(4000);

    // Should have logged a structured warning
    const timeoutWarnings = warnSpy.mock.calls.filter(call => {
      try {
        const parsed = JSON.parse(call[0] as string);
        return parsed.event === 'sync.message.timeout';
      } catch {
        return false;
      }
    });
    expect(timeoutWarnings.length).toBeGreaterThanOrEqual(1);

    const parsed = JSON.parse(timeoutWarnings[0][0] as string);
    expect(parsed.channel).toBe('test-timeout-log');
    expect(parsed.thresholdMs).toBe(3000);

    sender.close();
    receiver.close();
    warnSpy.mockRestore();
  });
});
