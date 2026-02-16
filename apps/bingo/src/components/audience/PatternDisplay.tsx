'use client';

import { useMemo } from 'react';
import { BingoPattern, COLUMNS } from '@/types';

export interface PatternDisplayProps {
  pattern: BingoPattern | null;
}

/**
 * Large pattern display for audience view.
 * Shows the winning pattern in a 5x5 grid with column labels.
 */
export function PatternDisplay({ pattern }: PatternDisplayProps) {
  // Create a 5x5 grid showing the pattern
  const grid = useMemo(() => {
    const cells: boolean[][] = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => false)
    );

    // Mark required cells from pattern
    if (pattern) {
      for (const cell of pattern.cells) {
        if (cell.row >= 0 && cell.row < 5 && cell.col >= 0 && cell.col < 5) {
          cells[cell.row][cell.col] = true;
        }
      }
    }

    return cells;
  }, [pattern]);

  if (!pattern) {
    return (
      <div className="flex flex-col items-center gap-3">
        <h3 className="text-2xl md:text-3xl font-semibold text-muted-foreground">
          Winning Pattern
        </h3>
        <p className="text-xl text-muted">No pattern selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="text-2xl md:text-3xl font-semibold text-muted-foreground">
        Winning Pattern
      </h3>
      <p className="text-3xl md:text-4xl font-bold text-foreground">
        {pattern.name}
      </p>

      {/* Pattern grid with column headers */}
      <div className="flex flex-col gap-1 mt-2">
        {/* Column headers */}
        <div className="grid grid-cols-5 gap-1">
          {COLUMNS.map((column) => (
            <div
              key={column}
              className="w-12 h-8 md:w-14 md:h-10 flex items-center justify-center text-lg md:text-xl font-semibold text-muted-foreground"
            >
              {column}
            </div>
          ))}
        </div>

        {/* Pattern cells */}
        <div
          className="grid grid-cols-5 gap-1"
          role="img"
          aria-label={`${pattern.name} pattern grid showing ${pattern.cells.length} required cells`}
        >
          {grid.map((row, rowIndex) =>
            row.map((isMarked, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`
                  w-12 h-12 md:w-14 md:h-14 rounded-lg
                  flex items-center justify-center
                  transition-colors duration-200 motion-reduce:transition-none
                  ${
                    isMarked
                      ? 'bg-primary shadow-lg'
                      : 'bg-muted/20 border-2 border-border'
                  }
                `}
                aria-hidden="true"
              >
                {/* Free space indicator */}
                {rowIndex === 2 && colIndex === 2 && (
                  <span className="text-base md:text-lg font-bold text-primary-foreground opacity-80">
                    FREE
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {pattern.description && (
        <p className="text-lg md:text-xl text-muted-foreground mt-2 text-center max-w-md">
          {pattern.description}
        </p>
      )}
    </div>
  );
}
