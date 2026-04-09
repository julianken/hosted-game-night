import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TemplateSelector } from '../TemplateSelector';
import { ToastProvider } from "@joolie-boolie/ui";
import type { TriviaTemplateItem } from '@/stores/template-store';

// Mock settings-store
const mockUpdateSetting = vi.fn();
vi.mock('@/stores/settings-store', () => ({
  useSettingsStore: {
    getState: () => ({
      updateSetting: mockUpdateSetting,
    }),
  },
}));

// Mock store actions
const mockImportQuestions = vi.fn();
const mockUpdateSettings = vi.fn();

vi.mock('@/stores/game-store', () => ({
  useGameStore: vi.fn((selector) => {
    const store = {
      status: 'setup' as const,
      importQuestions: mockImportQuestions,
      updateSettings: mockUpdateSettings,
    };
    return selector ? selector(store) : store;
  }),
}));

const mockTemplates: TriviaTemplateItem[] = [
  {
    id: 'template-1',
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

vi.mock('@/stores/template-store', () => ({
  useTriviaTemplateStore: vi.fn((selector) => {
    const store = { items: mockTemplates };
    return selector(store);
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('TemplateSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with label and select element', () => {
    renderWithProviders(<TemplateSelector />);

    expect(screen.getByText(/Load Question Set/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays templates from localStorage store', () => {
    renderWithProviders(<TemplateSelector />);

    expect(screen.getByText(/General Knowledge.*\(Default\)/)).toBeInTheDocument();
    expect(screen.getByText(/Quick Quiz/)).toBeInTheDocument();
  });

  it('loads template questions and settings when selected', async () => {
    renderWithProviders(<TemplateSelector />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'template-1' } });

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

  it('mirrors settings to settings-store (sync race fix)', async () => {
    renderWithProviders(<TemplateSelector />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'template-1' } });

    await waitFor(() => {
      expect(mockUpdateSetting).toHaveBeenCalledWith('timerDuration', 30);
      expect(mockUpdateSetting).toHaveBeenCalledWith('roundsCount', 1);
      expect(mockUpdateSetting).toHaveBeenCalledWith('questionsPerRound', 2);
    });
  });

  it('calls onTemplateLoad callback when template is loaded', async () => {
    const mockOnTemplateLoad = vi.fn();
    renderWithProviders(<TemplateSelector onTemplateLoad={mockOnTemplateLoad} />);

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

  it('converts true/false questions correctly', async () => {
    renderWithProviders(<TemplateSelector />);

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
    const multiRoundTemplates: TriviaTemplateItem[] = [
      {
        id: 'template-3',
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
      },
    ];

    // Override mock to return multi-round template
    const { useTriviaTemplateStore } = vi.mocked(await import('@/stores/template-store'));
    useTriviaTemplateStore.mockImplementation((selector) => {
      const store = { items: multiRoundTemplates };
      return selector(store as Parameters<typeof selector>[0]);
    });

    renderWithProviders(<TemplateSelector />);

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
