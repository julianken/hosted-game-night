'use client';

import { ReactNode } from 'react';
import { TrackedError } from '../types/errors';

export interface ErrorDisplayProps {
  /** Error to display (optional - uses default message if not provided) */
  error?: TrackedError | Error | string;
  /** Title text to display */
  title?: string;
  /** Description text (overrides error message) */
  description?: string;
  /** Additional help text */
  helpText?: string;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Callback when home button is clicked */
  onGoHome?: () => void;
  /** Show retry button */
  showRetry?: boolean;
  /** Show home button */
  showHome?: boolean;
  /** Custom retry button text */
  retryText?: string;
  /** Custom home button text */
  homeText?: string;
  /** Additional actions */
  children?: ReactNode;
  /** Visual style variant */
  variant?: 'full-page' | 'inline' | 'compact';
  /** Icon to display (defaults to error icon) */
  icon?: ReactNode;
}

/**
 * Accessible error display component
 *
 * Features:
 * - Large, readable text (min 18px)
 * - High contrast colors
 * - Large click targets (min 44px)
 * - Clear, simple instructions
 */
export function ErrorDisplay({
  error,
  title = 'Oops! Something went wrong',
  description,
  helpText = 'If this keeps happening, try reloading the page or clearing your browser cache.',
  onRetry,
  onGoHome,
  showRetry = true,
  showHome = true,
  retryText = 'Try Again',
  homeText = 'Go Home',
  children,
  variant = 'full-page',
  icon,
}: ErrorDisplayProps) {
  const errorMessage = getErrorMessage(error, description);
  const errorIcon = icon || <DefaultErrorIcon />;

  const containerStyles = getContainerStyles(variant);
  const contentStyles = getContentStyles(variant);

  return (
    <div role="alert" aria-live="assertive" style={containerStyles}>
      <div style={contentStyles}>
        {/* Icon */}
        <div style={iconContainerStyle}>{errorIcon}</div>

        {/* Title */}
        <h1 style={titleStyle}>{title}</h1>

        {/* Message */}
        <p style={messageStyle}>{errorMessage}</p>

        {/* Help text */}
        {helpText && <p style={helpTextStyle}>{helpText}</p>}

        {/* Actions */}
        <div style={actionsStyle}>
          {showRetry && onRetry && (
            <button
              onClick={onRetry}
              style={primaryButtonStyle}
              aria-label={retryText}
            >
              {retryText}
            </button>
          )}
          {showHome && onGoHome && (
            <button
              onClick={onGoHome}
              style={secondaryButtonStyle}
              aria-label={homeText}
            >
              {homeText}
            </button>
          )}
        </div>

        {/* Custom children */}
        {children}

        {/* Error ID for support reference */}
        {error && typeof error === 'object' && 'id' in error && (
          <p style={errorIdStyle}>Error ID: {(error as TrackedError).id}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Retry button component for recoverable errors
 */
export function RetryButton({
  onClick,
  children = 'Try Again',
  loading = false,
  disabled = false,
}: {
  onClick: () => void;
  children?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...primaryButtonStyle,
        opacity: disabled || loading ? 0.5 : 1,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
      }}
      aria-label={typeof children === 'string' ? children : 'Try again'}
      aria-busy={loading}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LoadingSpinner />
          Retrying...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

// Helper functions
function getErrorMessage(
  error: TrackedError | Error | string | undefined,
  description?: string
): string {
  if (description) return description;

  if (!error) {
    return 'Something unexpected happened. Please try again.';
  }

  if (typeof error === 'string') return error;

  if ('userMessage' in error) {
    return (error as TrackedError & { userMessage?: string }).userMessage || error.message;
  }

  return error.message || 'An unexpected error occurred.';
}

function getContainerStyles(
  variant: 'full-page' | 'inline' | 'compact'
): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: '0.75rem',
    border: '2px solid #fecaca',
  };

  switch (variant) {
    case 'full-page':
      return {
        ...base,
        minHeight: '100vh',
        padding: '2rem',
      };
    case 'inline':
      return {
        ...base,
        padding: '2rem',
        margin: '1rem 0',
      };
    case 'compact':
      return {
        ...base,
        padding: '1rem',
      };
  }
}

function getContentStyles(
  variant: 'full-page' | 'inline' | 'compact'
): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: variant === 'compact' ? '300px' : '500px',
    width: '100%',
  };
}

// Styles
const iconContainerStyle: React.CSSProperties = {
  marginBottom: '1.5rem',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.875rem',
  fontWeight: 'bold',
  color: '#991b1b',
  marginBottom: '1rem',
  lineHeight: 1.2,
};

const messageStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  color: '#7f1d1d',
  marginBottom: '1rem',
  lineHeight: 1.5,
};

const helpTextStyle: React.CSSProperties = {
  fontSize: '1rem',
  color: '#9ca3af',
  marginBottom: '1.5rem',
  lineHeight: 1.5,
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  gap: '1rem',
  flexWrap: 'wrap',
  justifyContent: 'center',
  marginBottom: '1rem',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.875rem 2rem',
  fontSize: '1.125rem',
  fontWeight: '600',
  color: 'white',
  backgroundColor: '#dc2626',
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  minHeight: '52px',
  minWidth: '140px',
  transition: 'background-color 0.15s ease',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '0.875rem 2rem',
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#374151',
  backgroundColor: '#e5e7eb',
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  minHeight: '52px',
  minWidth: '140px',
  transition: 'background-color 0.15s ease',
};

const errorIdStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#9ca3af',
  fontFamily: 'monospace',
  marginTop: '1rem',
};

// Icons
function DefaultErrorIcon() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" />
      <path
        d="M12 8v4m0 4h.01"
        stroke="#dc2626"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: 'spin 1s linear infinite' }}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        strokeOpacity="0.25"
      />
      <path
        d="M4 12a8 8 0 018-8"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}

export default ErrorDisplay;
