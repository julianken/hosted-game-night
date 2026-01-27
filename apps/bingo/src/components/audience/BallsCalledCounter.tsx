'use client';

export interface BallsCalledCounterProps {
  called: number;
  remaining: number;
}

/**
 * Large ball counter for audience display.
 * Shows balls called and remaining in an easy-to-read format.
 */
export function BallsCalledCounter({ called, remaining }: BallsCalledCounterProps) {
  const progress = (called / 75) * 100;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      {/* Main counter display */}
      <div className="flex items-center justify-center gap-8 md:gap-12">
        <div className="flex flex-col items-center" data-testid="balls-called">
          <span className="text-6xl md:text-7xl lg:text-8xl font-bold tabular-nums text-foreground" data-testid="balls-called-count">
            {called}
          </span>
          <span className="text-xl md:text-2xl text-muted-foreground font-medium">
            Called
          </span>
        </div>

        <div className="text-4xl md:text-5xl text-muted-foreground font-light">/</div>

        <div className="flex flex-col items-center" data-testid="balls-remaining">
          <span className="text-6xl md:text-7xl lg:text-8xl font-bold tabular-nums text-foreground" data-testid="balls-remaining-count">
            {remaining}
          </span>
          <span className="text-xl md:text-2xl text-muted-foreground font-medium">
            Remaining
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-4 md:h-5 bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progress}%` }}
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
