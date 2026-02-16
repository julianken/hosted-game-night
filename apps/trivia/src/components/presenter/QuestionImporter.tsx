'use client';

import { useState, useCallback, useRef } from 'react';
import type { GameStatus, Question } from '@/types';
import type { ImportResult } from '@/lib/questions/types';
import { parseQuestions, detectFormat, readFileContent } from '@/lib/questions/parser';

interface QuestionImporterProps {
  status: GameStatus;
  onImport: (questions: Question[], mode: 'replace' | 'append') => void;
}

type ImportState = 'idle' | 'loading' | 'preview' | 'error';

export function QuestionImporter({ status, onImport }: QuestionImporterProps) {
  const [state, setState] = useState<ImportState>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDisabled = status !== 'setup';

  const handleFile = useCallback(async (file: File) => {
    setState('loading');
    setError(null);
    setResult(null);

    try {
      // Detect format
      const format = detectFormat(file.name);
      if (!format) {
        throw new Error(`Unsupported file format. Please use JSON or CSV files.`);
      }

      // Read file content
      const content = await readFileContent(file);

      // Parse and validate
      const importResult = parseQuestions(content, format);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDisabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (isDisabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleConfirmImport = () => {
    if (result && result.questions.length > 0) {
      onImport(result.questions, importMode);
      handleReset();
    }
  };

  const handleReset = () => {
    setState('idle');
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  if (isDisabled) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Import Questions</h3>
        <p className="text-base text-muted-foreground">
          Question import is only available during game setup.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" role="region" aria-label="Question importer">
      <h3 className="text-lg font-semibold">Import Questions</h3>

      {/* Idle/Drop zone state */}
      {state === 'idle' && (
        <>
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
              <div className="text-4xl">📁</div>
              <p className="text-base font-medium">
                {isDragging ? 'Drop file here' : 'Drag and drop a file here'}
              </p>
              <p className="text-base text-muted-foreground">
                or click to browse
              </p>
              <p className="text-base text-muted-foreground mt-2">
                Supports JSON and CSV formats
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Select question file"
          />
        </>
      )}

      {/* Loading state */}
      {state === 'loading' && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <div className="animate-spin motion-reduce:animate-none text-2xl">⏳</div>
            <p className="text-base text-muted-foreground">Processing file...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="space-y-4">
          <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-error text-xl">⚠️</span>
              <div>
                <p className="font-medium text-error">Import Failed</p>
                <p className="text-base text-error mt-1">{error}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg
              text-base font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Preview state */}
      {state === 'preview' && result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="font-medium">Import Summary</p>
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
                  <span className="ml-2 font-medium text-warning">{result.totalInvalid}</span>
                </div>
              )}
            </div>
          </div>

          {/* Validation errors */}
          {result.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-base font-medium text-error">
                Validation Errors ({result.errors.length})
              </p>
              <div className="max-h-32 overflow-y-auto border border-error/20 rounded-lg">
                {result.errors.slice(0, 10).map((err, i) => (
                  <div key={i} className="px-3 py-2 text-base border-b border-error/10 last:border-0">
                    <span className="text-error">Row {err.row + 1}:</span>
                    <span className="ml-1 text-muted-foreground">{err.field}</span>
                    <span className="ml-1">{err.message}</span>
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

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-base font-medium text-warning">
                Warnings ({result.warnings.length})
              </p>
              <div className="max-h-24 overflow-y-auto border border-warning/20 rounded-lg">
                {result.warnings.slice(0, 5).map((warn, i) => (
                  <div key={i} className="px-3 py-2 text-base border-b border-warning/10 last:border-0">
                    <span className="text-warning">Row {warn.row + 1}:</span>
                    <span className="ml-1">{warn.message}</span>
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

          {/* Question preview */}
          {result.questions.length > 0 && (
            <div className="space-y-2">
              <p className="text-base font-medium">Question Preview</p>
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg">
                {result.questions.slice(0, 5).map((q, i) => (
                  <div
                    key={q.id}
                    className="px-3 py-2 text-base border-b border-border last:border-0"
                  >
                    <span className="text-muted-foreground">Q{i + 1}:</span>
                    <span className="ml-2 truncate">{q.text}</span>
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

          {/* Import mode selection */}
          <div className="space-y-2">
            <p className="text-base font-medium">Import Mode</p>
            <div className="flex gap-2">
              <button
                onClick={() => setImportMode('replace')}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-base font-medium transition-colors
                  ${importMode === 'replace'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                  }
                `}
              >
                Replace All
              </button>
              <button
                onClick={() => setImportMode('append')}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-base font-medium transition-colors
                  ${importMode === 'append'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                  }
                `}
              >
                Append
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg
                text-base font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={result.questions.length === 0}
              className={`
                flex-1 px-4 py-2 rounded-lg text-base font-medium transition-colors
                ${result.questions.length > 0
                  ? 'bg-success hover:bg-success/90 text-white'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
                }
              `}
            >
              Import {result.questions.length} Questions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
