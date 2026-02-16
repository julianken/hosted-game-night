# @joolie-boolie/error-tracking

Lightweight error tracking abstraction for Joolie Boolie. Provides console logging for development and a pluggable backend system for production (Sentry-compatible).

## Features

- Zero external dependencies in development mode
- Pluggable backend system for production error services
- React Error Boundary with accessible UI
- Server-side error tracking for API routes
- Breadcrumb tracking for debugging context
- Automatic error categorization
- TypeScript-first design

## Installation

This package is included in the monorepo. Add it to your app's dependencies:

```json
{
  "dependencies": {
    "@joolie-boolie/error-tracking": "workspace:*"
  }
}
```

## Quick Start

### Client-Side (Browser)

```typescript
import {
  initErrorTracking,
  captureError,
  AppError
} from '@joolie-boolie/error-tracking';

// Initialize at app startup
initErrorTracking({
  appName: 'bingo',
  environment: process.env.NODE_ENV,
  enableConsole: process.env.NODE_ENV !== 'production',
});

// Capture errors
try {
  await riskyOperation();
} catch (error) {
  captureError(error, {
    component: 'GameEngine',
    userAction: 'start_game'
  });
}

// Throw custom errors
throw new AppError('Game state corrupted', {
  category: 'game',
  severity: 'high',
  recoverable: true,
  userMessage: 'The game encountered an error. Please restart.',
});
```

### React Components

```tsx
import {
  ErrorBoundary,
  useErrorHandler,
  ErrorTrackingProvider
} from '@joolie-boolie/error-tracking/react';

// Wrap your app with error boundary
function App() {
  return (
    <ErrorBoundary
      componentName="App"
      fallback={({ error, resetError }) => (
        <div>
          <p>Something went wrong: {error.message}</p>
          <button onClick={resetError}>Try Again</button>
        </div>
      )}
    >
      <Game />
    </ErrorBoundary>
  );
}

// Use hook for component-level error handling
function GameControls() {
  const { reportError, addBreadcrumb } = useErrorHandler('GameControls');

  const handleRoll = async () => {
    addBreadcrumb({ category: 'game', message: 'Roll button clicked' });
    try {
      await rollBall();
    } catch (error) {
      reportError(error, { userAction: 'roll_ball' });
    }
  };

  return <button onClick={handleRoll}>Roll</button>;
}
```

### Server-Side (API Routes)

```typescript
import {
  captureServerError,
  ServerAppError,
  createErrorResponse
} from '@joolie-boolie/error-tracking/server';

export async function GET(request: Request) {
  try {
    const data = await fetchGameData();
    return Response.json(data);
  } catch (error) {
    // Capture and get error response
    const { status, body } = createErrorResponse(error, {
      component: '/api/game',
    });
    return Response.json(body, { status });
  }
}

// Throw server errors with proper status codes
throw new ServerAppError('User not authorized', {
  category: 'auth',
  statusCode: 401,
});
```

## API Reference

### Initialization

```typescript
import { initErrorTracking } from '@joolie-boolie/error-tracking';

initErrorTracking({
  appName: 'bingo',           // App identifier
  environment: 'production',   // Environment name
  enableConsole: false,        // Console logging (default: true in dev)
  minSeverity: 'medium',       // Minimum severity to capture
  onError: (error) => {},      // Custom error handler
  beforeCapture: (error) => error, // Transform/filter errors
  tags: { version: '1.0.0' },  // Global tags
  debug: false,                // Debug mode for error tracking itself
});
```

### Error Capture

```typescript
import { captureError, captureMessage, AppError } from '@joolie-boolie/error-tracking';

// Capture any error
captureError(error, {
  component: 'BingoCard',
  userAction: 'mark_number',
  metadata: { cardId: '123' },
});

// Capture a message (non-error)
captureMessage('User started new game', 'low', {
  metadata: { gameId: '456' },
});

// Create structured errors
const error = new AppError('Invalid ball number', {
  category: 'validation',
  severity: 'medium',
  recoverable: true,
  userMessage: 'Please enter a valid number between 1 and 75.',
});
```

