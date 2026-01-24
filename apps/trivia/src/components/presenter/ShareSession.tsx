'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@beak-gaming/ui';
import {
  generateSessionLink,
  getParticipantCounts,
  getSessionState,
  type SessionState,
} from '@beak-gaming/sync';

// =============================================================================
// TYPES
// =============================================================================

export interface ShareSessionProps {
  /** Current session ID */
  sessionId: string;
  /** Whether sync is connected */
  isConnected: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ShareSession({ sessionId, isConnected }: ShareSessionProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);

  // Generate shareable link for audience
  const shareLink = generateSessionLink({
    gameType: 'trivia',
    sessionId,
    role: 'audience',
    baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
  });

  // Generate shareable link for presenter (co-host)
  const presenterLink = generateSessionLink({
    gameType: 'trivia',
    sessionId,
    role: 'presenter',
    baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
  });

  // Load session state periodically for participant counts
  useEffect(() => {
    if (!showPanel) return;

    const loadState = () => {
      setSessionState(getSessionState());
    };

    loadState();
    const interval = setInterval(loadState, 2000);

    return () => clearInterval(interval);
  }, [showPanel]);

  // Copy link to clipboard
  const copyLink = useCallback(
    async (link: string) => {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    },
    []
  );

  // Get participant counts
  const counts = getParticipantCounts();

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
          <span className="ml-1 px-1.5 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-600">
            {counts.total}
          </span>
        )}
      </Button>

      {/* Share panel dropdown */}
      {showPanel && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-xl p-4 shadow-lg z-50"
          role="dialog"
          aria-label="Share session"
        >
          <h3 className="text-lg font-semibold mb-4">Share Session</h3>

          {/* Connection status */}
          <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-muted/30">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Sync active' : 'Sync ready'}
            </span>
          </div>

          {/* Audience link */}
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium text-muted-foreground">
              Audience Display Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-muted/20 border border-border
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
            <p className="text-xs text-muted-foreground">
              Share this link to open the audience display on another device
            </p>
          </div>

          {/* Presenter link (co-host) */}
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium text-muted-foreground">
              Co-Host Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={presenterLink}
                readOnly
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-muted/20 border border-border
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
            <p className="text-xs text-muted-foreground">
              Share this link with a co-host (same controls)
            </p>
          </div>

          {/* Participants */}
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium mb-2">Connected Participants</h4>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">
                  Presenters: {counts.presenter}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
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
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        participant.role === 'presenter'
                          ? 'bg-blue-500'
                          : 'bg-green-500'
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
          <div className="mt-4 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-xs text-amber-600">
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
