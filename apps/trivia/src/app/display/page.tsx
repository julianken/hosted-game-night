'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

import { useSync } from '@/hooks/use-sync';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { isValidSessionId } from '@/lib/sync/session';
import { isValidRoomCode } from '@joolie-boolie/sync';
import { useApplyTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/stores/theme-store';
import { SceneRouter } from '@/components/audience/scenes';
import { AudienceTimerDisplay } from '@/components/audience/AudienceTimerDisplay';
import { useGameStore } from '@/stores/game-store';

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

  // Determine which session ID to use for BroadcastChannel sync
  // CRITICAL: Must match presenter's channel name logic (roomCode || offlineSessionId || '')
  const effectiveSessionId = roomCode || sessionId;

  // Initialize sync as audience role with session-scoped channel
  const { isConnected, requestSync } = useSync({
    role: 'audience',
    sessionId: effectiveSessionId || '',
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

  // Timer state — targeted selector to minimize re-renders
  const timer = useGameStore((state) => state.timer);

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
    <main className="h-screen bg-background flex flex-col overflow-hidden relative" role="main" aria-label="Trivia audience display">
      <div id="display-content" className="flex-1" role="region" aria-label="Game display area" aria-live="polite">
        <SceneRouter isConnected={isConnected} isResolvingRoomCode={isResolvingRoomCode} roomCode={roomCode ?? undefined} />
      </div>
      {timer.isRunning && (
        <div className="absolute bottom-8 right-8 z-50">
          <AudienceTimerDisplay timer={timer} />
        </div>
      )}
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
