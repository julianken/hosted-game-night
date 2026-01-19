'use client';

import { BingoBall, BingoColumn, COLUMNS, COLUMN_RANGES } from '@/types';
import { useMemo } from 'react';

export interface BingoBoardProps {
  calledBalls: BingoBall[];
}

const columnHeaderColors: Record<BingoColumn, string> = {
  B: 'bg-ball-b text-white',
  I: 'bg-ball-i text-white',
  N: 'bg-ball-n text-gray-900 border border-black dark:border-gray-400',
  G: 'bg-ball-g text-white',
  O: 'bg-ball-o text-white',
};

const columnHighlightColors: Record<BingoColumn, string> = {
  B: 'bg-ball-b/20 text-ball-b font-bold',
  I: 'bg-ball-i/20 text-ball-i font-bold',
  N: 'bg-muted/50 text-foreground font-bold',
  G: 'bg-ball-g/20 text-ball-g font-bold',
  O: 'bg-ball-o/20 text-ball-o font-bold',
};

export function BingoBoard({ calledBalls }: BingoBoardProps) {
  // Create a Set of called numbers for quick lookup
  const calledNumbers = useMemo(() => {
    return new Set(calledBalls.map((ball) => ball.number));
  }, [calledBalls]);

  // Generate the board data: each column has 15 numbers
  const boardData = useMemo(() => {
    return COLUMNS.map((column) => {
      const [min, max] = COLUMN_RANGES[column];
      const numbers: number[] = [];
      for (let n = min; n <= max; n++) {
        numbers.push(n);
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
              h-12 flex items-center justify-center
              text-2xl font-bold rounded-t-lg
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
                    h-10 flex items-center justify-center
                    text-lg rounded transition-colors duration-200
                    ${
                      isCalled
                        ? columnHighlightColors[column]
                        : 'bg-background text-muted-foreground border border-border'
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
