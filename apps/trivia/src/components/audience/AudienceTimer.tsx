'use client';

import type { Timer } from '@/types';

export interface AudienceTimerProps {
  /** Timer state from game store */
  timer: Timer;
  /** Whether the timer should be visible (from settings) */
  visible?: boolean;
  /** Size variant for different layouts */
  size?: 'default' | 'compact' | 'large';
  /** Whether to show status text below timer */
  showStatus?: boolean;
}

/**
 * Calculate urgency color based on time remaining percentage.
 * Returns Tailwind classes for text, background, ring, and progress stroke.
 */
function getUrgencyColors(remaining: number, duration: number): {
  text: string;
  bg: string;
  ring: string;
  progressStroke: string;
  glow: string;
} {
  if (duration === 0) {
    return {
      text: 'text-muted-foreground',
      bg: 'bg-muted/30',
      ring: 'ring-muted',
      progressStroke: 'stroke-muted',
      glow: '',
    };
  }

  const percentage = (remaining / duration) * 100;

  if (percentage > 50) {
    // Green - plenty of time
    return {
      text: 'text-green-500',
      bg: 'bg-green-500/10',
      ring: 'ring-green-500/40',
      progressStroke: 'stroke-green-500',
      glow: 'shadow-green-500/20',
    };
  } else if (percentage > 25) {
    // Amber - getting low
    return {
      text: 'text-amber-500',
      bg: 'bg-amber-500/10',
      ring: 'ring-amber-500/40',
      progressStroke: 'stroke-amber-500',
      glow: 'shadow-amber-500/30',
    };
  } else {
    // Red - urgent
    return {
      text: 'text-red-500',
      bg: 'bg-red-500/15',
      ring: 'ring-red-500/50',
      progressStroke: 'stroke-red-500',
      glow: 'shadow-red-500/40',
    };
  }
}

/**
 * Format time as MM:SS or just seconds if under 60.
 */
function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${seconds}`;
}

// Size configurations
const sizeConfig = {
  compact: {
    container: 'w-40 h-40 lg:w-48 lg:h-48',
    svgSize: 160,
    strokeWidth: 10,
    timeText: 'text-4xl lg:text-5xl',
    unitText: 'text-base',
    statusText: 'text-lg',
  },
  default: {
    container: 'w-56 h-56 lg:w-72 lg:h-72',
    svgSize: 224,
    strokeWidth: 14,
    timeText: 'text-6xl lg:text-7xl',
    unitText: 'text-lg lg:text-xl',
    statusText: 'text-xl lg:text-2xl',
  },
  large: {
    container: 'w-72 h-72 lg:w-96 lg:h-96',
    svgSize: 280,
    strokeWidth: 16,
    timeText: 'text-7xl lg:text-9xl',
    unitText: 'text-xl lg:text-2xl',
    statusText: 'text-2xl lg:text-3xl',
  },
};

/**
 * Large audience timer display optimized for projector/large TV view.
 * Designed to be readable from 30+ feet away.
 *
 * Features:
 * - Circular progress indicator
 * - Color-coded urgency (green -> amber -> red)
 * - Smooth animations (respects reduced motion)
 * - Multiple size variants
 * - High contrast for projection
 */
export function AudienceTimer({
  timer,
  visible = true,
  size = 'default',
  showStatus = true,
}: AudienceTimerProps) {
  const { remaining, duration, isRunning } = timer;
  const config = sizeConfig[size];

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  // Calculate progress percentage (inverted for countdown effect)
  const progressPercentage = duration > 0 ? (remaining / duration) * 100 : 0;

  // Get urgency colors based on time remaining
  const colors = getUrgencyColors(remaining, duration);

  // SVG circular progress calculations
  const svgSize = config.svgSize;
  const strokeWidth = config.strokeWidth;
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  // Determine if timer has expired
  const isExpired = remaining <= 0 && duration > 0;

  return (
    <div
      className="flex flex-col items-center justify-center gap-4"
      role="region"
      aria-label="Question timer"
    >
      {/* Circular timer display */}
      <div className={`relative ${config.container}`}>
        {/* SVG circular progress ring */}
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="transform -rotate-90"
          aria-hidden="true"
        >
          {/* Background ring */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
          />
          {/* Progress ring */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`
              ${colors.progressStroke}
              motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-linear
            `}
          />
        </svg>

        {/* Center time display */}
        <div
          className={`
            absolute inset-0 flex flex-col items-center justify-center
            ${colors.bg} rounded-full m-2 ring-4 ${colors.ring}
            ${isExpired ? 'motion-safe:animate-pulse' : ''}
            shadow-lg ${colors.glow}
            motion-safe:transition-all motion-safe:duration-300
          `}
        >
          {/* Time value */}
          <span
            className={`
              ${config.timeText} font-bold tabular-nums leading-none
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
              ${config.unitText} font-medium mt-1
              ${colors.text} opacity-70
            `}
          >
            {remaining >= 60 ? 'min' : 'sec'}
          </span>
        </div>
      </div>

      {/* Status indicator */}
      {showStatus && (
        <div
          className="flex items-center gap-3"
          role="status"
          aria-live="polite"
        >
          <span
            aria-hidden="true"
            className={`
              w-4 h-4 rounded-full
              ${isExpired
                ? 'bg-red-500 motion-safe:animate-pulse'
                : isRunning
                  ? 'bg-green-500 motion-safe:animate-pulse'
                  : 'bg-muted'
              }
            `}
          />
          <span className={`${config.statusText} font-medium text-muted-foreground`}>
            {isExpired
              ? "Time's Up!"
              : isRunning
                ? 'Time Running'
                : 'Timer Paused'
            }
          </span>
        </div>
      )}

      {/* Time up flash effect */}
      {isExpired && (
        <div
          className={`
            text-3xl lg:text-4xl font-bold text-red-500
            motion-safe:animate-bounce
          `}
          aria-live="assertive"
        >
          TIME!
        </div>
      )}
    </div>
  );
}
