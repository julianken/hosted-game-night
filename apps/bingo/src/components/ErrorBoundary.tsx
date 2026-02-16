'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - Catches runtime errors and displays a senior-friendly error UI.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  handleRefresh = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Senior-friendly error UI
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen flex items-center justify-center bg-gray-100 p-6"
        >
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            {/* Error Icon */}
            <div className="mb-6">
              <svg
                className="w-20 h-20 mx-auto text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Error Title - Large text for seniors (text-3xl = ~30px) */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Something Went Wrong
            </h1>

            {/* Error Message - Large text (text-xl = ~20px, exceeds 18px min) */}
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              We&apos;re sorry, but something unexpected happened.
              <br />
              Please refresh the page to try again.
            </p>

            {/* Refresh Button - Large click target (min-h-[56px] exceeds 44px requirement) */}
            <button
              onClick={this.handleRefresh}
              className="
                inline-flex items-center justify-center
                min-w-[200px] min-h-[56px]
                px-8 py-4
                bg-blue-600 hover:bg-blue-700
                text-white text-xl font-semibold
                rounded-lg
                transition-colors duration-150
                focus:outline-none focus:ring-4 focus:ring-blue-500/50
              "
              aria-label="Refresh the page to try again"
            >
              Refresh Page
            </button>

            {/* Technical details for debugging (collapsed by default) */}
            {this.state.error && (
              <details className="mt-8 text-left">
                <summary className="text-base text-muted-foreground cursor-pointer hover:text-foreground">
                  Technical Details (for support)
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-base text-gray-600 overflow-auto max-h-40">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
