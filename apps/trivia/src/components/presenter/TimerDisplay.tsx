'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTimerState, useTimerActions } from '@/stores/game-store';
import { useTimerSettings } from '@/stores/settings-store';

export interface TimerDisplayProps {
  /** Whether to show the control buttons (start/stop/reset) */
  showControls?: boolean;
  /** Optional className for styling */
  className?: string;
}

/**
 * Calculate urgency color based on time remaining percentage
 */
function getUrgencyColor(remaining: number, duration: number): string {
  if (duration === 0) return 'text-muted-foreground';

  const percentage = (remaining / duration) * 100;

  if (percentage > 50) {
    // Green - plenty of time
    return 'text-green-600 dark:text-green-500';
  } else if (percentage > 25) {
    // Yellow/Amber - getting low
    return 'text-amber-500 dark:text-amber-400';
  } else {
    // Red - urgent
    return 'text-red-600 dark:text-red-500';
  }
}

/**
 * Calculate progress bar color based on time remaining
 */
function getProgressColor(remaining: number, duration: number): string {
  if (duration === 0) return 'bg-muted';

  const percentage = (remaining / duration) * 100;

  if (percentage > 50) {
    return 'bg-green-500';
  } else if (percentage > 25) {
    return 'bg-amber-500';
  } else {
    return 'bg-red-500';
  }
}

/**
 * Timer display component for the presenter view.
 * Shows countdown with visual urgency indicators and optional controls.
 * Senior-friendly with large text (min 24px for time display).
 */
export function TimerDisplay({
  showControls = true,
  className = '',
}: TimerDisplayProps) {
  const { remaining, duration, isRunning } = useTimerState();
  const { startTimer, stopTimer, resetTimer, tickTimer } = useTimerActions();
  const { timerDuration, timerVisible } = useTimerSettings();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear interval on unmount or when timer stops
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Handle timer ticking
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        tickTimer();
      }, 1000);
    } else {
      clearTimerInterval();
    }

    return clearTimerInterval;
  }, [isRunning, tickTimer, clearTimerInterval]);

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (remaining / duration) * 100 : 0;
  const urgencyColor = getUrgencyColor(remaining, duration);
  const progressColor = getProgressColor(remaining, duration);

  // Format time as MM:SS or just seconds if < 60
  const formatTime = (seconds: number): string => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${seconds}`;
  };

  // Don't render if timer is not visible
  if (!timerVisible) {
    return null;
  }

  const handleStart = () => {
    if (remaining <= 0) {
      // Reset first if timer is at 0
      resetTimer(timerDuration);
    }
    startTimer();
  };

  const handleStop = () => {
    stopTimer();
  };

  const handleReset = () => {
    resetTimer(timerDuration);
  };

  return (
    <div
      className={`flex flex-col gap-3 p-4 rounded-xl bg-card border border-border ${className}`}
      role="region"
      aria-label="Question timer"
    >
      {/* Timer header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Timer</h3>
        <span
          className={`text-base font-medium ${isRunning ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'}`}
          aria-live="polite"
        >
          {isRunning ? 'Running' : 'Stopped'}
        </span>
      </div>

      {/* Large time display - min 24px as per requirements */}
      <div className="flex items-center justify-center py-2">
        <span
          className={`text-5xl font-bold tabular-nums ${urgencyColor} transition-colors duration-300`}
          role="timer"
          aria-live="assertive"
          aria-atomic="true"
        >
          {formatTime(remaining)}
        </span>
        <span className="ml-2 text-lg text-muted-foreground">
          {remaining >= 60 ? '' : 's'}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-3 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={remaining}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-label={`${remaining} seconds remaining out of ${duration}`}
      >
        <div
          className={`h-full ${progressColor} transition-all duration-1000 ease-linear`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Control buttons */}
      {showControls && (
        <div className="flex gap-2 mt-2" role="group" aria-label="Timer controls">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={remaining <= 0 && duration <= 0}
              className="
                flex-1 min-h-[44px] px-4 py-2 text-base font-semibold
                bg-green-600 text-white rounded-lg
                hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-600/50
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-150
              "
              aria-label="Start timer"
            >
              Start
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="
                flex-1 min-h-[44px] px-4 py-2 text-base font-semibold
                bg-amber-500 text-white rounded-lg
                hover:bg-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-500/50
                transition-colors duration-150
              "
              aria-label="Stop timer"
            >
              Stop
            </button>
          )}

          <button
            onClick={handleReset}
            className="
              min-h-[44px] px-4 py-2 text-base font-semibold
              bg-muted text-foreground rounded-lg
              hover:bg-muted/80 focus:outline-none focus:ring-4 focus:ring-muted/50
              transition-colors duration-150
            "
            aria-label={`Reset timer to ${timerDuration} seconds`}
          >
            Reset
          </button>
        </div>
      )}

      {/* Duration info */}
      <p className="text-base text-muted-foreground text-center">
        Duration: {timerDuration}s
      </p>
    </div>
  );
}
