/**
 * @joolie-boolie/error-tracking types
 *
 * Centralized type definitions for the error tracking package.
 */

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
  /** Request ID for API errors */
  requestId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** Session ID */
  sessionId?: string;
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
  /** HTTP status code if from API */
  statusCode?: number;
  /** Request ID for API errors */
  requestId?: string;
}

/**
 * Error logging configuration
 */
export interface ErrorTrackerConfig {
  /** Enable console logging (default: true in development) */
  enableConsole?: boolean;
  /** Minimum severity level to log */
  minSeverity?: ErrorSeverity;
  /** Custom error handler (e.g., Sentry integration) */
  onError?: (error: TrackedError) => void | Promise<void>;
  /** Callback before error is captured (can modify/filter) */
  beforeCapture?: (error: TrackedError) => TrackedError | null;
  /** Application name for context */
  appName?: string;
  /** Environment (development, staging, production) */
  environment?: string;
  /** Release/version identifier */
  release?: string;
  /** Global tags to attach to all errors */
  tags?: Record<string, string>;
  /** User information to attach to errors */
  user?: ErrorUser;
  /** Enable debug mode for error tracking itself */
  debug?: boolean;
}

/**
 * User information for error context
 */
export interface ErrorUser {
  id?: string;
  email?: string;
  username?: string;
}

/**
 * Error tracking backend interface
 * Implement this to integrate with services like Sentry
 */
export interface ErrorBackend {
  /** Initialize the backend */
  init(config: ErrorTrackerConfig): void;
  /** Capture an error */
  captureError(error: TrackedError): void;
  /** Capture a message (non-error log) */
  captureMessage(message: string, severity: ErrorSeverity, context?: Partial<ErrorContext>): void;
  /** Set user context */
  setUser(user: ErrorUser | null): void;
  /** Add breadcrumb for context */
  addBreadcrumb(breadcrumb: Breadcrumb): void;
  /** Start a new scope/context */
  pushScope(): void;
  /** End current scope */
  popScope(): void;
}

/**
 * Breadcrumb for tracking user actions leading to errors
 */
export interface Breadcrumb {
  /** Breadcrumb category */
  category: string;
  /** Breadcrumb message */
  message: string;
  /** Breadcrumb level */
  level?: 'debug' | 'info' | 'warning' | 'error';
  /** Timestamp */
  timestamp?: number;
  /** Additional data */
  data?: Record<string, unknown>;
}

/**
 * Error boundary fallback render props
 */
export interface ErrorFallbackProps {
  /** The tracked error */
  error: TrackedError;
  /** Reset the error boundary */
  resetError: () => void;
  /** Component stack from React */
  componentStack?: string;
}

/**
 * Error boundary props
 */
export interface ErrorBoundaryProps {
  /** Child components */
  children: React.ReactNode;
  /** Fallback UI or render function */
  fallback?: React.ReactNode | ((props: ErrorFallbackProps) => React.ReactNode);
  /** Callback when error is caught */
  onError?: (error: TrackedError) => void;
  /** Component name for context */
  componentName?: string;
  /** Additional error context */
  context?: Partial<ErrorContext>;
  /** Reset keys - when these change, the error boundary resets */
  resetKeys?: unknown[];
  /** Callback when error boundary resets */
  onReset?: () => void;
}

/**
 * Hook return type for useErrorHandler
 */
export interface UseErrorHandlerResult {
  /** Report an error */
  reportError: (error: unknown, context?: Partial<ErrorContext>) => TrackedError;
  /** Report a warning */
  reportWarning: (message: string, metadata?: Record<string, unknown>) => void;
  /** Add a breadcrumb */
  addBreadcrumb: (breadcrumb: Breadcrumb) => void;
  /** Throw an error to be caught by error boundary */
  throwError: (error: unknown) => never;
}

/**
 * Async error handler options
 */
export interface AsyncErrorOptions {
  /** Show error to user */
  showError?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Retry configuration */
  retry?: {
    attempts: number;
    delay: number;
  };
  /** Context for error tracking */
  context?: Partial<ErrorContext>;
}
