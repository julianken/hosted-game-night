import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddQuestionsPanel } from '../AddQuestionsPanel';

// Mock game store
vi.mock('@/stores/game-store', () => ({
  useGameStore: vi.fn((selector) => {
    const store = {
      status: 'setup' as const,
      importQuestions: vi.fn(),
    };
    return selector(store);
  }),
}));

// Mock toast
vi.mock('@joolie-boolie/ui', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

// Mock conversion
vi.mock('@/lib/questions/conversion', () => ({
  triviaQuestionsToQuestions: vi.fn((qs: unknown[]) => qs),
}));

// Mock TriviaApiImporter
vi.mock('../TriviaApiImporter', () => ({
  TriviaApiImporter: () => (
    <div data-testid="trivia-api-importer">
      API Importer Content
    </div>
  ),
}));

// Mock QuestionSetImporter
vi.mock('../QuestionSetImporter', () => ({
  QuestionSetImporter: () => (
    <div data-testid="question-set-importer">File Importer Content</div>
  ),
}));

// Mock QuestionSetEditorModal
vi.mock('@/components/question-editor/QuestionSetEditorModal', () => ({
  QuestionSetEditorModal: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="editor-modal" role="dialog">Editor Modal</div> : null
  ),
}));

describe('AddQuestionsPanel', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with tablist and three tabs', () => {
    render(<AddQuestionsPanel onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('has "Fetch from API" tab selected by default', () => {
    render(<AddQuestionsPanel onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const apiTab = screen.getByRole('tab', { name: /fetch from api/i });
    expect(apiTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders API importer panel by default', () => {
    render(<AddQuestionsPanel onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const importer = screen.getByTestId('trivia-api-importer');
    expect(importer).toBeInTheDocument();
  });

  it('switches to Upload File tab when clicked', () => {
    render(<AddQuestionsPanel onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const uploadTab = screen.getByRole('tab', { name: /upload file/i });
    fireEvent.click(uploadTab);

    expect(uploadTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('question-set-importer')).toBeInTheDocument();
    // API importer should be hidden
    expect(screen.queryByTestId('trivia-api-importer')).not.toBeInTheDocument();
  });

  it('switches to Create Manually tab when clicked', () => {
    render(<AddQuestionsPanel onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const manualTab = screen.getByRole('tab', { name: /create manually/i });
    fireEvent.click(manualTab);

    expect(manualTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /create questions/i })).toBeInTheDocument();
  });

  it('opens editor modal from Create Manually tab', () => {
    render(<AddQuestionsPanel onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Switch to manual tab
    fireEvent.click(screen.getByRole('tab', { name: /create manually/i }));

    // Click create button
    fireEvent.click(screen.getByRole('button', { name: /create questions/i }));

    expect(screen.getByTestId('editor-modal')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<AddQuestionsPanel onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const closeButton = screen.getByRole('button', { name: /close add questions panel/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it('renders the heading "Add Questions"', () => {
    render(<AddQuestionsPanel onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    expect(screen.getByRole('heading', { name: /add questions/i })).toBeInTheDocument();
  });

  it('supports keyboard navigation with arrow keys', () => {
    render(<AddQuestionsPanel onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const apiTab = screen.getByRole('tab', { name: /fetch from api/i });
    apiTab.focus();

    // Arrow right should move to Upload tab
    fireEvent.keyDown(apiTab.parentElement!, { key: 'ArrowRight' });
    const uploadTab = screen.getByRole('tab', { name: /upload file/i });
    expect(uploadTab).toHaveAttribute('aria-selected', 'true');

    // Arrow right again should move to Manual tab
    fireEvent.keyDown(uploadTab.parentElement!, { key: 'ArrowRight' });
    const manualTab = screen.getByRole('tab', { name: /create manually/i });
    expect(manualTab).toHaveAttribute('aria-selected', 'true');

    // Arrow right should wrap to first tab
    fireEvent.keyDown(manualTab.parentElement!, { key: 'ArrowRight' });
    expect(apiTab).toHaveAttribute('aria-selected', 'true');
  });

  it('has proper ARIA attributes on tab panels', () => {
    render(<AddQuestionsPanel onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const apiPanel = screen.getByRole('tabpanel');
    expect(apiPanel).toHaveAttribute('aria-labelledby', 'tab-api');

    // Inactive panels should be hidden
    const hiddenPanels = document.querySelectorAll('[role="tabpanel"][hidden]');
    expect(hiddenPanels).toHaveLength(2);
  });

  it('accepts defaultTab prop', () => {
    render(<AddQuestionsPanel defaultTab="upload" onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const uploadTab = screen.getByRole('tab', { name: /upload file/i });
    expect(uploadTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('question-set-importer')).toBeInTheDocument();
  });

  it('inactive tabs have tabIndex -1', () => {
    render(<AddQuestionsPanel onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const uploadTab = screen.getByRole('tab', { name: /upload file/i });
    const manualTab = screen.getByRole('tab', { name: /create manually/i });
    const apiTab = screen.getByRole('tab', { name: /fetch from api/i });

    expect(apiTab).toHaveAttribute('tabindex', '0');
    expect(uploadTab).toHaveAttribute('tabindex', '-1');
    expect(manualTab).toHaveAttribute('tabindex', '-1');
  });
});
