'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { useSyncStore } from '@/stores/sync-store';
import { useSync } from '@/hooks/use-sync';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { isValidSessionId } from '@/lib/sync/session';
import { isValidRoomCode } from '@beak-gaming/sync';
import { RoomCodeDisplay } from '@beak-gaming/ui';
import {
  LargeCurrentBall,
  AudienceBingoBoard,
  PatternDisplay,
  BallsCalledCounter,
} from '@/components/audience';
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal';
import { useApplyTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/stores/theme-store';

/**
 * Display-specific keyboard shortcuts (view-only mode)
 */
const displayShortcuts = [
  { key: 'F', label: 'F', description: 'Toggle fullscreen' },
  { key: '?', label: '?', description: 'Show this help' },
];

/**
 * Invalid Session Error Component
 * Displayed when the session ID or room code is missing or invalid.
 */
function InvalidSessionError({ type }: { type: 'room' | 'session' }) {
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
  // Parse room code or session ID from URL
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('room');
  const sessionId = searchParams.get('session'); // backward compatibility

  // Validate room code first (preferred), then fall back to session ID
  if (roomCode) {
    if (!isValidRoomCode(roomCode)) {
      return <InvalidSessionError type="room" />;
    }
    return <AudienceDisplay roomCode={roomCode} />;
  }

  // Fall back to session ID for backward compatibility
  if (sessionId) {
    if (!isValidSessionId(sessionId)) {
      return <InvalidSessionError type="session" />;
    }
    return <AudienceDisplay sessionId={sessionId} />;
  }

  // No room code or session ID provided
  return <InvalidSessionError type="room" />;
}

/**
 * Audience Display Component
 * Renders the game display once we have a valid session or room code.
 */
function AudienceDisplay({
  roomCode,
  sessionId,
}: {
  roomCode?: string;
  sessionId?: string;
}) {
  // State for database polling
  const [dbSessionId, setDbSessionId] = useState<string | null>(sessionId || null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isResolvingRoomCode, setIsResolvingRoomCode] = useState(false);

  // Poll database for session ID when using room code
  useEffect(() => {
    if (!roomCode) return;

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let isFirstFetch = true;

    const fetchSessionId = async () => {
      try {
        if (isFirstFetch) {
          setIsResolvingRoomCode(true);
          isFirstFetch = false;
        }
        const response = await fetch(`/api/sessions/room/${roomCode}`);

        if (!response.ok) {
          // Graceful failure - don't set error on 404, just keep polling
          if (response.status !== 404) {
            console.warn(`Failed to fetch session for room ${roomCode}:`, response.statusText);
          }
          return;
        }

        const data = await response.json();
        if (isMounted && data.sessionId) {
          setDbSessionId(data.sessionId);
          setDbError(null);
          setIsResolvingRoomCode(false);
        }
      } catch (error) {
        // Graceful failure - log but don't show error to user
        console.warn('Error fetching session ID:', error);
        setIsResolvingRoomCode(false);
      } finally {
        // Schedule next poll - stop after session ID is resolved
        if (isMounted && !dbSessionId) {
          timeoutId = setTimeout(fetchSessionId, 5000);
        }
      }
    };

    // Start polling
    fetchSessionId();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [roomCode, dbSessionId]);

  // Determine which session ID to use
  const effectiveSessionId = dbSessionId || sessionId;

  // Initialize sync as audience role with session-scoped channel
  const { isConnected, connectionError, requestSync } = useSync({
    role: 'audience',
    sessionId: effectiveSessionId || '',
  });

  // Fullscreen support
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Help modal state
  const [showHelp, setShowHelp] = useState(false);
  const toggleHelp = useCallback(() => setShowHelp((prev) => !prev), []);
  const closeHelp = useCallback(() => setShowHelp(false), []);

  // Apply display theme
  const displayTheme = useThemeStore((state) => state.displayTheme);
  useApplyTheme(displayTheme);

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

  // Keyboard shortcuts for display page (F=fullscreen, ?=help)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Handle help modal toggle with ? key
      if (event.key === '?') {
        event.preventDefault();
        toggleHelp();
        return;
      }

      // Don't process other shortcuts when help modal is open
      if (showHelp) {
        return;
      }

      switch (event.code) {
        case 'KeyF':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen, showHelp, toggleHelp]);

  // Format last sync time
  const lastSyncFormatted = lastSyncTimestamp
    ? new Date(lastSyncTimestamp).toLocaleTimeString()
    : 'Never';

  return (
    <>
      {/* Skip link for keyboard navigation */}
      <a
        href="#main-display"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:outline-none focus:ring-4 focus:ring-primary/50"
      >
        Skip to main display
      </a>
    <main className="min-h-screen bg-background flex flex-col" role="main">
      {/* Header with sync status */}
      <header className="bg-muted/10 border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Beak Bingo
            </h1>
            <p className="text-lg text-muted-foreground">Audience Display</p>
          </div>

          {/* Status indicators and controls */}
          <div className="flex items-center gap-4">
            {/* Fullscreen indicator */}
            {isFullscreen && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg">
                <svg
                  className="w-4 h-4 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
                <span className="text-sm text-primary font-medium hidden sm:inline">Fullscreen</span>
              </div>
            )}

            {/* Fullscreen toggle button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <svg
                  className="w-5 h-5 text-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                  />
                </svg>
              )}
            </button>

            {/* Help button */}
            <button
              onClick={toggleHelp}
              className="p-2 rounded-lg hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              title="Keyboard shortcuts (?)"
              aria-label="Show keyboard shortcuts"
            >
              <svg
                className="w-5 h-5 text-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>

            {/* Connection status */}
            <div
              className="flex items-center gap-3"
              role="status"
              aria-live="polite"
              aria-label={isConnected ? `Connected to presenter, synced at ${lastSyncFormatted}` : 'Waiting for presenter'}
            >
              <div
                className={`
                  w-4 h-4 rounded-full
                  motion-reduce:animate-none
                  ${isConnected ? 'bg-success animate-pulse' : 'bg-error'}
                `}
                aria-hidden="true"
              />
              <span className="text-base text-muted-foreground hidden md:block">
                {isConnected ? `Synced at ${lastSyncFormatted}` : 'Waiting for presenter...'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Error display */}
      {(connectionError || dbError) && (
        <div className="bg-error/10 border-b border-error px-4 py-3" role="alert">
          <p className="text-center text-error font-medium">
            {connectionError ? `Connection Error: ${connectionError}` : `Database Error: ${dbError}`}
          </p>
        </div>
      )}

      {/* Main content */}
      <div id="main-display" className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto h-full">
          {/* Room Code Display - only shown when using room code */}
          {roomCode && (
            <div className="mb-6">
              <RoomCodeDisplay
                roomCode={roomCode}
                showSyncStatus={false}
                className="max-w-md mx-auto"
              />
            </div>
          )}
          {/* Waiting state */}
          {!isConnected && !currentBall && (
            <div
              className="flex flex-col items-center justify-center h-full gap-6 text-center"
              role="status"
              aria-live="polite"
            >
              <div
                className="w-32 h-32 rounded-full border-8 border-muted/30 border-t-primary animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              <p className="text-3xl md:text-4xl text-muted-foreground">
                {isResolvingRoomCode ? 'Connecting to room...' : 'Waiting for presenter...'}
              </p>
              <p className="text-xl text-muted">
                {isResolvingRoomCode
                  ? 'Establishing connection with the game session.'
                  : 'Open the presenter view in another window to start the game.'}
              </p>
            </div>
          )}

          {/* Game display - responsive grid layout */}
          {(isConnected || currentBall || calledBalls.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              {/* Left section: Bingo Board */}
              <section className="lg:col-span-5 xl:col-span-4" aria-label="Bingo board">
                <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
                  <h2 className="text-xl md:text-2xl font-semibold mb-4 text-center">
                    Called Numbers
                  </h2>
                  <AudienceBingoBoard calledBalls={calledBalls} />
                </div>
              </section>

              {/* Center section: Current Ball + Counter */}
              <section className="lg:col-span-4 xl:col-span-5 flex flex-col items-center gap-8" aria-label="Current ball and game status">
                {/* Game status indicator */}
                {status !== 'idle' && (
                  <div
                    role="status"
                    aria-live="polite"
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
              <section className="lg:col-span-3 xl:col-span-3" aria-label="Winning pattern">
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
          Keep this window visible on the projector or large display - Press F for fullscreen, ? for help
        </p>
      </footer>
    </main>
    <KeyboardShortcutsModal
      isOpen={showHelp}
      onClose={closeHelp}
      shortcuts={displayShortcuts}
    />
    </>
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
