import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuestionSetImporter } from '../QuestionSetImporter';

const skipIfDisabled = !process.env.NEXT_PUBLIC_FEATURE_QUESTION_SETS || process.env.NEXT_PUBLIC_FEATURE_QUESTION_SETS === 'false';

// Mock readFileContent since FileReader isn't available in jsdom
vi.mock('@/lib/questions/parser', async () => {
  const actual = await vi.importActual<typeof import('@/lib/questions/parser')>('@/lib/questions/parser');
  return {
    ...actual,
    readFileContent: vi.fn(),
  };
});

import { readFileContent } from '@/lib/questions/parser';

const mockReadFileContent = readFileContent as ReturnType<typeof vi.fn>;

global.fetch = vi.fn();

const validJson = JSON.stringify([
  {
    question: 'What is 2+2?',
    options: ['3', '4', '5', '6'],
    correctAnswer: 'B',
    category: 'general_knowledge',
  },
  {
    question: 'Is the sky blue?',
    options: ['True', 'False'],
    correctAnswer: 'True',
    category: 'science',
  },
]);

const wrappedJson = JSON.stringify({
  name: 'My Set',
  description: 'A description',
  questions: [
    {
      question: 'What is 2+2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 'B',
      category: 'general_knowledge',
    },
  ],
});

const mockOnImportSuccess = vi.fn();

function createFile(content: string, name = 'test.json', size?: number): File {
  const file = new File([content], name, { type: 'application/json' });
  if (size !== undefined) {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
}

describe.skipIf(skipIfDisabled)('QuestionSetImporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders drag-drop zone in idle state', () => {
    render(<QuestionSetImporter onImportSuccess={mockOnImportSuccess} />);

    expect(screen.getByRole('button', { name: /drop zone for question files/i })).toBeInTheDocument();
    expect(screen.getByText('Browse files')).toBeInTheDocument();
    expect(screen.getByText(/drag and drop a json file/i)).toBeInTheDocument();
  });

  it('shows paste section when toggled', async () => {
    render(<QuestionSetImporter onImportSuccess={mockOnImportSuccess} />);

    const toggleButton = screen.getByRole('button', { name: /or paste json text/i });
    expect(toggleButton).toBeInTheDocument();

    // Paste section should be collapsed
    expect(screen.queryByPlaceholderText(/What is the capital/)).not.toBeInTheDocument();

    fireEvent.click(toggleButton);

    // Now textarea should be visible
    expect(screen.getByPlaceholderText(/What is the capital/)).toBeInTheDocument();
  });

  it('validates file size (rejects > 5MB)', async () => {
    mockReadFileContent.mockResolvedValue(validJson);

    render(<QuestionSetImporter onImportSuccess={mockOnImportSuccess} />);

    const largeFile = createFile('x', 'big.json', 6 * 1024 * 1024);

    const dropZone = screen.getByRole('button', { name: /drop zone for question files/i });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [largeFile] },
    });

    await waitFor(() => {
      expect(screen.getByText(/file is too large/i)).toBeInTheDocument();
    });
  });

  it('shows preview after valid file input', async () => {
    mockReadFileContent.mockResolvedValue(validJson);

    render(<QuestionSetImporter onImportSuccess={mockOnImportSuccess} />);

    const file = createFile(validJson);
    const dropZone = screen.getByRole('button', { name: /drop zone for question files/i });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText('Import Summary')).toBeInTheDocument();
    });

    expect(screen.getByText(/what is 2\+2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByText('Save to My Question Sets')).toBeInTheDocument();
  });

  it('pre-fills name from JSON wrapper', async () => {
    mockReadFileContent.mockResolvedValue(wrappedJson);

    render(<QuestionSetImporter onImportSuccess={mockOnImportSuccess} />);

    const file = createFile(wrappedJson);
    const dropZone = screen.getByRole('button', { name: /drop zone for question files/i });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('My Set')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('A description')).toBeInTheDocument();
  });

  it('requires name to enable save button', async () => {
    mockReadFileContent.mockResolvedValue(validJson);

    render(<QuestionSetImporter onImportSuccess={mockOnImportSuccess} />);

    const file = createFile(validJson);
    const dropZone = screen.getByRole('button', { name: /drop zone for question files/i });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText('Save to My Question Sets')).toBeInTheDocument();
    });

    // Save button should be disabled (no name)
    const saveButton = screen.getByText('Save to My Question Sets');
    expect(saveButton).toBeDisabled();

    // Type a name
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Set' } });

    expect(saveButton).not.toBeDisabled();
  });

  it('calls onImportSuccess after successful save', async () => {
    mockReadFileContent.mockResolvedValue(validJson);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ questionSet: { id: 'qs-1' } }),
    });

    render(<QuestionSetImporter onImportSuccess={mockOnImportSuccess} />);

    const file = createFile(validJson);
    const dropZone = screen.getByRole('button', { name: /drop zone for question files/i });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText('Save to My Question Sets')).toBeInTheDocument();
    });

    // Fill name
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'My Questions' } });

    // Click save
    fireEvent.click(screen.getByText('Save to My Question Sets'));

    await waitFor(() => {
      expect(mockOnImportSuccess).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/question-sets/import',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('shows error on save failure', async () => {
    mockReadFileContent.mockResolvedValue(validJson);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    });

    render(<QuestionSetImporter onImportSuccess={mockOnImportSuccess} />);

    const file = createFile(validJson);
    const dropZone = screen.getByRole('button', { name: /drop zone for question files/i });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText('Save to My Question Sets')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'My Set' } });
    fireEvent.click(screen.getByText('Save to My Question Sets'));

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });

    expect(mockOnImportSuccess).not.toHaveBeenCalled();
  });
});
