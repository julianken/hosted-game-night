'use client';

import { useMemo } from 'react';
import { BallNumber, BingoBall, BingoColumn, COLUMNS, COLUMN_RANGES } from '@/types';

export interface AudienceBingoBoardProps {
  calledBalls: BingoBall[];
}

const columnHeaderColors: Record<BingoColumn, string> = {
  B: 'bg-ball-b text-white',
  I: 'bg-ball-i text-white',
  N: 'bg-ball-n text-gray-900 border-2 border-black dark:border-gray-400',
  G: 'bg-ball-g text-white',
  O: 'bg-ball-o text-white',
};

const columnHighlightColors: Record<BingoColumn, string> = {
  B: 'bg-ball-b/25 text-ball-b font-bold ring-2 ring-ball-b/50',
  I: 'bg-ball-i/25 text-ball-i font-bold ring-2 ring-ball-i/50',
  N: 'bg-muted/40 text-foreground font-bold ring-2 ring-foreground/30',
  G: 'bg-ball-g/25 text-ball-g font-bold ring-2 ring-ball-g/50',
  O: 'bg-ball-o/25 text-ball-o font-bold ring-2 ring-ball-o/50',
};

/**
 * Large bingo board optimized for audience/projector display.
 * Larger cells and text for visibility from the back of the room.
 */
export function AudienceBingoBoard({ calledBalls }: AudienceBingoBoardProps) {
  // Create a Set of called numbers for quick lookup
  const calledNumbers = useMemo(() => {
    return new Set(calledBalls.map((ball) => ball.number));
  }, [calledBalls]);

  // Generate the board data: each column has 15 numbers
  const boardData = useMemo(() => {
    return COLUMNS.map((column) => {
      const [min, max] = COLUMN_RANGES[column];
      const numbers: BallNumber[] = [];
      for (let n = min; n <= max; n++) {
        numbers.push(n as BallNumber);
      }
      return { column, numbers };
    });
  }, []);

  return (
    <div className="flex flex-col gap-1">
      {/* Column headers */}
      <div className="grid grid-cols-5 gap-1">
        {COLUMNS.map((column) => (
          <div
            key={column}
            className={`
              ${columnHeaderColors[column]}
              h-14 md:h-16 flex items-center justify-center
              text-3xl md:text-4xl font-bold rounded-t-lg
            `}
          >
            {column}
          </div>
        ))}
      </div>

      {/* Number grid */}
      <div className="grid grid-cols-5 gap-1">
        {boardData.map(({ column, numbers }) => (
          <div key={column} className="flex flex-col gap-1">
            {numbers.map((num) => {
              const isCalled = calledNumbers.has(num);
              return (
                <div
                  key={num}
                  className={`
                    h-12 md:h-14 flex items-center justify-center
                    text-xl md:text-2xl rounded transition-all duration-300
                    ${
                      isCalled
                        ? columnHighlightColors[column]
                        : 'bg-background text-muted-foreground/60 border border-border'
                    }
                  `}
                >
                  {num}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
