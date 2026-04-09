'use client';

import { useState, useCallback, useRef } from 'react';
import type { ImportResult } from '@/lib/questions/types';
import { parseJsonQuestions, readFileContent } from '@/lib/questions/parser';
import { useGameStore } from '@/stores/game-store';
import { useToast } from '@joolie-boolie/ui';
import { getCategoryBadgeClasses } from '@/lib/categories';

interface QuestionSetImporterProps {
  onImportSuccess: () => void;
}

type ImportState = 'idle' | 'loading' | 'preview' | 'error';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function QuestionSetImporter({ onImportSuccess }: QuestionSetImporterProps) {
  const importQuestions = useGameStore((state) => state.importQuestions);
  const { success, error: errorToast } = useToast();

  const [state, setState] = useState<ImportState>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteExpanded, setPasteExpanded] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processJson = useCallback((content: string) => {
    setState('loading');
    setError(null);
    setResult(null);

    try {
      const importResult = parseJsonQuestions(content);
      setResult(importResult);

      if (importResult.success || importResult.questions.length > 0) {
        setState('preview');
      } else {
        setState('error');
        setError(importResult.errors[0]?.message || 'Failed to parse questions');
      }
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setState('error');
      setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`);
      return;
    }

    if (!file.name.endsWith('.json')) {
      setState('error');
      setError('Only .json files are accepted.');
      return;
    }

    try {
      const content = await readFileContent(file);
      processJson(content);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to read file');
    }
  }, [processJson]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) return;
    processJson(pasteText);
  };

  const handleLoadIntoGame = () => {
    if (!result || result.questions.length === 0) return;

    try {
      // Import with roundIndex=0; the redistributeQuestions effect in SetupGate
      // will assign proper round indices based on settings store config.
      const questionsWithRounds = result.questions.map((q) => ({
        ...q,
        roundIndex: 0,
      }));

      importQuestions(questionsWithRounds, 'replace');
      success(`Loaded ${result.questions.length} questions into game`);
      handleReset();
      onImportSuccess();
    } catch (err) {
      setState('preview');
      setError(err instanceof Error ? err.message : 'Failed to load questions');
      errorToast('Failed to load questions into game');
    }
  };

  const handleReset = () => {
    setState('idle');
    setResult(null);
    setError(null);
    setPasteText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4" role="region" aria-label="Import questions from file">
      <h3 className="text-lg font-semibold">Import Questions</h3>

      {/* Idle state: drag-drop + paste */}
      {state === 'idle' && (
        <>
          {/* Drag-and-drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/60 hover:bg-muted/50'
              }
            `}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleBrowseClick()}
            aria-label="Drop zone for question files"
          >
            <div className="space-y-2">
              <div className="text-4xl" aria-hidden="true">📁</div>
              <p className="text-lg font-medium">
                {isDragging ? 'Drop file here' : 'Drag and drop a JSON file here'}
              </p>
              <button
                type="button"
                className="mt-2 px-4 min-h-[48px] py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-base font-medium transition-colors"
                onClick={(e) => { e.stopPropagation(); handleBrowseClick(); }}
              >
                Browse files
              </button>
              <p className="text-base text-muted-foreground mt-2">
                Accepts .json files up to 5MB
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Select question file"
          />

          {/* Collapsible paste section */}
          <div className="border border-border rounded-lg">
            <button
              type="button"
              onClick={() => setPasteExpanded(!pasteExpanded)}
              className="w-full px-4 min-h-[48px] py-3 text-left text-base font-medium flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg"
              aria-expanded={pasteExpanded}
            >
              <span>Or paste JSON text</span>
              <span aria-hidden="true">{pasteExpanded ? '▲' : '▼'}</span>
            </button>
            {pasteExpanded && (
              <div className="px-4 pb-4 space-y-3">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className="w-full min-h-[200px] p-3 font-mono text-base bg-muted/30 border border-border rounded-lg resize-y"
                  placeholder={`[
  {
    "question": "What is the capital of France?",
    "options": ["Paris", "London", "Berlin", "Madrid"],
    "correctIndex": 0,
    "category": "geography"
  }
]`}
                />
                <button
                  type="button"
                  onClick={handlePasteImport}
                  disabled={!pasteText.trim()}
                  className={`
                    w-full px-4 min-h-[48px] py-2 rounded-lg text-base font-medium transition-colors
                    ${pasteText.trim()
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }
                  `}
                >
                  Import
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Loading state */}
      {state === 'loading' && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <div className="animate-spin motion-reduce:animate-none text-2xl" aria-hidden="true">⏳</div>
            <p className="text-base text-muted-foreground">Processing...</p>
          </div>
        </div>
      )}

      {/* Error state (standalone) */}
      {state === 'error' && (
        <div className="space-y-4">
          <div className="p-4 bg-error/10 border border-error/20 rounded-lg" role="alert">
            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden="true">⚠️</span>
              <div>
                <p className="font-medium text-error">Error: Import Failed</p>
                <p className="text-base text-error mt-1">{error}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="w-full px-4 min-h-[48px] py-2 bg-muted hover:bg-muted/80 rounded-lg text-base font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Preview state */}
      {state === 'preview' && result && (
        <div className="space-y-4" aria-live="polite">
          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="font-medium text-lg">Import Summary</p>
            <div className="grid grid-cols-2 gap-2 text-base">
              <div>
                <span className="text-muted-foreground">Total parsed:</span>
                <span className="ml-2 font-medium">{result.totalParsed}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Valid:</span>
                <span className="ml-2 font-medium text-success">{result.totalValid}</span>
              </div>
              {result.totalInvalid > 0 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Invalid:</span>
                  <span className="ml-2 font-medium text-error">{result.totalInvalid}</span>
                </div>
              )}
            </div>
          </div>

          {/* Errors (first 10) */}
          {result.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-base font-medium text-error">
                Errors ({result.errors.length})
              </p>
              <div className="max-h-32 overflow-y-auto border border-error/20 rounded-lg" role="alert">
                {result.errors.slice(0, 10).map((err, i) => (
                  <div key={i} className="px-3 py-2 text-base border-b border-error/10 last:border-0">
                    <span className="font-semibold text-error">Error:</span>
                    <span className="ml-1">Row {err.row + 1} ({err.field}): {err.message}</span>
                  </div>
                ))}
                {result.errors.length > 10 && (
                  <div className="px-3 py-2 text-base text-muted-foreground">
                    ...and {result.errors.length - 10} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warnings (first 5) */}
          {result.warnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-base font-medium text-warning">
                Warnings ({result.warnings.length})
              </p>
              <div className="max-h-24 overflow-y-auto border border-warning/20 rounded-lg">
                {result.warnings.slice(0, 5).map((warn, i) => (
                  <div key={i} className="px-3 py-2 text-base border-b border-warning/10 last:border-0">
                    <span className="font-semibold text-warning">Warning:</span>
                    <span className="ml-1">Row {warn.row + 1}: {warn.message}</span>
                  </div>
                ))}
                {result.warnings.length > 5 && (
                  <div className="px-3 py-2 text-base text-muted-foreground">
                    ...and {result.warnings.length - 5} more warnings
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inline error from load attempt */}
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg" role="alert">
              <p className="text-base text-error"><span className="font-semibold">Error:</span> {error}</p>
            </div>
          )}

          {/* Question preview */}
          {result.questions.length > 0 && (
            <div className="space-y-2">
              <p className="text-base font-medium">Question Preview</p>
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg">
                {result.questions.slice(0, 5).map((q, i) => (
                  <div
                    key={q.id}
                    className="px-3 py-2 text-base border-b border-border last:border-0 flex items-center gap-2"
                  >
                    <span className="text-muted-foreground shrink-0">Q{i + 1}:</span>
                    <span className="truncate">{q.text}</span>
                    {q.category && (
                      <span className={`shrink-0 text-base px-2 py-0.5 rounded-full border ${getCategoryBadgeClasses(q.category)}`}>
                        {q.category.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                ))}
                {result.questions.length > 5 && (
                  <div className="px-3 py-2 text-base text-muted-foreground">
                    ...and {result.questions.length - 5} more questions
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 px-4 min-h-[48px] py-2 bg-muted hover:bg-muted/80 rounded-lg text-base font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLoadIntoGame}
              disabled={result.questions.length === 0}
              className={`
                flex-1 px-4 min-h-[48px] py-2 rounded-lg text-base font-medium transition-colors
                ${result.questions.length > 0
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
                }
              `}
            >
              Load into Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
