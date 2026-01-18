'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { useSyncStore } from '@/stores/sync-store';
import { useSync } from '@/hooks/use-sync';
import { isValidSessionId } from '@/lib/sync/session';
import {
  LargeCurrentBall,
  AudienceBingoBoard,
  PatternDisplay,
  BallsCalledCounter,
} from '@/components/audience';

/**
 * Invalid Session Error Component
 * Displayed when the session ID is missing or invalid.
 */
function InvalidSessionError() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-lg text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-error/20 flex items-center justify-center">
          <svg
            className="w-12 h-12 text-error"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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
        <p className="text-lg text-muted">
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
    <main className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="w-32 h-32 rounded-full border-8 border-muted/30 border-t-primary animate-spin" />
      <p className="mt-6 text-2xl text-muted-foreground">Loading display...</p>
    </main>
  );
}

/**
 * Audience Display Content
 * Inner component that uses useSearchParams (requires Suspense boundary).
 */
function DisplayContent() {
  // Parse session ID from URL
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  // Validate session ID
  if (!sessionId || !isValidSessionId(sessionId)) {
    return <InvalidSessionError />;
  }

  return <AudienceDisplay sessionId={sessionId} />;
}

/**
 * Audience Display Component
 * Renders the game display once we have a valid session.
 */
function AudienceDisplay({ sessionId }: { sessionId: string }) {
  // Initialize sync as audience role with session-scoped channel
  const { isConnected, connectionError, requestSync } = useSync({
    role: 'audience',
    sessionId,
  });

  // Get game state from store (hydrated by sync)
  const currentBall = useGameStore((state) => state.currentBall);
  const calledBalls = useGameStore((state) => state.calledBalls);
  const pattern = useGameStore((state) => state.pattern);
  const status = useGameStore((state) => state.status);
  const { ballsCalled, ballsRemaining } = useGameSelectors();

  // Get sync status
  const lastSyncTimestamp = useSyncStore((state) => state.lastSyncTimestamp);

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

  // Format last sync time
  const lastSyncFormatted = lastSyncTimestamp
    ? new Date(lastSyncTimestamp).toLocaleTimeString()
    : 'Never';

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header with sync status */}
      <header className="bg-muted/10 border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Beak Bingo
            </h1>
            <p className="text-lg text-muted-foreground">Audience Display</p>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-3">
            <div
              className={`
                w-4 h-4 rounded-full
                ${isConnected ? 'bg-success animate-pulse' : 'bg-error'}
              `}
              title={isConnected ? 'Connected to presenter' : 'Disconnected'}
            />
            <span className="text-base text-muted-foreground hidden md:block">
              {isConnected ? `Synced at ${lastSyncFormatted}` : 'Waiting for presenter...'}
            </span>
          </div>
        </div>
      </header>

      {/* Error display */}
      {connectionError && (
        <div className="bg-error/10 border-b border-error px-4 py-3">
          <p className="text-center text-error font-medium">
            Connection Error: {connectionError}
          </p>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto h-full">
          {/* Waiting state */}
          {!isConnected && !currentBall && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="w-32 h-32 rounded-full border-8 border-muted/30 border-t-primary animate-spin" />
              <p className="text-3xl md:text-4xl text-muted-foreground">
                Waiting for presenter...
              </p>
              <p className="text-xl text-muted">
                Open the presenter view in another window to start the game.
              </p>
            </div>
          )}

          {/* Game display - responsive grid layout */}
          {(isConnected || currentBall || calledBalls.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              {/* Left section: Bingo Board */}
              <section className="lg:col-span-5 xl:col-span-4">
                <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
                  <h2 className="text-xl md:text-2xl font-semibold mb-4 text-center">
                    Called Numbers
                  </h2>
                  <AudienceBingoBoard calledBalls={calledBalls} />
                </div>
              </section>

              {/* Center section: Current Ball + Counter */}
              <section className="lg:col-span-4 xl:col-span-5 flex flex-col items-center gap-8">
                {/* Game status indicator */}
                {status !== 'idle' && (
                  <div
                    className={`
                      px-6 py-2 rounded-full text-xl font-semibold
                      ${status === 'playing' ? 'bg-success/20 text-success' : ''}
                      ${status === 'paused' ? 'bg-warning/20 text-warning' : ''}
                      ${status === 'ended' ? 'bg-muted/20 text-muted-foreground' : ''}
                    `}
                  >
                    {status === 'playing' && 'Game in Progress'}
                    {status === 'paused' && 'Game Paused'}
                    {status === 'ended' && 'Game Ended'}
                  </div>
                )}

                {/* Current ball - hero display */}
                <div className="flex flex-col items-center gap-4">
                  <h2 className="text-2xl md:text-3xl font-semibold text-muted-foreground">
                    {currentBall ? 'Current Ball' : 'Ready to Start'}
                  </h2>
                  <LargeCurrentBall ball={currentBall} />
                </div>

                {/* Ball counter */}
                <BallsCalledCounter called={ballsCalled} remaining={ballsRemaining} />
              </section>

              {/* Right section: Pattern Display */}
              <section className="lg:col-span-3 xl:col-span-3">
                <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
                  <PatternDisplay pattern={pattern} />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-muted/10 border-t border-border px-4 py-2">
        <p className="text-center text-base text-muted-foreground">
          Keep this window visible on the projector or large display
        </p>
      </footer>
    </main>
  );
}

/**
 * Audience Display Page
 *
 * Optimized for projector/large TV display.
 * Syncs state from presenter window via BroadcastChannel.
 * Designed to be readable from the back of the room (30+ feet).
 *
 * Requires a valid session ID in the URL query parameter.
 * Navigate via the "Open Display" button in the presenter view.
 */
export default function DisplayPage() {
  return (
    <Suspense fallback={<DisplayLoading />}>
      <DisplayContent />
    </Suspense>
  );
}
