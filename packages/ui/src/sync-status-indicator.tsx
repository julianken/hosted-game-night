'use client';

import { useMemo } from 'react';

export type SyncStatus = 'saving' | 'saved' | 'error';

export interface SyncStatusIndicatorProps {
  /**
   * Current sync status
   */
  status: SyncStatus;

  /**
   * Timestamp when the last save completed (for 'saved' status)
   */
  lastSavedAt?: Date;

  /**
   * Error message to display (for 'error' status)
   */
  errorMessage?: string;

  /**
   * Optional custom className for styling
   */
  className?: string;

  /**
   * Show as compact version (icon only, no text)
   */
  compact?: boolean;
}

/**
 * Format timestamp to relative time string (e.g., "2 minutes ago")
 * Simplified version of date-fns formatDistanceToNow
 */
function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 5) {
    return 'just now';
  }
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? '1 minute' : `${diffInMinutes} minutes`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? '1 hour' : `${diffInHours} hours`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return diffInDays === 1 ? '1 day' : `${diffInDays} days`;
}

/**
 * SyncStatusIndicator - Shows sync status (saving, saved, error) with visual feedback
 *
 * Displays current synchronization state with appropriate icons and messages.
 * Designed to be small and unobtrusive, typically displayed in a corner or status bar.
 *
 * @example
 * ```tsx
 * // Saving state
 * <SyncStatusIndicator status="saving" />
 *
 * // Saved state with timestamp
 * <SyncStatusIndicator
 *   status="saved"
 *   lastSavedAt={new Date('2024-01-20T10:30:00')}
 * />
 *
 * // Error state
 * <SyncStatusIndicator
 *   status="error"
 *   errorMessage="Failed to save game state"
 * />
 *
 * // Compact mode (icon only)
 * <SyncStatusIndicator status="saved" lastSavedAt={new Date()} compact />
 * ```
 */
export function SyncStatusIndicator({
  status,
  lastSavedAt,
  errorMessage,
  className = '',
  compact = false,
}: SyncStatusIndicatorProps) {
  const statusContent = useMemo(() => {
    switch (status) {
      case 'saving':
        return {
          icon: (
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ),
          text: 'Saving...',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950',
          ariaLabel: 'Saving game state',
        };

      case 'saved': {
        const relativeTime = lastSavedAt ? formatDistanceToNow(lastSavedAt) : '';
        return {
          icon: (
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ),
          text: relativeTime
            ? relativeTime === 'just now'
              ? 'Saved just now'
              : `Saved ${relativeTime} ago`
            : 'Saved',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950',
          ariaLabel: `Game state saved ${relativeTime ? (relativeTime === 'just now' ? 'just now' : `${relativeTime} ago`) : 'successfully'}`,
        };
      }

      case 'error':
        return {
          icon: (
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
          text: errorMessage || 'Sync error',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950',
          ariaLabel: `Sync error: ${errorMessage || 'Failed to save'}`,
        };

      default:
        return {
          icon: null,
          text: '',
          color: '',
          bgColor: '',
          ariaLabel: 'Unknown sync status',
        };
    }
  }, [status, lastSavedAt, errorMessage]);

  if (compact) {
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`.trim()}
        role="status"
        aria-label={statusContent.ariaLabel}
        aria-live="polite"
      >
        <span className={statusContent.color}>{statusContent.icon}</span>
      </div>
    );
  }

  return (
    <div
      className={`
        inline-flex items-center gap-2
        px-3 py-1.5 rounded-md
        text-sm font-medium
        ${statusContent.color}
        ${statusContent.bgColor}
        ${className}
      `.trim()}
      role="status"
      aria-label={statusContent.ariaLabel}
      aria-live="polite"
    >
      {statusContent.icon}
      <span>{statusContent.text}</span>
    </div>
  );
}

SyncStatusIndicator.displayName = 'SyncStatusIndicator';
