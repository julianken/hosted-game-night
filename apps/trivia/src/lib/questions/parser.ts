import type {
  ImportFormat,
  ParseResult,
  ImportResult,
  RawJsonQuestion,
  RawCsvQuestion,
  CSV_REQUIRED_COLUMNS,
} from './types';
import { validateJsonQuestions, validateCsvQuestions } from './validator';

// =============================================================================
// MAIN PARSING FUNCTIONS
// =============================================================================

/**
 * Parse questions from file content based on format
 */
export function parseQuestions(
  content: string,
  format: ImportFormat
): ImportResult {
  if (format === 'json') {
    return parseJsonQuestions(content);
  } else if (format === 'csv') {
    return parseCsvQuestions(content);
  }

  return {
    success: false,
    questions: [],
    totalParsed: 0,
    totalValid: 0,
    totalInvalid: 0,
    errors: [{ row: -1, field: 'format', message: `Unsupported format: ${format}` }],
    warnings: [],
  };
}

/**
 * Parse questions from JSON content
 */
export function parseJsonQuestions(content: string): ImportResult {
  const parseResult = parseJsonContent(content);

  if (!parseResult.success) {
    return {
      success: false,
      questions: [],
      totalParsed: 0,
      totalValid: 0,
      totalInvalid: 0,
      errors: [{ row: -1, field: 'json', message: parseResult.error || 'Failed to parse JSON' }],
      warnings: [],
    };
  }

  const rawQuestions = parseResult.data as RawJsonQuestion[];
  const validationResult = validateJsonQuestions(rawQuestions);

  return {
    success: validationResult.errors.length === 0,
    questions: validationResult.questions,
    totalParsed: rawQuestions.length,
    totalValid: validationResult.questions.length,
    totalInvalid: rawQuestions.length - validationResult.questions.length,
    errors: validationResult.errors,
    warnings: validationResult.warnings,
  };
}

/**
 * Parse questions from CSV content
 */
export function parseCsvQuestions(content: string): ImportResult {
  const parseResult = parseCsvContent(content);

  if (!parseResult.success) {
    return {
      success: false,
      questions: [],
      totalParsed: 0,
      totalValid: 0,
      totalInvalid: 0,
      errors: [{ row: -1, field: 'csv', message: parseResult.error || 'Failed to parse CSV' }],
      warnings: [],
    };
  }

  const rawQuestions = parseResult.data as RawCsvQuestion[];
  const validationResult = validateCsvQuestions(rawQuestions);

  return {
    success: validationResult.errors.length === 0,
    questions: validationResult.questions,
    totalParsed: rawQuestions.length,
    totalValid: validationResult.questions.length,
    totalInvalid: rawQuestions.length - validationResult.questions.length,
    errors: validationResult.errors,
    warnings: validationResult.warnings,
  };
}

// =============================================================================
// RAW CONTENT PARSING
// =============================================================================

/**
 * Parse raw JSON content into an array of question objects
 */
function parseJsonContent(content: string): ParseResult {
  try {
    const trimmed = content.trim();
    if (!trimmed) {
      return { success: false, data: [], error: 'Empty content' };
    }

    const parsed = JSON.parse(trimmed);

    // Handle both array and object with questions property
    let questions: RawJsonQuestion[];
    if (Array.isArray(parsed)) {
      questions = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.questions)) {
      questions = parsed.questions;
    } else {
      return {
        success: false,
        data: [],
        error: 'JSON must be an array of questions or an object with a "questions" array',
      };
    }

    if (questions.length === 0) {
      return { success: false, data: [], error: 'No questions found in JSON' };
    }

    return { success: true, data: questions };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, data: [], error: `Invalid JSON: ${message}` };
  }
}

/**
 * Parse raw CSV content into an array of question objects
 */
