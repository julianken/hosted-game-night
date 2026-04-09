import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import QuestionSetsPage from '../page';

const skipIfDisabled = !process.env.NEXT_PUBLIC_FEATURE_QUESTION_SETS || process.env.NEXT_PUBLIC_FEATURE_QUESTION_SETS === 'false';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock EmptyStateOnboarding
vi.mock('@/components/presenter/EmptyStateOnboarding', () => ({
  EmptyStateOnboarding: ({ onSuccess }: { onSuccess: () => void }) => (
    <div data-testid="empty-state-onboarding">
      <p>Get Started with Trivia Questions</p>
      <button onClick={onSuccess}>Mock Onboarding Success</button>
    </div>
  ),
}));

// Mock AddQuestionsPanel
vi.mock('@/components/presenter/AddQuestionsPanel', () => ({
  AddQuestionsPanel: ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => (
    <div data-testid="add-questions-panel">
      <button onClick={onClose}>Close Panel</button>
      <button onClick={onSuccess}>Mock Panel Success</button>
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
    name: 'Science Quiz',
    description: null,
    questions: [],
    is_default: true,
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
  },
];

// Mock the question-set-store to provide test data
const mockStore = { items: [] as typeof mockQuestionSets, remove: vi.fn(), update: vi.fn() };
vi.mock('@/stores/question-set-store', () => ({
  useTriviaQuestionSetStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  mockStore.items = [];
  mockStore.remove = vi.fn();
  mockStore.update = vi.fn();
});

describe.skipIf(skipIfDisabled)('QuestionSetsPage', () => {
  it('renders the page title when sets exist', async () => {
    mockStore.items = mockQuestionSets;

    render(<QuestionSetsPage />);

    await waitFor(() => {
      expect(screen.getByText('Question Sets')).toBeInTheDocument();
    });
  });

  it('renders "Question Sets" title when empty', async () => {
    mockStore.items = [];

    render(<QuestionSetsPage />);

    await waitFor(() => {
      expect(screen.getByText('Question Sets')).toBeInTheDocument();
    });
  });

  it('shows empty state onboarding when no sets exist', async () => {
    mockStore.items = [];

    render(<QuestionSetsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state-onboarding')).toBeInTheDocument();
    });
  });

  it('renders question set cards when data exists', async () => {
    mockStore.items = mockQuestionSets;

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

  it('shows Add Questions button when sets exist', async () => {
    mockStore.items = mockQuestionSets;

    render(<QuestionSetsPage />);

    await waitFor(() => {
      expect(screen.getByText('+ Add Questions')).toBeInTheDocument();
    });
  });

  it('does not show Add Questions button when empty', async () => {
    mockStore.items = [];

    render(<QuestionSetsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state-onboarding')).toBeInTheDocument();
    });

    expect(screen.queryByText('+ Add Questions')).not.toBeInTheDocument();
  });

  it('toggles add questions panel', async () => {
    mockStore.items = mockQuestionSets;

    render(<QuestionSetsPage />);

    await waitFor(() => {
      expect(screen.getByText('+ Add Questions')).toBeInTheDocument();
    });

    // Open panel
    fireEvent.click(screen.getByText('+ Add Questions'));
    expect(screen.getByTestId('add-questions-panel')).toBeInTheDocument();

    // Button text changes
    expect(screen.getByText('Hide Panel')).toBeInTheDocument();
  });

  it('shows set count badge when sets exist', async () => {
    mockStore.items = mockQuestionSets;

    render(<QuestionSetsPage />);

    await waitFor(() => {
      expect(screen.getByText('2 sets')).toBeInTheDocument();
    });
  });
});
