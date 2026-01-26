'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { useSyncStore } from '@/stores/sync-store';
import { useSync } from '@/hooks/use-sync';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { isValidSessionId } from '@/lib/sync/session';
import { isValidRoomCode } from '@beak-gaming/sync';
import { RoomCodeDisplay } from '@beak-gaming/ui';
import { useApplyTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/stores/theme-store';
import {
  WaitingDisplay,
  AudienceScoreboard,
  GameEndDisplay,
  PauseOverlay,
  AudienceQuestion,
} from '@/components/audience';

/**
 * Invalid Session Error Component
 * Displayed when the session ID or room code is missing or invalid.
 */
function InvalidSessionError({ type: _type }: { type: 'room' | 'session' }) {
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
  const offlineSessionId = searchParams.get('offline'); // offline mode session ID
  const sessionId = searchParams.get('session'); // backward compatibility

  // Validate room code first (preferred for online mode)
  if (roomCode) {
    if (!isValidRoomCode(roomCode)) {
      return <InvalidSessionError type="room" />;
    }
    return <AudienceDisplay roomCode={roomCode} />;
  }

  // Check for offline session ID
  if (offlineSessionId) {
    if (!isValidSessionId(offlineSessionId)) {
      return <InvalidSessionError type="session" />;
    }
    return <AudienceDisplay sessionId={offlineSessionId} />;
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

  // Apply display theme (synced from presenter)
  const displayTheme = useThemeStore((state) => state.displayTheme);
  useApplyTheme(displayTheme);

  // Get game state from store (hydrated by sync) - use individual selectors to minimize re-renders
  const status = useGameStore((state) => state.status);
  const displayQuestionIndex = useGameStore((state) => state.displayQuestionIndex);
  const questions = useGameStore((state) => state.questions);
  const teams = useGameStore((state) => state.teams);
  const currentRound = useGameStore((state) => state.currentRound);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const emergencyBlank = useGameStore((state) => state.emergencyBlank);
  const timer = useGameStore((state) => state.timer);
  const settings = useGameStore((state) => state.settings);

  // Get computed selectors
  const { teamsSortedByScore, displayQuestion } = useGameSelectors();

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

  // Calculate question position in round for display
  const questionsPerRound = Math.ceil(questions.length / totalRounds) || 5;
  const questionInRound = displayQuestionIndex !== null
    ? (displayQuestionIndex % questionsPerRound) + 1
    : null;

  // Render content based on game state
  const renderContent = () => {
    // 0. Paused state - show pause overlay
    if (status === 'paused') {
      return <PauseOverlay emergencyBlank={emergencyBlank} timer={timer} />;
    }

    // 1. Not connected - waiting for presenter
    if (!isConnected && !displayQuestionIndex && teams.length === 0) {
      return <WaitingDisplay message={isResolvingRoomCode ? "Connecting to room..." : "Waiting for presenter..."} />;
    }

    // 2. Game ended - show final results
    if (status === 'ended') {
      return <GameEndDisplay teams={teamsSortedByScore} />;
    }

    // 3. Between rounds - show scoreboard
    if (status === 'between_rounds') {
      return (
        <AudienceScoreboard
          teams={teamsSortedByScore}
          currentRound={currentRound}
          totalRounds={totalRounds}
        />
      );
    }

    // 4. Question being displayed - use enhanced AudienceQuestion with timer
    if (displayQuestionIndex !== null && displayQuestion) {
      return (
        <AudienceQuestion
          question={displayQuestion}
          questionNumber={questionInRound ?? 1}
          totalQuestions={questionsPerRound}
          roundNumber={currentRound + 1}
          totalRounds={totalRounds}
          timer={timer}
          timerVisible={settings.timerVisible}
        />
      );
    }

    // 5. Playing but no question shown yet
    return <WaitingDisplay message="Get ready..." />;
  };

  return (
    <>
      {/* Skip link for keyboard navigation */}
      <a
        href="#display-content"
        className="sr-only skip-link focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-medium"
      >
        Skip to main content
      </a>

      <main className="min-h-screen bg-background flex flex-col" role="main" aria-label="Trivia audience display">
        {/* Header with sync status */}
        <header className="bg-muted/10 border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Trivia Night
            </h1>
            <p className="text-lg text-muted-foreground">Audience Display</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Connection status */}
            <div className="flex items-center gap-2" role="status" aria-live="polite">
              <div
                className={`
                  w-4 h-4 rounded-full motion-reduce:animate-none
                  ${isConnected ? 'bg-success animate-pulse' : 'bg-error'}
                `}
                aria-hidden="true"
              />
              <span className="text-base text-muted-foreground hidden md:block">
                {isConnected ? `Synced at ${lastSyncFormatted}` : 'Waiting for presenter...'}
              </span>
              <span className="sr-only">
                {isConnected ? 'Connected to presenter' : 'Disconnected from presenter'}
              </span>
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="min-w-[var(--size-touch)] min-h-[var(--size-touch)] flex items-center justify-center rounded-lg
                text-muted-foreground hover:text-foreground hover:bg-muted/30
                transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>
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
      <div id="display-content" className="flex-1 p-4 md:p-6 lg:p-8" role="region" aria-label="Game display area" aria-live="polite">
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
          {renderContent()}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-muted/10 border-t border-border px-4 py-2">
        <p className="text-center text-base text-muted-foreground">
          Keep this window visible on the projector or large display
        </p>
      </footer>
    </main>
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