function parseCsvContent(content: string): ParseResult {
  try {
    const trimmed = content.trim();
    if (!trimmed) {
      return { success: false, data: [], error: 'Empty content' };
    }

    const lines = parseCsvLines(trimmed);
    if (lines.length < 2) {
      return { success: false, data: [], error: 'CSV must have a header row and at least one data row' };
    }

    const headers = lines[0];
    const headerMap = createHeaderMap(headers);

    // Validate required columns
    const missingColumns = validateRequiredColumns(headerMap);
    if (missingColumns.length > 0) {
      return {
        success: false,
        data: [],
        error: `Missing required columns: ${missingColumns.join(', ')}`,
      };
    }

    // Parse data rows
    const questions: RawCsvQuestion[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      // Skip empty rows
      if (row.every((cell) => !cell.trim())) continue;

      const question = parseCsvRow(row, headerMap);
      questions.push(question);
    }

    if (questions.length === 0) {
      return { success: false, data: [], error: 'No valid question rows found in CSV' };
    }

    return { success: true, data: questions };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, data: [], error: `Invalid CSV: ${message}` };
  }
}

// =============================================================================
// CSV PARSING UTILITIES
// =============================================================================

/**
 * Parse CSV content into lines, handling quoted fields
 */
function parseCsvLines(content: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"' && currentField === '') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ',') {
        // Field delimiter
        currentLine.push(currentField);
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        // Line delimiter
        if (char === '\r') i++; // Skip \n in \r\n
        currentLine.push(currentField);
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        currentLine = [];
        currentField = '';
      } else if (char !== '\r') {
        currentField += char;
      }
    }
  }

  // Handle last field and line
  currentLine.push(currentField);
  if (currentLine.some((cell) => cell.trim())) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Create a map from column name to index
 */
function createHeaderMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    const normalized = normalizeColumnName(header);
    map.set(normalized, index);
  });
  return map;
}

/**
 * Normalize column name for matching
 */
function normalizeColumnName(name: string): string {
  return name.trim().toLowerCase().replace(/[_\s-]+/g, '');
}

/**
 * Get standard column name mappings
 */
const COLUMN_ALIASES: Record<string, string[]> = {
  question: ['question', 'text', 'questiontext'],
  optiona: ['optiona', 'a', 'option1', 'answer1'],
  optionb: ['optionb', 'b', 'option2', 'answer2'],
  optionc: ['optionc', 'c', 'option3', 'answer3'],
  optiond: ['optiond', 'd', 'option4', 'answer4'],
  correctanswer: ['correctanswer', 'correct', 'answer', 'correctoption'],
  roundindex: ['roundindex', 'round', 'roundnumber'],
  category: ['category', 'cat', 'type'],
  explanation: ['explanation', 'explain', 'details'],
  type: ['questiontype', 'qtype'],
};

/**
 * Find column index by checking aliases
 */
function findColumnIndex(headerMap: Map<string, number>, standardName: string): number {
  const aliases = COLUMN_ALIASES[standardName] || [standardName];
  for (const alias of aliases) {
    const index = headerMap.get(alias);
    if (index !== undefined) return index;
  }
  return -1;
}

/**
 * Validate that required columns are present
 */
function validateRequiredColumns(headerMap: Map<string, number>): string[] {
  const required: string[] = ['question', 'optiona', 'optionb', 'correctanswer', 'roundindex'];
  const missing: string[] = [];

  for (const col of required) {
    if (findColumnIndex(headerMap, col) === -1) {
      missing.push(col);
    }
  }

  return missing;
}

/**
 * Parse a CSV row into a RawCsvQuestion object
 */
function parseCsvRow(row: string[], headerMap: Map<string, number>): RawCsvQuestion {
  const getField = (standardName: string): string => {
    const index = findColumnIndex(headerMap, standardName);
    return index >= 0 && index < row.length ? row[index] : '';
  };

  return {
    question: getField('question'),
    optionA: getField('optiona'),
    optionB: getField('optionb'),
    optionC: getField('optionc'),
    optionD: getField('optiond'),
    correctAnswer: getField('correctanswer'),
    roundIndex: getField('roundindex'),
    category: getField('category'),
    explanation: getField('explanation'),
    type: getField('type'),
  };
}

// =============================================================================
// FORMAT DETECTION
// =============================================================================

/**
 * Detect the format of the content based on file extension or content
 */
export function detectFormat(filename: string, content?: string): ImportFormat | null {
  // Check file extension first
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'json') return 'json';
  if (ext === 'csv') return 'csv';

  // Try to detect from content
  if (content) {
    const trimmed = content.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      return 'json';
    }
    // Check for CSV-like structure (commas and newlines)
    if (trimmed.includes(',') && trimmed.includes('\n')) {
      return 'csv';
    }
  }

  return null;
}

/**
 * Read file content from a File object
 */
export async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
