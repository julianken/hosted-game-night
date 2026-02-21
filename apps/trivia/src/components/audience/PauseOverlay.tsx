'use client';

import type { Timer } from '@/types';

export interface PauseOverlayProps {
  /** Whether this is an emergency pause (blanks display completely) */
  emergencyBlank?: boolean;
  /** Timer state to show frozen time, if timer was running */
  timer?: Timer;
}

/**
 * Full-screen overlay shown when the game is paused.
 * Designed for accessible readability on projector displays.
 *
 * In emergency mode, shows a blank screen.
 * In normal pause mode, shows "Game Paused" message with frozen timer.
 */
export function PauseOverlay({ emergencyBlank = false, timer }: PauseOverlayProps) {
  // Emergency blank - show nothing
  if (emergencyBlank) {
    return (
      <div
        className="fixed inset-0 z-50 bg-background"
        role="alert"
        aria-live="assertive"
        aria-label="Display blanked for emergency"
      />
    );
  }

  // Normal pause overlay
  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300 motion-reduce:animate-none"
      role="alert"
      aria-live="polite"
      aria-label="Game paused"
    >
      {/* Pause icon — large enough for back-of-room visibility */}
      <div style={{ marginBottom: 'clamp(24px, 3vh, 48px)' }}>
        <div
          className="rounded-full bg-warning/20 flex items-center justify-center"
          style={{
            width: 'clamp(120px, 16vh, 220px)',
            height: 'clamp(120px, 16vh, 220px)',
          }}
        >
          <svg
            className="text-warning"
            style={{
              width: 'clamp(56px, 8vh, 110px)',
              height: 'clamp(56px, 8vh, 110px)',
            }}
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        </div>
      </div>

      {/* Main message — auditorium-scale text */}
      <h1
        className="font-bold text-foreground"
        style={{
          fontSize: 'clamp(3.5rem, 8vw, 7rem)',
          fontFamily: 'var(--font-display)',
          marginBottom: 'clamp(8px, 1vh, 20px)',
        }}
      >
        Game Paused
      </h1>

      <p
        className="text-muted-foreground"
        style={{
          fontSize: 'clamp(1.75rem, 3.5vw, 3.5rem)',
          marginBottom: 'clamp(20px, 3vh, 48px)',
        }}
      >
        Waiting for the host to resume...
      </p>

      {/* Timer display (if timer was active) */}
      {timer && timer.remaining < timer.duration && (
        <div
          className="bg-muted/20 border border-border"
          style={{
            borderRadius: 'clamp(16px, 1.5vw, 28px)',
            padding: 'clamp(16px, 2.5vh, 40px) clamp(28px, 4vw, 64px)',
          }}
        >
          <p
            className="text-muted-foreground"
            style={{ fontSize: 'clamp(1.25rem, 2.5vw, 2rem)', marginBottom: 'clamp(4px, 0.5vh, 12px)' }}
          >
            Timer frozen at
          </p>
          <p
            className="font-mono font-bold text-warning"
            style={{ fontSize: 'clamp(3.5rem, 7vw, 6rem)' }}
          >
            {formatTime(timer.remaining)}
          </p>
        </div>
      )}

      {/* Pulsing indicator */}
      <div className="flex items-center" style={{ marginTop: 'clamp(24px, 4vh, 56px)', gap: 'clamp(8px, 1vw, 16px)' }}>
        <div
          className="rounded-full bg-warning animate-pulse motion-reduce:animate-none"
          style={{ width: 'clamp(12px, 1.5vh, 20px)', height: 'clamp(12px, 1.5vh, 20px)' }}
        />
        <span
          className="text-muted-foreground"
          style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.25rem)' }}
        >
          Paused
        </span>
      </div>
    </div>
  );
}

/**
 * Format seconds as MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
