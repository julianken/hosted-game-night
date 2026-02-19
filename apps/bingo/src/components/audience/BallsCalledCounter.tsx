'use client';

export interface BallsCalledCounterProps {
  called: number;
  remaining: number;
}

/**
 * Ball counter for audience display top row.
 *
 * Sizing strategy: the top row is flex-[0.80] of the viewport height (~27% of
 * 1080px = ~290px). This counter must fit alongside the ball and pattern, so it
 * cannot use breakpoint-based font sizes that assume a full-width context.
 *
 * clamp() anchors: min avoids illegibility, preferred tracks viewport height so
 * the counter naturally scales with the top section, max caps at a comfortable
 * HD television size.
 */
export function BallsCalledCounter({ called, remaining }: BallsCalledCounterProps) {
  const progress = (called / 75) * 100;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {/* Main counter display */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center" data-testid="balls-called">
          <span
            className="font-bold tabular-nums text-foreground leading-none"
            style={{ fontSize: 'clamp(2.5rem, 7.5vh, 5.5rem)' }}
            data-testid="balls-called-count"
          >
            {called}
          </span>
          <span
            className="text-muted-foreground font-medium leading-tight"
            style={{ fontSize: 'clamp(0.85rem, 2vh, 1.35rem)' }}
          >
            Called
          </span>
        </div>

        <span
          className="text-muted-foreground font-light leading-none"
          style={{ fontSize: 'clamp(1.5rem, 3.5vh, 2.75rem)' }}
          aria-hidden="true"
        >
          /
        </span>

        <div className="flex flex-col items-center" data-testid="balls-remaining">
          <span
            className="font-bold tabular-nums text-foreground leading-none"
            style={{ fontSize: 'clamp(2.5rem, 7.5vh, 5.5rem)' }}
            data-testid="balls-remaining-count"
          >
            {remaining}
          </span>
          <span
            className="text-muted-foreground font-medium leading-tight"
            style={{ fontSize: 'clamp(0.85rem, 2vh, 1.35rem)' }}
          >
            Remaining
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted/30 rounded-full overflow-hidden" style={{ height: 'clamp(6px, 1.2vh, 12px)' }}>
        <div
          className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progress}%`, boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)' }}
          role="progressbar"
          aria-valuenow={called}
          aria-valuemin={0}
          aria-valuemax={75}
          aria-label={`${called} of 75 balls called`}
        />
      </div>
    </div>
  );
}
