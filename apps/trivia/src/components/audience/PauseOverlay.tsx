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
 * Designed for senior-friendly readability on projector displays.
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
      {/* Pause icon */}
      <div className="mb-8">
        <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full bg-warning/20 flex items-center justify-center">
          <svg
            className="w-16 h-16 lg:w-20 lg:h-20 text-warning"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        </div>
      </div>

      {/* Main message */}
      <h1 className="text-5xl lg:text-7xl font-bold text-foreground mb-4">
        Game Paused
      </h1>

      <p className="text-2xl lg:text-3xl text-muted-foreground mb-8">
        Waiting for the host to resume...
      </p>

      {/* Timer display (if timer was active) */}
      {timer && timer.remaining < timer.duration && (
        <div className="bg-muted/20 rounded-2xl px-8 py-4 border border-border">
          <p className="text-xl text-muted-foreground mb-2">Timer frozen at</p>
          <p className="text-5xl lg:text-6xl font-mono font-bold text-warning">
            {formatTime(timer.remaining)}
          </p>
        </div>
      )}

      {/* Pulsing indicator */}
      <div className="mt-12 flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-warning animate-pulse motion-reduce:animate-none" />
        <span className="text-xl text-muted">Paused</span>
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
