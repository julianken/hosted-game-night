import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SaveQuestionSetModal } from '../SaveQuestionSetModal';
import { ToastProvider } from "@beak-gaming/ui";
import type { Question } from '@/types';

global.fetch = vi.fn();

const mockQuestions: Question[] = [
  {
    id: 'q1',
    text: 'What is 2+2?',
    type: 'multiple_choice',
    correctAnswers: ['C'],
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['1', '2', '4', '8'],
    category: 'science',
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
  {
    id: 'q3',
    text: 'Who painted the Mona Lisa?',
    type: 'multiple_choice',
    correctAnswers: ['A'],
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['Da Vinci', 'Picasso', 'Monet', 'Van Gogh'],
    category: 'art_literature',
    roundIndex: 0,
  },
];

vi.mock('@/stores/game-store', () => ({
  useGameStore: vi.fn((selector) => {
    const store = {
      questions: mockQuestions,
    };
    return selector(store);
  }),
}));

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('SaveQuestionSetModal', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with question count and category breakdown', () => {
    renderWithToast(<SaveQuestionSetModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    expect(screen.getByText('Save Question Set')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Total questions
    expect(screen.getByText(/science \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/art literature \(1\)/i)).toBeInTheDocument();
  });

  it('validates name is required', async () => {
    renderWithToast(<SaveQuestionSetModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Question set name is required')).toBeInTheDocument();
    });
  });

  it('posts to /api/question-sets on save', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ questionSet: { id: 'new-qs' } }),
    });

    renderWithToast(<SaveQuestionSetModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    const nameInput = screen.getByPlaceholderText(/general knowledge/i);
    fireEvent.change(nameInput, { target: { value: 'My Set' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/question-sets', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"name":"My Set"'),
      }));
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
