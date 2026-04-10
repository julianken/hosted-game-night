'use client';

import { useMemo } from 'react';
import { BallNumber, BingoBall, BingoColumn, COLUMNS, COLUMN_RANGES } from '@/types';

export interface AudienceBingoBoardProps {
  calledBalls: BingoBall[];
}

/**
 * Column header styles — 3D gradient ball appearance matching the design system.
 */
const columnHeaderBg: Record<BingoColumn, string> = {
  B: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.40) 0%, transparent 55%), #3B82F6',
  I: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.40) 0%, transparent 55%), #EF4444',
  N: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55) 0%, transparent 55%), #E8E6EB',
  G: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.40) 0%, transparent 55%), #22C55E',
  O: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.40) 0%, transparent 55%), #F59E0B',
};

const columnHeaderText: Record<BingoColumn, string> = {
  B: '#FFFFFF',
  I: '#FFFFFF',
  N: '#1A1720',  /* CORRECTED per Part 1 §1.11 */
  G: '#052E16',
  O: '#422006',
};

const columnGlowColor: Record<BingoColumn, string> = {
  B: 'rgba(59, 130, 246, 0.25)',
  I: 'rgba(239, 68, 68, 0.25)',
  N: 'rgba(232, 230, 235, 0.12)',
  G: 'rgba(34, 197, 94, 0.25)',
  O: 'rgba(245, 158, 11, 0.25)',
};

/**
 * Called cell styles — delegates to CSS custom properties so the palette
 * can adapt to light/dark mode. See the --display-called-* tokens in
 * apps/bingo/src/app/globals.css (both :root and :root.light).
 *
 * Previously this was a hardcoded dark-mode-only palette, which made
 * called cells effectively invisible on the light theme (near-white
 * text on a near-white background).
 */
function getCalledCellStyle(column: BingoColumn): React.CSSProperties {
  const key = column.toLowerCase();
  return {
    backgroundColor: `var(--display-called-${key}-bg)`,
    color: `var(--display-called-${key}-text)`,
    boxShadow: `var(--display-called-${key}-shadow)`,
  };
}

/**
 * AudienceBingoBoard — Large-cell board optimized for projector/TV display.
 *
 * Larger cells than the presenter board for visibility from 10-30 feet.
 * Called numbers have column-colored backgrounds and dramatic flash animation.
 *
 * Uncalled numbers: --bingo-text-muted at 40% opacity — deliberately near-invisible
 * for audience display. Design intent: audience focuses on the hero ball.
 * See accessibility audit A-24: audience board is a supporting reference,
 * not the primary information source.
 *
 * Reduced motion: cell-flash-audience-animation is suppressed by global CSS rule.
 */
export function AudienceBingoBoard({ calledBalls }: AudienceBingoBoardProps) {
  const calledNumbers = useMemo(() => {
    return new Set(calledBalls.map((ball) => ball.number));
  }, [calledBalls]);

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
    // min-h-0: this component is a flex child of the board section wrapper;
    // without min-h-0 it refuses to shrink below its natural content height.
    //
    // --board-gap is the single source of truth for ALL spacing in this grid.
    // Using px ensures the gap resolves to the same pixel value in both the
    // horizontal (cell-to-cell) and vertical (row-to-row) directions, satisfying
    // the requirement for identical spacing on both axes.
    // At 1920×1080: 4px gap → cells ≈ 106×115px (nearly square, ~0.92 ratio).
    // At 1280×720:  4px gap → cells ≈  70× 76px (same ratio, same gap in px).
    // At 1366×768:  4px gap → cells ≈  75× 81px (same ratio, same gap in px).
    <div
      className="flex flex-col h-full min-h-0"
      style={{ gap: 'var(--board-gap)', '--board-gap': '14px' } as React.CSSProperties}
      data-testid="called-numbers-board"
    >
      {/* Horizontal rows: each BINGO column is a row with circular header + 15 numbers */}
      {boardData.map(({ column, numbers }) => (
        // items-stretch so cells fill the full row height — this is what allows
        // them to be approximately square without aspect-square forcing overflow.
        <div
          key={column}
          className="flex items-stretch flex-1 min-h-0"
          style={{ gap: 'calc(var(--board-gap) * 2)' }}
        >
          {/* Circular column header ball — scales with row height, capped at 72px.
              aspect-square is safe here because the header is flex-shrink-0 and
              its width is driven by its computed height, not the other way around. */}
          <div
            className="flex-shrink-0 rounded-full flex items-center justify-center font-bold aspect-square self-center"
            style={{
              height: '75%',
              maxHeight: '72px',
              background: columnHeaderBg[column],
              color: columnHeaderText[column],
              // vh-anchored so the header letter scales with section height, not viewport width.
              fontSize: 'clamp(0.9rem, 3.2vh, 1.6rem)',
              boxShadow: `inset 0 -3px 6px rgba(0,0,0,0.25), inset 0 1px 4px rgba(255,255,255,0.20), 0 0 12px ${columnGlowColor[column]}`,
            }}
          >
            {column}
          </div>

          {/* 15 number cells in a horizontal row.
              align-content: stretch ensures rows fill the grid height even though
              this is a single-row grid — needed for cells to inherit row height. */}
          <div
            className="flex-1 grid grid-cols-15 min-h-0"
            style={{ gap: 'var(--board-gap)', alignContent: 'stretch' }}
          >
            {numbers.map((num) => {
              const isCalled = calledNumbers.has(num);
              return (
                // No aspect-square: cell height is driven by the flex row height
                // (items-stretch on the parent row), and width by grid-cols-15.
                // This prevents the fixed 1:1 ratio from forcing overflow at small
                // viewports — cells gracefully lose height as space compresses.
                <div
                  key={num}
                  className={`
                    flex items-center justify-center
                    font-bold rounded-lg transition-all duration-300
                    ${isCalled ? 'cell-flash-audience-animation' : ''}
                  `}
                  style={{
                    // vh-anchored: the board fills flex-[2.5] of screen height.
                    // At 1080px that section is ~592px, 5 rows → ~114px each.
                    // 3.8vh ≈ 41px at 1080px — legible without overflowing the cell.
                    fontSize: 'clamp(1rem, 3.8vh, 2.5rem)',
                    ...(isCalled
                      ? getCalledCellStyle(column)
                      : {
                          backgroundColor: 'var(--display-cell-uncalled-bg)',
                          color: 'var(--bingo-text-muted)',
                          opacity: 0.5,
                          border: '1px solid var(--display-cell-uncalled-border)',
                        }
                    ),
                  }}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
