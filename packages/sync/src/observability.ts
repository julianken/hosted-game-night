/**
 * Game lifecycle observability utilities.
 *
 * Provides structured logging for game lifecycle events (start, end, pause, etc.)
 * and optional OpenTelemetry span creation when a tracer is available.
 *
 * These are client-side utilities. The primary mechanism is structured console.debug
 * logging. OpenTelemetry spans are created when a browser OTel collector is configured,
 * but this is optional and gracefully degrades to no-op.
 */

/**
 * Attributes attached to every lifecycle span/log.
 */
export interface GameObservabilityContext {
  /** Game type (e.g., 'bingo', 'trivia') */
  game: string;
  /** Unique game session ID */
  sessionId?: string;
  /** Additional attributes for the event */
  attributes?: Record<string, string | number | boolean>;
}

/**
 * A lifecycle event emitter bound to a specific game context.
 * Use `createGameLifecycleLogger` to create one.
 */
export interface GameLifecycleLogger {
  /** Emit a lifecycle event with optional extra data. */
  emit: (event: string, data?: Record<string, unknown>) => void;
}

/**
 * Create a game lifecycle logger bound to a specific game context.
 *
 * Events are emitted as structured JSON via `console.debug` for log aggregation.
 * If an OpenTelemetry tracer is available (via `@opentelemetry/api`), spans are
 * also created. The OTel dependency is optional and dynamically imported.
 *
 * @example
 * ```ts
 * const logger = createGameLifecycleLogger({ game: 'bingo', sessionId: 'abc-123' });
 * logger.emit('game.started', { pattern: 'Blackout' });
 * logger.emit('game.ball_called', { ball: 'B-7', ballsRemaining: 74 });
 * logger.emit('game.ended', { ballsCalled: 42 });
 * ```
 */
export function createGameLifecycleLogger(context: GameObservabilityContext): GameLifecycleLogger {
  return {
    emit(event: string, data?: Record<string, unknown>): void {
      const logEntry = {
        event,
        game: context.game,
        ...(context.sessionId != null && { sessionId: context.sessionId }),
        ...(context.attributes != null && { ...context.attributes }),
        ...data,
        timestamp: new Date().toISOString(),
      };

      // Primary mechanism: structured console logging
      console.debug(JSON.stringify(logEntry));

      // Optional: create OTel span if tracer is available
      tryCreateSpan(event, logEntry);
    },
  };
}

/**
 * Attempt to create an OpenTelemetry span if the API is available.
 * This is a best-effort operation that silently no-ops if OTel is not configured.
 */
function tryCreateSpan(spanName: string, attributes: Record<string, unknown>): void {
  try {
    // Dynamically check for the OTel API global. This avoids requiring
    // @opentelemetry/api as a dependency while still using it when available.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const otelApi = (globalThis as any).__OTEL_API__;
    if (!otelApi?.trace) return;

    const tracer = otelApi.trace.getTracer('game-observability');
    if (!tracer) return;

    const span = tracer.startSpan(spanName);
    for (const [key, value] of Object.entries(attributes)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        span.setAttribute(key, value);
      }
    }
    span.end();
  } catch {
    // Silently ignore - OTel is optional
  }
}
