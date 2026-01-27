'use client';

import { BingoBall, BingoColumn } from '@/types';

export interface BallDisplayProps {
  ball: BingoBall | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeStyles = {
  sm: 'w-[48px] h-[48px] text-xl',
  md: 'w-[64px] h-[64px] text-2xl',
  lg: 'w-[96px] h-[96px] text-4xl',
  xl: 'w-[160px] h-[160px] text-7xl',
};

const columnColors: Record<BingoColumn, string> = {
  B: 'bg-ball-b text-white',
  I: 'bg-ball-i text-white',
  N: 'bg-ball-n text-gray-900 border-2 border-black dark:border-gray-400',
  G: 'bg-ball-g text-white',
  O: 'bg-ball-o text-white',
};

export function BallDisplay({ ball, size = 'lg' }: BallDisplayProps) {
  if (!ball) {
    return (
      <div
        className={`
          ${sizeStyles[size]}
          rounded-full flex items-center justify-center
          bg-muted/30 border-4 border-dashed border-muted
          font-bold
        `}
        aria-label="No ball called yet"
      >
        <span className="text-muted">?</span>
      </div>
    );
  }

  return (
    <div
      className={`
        ${sizeStyles[size]}
        ${columnColors[ball.column]}
        rounded-full flex items-center justify-center
        font-bold shadow-lg
        transition-transform duration-200
        animate-in zoom-in-50 duration-300
      `}
      role="img"
      aria-label={`Ball ${ball.label}`}
      data-testid={`ball-display-${ball.label}`}
    >
      <span className="flex flex-col items-center leading-none">
        <span className="text-[0.4em] font-semibold">{ball.column}</span>
        <span>{ball.number}</span>
      </span>
    </div>
  );
}

export interface RecentBallsProps {
  balls: BingoBall[];
  maxDisplay?: number;
}

export function RecentBalls({ balls, maxDisplay = 5 }: RecentBallsProps) {
  const displayBalls = balls.slice(0, maxDisplay);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold text-muted-foreground">Recent Calls</h3>
      <div className="flex gap-2 flex-wrap">
        {displayBalls.length === 0 ? (
          <p className="text-muted text-base">No balls called yet</p>
        ) : (
          displayBalls.map((ball, index) => (
            <BallDisplay
              key={`${ball.label}-${index}`}
              ball={ball}
              size="sm"
            />
          ))
        )}
      </div>
    </div>
  );
}

export interface BallCounterProps {
  called: number;
  remaining: number;
}

export function BallCounter({ called, remaining }: BallCounterProps) {
  return (
    <div className="flex gap-6 text-center">
      <div className="flex flex-col">
        <span className="text-3xl font-bold tabular-nums" data-testid="balls-called-count">{called}</span>
        <span className="text-base text-muted-foreground">Called</span>
      </div>
      <div className="w-px bg-border" />
      <div className="flex flex-col">
        <span className="text-3xl font-bold tabular-nums" data-testid="balls-remaining-count">{remaining}</span>
        <span className="text-base text-muted-foreground">Remaining</span>
      </div>
    </div>
  );
}
