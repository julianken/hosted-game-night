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
  },
  useReducedMotion: vi.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Mock motion presets
// ---------------------------------------------------------------------------
vi.mock('@/lib/motion/presets', () => ({
  heroSceneEnter: {},
  heroSceneEnterReduced: {},
  EASE: { entrance: [0.22, 1, 0.36, 1], exit: [0.36, 0, 0.66, -0.56] },
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
const makeQuestion = (id: string, roundIndex: number, text: string, correctAnswer: string = 'Paris') => ({
  id,
  text,
  type: 'multiple_choice' as const,
  correctAnswers: [correctAnswer],
  options: ['A', 'B', 'C', 'D'],
  optionTexts: ['Paris', 'London', 'Berlin', 'Madrid'],
  category: 'general' as const,
  roundIndex,
});

const mockStoreState: Record<string, unknown> = {
  currentRound: 0,
  displayQuestionIndex: 0,
  recapShowingAnswer: null,
  questions: [
    makeQuestion('q1', 0, 'What is the capital of France?'),
    makeQuestion('q2', 0, 'What is the capital of Germany?', 'Berlin'),
    makeQuestion('q3', 0, 'What is the capital of Spain?', 'Madrid'),
  ],
};

vi.mock('@/stores/game-store', () => ({
  useGameStore: (selector: (state: Record<string, unknown>) => unknown) => selector(mockStoreState),
}));

// ---------------------------------------------------------------------------
// Helper: configure store state
// ---------------------------------------------------------------------------
function setState(overrides: Partial<typeof mockStoreState> = {}): void {
  mockStoreState.currentRound = overrides.currentRound ?? 0;
  // Use 'in' check so that explicitly passing null is preserved (nullish coalescing treats null as nullish)
  mockStoreState.displayQuestionIndex = 'displayQuestionIndex' in overrides ? overrides.displayQuestionIndex : 0;
  mockStoreState.recapShowingAnswer = 'recapShowingAnswer' in overrides ? overrides.recapShowingAnswer : null;
  mockStoreState.questions = overrides.questions ?? [
    makeQuestion('q1', 0, 'What is the capital of France?'),
    makeQuestion('q2', 0, 'What is the capital of Germany?', 'Berlin'),
    makeQuestion('q3', 0, 'What is the capital of Spain?', 'Madrid'),
  ];
}

// ---------------------------------------------------------------------------
// Import the component under test AFTER mocks are declared
// ---------------------------------------------------------------------------
import { RecapQAScene } from '../RecapQAScene';

// ===========================================================================
// TESTS
// ===========================================================================

describe('RecapQAScene', () => {
  beforeEach(() => {
    setState();
  });

  it('renders the progress indicator with round and question numbers', () => {
    setState({ currentRound: 0, displayQuestionIndex: 0 });
    render(<RecapQAScene />);

    // "Round 1 · Question 1 of 3" — middot renders as \u00b7
    expect(screen.getByText(/Round 1/)).toBeInTheDocument();
    expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument();
  });

  it('has an accessible region with correct aria-label', () => {
    setState({ currentRound: 1, displayQuestionIndex: 0, questions: [
      makeQuestion('q4', 1, 'Round 2 Q1'),
    ] });
    render(<RecapQAScene />);

    const region = screen.getByRole('region', { name: /Round 2 recap, question 1 of 1/ });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('renders the question face (question text) when recapShowingAnswer is null', () => {
    setState({ recapShowingAnswer: null, displayQuestionIndex: 0 });
    render(<RecapQAScene />);

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
  });

  it('renders the answer face with correct answer when recapShowingAnswer is true', () => {
    setState({ recapShowingAnswer: true, displayQuestionIndex: 0 });
    render(<RecapQAScene />);

    // Answer block should show "Correct Answer" label and the answer text
    expect(screen.getByText('Correct Answer')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    // The answer region should be accessible
    expect(screen.getByRole('region', { name: 'Correct answer' })).toBeInTheDocument();
  });

  it('shows "View scores" footer on the answer face of the last question', () => {
    // Last question in round (index 2 out of 3 questions)
    setState({ recapShowingAnswer: true, displayQuestionIndex: 2 });
    render(<RecapQAScene />);

    expect(screen.getByText(/View scores/)).toBeInTheDocument();
  });

  it('shows "Next question" footer on the answer face when not the last question', () => {
    // First question answer (not last)
    setState({ recapShowingAnswer: true, displayQuestionIndex: 0 });
    render(<RecapQAScene />);

    expect(screen.getByText(/Next question/)).toBeInTheDocument();
  });

  it('hides the "Previous" navigation hint on the first question face', () => {
    setState({ recapShowingAnswer: null, displayQuestionIndex: 0 });
    render(<RecapQAScene />);

    // First question should show "Show answer" but NOT "Previous"
    expect(screen.getByText(/Show answer/)).toBeInTheDocument();
    expect(screen.queryByText(/Previous/)).not.toBeInTheDocument();
  });

  it('renders WaitingDisplay when currentQuestion is null (displayQuestionIndex is null)', () => {
    setState({ displayQuestionIndex: null });
    render(<RecapQAScene />);

    const waiting = screen.getByTestId('WaitingDisplay');
    expect(waiting).toBeInTheDocument();
    expect(waiting).toHaveTextContent('Loading recap...');
  });
});
