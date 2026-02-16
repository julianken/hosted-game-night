/**
 * Error categories for the Joolie Boolie
 */
export type ErrorCategory =
  | 'network' // Network/API errors
  | 'auth' // Authentication/authorization errors
  | 'game' // Game logic errors
  | 'sync' // Dual-screen sync errors
  | 'storage' // Local storage/database errors
  | 'validation' // Input validation errors
  | 'unknown'; // Uncategorized errors

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Context information captured with errors
 */
export interface ErrorContext {
  /** User-triggered action that caused the error */
  userAction?: string;
  /** Component where the error occurred */
  component?: string;
  /** Timestamp when the error occurred */
  timestamp: number;
  /** URL/route where the error occurred */
  url?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Structured error for logging and tracking
 */
export interface TrackedError {
  /** Unique error identifier */
  id: string;
  /** Error message */
  message: string;
  /** Error category */
  category: ErrorCategory;
  /** Error severity */
  severity: ErrorSeverity;
  /** Error context */
  context: ErrorContext;
  /** Original error stack trace */
  stack?: string;
  /** Original error object */
  originalError?: Error;
}

/**
 * Options for creating an application error
 */
export interface AppErrorOptions {
  /** Error category */
  category?: ErrorCategory;
  /** Error severity */
  severity?: ErrorSeverity;
  /** User action that triggered the error */
  userAction?: string;
  /** Component name where error occurred */
  component?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Whether the error is recoverable (user can retry) */
  recoverable?: boolean;
  /** User-friendly message to display */
  userMessage?: string;
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly recoverable: boolean;
  public readonly userMessage: string;
  public readonly id: string;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';

    this.id = generateErrorId();
    this.category = options.category ?? 'unknown';
    this.severity = options.severity ?? 'medium';
    this.recoverable = options.recoverable ?? false;
    this.userMessage =
      options.userMessage ?? getDefaultUserMessage(this.category);

    this.context = {
      timestamp: Date.now(),
      userAction: options.userAction,
      component: options.component,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      metadata: options.metadata,
    };

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert to TrackedError format for logging
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

/**
 * Generate a unique error ID
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `err_${timestamp}_${random}`;
}

/**
 * Get default user-friendly message based on error category
 */
function getDefaultUserMessage(category: ErrorCategory): string {
  const messages: Record<ErrorCategory, string> = {
    network:
      'We are having trouble connecting to our servers. Please check your internet connection and try again.',
    auth: 'There was a problem with your login. Please sign in again.',
    game: 'Something went wrong with the game. Please try refreshing the page.',
    sync: 'The display screens are having trouble syncing. Please refresh both windows.',
    storage:
      'We could not save your data. Please make sure you have enough storage space.',
    validation: 'Please check your input and try again.',
    unknown:
      'Something unexpected happened. Please try again or contact support if the problem continues.',
  };

  return messages[category];
}
