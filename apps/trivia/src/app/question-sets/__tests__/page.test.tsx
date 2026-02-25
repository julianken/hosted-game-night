import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import QuestionSetsPage from '../page';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock QuestionSetImporter
vi.mock('@/components/presenter/QuestionSetImporter', () => ({
  QuestionSetImporter: ({ onImportSuccess }: { onImportSuccess: () => void }) => (
    <div data-testid="question-set-importer">
      <button onClick={onImportSuccess}>Mock Import</button>
    </div>
  ),
}));

// Mock QuestionSetEditorModal
vi.mock('@/components/question-editor/QuestionSetEditorModal', () => ({
  QuestionSetEditorModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="question-set-editor-modal"><button onClick={onClose}>Close</button></div> : null
  ),
}));

// Mock uuid used by conversion
vi.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));

const mockQuestionSets = [
  {
    id: 'qs-1',
    user_id: 'user-1',
    name: 'History Questions',
    description: 'A collection of history trivia',
    questions: [
      { question: 'What year was the moon landing?', options: ['1969', '1970', '1971', '1972'], correctIndex: 0, category: 'history' },
      { question: 'Who was the first president?', options: ['Washington', 'Adams', 'Jefferson', 'Lincoln'], correctIndex: 0, category: 'history' },
    ],
    is_default: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'qs-2',
    user_id: 'user-1',
    name: 'Science Quiz',
    description: null,
    questions: [],
    is_default: true,
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('QuestionSetsPage', () => {
  it('renders the page title', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<QuestionSetsPage />);
    expect(screen.getByText('My Question Sets')).toBeInTheDocument();
  });

  it('shows empty state when no sets exist', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<QuestionSetsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No question sets yet/)).toBeInTheDocument();
    });
  });

  it('renders question set cards when data exists', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockQuestionSets }),
    });

    render(<QuestionSetsPage />);

    await waitFor(() => {
      expect(screen.getByText('History Questions')).toBeInTheDocument();
    });

    expect(screen.getByText('Science Quiz')).toBeInTheDocument();
    expect(screen.getByText('2 questions')).toBeInTheDocument();
    expect(screen.getByText('0 questions')).toBeInTheDocument();
    expect(screen.getByText('(Default)')).toBeInTheDocument();
    expect(screen.getByText('A collection of history trivia')).toBeInTheDocument();
  });
});
