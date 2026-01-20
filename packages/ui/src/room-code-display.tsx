'use client';

import { useState, useCallback } from 'react';
import { Button } from './button';

export interface RoomCodeDisplayProps {
  /** The room code to display (e.g., "SWAN-42") */
  roomCode: string;

  /** Whether the session is currently saving to the database */
  isSaving?: boolean;

  /** Timestamp of the last successful save */
  lastSavedAt?: Date;

  /** Optional custom handler for copying the link (defaults to copying display URL) */
  onCopyLink?: () => void;

  /** Optional handler for showing QR code */
  onShowQR?: () => void;

  /** Optional className for custom styling */
  className?: string;

  /** Whether to show the sync status indicator */
  showSyncStatus?: boolean;
}

/**
 * RoomCodeDisplay - Prominently displays the game room code with copy and share functionality
 *
 * Features:
 * - Large, bold room code display (5xl font) for easy reading
 * - Copy link button with clipboard API
 * - "Copied!" feedback with 2-second timeout
 * - Optional QR code button
 * - Optional sync status indicator (saving, last saved time)
 * - Fully accessible with ARIA labels and keyboard support
 * - Senior-friendly design with high contrast
 *
 * @example
 * ```tsx
 * <RoomCodeDisplay
 *   roomCode="SWAN-42"
 *   isSaving={false}
 *   lastSavedAt={new Date()}
 *   onShowQR={() => setShowQRModal(true)}
 * />
 * ```
 */
export function RoomCodeDisplay({
  roomCode,
  isSaving = false,
  lastSavedAt,
  onCopyLink,
  onShowQR,
  className = '',
  showSyncStatus = true,
}: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (onCopyLink) {
        onCopyLink();
      } else {
        // Default behavior: copy the display URL
        const url = `${window.location.origin}/display?room=${roomCode}`;
        await navigator.clipboard.writeText(url);
      }

      setCopied(true);

      // Reset after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [roomCode, onCopyLink]);

  const formatLastSaved = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 10) {
      return 'just now';
    } else if (diffSecs < 60) {
      return `${diffSecs} seconds ago`;
    } else if (diffMins === 1) {
      return '1 minute ago';
    } else if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}
      role="region"
      aria-label="Room code information"
    >
      {/* Header */}
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Room Code
      </h2>

      {/* Room Code Display */}
      <div
        className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-8 text-center border-2 border-blue-200 dark:border-blue-700"
        role="status"
        aria-live="polite"
      >
        <p
          className="text-5xl font-bold tracking-wider text-blue-900 dark:text-blue-100"
          aria-label={`Room code: ${roomCode.split('-').join(' ')}`}
        >
          {roomCode}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4" role="group" aria-label="Room code actions">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          aria-label={copied ? 'Link copied to clipboard' : 'Copy audience display link to clipboard'}
          className="flex-1"
        >
          <span className="flex items-center justify-center gap-2">
            {copied ? (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Link
              </>
            )}
          </span>
        </Button>

        {onShowQR && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onShowQR}
            aria-label="Show QR code for joining"
            className="flex-1"
          >
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              Show QR Code
            </span>
          </Button>
        )}
      </div>

      {/* Sync Status Indicator */}
      {showSyncStatus && (isSaving || lastSavedAt) && (
        <div
          className="mt-4 text-sm text-gray-600 dark:text-gray-400"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
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
              Saving...
            </span>
          ) : lastSavedAt ? (
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Saved {formatLastSaved(lastSavedAt)}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

RoomCodeDisplay.displayName = 'RoomCodeDisplay';
