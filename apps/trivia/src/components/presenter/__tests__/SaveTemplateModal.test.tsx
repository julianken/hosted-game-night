import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SaveTemplateModal } from '../SaveTemplateModal';
import { ToastProvider } from '@/components/ui/Toast';
import type { Question } from '@/types';

// Mock fetch globally
global.fetch = vi.fn();

const mockQuestions: Question[] = [
  {
    id: 'q1',
    text: 'What is 2+2?',
    type: 'multiple_choice',
    correctAnswers: ['B'],
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['3', '4', '5', '6'],
    category: 'general_knowledge',
    roundIndex: 0,
  },
  {
    id: 'q2',
    text: 'Is the sky blue?',
    type: 'true_false',
    correctAnswers: ['True'],
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    category: 'science',
    roundIndex: 0,
  },
];

// Mock stores
vi.mock('@/stores/game-store', () => ({
  useGameStore: vi.fn((selector) => {
    const store = {
      questions: mockQuestions,
      settings: {
        roundsCount: 1,
        questionsPerRound: 2,
        timerDuration: 30,
        timerAutoStart: false,
        timerVisible: true,
        ttsEnabled: false,
      },
    };
    return selector ? selector(store) : store;
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('SaveTemplateModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        template: {
          id: 'new-template-id',
          name: 'Test Template',
        },
      }),
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    renderWithProviders(
      <SaveTemplateModal isOpen={false} onClose={mockOnClose} />
    );

    expect(screen.queryByText('Save Question Set')).not.toBeInTheDocument();
  });

  it('renders modal when isOpen is true', () => {
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    expect(screen.getByText('Save Question Set')).toBeInTheDocument();
    expect(screen.getByLabelText(/Template Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Set as default template/i)).toBeInTheDocument();
  });

  it('displays question set details', () => {
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    expect(screen.getByText('Question Set Details')).toBeInTheDocument();
    expect(screen.getByText(/Questions:/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/Rounds:/)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/Questions per Round:/)).toBeInTheDocument();
    expect(screen.getByText(/Timer:/)).toBeInTheDocument();
    expect(screen.getByText('30s')).toBeInTheDocument();
  });

  it('shows validation error when name is empty', async () => {
    // Use fireEvent for testing
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    // Click save without entering name
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    expect(screen.getByText('Template name is required')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('saves template with valid input', async () => {
    // Use fireEvent for testing
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Enter template name
    const nameInput = screen.getByLabelText(/Template Name/i);
    fireEvent.change(nameInput, { target: { value: 'My Trivia Set' } });

    // Check "Set as default"
    const defaultCheckbox = screen.getByLabelText(/Set as default template/i);
    fireEvent.click(defaultCheckbox);

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    // Verify fetch was called with correct data
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'My Trivia Set',
          questions: [
            {
              question: 'What is 2+2?',
              options: ['3', '4', '5', '6'],
              correctIndex: 1,
              category: 'general_knowledge',
            },
            {
              question: 'Is the sky blue?',
              options: ['True', 'False'],
              correctIndex: 0,
              category: 'science',
            },
          ],
          rounds_count: 1,
          questions_per_round: 2,
          timer_duration: 30,
          is_default: true,
        }),
      });
    });

    // Verify callbacks
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('saves template without default flag when unchecked', async () => {
    // Use fireEvent for testing
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/Template Name/i);
    fireEvent.change(nameInput, { target: { value: 'Non-Default Set' } });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"is_default":false'),
      });
    });
  });

  it('shows error message when save fails', async () => {
    // Use fireEvent for testing
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Database error' }),
    } as Response);

    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/Template Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Set' } });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Database error')).toBeInTheDocument();
    });

    // Modal should stay open on error
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows error when no questions exist', async () => {
    // Use fireEvent for testing

    // Mock empty questions
    vi.mocked(vi.mocked(await import('@/stores/game-store')).useGameStore).mockImplementation((selector) => {
      const store = {
        questions: [],
        settings: {
          roundsCount: 1,
          questionsPerRound: 2,
          timerDuration: 30,
          timerAutoStart: false,
          timerVisible: true,
          ttsEnabled: false,
        },
      };
      return selector ? selector(store) : store;
    });

    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/Template Name/i);
    fireEvent.change(nameInput, { target: { value: 'Empty Set' } });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    expect(screen.getByText('No questions to save')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('disables inputs while saving', async () => {
    // Use fireEvent for testing

    // Make fetch slow
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({}),
      } as Response), 100))
    );

    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/Template Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Set' } });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    // Check inputs are disabled
    expect(nameInput).toBeDisabled();
    expect(screen.getByLabelText(/Set as default template/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Saving.../i })).toBeInTheDocument();
  });

  it('closes modal when cancel button is clicked', async () => {
    // Use fireEvent for testing
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('resets form when closed after successful save', async () => {
    // Use fireEvent for testing
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    // Enter name and check default
    const nameInput = screen.getByLabelText(/Template Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Set' } });

    const defaultCheckbox = screen.getByLabelText(/Set as default template/i);
    fireEvent.click(defaultCheckbox);

    // Save
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });

    // Note: Form reset happens in the component, but we can't test it here
    // because the modal is unmounted when closed
  });

  it('converts questions to database format correctly', async () => {
    // Use fireEvent for testing
    renderWithProviders(
      <SaveTemplateModal isOpen onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/Template Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Set' } });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      // Check first question (multiple choice)
      expect(body.questions[0]).toEqual({
        question: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        correctIndex: 1, // 'B' is at index 1
        category: 'general_knowledge',
      });

      // Check second question (true/false)
      expect(body.questions[1]).toEqual({
        question: 'Is the sky blue?',
        options: ['True', 'False'],
        correctIndex: 0, // 'True' is at index 0
        category: 'science',
      });
    });
  });
});
