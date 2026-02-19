'use client';

import type { Timer } from '@/types';

export interface AudienceTimerDisplayProps {
  /** Timer state from game store */
  timer: Timer;
  /** Whether the timer should be visible (from settings) */
  visible?: boolean;
}

/**
 * Calculate urgency color based on time remaining percentage.
 * Returns both background and text colors for the circular display.
 */
function getUrgencyColors(remaining: number, duration: number): {
  text: string;
  bg: string;
  ring: string;
  progressStroke: string;
} {
  if (duration === 0) {
    return {
      text: 'text-muted-foreground',
      bg: 'bg-muted/30',
      ring: 'ring-muted',
      progressStroke: 'stroke-muted',
    };
  }

  const percentage = (remaining / duration) * 100;

  if (percentage > 50) {
    // Green - plenty of time
    return {
      text: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-500/10',
      ring: 'ring-green-500/30',
      progressStroke: 'stroke-green-500',
    };
  } else if (percentage > 25) {
    // Yellow/Amber - getting low
    return {
      text: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      ring: 'ring-amber-500/30',
      progressStroke: 'stroke-amber-500',
    };
  } else {
    // Red - urgent
    return {
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500/10',
      ring: 'ring-red-500/30',
      progressStroke: 'stroke-red-500',
    };
  }
}

/**
 * Large audience timer display optimized for projector/large TV view.
 * Designed to be readable from 30+ feet away with min 48px font.
 * Includes circular progress indicator and color-coded urgency.
 * Respects reduced motion preferences.
 */
export function AudienceTimerDisplay({
  timer,
  visible = true,
}: AudienceTimerDisplayProps) {
  const { remaining, duration, isRunning } = timer;

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  // Calculate progress percentage (inverted for countdown effect)
  const progressPercentage = duration > 0 ? (remaining / duration) * 100 : 0;

  // Get urgency colors based on time remaining
  const colors = getUrgencyColors(remaining, duration);

  // Format time as MM:SS or just seconds if under 60
  const formatTime = (seconds: number): string => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${seconds}`;
  };

  // SVG circular progress calculations
  const size = 280;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div
      className="flex flex-col items-center justify-center gap-4"
      role="region"
      aria-label="Question timer"
    >
      {/* Circular timer display */}
      <div className="relative">
        {/* SVG circular progress ring */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 motion-safe:transition-transform motion-safe:duration-1000"
          aria-hidden="true"
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted-foreground/20"
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`${colors.progressStroke} motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-linear`}
          />
        </svg>

        {/* Center time display */}
        <div
          className={`
            absolute inset-0 flex flex-col items-center justify-center
            ${colors.bg} rounded-full m-4 ring-4 ${colors.ring}
            motion-safe:transition-colors motion-safe:duration-300
          `}
        >
          <span
            className={`
              text-7xl lg:text-8xl xl:text-9xl font-bold tabular-nums
              ${colors.text}
              motion-safe:transition-colors motion-safe:duration-300
            `}
            role="timer"
            aria-live="assertive"
            aria-atomic="true"
          >
            {formatTime(remaining)}
          </span>

          {/* Unit label */}
          <span
            className={`
              text-xl lg:text-2xl font-medium
              ${colors.text} opacity-70
            `}
          >
            {remaining >= 60 ? 'minutes' : 'seconds'}
          </span>
        </div>
      </div>

      {/* Status indicator */}
      <div
        className="flex items-center gap-3"
        role="status"
        aria-live="polite"
      >
        <span
          aria-hidden="true"
          className={`
            w-4 h-4 rounded-full
            ${isRunning ? 'bg-green-500 motion-safe:animate-pulse' : 'bg-muted'}
          `}
        />
        <span className="text-2xl lg:text-3xl font-medium text-muted-foreground">
          {isRunning ? 'Time Running' : remaining <= 0 ? "Time's Up!" : 'Timer Paused'}
        </span>
      </div>

      {/* Time up flash effect - only when timer reaches 0 */}
      {remaining <= 0 && duration > 0 && (
        <div
          className={`
            text-4xl lg:text-5xl font-bold text-red-600 dark:text-red-400
            motion-safe:animate-pulse
          `}
          aria-live="assertive"
        >
          TIME!
        </div>
      )}
    </div>
  );
}
