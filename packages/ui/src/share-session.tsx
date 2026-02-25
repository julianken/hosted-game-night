'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from './button';
import {
  generateSessionLink,
  getParticipantCounts,
  getSessionState,
  type SessionState,
  type GameType,
} from '@joolie-boolie/sync';

// =============================================================================
// TYPES
// =============================================================================

export interface ShareSessionProps {
  /** Current session ID */
  sessionId: string;
  /** Whether sync is connected */
  isConnected: boolean;
  /** Game type for generating session links */
  gameType: GameType;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ShareSession({ sessionId, isConnected, gameType }: ShareSessionProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [counts, setCounts] = useState(() => getParticipantCounts());
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Generate shareable link for audience
  const shareLink = generateSessionLink({
    gameType,
    sessionId,
    role: 'audience',
    baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
  });

  // Generate shareable link for presenter (co-host)
  const presenterLink = generateSessionLink({
    gameType,
    sessionId,
    role: 'presenter',
    baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
  });

  // Load session state periodically for participant counts
  useEffect(() => {
    if (!showPanel) return;

    const loadState = () => {
      setSessionState(getSessionState());
      setCounts(getParticipantCounts());
    };

    loadState();
    const interval = setInterval(loadState, 2000);

    return () => clearInterval(interval);
  }, [showPanel]);

  // Copy link to clipboard
  const copyLink = useCallback(async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = link;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    setCopied(true);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  // Clean up copied timer on unmount
  useEffect(() => () => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
  }, []);

  // Focus the panel when it opens
  useEffect(() => {
    if (showPanel && panelRef.current) {
      // Focus the first focusable element in the panel, or the panel itself
      const focusable = panelRef.current.querySelector<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) {
        focusable.focus();
      } else {
        panelRef.current.focus();
      }
    }
  }, [showPanel]);

  return (
    <div className="relative">
      {/* Toggle button */}
      <Button
        variant="secondary"
        size="md"
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2"
        aria-expanded={showPanel}
        aria-label={showPanel ? 'Hide share session panel' : 'Share session'}
      >
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
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share
        {counts.total > 1 && (
          <span className="ml-1 px-1.5 py-0.5 text-base font-medium rounded-full bg-success/20 text-success">
            {counts.total}
          </span>
        )}
      </Button>

      {/* Share panel dropdown */}
      {showPanel && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-xl p-4 shadow-lg z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Share session"
          tabIndex={-1}
        >
          <h3 className="text-lg font-semibold mb-4">Share Session</h3>

          {/* Connection status */}
          <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-muted/30">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-success' : 'bg-muted'
              }`}
            />
            <span className="text-base text-muted-foreground">
              {isConnected ? 'Sync active' : 'Sync ready'}
            </span>
          </div>

          {/* Audience link */}
          <div className="space-y-2 mb-4">
            <label htmlFor="audience-link-input" className="text-base font-medium text-muted-foreground">
              Audience Display Link
            </label>
            <div className="flex gap-2">
              <input
                id="audience-link-input"
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 text-base rounded-lg bg-muted/20 border border-border
                  focus:outline-none focus:ring-2 focus:ring-primary/50"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => copyLink(shareLink)}
                className="min-w-[70px]"
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="text-base text-muted-foreground">
              Share this link to open the audience display on another device
            </p>
          </div>

          {/* Presenter link (co-host) */}
          <div className="space-y-2 mb-4">
            <label htmlFor="cohost-link-input" className="text-base font-medium text-muted-foreground">
              Co-Host Link
            </label>
            <div className="flex gap-2">
              <input
                id="cohost-link-input"
                type="text"
                value={presenterLink}
                readOnly
                className="flex-1 px-3 py-2 text-base rounded-lg bg-muted/20 border border-border
                  focus:outline-none focus:ring-2 focus:ring-primary/50"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyLink(presenterLink)}
                className="min-w-[70px]"
              >
                Copy
              </Button>
            </div>
            <p className="text-base text-muted-foreground">
              Share this link with a co-host (same controls)
            </p>
          </div>

          {/* Participants */}
          <div className="border-t border-border pt-4">
            <h4 className="text-base font-medium mb-2">Connected Participants</h4>
            <div className="flex gap-4 text-base">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  Presenters: {counts.presenter}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="text-muted-foreground">
                  Audience: {counts.audience}
                </span>
              </div>
            </div>
            {sessionState?.participants && sessionState.participants.length > 0 && (
              <div className="mt-2 space-y-1">
                {sessionState.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-2 text-base text-muted-foreground"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        participant.role === 'presenter'
                          ? 'bg-primary'
                          : 'bg-success'
                      }`}
                    />
                    <span>
                      {participant.name || `${participant.role} ${participant.id.slice(-4)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note about current implementation */}
          <div className="mt-4 p-2 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-base text-warning">
              Note: Session sharing currently works for same-device windows only.
              Cross-device sync coming soon!
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={() => setShowPanel(false)}
            className="absolute top-3 right-3 min-w-[var(--size-touch)] min-h-[var(--size-touch)] flex items-center justify-center
              rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30
              transition-colors"
            aria-label="Close share panel"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Backdrop to close panel */}
      {showPanel && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowPanel(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
