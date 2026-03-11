import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyStateOnboarding } from '../EmptyStateOnboarding';

const skipIfDisabled = !process.env.NEXT_PUBLIC_FEATURE_QUESTION_SETS || process.env.NEXT_PUBLIC_FEATURE_QUESTION_SETS === 'false';

// Mock TriviaApiImporter
vi.mock('../TriviaApiImporter', () => ({
  TriviaApiImporter: ({ context, onSaveSuccess }: { context?: string; onSaveSuccess?: () => void }) => (
    <div data-testid="trivia-api-importer" data-context={context}>
      <button onClick={onSaveSuccess}>Mock Save</button>
    </div>
  ),
}));

// Mock QuestionSetImporter
vi.mock('../QuestionSetImporter', () => ({
  QuestionSetImporter: ({ onImportSuccess }: { onImportSuccess: () => void }) => (
    <div data-testid="question-set-importer">
      <button onClick={onImportSuccess}>Mock Import</button>
    </div>
  ),
}));

// Mock QuestionSetEditorModal
vi.mock('@/components/question-editor/QuestionSetEditorModal', () => ({
  QuestionSetEditorModal: ({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void }) => (
    isOpen ? (
      <div data-testid="editor-modal" role="dialog">
        <button onClick={onClose}>Close</button>
        <button onClick={onSuccess}>Save</button>
      </div>
    ) : null
  ),
}));

describe.skipIf(skipIfDisabled)('EmptyStateOnboarding', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the onboarding heading', () => {
    render(<EmptyStateOnboarding onSuccess={mockOnSuccess} />);

    expect(
      screen.getByRole('heading', { name: /get started with trivia questions/i })
    ).toBeInTheDocument();
  });

  it('renders the RECOMMENDED badge with proper aria-label', () => {
    render(<EmptyStateOnboarding onSuccess={mockOnSuccess} />);

    const badge = screen.getByText('RECOMMENDED');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-label', 'Recommended method');
  });

  it('renders the API importer inline with management context', () => {
    render(<EmptyStateOnboarding onSuccess={mockOnSuccess} />);

    const importer = screen.getByTestId('trivia-api-importer');
    expect(importer).toBeInTheDocument();
    expect(importer).toHaveAttribute('data-context', 'management');
  });

  it('renders secondary cards for upload and manual creation', () => {
    render(<EmptyStateOnboarding onSuccess={mockOnSuccess} />);

    expect(screen.getByRole('heading', { name: /upload a file/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /create manually/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload json file/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create question set/i })).toBeInTheDocument();
  });

  it('expands upload section when Upload JSON File is clicked', () => {
    render(<EmptyStateOnboarding onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: /upload json file/i }));
    expect(screen.getByTestId('question-set-importer')).toBeInTheDocument();
  });

  it('opens editor modal when Create Question Set is clicked', () => {
    render(<EmptyStateOnboarding onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: /create question set/i }));
    expect(screen.getByTestId('editor-modal')).toBeInTheDocument();
  });

  it('calls onSuccess when API importer saves', () => {
    render(<EmptyStateOnboarding onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText('Mock Save'));
    expect(mockOnSuccess).toHaveBeenCalledOnce();
  });

  it('calls onSuccess when file importer succeeds', () => {
    render(<EmptyStateOnboarding onSuccess={mockOnSuccess} />);

    // First expand the upload section
    fireEvent.click(screen.getByRole('button', { name: /upload json file/i }));
    fireEvent.click(screen.getByText('Mock Import'));
    expect(mockOnSuccess).toHaveBeenCalledOnce();
  });
});
