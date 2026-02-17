import * as Sentry from '@sentry/nextjs';
import type {
  ErrorBackend,
  TrackedError,
  ErrorSeverity,
  ErrorContext,
  ErrorUser,
  Breadcrumb,
  ErrorTrackerConfig,
} from '@joolie-boolie/error-tracking/types';

const SEVERITY_MAP: Record<ErrorSeverity, Sentry.SeverityLevel> = {
  low: 'info',
  medium: 'warning',
  high: 'error',
  critical: 'fatal',
};

export class SentryErrorBackend implements ErrorBackend {
  init(_config: ErrorTrackerConfig): void {
    // Sentry is initialized separately via sentry.*.config.ts
  }

  captureError(error: TrackedError): void {
    Sentry.withScope((scope) => {
      scope.setLevel(SEVERITY_MAP[error.severity]);
      scope.setTag('error.category', error.category);
      scope.setTag('error.severity', error.severity);
      scope.setTag('error.id', error.id);

      if (error.context.component) scope.setTag('component', error.context.component);
      if (error.context.userAction) scope.setTag('userAction', error.context.userAction);
      if (error.context.requestId) scope.setTag('requestId', error.context.requestId);
      if (error.context.url) scope.setTag('url', error.context.url);

      if (error.context.metadata) {
        scope.setContext('metadata', error.context.metadata);
      }

      const exception = error.originalError ?? new Error(error.message);
      Sentry.captureException(exception);
    });
  }

  captureMessage(message: string, severity: ErrorSeverity, _context?: Partial<ErrorContext>): void {
    Sentry.captureMessage(message, SEVERITY_MAP[severity]);
  }

  setUser(user: ErrorUser | null): void {
    if (user) {
      Sentry.setUser({ id: user.id });
    } else {
      Sentry.setUser(null);
    }
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    Sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level as Sentry.SeverityLevel,
      timestamp: breadcrumb.timestamp ? breadcrumb.timestamp / 1000 : undefined,
      data: breadcrumb.data,
    });
  }

  pushScope(): void {}
  popScope(): void {}
}
