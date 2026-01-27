'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from "@beak-gaming/ui";

export interface PinDisplayProps {
  /** The room PIN to display */
  pin: string | null;
  /** Optional offline session ID to show when offline */
  offlineSessionId?: string | null;
  /** Optional class name for styling */
  className?: string;
}

/**
 * PinDisplay Component
 *
 * Displays the room PIN with a copy-to-clipboard button for easy sharing.
 * Shows visual feedback when PIN is copied.
 * In offline mode, displays the session ID instead.
 *
 * Design:
 * - Large PIN display (36-48px) for senior-friendly readability
 * - High contrast for visibility
 * - Clear labeling
 * - Copy button with visual feedback
 */
export function PinDisplay({ pin, offlineSessionId, className = '' }: PinDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!pin) return;

    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy PIN:', err);
    }
  }, [pin]);

  // Reset copied state after 2 seconds with proper cleanup
  useEffect(() => {
    if (copied) {
      const timeoutId = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [copied]);

  // Offline mode - show session ID
  if (offlineSessionId && !pin) {
    return (
      <div
        className={`bg-background border border-border rounded-xl p-4 shadow-sm ${className}`}
        role="status"
        aria-label="Offline Session ID"
      >
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Offline Session ID
        </h3>
        <div className="text-2xl font-mono font-bold text-muted-foreground" data-testid="offline-session-id">
          {offlineSessionId}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          No network connection. PIN sharing unavailable.
        </p>
      </div>
    );
  }

  // No PIN available
  if (!pin) {
    return null;
  }

  return (
    <div
      className={`bg-background border border-border rounded-xl p-4 shadow-sm ${className}`}
      role="status"
      aria-label="Room PIN"
    >
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-foreground">
          Room PIN
        </h3>

        {/* PIN display - large and high contrast */}
        <div
          className="text-4xl md:text-5xl font-mono font-bold text-foreground tracking-wider"
          aria-label={`PIN: ${pin}`}
        >
          {pin}
        </div>

        {/* Copy button with feedback */}
        <Button
          onClick={handleCopy}
          variant="secondary"
          size="md"
          className="w-full"
          aria-label={copied ? 'PIN copied to clipboard' : 'Copy PIN to clipboard'}
        >
          {copied ? (
            <>
              <span className="mr-2" aria-hidden="true">✓</span>
              Copied!
            </>
          ) : (
            <>
              <span className="mr-2" aria-hidden="true">📋</span>
              Copy PIN
            </>
          )}
        </Button>

        {/* Screen reader announcement for copy state */}
        {copied && (
          <div className="sr-only" role="status" aria-live="polite">
            PIN copied to clipboard successfully
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Share this PIN with players to join your game
        </p>
      </div>
    </div>
  );
}
