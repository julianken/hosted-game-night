import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TemplateSelector } from '../TemplateSelector';
import { ToastProvider } from '@/components/ui/Toast';
import type { TriviaTemplate } from '@beak-gaming/database/types';

// Mock fetch globally
global.fetch = vi.fn();

// Mock store actions
const mockImportQuestions = vi.fn();
const mockUpdateSettings = vi.fn();

vi.mock('@/stores/game-store', () => ({
  useGameStore: vi.fn((selector) => {
    const store = {
      sessionId: 'test-session',
      status: 'setup' as const,
      statusBeforePause: null,
      questions: [],
      selectedQuestionIndex: 0,
      displayQuestionIndex: null,
      currentRound: 0,
      totalRounds: 3,
      teams: [],
      teamAnswers: [],
      timer: {
        duration: 30,
        remaining: 30,
        isRunning: false,
      },
      settings: {
        roundsCount: 3,
        questionsPerRound: 5,
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
      updateSettings: mockUpdateSettings,
      loadTeamsFromSetup: vi.fn(),
      importQuestions: mockImportQuestions,
      _hydrate: vi.fn(),
    };
    return selector ? selector(store) : store;
  }),
}));

const mockTemplates: TriviaTemplate[] = [
  {
    id: 'template-1',
    user_id: 'user-123',
    name: 'General Knowledge',
    questions: [
      {
        question: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        correctIndex: 1,
        category: 'math',
      },
      {
        question: 'Is the sky blue?',
        options: ['True', 'False'],
        correctIndex: 0,
      },
    ],
    rounds_count: 1,
    questions_per_round: 2,
    timer_duration: 30,
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'template-2',
    user_id: 'user-123',
    name: 'Quick Quiz',
    questions: [
      {
        question: 'What is the capital of France?',
        options: ['London', 'Paris', 'Berlin', 'Madrid'],
        correctIndex: 1,
        category: 'geography',
      },
    ],
    rounds_count: 1,
    questions_per_round: 1,
    timer_duration: 20,
    is_default: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('TemplateSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ templates: mockTemplates }),
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with label and select element', () => {
    renderWithProviders(<TemplateSelector />);

    expect(screen.getByText(/Load Question Set/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('fetches and displays templates on mount', async () => {
    renderWithProviders(<TemplateSelector />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/templates');
    });

    await waitFor(() => {
      expect(screen.getByText(/General Knowledge.*\(Default\).*2 questions/)).toBeInTheDocument();
      expect(screen.getByText(/Quick Quiz.*1 question/)).toBeInTheDocument();
    });
  });

  it('shows error message when fetch fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
    } as Response);

    renderWithProviders(<TemplateSelector />);

    await waitFor(() => {
      const errors = screen.getAllByText(/Failed to load templates/i);
      expect(errors.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  it('shows empty state when no templates exist', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ templates: [] }),
    } as Response);

    renderWithProviders(<TemplateSelector />);

    await waitFor(() => {
      expect(screen.getByText(/No saved question sets/i)).toBeInTheDocument();
    });
  });

  it('loads template questions and settings when selected', async () => {
    // Use fireEvent for testing
    renderWithProviders(<TemplateSelector />);

    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText(/General Knowledge/)).toBeInTheDocument();
    });

    // Select template
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'template-1' } });

    // Verify store actions called
    await waitFor(() => {
      expect(mockImportQuestions).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            text: 'What is 2+2?',
            type: 'multiple_choice',
            options: ['A', 'B', 'C', 'D'],
            optionTexts: ['3', '4', '5', '6'],
            correctAnswers: ['B'],
            roundIndex: 0,
          }),
          expect.objectContaining({
            text: 'Is the sky blue?',
            type: 'true_false',
            options: ['True', 'False'],
            correctAnswers: ['True'],
            roundIndex: 0,
          }),
        ]),
        'replace'
      );

      expect(mockUpdateSettings).toHaveBeenCalledWith({
        timerDuration: 30,
        roundsCount: 1,
        questionsPerRound: 2,
      });
    });
  });

  it('calls onTemplateLoad callback when template is loaded', async () => {
    const mockOnTemplateLoad = vi.fn();
    // Use fireEvent for testing
    renderWithProviders(<TemplateSelector onTemplateLoad={mockOnTemplateLoad} />);

    await waitFor(() => {
      expect(screen.getByText(/General Knowledge/)).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'template-1' } });

    await waitFor(() => {
      expect(mockOnTemplateLoad).toHaveBeenCalledWith(mockTemplates[0]);
    });
  });

  it('disables select when disabled prop is true', () => {
    renderWithProviders(<TemplateSelector disabled />);

    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('disables select while loading', () => {
    renderWithProviders(<TemplateSelector />);

    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('shows warning when game is not in setup status', async () => {
    // Mock non-setup status
    vi.mocked(vi.mocked(await import('@/stores/game-store')).useGameStore).mockImplementation((selector) => {
      const store = {
        sessionId: 'test-session',
        status: 'playing' as const,
        statusBeforePause: null,
        questions: [],
        selectedQuestionIndex: 0,
        displayQuestionIndex: null,
        currentRound: 0,
        totalRounds: 3,
        teams: [],
        teamAnswers: [],
        timer: {
          duration: 30,
          remaining: 30,
          isRunning: false,
        },
        settings: {
          roundsCount: 3,
          questionsPerRound: 5,
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
        updateSettings: mockUpdateSettings,
        loadTeamsFromSetup: vi.fn(),
        importQuestions: mockImportQuestions,
        _hydrate: vi.fn(),
      };
      return selector ? selector(store) : store;
    });

    renderWithProviders(<TemplateSelector />);

    await waitFor(() => {
      expect(screen.getByText(/Templates can only be loaded during setup/i)).toBeInTheDocument();
    });
  });

  it('converts true/false questions correctly', async () => {
    // Use fireEvent for testing
    renderWithProviders(<TemplateSelector />);

    await waitFor(() => {
      expect(screen.getByText(/General Knowledge/)).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'template-1' } });

    await waitFor(() => {
      const call = mockImportQuestions.mock.calls[0];
      const questions = call[0];

      // Find the true/false question
      const tfQuestion = questions.find((q: { text: string }) => q.text === 'Is the sky blue?');
      expect(tfQuestion).toBeDefined();
      expect(tfQuestion.type).toBe('true_false');
      expect(tfQuestion.options).toEqual(['True', 'False']);
    });
  });

  it('assigns correct roundIndex based on questions_per_round', async () => {
    const templateWithMultipleRounds: TriviaTemplate = {
      id: 'template-3',
      user_id: 'user-123',
      name: 'Multi Round',
      questions: [
        { question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
        { question: 'Q2', options: ['A', 'B'], correctIndex: 1 },
        { question: 'Q3', options: ['A', 'B'], correctIndex: 0 },
        { question: 'Q4', options: ['A', 'B'], correctIndex: 1 },
      ],
      rounds_count: 2,
      questions_per_round: 2,
      timer_duration: 30,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ templates: [templateWithMultipleRounds] }),
    } as Response);

    // Use fireEvent for testing
    renderWithProviders(<TemplateSelector />);

    await waitFor(() => {
      expect(screen.getByText(/Multi Round/)).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'template-3' } });

    await waitFor(() => {
      const call = mockImportQuestions.mock.calls[0];
      const questions = call[0];

      // Check roundIndex assignment
      expect(questions[0].roundIndex).toBe(0);
      expect(questions[1].roundIndex).toBe(0);
      expect(questions[2].roundIndex).toBe(1);
      expect(questions[3].roundIndex).toBe(1);
    });
  });
});
