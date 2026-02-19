'use client';

import { useId, useMemo } from 'react';
import { BingoPattern, PatternCategory } from '@/types';
import { patternRegistry } from '@/lib/game/patterns';

export interface PatternSelectorProps {
  selectedPattern: BingoPattern | null;
  onSelect: (pattern: BingoPattern) => void;
  disabled?: boolean;
}

const categoryLabels: Record<PatternCategory, string> = {
  lines: 'Lines',
  corners: 'Corners',
  frames: 'Frames',
  shapes: 'Shapes',
  letters: 'Letters',
  coverage: 'Coverage',
  combo: 'Combinations',
  custom: 'Custom',
};

const categoryOrder: PatternCategory[] = [
  'lines',
  'corners',
  'frames',
  'shapes',
  'letters',
  'coverage',
  'combo',
  'custom',
];

export function PatternSelector({
  selectedPattern,
  onSelect,
  disabled = false,
}: PatternSelectorProps) {
  const id = useId();

  // Group patterns by category
  const patternsByCategory = useMemo(() => {
    const groups: Record<string, BingoPattern[]> = {};
    for (const category of categoryOrder) {
      const patterns = patternRegistry.getByCategory(category);
      if (patterns.length > 0) {
        groups[category] = patterns;
      }
    }
    return groups;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pattern = patternRegistry.get(e.target.value);
    if (pattern) {
      onSelect(pattern);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={`text-lg font-medium ${disabled ? 'opacity-50' : ''}`}
      >
        Winning Pattern
      </label>
      <select
        id={id}
        value={selectedPattern?.id ?? ''}
        onChange={handleChange}
        disabled={disabled}
        className={`
          min-h-[56px] px-4 py-3
          text-lg rounded-lg
          bg-background border-2 border-border
          focus:outline-none focus:ring-4 focus:ring-primary/50 focus:border-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
        `}
      >
        <option value="" disabled>
          Select a pattern...
        </option>
        {Object.entries(patternsByCategory).map(([category, patterns]) => (
          <optgroup key={category} label={categoryLabels[category as PatternCategory]}>
            {patterns.map((pattern) => (
              <option key={pattern.id} value={pattern.id}>
                {pattern.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {selectedPattern?.description && (
        <p className="text-base text-muted-foreground">{selectedPattern.description}</p>
      )}
    </div>
  );
}

export interface PatternPreviewProps {
  pattern: BingoPattern | null;
}

export function PatternPreview({ pattern }: PatternPreviewProps) {
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
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-muted-foreground">Pattern Preview</h3>
        <p className="text-base text-muted-foreground">No pattern selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold text-muted-foreground">Pattern Preview</h3>
      <div className="grid grid-cols-5 gap-1 w-fit">
        {grid.map((row, rowIndex) =>
          row.map((isMarked, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`
                w-8 h-8 rounded
                ${
                  isMarked
                    ? 'bg-primary'
                    : 'bg-muted/30 border border-border'
                }
              `}
              title={isMarked ? 'Required' : 'Not required'}
            />
          ))
        )}
      </div>
    </div>
  );
}
