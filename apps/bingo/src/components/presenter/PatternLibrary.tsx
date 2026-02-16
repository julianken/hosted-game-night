'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { BingoPattern } from '@/types';
import { Button } from "@beak-gaming/ui";
import { PatternEditor } from './PatternEditor';
import { PatternPreviewSmall } from './PatternPreviewSmall';

// localStorage key for custom patterns
const STORAGE_KEY = 'beak-bingo-custom-patterns';

export interface PatternLibraryProps {
  /** Called when a pattern is selected for use */
  onSelectPattern?: (pattern: BingoPattern) => void;
  /** Whether selection is enabled */
  selectionEnabled?: boolean;
  /** Currently selected pattern ID (for highlighting) */
  selectedPatternId?: string | null;
}

/**
 * Load custom patterns from localStorage
 */
function loadPatterns(): BingoPattern[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const patterns = JSON.parse(stored);
    if (!Array.isArray(patterns)) return [];

    // Validate each pattern has required fields
    return patterns.filter(
      (p): p is BingoPattern =>
        typeof p === 'object' &&
        p !== null &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.category === 'string' &&
        Array.isArray(p.cells)
    );
  } catch {
    console.error('Failed to load custom patterns from localStorage');
    return [];
  }
}

/**
 * Save custom patterns to localStorage
 */
function savePatterns(patterns: BingoPattern[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
  } catch (error) {
    console.error('Failed to save custom patterns to localStorage:', error);
  }
}

/**
 * Export patterns to JSON string
 */
export function exportPatternsToJSON(patterns: BingoPattern[]): string {
  return JSON.stringify(patterns, null, 2);
}

/**
 * Import patterns from JSON string
 */
export function importPatternsFromJSON(json: string): BingoPattern[] {
  const parsed = JSON.parse(json);

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid format: expected an array of patterns');
  }

  // Validate and return patterns
  const validPatterns: BingoPattern[] = [];

  for (const item of parsed) {
    if (
      typeof item === 'object' &&
      item !== null &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      Array.isArray(item.cells)
    ) {
      // Ensure category is 'custom' for imported patterns
      validPatterns.push({
        id: item.id,
        name: item.name,
        category: 'custom',
        cells: item.cells.filter(
          (c: unknown) =>
            typeof c === 'object' &&
            c !== null &&
            typeof (c as { row?: unknown }).row === 'number' &&
            typeof (c as { col?: unknown }).col === 'number'
        ),
        description: typeof item.description === 'string' ? item.description : undefined,
      });
    }
  }

  if (validPatterns.length === 0) {
    throw new Error('No valid patterns found in the imported data');
  }

  return validPatterns;
}

/**
 * Pattern Library component for managing custom bingo patterns.
 * Features: create, edit, delete, import/export patterns with localStorage persistence.
 */
