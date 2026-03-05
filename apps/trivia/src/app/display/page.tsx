'use client';

import { useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

import { useSync } from '@/hooks/use-sync';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { isValidSessionId } from '@/lib/sync/session';
import { useApplyTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/stores/theme-store';
import { SceneRouter } from '@/components/audience/scenes';

/**
 * Invalid Session Error Component
 * Displayed when the session ID is missing or invalid.
 */
function InvalidSessionError() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-8" role="main">
      <div className="max-w-lg text-center space-y-6" role="alert">
        <div className="w-24 h-24 mx-auto rounded-full bg-error/20 flex items-center justify-center" aria-hidden="true">
          <svg
            className="w-12 h-12 text-error"
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
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Invalid Session
        </h1>
        <p className="text-xl text-muted-foreground">
          This display link is invalid or has expired.
        </p>
        <p className="text-lg text-muted-foreground">
          Please use the &quot;Open Display&quot; button from the presenter window to open a valid display.
        </p>
      </div>
    </main>
  );
}

/**
 * Loading fallback while session params are being parsed.
 */
function DisplayLoading() {
  return (
    <main
      className="min-h-screen bg-background flex flex-col items-center justify-center"
      role="main"
      aria-busy="true"
      aria-label="Loading audience display"
    >
      <div
        className="w-32 h-32 rounded-full border-8 border-muted/30 border-t-primary animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      <p className="mt-6 text-2xl text-muted-foreground" role="status" aria-live="polite">
        Loading display...
      </p>
    </main>
  );
}

/**
 * Audience Display Content
 * Inner component that uses useSearchParams (requires Suspense boundary).
 */
function DisplayContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  if (!sessionId || !isValidSessionId(sessionId)) {
    return <InvalidSessionError />;
  }

  return <AudienceDisplay sessionId={sessionId} />;
}

/**
 * Audience Display Component
 * Renders the game display once we have a valid session ID.
 */
function AudienceDisplay({ sessionId }: { sessionId: string }) {
  // Initialize sync as audience role with session-scoped channel
  const { isConnected, requestSync } = useSync({
    role: 'audience',
    sessionId,
  });

  // Fullscreen support
  const { toggleFullscreen } = useFullscreen();

  // Press F to toggle fullscreen
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'f' || e.key === 'F') {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      toggleFullscreen();
    }
  }, [toggleFullscreen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Apply display theme (synced from presenter)
  const displayTheme = useThemeStore((state) => state.displayTheme);
  useApplyTheme(displayTheme);

  // Request sync on visibility change (when user switches back to this tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [requestSync]);

  return (
    <main className="h-screen bg-background flex flex-col overflow-hidden" role="main" aria-label="Trivia audience display" data-connected={isConnected || undefined}>
      <div id="display-content" className="flex-1" role="region" aria-label="Game display area" aria-live="polite">
        <SceneRouter isConnected={isConnected} />
      </div>
    </main>
  );
}

/**
 * Audience Display Page
 *
 * Optimized for projector/large TV display.
 * Syncs state from presenter window via BroadcastChannel.
 * Designed to be readable from the back of the room (30+ feet).
 * Press F to toggle fullscreen.
 *
 * Requires a valid session ID or room code in the URL query parameter.
 * Navigate via the "Open Display" button in the presenter view.
 */
export default function DisplayPage() {
  return (
    <Suspense fallback={<DisplayLoading />}>
      <DisplayContent />
    </Suspense>
  );
}
