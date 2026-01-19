import type { Question } from '@/types';
import type { ExportFormat, ExportOptions, ExportResult } from './types';

// =============================================================================
// MAIN EXPORT FUNCTIONS
// =============================================================================

/**
 * Export questions to the specified format
 */
export function exportQuestions(
  questions: Question[],
  options: ExportOptions
): ExportResult {
  const { format } = options;

  if (format === 'json') {
    return exportToJson(questions, options);
  } else if (format === 'csv') {
    return exportToCsv(questions, options);
  }

  return {
    success: false,
    content: '',
    filename: '',
    mimeType: '',
    error: `Unsupported export format: ${format}`,
  };
}

/**
 * Export questions to JSON format
 */
export function exportToJson(
  questions: Question[],
  options: ExportOptions
): ExportResult {
  try {
    const exportData = questions.map((q) => {
      const data: Record<string, unknown> = {
        text: q.text,
        type: q.type,
        options: q.options,
        optionTexts: q.optionTexts,
        correctAnswers: q.correctAnswers,
        category: q.category,
        roundIndex: q.roundIndex,
      };

      if (options.includeIds) {
        data.id = q.id;
      }

      if (options.includeExplanations && q.explanation) {
        data.explanation = q.explanation;
      }

      return data;
    });

    const content = JSON.stringify(exportData, null, 2);
    const timestamp = formatTimestamp(new Date());

    return {
      success: true,
      content,
      filename: `trivia-questions-${timestamp}.json`,
      mimeType: 'application/json',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      content: '',
      filename: '',
      mimeType: '',
      error: `Failed to export to JSON: ${message}`,
    };
  }
}

/**
 * Export questions to CSV format
 */
export function exportToCsv(
  questions: Question[],
  options: ExportOptions
): ExportResult {
  try {
    // Build headers
    const headers = ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'roundIndex', 'category', 'type'];

    if (options.includeIds) {
      headers.unshift('id');
    }

    if (options.includeExplanations) {
      headers.push('explanation');
    }

    // Build rows
    const rows: string[] = [headers.join(',')];

    for (const q of questions) {
      const row: string[] = [];

      if (options.includeIds) {
        row.push(escapeCsvField(q.id));
      }

      row.push(escapeCsvField(q.text));

      // Option texts (pad to 4 options)
      for (let i = 0; i < 4; i++) {
        row.push(escapeCsvField(q.optionTexts[i] || ''));
      }

      // Correct answer (join multiple with semicolon)
      row.push(escapeCsvField(q.correctAnswers.join(';')));

      row.push(String(q.roundIndex));
      row.push(q.category);
      row.push(q.type);

      if (options.includeExplanations) {
        row.push(escapeCsvField(q.explanation || ''));
      }

      rows.push(row.join(','));
    }

    const content = rows.join('\n');
    const timestamp = formatTimestamp(new Date());

    return {
      success: true,
      content,
      filename: `trivia-questions-${timestamp}.csv`,
      mimeType: 'text/csv',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      content: '',
      filename: '',
      mimeType: '',
      error: `Failed to export to CSV: ${message}`,
    };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Escape a field for CSV output
 */
function escapeCsvField(value: string): string {
  if (!value) return '';

  // Check if the field needs quoting
  const needsQuoting = value.includes(',') ||
                       value.includes('"') ||
                       value.includes('\n') ||
                       value.includes('\r');

  if (needsQuoting) {
    // Escape double quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return value;
}

/**
 * Format a timestamp for use in filenames
 */
function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}`;
}

/**
 * Trigger a file download in the browser
 */
export function downloadExport(result: ExportResult): void {
  if (!result.success) {
    console.error('Cannot download failed export:', result.error);
    return;
  }

  const blob = new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get questions grouped by round for display
 */
export function groupQuestionsByRound(questions: Question[]): Map<number, Question[]> {
  const grouped = new Map<number, Question[]>();

  for (const question of questions) {
    const round = question.roundIndex;
    if (!grouped.has(round)) {
      grouped.set(round, []);
    }
    grouped.get(round)!.push(question);
  }

  return grouped;
}

/**
 * Get export statistics
 */
export function getExportStats(questions: Question[]): {
  totalQuestions: number;
  totalRounds: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
} {
  const byCategory: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const rounds = new Set<number>();

  for (const q of questions) {
    rounds.add(q.roundIndex);
    byCategory[q.category] = (byCategory[q.category] || 0) + 1;
    byType[q.type] = (byType[q.type] || 0) + 1;
  }

  return {
    totalQuestions: questions.length,
    totalRounds: rounds.size,
    byCategory,
    byType,
  };
}
