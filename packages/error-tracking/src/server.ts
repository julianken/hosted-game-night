/**
 * @joolie-boolie/error-tracking - Server Module
 *
 * Server-side error tracking for Next.js API routes and Server Components.
 * Provides context-aware error capture with request information.
 */

import type {
  TrackedError,
  ErrorContext,
  ErrorCategory,
  ErrorSeverity,
  ErrorTrackerConfig,
  ErrorBackend,
  ErrorUser,
  Breadcrumb,
  AppErrorOptions,
} from './types';

import {
  severityLevels,
  generateErrorId,
  shouldCapture,
  formatForConsole,
  getDefaultUserMessage,
  BaseAppError,
} from './core';

// Re-export severityLevels for any consumer that imports it from this module.
export { severityLevels };

/**
 * Server configuration (optimized for server; no browser globals)
 */
const defaultConfig: ErrorTrackerConfig = {
  enableConsole: process.env.NODE_ENV !== 'production',
  minSeverity: 'low',
  environment: process.env.NODE_ENV ?? 'development',
  appName: 'JoolieBoolie',
  debug: false,
};

// Server-side state
let config: ErrorTrackerConfig = { ...defaultConfig };
let backend: ErrorBackend | null = null;

/**
 * Initialize server-side error tracking
 */
export function initServerErrorTracking(userConfig: Partial<ErrorTrackerConfig>): void {
  config = { ...defaultConfig, ...userConfig };

  if (backend) {
    backend.init(config);
  }

  if (config.debug) {
    console.log('[ErrorTracking:Server] Initialized with config:', {
      ...config,
      onError: config.onError ? '[function]' : undefined,
    });
  }
}

/**
 * Set the error tracking backend for server
 */
export function setServerErrorBackend(newBackend: ErrorBackend): void {
  backend = newBackend;
  backend.init(config);
}

/**
 * Get current server configuration
 */
export function getServerConfig(): ErrorTrackerConfig {
  return { ...config };
}

/**
 * Reset server configuration
 */
export function resetServerErrorTracking(): void {
  config = { ...defaultConfig };
  backend = null;
}

/**
 * Auto-categorize error (server-specific patterns: ECONNREFUSED, ENOTFOUND,
 * jwt, postgres, supabase, etc.)
 */
function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  if (
    name.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('timeout') ||
    message.includes('enotfound') ||
    message.includes('fetch')
  ) {
    return 'network';
  }

  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('authentication') ||
    message.includes('jwt')
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
    message.includes('database') ||
    message.includes('postgres') ||
    message.includes('supabase') ||
    message.includes('query')
  ) {
    return 'storage';
  }

  return 'unknown';
}

/**
 * Log error to console (server format includes ":Server" in app name prefix)
 */
function logToConsole(error: TrackedError): void {
  if (!config.enableConsole) return;

  const suffix =
    error.context.requestId ? `(request: ${error.context.requestId})` : undefined;
  const formatted = formatForConsole(error, suffix);

  const consoleMethod =
    error.severity === 'critical' || error.severity === 'high'
      ? 'error'
      : error.severity === 'medium'
        ? 'warn'
        : 'log';

  console[consoleMethod](`[${config.appName}:Server] ${formatted}`);

  if (error.stack && config.debug) {
    console[consoleMethod]('Stack trace:', error.stack);
  }
}

/**
 * Normalize any value to TrackedError (server variant)
 */
export function normalizeServerError(
  error: unknown,
  context?: Partial<ErrorContext>
): TrackedError {
  if (error instanceof ServerAppError) {
    return {
      id: error.id,
      message: error.message,
      category: error.category,
      severity: error.severity,
      context: { ...error.context, ...context },
      stack: error.stack,
      originalError: error,
    };
  }

  if (error instanceof Error) {
    return {
      id: generateErrorId('srv'),
      message: error.message,
      category: categorizeError(error),
      severity: 'medium',
      context: {
        timestamp: Date.now(),
        ...context,
      },
      stack: error.stack,
      originalError: error,
    };
  }

  if (typeof error === 'string') {
    return {
      id: generateErrorId('srv'),
      message: error,
      category: 'unknown',
      severity: 'medium',
      context: {
        timestamp: Date.now(),
        ...context,
      },
    };
  }

  return {
    id: generateErrorId('srv'),
    message: 'An unknown server error occurred',
    category: 'unknown',
    severity: 'medium',
    context: {
      timestamp: Date.now(),
      ...context,
      metadata: { ...context?.metadata, originalValue: String(error) },
    },
  };
}

/**
 * Capture a server-side error
 */
