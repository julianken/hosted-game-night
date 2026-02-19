'use client';

import { useMemo } from 'react';
import { BingoPattern, COLUMNS } from '@/types';

export interface PatternDisplayProps {
  pattern: BingoPattern | null;
  /** Compact mode: smaller grid, no heading/column headers. For audience display top strip. */
  compact?: boolean;
  /** Hide the pattern name label in compact mode (use when rendering the label externally). */
  hideLabel?: boolean;
}

/**
 * Pattern display for audience view.
 * Default: large with heading, column headers, description.
 * Compact: small grid + name only, fits in a row alongside other elements.
 */
export function PatternDisplay({ pattern, compact = false, hideLabel = false }: PatternDisplayProps) {
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
    return compact ? null : (
      <div className="flex flex-col items-center gap-3">
        <h3 className="text-2xl md:text-3xl font-semibold text-muted-foreground">
          Winning Pattern
        </h3>
        <p className="text-xl text-muted-foreground">No pattern selected</p>
      </div>
    );
  }

  if (compact) {
    return (
      // h-full + flex-col: fill the parent's constrained height.
      // min-h-0 allows this flex child to shrink below its content size.
      <div className="flex flex-col items-center gap-1 h-full min-h-0 overflow-hidden">
        {!hideLabel && (
          <p className="text-sm font-bold text-foreground leading-tight flex-shrink-0 truncate w-full text-center">
            {pattern.name}
          </p>
        )}
        {/* Grid wrapper: flex-1 + min-h-0 so the grid expands to fill remaining height.
            w-full keeps it inside the fixed-size container driven by page.tsx. */}
        <div className="flex-1 min-h-0 w-full">
          <div
            className="grid grid-cols-5 grid-rows-5 w-full h-full"
            style={{ gap: '7px' }}
            role="img"
            aria-label={`${pattern.name} pattern grid showing ${pattern.cells.length} required cells`}
          >
            {grid.map((row, rowIndex) =>
              row.map((isMarked, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="rounded flex items-center justify-center overflow-hidden"
                  style={
                    isMarked
                      ? { backgroundColor: 'var(--primary)' }
                      : { backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }
                  }
                  aria-hidden="true"
                >
                  {rowIndex === 2 && colIndex === 2 && (
                    <span className="text-[10px] font-bold text-primary-foreground opacity-80">
                      F
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
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
