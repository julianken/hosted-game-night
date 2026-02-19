'use client';

import { BallNumber, BingoBall, BingoColumn, COLUMNS, COLUMN_RANGES } from '@/types';
import { useMemo } from 'react';

export interface BingoBoardProps {
  calledBalls: BingoBall[];
}

/**
 * Column header colors — 3D gradient balls for header row.
 * Uses full ball color tokens from design system.
 */
const columnHeaderClasses: Record<BingoColumn, string> = {
  B: 'bingo-ball bingo-ball-sm',
  I: 'bingo-ball bingo-ball-sm',
  N: 'bingo-ball bingo-ball-sm',
  G: 'bingo-ball bingo-ball-sm',
  O: 'bingo-ball bingo-ball-sm',
};

/**
 * Called cell styles — per-column colored backgrounds using bingo token vars.
 * Inline styles needed to reference CSS custom properties dynamically.
 */
function getCalledCellStyle(column: BingoColumn): React.CSSProperties {
  const map: Record<BingoColumn, { bg: string; color: string }> = {
    B: { bg: 'var(--bingo-cell-b-bg)', color: 'var(--bingo-cell-b-text)' },
    I: { bg: 'var(--bingo-cell-i-bg)', color: 'var(--bingo-cell-i-text)' },
    N: { bg: 'var(--bingo-cell-n-bg)', color: 'var(--bingo-cell-n-text)' },
    G: { bg: 'var(--bingo-cell-g-bg)', color: 'var(--bingo-cell-g-text)' },
    O: { bg: 'var(--bingo-cell-o-bg)', color: 'var(--bingo-cell-o-text)' },
  };
  return {
    backgroundColor: map[column].bg,
    color: map[column].color,
  };
}

export function BingoBoard({ calledBalls }: BingoBoardProps) {
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
    <div className="flex flex-col gap-px" role="grid" aria-label="Bingo board showing called numbers">
      {/* Column headers */}
      <div className="grid grid-cols-5 gap-px" role="row">
        {COLUMNS.map((column) => (
          <div
            key={column}
            role="columnheader"
            aria-label={`Column ${column}`}
            className={`
              ${columnHeaderClasses[column]}
              h-10 flex items-center justify-center
              text-xl font-bold rounded-t-md
            `}
            data-column={column}
          >
            <span className="relative z-[2]">{column}</span>
          </div>
        ))}
      </div>

      {/* Number grid — transposed to display rows correctly */}
      {/*
        Cell font size is intentionally 15px below the 18px minimum.
        Intentional exception to 18px minimum: board is a reference grid.
        Primary readability is via the called ball display at 96px+.
        See accessibility audit A-22.
      */}
      {Array.from({ length: 15 }, (_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-5 gap-px" role="row">
          {boardData.map(({ column, numbers }) => {
            const num = numbers[rowIndex];
            const isCalled = calledNumbers.has(num);
            return (
              <div
                key={num}
                role="gridcell"
                aria-label={`${column}${num}${isCalled ? ', called' : ''}`}
                className={`
                  h-8 flex items-center justify-center
                  rounded transition-colors duration-150 motion-reduce:transition-none
                  font-medium
                  ${isCalled
                    ? 'font-bold cell-highlight-animation'
                    : 'bg-surface text-foreground-secondary'
                  }
                `}
                style={{
                  fontSize: '15px',
                  ...(isCalled ? getCalledCellStyle(column) : {}),
                }}
              >
                {num}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