export function captureServerError(
  error: unknown,
  context?: Partial<ErrorContext>
): TrackedError {
  const trackedError = normalizeServerError(error, context);

  // Apply beforeCapture hook
  if (config.beforeCapture) {
    const filtered = config.beforeCapture(trackedError);
    if (!filtered) {
      return trackedError;
    }
  }

  if (shouldCapture(trackedError.severity, config)) {
    logToConsole(trackedError);

    if (backend) {
      backend.captureError(trackedError);
    }

    if (config.onError) {
      try {
        const result = config.onError(trackedError);
        if (result instanceof Promise) {
          result.catch((err) => {
            console.error('[ErrorTracking:Server] Error in custom handler:', err);
          });
        }
      } catch (handlerError) {
        console.error('[ErrorTracking:Server] Error in custom handler:', handlerError);
      }
    }
  }

  return trackedError;
}

/**
 * Capture a server message
 */
export function captureServerMessage(
  message: string,
  severity: ErrorSeverity = 'low',
  context?: Partial<ErrorContext>
): void {
  if (!shouldCapture(severity, config)) return;

  if (config.enableConsole) {
    const consoleMethod = severity === 'critical' || severity === 'high' ? 'error' : 'log';
    console[consoleMethod](`[${config.appName}:Server] ${message}`);
  }

  if (backend) {
    backend.captureMessage(message, severity, context);
  }
}

/**
 * Create a request-scoped logger
 */
export function createRequestLogger(requestId: string, route?: string) {
  return {
    captureError: (error: unknown, context?: Partial<ErrorContext>) =>
      captureServerError(error, { ...context, requestId, component: route }),

    error: (message: string, metadata?: Record<string, unknown>) =>
      captureServerError(new Error(message), { requestId, component: route, metadata }),

    warn: (message: string, metadata?: Record<string, unknown>) =>
      captureServerMessage(message, 'medium', { requestId, component: route, metadata }),

    info: (message: string, metadata?: Record<string, unknown>) =>
      captureServerMessage(message, 'low', { requestId, component: route, metadata }),
  };
}

/**
 * Server-side application error.
 * Extends BaseAppError from core with server-specific fields (HTTP status codes,
 * API response helpers).
 */
export class ServerAppError extends BaseAppError {
  public readonly statusCode: number;

  constructor(
    message: string,
    options: AppErrorOptions & { statusCode?: number } = {}
  ) {
    const category = options.category ?? 'unknown';
    super(message, {
      ...options,
      // Provide server-specific user message fallback (overrides client-facing defaults)
      userMessageFallback: ServerAppError.getServerDefaultMessage(category),
    });
    this.name = 'ServerAppError';

    this.statusCode = options.statusCode ?? ServerAppError.getDefaultStatusCode(this.category);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServerAppError);
    }
  }

  private static getServerDefaultMessage(category: ErrorCategory): string {
    const messages: Record<ErrorCategory, string> = {
      network: 'Unable to connect to external service',
      auth: 'Authentication required',
      game: 'Game operation failed',
      sync: 'Synchronization failed',
      storage: 'Database operation failed',
      validation: 'Invalid request data',
      unknown: 'An unexpected error occurred',
    };
    return messages[category];
  }

  private static getDefaultStatusCode(category: ErrorCategory): number {
    const codes: Record<ErrorCategory, number> = {
      network: 502,
      auth: 401,
      game: 500,
      sync: 500,
      storage: 500,
      validation: 400,
      unknown: 500,
    };
    return codes[category];
  }

  /**
   * Convert to API-safe error response
   */
  toResponse(): { error: string; code: string; id: string } {
    return {
      error: this.userMessage,
      code: this.category.toUpperCase(),
      id: this.id,
    };
  }
}

/**
 * API route error handler wrapper
 */
export function withServerErrorHandling<T>(
  handler: () => Promise<T>,
  context?: Partial<ErrorContext>
): Promise<T> {
  return handler().catch((error) => {
    captureServerError(error, context);
    throw error;
  });
}

/**
 * Create an API error response
 */
export function createErrorResponse(
  error: unknown,
  context?: Partial<ErrorContext>
): { status: number; body: { error: string; code: string; id: string } } {
  const tracked = captureServerError(error, context);

  if (error instanceof ServerAppError) {
    return {
      status: error.statusCode,
      body: error.toResponse(),
    };
  }

  return {
    status: 500,
    body: {
      error: 'An unexpected error occurred',
      code: tracked.category.toUpperCase(),
      id: tracked.id,
    },
  };
}

/**
 * Next.js API route handler with error tracking
 */
export function createApiHandler<T>(
  handler: (requestId: string) => Promise<T>,
  options?: { route?: string }
) {
  return async (): Promise<T> => {
    const requestId = generateErrorId('srv').replace('err_srv_', 'req_');

    try {
      return await handler(requestId);
    } catch (error) {
      captureServerError(error, {
        requestId,
        component: options?.route,
      });
      throw error;
    }
  };
}

// Re-export types
export type {
  TrackedError,
  ErrorContext,
  ErrorCategory,
  ErrorSeverity,
  ErrorTrackerConfig,
  ErrorBackend,
  ErrorUser,
  Breadcrumb,
  AppErrorOptions,
};

// Re-export shared core utilities for consumers that may need them
export { getDefaultUserMessage };