### Error Categories

| Category | Description |
|----------|-------------|
| `network` | Network/API errors |
| `auth` | Authentication/authorization |
| `game` | Game logic errors |
| `sync` | Dual-screen sync errors |
| `storage` | Database/localStorage errors |
| `validation` | Input validation errors |
| `unknown` | Uncategorized errors |

### Severity Levels

| Level | Description |
|-------|-------------|
| `low` | Informational, non-critical |
| `medium` | Warning, degraded experience |
| `high` | Error, feature broken |
| `critical` | Critical, app unusable |

### Breadcrumbs

```typescript
import { addBreadcrumb } from '@joolie-boolie/error-tracking';

// Track user actions for debugging
addBreadcrumb({
  category: 'game',
  message: 'Ball called: B-12',
  level: 'info',
  data: { ballNumber: 12 },
});
```

### React Hooks

```typescript
import {
  useErrorHandler,
  useAsyncError,
  useTrackInteraction,
} from '@joolie-boolie/error-tracking/react';

// Component error handling
const { reportError, throwError, addBreadcrumb } = useErrorHandler('MyComponent');

// Async operations with loading/error state
const { execute, loading, error, reset } = useAsyncError('fetchData');
await execute(async () => await fetchData());

// Track user interactions
const track = useTrackInteraction('GameBoard');
track('cell_clicked', { cellId: 5 });
```

## Backend Integration

### Custom Backend

```typescript
import { setErrorBackend, type ErrorBackend } from '@joolie-boolie/error-tracking';

const customBackend: ErrorBackend = {
  init(config) {
    // Initialize your error service
  },
  captureError(error) {
    // Send error to your service
  },
  captureMessage(message, severity, context) {
    // Send message to your service
  },
  setUser(user) {
    // Set user context
  },
  addBreadcrumb(breadcrumb) {
    // Add breadcrumb
  },
  pushScope() {},
  popScope() {},
};

setErrorBackend(customBackend);
```

### Sentry Integration (Example)

```typescript
// Note: Requires @sentry/nextjs to be installed separately
import * as Sentry from '@sentry/nextjs';
import { setErrorBackend } from '@joolie-boolie/error-tracking';

const sentryBackend: ErrorBackend = {
  init(config) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: config.environment,
    });
  },
  captureError(error) {
    Sentry.captureException(error.originalError || new Error(error.message), {
      tags: { category: error.category, severity: error.severity },
      extra: error.context,
    });
  },
  captureMessage(message, severity) {
    Sentry.captureMessage(message, severity);
  },
  setUser(user) {
    Sentry.setUser(user);
  },
  addBreadcrumb(breadcrumb) {
    Sentry.addBreadcrumb(breadcrumb);
  },
  pushScope() { Sentry.pushScope(); },
  popScope() { Sentry.popScope(); },
};

setErrorBackend(sentryBackend);
```

## Package Exports

| Export | Description |
|--------|-------------|
| `@joolie-boolie/error-tracking` | Main exports (client + React) |
| `@joolie-boolie/error-tracking/client` | Browser-only exports |
| `@joolie-boolie/error-tracking/server` | Server-side exports |
| `@joolie-boolie/error-tracking/react` | React components and hooks |
| `@joolie-boolie/error-tracking/types` | TypeScript types only |

## Design Guidelines

The error UI components follow accessible design:

- Minimum 18px font size
- High contrast colors
- Large click targets (44px minimum)
- Clear, simple instructions
- Error IDs for support reference

## Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage
```

## Related Packages

- `@joolie-boolie/sync` - Dual-screen synchronization
- `@joolie-boolie/auth` - Authentication
- `@joolie-boolie/ui` - Shared UI components
