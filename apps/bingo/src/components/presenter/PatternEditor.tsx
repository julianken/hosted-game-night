'use client';

import { useState, useCallback, useId, useEffect } from 'react';
import { BingoPattern, PatternCell } from '@/types';
import { Button } from "@beak-gaming/ui";
import { Input } from '@/components/ui/Input';

// Constants for the 5x5 grid
const GRID_SIZE = 5;
const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const;

// Free space is always at center (row 2, col 2)
const FREE_SPACE: PatternCell = { row: 2, col: 2 };

export interface PatternEditorProps {
  /** Initial pattern to edit, or null for new pattern */
  initialPattern?: BingoPattern | null;
  /** Called when pattern is saved */
  onSave: (pattern: BingoPattern) => void;
  /** Called when editing is cancelled */
  onCancel: () => void;
}

/**
 * Check if a cell is the free space
 */
function isFreeSpace(row: number, col: number): boolean {
  return row === FREE_SPACE.row && col === FREE_SPACE.col;
}

/**
 * Check if a cell is in the cells array
 */
function cellExists(cells: PatternCell[], row: number, col: number): boolean {
  return cells.some((c) => c.row === row && c.col === col);
}

/**
 * Generate a unique ID for custom patterns
 */
function generatePatternId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Visual pattern editor with a 5x5 clickable grid.
 * Senior-friendly with large click targets (44x44px cells) and high contrast.
 */
export function PatternEditor({
  initialPattern = null,
  onSave,
  onCancel,
}: PatternEditorProps) {
  const nameInputId = useId();
  const descriptionInputId = useId();

  // State for the pattern being edited
  const [name, setName] = useState(initialPattern?.name ?? '');
  const [description, setDescription] = useState(initialPattern?.description ?? '');
  const [cells, setCells] = useState<PatternCell[]>(() => {
    if (initialPattern) {
      // Filter out free space from initial cells (we'll always include it)
      return initialPattern.cells.filter((c) => !isFreeSpace(c.row, c.col));
    }
    return [];
  });

  // Validation state
  const [nameError, setNameError] = useState<string | null>(null);

  // Update state when initialPattern changes
  // This is a valid pattern to sync state with props per React docs
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setName(initialPattern?.name ?? '');
    setDescription(initialPattern?.description ?? '');
    setCells(
      initialPattern
        ? initialPattern.cells.filter((c) => !isFreeSpace(c.row, c.col))
        : []
    );
    setNameError(null);
  }, [initialPattern]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * Toggle a cell on/off
   */
  const toggleCell = useCallback((row: number, col: number) => {
    // Can't toggle free space
    if (isFreeSpace(row, col)) return;

    setCells((prevCells) => {
      const exists = cellExists(prevCells, row, col);
      if (exists) {
        return prevCells.filter((c) => !(c.row === row && c.col === col));
      } else {
        return [...prevCells, { row, col }];
      }
    });
  }, []);

  /**
   * Clear all cells
   */
  const clearAll = useCallback(() => {
    setCells([]);
  }, []);

  /**
   * Fill all cells
   */
  const fillAll = useCallback(() => {
    const allCells: PatternCell[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (!isFreeSpace(row, col)) {
          allCells.push({ row, col });
        }
      }
    }
    setCells(allCells);
  }, []);

  /**
   * Validate and save the pattern
   */
  const handleSave = useCallback(() => {
    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Pattern name is required');
      return;
    }

    if (trimmedName.length < 2) {
      setNameError('Pattern name must be at least 2 characters');
      return;
    }

    setNameError(null);

    // Build the pattern (always include free space)
    const patternCells: PatternCell[] = [...cells];
    if (!cellExists(patternCells, FREE_SPACE.row, FREE_SPACE.col)) {
      patternCells.push({ ...FREE_SPACE });
    }

    const pattern: BingoPattern = {
      id: initialPattern?.id ?? generatePatternId(),
      name: trimmedName,
      category: 'custom' as const,
      cells: patternCells,
      description: description.trim() || undefined,
    };

    onSave(pattern);
  }, [name, description, cells, initialPattern, onSave]);

  /**
   * Handle keyboard shortcuts for cells
   */
  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent, row: number, col: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCell(row, col);
      }
    },
    [toggleCell]
  );

  return (
    <div className="flex flex-col gap-6 p-4 bg-card rounded-lg border-2 border-border">
      <h2 className="text-2xl font-bold">
        {initialPattern ? 'Edit Pattern' : 'Create New Pattern'}
      </h2>

      {/* Pattern name input */}
      <Input
        id={nameInputId}
        label="Pattern Name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setNameError(null);
        }}
        error={nameError ?? undefined}
        placeholder="Enter pattern name..."
        maxLength={50}
        aria-required="true"
      />

      {/* Pattern description input */}
      <Input
        id={descriptionInputId}
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe this pattern..."
        maxLength={200}
      />

      {/* Editor grid section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-lg font-medium">Pattern Grid</label>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={clearAll}
              type="button"
            >
              Clear All
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={fillAll}
              type="button"
            >
              Fill All
            </Button>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-5 gap-2 w-fit" role="grid" aria-label="Bingo pattern editor grid">
          {/* Column header row */}
          <div className="contents" role="row">
            {COLUMNS.map((letter) => (
              <div
                key={letter}
                className="w-11 h-8 flex items-center justify-center text-lg font-bold text-muted-foreground"
                role="columnheader"
              >
                {letter}
              </div>
            ))}
          </div>

          {/* Grid cells */}
          {Array.from({ length: GRID_SIZE }, (_, rowIndex) => (
            <div key={rowIndex} className="contents" role="row">
              {Array.from({ length: GRID_SIZE }, (_, colIndex) => {
                const isMarked = cellExists(cells, rowIndex, colIndex);
                const isFree = isFreeSpace(rowIndex, colIndex);
                const cellLabel = `${COLUMNS[colIndex]}${rowIndex + 1}${isFree ? ' (Free space)' : ''}${isMarked ? ' - marked' : ' - not marked'}`;

                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    type="button"
                    role="gridcell"
                    aria-label={cellLabel}
                    disabled={isFree}
                    onClick={() => toggleCell(rowIndex, colIndex)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, colIndex)}
                    className={`
                      w-11 h-11 rounded-lg
                      border-2 transition-all duration-150
                      focus:outline-none focus:ring-4 focus:ring-primary/50
                      ${
                        isFree
                          ? 'bg-accent border-accent-foreground cursor-not-allowed'
                          : isMarked
                            ? 'bg-primary border-primary hover:bg-primary/90'
                            : 'bg-muted/30 border-border hover:border-primary hover:bg-muted/50'
                      }
                    `}
                    title={isFree ? 'Free space (always included)' : isMarked ? 'Click to remove' : 'Click to add'}
                  >
                    {isFree && (
                      <span className="text-base font-bold text-accent-foreground">FREE</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <p className="text-base text-muted-foreground">
          Click cells to mark them as required. Free space is always included.
        </p>
      </div>

      {/* Cell count */}
      <p className="text-base text-muted-foreground">
        Cells marked: {cells.length} (+ free space = {cells.length + 1} total)
      </p>

      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} type="button">
          {initialPattern ? 'Update Pattern' : 'Save Pattern'}
        </Button>
      </div>
    </div>
  );
}
