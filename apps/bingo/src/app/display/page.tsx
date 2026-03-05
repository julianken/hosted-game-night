'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { useSync } from '@/hooks/use-sync';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { isValidSessionId } from '@/lib/sync/session';
import {
  BallReveal,
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
 */
function InvalidSessionError() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-8" role="main">
      <div className="max-w-lg text-center space-y-6" role="alert">
        <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }} aria-hidden="true">
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
        <p className="text-xl text-foreground-secondary">
          This display link is invalid or has expired.
        </p>
        <p className="text-lg text-foreground-secondary">
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
        className="w-32 h-32 rounded-full border-8 border-t-primary animate-spin motion-reduce:animate-none"
        style={{ borderColor: 'var(--display-spinner-track)', borderTopColor: 'var(--primary)' }}
        aria-hidden="true"
      />
      <p className="mt-6 text-2xl text-foreground-secondary" role="status" aria-live="polite">
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
 * Board-dominant layout: board fills bottom 2/3, ball + pattern in top 1/3.
 * No header bar -- full-screen immersive display for projector/TV.
 * Keyboard shortcuts (F=fullscreen, ?=help) remain active.
 */
function AudienceDisplay({ sessionId }: { sessionId: string }) {
  const { isConnected, connectionError, requestSync } = useSync({
    role: 'audience',
    sessionId,
  });

  const { toggleFullscreen } = useFullscreen();
  const [showHelp, setShowHelp] = useState(false);
  const toggleHelp = useCallback(() => setShowHelp((prev) => !prev), []);
  const closeHelp = useCallback(() => setShowHelp(false), []);

  const displayTheme = useThemeStore((state) => state.displayTheme);
  useApplyTheme(displayTheme);

  const currentBall = useGameStore((state) => state.currentBall);
  const calledBalls = useGameStore((state) => state.calledBalls);
  const pattern = useGameStore((state) => state.pattern);
  const status = useGameStore((state) => state.status);
  const autoCallEnabled = useGameStore((state) => state.autoCallEnabled);
  const autoCallSpeed = useGameStore((state) => state.autoCallSpeed);
  const { ballsCalled, ballsRemaining } = useGameSelectors();

  // Request sync on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [requestSync]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === '?') {
        event.preventDefault();
        toggleHelp();
        return;
      }

      if (showHelp) return;

      switch (event.code) {
        case 'KeyF':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen, showHelp, toggleHelp]);

  const hasContent = isConnected || (currentBall !== null) || calledBalls.length > 0;

  return (
    <>
      {/* Skip link */}
      <a
        href="#main-display"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:outline-none"
      >
        Skip to main display
      </a>

      <main
        className="flex flex-col overflow-hidden"
        role="main"
        style={{
          height: '100dvh',
          background: 'radial-gradient(ellipse 80% 60% at 50% 35%, var(--display-bg-gradient-inner) 0%, var(--display-bg-gradient-outer) 100%)',
        }}
      >

        {/* Error banner */}
        {connectionError && (
          <div
            className="px-4 py-3 text-center font-medium flex-shrink-0"
            role="alert"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.10)', borderBottom: '1px solid var(--error)', color: 'var(--error)' }}
          >
            Connection Error: {connectionError}
          </div>
        )}

        {/* Main display content */}
        <div id="main-display" className="flex-1 flex flex-col overflow-hidden" aria-label="Audience display">

          {/* Waiting state */}
          {!hasContent && (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-8 text-center p-8"
              role="status"
              aria-live="polite"
            >
              <div
                className="w-32 h-32 rounded-full border-8 animate-spin motion-reduce:animate-none"
                style={{ borderColor: 'var(--display-spinner-track)', borderTopColor: 'var(--primary)' }}
                aria-hidden="true"
              />
              <p className="text-4xl md:text-5xl text-foreground-secondary font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                Waiting for presenter
              </p>
              <p className="text-2xl text-foreground-muted">
                Open the presenter view to start the game.
              </p>
            </div>
          )}

          {/* Game layout: top 1/3 (ball + info + pattern), bottom 2/3 (board) */}
          {hasContent && (
            <div
              className="flex-1 flex flex-col"
              style={{ padding: '2.5vh 3vw 1.5vh 3vw', gap: '1.5vh' }}
            >

              {/* Top row: Ball + counter + pattern */}
              <section
                className="min-h-0 flex items-center"
                style={{ flex: '1.15', padding: '0 0 0 0.5vw', gap: '3vw' }}
                aria-label="Current ball"
              >
                {/* Ball with absolute status badge overlay */}
                <div className="flex-shrink-0 relative flex items-center justify-center">
                  <BallReveal
                    ball={currentBall}
                    autoCallInterval={autoCallSpeed}
                    isAutoCall={autoCallEnabled}
                    size="display"
                  />
                  {(status !== 'idle' || !isConnected) && (
                    <span
                      className="absolute font-semibold rounded-full flex items-center"
                      style={{
                        bottom: '0',
                        right: '-0.3vw',
                        padding: '0.5vh 1vw',
                        fontSize: 'clamp(0.75rem, 1.5vh, 1.15rem)',
                        gap: '0.4vw',
                        backgroundColor: !isConnected
                          ? 'rgba(239, 68, 68, 0.20)'
                          : status === 'playing'
                            ? 'rgba(34, 197, 94, 0.20)'
                            : status === 'paused'
                              ? 'rgba(234, 179, 8, 0.20)'
                              : 'rgba(107, 113, 137, 0.20)',
                        color: !isConnected
                          ? 'var(--error)'
                          : status === 'playing'
                            ? 'var(--success)'
                            : status === 'paused'
                              ? 'var(--warning)'
                              : 'var(--foreground-muted)',
                        border: `1px solid ${
                          !isConnected
                            ? 'rgba(239, 68, 68, 0.40)'
                            : status === 'playing'
                              ? 'rgba(34, 197, 94, 0.40)'
                              : status === 'paused'
                                ? 'rgba(234, 179, 8, 0.40)'
                                : 'rgba(107, 113, 137, 0.30)'
                        }`,
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                        zIndex: 10,
                      }}
                      role="status"
                      aria-live="polite"
                    >
                      {(status === 'playing' || !isConnected) && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full motion-reduce:animate-none ${
                            !isConnected ? 'bg-error animate-pulse' : 'bg-success animate-pulse'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                      {!isConnected
                        ? 'Offline'
                        : status === 'playing'
                          ? 'Live'
                          : status === 'paused'
                            ? 'Paused'
                            : status === 'ended'
                              ? 'Ended'
                              : null}
                    </span>
                  )}
                </div>

                {/* Counter -- glass-like container */}
                <div
                  className="flex-shrink min-w-0 rounded-2xl"
                  style={{
                    padding: '1.8vh 2.5vw',
                    backgroundColor: 'var(--display-counter-bg)',
                    border: '1px solid var(--display-counter-border)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: 'var(--display-counter-shadow)',
                  }}
                >
                  <BallsCalledCounter called={ballsCalled} remaining={ballsRemaining} />
                </div>

                {/* Spacer */}
                <div className="flex-1 min-w-0" />

                {/* Pattern display (compact) -- explicit square size relative to ball */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1" aria-label="Winning pattern">
                  {pattern && (
                    <span
                      className="font-bold text-foreground leading-tight truncate text-center"
                      style={{ fontSize: 'clamp(0.85rem, 1.8vh, 1.3rem)', maxWidth: 'clamp(100px, 24vh, 280px)' }}
                    >
                      {pattern.name}
                    </span>
                  )}
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                      width: 'clamp(100px, 24vh, 280px)',
                      height: 'clamp(100px, 24vh, 280px)',
                      padding: '1.2vh',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--display-pattern-border)',
                      boxShadow: 'var(--display-pattern-shadow)',
                    }}
                  >
                    <PatternDisplay pattern={pattern} compact hideLabel />
                  </div>
                </div>
              </section>

              {/* Board: takes majority of vertical space */}
              <section style={{ flex: '2.5' }} className="min-h-0 flex flex-col items-stretch justify-center" aria-label="Bingo board">
                <div
                  className="rounded-2xl flex flex-col justify-center"
                  style={{
                    height: '88%',
                    padding: '26px',
                    backgroundColor: 'var(--display-board-bg)',
                    border: '1px solid var(--display-board-border)',
                    backdropFilter: 'blur(16px)',
                    boxShadow: 'var(--display-board-shadow)',
                  }}
                >
                  <AudienceBingoBoard calledBalls={calledBalls} />
                </div>
              </section>
            </div>
          )}
        </div>

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
 * Optimized for projector/large TV display.
 * Board-dominant layout: top 1/3 ball + pattern, bottom 2/3 board.
 * Syncs state from presenter window via BroadcastChannel.
 * Readable from 10-30 feet (Issue A-23: projector readability).
 */
export default function DisplayPage() {
  return (
    <Suspense fallback={<DisplayLoading />}>
      <DisplayContent />
    </Suspense>
  );
}
