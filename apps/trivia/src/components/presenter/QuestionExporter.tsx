'use client';

import { useState } from 'react';
import type { Question } from '@/types';
import type { ExportFormat, ExportOptions } from '@/lib/questions/types';
import { exportQuestions, downloadExport, getExportStats, groupQuestionsByRound } from '@/lib/questions/exporter';

interface QuestionExporterProps {
  questions: Question[];
}

export function QuestionExporter({ questions }: QuestionExporterProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeIds, setIncludeIds] = useState(false);
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const stats = getExportStats(questions);
  const _questionsByRound = groupQuestionsByRound(questions);

  const handleExport = () => {
    if (questions.length === 0) return;

    setIsExporting(true);
    setShowSuccess(false);

    try {
      const options: ExportOptions = {
        format,
        includeIds,
        includeExplanations,
      };

      const result = exportQuestions(questions, options);

      if (result.success) {
        downloadExport(result);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        console.error('Export failed:', result.error);
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Export Questions</h3>
        <p className="text-base text-muted-foreground">
          No questions to export.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" role="region" aria-label="Question exporter">
      <h3 className="text-lg font-semibold">Export Questions</h3>

      {/* Statistics */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <p className="font-medium text-base">Current Questions</p>
        <div className="grid grid-cols-2 gap-2 text-base">
          <div>
            <span className="text-muted-foreground">Total:</span>
            <span className="ml-2 font-medium">{stats.totalQuestions}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Rounds:</span>
            <span className="ml-2 font-medium">{stats.totalRounds}</span>
          </div>
        </div>

        {/* By category */}
        <div className="space-y-1">
          <p className="text-base text-muted-foreground">By Category:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byCategory).map(([category, count]) => (
              <span
                key={category}
                className="px-2 py-0.5 bg-background rounded text-base"
              >
                {category}: {count}
              </span>
            ))}
          </div>
        </div>

        {/* By type */}
        <div className="space-y-1">
          <p className="text-base text-muted-foreground">By Type:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byType).map(([type, count]) => (
              <span
                key={type}
                className="px-2 py-0.5 bg-background rounded text-base"
              >
                {type.replace('_', ' ')}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Format selection */}
      <div className="space-y-2">
        <p className="text-base font-medium">Export Format</p>
        <div className="flex gap-2">
          <button
            onClick={() => setFormat('json')}
            className={`
              flex-1 px-3 py-2 rounded-lg text-base font-medium transition-colors
              ${format === 'json'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
              }
            `}
            aria-pressed={format === 'json'}
          >
            JSON
          </button>
          <button
            onClick={() => setFormat('csv')}
            className={`
              flex-1 px-3 py-2 rounded-lg text-base font-medium transition-colors
              ${format === 'csv'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
              }
            `}
            aria-pressed={format === 'csv'}
          >
            CSV
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <p className="text-base font-medium">Options</p>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={includeIds}
            onChange={(e) => setIncludeIds(e.target.checked)}
            className="w-5 h-5 rounded border-border text-primary
              focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
          <span className="text-base">Include question IDs</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={includeExplanations}
            onChange={(e) => setIncludeExplanations(e.target.checked)}
            className="w-5 h-5 rounded border-border text-primary
              focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
          <span className="text-base">Include explanations</span>
        </label>
      </div>

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        className={`
          w-full px-4 py-3 rounded-xl text-base font-medium transition-colors
          ${showSuccess
            ? 'bg-success text-white'
            : isExporting
              ? 'bg-primary/70 text-primary-foreground cursor-wait'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }
        `}
      >
        {showSuccess
          ? 'Downloaded!'
          : isExporting
            ? 'Exporting...'
            : `Export ${questions.length} Questions`
        }
      </button>

      {/* Format help */}
      <div className="text-base text-muted-foreground space-y-1">
        <p>
          <strong>JSON:</strong> Full data export, best for backups and re-importing
        </p>
        <p>
          <strong>CSV:</strong> Spreadsheet-compatible, best for editing in Excel/Sheets
        </p>
      </div>
    </div>
  );
}
