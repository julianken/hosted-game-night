import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGameLifecycleLogger } from '../observability';

describe('createGameLifecycleLogger', () => {
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    debugSpy.mockRestore();
  });

  it('should emit structured JSON to console.debug', () => {
    const logger = createGameLifecycleLogger({ game: 'bingo' });
    logger.emit('game.started', { pattern: 'Blackout' });

    expect(debugSpy).toHaveBeenCalledTimes(1);
    const loggedJson = JSON.parse(debugSpy.mock.calls[0][0] as string);
    expect(loggedJson.event).toBe('game.started');
    expect(loggedJson.game).toBe('bingo');
    expect(loggedJson.pattern).toBe('Blackout');
    expect(loggedJson.timestamp).toBeDefined();
  });

  it('should include sessionId when provided', () => {
    const logger = createGameLifecycleLogger({ game: 'trivia', sessionId: 'abc-123' });
    logger.emit('game.ended');

    const loggedJson = JSON.parse(debugSpy.mock.calls[0][0] as string);
    expect(loggedJson.sessionId).toBe('abc-123');
  });

  it('should not include sessionId when not provided', () => {
    const logger = createGameLifecycleLogger({ game: 'bingo' });
    logger.emit('game.started');

    const loggedJson = JSON.parse(debugSpy.mock.calls[0][0] as string);
    expect(loggedJson.sessionId).toBeUndefined();
  });

  it('should include custom attributes', () => {
    const logger = createGameLifecycleLogger({
      game: 'trivia',
      attributes: { teamCount: 5, mode: 'competitive' },
    });
    logger.emit('game.started');

    const loggedJson = JSON.parse(debugSpy.mock.calls[0][0] as string);
    expect(loggedJson.teamCount).toBe(5);
    expect(loggedJson.mode).toBe('competitive');
  });

  it('should merge event data with context', () => {
    const logger = createGameLifecycleLogger({ game: 'bingo' });
    logger.emit('game.ball_called', { ball: 'B-7', ballsRemaining: 74 });

    const loggedJson = JSON.parse(debugSpy.mock.calls[0][0] as string);
    expect(loggedJson.event).toBe('game.ball_called');
    expect(loggedJson.game).toBe('bingo');
    expect(loggedJson.ball).toBe('B-7');
    expect(loggedJson.ballsRemaining).toBe(74);
  });

  it('should work without additional data', () => {
    const logger = createGameLifecycleLogger({ game: 'bingo' });
    logger.emit('game.paused');

    expect(debugSpy).toHaveBeenCalledTimes(1);
    const loggedJson = JSON.parse(debugSpy.mock.calls[0][0] as string);
    expect(loggedJson.event).toBe('game.paused');
    expect(loggedJson.game).toBe('bingo');
  });

  it('should gracefully handle missing OTel global', () => {
    // Ensure no OTel global exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).__OTEL_API__;

    const logger = createGameLifecycleLogger({ game: 'bingo' });
    // Should not throw
    expect(() => logger.emit('game.started')).not.toThrow();
    expect(debugSpy).toHaveBeenCalledTimes(1);
  });
});
