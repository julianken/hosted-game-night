import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QuestionSetSelector } from '../QuestionSetSelector';
import { ToastProvider } from "@beak-gaming/ui";
import type { TriviaQuestionSet } from '@beak-gaming/database/types';

global.fetch = vi.fn();

const mockImportQuestions = vi.fn();

vi.mock('@/stores/game-store', () => ({
  useGameStore: vi.fn((selector) => {
    const store = {
      status: 'setup' as const,
      importQuestions: mockImportQuestions,
      settings: { questionsPerRound: 5 },
    };
    return selector(store);
  }),
}));

vi.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));

const mockQuestionSets: TriviaQuestionSet[] = [
  {
    id: 'qs-1',
    user_id: 'user-1',
    name: 'History Set',
    description: 'History questions',
    questions: [
      { question: 'Who was the first president?', options: ['Washington', 'Adams', 'Jefferson', 'Madison'], correctIndex: 0, category: 'history' },
      { question: 'Is the earth flat?', options: ['True', 'False'], correctIndex: 1, category: 'science' },
    ],
    is_default: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('QuestionSetSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders and loads question sets', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ questionSets: mockQuestionSets }),
    });

    renderWithToast(<QuestionSetSelector />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent('History Set');
    });
  });

  it('imports questions when set is selected', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ questionSets: mockQuestionSets }),
    });

    renderWithToast(<QuestionSetSelector />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent('History Set');
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'qs-1' } });

    await waitFor(() => {
      expect(mockImportQuestions).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ text: 'Who was the first president?', type: 'multiple_choice' }),
          expect.objectContaining({ text: 'Is the earth flat?', type: 'true_false' }),
        ]),
        'replace'
      );
    });
  });

  it('shows empty state', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ questionSets: [] }),
    });

    renderWithToast(<QuestionSetSelector />);

    await waitFor(() => {
      expect(screen.getByText('No saved question sets. Save your first set below.')).toBeInTheDocument();
    });
  });
});
