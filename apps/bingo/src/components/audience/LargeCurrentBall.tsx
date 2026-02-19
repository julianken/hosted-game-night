'use client';

import { BingoBall, BingoColumn } from '@/types';

export interface LargeCurrentBallProps {
  ball: BingoBall | null;
}

const columnColors: Record<BingoColumn, string> = {
  B: 'bg-ball-b text-white',
  I: 'bg-ball-i text-white',
  N: 'bg-ball-n text-gray-900 border-4 border-black dark:border-gray-400',
  G: 'bg-ball-g text-white',
  O: 'bg-ball-o text-white',
};

/**
 * Extra large ball display optimized for audience/projector view.
 * Designed to be readable from 30+ feet away.
 */
export function LargeCurrentBall({ ball }: LargeCurrentBallProps) {
  if (!ball) {
    return (
      <div
        className="
          w-[280px] h-[280px] md:w-[320px] md:h-[320px] lg:w-[400px] lg:h-[400px]
          rounded-full flex items-center justify-center
          bg-muted/30 border-8 border-dashed border-muted
        "
        aria-label="Waiting for first ball"
      >
        <span className="text-8xl md:text-9xl text-muted-foreground font-bold">?</span>
      </div>
    );
  }

  return (
    <div
      className={`
        ${columnColors[ball.column]}
        w-[280px] h-[280px] md:w-[320px] md:h-[320px] lg:w-[400px] lg:h-[400px]
        rounded-full flex items-center justify-center
        font-bold shadow-2xl
        transition-transform duration-300
        animate-in zoom-in-50 duration-500 motion-reduce:animate-none
      `}
      role="img"
      aria-label={`Ball ${ball.label}`}
      aria-live="polite"
    >
      <span className="flex flex-col items-center leading-none">
        <span className="text-4xl md:text-5xl lg:text-6xl font-semibold opacity-90">
          {ball.column}
        </span>
        <span className="text-8xl md:text-9xl lg:text-[10rem]">
          {ball.number}
        </span>
      </span>
    </div>
  );
}
