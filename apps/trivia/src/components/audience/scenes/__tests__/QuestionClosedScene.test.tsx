import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock motion/react -- AnimatePresence + motion.div rendered as plain divs
// ---------------------------------------------------------------------------
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & { variants?: unknown; initial?: string; animate?: string; exit?: string }) => {
      const { variants: _v, initial: _i, animate: _a, exit: _e, ...htmlProps } = rest as Record<string, unknown>;
      void _v; void _i; void _a; void _e;
      return <div {...(htmlProps as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
    article: ({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLElement> & { variants?: unknown; initial?: string; animate?: string; exit?: string }) => {
      const { variants: _v, initial: _i, animate: _a, exit: _e, ...htmlProps } = rest as Record<string, unknown>;
      void _v; void _i; void _a; void _e;
      return <article {...(htmlProps as React.HTMLAttributes<HTMLElement>)}>{children}</article>;
    },
  },
  useReducedMotion: vi.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Mock motion presets
// ---------------------------------------------------------------------------
vi.mock('@/lib/motion/presets', () => ({
  springUrgent: {},
  questionReveal: {},
  springQuestionReveal: {},
}));

// ---------------------------------------------------------------------------
// Mock AudienceQuestion (child component)
// ---------------------------------------------------------------------------
vi.mock('@/components/audience/AudienceQuestion', () => ({
  AudienceQuestion: (props: { question: { text: string }; questionNumber: number; totalQuestions: number; roundNumber: number; totalRounds: number }) => (
    <div data-testid="AudienceQuestion" data-question-text={props.question.text}>
      Q{props.questionNumber}/{props.totalQuestions} R{props.roundNumber}/{props.totalRounds}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Mock WaitingDisplay (fallback component)
// ---------------------------------------------------------------------------
vi.mock('@/components/audience/WaitingDisplay', () => ({
  WaitingDisplay: (props: { message: string }) => (
    <div data-testid="WaitingDisplay">{props.message}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Mock game store
// ---------------------------------------------------------------------------
const makeQuestion = (id: string, roundIndex: number, text: string) => ({
  id,
  text,
  type: 'multiple_choice' as const,
  correctAnswers: ['A'],
  options: ['A', 'B', 'C', 'D'],
  optionTexts: ['Option A', 'Option B', 'Option C', 'Option D'],
  category: 'general' as const,
  roundIndex,
});

const mockStoreState: Record<string, unknown> = {
  displayQuestionIndex: 0,
  currentRound: 0,
  totalRounds: 2,
  settings: { questionsPerRound: 5 },
  questions: [
    makeQuestion('q1', 0, 'What is 2+2?'),
    makeQuestion('q2', 0, 'What is 3+3?'),
    makeQuestion('q3', 1, 'What is 4+4?'),
  ],
};

let mockDisplayQuestion: unknown = null;

vi.mock('@/stores/game-store', () => ({
  useGameStore: (selector: (state: Record<string, unknown>) => unknown) => selector(mockStoreState),
  useGameSelectors: () => ({
    displayQuestion: mockDisplayQuestion,
  }),
}));

// ---------------------------------------------------------------------------
// Helper: configure store state
// ---------------------------------------------------------------------------
function setState(overrides: Partial<typeof mockStoreState> & { displayQuestion?: unknown } = {}): void {
  mockStoreState.displayQuestionIndex = overrides.displayQuestionIndex ?? 0;
  mockStoreState.currentRound = overrides.currentRound ?? 0;
  mockStoreState.totalRounds = overrides.totalRounds ?? 2;
  mockStoreState.settings = overrides.settings ?? { questionsPerRound: 5 };
  mockStoreState.questions = overrides.questions ?? [
    makeQuestion('q1', 0, 'What is 2+2?'),
    makeQuestion('q2', 0, 'What is 3+3?'),
    makeQuestion('q3', 1, 'What is 4+4?'),
  ];
  mockDisplayQuestion = overrides.displayQuestion ?? null;
}

// ---------------------------------------------------------------------------
// Import the component under test AFTER mocks are declared
// ---------------------------------------------------------------------------
import { QuestionClosedScene } from '../QuestionClosedScene';

// ===========================================================================
// TESTS
// ===========================================================================

describe('QuestionClosedScene', () => {
  beforeEach(() => {
    setState({
      displayQuestion: makeQuestion('q1', 0, 'What is 2+2?'),
    });
  });

  it('renders the "TIME\'S UP!" badge text', () => {
    render(<QuestionClosedScene />);

    expect(screen.getByText("TIME'S UP!")).toBeInTheDocument();
  });

  it('renders the AudienceQuestion component when displayQuestion exists', () => {
    render(<QuestionClosedScene />);

    expect(screen.getByTestId('AudienceQuestion')).toBeInTheDocument();
  });

  it('renders the "Waiting for the answer..." subtext', () => {
    render(<QuestionClosedScene />);

    expect(screen.getByText('Waiting for the answer...')).toBeInTheDocument();
  });

  it('has an accessible alert region for the TIME\'S UP badge', () => {
    render(<QuestionClosedScene />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('renders WaitingDisplay fallback when displayQuestion is null', () => {
    setState({ displayQuestion: null });
    render(<QuestionClosedScene />);

    const waiting = screen.getByTestId('WaitingDisplay');
    expect(waiting).toBeInTheDocument();
    expect(waiting).toHaveTextContent("Time's up!");
  });

  it('computes the correct question-in-round number', () => {
    // displayQuestionIndex=1 is the 2nd question in round 0 (q2)
    setState({
      displayQuestionIndex: 1,
      currentRound: 0,
      displayQuestion: makeQuestion('q2', 0, 'What is 3+3?'),
    });
    render(<QuestionClosedScene />);

    // questionInRound should be 2 (index 1 % 2 questions in round + 1)
    const aq = screen.getByTestId('AudienceQuestion');
    expect(aq).toHaveTextContent('Q2/');
  });
});
