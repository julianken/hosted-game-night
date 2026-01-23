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
      // TriviaGameState properties
      sessionId: 'test-session',
      status: 'setup' as const,
      statusBeforePause: null,
      questions: mockQuestions,
      selectedQuestionIndex: 0,
      displayQuestionIndex: null,
      currentRound: 0,
      totalRounds: 1,
      teams: [],
      teamAnswers: [],
      timer: {
        duration: 30,
        remaining: 30,
        isRunning: false,
      },
      settings: {
        roundsCount: 1,
        questionsPerRound: 2,
        timerDuration: 30,
        timerAutoStart: false,
        timerVisible: true,
        ttsEnabled: false,
      },
      showScoreboard: true,
      emergencyBlank: false,
      ttsEnabled: false,
      _isHydrating: false,
      // GameStore action methods
      startGame: vi.fn(),
      endGame: vi.fn(),
      resetGame: vi.fn(),
      selectQuestion: vi.fn(),
      setDisplayQuestion: vi.fn(),
      addTeam: vi.fn(),
      removeTeam: vi.fn(),
      renameTeam: vi.fn(),
      adjustTeamScore: vi.fn(),
      setTeamScore: vi.fn(),
      completeRound: vi.fn(),
      nextRound: vi.fn(),
      tickTimer: vi.fn(),
      startTimer: vi.fn(),
      stopTimer: vi.fn(),
      resetTimer: vi.fn(),
      pauseGame: vi.fn(),
      resumeGame: vi.fn(),
      emergencyPause: vi.fn(),
      updateSettings: vi.fn(),
      loadTeamsFromSetup: vi.fn(),
      importQuestions: vi.fn(),
      _hydrate: vi.fn(),
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

    // Use more specific queries that match parent-child structure
    const detailsList = screen.getByText('Question Set Details').nextElementSibling;
    expect(detailsList).toBeInTheDocument();
    expect(detailsList?.textContent).toContain('Questions:');
    expect(detailsList?.textContent).toContain('2');
    expect(detailsList?.textContent).toContain('Rounds:');
    expect(detailsList?.textContent).toContain('1');
    expect(detailsList?.textContent).toContain('Questions per Round:');
    expect(detailsList?.textContent).toContain('Timer:');
    expect(detailsList?.textContent).toContain('30s');
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

    // Wait for error to appear - find alert within the modal (not the toast)
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      const modalError = alerts.find(alert => alert.className.includes('bg-destructive/10'));
      expect(modalError).toBeDefined();
      expect(modalError).toHaveTextContent('Database error');
    });

    // Modal should stay open on error
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows error when no questions exist', async () => {
    // Use fireEvent for testing

    // Mock empty questions temporarily
    vi.mocked(vi.mocked(await import('@/stores/game-store')).useGameStore).mockImplementation((selector) => {
      const store = {
        sessionId: 'test-session',
        status: 'setup' as const,
        statusBeforePause: null,
        questions: [],
        selectedQuestionIndex: 0,
        displayQuestionIndex: null,
        currentRound: 0,
        totalRounds: 1,
        teams: [],
        teamAnswers: [],
        timer: {
          duration: 30,
          remaining: 30,
          isRunning: false,
        },
        settings: {
          roundsCount: 1,
          questionsPerRound: 2,
          timerDuration: 30,
          timerAutoStart: false,
          timerVisible: true,
          ttsEnabled: false,
        },
        showScoreboard: true,
        emergencyBlank: false,
        ttsEnabled: false,
        _isHydrating: false,
        startGame: vi.fn(),
        endGame: vi.fn(),
        resetGame: vi.fn(),
        selectQuestion: vi.fn(),
        setDisplayQuestion: vi.fn(),
        addTeam: vi.fn(),
        removeTeam: vi.fn(),
        renameTeam: vi.fn(),
        adjustTeamScore: vi.fn(),
        setTeamScore: vi.fn(),
        completeRound: vi.fn(),
        nextRound: vi.fn(),
        tickTimer: vi.fn(),
        startTimer: vi.fn(),
        stopTimer: vi.fn(),
        resetTimer: vi.fn(),
        pauseGame: vi.fn(),
        resumeGame: vi.fn(),
        emergencyPause: vi.fn(),
        updateSettings: vi.fn(),
        loadTeamsFromSetup: vi.fn(),
        importQuestions: vi.fn(),
        _hydrate: vi.fn(),
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

    // Restore the original mock with questions
    vi.mocked(await import('@/stores/game-store')).useGameStore.mockImplementation((selector) => {
      const store = {
        sessionId: 'test-session',
        status: 'setup' as const,
        statusBeforePause: null,
        questions: mockQuestions,
        selectedQuestionIndex: 0,
        displayQuestionIndex: null,
        currentRound: 0,
        totalRounds: 1,
        teams: [],
        teamAnswers: [],
        timer: {
          duration: 30,
          remaining: 30,
          isRunning: false,
        },
        settings: {
          roundsCount: 1,
          questionsPerRound: 2,
          timerDuration: 30,
          timerAutoStart: false,
          timerVisible: true,
          ttsEnabled: false,
        },
        showScoreboard: true,
        emergencyBlank: false,
        ttsEnabled: false,
        _isHydrating: false,
        startGame: vi.fn(),
        endGame: vi.fn(),
        resetGame: vi.fn(),
        selectQuestion: vi.fn(),
        setDisplayQuestion: vi.fn(),
        addTeam: vi.fn(),
        removeTeam: vi.fn(),
        renameTeam: vi.fn(),
        adjustTeamScore: vi.fn(),
        setTeamScore: vi.fn(),
        completeRound: vi.fn(),
        nextRound: vi.fn(),
        tickTimer: vi.fn(),
        startTimer: vi.fn(),
        stopTimer: vi.fn(),
        resetTimer: vi.fn(),
        pauseGame: vi.fn(),
        resumeGame: vi.fn(),
        emergencyPause: vi.fn(),
        updateSettings: vi.fn(),
        loadTeamsFromSetup: vi.fn(),
        importQuestions: vi.fn(),
        _hydrate: vi.fn(),
      };
      return selector ? selector(store) : store;
    });
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

    // Check that Save button changes to Saving...
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Saving.../i })).toBeInTheDocument();
    });

    // Check inputs are disabled while saving
    expect(nameInput).toBeDisabled();
    expect(screen.getByLabelText(/Set as default template/i)).toBeDisabled();
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

    // Wait for save to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

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
      expect(global.fetch).toHaveBeenCalled();
    });

    // Get the fetch call arguments
    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall).toBeDefined();
    expect(fetchCall[1]).toBeDefined();
    expect(fetchCall[1].body).toBeDefined();

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
