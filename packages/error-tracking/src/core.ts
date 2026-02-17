/**
 * @joolie-boolie/error-tracking - Core (shared)
 *
 * Environment-agnostic utilities shared between client.ts and server.ts.
 * Do not import browser-only or Node-only APIs here.
 */

import type {
  TrackedError,
  ErrorContext,
  ErrorCategory,
  ErrorSeverity,
  ErrorTrackerConfig,
  AppErrorOptions,
} from './types';

// ---------------------------------------------------------------------------
// Severity levels
// ---------------------------------------------------------------------------

/**
 * Numeric ordering for severity levels (used for min-severity filtering).
 */
export const severityLevels: Record<ErrorSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique error ID.
 * @param prefix - Optional segment inserted between "err_" and the timestamp,
 *   e.g. "srv" produces "err_srv_<ts>_<rand>".
 */
export function generateErrorId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  if (prefix) {
    return `err_${prefix}_${timestamp}_${random}`;
  }
  return `err_${timestamp}_${random}`;
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/**
 * Return true when value looks like a fully-formed TrackedError.
 */
export function isTrackedError(value: unknown): value is TrackedError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'message' in value &&
    'category' in value &&
    'severity' in value &&
    'context' in value
  );
}

/**
 * Return true when value is an Error decorated with the category / severity /
 * context properties added by BaseAppError (or any subclass).
 */
export function isAppError(value: unknown): boolean {
  return (
    value instanceof Error &&
    'category' in value &&
    'severity' in value &&
    'context' in value
  );
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * Return true when the given severity meets or exceeds the configured minimum.
 */
export function shouldCapture(
  severity: ErrorSeverity,
  config: Pick<ErrorTrackerConfig, 'minSeverity'>
): boolean {
  const minLevel = severityLevels[config.minSeverity ?? 'low'];
  const errorLevel = severityLevels[severity];
  return errorLevel >= minLevel;
}

// ---------------------------------------------------------------------------
// Console formatting
// ---------------------------------------------------------------------------

/**
 * Produce a compact single-line description of a tracked error suitable for
 * console output.  An optional suffix string (e.g. "(action: click)" or
 * "(request: abc123)") is appended when provided.
 */
export function formatForConsole(error: TrackedError, extraSuffix?: string): string {
  const parts = [
    `[${error.severity.toUpperCase()}]`,
    `[${error.category}]`,
    error.message,
  ];

  if (error.context.component) {
    parts.push(`in ${error.context.component}`);
  }

  if (extraSuffix) {
    parts.push(extraSuffix);
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Default user messages (browser-facing defaults)
// ---------------------------------------------------------------------------

/**
 * Return a user-friendly message for a given error category.
 * Used by client AppError and as a fallback in server ServerAppError.
 */
export function getDefaultUserMessage(category: ErrorCategory): string {
  const messages: Record<ErrorCategory, string> = {
    network:
      'We are having trouble connecting to our servers. Please check your internet connection and try again.',
    auth: 'There was a problem with your login. Please sign in again.',
    game: 'Something went wrong with the game. Please try refreshing the page.',
    sync: 'The display screens are having trouble syncing. Please refresh both windows.',
    storage: 'We could not save your data. Please make sure you have enough storage space.',
    validation: 'Please check your input and try again.',
    unknown:
      'Something unexpected happened. Please try again or contact support if the problem continues.',
  };
  return messages[category];
}

// ---------------------------------------------------------------------------
// Base AppError options (extended by both client and server)
// ---------------------------------------------------------------------------

/**
 * Internal options passed from subclass constructors into BaseAppError.
 * Subclasses may inject extra context fields (url, userId) and override the
 * userMessage fallback before delegating to super().
 */
export interface BaseAppErrorInit extends AppErrorOptions {
  /**
   * Override the generated id (used when subclass pre-computes the id).
   */
  id?: string;
  /**
   * Extra context fields merged into the context object after construction.
   * Use this to inject environment-specific fields (e.g., window.location.href).
   */
  contextExtras?: Partial<ErrorContext>;
  /**
   * If provided, replaces the default user message lookup when userMessage is
   * not supplied in options.  This lets server subclass supply server-flavoured
   * messages without re-implementing the whole constructor.
   */
  userMessageFallback?: string;
}

// ---------------------------------------------------------------------------
// Base AppError class
// ---------------------------------------------------------------------------

/**
 * Shared base class for application errors.
 * Extended by AppError (client) and ServerAppError (server) to add
 * environment-specific fields and methods.
 */
export class BaseAppError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly recoverable: boolean;
  public readonly userMessage: string;
  public readonly id: string;
  public readonly statusCode?: number;

  constructor(message: string, options: BaseAppErrorInit = {}) {
    super(message);
    this.name = 'BaseAppError';

    this.id = options.id ?? generateErrorId();
    this.category = options.category ?? 'unknown';
    this.severity = options.severity ?? 'medium';
    this.recoverable = options.recoverable ?? false;
    this.userMessage =
      options.userMessage ??
      options.userMessageFallback ??
      getDefaultUserMessage(this.category);
    this.statusCode = options.statusCode;

    this.context = {
      timestamp: Date.now(),
      userAction: options.userAction,
      component: options.component,
      requestId: options.requestId,
      metadata: options.metadata,
      // Merge any environment-specific extras supplied by the subclass
      ...options.contextExtras,
    };

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }

  /**
   * Convert to TrackedError format.
   */
  toTrackedError(): TrackedError {
    return {
      id: this.id,
      message: this.message,
      category: this.category,
      severity: this.severity,
      context: this.context,
      stack: this.stack,
      originalError: this,
    };
  }
}
