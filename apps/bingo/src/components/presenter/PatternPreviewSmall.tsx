'use client';

import { useMemo } from 'react';
import { BingoPattern, PatternCell } from '@/types';

// Constants for the grid
const GRID_SIZE = 5;

// Free space is at center
const FREE_SPACE: PatternCell = { row: 2, col: 2 };

export interface PatternPreviewSmallProps {
  /** The pattern to display */
  pattern: BingoPattern;
  /** Size of each cell in pixels (default: 16) */
  cellSize?: number;
  /** Whether to show the pattern name below */
  showName?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Check if a cell is in the cells array or is the free space
 */
function cellIsMarked(cells: PatternCell[], row: number, col: number): boolean {
  // Free space is always marked
  if (row === FREE_SPACE.row && col === FREE_SPACE.col) {
    return true;
  }
  return cells.some((c) => c.row === row && c.col === col);
}

/**
 * Small pattern preview component for displaying patterns in lists.
 * Shows a compact 5x5 grid visualization of the pattern.
 */
export function PatternPreviewSmall({
  pattern,
  cellSize = 16,
  showName = false,
  className = '',
}: PatternPreviewSmallProps) {
  // Build the grid representation
  const grid = useMemo(() => {
    const result: boolean[][] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      const rowCells: boolean[] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        rowCells.push(cellIsMarked(pattern.cells, row, col));
      }
      result.push(rowCells);
    }
    return result;
  }, [pattern.cells]);

  const gridSize = cellSize * GRID_SIZE + (GRID_SIZE - 1) * 2; // cells + gaps

  return (
    <div
      className={`flex flex-col items-center gap-2 ${className}`}
      aria-label={`Pattern preview: ${pattern.name}`}
    >
      <div
        className="grid gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
          width: `${gridSize}px`,
        }}
        role="img"
        aria-label={`${pattern.name} pattern grid`}
      >
        {grid.map((row, rowIndex) =>
          row.map((isMarked, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
              }}
              className={`
                rounded-sm
                ${
                  isMarked
                    ? 'bg-primary'
                    : 'bg-muted/30 border border-border/50'
                }
              `}
            />
          ))
        )}
      </div>
      {showName && (
        <span className="text-base font-medium text-center text-muted-foreground truncate max-w-full">
          {pattern.name}
        </span>
      )}
    </div>
  );
}