export function PatternLibrary({
  onSelectPattern,
  selectionEnabled = false,
  selectedPatternId = null,
}: PatternLibraryProps) {
  // State
  const [patterns, setPatterns] = useState<BingoPattern[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<BingoPattern | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load patterns on mount using lazy initialization
  useEffect(() => {
    // Defer to next tick to load patterns asynchronously
    const timer = setTimeout(() => {
      setPatterns(loadPatterns());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save patterns whenever they change
  useEffect(() => {
    if (patterns.length > 0 || localStorage.getItem(STORAGE_KEY)) {
      savePatterns(patterns);
    }
  }, [patterns]);

  /**
   * Open editor for creating new pattern
   */
  const handleCreateNew = useCallback(() => {
    setEditingPattern(null);
    setIsEditorOpen(true);
  }, []);

  /**
   * Open editor for editing existing pattern
   */
  const handleEdit = useCallback((pattern: BingoPattern) => {
    setEditingPattern(pattern);
    setIsEditorOpen(true);
  }, []);

  /**
   * Save pattern (create or update)
   */
  const handleSave = useCallback((pattern: BingoPattern) => {
    setPatterns((prev) => {
      const existingIndex = prev.findIndex((p) => p.id === pattern.id);
      if (existingIndex >= 0) {
        // Update existing
        const updated = [...prev];
        updated[existingIndex] = pattern;
        return updated;
      } else {
        // Add new
        return [...prev, pattern];
      }
    });
    setIsEditorOpen(false);
    setEditingPattern(null);
  }, []);

  /**
   * Cancel editing
   */
  const handleCancelEdit = useCallback(() => {
    setIsEditorOpen(false);
    setEditingPattern(null);
  }, []);

  /**
   * Request delete confirmation
   */
  const handleDeleteRequest = useCallback((patternId: string) => {
    setDeleteConfirmId(patternId);
  }, []);

  /**
   * Confirm delete
   */
  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirmId) {
      setPatterns((prev) => prev.filter((p) => p.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId]);

  /**
   * Cancel delete
   */
  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  /**
   * Export all patterns to JSON file
   */
  const handleExport = useCallback(() => {
    if (patterns.length === 0) return;

    const json = exportPatternsToJSON(patterns);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `bingo-patterns-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [patterns]);

  /**
   * Trigger file input for import
   */
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Handle file selection for import
   */
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const importedPatterns = importPatternsFromJSON(json);

        // Add imported patterns, avoiding duplicates by ID
        setPatterns((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPatterns = importedPatterns.filter((p) => !existingIds.has(p.id));

          // If all patterns already exist, update them instead
          if (newPatterns.length === 0) {
            const updated = [...prev];
            for (const imported of importedPatterns) {
              const index = updated.findIndex((p) => p.id === imported.id);
              if (index >= 0) {
                updated[index] = imported;
              }
            }
            return updated;
          }

          return [...prev, ...newPatterns];
        });
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Failed to import patterns');
      }
    };
    reader.readAsText(file);

    // Reset file input
    e.target.value = '';
  }, []);

  /**
   * Select a pattern for use
   */
  const handleSelect = useCallback(
    (pattern: BingoPattern) => {
      if (selectionEnabled && onSelectPattern) {
        onSelectPattern(pattern);
      }
    },
    [selectionEnabled, onSelectPattern]
  );

  // Render editor if open
  if (isEditorOpen) {
    return (
      <PatternEditor
        initialPattern={editingPattern}
        onSave={handleSave}
        onCancel={handleCancelEdit}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-card rounded-lg border-2 border-border">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">Custom Patterns</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="primary" size="sm" onClick={handleCreateNew}>
            Create New
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleImportClick}
          >
            Import
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={patterns.length === 0}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Import patterns from JSON file"
      />

      {/* Import error message */}
      {importError && (
        <div
          role="alert"
          className="p-3 bg-error/10 border border-error rounded-lg text-error text-base"
        >
          {importError}
          <button
            onClick={() => setImportError(null)}
            className="ml-2 text-error underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div
          role="alertdialog"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
          className="p-4 bg-error/10 border-2 border-error rounded-lg"
        >
          <h3 id="delete-dialog-title" className="text-lg font-semibold text-error">
            Delete Pattern?
          </h3>
          <p id="delete-dialog-description" className="text-base text-foreground mt-1">
            Are you sure you want to delete this pattern? This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
              Delete
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDeleteCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Pattern list */}
      {patterns.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-lg text-muted-foreground">
            No custom patterns yet.
          </p>
          <p className="text-base text-muted-foreground mt-2">
            Create your first pattern or import existing ones.
          </p>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          }}
        >
          {patterns.map((pattern) => {
            const isSelected = selectedPatternId === pattern.id;

            return (
              <div
                key={pattern.id}
                className={`
                  flex flex-col gap-3 p-4 rounded-lg border-2 transition-colors
                  ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:border-primary/50'
                  }
                `}
              >
                {/* Pattern preview and name */}
                <div className="flex items-start gap-3">
                  <PatternPreviewSmall pattern={pattern} cellSize={12} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{pattern.name}</h3>
                    {pattern.description && (
                      <p className="text-base text-muted-foreground line-clamp-2 mt-1">
                        {pattern.description}
                      </p>
                    )}
                    <p className="text-base text-muted mt-1">
                      {pattern.cells.length} cells
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  {selectionEnabled && (
                    <Button
                      variant={isSelected ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleSelect(pattern)}
                      aria-pressed={isSelected}
                    >
                      {isSelected ? 'Selected' : 'Use'}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEdit(pattern)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteRequest(pattern.id)}
                    aria-label={`Delete ${pattern.name}`}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pattern count */}
      {patterns.length > 0 && (
        <p className="text-base text-muted-foreground text-center">
          {patterns.length} custom pattern{patterns.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
