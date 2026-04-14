import {
  TrackedError,
  ErrorContext,
  ErrorCategory,
  ErrorSeverity,
  AppError,
} from '../types/errors';

/**
 * Error logging configuration
 */
export interface LoggerConfig {
  /** Enable console logging (default: true in development) */
  enableConsole?: boolean;
  /** Minimum severity level to log */
  minSeverity?: ErrorSeverity;
  /** Custom error handler (e.g., Sentry integration) */
  onError?: (error: TrackedError) => void;
  /** Application name for context */
  appName?: string;
  /** Environment (development, production, etc.) */
  environment?: string;
}

const severityLevels: Record<ErrorSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * Default configuration
 */
const defaultConfig: LoggerConfig = {
  enableConsole: typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production',
  minSeverity: 'low',
  environment: typeof process !== 'undefined' ? process.env?.NODE_ENV : 'development',
};

let globalConfig: LoggerConfig = { ...defaultConfig };

/**
 * Configure the error logger
 */
export function configureErrorLogger(config: Partial<LoggerConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Get current logger configuration
 */
export function getLoggerConfig(): LoggerConfig {
  return { ...globalConfig };
}

/**
 * Reset logger configuration to defaults
 */
export function resetLoggerConfig(): void {
  globalConfig = { ...defaultConfig };
}

/**
 * Check if an error should be logged based on severity
 */
function shouldLog(severity: ErrorSeverity): boolean {
  const minLevel = severityLevels[globalConfig.minSeverity ?? 'low'];
  const errorLevel = severityLevels[severity];
  return errorLevel >= minLevel;
}

/**
 * Format error for console output
 */
function formatForConsole(error: TrackedError): string {
  const parts = [
    `[${error.severity.toUpperCase()}]`,
    `[${error.category}]`,
    error.message,
  ];

  if (error.context.component) {
    parts.push(`in ${error.context.component}`);
  }

  if (error.context.userAction) {
    parts.push(`(action: ${error.context.userAction})`);
  }

  return parts.join(' ');
}

/**
 * Log error to console
 */
function logToConsole(error: TrackedError): void {
  if (!globalConfig.enableConsole) return;

  const formatted = formatForConsole(error);
  const consoleMethod =
    error.severity === 'critical' || error.severity === 'high'
      ? 'error'
      : error.severity === 'medium'
        ? 'warn'
        : 'log';

  console[consoleMethod](`[${globalConfig.appName || 'HostedGameNight'}] ${formatted}`);

  if (error.stack) {
    console[consoleMethod]('Stack trace:', error.stack);
  }

  if (error.context.metadata && Object.keys(error.context.metadata).length > 0) {
    console[consoleMethod]('Metadata:', error.context.metadata);
  }
}

/**
 * Convert any error to TrackedError format
 */
export function normalizeError(
  error: unknown,
  context?: Partial<ErrorContext>
): TrackedError {
  if (error instanceof AppError) {
    const tracked = error.toTrackedError();
    if (context) {
      tracked.context = { ...tracked.context, ...context };
    }
    return tracked;
  }

  if (error instanceof Error) {
    return {
      id: `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
      message: error.message,
      category: categorizeError(error),
      severity: 'medium',
      context: {
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        ...context,
      },
      stack: error.stack,
      originalError: error,
    };
  }

  // Handle non-Error objects
  const message = typeof error === 'string' ? error : 'An unknown error occurred';

  return {
    id: `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
    message,
    category: 'unknown',
    severity: 'medium',
    context: {
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      ...context,
      metadata: { ...context?.metadata, originalValue: error },
    },
  };
}

/**
 * Attempt to categorize an error based on its properties
 */
function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  if (
    name.includes('network') ||
    name.includes('fetch') ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to fetch') ||
    message.includes('connection')
  ) {
    return 'network';
  }

  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('authentication') ||
    message.includes('auth') ||
    message.includes('401') ||
    message.includes('403')
  ) {
    return 'auth';
  }

  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return 'validation';
  }

  if (
    message.includes('storage') ||
    message.includes('quota') ||
    message.includes('database')
  ) {
    return 'storage';
  }

  if (
    message.includes('sync') ||
    message.includes('broadcast') ||
    message.includes('channel')
  ) {
    return 'sync';
  }

  return 'unknown';
}

/**
 * Log an error
 */
export function logError(
  error: unknown,
  context?: Partial<ErrorContext>
): TrackedError {
  const trackedError = normalizeError(error, context);

  if (shouldLog(trackedError.severity)) {
    logToConsole(trackedError);

    // Call custom error handler (e.g., Sentry)
    if (globalConfig.onError) {
      try {
        globalConfig.onError(trackedError);
      } catch (handlerError) {
        console.error('Error in custom error handler:', handlerError);
      }
    }
  }

  return trackedError;
}

/**
 * Create a scoped logger for a specific component
 */
export function createScopedLogger(component: string) {
  return {
    log: (error: unknown, context?: Partial<ErrorContext>) =>
      logError(error, { ...context, component }),

    error: (message: string, options?: Partial<ErrorContext>) =>
      logError(new Error(message), { ...options, component }),

    warn: (message: string, metadata?: Record<string, unknown>) =>
      logError(new Error(message), { component, metadata }),
  };
}

/**
 * Placeholder for Sentry integration
 * This function provides the structure for future Sentry setup
 */
export function setupSentryIntegration(dsn: string): void {
  // PLACEHOLDER: Sentry integration
  // When ready to integrate Sentry, install @sentry/nextjs and configure:
  //
  // import * as Sentry from '@sentry/nextjs';
  //
  // Sentry.init({
  //   dsn,
  //   environment: globalConfig.environment,
  //   tracesSampleRate: 1.0,
  //   beforeSend(event) {
  //     // Customize event before sending
  //     return event;
  //   },
  // });

  configureErrorLogger({
    onError: (error: TrackedError) => {
      // PLACEHOLDER: Send to Sentry
      // Sentry.captureException(error.originalError || new Error(error.message), {
      //   tags: {
      //     category: error.category,
      //     severity: error.severity,
      //   },
      //   extra: error.context,
      // });

      console.log(
        `[Sentry Placeholder] Would send error to Sentry (DSN: ${dsn}):`,
        error.id
      );
    },
  });
}
